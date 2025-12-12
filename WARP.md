# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

### Backend (Django REST API)

All backend commands are run from `backend/` with the virtualenv activated.

- Create and activate virtualenv (Windows PowerShell)
  - `python -m venv venv`
  - `./venv/Scripts/Activate.ps1`
- Install dependencies
  - `pip install -r requirements.txt`
- Apply migrations
  - `python manage.py makemigrations`
  - `python manage.py migrate`
- Run development server (default: http://localhost:8000)
  - `python manage.py runserver`
  - To change port: `python manage.py runserver 8001`
- Run all tests
  - `python manage.py test`
- Run tests for a single app
  - `python manage.py test accounts`
  - `python manage.py test operations`
- Run a single test case or method (pattern)
  - `python manage.py test operations.tests.test_receipts.ReceiptValidationTests`
  - `python manage.py test operations.tests.test_receipts.ReceiptValidationTests.test_validate_receipt_updates_stock`

### Frontend (Next.js 14, TypeScript)

All frontend commands are run from `frontend/`.

- Install dependencies
  - `npm install`
- Run development server (default: http://localhost:3000)
  - `npm run dev`
  - To change port: `npm run dev -- -p 3001`
- Build production bundle
  - `npm run build`
- Run production server
  - `npm run start`
- Lint TypeScript/Next.js code
  - `npm run lint`

No JavaScript/TypeScript test runner is configured in `package.json`; add one (e.g. Jest/RTL) if you need frontend tests.

### Flask reporting service (optional)

All Flask commands are run from `flask-service/`.

- Create and activate virtualenv
  - `python -m venv venv`
  - Windows: `./venv/Scripts/activate`
  - macOS/Linux: `source venv/bin/activate`
- Install dependencies
  - `pip install -r requirements.txt`
- Run service (default: http://localhost:5000)
  - `python app.py`

### Typical multi-service dev workflow

In three terminals, after MongoDB is running:

1. Backend: `cd backend && ./venv/Scripts/Activate.ps1 && python manage.py runserver`
2. Frontend: `cd frontend && npm run dev`
3. Optional Flask: `cd flask-service && venv/Scripts/activate && python app.py`

## Environment and configuration

Key environment files (see `README.md`, `RUN_PROJECT.md`, `QUICK_START_GUIDE.md`, `SETUP.md` for full details):

- `backend/.env`
  - `SECRET_KEY`
  - `DEBUG`
  - `DB_NAME`
  - `MONGODB_URI` (not used by the current SQLite-based Django settings)
  - `JWT_SECRET_KEY`
- `frontend/.env.local`
  - `NEXT_PUBLIC_API_URL` (typically `http://localhost:8000/api`)
- `flask-service/.env`
  - `MONGODB_URI` (e.g. `mongodb://localhost:27017/`)
  - `DB_NAME` (e.g. `stockmaster`)
  - `FLASK_ENV`
  - `FLASK_PORT`

### Database note (SQLite vs MongoDB)

The documentation in `README.md` describes MongoDB as the primary database, but `backend/stockmaster/settings.py` is currently configured to use SQLite via Django's default `sqlite3` engine. The Flask microservice still connects directly to MongoDB and expects collections like `products`, `products_stockitem`, and `operations_stockledger`.

When modifying persistence logic, be aware of this split:

- Django REST API reads/writes through the ORM to SQLite by default.
- Flask reporting service reads from MongoDB directly using `pymongo`.

If you re-enable MongoDB for Django, you will need to update `DATABASES` in `settings.py` and ensure collections remain compatible with the Flask reports.

## High-level architecture

### System overview

StockMaster is an inventory management system composed of three main parts:

- **Next.js 14 frontend (`frontend/`)** – App Router–based UI (TypeScript, Tailwind) for authentication, dashboards, product and operations workflows.
- **Django REST API (`backend/`)** – Core domain and business logic for accounts, products, stock operations, dashboard analytics, and notifications, exposed under `/api/...`.
- **Flask microservice (`flask-service/`)** – Optional reporting service that reads from MongoDB and exposes reporting/export endpoints under `/api/reports/...` plus `/health`.

All user-facing flows go through the Next.js app, which talks to the Django API via `frontend/lib/*.ts` service modules. The Flask service is used only for supplementary reporting and exports.

### Backend Django apps

The Django project `stockmaster` is split into several domain-focused apps, each with its own `models.py`, `serializers.py`, `urls.py`, and `views.py`.

- **`accounts/`** – Custom user model and authentication flows.
  - Exposes endpoints under `/api/auth/` (see `backend/accounts/urls.py`).
  - `views.py` provides:
    - Registration and login that issue JWT access/refresh tokens via `rest_framework_simplejwt`.
    - Password reset via OTP: `OTP` model instances are created, logged (for now), and then used to validate password reset requests.
    - Profile retrieval and update (`/profile/`, `/profile/update/`).
  - `AUTH_USER_MODEL` is set to `accounts.User` in `settings.py`; always use `get_user_model()` or `settings.AUTH_USER_MODEL` when referencing users.

- **`products/`** – Core catalog and stock master data.
  - Key models in `products/models.py`:
    - `Category` – Product categories.
    - `Warehouse` – Physical locations where stock is stored.
    - `Product` – SKU, barcode, unit of measure, reorder levels/quantities, and helpers like `get_total_stock()` and `is_low_stock()`.
    - `StockItem` – Per-warehouse stock quantities and reserved quantities; `available_quantity()` is the canonical way to know free stock.
    - `Supplier`, `ProductSupplier`, `SupplierPerformance` – Vendor and performance tracking (pricing, lead times, on-time ratios, etc.).
  - The `StockItem` model underpins all stock movement logic in `operations/` and analytics in `dashboard/`.

- **`operations/`** – All stock movement documents and the stock ledger.
  - `models.py` defines an abstract `BaseDocument` with common fields (status, warehouse, created_by, timestamps) and concrete document types:
    - `Receipt` – Incoming stock from suppliers (`validate_and_complete()` increases `StockItem.quantity`).
    - `DeliveryOrder` – Outgoing stock to customers (`validate_and_complete()` checks `available_quantity()` and decrements stock).
    - `InternalTransfer` – Moves stock between warehouses, decrementing one `StockItem` and incrementing another.
    - `StockAdjustment` – Corrects discrepancies; `adjustment_type` (`increase`, `decrease`, `set`) controls how `StockItem.quantity` is modified.
  - Each document has an associated `*Item` model (`ReceiptItem`, `DeliveryItem`, `TransferItem`, `AdjustmentItem`) with quantities and optional pricing/notes.
  - `StockLedger` records an audit trail of movements per product/warehouse with indices optimized for querying by product and time. Ledger rows are designed to be written whenever a document is validated and completed.
  - Document status transitions follow the same workflow used in the UI and docs: `draft → waiting → ready → done` (or `canceled`). Validation methods enforce `status == 'ready'` before applying changes.

- **`dashboard/`** – Aggregated inventory analytics.
  - `views.py` exposes several endpoints (all `IsAuthenticated`):
    - `dashboard_kpis` – Counts total products, low stock and out-of-stock items, pending receipts/deliveries/transfers. Uses aggregated `StockItem` quantities plus `Product.reorder_level`.
    - `recent_activities` – Merges recent `Receipt`, `DeliveryOrder`, and `InternalTransfer` documents into a sorted feed for the dashboard.
    - `low_stock_products` – Returns a detailed list of products at or below reorder level.
    - `abc_analysis`, `inventory_turnover`, `analytics_dashboard` – Higher-level analytics based on `ReceiptItem` prices, `DeliveryItem` quantities, and aggregated `StockItem` balances.
  - These endpoints assume `operations` and `products` have consistent data; changes to model fields in those apps often require updates here.

- **`notifications/`** – In-app notification system.
  - `Notification` model stores user-scoped alerts with type, priority, and optional references to related objects (e.g., low stock on a product or pending approvals).
  - `NotificationPreference` stores per-user delivery and quiet-hours preferences and per-type enable flags.
  - `NotificationViewSet` and `NotificationPreferenceViewSet` provide CRUD plus custom actions:
    - Mark single notification as read, mark all as read, get unread count.
  - Frontend integrates via `frontend/lib/notifications.ts` and components like `NotificationBell`.

- **Project configuration (`stockmaster/`)**
  - `settings.py` wires up installed apps, REST framework config, JWT lifetimes, CORS origins, and `AUTH_USER_MODEL`.
  - `urls.py` mounts each app under a versionless `/api/...` prefix:
    - `/api/auth/`, `/api/products/`, `/api/operations/`, `/api/dashboard/`, `/api/notifications/` and `/api/token/refresh/`.

### Frontend Next.js app

The frontend uses the Next.js App Router (`frontend/app/`) and a thin service layer in `frontend/lib/` to talk to the Django API.

- **Global setup**
  - `app/layout.tsx` sets base metadata and wraps the app in `Providers`, which in turn applies an `ErrorBoundary` and configures `react-hot-toast`.
  - `lib/api.ts` configures an Axios instance with base URL `NEXT_PUBLIC_API_URL` and JSON headers, adds a request interceptor to inject the JWT access token from `localStorage`, and a response interceptor to refresh the token via `/api/token/refresh/` on 401s.

- **Auth flows**
  - `lib/auth.ts` maps directly to `accounts` endpoints:
    - `authService.register` → `POST /api/auth/register/`.
    - `authService.login` → `POST /api/auth/login/`.
    - Password reset via OTP (`/api/auth/password-reset/` and `/api/auth/password-reset/verify/`).
    - Profile operations via `/api/auth/profile/` and `/api/auth/profile/update/`.
  - Tokens are stored in `localStorage` and used by `lib/api.ts` interceptors.

- **Domain-specific service modules**
  - `lib/products.ts` – Wraps product, category, warehouse, and stock endpoints (`/api/products/...`). It standardizes TypeScript interfaces (`Product`, `Category`, `Warehouse`, `StockItem`) and hides pagination details.
  - `lib/operations.ts` – Wraps operations endpoints (`/api/operations/...`) and encodes document types (`Receipt`, `DeliveryOrder`, `InternalTransfer`, `StockAdjustment`) and their item shapes. It also exposes explicit `validate*` methods that call the `.../validate/` actions, aligning with the `validate_and_complete` methods on the Django models.
  - `lib/dashboard.ts` – Maps to dashboard analytics endpoints (`/api/dashboard/kpis/`, `/recent-activities/`, `/low-stock/`).
  - `lib/notifications.ts` – Talks to `/api/notifications/notifications/...` for list, unread counts, and mark-read operations.
  - `lib/suppliers.ts` – Wraps supplier CRUD and product-supplier relations under `/api/products/suppliers/` and `/api/products/product-suppliers/...`.

- **Routing and pages**
  - The `app/` directory mirrors domain concepts:
    - `app/login`, `app/register`, `app/forgot-password` – Auth flows.
    - `app/dashboard`, `app/analytics`, `app/history` – Main dashboard and analytics views using `dashboardService` and operations history.
    - `app/products`, `app/products/new`, `app/products/[id]/edit` – Product listing and maintenance.
    - `app/receipts`, `app/receipts/new`, `app/deliveries`, `app/deliveries/new`, `app/transfers`, `app/transfers/new`, `app/adjustments`, `app/adjustments/new` – CRUD and validation flows for each document type.
    - `app/suppliers`, `app/settings`, `app/profile` – Supplier and configuration views.
  - Shared components such as `Layout`, `NotificationBell`, `BarcodeScanner`, and `ErrorBoundary` provide navigation, alerts, and utility UI.

When adding new API endpoints, the typical pattern is:

1. Implement the Django view/serializer/URL under the appropriate app.
2. Add a thin wrapper in `frontend/lib/*.ts` exposing typed functions.
3. Consume those wrappers in the relevant `app/.../page.tsx` components.

### Flask reporting microservice

The Flask service in `flask-service/app.py` is a standalone microservice that speaks directly to MongoDB via `pymongo`.

- Uses `MONGODB_URI` and `DB_NAME` from `.env` to connect.
- Endpoints:
  - `/health` – Simple health check.
  - `/api/reports/stock-summary` – Summaries over `products` and `products_stockitem` collections (low stock, out of stock, totals).
  - `/api/reports/movement-history` – Filterable read from `operations_stockledger` (by warehouse, product, date range).
  - `/api/reports/export-excel` – Generates an in-memory Excel file using `pandas` and `openpyxl` with stock overview data.
  - `/api/reports/low-stock-alert` – Returns low stock alerts similar to the Django dashboard but backed by MongoDB collections.

This service assumes a background process or separate integration keeps MongoDB collections in sync with the primary inventory data. If you change the schema of Django models like `Product`, `StockItem`, or `StockLedger`, you likely need to adapt both the synchronization logic (wherever it lives) and these report queries.

## How to extend the system safely

- Favor adding or reusing high-level operations methods (`validate_and_complete` on documents, `available_quantity` on `StockItem`) instead of duplicating stock math in new code paths.
- Any change to stock-related models (`Product`, `StockItem`, `Receipt*`, `Delivery*`, `Transfer*`, `StockAdjustment*`, `StockLedger`) typically impacts:
  - Dashboard analytics (`dashboard/views.py`).
  - Frontend service types in `frontend/lib/operations.ts`, `frontend/lib/products.ts`, and dashboard-related code.
  - MongoDB-backed reporting in `flask-service/app.py` if those collections mirror ORM models.
- Keep JWT and CORS settings in `backend/stockmaster/settings.py` aligned with how the Next.js app is served (ports, hostnames) so that `NEXT_PUBLIC_API_URL` and `CORS_ALLOWED_ORIGINS` remain consistent.
