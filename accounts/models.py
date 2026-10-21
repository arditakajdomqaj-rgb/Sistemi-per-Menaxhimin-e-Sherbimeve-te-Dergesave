from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Perdoruesi i sistemit: admin/menaxher ose korrier."""

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin / Menaxher"
        COURIER = "COURIER", "Korrier"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.COURIER)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
