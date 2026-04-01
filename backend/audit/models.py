from django.db import models
from django.contrib.auth.models import User
import uuid
import secrets


class AgentNode(models.Model):
    """
    Represents a remote agent installed on a database server.
    The agent runs as a systemd service, collects local DB events
    and pushes them here via HTTPS using its token.
    """
    STATUS_CHOICES = [
        ('pending',  'Pending — waiting first connection'),
        ('active',   'Active'),
        ('warning',  'Warning — delayed heartbeat'),
        ('offline',  'Offline'),
        ('disabled', 'Disabled'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name         = models.CharField(max_length=255, help_text="Friendly name, e.g. 'prod-mysql-billing agent'")
    description  = models.TextField(blank=True)

    # Authentication — the agent uses this token in every request
    token        = models.CharField(max_length=64, unique=True, editable=False)

    # Where the agent lives
    server_host  = models.CharField(max_length=255, help_text="IP or hostname of the server running the agent")
    server_os    = models.CharField(max_length=100, blank=True)
    agent_version = models.CharField(max_length=20, blank=True)

    # Status & heartbeat
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    last_event_at  = models.DateTimeField(null=True, blank=True)
    queue_size     = models.IntegerField(default=0, help_text="Pending events in agent local queue")

    # Link to the DB being monitored (set after first heartbeat or manually)
    database     = models.OneToOneField(
        'DatabaseConnection', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='agent'
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    created_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Agent [{self.name}] @ {self.server_host} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(32)   # 64 char hex token
        super().save(*args, **kwargs)

    @property
    def is_healthy(self):
        if not self.last_heartbeat:
            return False
        from django.utils import timezone
        from datetime import timedelta
        return (timezone.now() - self.last_heartbeat) < timedelta(minutes=5)


class DatabaseConnection(models.Model):
    """Represents a monitored database connection."""
    ENGINE_CHOICES = [
        ('postgresql', 'PostgreSQL'),
        ('mysql', 'MySQL'),
        ('sqlite', 'SQLite'),
        ('mssql', 'SQL Server'),
        ('oracle', 'Oracle'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('error', 'Error'),
    ]
    MODE_CHOICES = [
        ('direct', 'Direct — audit server connects to DB'),
        ('agent',  'Agent  — remote agent pushes events here'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    connection_mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='direct')
    engine = models.CharField(max_length=50, choices=ENGINE_CHOICES)
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    database_name = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=500)  # encrypted in production
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    last_checked = models.DateTimeField(null=True, blank=True)
    extra_config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.engine}://{self.host}:{self.port}/{self.database_name})"


class AuditEvent(models.Model):
    """A single audited database event."""
    OPERATION_CHOICES = [
        ('SELECT', 'SELECT'),
        ('INSERT', 'INSERT'),
        ('UPDATE', 'UPDATE'),
        ('DELETE', 'DELETE'),
        ('CREATE', 'CREATE TABLE/INDEX'),
        ('ALTER', 'ALTER'),
        ('DROP', 'DROP'),
        ('TRUNCATE', 'TRUNCATE'),
        ('GRANT', 'GRANT'),
        ('REVOKE', 'REVOKE'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CONNECT', 'Connect'),
        ('DISCONNECT', 'Disconnect'),
        ('OTHER', 'Other'),
    ]
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    database = models.ForeignKey(
        DatabaseConnection, on_delete=models.CASCADE, related_name='audit_events'
    )
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='low')

    # Who did it
    db_user = models.CharField(max_length=255)
    application_name = models.CharField(max_length=255, blank=True)
    client_host = models.CharField(max_length=255, blank=True)
    client_port = models.IntegerField(null=True, blank=True)

    # What was affected
    schema_name = models.CharField(max_length=255, blank=True)
    table_name = models.CharField(max_length=255, blank=True)
    query = models.TextField(blank=True)
    query_hash = models.CharField(max_length=64, blank=True, db_index=True)

    # Before/after for DML
    rows_affected = models.IntegerField(null=True, blank=True)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    # Timing
    occurred_at = models.DateTimeField(db_index=True)
    duration_ms = models.FloatField(null=True, blank=True)

    # Status
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    # Internal
    raw_log = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['database', 'occurred_at']),
            models.Index(fields=['db_user', 'occurred_at']),
            models.Index(fields=['operation', 'occurred_at']),
            models.Index(fields=['table_name', 'occurred_at']),
            models.Index(fields=['severity', 'occurred_at']),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.operation} on {self.table_name} by {self.db_user}"


class AlertRule(models.Model):
    """Configurable alert rules for anomaly detection."""
    CONDITION_CHOICES = [
        ('operation_type', 'Specific Operation'),
        ('user_activity', 'User Activity Threshold'),
        ('off_hours', 'Off-Hours Access'),
        ('bulk_delete', 'Bulk Delete/Truncate'),
        ('privilege_change', 'Privilege Change'),
        ('failed_login', 'Failed Login Attempts'),
        ('sensitive_table', 'Sensitive Table Access'),
        ('schema_change', 'Schema Change (DDL)'),
        ('unusual_volume', 'Unusual Query Volume'),
        ('new_user', 'New/Unknown User'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    database = models.ForeignKey(
        DatabaseConnection, on_delete=models.CASCADE,
        related_name='alert_rules', null=True, blank=True,
        help_text="Null = applies to all databases"
    )
    condition_type = models.CharField(max_length=50, choices=CONDITION_CHOICES)
    condition_config = models.JSONField(default=dict)
    # e.g. {"operations": ["DELETE","DROP"], "tables": ["users","payments"]}
    # e.g. {"threshold": 100, "window_minutes": 5}
    # e.g. {"start_hour": 22, "end_hour": 6}

    severity = models.CharField(
        max_length=10, choices=AuditEvent.SEVERITY_CHOICES, default='medium'
    )
    is_active = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=True)
    notify_webhook = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Rule: {self.name} ({self.condition_type})"


class Alert(models.Model):
    """Triggered alert instance."""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name='alerts')
    event = models.ForeignKey(
        AuditEvent, on_delete=models.SET_NULL, null=True, related_name='alerts'
    )
    title = models.CharField(max_length=500)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=AuditEvent.SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    triggered_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='acknowledged_alerts'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"


class AuditReport(models.Model):
    """Saved compliance/audit reports."""
    REPORT_TYPE_CHOICES = [
        ('activity_summary', 'Activity Summary'),
        ('user_activity', 'User Activity'),
        ('sensitive_access', 'Sensitive Data Access'),
        ('privilege_changes', 'Privilege Changes'),
        ('schema_changes', 'Schema Changes'),
        ('anomaly_report', 'Anomaly Report'),
        ('compliance_gdpr', 'Compliance - GDPR'),
        ('compliance_sox', 'Compliance - SOX'),
        ('compliance_hipaa', 'Compliance - HIPAA'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    database = models.ForeignKey(
        DatabaseConnection, on_delete=models.SET_NULL, null=True, blank=True
    )
    date_from = models.DateTimeField()
    date_to = models.DateTimeField()
    filters = models.JSONField(default=dict, blank=True)
    result_summary = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    file_path = models.CharField(max_length=500, blank=True)  # exported file

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.name} ({self.report_type})"
