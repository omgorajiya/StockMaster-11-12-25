from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReceiptViewSet,
    DeliveryOrderViewSet,
    ReturnOrderViewSet,
    InternalTransferViewSet,
    StockAdjustmentViewSet,
    StockLedgerViewSet,
    CycleCountTaskViewSet,
    PickWaveViewSet,
    ApprovalViewSet,
    DocumentCommentViewSet,
    DocumentAttachmentViewSet,
    SavedViewViewSet,
    AuditLogViewSet,
)

router = DefaultRouter()
router.register(r'receipts', ReceiptViewSet)
router.register(r'deliveries', DeliveryOrderViewSet)
router.register(r'returns', ReturnOrderViewSet, basename='returns')
router.register(r'transfers', InternalTransferViewSet)
router.register(r'adjustments', StockAdjustmentViewSet)
router.register(r'ledger', StockLedgerViewSet, basename='ledger')
router.register(r'cycle-counts', CycleCountTaskViewSet, basename='cycle-counts')
router.register(r'pick-waves', PickWaveViewSet, basename='pick-waves')
router.register(r'approvals', ApprovalViewSet)
router.register(r'comments', DocumentCommentViewSet)
router.register(r'attachments', DocumentAttachmentViewSet)
router.register(r'saved-views', SavedViewViewSet, basename='saved-views')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('', include(router.urls)),
]