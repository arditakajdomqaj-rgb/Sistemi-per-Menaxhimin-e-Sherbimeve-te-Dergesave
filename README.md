# Sistem per Menaxhimin e Sherbimeve te Dergesave

Projekt individual – Praktike Profesionale, Semestri V (2026/2027).

Aplikacion web ku nje kompani dergesash regjistron pakot, ua cakton korriereve, korrieret perditesojne statusin, dhe klienti e ndjek dergesen me kod gjurmimi.

## Rolet
- **Admin / Menaxher**: krijon dergesa, i cakton te korrieret, sheh dashboard-in
- **Korrier**: sheh dergesat e veta dhe ndryshon statusin
- **Klient**: gjurmon dergesen me kod, pa login

## Teknologjite
Python 3.12 · Django 5 · Django REST Framework · Bootstrap 5 · SQLite (zhvillim) / PostgreSQL (deployment) · Render

## Dokumentimi
- [Raporti Teknik 1 – Analiza, kerkesat dhe dizajni](docs/Raporti_Teknik_1.pdf)
- [Diagrami i arkitektures](docs/diagrams/arkitektura.png)
- [Modeli i databazes](docs/diagrams/databaza.png)

## Ekzekutimi lokal
```bash
python -m venv venv
venv\Scripts\activate          # Windows  (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Linux/Mac: cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Pastaj hap http://127.0.0.1:8000/admin

## Statusi
- [x] Raporti 1 – analiza, kerkesat, arkitektura, modeli i databazes, struktura fillestare
- [ ] Raporti 2 – databaza dhe API
- [ ] Raporti 3 – frontend dhe integrimi
- [ ] Raporti 4 – testimi, siguria, deployment
