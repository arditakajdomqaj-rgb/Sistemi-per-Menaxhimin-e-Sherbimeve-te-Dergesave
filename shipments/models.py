"""Modeli fillestar i te dhenave (Raporti 1). Do te zgjerohet ne Raportin 2."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class ShipmentStatus(models.TextChoices):
    CREATED = "CREATED", "Krijuar"
    ASSIGNED = "ASSIGNED", "Caktuar"
    PICKED_UP = "PICKED_UP", "Marre"
    IN_TRANSIT = "IN_TRANSIT", "Ne rruge"
    DELIVERED = "DELIVERED", "Dorezuar"
    FAILED = "FAILED", "Deshtuar"
    CANCELLED = "CANCELLED", "Anuluar"


class Shipment(models.Model):
    """Nje dergese (pako) qe regjistrohet nga admini dhe dorezohet nga nje korrier."""

    tracking_code = models.CharField(max_length=20, unique=True, db_index=True)
    sender_name = models.CharField(max_length=100)
    sender_phone = models.CharField(max_length=20)
    receiver_name = models.CharField(max_length=100)
    receiver_phone = models.CharField(max_length=20)
    pickup_address = models.CharField(max_length=255)
    delivery_address = models.CharField(max_length=255)
    city = models.CharField(max_length=60)
    weight_kg = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0.01)]
    )
    price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=15, choices=ShipmentStatus.choices, default=ShipmentStatus.CREATED
    )
    # 1 korrier : N dergesa. NULL derisa dergesa t'i caktohet nje korrieri.
    courier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_shipments",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_shipments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tracking_code} - {self.get_status_display()}"


class StatusHistory(models.Model):
    """Cdo ndryshim statusi i nje dergese: cfare, kur dhe kush e beri."""

    shipment = models.ForeignKey(
        Shipment, on_delete=models.CASCADE, related_name="history"
    )
    status = models.CharField(max_length=15, choices=ShipmentStatus.choices)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]

    def __str__(self):
        return f"{self.shipment.tracking_code}: {self.status}"
