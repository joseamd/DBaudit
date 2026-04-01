"""
URL configuration for dbaudit_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from audit.views import (
    AgentNodeViewSet,
    DatabaseConnectionViewSet,
    AuditEventViewSet,
    AlertRuleViewSet,
    AlertViewSet,
)
from audit.ingest import (
    IngestEventsView,
    IngestHeartbeatView,
    IngestConfigView,
)

import os

# ── Router
router = DefaultRouter()
router.register(r'agents', AgentNodeViewSet)
router.register(r'databases', DatabaseConnectionViewSet)
router.register(r'events', AuditEventViewSet)
router.register(r'alert-rules', AlertRuleViewSet)
router.register(r'alerts', AlertViewSet)


# ── Descargar agente
def download_agent(request):
    agent_path = os.path.join(settings.BASE_DIR, "agent", "dbaudit-agent.py")
    if not os.path.exists(agent_path):
        raise Http404("Agent script not found")

    return FileResponse(
        open(agent_path, "rb"),
        as_attachment=True,
        filename="dbaudit-agent.py",
        content_type="text/x-python",
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    # API principal
    path("api/", include(router.urls)),

    # INGEST (agentes)
    path("api/ingest/events/", IngestEventsView.as_view()),
    path("api/ingest/heartbeat/", IngestHeartbeatView.as_view()),
    path("api/ingest/config/", IngestConfigView.as_view()),

    # Auth
    path("api/auth/token/", obtain_auth_token),

    # Descarga agente
    path("download/dbaudit-agent.py", download_agent),
]
