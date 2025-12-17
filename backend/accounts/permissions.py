from rest_framework import permissions

from .rbac import user_has_any_capability, user_has_capability


def capability_required(capability: str):
    """Return a DRF permission class requiring a single capability."""

    class _CapabilityPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            return bool(request.user and request.user.is_authenticated and user_has_capability(request.user, capability))

    return _CapabilityPermission


def any_capability_required(*capabilities: str):
    """Return a DRF permission class requiring any of the provided capabilities."""

    class _AnyCapabilityPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user
                and request.user.is_authenticated
                and user_has_any_capability(request.user, capabilities)
            )

    return _AnyCapabilityPermission


# Backwards-compatible role-based helpers (still used in a few places).
class IsAdmin(permissions.BasePermission):
    """Permission check for Admin role"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsInventoryManager(permissions.BasePermission):
    """Permission check for Inventory Manager role"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.role == 'admin' or request.user.role == 'inventory_manager'
        )


class IsWarehouseStaff(permissions.BasePermission):
    """Permission check for Warehouse Staff role - all authenticated users"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsAdminOrInventoryManager(permissions.BasePermission):
    """Permission check for Admin or Inventory Manager"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.role == 'admin' or request.user.role == 'inventory_manager'
        )

