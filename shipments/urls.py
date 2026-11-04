from django.urls import path

from . import views

urlpatterns = [
    path("shipments", views.ShipmentListCreateView.as_view(), name="shipment-list"),
    path("shipments/<int:pk>", views.ShipmentDetailView.as_view(), name="shipment-detail"),
    path("shipments/<int:pk>/assign", views.ShipmentAssignView.as_view(), name="shipment-assign"),
    path("shipments/<int:pk>/status", views.ShipmentStatusView.as_view(), name="shipment-status"),
    path("track/<str:code>", views.TrackingView.as_view(), name="track"),
    path("stats", views.StatsView.as_view(), name="stats"),
]
