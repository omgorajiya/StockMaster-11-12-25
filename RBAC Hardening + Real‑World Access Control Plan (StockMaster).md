# Problem statement
The current role-based access control (RBAC) is role-aware but not consistently enforced across APIs, and self-registration can create privileged users. To be usable in real companies, access must be enforced server-side per action, support warehouse-scoped access, provide admin workflows (invites/user management), and be testable/auditable.
# Current state (what exists today)
Backend
* Roles exist as `accounts.User.role` with `warehouse_staff`, `inventory_manager`, `admin` (see `backend/accounts/models.py`).
* DRF permission helpers exist (see `backend/accounts/permissions.py`).
* Global default permission is `IsAuthenticated` (see `backend/stockmaster/settings.py`).
* Only some endpoints enforce role restrictions (e.g. integrations + notification jobs).
* Approvals exist in operations models, but role checks for approving/validating are not consistently enforced.
Frontend
* UI captures a user role and displays it, but there is no consistent route/menu gating.
* Registration UI currently allows selecting Admin.
# Goals (real-world / company-ready)
* Prevent privilege escalation (secure onboarding).
* Enforce RBAC centrally and consistently (backend is source of truth).
* Add warehouse-scoped access control to prevent cross-warehouse data leakage.
* Add admin UX + APIs for user management and invitations.
* Add approval policies and thresholds.
* Add auditability and automated tests to prevent regressions.
# Proposed approach (phased, safe rollout)
## Phase 0: RBAC design + matrix (no code changes yet)
* Define a permission matrix by module and action.
* Decide warehouse scoping rules:
    * Which resources are warehouse-scoped (operations docs, stock items, bins, warehouse itself, etc.).
    * Whether products/categories are global or warehouse-scoped.
* Decide onboarding model: invite-only vs. restricted registration.
## Phase 1: Secure onboarding (block privilege escalation)
Backend
* Update registration so role cannot be self-assigned to privileged roles.
    * Default new users to `warehouse_staff`.
    * Allow role assignment only by admin via admin APIs.
* Introduce invite-based onboarding for real-world:
    * Add models: `Invite` (token, email, role, allowed_warehouses, expires_at, created_by, used_at).
    * Add endpoints:
        * Admin creates invite (role + warehouse scope).
        * Registration requires invite token, role derived from invite.
Frontend
* Registration page becomes “accept invite” (or keep public registration but role locked to warehouse_staff).
## Phase 2: Warehouse-scoped access (core real-world feature)
Backend
* Add user-to-warehouse relationship:
    * `User.allowed_warehouses = ManyToMany(Warehouse)` (or through model for metadata like default warehouse).
* Implement a reusable scoping layer:
    * A `ScopedQuerySetMixin` or helper that filters querysets by `request.user.allowed_warehouses`.
    * An object-level permission helper for warehouse-bound objects.
* Apply scoping to:
    * Operations documents (Receipt/Delivery/Transfer/Adjustment/Return/CycleCount/PickWave).
    * Stock endpoints: `StockItem`, `BinLocation`, `BinStockItem`, ledger.
* Add admin override (admin can access all warehouses).
Frontend
* Add a “current warehouse context” selector for users with multiple warehouses (optional but highly useful).
## Phase 3: Consistent RBAC enforcement per module/action
Backend
* Standardize permissions with `get_permissions()` per ViewSet action.
* Apply role checks to sensitive actions:
    * Approve/validate operations docs.
    * Create/update/delete on master data (products/categories/warehouses/bins) based on role.
    * Integrations and notification jobs remain admin/manager.
* Introduce explicit capability names (internal mapping) even if roles remain simple:
    * Example capabilities: `products.read`, `products.write`, `ops.approve`, `ops.validate`, `integrations.manage`, `users.manage`.
    * Map roles → capabilities in one place so future roles are easy.
## Phase 4: Approval policy engine (thresholds + multi-step)
Backend
* Add configurable approval policies:
    * Model ideas: `ApprovalPolicy` with fields like document_type, threshold_amount/quantity, warehouse, requires_n_approvals, roles_allowed_to_approve.
* Enforce:
    * Who can approve.
    * When approvals are required.
    * Optional: multi-step approvals for high-risk adjustments/transfers.
* Improve audit entries around approvals (before/after state, approver, notes).
## Phase 5: User management APIs + admin UX
Backend
* Add admin endpoints:
    * List users, update role, deactivate/reactivate user.
    * Set allowed warehouses.
    * Revoke invites, reissue invites.
* Ensure every admin action is audited.
Frontend
* Add “Settings → Users” and “Settings → Access / Invites” screens.
* Show warehouse memberships and role.
## Phase 6: Frontend gating (UX, not security)
Frontend
* Add a single auth/role context (fetch `/auth/profile/` once and cache).
* Gate navigation items based on capabilities.
* Route guard patterns:
    * If API returns 401 → redirect login.
    * If API returns 403 → show an Access Denied page.
* Hide/disable approve/validate buttons for users without capability.
## Phase 7: Auditing upgrades (company compliance)
Backend
* Extend audit logging to include:
    * Permission denied events (optional but valuable).
    * Role changes, warehouse membership changes.
    * Approvals/validations/stock adjustments.
* Provide filters and export (CSV) for audit logs.
## Phase 8: Automated RBAC + scoping tests
Backend
* Add tests that assert:
    * Public user cannot create admin.
    * Warehouse scoping works (WH-A user cannot read WH-B docs by ID).
    * Role enforcement works per action (approve/validate restricted).
    * Admin override works.
Frontend
* Lightweight tests optional; focus on backend tests as source of truth.
# Deliverables (what you will have at the end)
* Invite-based onboarding and admin-controlled role assignment.
* Warehouse-scoped data isolation.
* Central, consistent role/capability enforcement across DRF endpoints.
* Approval policy system for real operational controls.
* Admin screens and APIs for user + access management.
* Better audit trails.
* RBAC regression test suite.
# Rollout strategy (avoid breaking existing users)
* Introduce new models and permissions behind defaults that preserve current behavior for existing admins.
* Add a one-time migration/management command to assign existing users:
    * default allowed warehouses (e.g. all active warehouses) for admin, or a selected default for others.
* Gradually tighten endpoint permissions, starting with the most sensitive actions (role changes, integrations, approvals).
# Open questions to confirm before implementation
* Do you want public self-registration at all, or invite-only?
* Are products/categories global across warehouses, or warehouse-specific?
* Should warehouse_staff be allowed to create drafts for all docs, or view-only?
* Should validate (finalize) be restricted to inventory_manager/admin only?
* Do you need per-warehouse “manager” roles (manager for WH-A but staff in WH-B)?
