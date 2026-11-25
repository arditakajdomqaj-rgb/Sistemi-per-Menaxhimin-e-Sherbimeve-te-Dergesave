"""Serializers: validojne input-in dhe e kthejne modelin ne JSON."""
import re

from rest_framework import serializers

from .models import ALLOWED_TRANSITIONS, Shipment, StatusHistory

PHONE_RE = re.compile(r"^\+?[0-9 ]{8,15}$")


def validate_phone(value):
    if not PHONE_RE.match(value):
        raise serializers.ValidationError("Numri i telefonit nuk eshte i vlefshem (8-15 shifra).")
    return value


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.CharField(source="changed_by.username", default=None, read_only=True)

    class Meta:
        model = StatusHistory
        fields = ["status", "note", "changed_by", "changed_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    courier_name = serializers.CharField(source="courier.get_full_name", default=None, read_only=True)
    history = StatusHistorySerializer(many=True, read_only=True)
    sender_phone = serializers.CharField(validators=[validate_phone])
    receiver_phone = serializers.CharField(validators=[validate_phone])
    # Statuset ne te cilat dergesa mund te kaloje nga statusi aktual.
    # Frontend-i i perdor per te shfaqur vetem butonat e lejuar,
    # keshtu rregullat e statuseve mbeten vetem ne backend (models.py).
    next_statuses = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = [
            "id", "tracking_code", "status",
            "sender_name", "sender_phone", "receiver_name", "receiver_phone",
            "pickup_address", "delivery_address", "city", "weight_kg", "price",
            "courier", "courier_name", "created_by", "created_at", "updated_at", "history",
            "next_statuses",
        ]
        # Keto fusha nuk ndryshohen direkt: kodi gjenerohet, statusi dhe korrieri
        # ndryshojne vetem permes /status dhe /assign (qe te ruhet historiku).
        read_only_fields = ["tracking_code", "status", "courier", "created_by", "created_at", "updated_at"]

    def get_next_statuses(self, obj):
        return list(ALLOWED_TRANSITIONS.get(obj.status, []))


class ShipmentListSerializer(ShipmentSerializer):
    """Version me i shkurter per listen (pa historik)."""

    class Meta(ShipmentSerializer.Meta):
        fields = [
            "id", "tracking_code", "status", "receiver_name", "city",
            "delivery_address", "weight_kg", "price", "courier", "courier_name", "created_at",
            "receiver_phone", "next_statuses",
        ]


class AssignSerializer(serializers.Serializer):
    courier_id = serializers.IntegerField()


class StatusChangeSerializer(serializers.Serializer):
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, default="")


class PublicTrackingSerializer(serializers.ModelSerializer):
    """Per klientin pa login: pa emra, telefona apo adresa te plota."""

    history = serializers.SerializerMethodField()

    class Meta:
        model = Shipment
        fields = ["tracking_code", "status", "city", "created_at", "history"]

    def get_history(self, obj):
        return [
            {"status": h.status, "note": h.note, "changed_at": h.changed_at}
            for h in obj.history.all()
        ]
