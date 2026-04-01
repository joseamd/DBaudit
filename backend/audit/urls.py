from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    AgentNodeViewSet,
    DatabaseConnectionViewSet,
    AuditEventViewSet,
    AlertRuleViewSet,
    AlertViewSet,
    IngestEventsView,
    IngestHeartbeatView,
    IngestConfigView,
)

router = DefaultRouter()
router.register(r'agents', AgentNodeViewSet)
router.register(r'databases', DatabaseConnectionViewSet)
router.register(r'events', AuditEventViewSet)
router.register(r'alert-rules', AlertRuleViewSet)
router.register(r'alerts', AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Auth con JWT
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Ingest endpoints for agents
    path('ingest/events/', IngestEventsView.as_view(), name='ingest-events'),
    path('ingest/heartbeat/', IngestHeartbeatView.as_view(), name='ingest-heartbeat'),
    path('ingest/config/', IngestConfigView.as_view(), name='ingest-config'),
]