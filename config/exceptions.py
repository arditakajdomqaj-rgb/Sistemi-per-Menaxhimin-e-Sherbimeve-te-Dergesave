"""Trajtimi i gabimeve: cdo gabim i API-se kthehet ne te njejtin format JSON.

Shembull:
    HTTP 404
    {
        "success": false,
        "error": "NOT_FOUND",
        "message": "Resursi nuk ekziston."
    }
"""
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.views import exception_handler


class ApiError(APIException):
    """Gabim i logjikes se biznesit me kod te qarte, p.sh. INVALID_STATUS_TRANSITION."""

    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, error, message, status_code=None):
        self.error = error
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=message)


# Kodet e gabimeve sipas statusit HTTP, kur gabimi vjen nga vete Django REST Framework.
DEFAULT_ERRORS = {
    400: ("VALIDATION_ERROR", "Te dhenat e derguara nuk jane te vlefshme."),
    401: ("NOT_AUTHENTICATED", "Duhet te kyçeni per te perdorur kete endpoint."),
    403: ("PERMISSION_DENIED", "Nuk keni te drejte per kete veprim."),
    404: ("NOT_FOUND", "Resursi nuk ekziston."),
    405: ("METHOD_NOT_ALLOWED", "Kjo metode HTTP nuk lejohet ketu."),
}


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        # Gabim i papritur (500): e trajton Django vete.
        return None

    if isinstance(exc, ApiError):
        body = {"success": False, "error": exc.error, "message": exc.message}
    else:
        error, message = DEFAULT_ERRORS.get(
            response.status_code, ("ERROR", "Ndodhi nje gabim.")
        )
        # Nese permission-i ka mesazhin e vet (p.sh. "Vetem admini..."), e perdorim ate.
        if isinstance(exc, PermissionDenied) and str(exc.detail) != str(PermissionDenied.default_detail):
            message = str(exc.detail)
        body = {"success": False, "error": error, "message": message}
        # Per gabimet e validimit tregojme cila fushe ka problem.
        if response.status_code == 400:
            body["details"] = response.data

    response.data = body
    return response
