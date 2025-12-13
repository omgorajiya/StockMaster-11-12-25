# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

### Frontend (Next.js 14, TypeScript)

All frontend commands are run from `frontend/`.

- Install dependencies: `npm install`
- Run dev server (default http://localhost:3000): `npm run dev`
  - Change port: `npm run dev -- -p 3001`
- Lint: `npm run lint`
- Build: `npm run build`
- Run prod server: `npm run start`

Cache reset (useful after dependency/import issues; see `frontend/ICON_FIX.md`):
- PowerShell: `Remove-Item -Recurse -Force .next; npm run dev`
- bash: `rm -rf .next && npm run dev`

No JavaScript/TypeScript test runner is configured in `frontend/package.json` (no `test` script).

### Backend (Django REST API)

All backend commands are run from `backend/` with the virtualenv activated.

- Create venv: `python -m venv venv`
- Activate (Windows PowerShell): `./venv/Scripts/Activate.ps1`
- Install deps: `pip install -r requirements.txt`
- Migrations: `python manage.py makemigrations` then `python manage.py migrate`
- Run dev server (default http://localhost:8000): `python manage.py runserver`
- Run all tests: `python manage.py test`
- Run tests for a single app: `python manage.py test operations`
- Run a single test: `python manage.py test operations.tests.test_receipts.ReceiptValidationTests.test_validate_receipt_updates_stock`

### Flask reporting service (optional)

All Flask commands are run from `flask-service/`.

- Create venv: `python -m venv venv`
- Activate (Windows): `./venv/Scripts/activate`
- Install deps: `pip install -r requirements.txt`
- Run service (default http://localhost:5000): `python app.py`

## Environment and configuration

- `frontend/.env.local`
  - `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api` via `frontend/next.config.js`)
- `backend/.env`
  - `SECRET_KEY`, `DEBUG`, etc.
- `flask-service/.env`
  - `MONGODB_URI`, `DB_NAME`, `FLASK_PORT`, etc.

### Database note (SQLite vs MongoDB)

`backend/stockmaster/settings.py` is currently configured to use SQLite (`django.db.backends.sqlite3`) even though the top-level `README.md` describes MongoDB. The optional Flask service still connects directly to MongoDB using `pymongo`.

## High-level architecture

### System overview

StockMaster is split into:

- `frontend/`: Next.js 14 App Router UI (TypeScript + Tailwind)
- `backend/`: Django REST API (DRF + SimpleJWT)
- `flask-service/`: optional reporting service (Flask + MongoDB)

The frontend talks to the Django API under `/api/...`. Some reports may be served by the Flask service.

### Frontend structure (`frontend/`)

- Next.js App Router routes live in `frontend/app/`. The root route `app/page.tsx` redirects to `/dashboard` vs `/login` based on whether an `access_token` exists in `localStorage`.
- Most pages are client components (`'use client'`) and wrap content with `components/Layout.tsx` (sidebar + top bar + notification bell + theme toggle).
- `frontend/lib/api.ts` is the shared Axios client:
  - Base URL comes from `NEXT_PUBLIC_API_URL`.
  - Request interceptor injects `Authorization: Bearer <access_token>` from `localStorage`.
  - Response interceptor attempts token refresh via `POST /api/token/refresh/` and redirects to `/login` if refresh fails.
- TypeScript import alias: `@/*` maps to the `frontend/` root (see `frontend/tsconfig.json`).

Key “service layer” modules (thin API wrappers used by pages/components):

- `frontend/lib/auth.ts` → `/api/auth/*`
- `frontend/lib/products.ts` and `frontend/lib/suppliers.ts` → `/api/products/*`
- `frontend/lib/operations.ts` → `/api/operations/*`
  - Documents: receipts, deliveries, transfers, adjustments, returns, cycle counts, pick waves
  - Collaboration + audit: approvals, comments, attachments, saved views, audit logs
- `frontend/lib/dashboard.ts` and `frontend/lib/analytics.ts` → `/api/dashboard/*`
- `frontend/lib/notifications.ts` → `/api/notifications/*` (including job status + manual triggers)
- `frontend/lib/integrations.ts` → `/api/integrations/*` (webhook configs + delivery events)

Cross-cutting UI patterns:

- Saved filters/views: `components/SavedViewToolbar.tsx` stores per-page filters using the Operations “saved views” endpoints (`page_key` is the join key).
- Collaboration panel: `components/DocumentCollaborationPanel.tsx` shows per-document comments + attachments via Operations endpoints.

### Backend structure (`backend/`)

`backend/stockmaster/urls.py` mounts the main API routers:

- `/api/auth/` → `accounts`
- `/api/products/` → `products`
- `/api/operations/` → `operations`
- `/api/dashboard/` → `dashboard`
- `/api/notifications/` → `notifications`
- `/api/integrations/` → `integrations`
- `/api/token/refresh/` → SimpleJWT refresh endpoint

Important cross-app concepts:

- **Document workflow**: many operations documents use `status` values like `draft → waiting → ready → done` (and `canceled`). Frontend “Validate” buttons call `POST .../validate/` actions.
- **Stock ledger**: operations validation writes `StockLedger` entries; the UI queries `/api/operations/ledger/` (see `frontend/lib/ledger.ts`).
- **Audit + collaboration** (Operations): comments, attachments, approvals, saved views, and audit logs are all served under `/api/operations/*`.
  - Attachments are uploaded as multipart form data; files are stored under `MEDIA_ROOT` and served at `/media/` in dev.
- **Integrations/webhooks**: `integrations` app manages outbound webhooks (`/api/integrations/webhooks/`) and delivery events (`/api/integrations/events/`). Operations emits events (e.g. `receipt_completed`, `stock_change`) as part of validation.
- **Notifications**: `/api/notifications/notifications/*` for user notifications; `/api/notifications/jobs/*` exposes job status and allows privileged users to trigger jobs via `POST /run/`.
