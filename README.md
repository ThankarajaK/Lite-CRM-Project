# LiteCRM

A role-aware CRM for leads, contacts, deals, activities and tasks.

## Stack

- **Client:** React + Vite + TypeScript
- **Server:** Python 3.12+ / Django 5 / Django REST Framework
- **Database:** MySQL 8 (SQLite is supported for local smoke tests)

## Run locally

1. Start MySQL and create a database named `litecrm`.
2. In `BackEnd/`, create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r BackEnd/requirements.txt
   cp BackEnd/.env.example BackEnd/.env
   python BackEnd/manage.py migrate
   python BackEnd/manage.py createsuperuser
   python BackEnd/manage.py runserver
   ```

3. In another terminal:

   ```bash
   cd FrontEnd
   npm install
   npm run dev
   ```

`python BackEnd/manage.py migrate` automatically creates the required LiteCRM roles and permissions (`Admin`, `Sales Manager`, and `Salesperson`).

If you want the optional local demo users, catalogue entries, and lead sources used for testing, run:

```bash
python BackEnd/manage.py seed_demo
```

A Django superuser created with `createsuperuser` is automatically assigned the LiteCRM `Admin` role when the role exists.

The seed command creates `admin@litecrm.local` with password `Admin!234`, `manager@litecrm.local` with password `Manager!234`, and `sales@litecrm.local` with password `Sales!234`.

## Current foundation

The first delivery implements the central domain model, permission matrix, ownership scope, auditable lead capture/qualification/conversion, contacts, deals and the React workspace shell. Upcoming slices add import/export, reporting, notification delivery and full administration interfaces.
