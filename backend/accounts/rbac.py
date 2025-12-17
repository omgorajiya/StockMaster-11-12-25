from __future__ import annotations

from typing import Iterable, Set


# Central capability map.
# Keep this small and stable; add new capabilities as modules grow.
ROLE_CAPABILITIES: dict[str, Set[str]] = {
    'warehouse_staff': {
        'products.read',
        'ops.read',
        'ops.draft',
    },
    'inventory_manager': {
        'products.read',
        'products.write',
        'ops.read',
        'ops.draft',
        'ops.approve',
        'ops.validate',
        'audit.read',
    },
    'admin': {'*'},
}


def user_capabilities(user) -> Set[str]:
    if not getattr(user, 'is_authenticated', False):
        return set()
    role = getattr(user, 'role', None) or 'warehouse_staff'
    return ROLE_CAPABILITIES.get(role, set())


def user_has_capability(user, capability: str) -> bool:
    caps = user_capabilities(user)
    return '*' in caps or capability in caps


def user_has_any_capability(user, capabilities: Iterable[str]) -> bool:
    caps = user_capabilities(user)
    if '*' in caps:
        return True
    for capability in capabilities:
        if capability in caps:
            return True
    return False
