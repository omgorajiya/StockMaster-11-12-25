from __future__ import annotations

from django.conf import settings
from django.db.models import Q


def require_warehouse_membership() -> bool:
    return bool(getattr(settings, 'RBAC_REQUIRE_WAREHOUSE_MEMBERSHIP', False))


def allowed_warehouse_ids(user):
    if not getattr(user, 'is_authenticated', False):
        return []
    if getattr(user, 'role', None) == 'admin':
        return None  # admin = all warehouses
    return list(user.allowed_warehouses.values_list('id', flat=True))


def scope_queryset(qs, user, warehouse_fields=('warehouse',)):
    """Filter a queryset to warehouses the user is allowed to access.

    If RBAC_REQUIRE_WAREHOUSE_MEMBERSHIP is False and the user has no assigned
    warehouses, we keep legacy behaviour (no filtering) to avoid breaking
    existing installs. Turn the setting on to enforce strict isolation.
    """

    if getattr(user, 'role', None) == 'admin':
        return qs

    ids = allowed_warehouse_ids(user)
    if ids is None:
        return qs

    if not ids:
        return qs.none() if require_warehouse_membership() else qs

    q = Q()
    for field in warehouse_fields:
        q |= Q(**{f"{field}__in": ids})
    return qs.filter(q)


class WarehouseScopedQuerySetMixin:
    """DRF ViewSet mixin that scopes get_queryset() to user.allowed_warehouses."""

    warehouse_fields = ('warehouse',)

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        return scope_queryset(qs, user, warehouse_fields=self.warehouse_fields)
