"""Kontrolli i roleve. Behet ne backend, jo vetem duke fshehur butonat ne UI."""
from rest_framework.permissions import BasePermission

from .models import User


class IsAdminRole(BasePermission):
    """Lejon vetem perdoruesit me rol ADMIN."""

    message = "Vetem admini mund ta beje kete veprim."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )
