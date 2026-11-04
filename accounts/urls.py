from django.urls import path

from . import views

urlpatterns = [
    path("auth/login", views.LoginView.as_view(), name="login"),
    path("auth/logout", views.LogoutView.as_view(), name="logout"),
    path("auth/me", views.MeView.as_view(), name="me"),
    path("couriers", views.CourierListCreateView.as_view(), name="courier-list"),
    path("couriers/<int:pk>", views.CourierDetailView.as_view(), name="courier-detail"),
]
