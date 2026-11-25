"""Logjika e biznesit per dergesat.

View-t (API) vetem pranojne request-in dhe kthejne pergjigjen.
Rregullat (kush mund te beje cfare, cilat statuse lejohen, historiku)
jane te gjitha ketu, ne nje vend te vetem.
"""
from django.db import transaction
from rest_framework import status as http

from accounts.models import User
from config.exceptions import ApiError

from .models import Shipment, ShipmentStatus, StatusHistory


def _set_status(shipment, new_status, user, note=""):
    if not shipment.can_change_to(new_status):
        raise ApiError(
            "INVALID_STATUS_TRANSITION",
            f"Statusi nuk mund te ndryshoje nga {shipment.status} ne {new_status}.",
        )
    shipment.status = new_status
    shipment.save(update_fields=["status", "courier", "updated_at"])
    # Cdo ndryshim statusi ruhet ne historik: cfare, kur dhe kush.
    StatusHistory.objects.create(shipment=shipment, status=new_status, note=note, changed_by=user)
    return shipment


@transaction.atomic
def create_shipment(data, user):
    """Krijon dergesen dhe rekordin e pare ne historik (CREATED)."""
    shipment = Shipment.objects.create(**data, created_by=user)
    StatusHistory.objects.create(
        shipment=shipment, status=ShipmentStatus.CREATED, note="Shipment registered", changed_by=user
    )
    return shipment


@transaction.atomic
def assign_courier(shipment, courier_id, user):
    """Admini ia cakton dergesen nje korrieri aktiv."""
    courier = User.objects.filter(id=courier_id, role=User.Role.COURIER, is_active=True).first()
    if courier is None:
        raise ApiError("INVALID_COURIER", "Korrieri nuk ekziston ose nuk eshte aktiv.")
    shipment.courier = courier
    return _set_status(shipment, ShipmentStatus.ASSIGNED, user, note=f"Assigned to {courier.get_full_name()}")


@transaction.atomic
def change_status(shipment, new_status, user, note=""):
    """Ndryshimi i statusit nga korrieri (ose admini)."""
    if new_status not in ShipmentStatus.values:
        raise ApiError("INVALID_STATUS", f"Statusi '{new_status}' nuk ekziston.")
    # Statuset ASSIGNED dhe CANCELLED vendosen vetem nga admini, me endpoint-et e veta.
    if new_status in (ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED, ShipmentStatus.CREATED):
        raise ApiError(
            "INVALID_STATUS",
            "Per caktim perdorni /assign, per anulim DELETE /api/shipments/<id>.",
        )
    if new_status == ShipmentStatus.FAILED and not note:
        raise ApiError("NOTE_REQUIRED", "Per statusin FAILED duhet te shenohet arsyeja (note).")
    return _set_status(shipment, new_status, user, note)


@transaction.atomic
def cancel_shipment(shipment, user, note=""):
    """Dergesa nuk fshihet nga databaza (ka historik), vetem anulohet."""
    if shipment.status in (ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED):
        raise ApiError(
            "CANNOT_CANCEL",
            "Nje dergese e dorezuar ose e anuluar nuk mund te anulohet.",
            http.HTTP_409_CONFLICT,
        )
    return _set_status(shipment, ShipmentStatus.CANCELLED, user, note or "Shipment cancelled")
