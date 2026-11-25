"""Krijon te dhena testuese per demonstrim.

Perdorimi:
    python manage.py seed_data          # shton te dhenat
    python manage.py seed_data --reset  # fshin dergesat e vjetra dhe i krijon nga e para

Te gjithe perdoruesit testues kane password-in: Test1234!
(vetem per zhvillim lokal, jo per versionin online)
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from shipments.models import Shipment, ShipmentStatus, StatusHistory

PASSWORD = "Test1234!"

ADMINS = [
    ("admin", "Ardita", "Kajdomqaj"),
    ("menaxher", "Blerta", "Krasniqi"),
]
COURIERS = [
    ("korrier1", "Arben", "Gashi", "+383 44 111 222"),
    ("korrier2", "Driton", "Berisha", "+383 45 333 444"),
    ("korrier3", "Liridon", "Hoxha", "+383 49 555 666"),
]
CITIES = ["Prishtina", "Prizren", "Peja", "Gjakova", "Ferizaj", "Mitrovica", "Gjilan"]
FIRST = ["Arta", "Besnik", "Dafina", "Egzon", "Fjolla", "Granit", "Hana", "Ilir", "Jeta", "Kushtrim", "Lea", "Mentor"]
LAST = ["Shala", "Morina", "Rexhepi", "Bytyqi", "Kastrati", "Zeka", "Mustafa", "Osmani"]
STREETS = ["Rr. Nena Tereze", "Rr. Agim Ramadani", "Rr. Luan Haradinaj", "Rr. Fehmi Agani", "Rr. Adem Jashari"]

# Rruga qe pershkon nje dergese deri ne statusin perfundimtar.
PATHS = {
    ShipmentStatus.CREATED: [],
    ShipmentStatus.ASSIGNED: [ShipmentStatus.ASSIGNED],
    ShipmentStatus.PICKED_UP: [ShipmentStatus.ASSIGNED, ShipmentStatus.PICKED_UP],
    ShipmentStatus.IN_TRANSIT: [ShipmentStatus.ASSIGNED, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT],
    ShipmentStatus.DELIVERED: [ShipmentStatus.ASSIGNED, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
    ShipmentStatus.FAILED: [ShipmentStatus.ASSIGNED, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.FAILED],
    ShipmentStatus.CANCELLED: [ShipmentStatus.CANCELLED],
}
NOTES = {
    ShipmentStatus.ASSIGNED: "Assigned to courier",
    ShipmentStatus.PICKED_UP: "Parcel picked up from sender",
    ShipmentStatus.IN_TRANSIT: "Out for delivery",
    ShipmentStatus.DELIVERED: "Delivered to recipient",
    ShipmentStatus.FAILED: "Recipient did not answer the phone",
    ShipmentStatus.CANCELLED: "Cancelled at the sender's request",
}


def phone():
    return f"+383 4{random.choice('4589')} {random.randint(100, 999)} {random.randint(100, 999)}"


def person():
    return f"{random.choice(FIRST)} {random.choice(LAST)}"


class Command(BaseCommand):
    help = "Krijon perdorues dhe dergesa testuese"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Fshin dergesat ekzistuese")
        parser.add_argument("--count", type=int, default=30)

    def make_user(self, username, first, last, role, phone_no=""):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first, "last_name": last, "role": role, "phone": phone_no,
                "email": f"{username}@dergesat.test",
                "is_staff": role == User.Role.ADMIN, "is_superuser": username == "admin",
            },
        )
        if created:
            user.set_password(PASSWORD)
            user.save()
        return user

    @transaction.atomic
    def handle(self, *args, **opts):
        random.seed(42)  # te njejtat te dhena sa here qe ekzekutohet
        if opts["reset"]:
            Shipment.objects.all().delete()

        admins = [self.make_user(u, f, l, User.Role.ADMIN) for u, f, l in ADMINS]
        couriers = [self.make_user(u, f, l, User.Role.COURIER, p) for u, f, l, p in COURIERS]

        weights = [ShipmentStatus.CREATED] * 4 + [ShipmentStatus.ASSIGNED] * 4 + \
            [ShipmentStatus.PICKED_UP] * 3 + [ShipmentStatus.IN_TRANSIT] * 5 + \
            [ShipmentStatus.DELIVERED] * 10 + [ShipmentStatus.FAILED] * 2 + [ShipmentStatus.CANCELLED] * 2

        now = timezone.now()
        for i in range(opts["count"]):
            final = weights[i % len(weights)]
            admin = random.choice(admins)
            courier = random.choice(couriers) if final not in (ShipmentStatus.CREATED, ShipmentStatus.CANCELLED) else None
            created_at = now - timedelta(days=random.randint(0, 20), hours=random.randint(0, 10))

            s = Shipment.objects.create(
                sender_name=person(), sender_phone=phone(),
                receiver_name=person(), receiver_phone=phone(),
                pickup_address=f"{random.choice(STREETS)} {random.randint(1, 120)}, Prishtina",
                delivery_address=f"{random.choice(STREETS)} {random.randint(1, 120)}",
                city=random.choice(CITIES),
                weight_kg=Decimal(random.randint(1, 250)) / 10,
                price=Decimal(random.choice([2, 2.5, 3, 4, 5, 7.5])),
                created_by=admin, courier=courier, status=final,
            )
            t = created_at
            history = [StatusHistory(shipment=s, status=ShipmentStatus.CREATED, note="Shipment registered", changed_by=admin)]
            for step in PATHS[final]:
                who = courier if step in (ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT,
                                          ShipmentStatus.DELIVERED, ShipmentStatus.FAILED) else admin
                history.append(StatusHistory(shipment=s, status=step, note=NOTES[step], changed_by=who))
            for h in history:
                h.save()
                # Datat reale te rrjedhes (auto_now_add nuk lejon vlera te kaluara ne create).
                StatusHistory.objects.filter(pk=h.pk).update(changed_at=t)
                t += timedelta(hours=random.randint(1, 8))
            Shipment.objects.filter(pk=s.pk).update(created_at=created_at)

        self.stdout.write(self.style.SUCCESS(
            f"U krijuan {len(admins)} admin, {len(couriers)} korriere dhe {opts['count']} dergesa. "
            f"Password per te gjithe: {PASSWORD}"
        ))
