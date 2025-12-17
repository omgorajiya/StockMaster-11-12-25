from __future__ import annotations

from decimal import Decimal

from .models import ApprovalPolicy


def requires_approval(*, document_type: str, warehouse, total_quantity: Decimal | None) -> bool:
    """Return True if an approval policy requires approval for this document.

    Policy matching order:
    1) Warehouse-specific policies
    2) Global policies (warehouse is null)

    If any active policy matches:
    - threshold_total_quantity is null => always require approval
    - else require when total_quantity >= threshold
    """

    if not warehouse:
        return False

    policies = ApprovalPolicy.objects.filter(is_active=True, document_type=document_type).filter(
        warehouse__in=[warehouse, None]
    )

    if not policies.exists():
        return False

    qty = total_quantity
    for policy in policies:
        if policy.warehouse_id not in [None, getattr(warehouse, 'id', None)]:
            continue

        threshold = policy.threshold_total_quantity
        if threshold is None:
            return True
        if qty is None:
            continue
        if qty >= threshold:
            return True

    return False
