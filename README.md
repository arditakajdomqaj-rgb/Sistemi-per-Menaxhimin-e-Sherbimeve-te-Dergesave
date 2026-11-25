# ShipQuick – Sistem per Menaxhimin e Sherbimeve te Dergesave

Projekt individual – Praktike Profesionale, Semestri V (2026/2027).

Aplikacion web ku nje kompani dergesash regjistron pakot, ua cakton korriereve, korrieret perditesojne statusin, dhe klienti e ndjek dergesen me kod gjurmimi.

## Rolet
- **Admin / Menaxher**: krijon dergesa, i cakton te korrieret, menaxhon korrieret, sheh statistikat
- **Korrier**: sheh dergesat e veta dhe ndryshon statusin
- **Klient**: gjurmon dergesen me kod, pa login

## Teknologjite
Python 3.12+ · Django 5 · Django REST Framework · Bootstrap 5 · SQLite (zhvillim) / PostgreSQL (deployment) · Render

## Dokumentimi
- [Raporti Teknik 1 – Analiza, kerkesat dhe dizajni](docs/Raporti_Teknik_1.pdf)
- [Raporti Teknik 2 – Databaza, backend-i dhe API](docs/Raporti_Teknik_2.pdf)
- [Raporti Teknik 3 – Frontend-i, integrimi dhe progresi funksional](docs/Raporti_Teknik_3.pdf)
- [Diagrami i arkitektures](docs/diagrams/arkitektura.png)
- [Skema e databazes](docs/diagrams/databaza.png)
- [Koleksioni Postman](docs/postman/Dergesat_API.postman_collection.json)

## Ekzekutimi lokal
```bash
python -m venv venv
venv\Scripts\activate          # Windows PowerShell  (Git Bash: source venv/Scripts/activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data     # perdorues dhe 30 dergesa testuese
python manage.py runserver
```

- Aplikacioni: http://127.0.0.1:8000/ (hap faqen e login-it)
- Gjurmimi publik: http://127.0.0.1:8000/track
- API: http://127.0.0.1:8000/api/
- Paneli i Django-s: http://127.0.0.1:8000/admin/

Perdoruesit testues (vetem per zhvillim lokal), password `Test1234!`:
`admin`, `menaxher` (ADMIN) · `korrier1`, `korrier2`, `korrier3` (COURIER)

## Faqet
| Faqja | URL | Kush |
|---|---|---|
| Sign in | `/login` | te gjithe |
| Dashboard | `/dashboard` | admin |
| Shipments (lista, filtra, krijimi) | `/shipments` | admin |
| Shipment details | `/shipments/<id>` | admin, korrieri i dergeses |
| Couriers (lista, shtimi, aktivizimi) | `/couriers` | admin |
| My deliveries (per telefon) | `/courier` | korrier |
| Track shipment | `/track` | publik |

Nderfaqja eshte ne anglisht, me teme te erret dhe ngjyre kryesore gold te zbehte (Django Templates + Bootstrap 5). Te dhenat i merr JavaScript-i nga API-ja me `fetch()` (`static/js/api.js`).
Bootstrap-i, ikonat dhe fonti Inter jane ne `static/vendor/`, keshtu aplikacioni punon edhe pa internet.

## API
Autentikimi: `POST /api/auth/login` kthen token-in, i cili dergohet ne cdo kerkese si `Authorization: Token <token>`.

| Method | Endpoint | Kush |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | te gjithe · i kyçur |
| GET | `/api/auth/me` | i kyçur |
| GET, POST | `/api/shipments` | admin (korrieri: vetem lista e vet) |
| GET, PATCH, DELETE | `/api/shipments/<id>` | admin (korrieri: GET i dergesave te veta) |
| PATCH | `/api/shipments/<id>/assign` | admin |
| PATCH | `/api/shipments/<id>/status` | admin, korrieri i dergeses |
| GET | `/api/track/<tracking_code>` | publik |
| GET | `/api/stats` | admin |
| GET, POST · GET, PATCH | `/api/couriers` · `/api/couriers/<id>` | admin |

Filtrat e listes: `?status=` `?city=` `?courier=` `?search=` `?date_from=YYYY-MM-DD` `?date_to=` `?page=`

Te gjitha gabimet kthehen ne formatin:
```json
{ "success": false, "error": "PERMISSION_DENIED", "message": "Kjo dergese nuk ju eshte caktuar juve." }
```
Dokumentimi i plote i endpoint-eve dhe kodeve te gabimeve: [Raporti Teknik 2](docs/Raporti_Teknik_2.pdf).

## Statusi
- [x] Raporti 1 – analiza, kerkesat, arkitektura, modeli i databazes, struktura fillestare
- [x] Raporti 2 – databaza, backend-i dhe API
- [x] Raporti 3 – frontend-i dhe integrimi
- [ ] Raporti 4 – testimi, siguria, deployment
