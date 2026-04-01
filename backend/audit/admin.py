from django.contrib import admin
from .models import (
    AgentNode,
    DatabaseConnection,
    AuditEvent,
    AlertRule,
    Alert,
    AuditReport,
)

@admin.register(AgentNode)
class AgentNodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'server_host', 'status', 'last_heartbeat', 'created_at']
    list_filter = ['status']
    search_fields = ['name', 'server_host']
    readonly_fields = ['id', 'token', 'created_at']

@admin.register(DatabaseConnection)
class DatabaseConnectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'engine', 'host', 'port', 'status', 'connection_mode']
    list_filter = ['engine', 'status', 'connection_mode']
    search_fields = ['name', 'host', 'database_name']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ['operation', 'database_name', 'severity', 'db_user', 'table_name', 'occurred_at', 'success']
    list_filter = ['operation', 'database__name','severity', 'success']
    search_fields = ['db_user', 'table_name', 'query']
    readonly_fields = ['id', 'created_at']

    # Método para mostrar el nombre de la base de datos
    def database_name(self, obj):
        return obj.database.name  # asumimos que DatabaseConnection tiene el campo 'name'
    database_name.short_description = "Database"  # título de columna en admin

@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'condition_type', 'severity', 'is_active', 'notify_email']
    list_filter = ['condition_type', 'severity', 'is_active']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at']

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'severity', 'status', 'triggered_at', 'acknowledged_by']
    list_filter = ['severity', 'status']
    search_fields = ['title']
    readonly_fields = ['id', 'triggered_at']

@admin.register(AuditReport)
class AuditReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'database', 'date_from', 'date_to', 'generated_at']
    list_filter = ['report_type']
    search_fields = ['name']
    readonly_fields = ['id', 'generated_at']