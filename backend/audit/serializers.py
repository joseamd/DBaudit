from rest_framework import serializers
from .models import (
    AgentNode,
    DatabaseConnection,
    AuditEvent,
    AlertRule,
    Alert
)


class AgentNodeSerializer(serializers.ModelSerializer):
    is_healthy = serializers.ReadOnlyField()

    class Meta:
        model = AgentNode
        fields = "__all__"
        read_only_fields = ("token", "created_at")


class DatabaseConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatabaseConnection
        fields = "__all__"


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = "__all__"


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = "__all__"


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = "__all__"