from django.contrib import admin

from .models import Shipment, StatusHistory


class StatusHistoryInline(admin.TabularInline):
    model = StatusHistory
    extra = 0


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("tracking_code", "receiver_name", "city", "status", "courier", "created_at")
    list_filter = ("status", "city", "courier")
    search_fields = ("tracking_code", "receiver_name")
    inlines = [StatusHistoryInline]
