from datetime import date

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdminRole
from config.exceptions import ApiError

from . import services
from .models import Shipment, ShipmentStatus
from .permissions import IsAdminOrAssignedCourier
from .serializers import (
    AssignSerializer,
    PublicTrackingSerializer,
    ShipmentListSerializer,
    ShipmentSerializer,
    StatusChangeSerializer,
)


def parse_date(value, name):
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ApiError("INVALID_FILTER", f"Parametri '{name}' duhet te jete ne formatin YYYY-MM-DD.")


class ShipmentListCreateView(generics.ListCreateAPIView):
    """GET  /api/shipments  -> lista (admin: te gjitha, korrier: vetem te vetat)
    POST /api/shipments  -> krijim (vetem admin)

    Filtra: ?status=IN_TRANSIT  ?city=Prishtine  ?courier=3
            ?search=DRG-2026  ?date_from=2026-11-01  ?date_to=2026-11-30
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminRole()]
        return super().get_permissions()

    def get_serializer_class(self):
        return ShipmentSerializer if self.request.method == "POST" else ShipmentListSerializer

    def get_queryset(self):
        qs = Shipment.objects.select_related("courier")
        user = self.request.user
        if user.role == User.Role.COURIER:
            qs = qs.filter(courier=user)

        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"].upper())
        if p.get("city"):
            qs = qs.filter(city__iexact=p["city"])
        if p.get("courier"):
            if not p["courier"].isdigit():
                raise ApiError("INVALID_FILTER", "Parametri 'courier' duhet te jete numer (ID).")
            qs = qs.filter(courier_id=p["courier"])
        if p.get("search"):
            qs = qs.filter(
                Q(tracking_code__icontains=p["search"]) | Q(receiver_name__icontains=p["search"])
            )
        if p.get("date_from"):
            qs = qs.filter(created_at__date__gte=parse_date(p["date_from"], "date_from"))
        if p.get("date_to"):
            qs = qs.filter(created_at__date__lte=parse_date(p["date_to"], "date_to"))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = ShipmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # 400 nese mungon ose eshte gabim nje fushe
        shipment = services.create_shipment(serializer.validated_data, request.user)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)


class ShipmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET    /api/shipments/<id>  -> detajet + historiku
    PATCH  /api/shipments/<id>  -> ndryshim i te dhenave (admin, para se te merret)
    DELETE /api/shipments/<id>  -> anulim (admin); dergesa nuk fshihet nga databaza
    """

    serializer_class = ShipmentSerializer
    permission_classes = [IsAdminOrAssignedCourier]
    queryset = Shipment.objects.select_related("courier").prefetch_related("history__changed_by")
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [IsAdminRole()]
        return [perm() for perm in self.permission_classes]

    def perform_update(self, serializer):
        if serializer.instance.status not in (ShipmentStatus.CREATED, ShipmentStatus.ASSIGNED):
            raise ApiError(
                "SHIPMENT_LOCKED",
                "Dergesa nuk mund te ndryshohet pasi korrieri e ka marre.",
                status.HTTP_409_CONFLICT,
            )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        shipment = self.get_object()
        services.cancel_shipment(shipment, request.user, request.data.get("note", ""))
        return Response(ShipmentSerializer(shipment).data)


class ShipmentAssignView(APIView):
    """PATCH /api/shipments/<id>/assign   body: {"courier_id": 3}   (vetem admin)"""

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk)
        serializer = AssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.assign_courier(shipment, serializer.validated_data["courier_id"], request.user)
        return Response(ShipmentSerializer(shipment).data)


class ShipmentStatusView(APIView):
    """PATCH /api/shipments/<id>/status   body: {"status": "PICKED_UP", "note": "..."}"""

    permission_classes = [IsAdminOrAssignedCourier]

    def patch(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk)
        self.check_object_permissions(request, shipment)  # 403 per dergesen e tjetrit
        serializer = StatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.change_status(
            shipment,
            serializer.validated_data["status"].upper(),
            request.user,
            serializer.validated_data["note"],
        )
        return Response(ShipmentSerializer(shipment).data)


class TrackingView(APIView):
    """GET /api/track/<tracking_code>  -> publik, pa login"""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, code):
        shipment = Shipment.objects.prefetch_related("history").filter(tracking_code=code.upper()).first()
        if shipment is None:
            raise ApiError("SHIPMENT_NOT_FOUND", "Dergesa nuk u gjet.", status.HTTP_404_NOT_FOUND)
        return Response(PublicTrackingSerializer(shipment).data)


class StatsView(APIView):
    """GET /api/stats  -> te dhenat per dashboard-in e adminit"""

    permission_classes = [IsAdminRole]

    def get(self, request):
        by_status = dict(
            Shipment.objects.values_list("status").annotate(n=Count("id")).values_list("status", "n")
        )
        couriers = (
            User.objects.filter(role=User.Role.COURIER)
            .annotate(
                total=Count("assigned_shipments"),
                delivered=Count(
                    "assigned_shipments",
                    filter=Q(assigned_shipments__status=ShipmentStatus.DELIVERED),
                ),
            )
            .order_by("-delivered")
        )
        return Response({
            "total": Shipment.objects.count(),
            "by_status": {s: by_status.get(s, 0) for s in ShipmentStatus.values},
            "by_courier": [
                {"id": c.id, "name": c.get_full_name(), "total": c.total, "delivered": c.delivered}
                for c in couriers
            ],
        })
