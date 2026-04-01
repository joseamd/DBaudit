from django.utils import timezone
from datetime import timedelta

from .models import AlertRule, Alert


class AlertEngine:
    """
    Motor de evaluación de alertas.
    Evalúa un evento contra reglas activas y genera alertas.
    """

    @staticmethod
    def evaluate_event(event):
        rules = AlertRule.objects.filter(is_active=True)

        for rule in rules:
            if not AlertEngine._rule_applies(rule, event):
                continue

            if AlertEngine._match_condition(rule, event):
                AlertEngine._create_alert(rule, event)

    # ──────────────────────────────────────────────

    @staticmethod
    def _rule_applies(rule, event):
        """Check if rule applies to this database"""
        return rule.database is None or rule.database == event.database

    # ──────────────────────────────────────────────

    @staticmethod
    def _match_condition(rule, event):
        config = rule.condition_config

        if rule.condition_type == 'operation_type':
            return event.operation in config.get('operations', [])

        elif rule.condition_type == 'sensitive_table':
            return event.table_name in config.get('tables', [])

        elif rule.condition_type == 'bulk_delete':
            return (
                event.operation in ['DELETE', 'TRUNCATE'] and
                (event.rows_affected or 0) > config.get('threshold', 100)
            )

        elif rule.condition_type == 'failed_login':
            return not event.success and event.operation == 'LOGIN'

        elif rule.condition_type == 'off_hours':
            hour = event.occurred_at.hour
            start = config.get('start_hour', 22)
            end = config.get('end_hour', 6)

            if start > end:
                return hour >= start or hour < end
            return start <= hour < end

        return False

    # ──────────────────────────────────────────────

    @staticmethod
    def _create_alert(rule, event):
        Alert.objects.create(
            rule=rule,
            event=event,
            title=f"Rule triggered: {rule.name}",
            description=f"Event {event.operation} matched rule {rule.condition_type}",
            severity=rule.severity,
        )