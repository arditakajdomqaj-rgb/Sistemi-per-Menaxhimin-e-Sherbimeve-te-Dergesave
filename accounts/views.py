from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.exceptions import ApiError

from .models import User
from .permissions import IsAdminRole
from .serializers import CourierCreateSerializer, LoginSerializer, UserSerializer


class LoginView(APIView):
    """POST /api/auth/login  ->  kthen token-in dhe te dhenat e perdoruesit."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            if "INVALID_CREDENTIALS" in str(serializer.errors):
                raise ApiError(
                    "INVALID_CREDENTIALS",
                    "Username ose password i gabuar.",
                    status.HTTP_401_UNAUTHORIZED,
                )
            raise ApiError("VALIDATION_ERROR", "Username dhe password jane te detyrueshme.")

        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    """POST /api/auth/logout  ->  fshin token-in, keshtu qe nuk mund te perdoret me."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"success": True, "message": "Dolet nga sistemi."})


class MeView(APIView):
    """GET /api/auth/me  ->  perdoruesi aktual."""

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CourierListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/couriers  (vetem admin)."""

    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.COURIER).order_by("first_name")

    def get_serializer_class(self):
        return CourierCreateSerializer if self.request.method == "POST" else UserSerializer


class CourierDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/couriers/<id>  (vetem admin). Per c'aktivizim: {"is_active": false}."""

    permission_classes = [IsAdminRole]
    serializer_class = UserSerializer
    queryset = User.objects.filter(role=User.Role.COURIER)
