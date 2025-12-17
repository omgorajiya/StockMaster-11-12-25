from __future__ import annotations

from typing import Optional

from accounts.scoping import scope_queryset

from .models import Receipt, DeliveryOrder, ReturnOrder, InternalTransfer, StockAdjustment, CycleCountTask


DOC_TYPE_MODEL = {
    'receipt': (Receipt, ('warehouse',)),
    'delivery': (DeliveryOrder, ('warehouse',)),
    'return': (ReturnOrder, ('warehouse',)),
    'transfer': (InternalTransfer, ('warehouse', 'to_warehouse')),
    'adjustment': (StockAdjustment, ('warehouse',)),
    'cycle_count': (CycleCountTask, ('warehouse',)),
}


def get_scoped_document(user, document_type: str, document_id: int):
    entry = DOC_TYPE_MODEL.get(document_type)
    if not entry:
        return None

    model, warehouse_fields = entry
    qs = scope_queryset(model.objects.all(), user, warehouse_fields=warehouse_fields)
    return qs.filter(id=document_id).first()


def document_in_scope(user, document_type: str, document_id: int, return_warehouse: bool = False):
    """Return True if the underlying document is accessible.

    If return_warehouse is True, returns the document instance (or None).
    """

    obj = get_scoped_document(user, document_type, document_id)
    if return_warehouse:
        return obj
    return obj is not None
