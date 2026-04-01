"""
Ingest API
==========
Endpoints exclusivos para los agentes remotos.
Autenticación por token de agente (no por sesión de usuario).

Rutas:
  POST /api/ingest/events/      — lote de eventos desde el agente
  POST /api/ingest/heartbeat/   — señal de vida del agente
  GET  /api/ingest/config/      — el agente descarga su config actualizada
"""

import logging
from datetime import datetime

from django.utils import timezone as dj_tz
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .permissions import AgentTokenPermission

from .models import AgentNode, DatabaseConnection, AuditEvent
from .alert_engine import AlertEngine

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
#  Autenticación por token de agente
# ──────────────────────────────────────────────

class AgentTokenAuth:
    @staticmethod
    def authenticate(request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        logger.warning(f"[AUTH] Header recibido: '{auth_header[:80] if auth_header else 'VACIO'}'...")

        if not auth_header.startswith("Token "):
            logger.warning(f"[AUTH] Header inválido (no empieza con 'Token ')")
            return None, Response(
                {"error": "Missing or invalid Authorization header. Use: Token <agent_token>"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = auth_header.split(" ", 1)[1].strip()
        logger.warning(f"[AUTH] Token extraído: {token[:20]}...{token[-10:] if len(token) > 30 else ''}")
        logger.warning(f"[AUTH] Longitud del token: {len(token)}")

        try:
            agent = AgentNode.objects.select_related("database").get(token=token)
            logger.info(f"[AUTH] ✅ Agente encontrado: {agent.name} (status={agent.status})")
        except AgentNode.DoesNotExist:
            logger.warning(f"[AUTH] ❌ Token no encontrado en BD")
            logger.warning(f"[AUTH] Buscando agentes con primeros 10 caracteres: {token[:10]}")
            # Check if token exists at all
            count = AgentNode.objects.filter(token__icontains=token[:10]).count()
            logger.warning(f"[AUTH] Encontrados {count} agentes con ese prefijo")
            # Listar todos los tokens para debugging
            all_agents = AgentNode.objects.all()
            logger.warning(f"[AUTH] Total agentes en BD: {all_agents.count()}")
            for a in all_agents[:5]:  # Primeros 5
                logger.warning(f"[AUTH]   - {a.name}: {a.token[:20]}...")
            return None, Response(
                {"detail": "Invalid token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if agent.status == "disabled":
            return None, Response(
                {"error": "Agent is disabled"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return agent, None


# ──────────────────────────────────────────────
#  POST /api/ingest/events/
# ──────────────────────────────────────────────

class IngestEventsView(APIView):
    authentication_classes = []
    permission_classes = [AgentTokenPermission]

    def post(self, request):
        agent, err = AgentTokenAuth.authenticate(request)
        if err:
            return err

        data = request.data
        events_raw = data.get("events", [])

        if not isinstance(events_raw, list):
            return Response({"error": "'events' must be a list"}, status=400)

        if len(events_raw) > 5000:
            return Response({"error": "Batch too large (max 5000)"}, status=400)

        # Resolver base de datos
        db = agent.database
        if db is None:
            db = self._find_or_create_db(agent, data)

        if db is None:
            return Response(
                {"error": "No database linked to this agent."},
                status=400,
            )

        created = 0
        skipped = 0
        alert_count = 0

        for ev in events_raw:

            query_hash = ev.get("query_hash", "")
            occurred_str = ev.get("occurred_at")
            db_user = ev.get("db_user", "unknown")

            try:
                occurred_at = (
                    datetime.fromisoformat(occurred_str.replace("Z", "+00:00"))
                    if occurred_str else dj_tz.now()
                )

                if dj_tz.is_naive(occurred_at):
                    occurred_at = dj_tz.make_aware(occurred_at)

            except Exception:
                occurred_at = dj_tz.now()

            # Deduplicación
            if query_hash and AuditEvent.objects.filter(
                database=db,
                query_hash=query_hash,
                occurred_at=occurred_at,
                db_user=db_user,
            ).exists():
                skipped += 1
                continue

            # Crear evento
            try:
                audit_event = AuditEvent.objects.create(
                    database=db,
                    operation=ev.get("operation", "OTHER")[:20],
                    severity=ev.get("severity", "low"),
                    db_user=db_user[:255],
                    application_name=ev.get("application_name", "")[:255],
                    client_host=ev.get("client_host", "")[:255],
                    client_port=ev.get("client_port"),
                    schema_name=ev.get("schema_name", "")[:255],
                    table_name=ev.get("table_name", "")[:255],
                    query=ev.get("query", "")[:10000],
                    query_hash=query_hash[:64],
                    rows_affected=ev.get("rows_affected"),
                    old_data=ev.get("old_data"),
                    new_data=ev.get("new_data"),
                    occurred_at=occurred_at,
                    duration_ms=ev.get("duration_ms"),
                    success=bool(ev.get("success", True)),
                    error_message=ev.get("error_message", "")[:1000],
                    raw_log=ev.get("raw_log", {}),
                )
                created += 1

            except Exception as e:
                logger.error(f"Error saving event: {e} | data: {ev}")
                continue

            # Evaluar alertas
            try:
                before = audit_event.alerts.count()
                AlertEngine.evaluate_event(audit_event)
                after = audit_event.alerts.count()
                alert_count += (after - before)
            except Exception as e:
                logger.error(f"Error evaluating alert rules: {e}")

        # Actualizar estado del agente
        agent.status = "active"
        agent.last_event_at = dj_tz.now()
        agent.save(update_fields=["status", "last_event_at"])

        # Actualizar estado de la BD
        db.status = "active"
        db.last_checked = dj_tz.now()
        db.save(update_fields=["status", "last_checked"])

        logger.info(
            f"[Ingest] Agent '{agent.name}' → "
            f"{created} created, {skipped} skipped, {alert_count} alerts"
        )

        return Response({
            "received": len(events_raw),
            "created": created,
            "skipped": skipped,
            "alerts": alert_count,
        }, status=status.HTTP_200_OK)

    def _find_or_create_db(self, agent: AgentNode, data: dict):
        engine  = data.get("db_engine", "")
        host    = data.get("db_host", "")
        db_name = data.get("db_name", "")

        db = DatabaseConnection.objects.filter(
            engine=engine,
            host=host,
            database_name=db_name
        ).first()

        if db:
            agent.database = db
            agent.save(update_fields=["database"])
            return db

        # Auto registro
        db = DatabaseConnection.objects.create(
            name=f"{db_name} @ {host} (auto)",
            engine=engine,
            host=host,
            port=5432 if engine == "postgresql" else 3306,
            database_name=db_name,
            username="(agent)",
            password="",
            connection_mode="agent",
            status="active",
        )

        agent.database = db
        agent.save(update_fields=["database"])

        logger.info(f"Auto-registered DB: {db.name}")
        return db


# ──────────────────────────────────────────────
#  POST /api/ingest/heartbeat/
# ──────────────────────────────────────────────

class IngestHeartbeatView(APIView):
    authentication_classes = []
    permission_classes = [AgentTokenPermission]

    def post(self, request):
        agent, err = AgentTokenAuth.authenticate(request)
        if err:
            return err

        data = request.data
        now = dj_tz.now()

        agent.last_heartbeat = now
        agent.queue_size = int(data.get("queue_size", 0))
        agent.status = "active"

        if data.get("os"):
            agent.server_os = data["os"][:100]
        if data.get("agent_version"):
            agent.agent_version = data["agent_version"][:20]
        if data.get("hostname") and not agent.server_host:
            agent.server_host = data["hostname"][:255]

        agent.save()

        return Response({
            "status": "ok",
            "server_time": now.isoformat(),
            "poll_interval": 30,
            "batch_size": 200,
        })


# ──────────────────────────────────────────────
#  GET /api/ingest/config/
# ──────────────────────────────────────────────

class IngestConfigView(APIView):
    authentication_classes = []
    permission_classes = [AgentTokenPermission]

    def get(self, request):
        agent, err = AgentTokenAuth.authenticate(request)
        if err:
            return err

        return Response({
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "poll_interval": 30,
            "batch_size": 200,
            "log_level": "INFO",
            "enabled": agent.status != "disabled",
        })