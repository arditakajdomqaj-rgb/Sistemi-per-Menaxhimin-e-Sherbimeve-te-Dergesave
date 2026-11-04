from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("shipments.urls")),
    path("api-auth/", include("rest_framework.urls")),  # login per faqen e API-se ne browser
]
