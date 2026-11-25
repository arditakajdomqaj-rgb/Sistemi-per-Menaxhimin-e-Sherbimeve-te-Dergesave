"""Faqet e frontend-it.

Keto view-e vetem kthejne HTML-in e faqes. Te dhenat nuk vendosen ketu:
JavaScript-i i faqes i merr nga API-ja (/api/...) me fetch() dhe token.
Keshtu frontend-i perdor te njejtin API qe u testua me Postman ne Raportin 2,
dhe kontrolli i roleve mbetet ne backend.
"""
from django.conf import settings
from django.views.generic import RedirectView, TemplateView


class PageView(TemplateView):
    page = ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["page"] = self.page
        # Llogarite testuese shfaqen te login-i vetem gjate zhvillimit (DEBUG=True).
        context["show_demo_accounts"] = settings.DEBUG
        return context


home = RedirectView.as_view(url="/login", permanent=False)
login = PageView.as_view(template_name="pages/login.html", page="login")
dashboard = PageView.as_view(template_name="pages/dashboard.html", page="dashboard")
shipments = PageView.as_view(template_name="pages/shipments.html", page="shipments")
shipment_detail = PageView.as_view(template_name="pages/shipment_detail.html", page="shipments")
courier = PageView.as_view(template_name="pages/courier.html", page="courier")
couriers = PageView.as_view(template_name="pages/couriers.html", page="couriers")
track = PageView.as_view(template_name="pages/track.html", page="track")
