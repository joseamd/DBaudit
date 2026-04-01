from rest_framework.permissions import BasePermission
from .models import AgentNode

class AgentTokenPermission(BasePermission):
    def has_permission(self, request, view):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header.startswith("Token "):
            return False

        token = auth_header.split(" ", 1)[1].strip()

        return AgentNode.objects.filter(token=token).exists()