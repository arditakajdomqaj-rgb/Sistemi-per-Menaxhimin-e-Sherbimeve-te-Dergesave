from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdminOrAssignedCourier(BasePermission):
    """Admini sheh cdo dergese; korrieri vetem ato qe i jane caktuar atij."""

    message = "Kjo dergese nuk ju eshte caktuar juve."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        return obj.courier_id == request.user.id
