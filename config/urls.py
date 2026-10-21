from django.contrib import admin
from django.urls import path

urlpatterns = [
    path("admin/", admin.site.urls),
    # Endpoint-et e API-se shtohen ne Raportin 2 (api/auth, api/shipments, api/track).
]
