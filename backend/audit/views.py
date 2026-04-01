from rest_framework import viewsets
from .models import (
    AgentNode,
    DatabaseConnection,
    AuditEvent,
    AlertRule,
    Alert
)
from .serializers import (
    AgentNodeSerializer,
    DatabaseConnectionSerializer,
    AuditEventSerializer,
    AlertRuleSerializer,
    AlertSerializer
)
from .ingest import (
    IngestEventsView,
    IngestHeartbeatView,
    IngestConfigView,
)


class AgentNodeViewSet(viewsets.ModelViewSet):
    queryset = AgentNode.objects.all()
    serializer_class = AgentNodeSerializer


class DatabaseConnectionViewSet(viewsets.ModelViewSet):
    queryset = DatabaseConnection.objects.all()
    serializer_class = DatabaseConnectionSerializer


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditEvent.objects.all()
    serializer_class = AuditEventSerializer


class AlertRuleViewSet(viewsets.ModelViewSet):
    queryset = AlertRule.objects.all()
    serializer_class = AlertRuleSerializer


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer