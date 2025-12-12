from rest_framework import permissions


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

