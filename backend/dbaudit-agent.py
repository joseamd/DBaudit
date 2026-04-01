#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║           DBaudit — Agente Local de Base de Datos           ║
║                                                              ║
║  Instalar en cada servidor Linux donde haya una BD          ║
║  que no sea accesible directamente desde el servidor         ║
║  central de auditoría.                                       ║
║                                                              ║
║  El agente:                                                  ║
║    1. Lee logs / triggers de la BD local                     ║
║    2. Empuja los eventos al servidor central via HTTPS       ║
║    3. Corre como servicio systemd en background              ║
║    4. Tolera desconexiones (cola local con reintento)        ║
╚══════════════════════════════════════════════════════════════╝

INSTALACIÓN RÁPIDA:
  curl -O https://audit-server/download/dbaudit-agent.py
  python3 dbaudit-agent.py --setup     # configura .env y systemd
  python3 dbaudit-agent.py --install   # instala servicio systemd
  systemctl start dbaudit-agent
  systemctl status dbaudit-agent

CONFIGURACIÓN (.env en /etc/dbaudit/agent.env):
  AUDIT_SERVER_URL=https://10.0.0.1:8000
  AGENT_TOKEN=tok_xxxxxxxxxxxxxxxx        # generado desde el dashboard
  AGENT_ID=uuid-del-agente               # generado al registrar
  DB_ENGINE=postgresql                   # postgresql | mysql
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=mi_base_de_datos
  DB_USER=dbaudit_agent
  DB_PASSWORD=password_seguro
  POLL_INTERVAL=30                       # segundos entre colectas
  BATCH_SIZE=200                         # eventos por envío
  LOG_LEVEL=INFO
"""

import os
import sys
import json
import time
import signal
import logging
import hashlib
import sqlite3
import argparse
import platform
import subprocess
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

# ──────────────────────────────────────────────
#  Dependencias opcionales (se instalan solas)
# ──────────────────────────────────────────────
def _ensure_deps():
    """Instala dependencias si no están presentes."""
    deps = ["requests"]
    for dep in deps:
        try:
            __import__(dep)
        except ImportError:
            print(f"[setup] Instalando {dep}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep, "-q"])

_ensure_deps()
import requests  # noqa: E402

# ──────────────────────────────────────────────
#  Configuración (multiplataforma)
# ──────────────────────────────────────────────

is_windows = platform.system() == "Windows"

# Rutas según el SO
if is_windows:
    CONFIG_DIR = Path.home() / "AppData" / "Local" / "DBaudit"
    QUEUE_DB = CONFIG_DIR / "queue.db"
    LOG_FILE = CONFIG_DIR / "logs" / "agent.log"
else:
    CONFIG_DIR = Path("/etc/dbaudit")
    QUEUE_DB = Path("/var/lib/dbaudit/queue.db")
    LOG_FILE = Path("/var/log/dbaudit-agent.log")

CONFIG_FILE = CONFIG_DIR / os.environ.get("AGENT_ENV", "agent.env")
SYSTEMD_UNIT = Path("/etc/systemd/system/dbaudit-agent.service")

DEFAULT_CONFIG = {
    "AUDIT_SERVER_URL": "https://10.0.0.1:8000",
    "AGENT_TOKEN":      "",
    "AGENT_ID":         "",
    "DB_ENGINE":        "postgresql",
    "DB_HOST":          "localhost",
    "DB_PORT":          "5432",
    "DB_NAME":          "",
    "DB_USER":          "dbaudit_agent",
    "DB_PASSWORD":      "",
    "POLL_INTERVAL":    "30",
    "BATCH_SIZE":       "200",
    "RETRY_INTERVAL":   "60",
    "MAX_QUEUE_SIZE":   "100000",
    "LOG_LEVEL":        "INFO",
    "VERIFY_SSL":       "true",
}


def load_config() -> dict:
    cfg = dict(DEFAULT_CONFIG)
    # 1. Leer desde archivo .env
    if CONFIG_FILE.exists():
        for line in CONFIG_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                cfg[k.strip()] = v.strip().strip('"')
    # 2. Las variables de entorno tienen prioridad
    for key in cfg:
        if key in os.environ:
            cfg[key] = os.environ[key]
    
    # 3. Verificar que no haya espacios en el token
    if 'AGENT_TOKEN' in cfg:
        token = cfg['AGENT_TOKEN'].strip()
        if token != cfg['AGENT_TOKEN']:
            print(f"[WARN] Token con espacios detectado. Corrigiendo...")
            cfg['AGENT_TOKEN'] = token
    
    return cfg


# ──────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────

def setup_logging(level: str):
    fmt = "%(asctime)s [%(levelname)s] %(message)s"
    handlers = [logging.StreamHandler(sys.stdout)]
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(LOG_FILE))
    except PermissionError:
        pass
    logging.basicConfig(level=getattr(logging, level.upper(), "INFO"),
                        format=fmt, handlers=handlers)

logger = logging.getLogger("dbaudit-agent")


# ──────────────────────────────────────────────
#  Cola local (SQLite) — tolerancia a fallos
# ──────────────────────────────────────────────

class LocalQueue:
    """
    Cola persistente en SQLite. Si el servidor de auditoría
    no está disponible, los eventos se guardan aquí y se
    reenvían cuando vuelva la conexión.
    """

    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self.lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        with self.lock:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS event_queue (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    payload     TEXT NOT NULL,
                    created_at  TEXT NOT NULL,
                    attempts    INTEGER DEFAULT 0
                )
            """)
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_state (
                    key   TEXT PRIMARY KEY,
                    value TEXT
                )
            """)
            self.conn.commit()

    def push(self, events: list[dict]):
        with self.lock:
            now = datetime.now(timezone.utc).isoformat()
            self.conn.executemany(
                "INSERT INTO event_queue (payload, created_at) VALUES (?, ?)",
                [(json.dumps(e), now) for e in events]
            )
            self.conn.commit()

    def pop_batch(self, size: int) -> tuple[list[int], list[dict]]:
        with self.lock:
            rows = self.conn.execute(
                "SELECT id, payload FROM event_queue ORDER BY id ASC LIMIT ?", (size,)
            ).fetchall()
            ids = [r[0] for r in rows]
            events = [json.loads(r[1]) for r in rows]
            return ids, events

    def ack(self, ids: list[int]):
        if not ids:
            return
        with self.lock:
            placeholders = ",".join("?" * len(ids))
            self.conn.execute(f"DELETE FROM event_queue WHERE id IN ({placeholders})", ids)
            self.conn.commit()

    def increment_attempts(self, ids: list[int]):
        if not ids:
            return
        with self.lock:
            placeholders = ",".join("?" * len(ids))
            self.conn.execute(
                f"UPDATE event_queue SET attempts = attempts + 1 WHERE id IN ({placeholders})", ids
            )
            self.conn.commit()

    def size(self) -> int:
        with self.lock:
            return self.conn.execute("SELECT COUNT(*) FROM event_queue").fetchone()[0]

    def get_state(self, key: str, default=None):
        with self.lock:
            row = self.conn.execute(
                "SELECT value FROM agent_state WHERE key = ?", (key,)
            ).fetchone()
            return row[0] if row else default

    def set_state(self, key: str, value: str):
        with self.lock:
            self.conn.execute(
                "INSERT OR REPLACE INTO agent_state (key, value) VALUES (?, ?)", (key, value)
            )
            self.conn.commit()

    def purge_old(self, max_size: int):
        """Elimina eventos más antiguos si la cola supera max_size."""
        with self.lock:
            count = self.conn.execute("SELECT COUNT(*) FROM event_queue").fetchone()[0]
            if count > max_size:
                excess = count - max_size
                self.conn.execute(
                    "DELETE FROM event_queue WHERE id IN "
                    "(SELECT id FROM event_queue ORDER BY id ASC LIMIT ?)", (excess,)
                )
                self.conn.commit()
                logger.warning(f"Queue overflow: dropped {excess} old events")


# ──────────────────────────────────────────────
#  Colectores de eventos por motor
# ──────────────────────────────────────────────

class BaseCollector:
    def __init__(self, cfg: dict, queue: LocalQueue):
        self.cfg = cfg
        self.queue = queue

    def collect(self) -> int:
        raise NotImplementedError

    def setup(self) -> dict:
        raise NotImplementedError

    def _normalize(self, **kwargs) -> dict:
        op = kwargs.get("operation", "OTHER").upper()
        sev = self._severity(op, kwargs.get("rows_affected"))
        query = kwargs.get("query", "")
        return {
            "operation":        op,
            "severity":         sev,
            "db_user":          kwargs.get("db_user", "unknown"),
            "application_name": kwargs.get("application_name", ""),
            "client_host":      kwargs.get("client_host", ""),
            "client_port":      kwargs.get("client_port"),
            "schema_name":      kwargs.get("schema_name", ""),
            "table_name":       kwargs.get("table_name", ""),
            "query":            query[:5000],
            "query_hash":       hashlib.sha256(query.encode()).hexdigest() if query else "",
            "rows_affected":    kwargs.get("rows_affected"),
            "old_data":         kwargs.get("old_data"),
            "new_data":         kwargs.get("new_data"),
            "occurred_at":      kwargs.get("occurred_at", datetime.now(timezone.utc).isoformat()),
            "duration_ms":      kwargs.get("duration_ms"),
            "success":          kwargs.get("success", True),
            "error_message":    kwargs.get("error_message", ""),
            "raw_log":          kwargs.get("raw_log", {}),
        }

    @staticmethod
    def _severity(op: str, rows: Optional[int]) -> str:
        if op in ("DROP", "TRUNCATE", "REVOKE", "GRANT"): return "critical"
        if op in ("DELETE", "ALTER", "CREATE"):
            return "high" if rows and rows > 1000 else "high"
        if op in ("INSERT", "UPDATE"):
            return "high" if rows and rows > 1000 else "medium"
        return "low"


class PostgreSQLCollector(BaseCollector):
    """
    Recoge eventos del schema dbaudit.audit_log instalado por el setup.
    Usa un cursor de posición (last_id) para no releer eventos ya enviados.
    """

    def _connect(self):
        import psycopg2
        # Intentar con encoding latino para evitar problemas con UTF-8 en la conexión
        conn = psycopg2.connect(
            host=self.cfg["DB_HOST"],
            port=int(self.cfg["DB_PORT"]),
            dbname=self.cfg["DB_NAME"],
            user=self.cfg["DB_USER"],
            password=self.cfg["DB_PASSWORD"],
            connect_timeout=10,
            options="-c client_encoding=UTF8"  # Usar options en lugar de client_encoding
        )
        return conn

    def setup(self) -> dict:
        """Instala schema + tabla + función de trigger en la BD local."""
        details = []
        try:
            conn = self._connect()
            conn.autocommit = True
            cur = conn.cursor()

            cur.execute("CREATE SCHEMA IF NOT EXISTS dbaudit;")
            details.append("✓ Schema dbaudit creado")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS dbaudit.audit_log (
                    id            BIGSERIAL PRIMARY KEY,
                    event_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    db_user       TEXT NOT NULL,
                    application   TEXT,
                    client_addr   TEXT,
                    client_port   INT,
                    schema_name   TEXT,
                    table_name    TEXT,
                    operation     TEXT NOT NULL,
                    query         TEXT,
                    old_data      JSONB,
                    new_data      JSONB,
                    rows_affected INT,
                    success       BOOLEAN DEFAULT TRUE,
                    error_msg     TEXT,
                    duration_ms   NUMERIC,
                    sent          BOOLEAN DEFAULT FALSE
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_al_sent ON dbaudit.audit_log(sent, id);")
            details.append("✓ Tabla audit_log creada")

            cur.execute("""
                CREATE OR REPLACE FUNCTION dbaudit.log_row_change()
                RETURNS TRIGGER AS $$
                DECLARE
                    v_old JSONB := NULL;
                    v_new JSONB := NULL;
                BEGIN
                    IF TG_OP IN ('UPDATE','DELETE') THEN v_old := row_to_json(OLD)::JSONB; END IF;
                    IF TG_OP IN ('INSERT','UPDATE') THEN v_new := row_to_json(NEW)::JSONB; END IF;
                    INSERT INTO dbaudit.audit_log
                        (db_user, application, client_addr, client_port,
                         schema_name, table_name, operation, old_data, new_data)
                    VALUES (
                        current_user,
                        current_setting('application_name', TRUE),
                        COALESCE(inet_client_addr()::TEXT, ''),
                        inet_client_port(),
                        TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP,
                        v_old, v_new
                    );
                    RETURN COALESCE(NEW, OLD);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
            """)
            details.append("✓ Función trigger creada")

            # pgaudit para DDL/sesión
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS pgaudit;")
                cur.execute("ALTER SYSTEM SET pgaudit.log = 'ddl,role,connection';")
                cur.execute("SELECT pg_reload_conf();")
                details.append("✓ pgaudit activado (DDL + conexiones)")
            except Exception as e:
                details.append(f"⚠ pgaudit no disponible: {e}")

            conn.close()
            return {"success": True, "details": details}
        except Exception as e:
            return {"success": False, "error": str(e), "details": details}

    def install_triggers(self, schema: str = "public") -> dict:
        """Instala triggers en todas las tablas de un schema."""
        installed = []
        try:
            conn = self._connect()
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = %s AND tablename NOT LIKE 'dbaudit%%'
            """, (schema,))
            tables = [r[0] for r in cur.fetchall()]
            for table in tables:
                tname = f"dbaudit_{table}_trg"
                cur.execute(f"""
                    DROP TRIGGER IF EXISTS {tname} ON {schema}."{table}";
                    CREATE TRIGGER {tname}
                    AFTER INSERT OR UPDATE OR DELETE ON {schema}."{table}"
                    FOR EACH ROW EXECUTE FUNCTION dbaudit.log_row_change();
                """)
                installed.append(f"{schema}.{table}")
            conn.close()
            return {"success": True, "tables": installed}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def collect(self) -> int:
        last_id = int(self.queue.get_state("pg_last_id", "0"))
        events = []
        new_last_id = last_id
        try:
            conn = self._connect()
            cur = conn.cursor()
            # Asegurar encoding UTF8
            cur.execute("SET client_encoding TO 'UTF8'")
            
            logger.debug("Ejecutando query de lectura de audit_log...")
            cur.execute("""
                SELECT id, event_time, db_user, application, client_addr, client_port,
                       schema_name, table_name, operation, query,
                       old_data, new_data, rows_affected, success, error_msg, duration_ms
                FROM dbaudit.audit_log
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
            """, (last_id, int(self.cfg["BATCH_SIZE"]) * 2))
            
            logger.debug("Fetchall...")
            raw_rows = cur.fetchall()
            logger.debug(f"Se obtuvieron {len(raw_rows)} filas")

            for row_idx, row in enumerate(raw_rows):
                try:
                    (rid, event_time, db_user, app, client_addr, client_port,
                     schema_name, table_name, operation, query,
                     old_data, new_data, rows_affected, success, error_msg, duration_ms) = row
                except UnicodeDecodeError as ue:
                    logger.error(f"Error decodificando fila {row_idx}: {ue}")
                    logger.error(f"  Bytes problemáticos alrededor de posición {ue.start}: {ue.object[max(0, ue.start-10):ue.end+10]}")
                    continue

                events.append(self._normalize(
                    operation=operation or "OTHER",
                    db_user=db_user or "unknown",
                    occurred_at=event_time.isoformat() if event_time else None,
                    table_name=table_name or "",
                    schema_name=schema_name or "",
                    query=query or "",
                    rows_affected=rows_affected,
                    old_data=old_data,
                    new_data=new_data,
                    client_host=client_addr or "",
                    client_port=client_port,
                    application_name=app or "",
                    success=bool(success),
                    error_message=error_msg or "",
                    duration_ms=float(duration_ms) if duration_ms else None,
                ))
                new_last_id = max(new_last_id, rid)

            conn.close()
        except Exception as e:
            logger.error(f"PostgreSQL collect error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return 0

        if events:
            self.queue.push(events)
            self.queue.set_state("pg_last_id", str(new_last_id))
            logger.info(f"Collected {len(events)} PostgreSQL events (last_id={new_last_id})")
        return len(events)


class MySQLCollector(BaseCollector):
    """Recoge eventos del schema dbaudit en MySQL/MariaDB."""

    def _connect(self):
        import mysql.connector
        return mysql.connector.connect(
            host=self.cfg["DB_HOST"],
            port=int(self.cfg["DB_PORT"]),
            database=self.cfg["DB_NAME"],
            user=self.cfg["DB_USER"],
            password=self.cfg["DB_PASSWORD"],
            connection_timeout=10,
        )

    def setup(self) -> dict:
        details = []
        try:
            conn = self._connect()
            cur = conn.cursor()

            cur.execute("CREATE DATABASE IF NOT EXISTS `dbaudit`;")
            details.append("✓ Base de datos dbaudit creada")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS `dbaudit`.`audit_log` (
                    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
                    event_time    DATETIME(6) NOT NULL DEFAULT NOW(6),
                    db_user       VARCHAR(255) NOT NULL,
                    client_host   VARCHAR(255),
                    schema_name   VARCHAR(255),
                    table_name    VARCHAR(255),
                    operation     VARCHAR(50) NOT NULL,
                    old_data      JSON,
                    new_data      JSON,
                    rows_affected INT,
                    success       TINYINT(1) DEFAULT 1,
                    error_msg     TEXT,
                    sent          TINYINT(1) DEFAULT 0,
                    INDEX idx_sent_id (sent, id),
                    INDEX idx_event_time (event_time)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
            conn.commit()
            details.append("✓ Tabla audit_log creada")
            conn.close()
            return {"success": True, "details": details}
        except Exception as e:
            return {"success": False, "error": str(e), "details": details}

    def install_triggers(self, schema: str = None) -> dict:
        schema = schema or self.cfg["DB_NAME"]
        installed = []
        try:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("""
                SELECT TABLE_NAME FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE'
                AND TABLE_NAME NOT LIKE 'audit_%%'
            """, (schema,))
            tables = [r[0] for r in cur.fetchall()]

            for table in tables:
                for op in ["INSERT", "UPDATE", "DELETE"]:
                    tname = f"dbaudit_{table}_{op.lower()}"
                    old_row = "NULL" if op == "INSERT" else \
                              f"JSON_OBJECT('_op','{op}')"
                    new_row = "NULL" if op == "DELETE" else \
                              f"JSON_OBJECT('_op','{op}')"
                    try:
                        cur.execute(f"DROP TRIGGER IF EXISTS `{schema}`.`{tname}`;")
                        cur.execute(f"""
                            CREATE TRIGGER `{schema}`.`{tname}`
                            AFTER {op} ON `{schema}`.`{table}`
                            FOR EACH ROW
                            INSERT INTO `dbaudit`.`audit_log`
                                (db_user, client_host, schema_name, table_name,
                                 operation, old_data, new_data)
                            VALUES (USER(), @@hostname, '{schema}',
                                    '{table}', '{op}', {old_row}, {new_row});
                        """)
                        conn.commit()
                        installed.append(f"{schema}.{table} ({op})")
                    except Exception as te:
                        logger.warning(f"Trigger {tname}: {te}")

            conn.close()
            return {"success": True, "tables": list(set(t.split(" ")[0] for t in installed))}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def collect(self) -> int:
        last_id = int(self.queue.get_state("my_last_id", "0"))
        events = []
        new_last_id = last_id
        try:
            conn = self._connect()
            cur = conn.cursor()
            cur.execute("""
                SELECT id, event_time, db_user, client_host,
                       schema_name, table_name, operation,
                       old_data, new_data, rows_affected, success, error_msg
                FROM `dbaudit`.`audit_log`
                WHERE id > %s
                ORDER BY id ASC
                LIMIT %s
            """, (last_id, int(self.cfg["BATCH_SIZE"]) * 2))

            for row in cur.fetchall():
                (rid, event_time, db_user, client_host,
                 schema_name, table_name, operation,
                 old_data, new_data, rows_affected, success, error_msg) = row

                occurred = event_time.isoformat() if hasattr(event_time, "isoformat") \
                           else str(event_time)
                old_d = json.loads(old_data) if isinstance(old_data, str) else old_data
                new_d = json.loads(new_data) if isinstance(new_data, str) else new_data

                events.append(self._normalize(
                    operation=operation or "OTHER",
                    db_user=db_user or "unknown",
                    occurred_at=occurred,
                    table_name=table_name or "",
                    schema_name=schema_name or "",
                    rows_affected=rows_affected,
                    old_data=old_d,
                    new_data=new_d,
                    client_host=client_host or "",
                    success=bool(success),
                    error_message=error_msg or "",
                ))
                new_last_id = max(new_last_id, rid)

            conn.close()
        except Exception as e:
            logger.error(f"MySQL collect error: {e}")
            return 0

        if events:
            self.queue.push(events)
            self.queue.set_state("my_last_id", str(new_last_id))
            logger.info(f"Collected {len(events)} MySQL events (last_id={new_last_id})")
        return len(events)


class SQLiteCollector(BaseCollector):
    """Collector para SQLite - simula eventos para pruebas."""

    def collect(self) -> int:
        import sqlite3
        import random
        from datetime import datetime, timezone

        try:
            # Conectar a la BD SQLite
            conn = sqlite3.connect(self.cfg["DB_NAME"])
            cursor = conn.cursor()

            # Obtener tablas
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [row[0] for row in cursor.fetchall()]

            if not tables:
                return 0

            # Simular algunos eventos aleatorios
            operations = ["SELECT", "INSERT", "UPDATE", "DELETE"]
            users = ["app_user", "admin", "test_user"]
            events = []

            for _ in range(random.randint(1, 5)):  # 1-5 eventos por ciclo
                table = random.choice(tables)
                op = random.choice(operations)
                user = random.choice(users)

                # Simular query
                if op == "SELECT":
                    query = f"SELECT * FROM {table} WHERE id = ?"
                elif op == "INSERT":
                    query = f"INSERT INTO {table} VALUES (?, ?, ?, ?)"
                elif op == "UPDATE":
                    query = f"UPDATE {table} SET name = ? WHERE id = ?"
                else:  # DELETE
                    query = f"DELETE FROM {table} WHERE id = ?"

                event = self._normalize(
                    operation=op,
                    db_user=user,
                    table_name=table,
                    schema_name="main",
                    query=query,
                    rows_affected=random.randint(1, 50),
                    client_host="127.0.0.1",
                    occurred_at=datetime.now(timezone.utc).isoformat(),
                    success=True,
                    raw_log={"simulated": True, "table": table}
                )
                events.append(event)

            conn.close()

        except Exception as e:
            logger.error(f"SQLite collect error: {e}")
            return 0

        if events:
            self.queue.push(events)
            logger.info(f"Collected {len(events)} simulated SQLite events")
        return len(events)

    def setup(self) -> dict:
        """Setup para SQLite - solo verifica conexión."""
        try:
            import sqlite3
            conn = sqlite3.connect(self.cfg["DB_NAME"])
            cursor = conn.cursor()
            cursor.execute("SELECT sqlite_version()")
            version = cursor.fetchone()[0]
            conn.close()
            return {
                "success": True,
                "message": f"SQLite {version} conectado exitosamente",
                "details": [f"Database: {self.cfg['DB_NAME']}", f"Version: {version}"]
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "details": []
            }

    def install_triggers(self, schema: str) -> dict:
        """SQLite no soporta triggers complejos como PG/MySQL."""
        return {
            "success": False,
            "error": "SQLite no soporta triggers de auditoría avanzados. Use simulación.",
            "tables": []
        }


COLLECTORS = {
    "postgresql": PostgreSQLCollector,
    "mysql":      MySQLCollector,
    "sqlite":     SQLiteCollector,
}


# ──────────────────────────────────────────────
#  Sender — envía eventos al servidor central
# ──────────────────────────────────────────────

class EventSender:
    def __init__(self, cfg: dict, queue: LocalQueue):
        self.cfg   = cfg
        self.queue = queue
        # Verificar token para debugging
        token_used = cfg['AGENT_TOKEN'].strip()
        if not token_used:
            logger.error("AGENT_TOKEN vacío en configuración")
        logger.info(f"Inicializando EventSender con token: {token_used[:20]}...{token_used[-10:]}")
        
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {token_used}",
            "Content-Type":  "application/json",
            "X-Agent-ID":    cfg["AGENT_ID"],
            "X-Agent-Host":  platform.node(),
        })
        self.verify_ssl = cfg.get("VERIFY_SSL", "true").lower() != "false"
        self.base_url   = cfg["AUDIT_SERVER_URL"].rstrip("/")

    def send_batch(self) -> dict:
        batch_size = int(self.cfg["BATCH_SIZE"])
        ids, events = self.queue.pop_batch(batch_size)
        if not events:
            return {"sent": 0, "queued": 0}

        payload = {
            "agent_id":  self.cfg["AGENT_ID"],
            "db_engine": self.cfg["DB_ENGINE"],
            "db_host":   self.cfg["DB_HOST"],
            "db_name":   self.cfg["DB_NAME"],
            "events":    events,
        }

        try:
            logger.debug(f"POST {self.base_url}/api/ingest/events/ con {len(events)} eventos")
            resp = self.session.post(
                f"{self.base_url}/api/ingest/events/",
                json=payload,
                timeout=30,
                verify=self.verify_ssl,
            )
            resp.raise_for_status()
            self.queue.ack(ids)
            remaining = self.queue.size()
            logger.info(f"Sent {len(events)} events -> server OK (queue: {remaining})")
            return {"sent": len(events), "queued": remaining}

        except requests.HTTPError as e:
            logger.error(f"Server rejected batch: {e} - {resp.text[:200]}")
            self.queue.increment_attempts(ids)
            return {"sent": 0, "queued": self.queue.size(), "error": str(e)}

        except requests.RequestException as e:
            logger.warning(f"Network error, events kept in queue: {e}")
            self.queue.increment_attempts(ids)
            return {"sent": 0, "queued": self.queue.size(), "error": str(e)}

    def heartbeat(self):
        """Envía señal de vida al servidor central."""
        try:
            self.session.post(
                f"{self.base_url}/api/ingest/heartbeat/",
                json={
                    "agent_id":    self.cfg["AGENT_ID"],
                    "queue_size":  self.queue.size(),
                    "hostname":    platform.node(),
                    "db_engine":   self.cfg["DB_ENGINE"],
                    "db_host":     self.cfg["DB_HOST"],
                    "db_name":     self.cfg["DB_NAME"],
                    "agent_version": "1.0.0",
                    "os":          f"{platform.system()} {platform.release()}",
                },
                timeout=10,
                verify=self.verify_ssl,
            )
        except Exception as e:
            logger.debug(f"Heartbeat failed: {e}")


# ──────────────────────────────────────────────
#  Main Agent Loop
# ──────────────────────────────────────────────

class Agent:
    def __init__(self):
        self.cfg       = load_config()
        self.queue     = LocalQueue(QUEUE_DB)
        self.running   = True
        self.collector = None
        self.sender    = None

    def _validate_config(self):
        required = ["AUDIT_SERVER_URL", "AGENT_TOKEN", "AGENT_ID", "DB_ENGINE",
                    "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
        missing = [k for k in required if not self.cfg.get(k)]
        if missing:
            logger.error(f"Configuración incompleta. Faltan: {', '.join(missing)}")
            logger.error(f"Edita {CONFIG_FILE} y reinicia el agente.")
            sys.exit(1)

        engine = self.cfg["DB_ENGINE"]
        if engine not in COLLECTORS:
            logger.error(f"Motor '{engine}' no soportado. Opciones: {list(COLLECTORS.keys())}")
            sys.exit(1)

    def start(self):
        setup_logging(self.cfg.get("LOG_LEVEL", "INFO"))
        self._validate_config()

        CollectorClass = COLLECTORS[self.cfg["DB_ENGINE"]]
        self.collector = CollectorClass(self.cfg, self.queue)
        self.sender    = EventSender(self.cfg, self.queue)

        signal.signal(signal.SIGTERM, self._handle_stop)
        signal.signal(signal.SIGINT,  self._handle_stop)

        logger.info("=" * 60)
        logger.info(f"DBaudit Agent v1.0 iniciando")
        logger.info(f"  BD:       {self.cfg['DB_ENGINE']}://{self.cfg['DB_HOST']}:{self.cfg['DB_PORT']}/{self.cfg['DB_NAME']}")
        logger.info(f"  Servidor: {self.cfg['AUDIT_SERVER_URL']}")
        logger.info(f"  Intervalo: {self.cfg['POLL_INTERVAL']}s | Batch: {self.cfg['BATCH_SIZE']}")
        logger.info(f"  Cola local: {QUEUE_DB} ({self.queue.size()} eventos pendientes)")
        logger.info("=" * 60)

        poll     = int(self.cfg["POLL_INTERVAL"])
        hb_every = 60   # heartbeat cada 60 segundos
        hb_tick  = 0
        max_q    = int(self.cfg["MAX_QUEUE_SIZE"])

        while self.running:
            tick_start = time.time()

            # 1. Recolectar eventos de la BD local
            try:
                collected = self.collector.collect()
            except Exception as e:
                logger.error(f"Error en collect: {e}")
                collected = 0

            # 2. Enviar lo que hay en cola
            try:
                result = self.sender.send_batch()
            except Exception as e:
                logger.error(f"Error en send_batch: {e}")

            # 3. Heartbeat periódico
            hb_tick += 1
            if hb_tick * poll >= hb_every:
                self.sender.heartbeat()
                hb_tick = 0

            # 4. Controlar tamaño de cola
            self.queue.purge_old(max_q)

            # 5. Esperar al próximo ciclo
            elapsed = time.time() - tick_start
            sleep_time = max(0, poll - elapsed)
            time.sleep(sleep_time)

        logger.info("Agente detenido.")

    def _handle_stop(self, *_):
        logger.info("Señal de parada recibida. Finalizando ciclo actual...")
        self.running = False

    def collect_once(self) -> int:
        """Método de prueba: recolecta eventos una vez."""
        if not self.collector:
            self._validate_config()
            CollectorClass = COLLECTORS[self.cfg["DB_ENGINE"]]
            self.collector = CollectorClass(self.cfg, self.queue)
        try:
            return self.collector.collect()
        except Exception as e:
            logger.error(f"Error en collect_once: {e}")
            return 0

    def send_pending(self) -> int:
        """Método de prueba: envía eventos pendientes."""
        if not self.sender:
            self.sender = EventSender(self.cfg, self.queue)
        try:
            result = self.sender.send_batch()
            return result.get("sent", 0)
        except Exception as e:
            logger.error(f"Error en send_pending: {e}")
            return 0


# ──────────────────────────────────────────────
#  Setup interactivo
# ──────────────────────────────────────────────

def cmd_setup():
    """Asistente de configuración interactivo."""
    print("\n" + "═" * 56)
    print("  DBaudit Agent — Asistente de Configuración")
    print("═" * 56 + "\n")

    def ask(prompt, default="", secret=False):
        if default:
            prompt = f"{prompt} [{default}]: "
        else:
            prompt = f"{prompt}: "
        if secret:
            import getpass
            v = getpass.getpass(prompt)
        else:
            v = input(prompt).strip()
        return v or default

    cfg = {}
    cfg["AUDIT_SERVER_URL"] = ask("URL del servidor de auditoría", "https://10.0.0.1:8000")
    cfg["AGENT_TOKEN"]      = ask("Token de autenticación del agente", secret=True)
    cfg["AGENT_ID"]         = ask("ID del agente (desde el dashboard)", "")
    cfg["DB_ENGINE"]        = ask("Motor de BD (postgresql/mysql)", "postgresql")
    cfg["DB_HOST"]          = ask("Host de la BD", "localhost")
    cfg["DB_PORT"]          = ask("Puerto", "5432" if cfg["DB_ENGINE"] == "postgresql" else "3306")
    cfg["DB_NAME"]          = ask("Nombre de la base de datos")
    cfg["DB_USER"]          = ask("Usuario de auditoría en la BD", "dbaudit_agent")
    cfg["DB_PASSWORD"]      = ask("Contraseña del usuario", secret=True)
    cfg["POLL_INTERVAL"]    = ask("Intervalo de colecta (segundos)", "30")
    cfg["BATCH_SIZE"]       = ask("Eventos por lote", "200")
    cfg["VERIFY_SSL"]       = ask("Verificar certificado SSL (true/false)", "true")
    cfg["LOG_LEVEL"]        = ask("Nivel de log (INFO/DEBUG/WARNING)", "INFO")

    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    content = "# DBaudit Agent Configuration\n"
    content += f"# Generado: {datetime.now().isoformat()}\n\n"
    for k, v in cfg.items():
        content += f"{k}={v}\n"
    CONFIG_FILE.write_text(content)
    if not is_windows:
        CONFIG_FILE.chmod(0o600)

    print(f"\n✅ Configuración guardada en {CONFIG_FILE}")
    print("   Siguiente paso: python3 dbaudit-agent.py --install")


def cmd_setup_db():
    """Instala schema de auditoría en la BD local."""
    cfg = load_config()
    setup_logging(cfg.get("LOG_LEVEL", "INFO"))
    queue = LocalQueue(QUEUE_DB)
    engine = cfg.get("DB_ENGINE", "")
    CollectorClass = COLLECTORS.get(engine)
    if not CollectorClass:
        print(f"Motor '{engine}' no soportado.")
        sys.exit(1)
    collector = CollectorClass(cfg, queue)
    print(f"\nInstalando schema de auditoría en {engine}://{cfg['DB_HOST']}/{cfg['DB_NAME']}...")
    result = collector.setup()
    print("\nResultado:")
    for detail in result.get("details", []):
        print(f"  {detail}")
    if not result["success"]:
        print(f"\n❌ Error: {result.get('error')}")
        sys.exit(1)

    install = input("\n¿Instalar triggers en todas las tablas del schema 'public'? [s/N]: ")
    if install.lower() in ("s", "si", "y", "yes"):
        schema = input("Schema (default: public): ").strip() or "public"
        r2 = collector.install_triggers(schema)
        if r2["success"]:
            tables = r2.get("tables", [])
            print(f"✅ Triggers instalados en {len(tables)} tablas")
        else:
            print(f"⚠ {r2.get('error')}")

    print("\n✅ Setup completado.")


def cmd_install_service():
    """Instala el agente como servicio (systemd en Linux, Task Scheduler en Windows)."""
    agent_path = Path(sys.argv[0]).resolve()
    is_windows = platform.system() == "Windows"
    
    if is_windows:
        # Windows: crear tarea programada
        import winreg
        try:
            cmd = f'{sys.executable} "{agent_path}" --run'
            task_name = "DBaudit-Agent"
            schtasks_cmd = f'schtasks /create /tn "{task_name}" /tr "{cmd}" /sc onlogon /rl highest /f'
            subprocess.run(schtasks_cmd, shell=True, check=True)
            print(f"✅ Tarea programada instalada: {task_name}")
            print("   Ejecuta con: schtasks /run /tn DBaudit-Agent")
            print("   Ver estado: schtasks /query /tn DBaudit-Agent")
        except Exception as e:
            print(f"⚠ Error instalando tarea: {e}")
            print("   Ejecuta PowerShell como Admin e intenta de nuevo")
    else:
        # Linux: crear servicio systemd
        if os.geteuid() != 0:
            print("❌ Necesitas ejecutar como root: sudo python3 dbaudit-agent.py --install")
            sys.exit(1)

        unit = f"""[Unit]
Description=DBaudit Database Audit Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart={sys.executable} {agent_path} --run
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
EnvironmentFile={CONFIG_FILE}

[Install]
WantedBy=multi-user.target
"""
        SYSTEMD_UNIT.write_text(unit)
        subprocess.run(["systemctl", "daemon-reload"], check=True)
        subprocess.run(["systemctl", "enable", "dbaudit-agent"], check=True)
        print(f"✅ Servicio instalado: {SYSTEMD_UNIT}")
        print("   Inicia con: systemctl start dbaudit-agent")
        print("   Estado con: systemctl status dbaudit-agent")
        print("   Logs con:   journalctl -u dbaudit-agent -f")


def cmd_status():
    cfg = load_config()
    queue = LocalQueue(QUEUE_DB)
    print("\n── DBaudit Agent Status ─────────────────────")
    print(f"  Config:    {CONFIG_FILE}")
    print(f"  Motor BD:  {cfg.get('DB_ENGINE')} @ {cfg.get('DB_HOST')}:{cfg.get('DB_PORT')}/{cfg.get('DB_NAME')}")
    print(f"  Servidor:  {cfg.get('AUDIT_SERVER_URL')}")
    print(f"  Cola:      {queue.size()} eventos pendientes")
    print(f"  PG cursor: {queue.get_state('pg_last_id', '0')}")
    print(f"  MY cursor: {queue.get_state('my_last_id', '0')}")
    print("─────────────────────────────────────────────\n")


# ──────────────────────────────────────────────
#  Entry point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="DBaudit Agent — Agente local de auditoría de bases de datos"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--setup",    action="store_true", help="Configuración interactiva")
    group.add_argument("--setup-db", action="store_true", help="Instalar schema en la BD")
    group.add_argument("--install",  action="store_true", help="Instalar servicio systemd")
    group.add_argument("--status",   action="store_true", help="Ver estado del agente")
    group.add_argument("--run",      action="store_true", help="Ejecutar agente (modo daemon)")
    args = parser.parse_args()

    if args.setup:
        cmd_setup()
    elif args.setup_db:
        cmd_setup_db()
    elif args.install:
        cmd_install_service()
    elif args.status:
        cmd_status()
    else:
        # --run o sin argumentos: iniciar el agente
        Agent().start()
