# StockMaster – Full Demo & Explanation Guide

This markdown file summarizes everything we discussed about your project and how to present/demo it confidently.

---

## Table of Contents

1. [High‑Level Overview](#1-high-level-overview)  
2. [Core Functional Modules](#2-core-functional-modules)  
   - [2.1 Products & Warehouses](#21-products--warehouses)  
   - [2.2 Receipts (Inbound)](#22-receipts-inbound)  
   - [2.3 Deliveries (Outbound)](#23-deliveries-outbound)  
   - [2.4 Returns](#24-returns)  
   - [2.5 Stock Adjustments](#25-stock-adjustments)  
   - [2.6 Internal Transfers](#26-internal-transfers)  
   - [2.7 Storage & Stock View](#27-storage--stock-view)  
   - [2.8 History / Stock Ledger](#28-history--stock-ledger)  
3. [Advanced Operations Features](#3-advanced-operations-features)  
   - [3.1 Bins (Bin Locations)](#31-bins-bin-locations)  
   - [3.2 Cycle Counts](#32-cycle-counts)  
   - [3.3 Pick Waves](#33-pick-waves)  
   - [3.4 Saved Views & Collaboration](#34-saved-views--collaboration)  
4. [RBAC – Role‑Based Access Control](#4-rbac--role-based-access-control)  
   - [4.1 Roles](#41-roles)  
   - [4.2 Capabilities (Permissions)](#42-capabilities-permissions)  
   - [4.3 Warehouse Scoping](#43-warehouse-scoping)  
   - [4.4 Secure Registration & Invites](#44-secure-registration--invites)  
5. [Practical Demo Scripts](#5-practical-demo-scripts)  
   - [5.1 General Feature Walkthrough (5–7 minutes)](#51-general-feature-walkthrough-57-minutes)  
   - [5.2 Bins End‑to‑End Test](#52-bins-end-to-end-test)  
   - [5.3 Cycle Count Test](#53-cycle-count-test)  
   - [5.4 Pick Wave Test](#54-pick-wave-test)  
   - [5.5 Short RBAC Live Demo](#55-short-rbac-live-demo)  
6. [Key Fixes Implemented During Our Work](#6-key-fixes-implemented-during-our-work)  
   - [6.1 Receipts Page Import Error](#61-receipts-page-import-error)  
   - [6.2 Receipts Status Filter](#62-receipts-status-filter)  
7. [How to Explain This to Judges](#7-how-to-explain-this-to-judges)

---

## 1. High‑Level Overview

**One‑sentence pitch:**

> StockMaster is a warehouse and inventory operations platform that supports real workflows like receiving goods, shipping orders, transfers, cycle counts, returns, adjustments, and pick waves – not just product CRUD.

The app focuses on **operations**, not just a static product catalog:

- Inbound: Receipts from suppliers.  
- Outbound: Deliveries to customers.  
- Internal movement: Transfers between warehouses.  
- Data quality: Cycle Counts and Stock Adjustments.  
- Efficiency: Pick Waves to batch‑pick multiple orders.  
- Accountability: History / Stock Ledger and Audit Log.  
- Safety: Role‑Based Access Control (RBAC) and warehouse scoping.

Almost all operational documents share a **common status model**:

- `draft` → `waiting` → `ready` → `done` (or `canceled`)

This keeps the user experience consistent across Receipts, Deliveries, Returns, Transfers, Adjustments, and Cycle Counts.

---

## 2. Core Functional Modules

### 2.1 Products & Warehouses

**Products**

- Fields: name, SKU, category, units of measure, reorder level, reorder quantity.  
- `stock_unit` / `purchase_unit` with a `unit_conversion_factor`.  
- `default_bin` (optional) – preferred bin/shelf inside a warehouse.  
- `is_active` flag with a toggle in the products list.

**Warehouses**

- Each warehouse has a name, code, address, and `is_quarantine` flag.  
- `is_quarantine` lets you route returns into a special warehouse.

These are the backbone for all other operations.

---

### 2.2 Receipts (Inbound)

**Purpose:** Record incoming stock from suppliers.

Key points:

- Each **Receipt** has:
  - Document number (e.g. `REC-000001`)
  - Supplier and supplier reference
  - Warehouse
  - Status (`draft`, `waiting`, `ready`, `done`, `canceled`)
  - Items:
    - Product
    - Optional Bin
    - Quantity ordered / received
    - Unit of measure (stock/purchase)
    - Unit price
- On **validate**:
  - Verifies status (`ready`) and approvals if required.  
  - Increases **StockItem** quantity for the warehouse.  
  - Optionally increases **BinStockItem** quantity if a bin is set.  
  - Creates **StockLedger** rows with:
    - `transaction_type = 'receipt'`
    - New `balance_after`
    - `bin` field for location‑aware history.

---

### 2.3 Deliveries (Outbound)

**Purpose:** Ship stock to customers.

- **Delivery Order**:
  - Document number (e.g. `DEL-000001`)
  - Customer, reference, shipping address
  - Warehouse
  - Status lifecycle aligned with receipts.
  - Items:
    - Product
    - Optional Bin (where picking from)
    - Quantity
    - Unit of measure.

On **validate**:

- Checks sufficient available stock.  
- Decreases **StockItem** quantity.  
- If bin set, decreases **BinStockItem** for that product+bin.  
- Adds `delivery` rows to **StockLedger** with negative quantity.

---

### 2.4 Returns

**Purpose:** Handle customer returns (RMA).

- A **Return Order** can be linked to a Delivery Order.
- Fields:
  - Reason
  - Disposition: `restock`, `scrap`, `repair`
  - Items: product + quantity.

On **validate**:

- Based on disposition, returns stock into a **target warehouse**:
  - Could be original warehouse or a quarantine warehouse.
- Writes stock ledger entries accordingly.

---

### 2.5 Stock Adjustments

**Purpose:** Fix differences between system and physical stock.

- **Stock Adjustment**:
  - Reason
  - Adjustment type:
    - `increase` – add stock
    - `decrease` – remove stock
    - `set` – set stock to a specific value
  - Items:
    - Product
    - Current quantity
    - Adjustment quantity
    - Optional per‑item reason.

On **validate**:

- Adjusts stock in **StockItem**.  
- Logging:
  - Adds `adjustment` entries to the **StockLedger**.  
  - For `set`, it calculates the delta between current and target.

---

### 2.6 Internal Transfers

**Purpose:** Move stock between warehouses.

- **Internal Transfer**:
  - From warehouse
  - To warehouse
  - Status
  - Items:
    - Product
    - Quantity
    - Optional **Destination Bin** (bin in the target warehouse).

On **validate**:

- Decrement stock in source warehouse (`transfer_out` ledger entries).  
- Increment stock in destination warehouse (`transfer_in` ledger entries).  
- If a destination bin is set, updates **BinStockItem** for that bin.

---

### 2.7 Storage & Stock View

The **Storage** page:

- Shows product‑level stock summaries.  
- Can filter by:
  - Search (name or SKU)
  - Category
  - Warehouse
- When a warehouse is selected:
  - Uses `/products/stock-items/` to get stock by warehouse and sum quantities.
- Shows low/healthy stock status with small progress bar visuals.

---

### 2.8 History / Stock Ledger

The **History** screen shows **StockLedger** entries:

- Columns:
  - Date/time
  - Transaction type (`receipt`, `delivery`, `transfer_in`, `transfer_out`, `adjustment`, `return`)
  - Product (name + SKU)
  - Warehouse
  - Bin
  - Document number
  - Quantity (with +/− colors)
  - Balance after
  - Reference

Filters:

- Transaction type
- Warehouse
- Date range

This gives you an auditable trail of all stock movements, with bins included.

---

## 3. Advanced Operations Features

### 3.1 Bins (Bin Locations)

**What is a bin?**

- A bin is a **physical location** inside a warehouse (e.g. `A-01-01`).  
- Model: `BinLocation` – `warehouse + code (+ description)`.

**How bins are used:**

- Product may have a `default_bin`.  
- `ReceiptItem`, `DeliveryItem`, and `TransferItem` have:
  - `bin` (FK to BinLocation)
  - `bin_code` (exposed via serializers for UI).
- **StockLedger** includes `bin` for each movement.  
- **BinStockItem** tracks quantity per `(product, warehouse, bin)`.

**Business effects:**

- You know exactly where stock is stored.  
- You can build pick paths by bin (used in Pick Waves).  
- You can run bin‑level put‑away and picking logic.

---

### 3.2 Cycle Counts

**Goal:** Keep inventory accurate without full‑warehouse shutdowns.

- **CycleCountTask**:
  - Warehouse
  - Status (aligned with other docs)
  - Method: `full`, `partial`, `abc`
  - Scheduled date and notes.
- **CycleCountItem**:
  - Product
  - Expected quantity
  - Counted quantity
  - Variance (`counted − expected`).

When creating a task:

- `full` method with no items:
  - Auto‑includes all products with stock in that warehouse.
- `partial` method:
  - Requires you to select specific products.
- `abc` method with no items:
  - Auto‑selects a top slice of highest‑value products.

Process:

1. Task created in `draft`.  
2. `start` → status `ready`.  
3. User enters counted quantities.  
4. `update_counts` saves counted values.  
5. `complete`:
   - Calculates variances  
   - May generate a **Stock Adjustment**  
   - Status becomes `done`.

---

### 3.3 Pick Waves

**Goal:** Efficient batch picking for multiple delivery orders.

- **PickWave**:
  - Name
  - Status: `planned`, `picking`, `completed`, `canceled`
  - Warehouse
  - Many‑to‑many to `DeliveryOrder`
  - Optional assigned picker, notes, timestamps.

**Creating via `generate_wave`:**

- Inputs:
  - Warehouse
  - Date range
  - Status (e.g. `ready`)
- Constraints:
  - All matching deliveries must be from the same warehouse.
  - If none found, returns a clear “no matching orders” message.
- Wave created with:
  - Status `planned`
  - Linked delivery orders.

**Consolidated pick list:**

- Aggregates all delivery items in the wave.  
- Groups by **product + bin**.  
- Sums:
  - Total quantity to pick  
  - Number of orders containing that row.
- Sorted by bin, then SKU → efficient path for the picker.

**Status transitions:**

- `start_picking` → `picking`  
- `complete_picking` → `completed`

Stock is not moved by the wave itself; stock moves when **Deliveries** are validated.

---

### 3.4 Saved Views & Collaboration

Common UI components:

- **SavedViewToolbar**:
  - On pages like Receipts, Deliveries, Returns, Adjustments.
  - Lets users save filter combinations (status, warehouse, dates, etc.).
  - They can quickly re‑apply their favorite views.
- **StatusEditModal**:
  - Standard modal to edit document status with proper validation and user feedback.
- **DocumentCollaborationPanel**:
  - Side panel to add comments and attachments per document.
  - Uses document‑level access checks to ensure users only comment on in‑scope docs.

These features make the app feel like a real working tool for teams, not just a demo.

---

## 4. RBAC – Role‑Based Access Control

### 4.1 Roles

There are three main roles in the `User` model:

1. `warehouse_staff` – default for self‑registration.  
2. `inventory_manager`.  
3. `admin`.

Each user also has:

- `allowed_warehouses` – a many‑to‑many relationship to Warehouse.

---

### 4.2 Capabilities (Permissions)

Capabilities are strings like:

- `products.read`, `products.write`.  
- `ops.read`, `ops.draft`, `ops.approve`, `ops.validate`.  
- `audit.read`.  
- `users.manage`.

**Mapping from roles** (in `accounts/rbac.py`):

- **warehouse_staff**:
  - `products.read`
  - `ops.read`
  - `ops.draft`
- **inventory_manager**:
  - All of the above plus:
  - `products.write`
  - `ops.approve`
  - `ops.validate`
  - `audit.read`
- **admin**:
  - `{'*'}` → all capabilities.

Each API view in the backend uses a `permission_action_map` to require specific capabilities per action:

- Example (Receipts):
  - `list`, `retrieve`: `ops.read`
  - `create`, `update`, `partial_update`, `destroy`: `ops.draft`
  - `approve`: `ops.approve`
  - `validate`: `ops.validate`

Other examples:

- **Products**:
  - List/read: `products.read`
  - Create/update/delete: `products.write`
- **Audit log**:
  - `list`, `retrieve`, `export_csv`: `audit.read`
- **Admin user / invite management**:
  - `users.manage`
- **Integrations & notification jobs**:
  - `IsAdminOrInventoryManager` (admin or inventory manager).

---

### 4.3 Warehouse Scoping

Non‑admin users should only see data for specific warehouses.

- `allowed_warehouses(user)`:
  - `None` for admin (all warehouses).  
  - A list of warehouse IDs for non‑admin users.
- `scope_queryset(qs, user, warehouse_fields=(...))`:
  - Filters querysets based on which warehouses the user can see.
- `WarehouseScopedQuerySetMixin`:
  - Shared mixin for DRF viewsets to automatically apply scoping.

Used in:

- Operations viewsets (Receipts, Deliveries, Transfers, Returns, Adjustments, Cycle Counts, Pick Waves).  
- Products stock endpoints.  
- Dashboard statistics and anomalies.  
- Approvals and audit log.

Given a staff user allowed only `MAIN`, any attempt to GET a receipt in warehouse `SEC` returns a 404 (hidden).

---

### 4.4 Secure Registration & Invites

**Public registration:**

- `UserRegistrationSerializer` explicitly ignores `role` from the client.  
- Every new user from public registration is created as `warehouse_staff`.

**Invites:**

- `Invite` model:
  - Email, role, allowed_warehouses, token, expiry, used_at, revoked_at.
- Admins (with `users.manage`) can:
  - Create invites.
  - Revoke invites.
- Registration with `invite_token`:
  - Validates the token and that it’s active.  
  - Creates user as `warehouse_staff` first.  
  - Confirms the registration email matches invite email.  
  - Applies the invite’s role and `allowed_warehouses`.  
  - Marks the invite as used.

This flow prevents privilege escalation and ensures only admins can assign higher roles and expanded warehouse scopes.

---

## 5. Practical Demo Scripts

### 5.1 General Feature Walkthrough (5–7 minutes)

Use this as your main “story” demo:

1. **Dashboard or Landing**  
   - Show summary (pending receipts/deliveries, low stock).  
   - Explain: “Manager sees key operations status here.”  
2. **Products & Storage**  
   - Go to **Products**:  
     - Show product details: SKU, units, reorder levels, default bin.  
   - Go to **Storage**:  
     - Filter by warehouse.  
     - Show stock levels, low vs healthy, and quick filters.  
3. **Receipts**  
   - Go to **Receipts**.  
   - Show filters by status + warehouse.  
   - Create a **New Receipt**:  
     - Select warehouse, supplier, add line items (with optional bin).  
     - Validate the receipt.  
4. **Deliveries**  
   - Go to **Deliveries**.  
   - Show similar filters and statuses.  
   - Create a **New Delivery** for the same product and warehouse.  
   - Validate it to show stock moving out.  
5. **Advanced operations**  
   - Optionally show:  
     - Adjustments (fixing discrepancies).  
     - Returns (with disposition).  
     - Transfers (moving stock between warehouses).  
6. **History**  
   - Open **History** (Stock Ledger).  
   - Filter by warehouse and product.  
   - Show inbound (receipt) and outbound (delivery) entries with bins and balances.  
7. **Saved views and collaboration** (optional add‑on)  
   - On any list (Receipts, Deliveries), show:  
     - Saving a filter set via `SavedViewToolbar`.  
     - Using `StatusEditModal` or `DocumentCollaborationPanel`.

---

### 5.2 Bins End‑to‑End Test

**Goal:** Show that bins are respected in receipts, deliveries, transfers, and history.

1. Create or ensure:
   - Warehouse `MAIN`.  
   - Bin `A-01-01` in `MAIN`.  
2. Create a product **Demo Widget** with:
   - Default bin `A-01-01`.  
   - Initial stock in `MAIN`.  
3. **Receipt**:
   - `/receipts/new` → `MAIN`, Demo Widget, qty = 10, no bin or with bin.  
   - Validate.  
4. **Delivery**:
   - `/deliveries/new` → `MAIN`, Demo Widget, qty <= stock, bin = `A-01-01`.  
   - Validate.  
5. **History**:
   - Filter `transaction_type` = `receipt` and `delivery`.  
   - Show `bin` column = `A-01-01`.

Explain:

> “We don’t just know how much stock we have; we know exactly which shelf it lives on, and we track every movement per bin.”

---

### 5.3 Cycle Count Test

**Goal:** Show how a cycle count adjusts stock.

1. Ensure some stock exists in `MAIN` for a product.  
2. `/cycle-counts/new`:
   - Warehouse: `MAIN`.  
   - Method: `partial`.  
   - Select that product.  
3. Open the created task:
   - Status `draft` → click **Start Counting** → `ready`.  
4. Change **Counted Quantity** to something different.  
5. Click **Save Counts**.  
6. Click **Complete & Adjust**.  
7. Back in **Storage / History**:
   - Stock for that product should now match the counted quantity.  
   - Ledger should show an `adjustment` entry for the cycle count.

---

### 5.4 Pick Wave Test

**Goal:** Show how a pick wave groups deliveries into a consolidated pick list.

1. Create several `ready` delivery orders in `MAIN` for various products and bins.  
2. `/pick-waves/new`:
   - Warehouse: `MAIN`.  
   - Date range covering those deliveries.  
   - Optional name: `Main Wave`.  
3. System creates a wave with status `planned`.  
4. Open the wave:
   - Show **Delivery Orders** list.  
   - Show **Consolidated Pick List** (grouped by bin + product).  
5. Click:
   - **Start Picking** → status `picking`.  
   - **Complete Picking** → status `completed`.  

Explain:

> “Instead of picking each order line by line, we group them into a single pick list by bin and product.
> This is how real WMS systems speed up picking.”

---

### 5.5 Short RBAC Live Demo

**Goal:** In ~2 minutes, show role differences.

Assume three users:

- `staff1` → `warehouse_staff` for `MAIN`.  
- `manager` → `inventory_manager` for `MAIN`.  
- `admin` → `admin`.  

**Step 1 – Warehouse Staff**

1. Log in as `staff1`.  
2. Create a **Receipt** in `MAIN`.  
3. Try to **Approve** or **Validate**:
   - Blocked (403 or disallowed).  
4. Say: “As warehouse staff I can prepare documents, but I cannot approve or finalize them.”

**Step 2 – Inventory Manager**

1. Log in as `manager`.  
2. Open the same receipt.  
3. Click **Approve** → works.  
4. Click **Validate** → works.  
5. Open **Audit Log**:
   - Show that it’s visible.  
6. Say: “Inventory managers approve, validate, and audit.”

**Step 3 – Admin**

1. Log in as `admin`.  
2. Open **Users / Invites / Integrations**:
   - Show user list, warehouse memberships, invites or webhooks.  
3. Say: “Admins control who has which role, which warehouses they see, and integrations.”

Close:

> “RBAC gives us clear separation:
> Staff do daily work, managers approve and audit, admins control access and integration.”

---

## 6. Key Fixes Implemented During Our Work

### 6.1 Receipts Page Import Error

**Problem:**

- Receipts page imported `Receipt` from `@/lib/operations` and also used `<Receipt />` as an icon.
- `Receipt` in `lib/operations` is a TypeScript interface, not a React component.
- This caused:
  - Build error: `Receipt is not exported from '@/lib/operations'`.
  - Runtime error: React “Element type is invalid: expected a string or a class/function but got: undefined”.

**Fix:**

- Changed imports in `frontend/app/receipts/page.tsx` to:
  - Import `operationsService` as a value.
  - Import the `Receipt` type as `ReceiptType` from `@/lib/operations`.
  - Import the `Receipt` icon from `lucide-react`.
- Updated state type: `useState<ReceiptType[]>([])`.

**Result:** Receipts page compiles and renders correctly.

---

### 6.2 Receipts Status Filter

**Problem:**

- Receipts filter was only handling a single status value passed to the backend.
- For saved views or URL parameters, you sometimes needed to support comma‑separated status lists like `waiting,ready`.

**Fix:**

- Updated `loadReceipts` in `frontend/app/receipts/page.tsx`:
  - If `statusFilter` has multiple comma‑separated values:
    - Send only the first to the backend (since API supports a single `status`).
    - Filter results on the frontend to keep rows whose status is in the full list.
- Also ensured `setLoading(true)` is called at the start of fetch.

**Result:** Receipts list now supports multiple statuses via URL or saved views, similar to Deliveries.

---

## 7. How to Explain This to Judges

You can combine everything into a short narrative:

1. **What it is**

   > “StockMaster is a warehouse operations system.
   > It covers the whole lifecycle: receiving, shipping, transfers, returns, adjustments, cycle counts, and pick waves, all driven by a consistent status and RBAC model.”

2. **Why it matters**

   - Replaces messy spreadsheets and basic ERPs that don’t understand warehouse workflows.  
   - Reduces errors and stockouts by:
     - Using clear status steps.  
     - Keeping stock & bins accurate via cycle counts.  
     - Making picking efficient with pick waves.  
   - Provides traceability with history and audit logs.

3. **What’s special**

   - Operations‑first design (not just a CRUD app).  
   - Unified status and workflow across documents.  
   - Bin‑level tracking and consolidated pick lists.  
   - Saved views and collaboration built‑in.  
   - A secure RBAC system based on roles, capabilities, and warehouse scopes.

4. **How you show it**

   - Walk through:
     - Products → Storage  
     - Receipts → Deliveries → History  
     - Bins, Pick Waves, Cycle Counts  
     - RBAC demo (staff vs manager vs admin)
