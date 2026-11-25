from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("login", views.login, name="page-login"),
    path("dashboard", views.dashboard, name="page-dashboard"),
    path("shipments", views.shipments, name="page-shipments"),
    path("shipments/<int:pk>", views.shipment_detail, name="page-shipment-detail"),
    path("courier", views.courier, name="page-courier"),
    path("couriers", views.couriers, name="page-couriers"),
    path("track", views.track, name="page-track"),
]
