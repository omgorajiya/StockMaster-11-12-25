import logging
import mimetypes
from uuid import uuid4

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsWarehouseStaff, IsInventoryManager, IsAdmin
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.files.storage import default_storage
from .models import (
    Receipt, ReceiptItem,
    DeliveryOrder, DeliveryItem,
    ReturnOrder, ReturnItem,
    InternalTransfer, TransferItem,
    StockAdjustment, AdjustmentItem,
    StockLedger,
    CycleCountTask, CycleCountItem,
    PickWave, Approval, DocumentComment, DocumentAttachment, SavedView, AuditLog,
)
from .serializers import (
    ReceiptSerializer, ReceiptCreateSerializer,
    DeliveryOrderSerializer, DeliveryOrderCreateSerializer,
    ReturnOrderSerializer, ReturnOrderCreateSerializer,
    InternalTransferSerializer, InternalTransferCreateSerializer,
    StockAdjustmentSerializer, StockAdjustmentCreateSerializer,
    StockLedgerSerializer,
    CycleCountTaskSerializer, CycleCountTaskCreateSerializer,
    PickWaveSerializer, PickWaveCreateSerializer,
    ApprovalSerializer,
    DocumentCommentSerializer,
    DocumentAttachmentSerializer,
    SavedViewSerializer,
    AuditLogSerializer,
)
from products.models import StockItem, BinStockItem, BinLocation
from integrations.services import emit_event
from .audit import log_audit_event

logger = logging.getLogger(__name__)


def _emit_integration_event(event_type: str, payload: dict):
    """Safely emit an integration event without breaking the request flow."""
    try:
        emit_event(event_type, payload)
    except Exception:  # pragma: no cover - best-effort logging
        logger.exception("Failed to emit integration event %s", event_type)


class ReceiptViewSet(viewsets.ModelViewSet):
    """Receipt CRUD operations"""
    queryset = Receipt.objects.select_related('warehouse', 'created_by').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'created_by']
    search_fields = ['document_number', 'supplier']
    ordering_fields = ['created_at', 'document_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ReceiptCreateSerializer
        return ReceiptSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a receipt so it can transition to ready/done when required."""
        receipt = self.get_object()
        success, message = receipt.approve(user=request.user, notes=request.data.get('notes', ''))
        status_code = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        serializer = self.get_serializer(receipt)
        return Response({'success': success, 'message': message, 'receipt': serializer.data}, status=status_code)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate and complete receipt"""
        receipt = self.get_object()
        previous_status = receipt.status
        success, message = receipt.validate_and_complete()
        
        if success:
            # Create ledger entries - optimize with select_related
            for item in receipt.items.select_related('product').all():
                try:
                    stock_item = StockItem.objects.get(
                        product=item.product,
                        warehouse=receipt.warehouse
                    )
                except StockItem.DoesNotExist:
                    # Create stock item if it doesn't exist
                    stock_item = StockItem.objects.create(
                        product=item.product,
                        warehouse=receipt.warehouse,
                        quantity=0
                    )
                StockLedger.objects.create(
                    product=item.product,
                    warehouse=receipt.warehouse,
                    bin=item.bin,
                    transaction_type='receipt',
                    document_number=receipt.document_number,
                    quantity=item.stock_quantity(),
                    balance_after=stock_item.quantity,
                    reference=receipt.supplier,
                    created_by=request.user,
                )

            items_payload = [
                {
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_delta': str(item.stock_quantity()),
                    'bin_id': item.bin_id,
                    'bin_code': item.bin.code if item.bin else None,
                }
                for item in receipt.items.all()
            ]
            payload = {
                'document_number': receipt.document_number,
                'warehouse_id': receipt.warehouse_id,
                'warehouse_name': receipt.warehouse.name,
                'completed_at': receipt.completed_at,
                'items': items_payload,
            }
            _emit_integration_event('receipt_completed', payload)
            _emit_integration_event('stock_change', {**payload, 'source': 'receipt'})
            log_audit_event(
                document_type='receipt',
                document_id=receipt.id,
                action='validation',
                user=request.user,
                message='Receipt validated',
                before={'status': previous_status},
                after={'status': receipt.status},
            )
        
        return Response({
            'success': success,
            'message': message
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class DeliveryOrderViewSet(viewsets.ModelViewSet):
    """Delivery Order CRUD operations"""
    queryset = DeliveryOrder.objects.select_related('warehouse', 'created_by').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Include pick_waves so we can filter deliveries that belong to a specific
    # wave, enabling the pick-wave detail page to show only relevant orders.
    filterset_fields = ['status', 'warehouse', 'created_by', 'pick_waves']
    search_fields = ['document_number', 'customer']
    ordering_fields = ['created_at', 'document_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DeliveryOrderCreateSerializer
        return DeliveryOrderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a delivery so it can transition to ready/done when required."""
        delivery = self.get_object()
        success, message = delivery.approve(user=request.user, notes=request.data.get('notes', ''))
        status_code = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        serializer = self.get_serializer(delivery)
        return Response({'success': success, 'message': message, 'delivery': serializer.data}, status=status_code)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate and complete delivery"""
        delivery = self.get_object()
        previous_status = delivery.status
        success, message = delivery.validate_and_complete()
        
        if success:
            # Create ledger entries - optimize with select_related
            for item in delivery.items.select_related('product').all():
                try:
                    stock_item = StockItem.objects.get(
                        product=item.product,
                        warehouse=delivery.warehouse
                    )
                except StockItem.DoesNotExist:
                    # Create stock item if it doesn't exist
                    stock_item = StockItem.objects.create(
                        product=item.product,
                        warehouse=delivery.warehouse,
                        quantity=0
                    )
                StockLedger.objects.create(
                    product=item.product,
                    warehouse=delivery.warehouse,
                    bin=item.bin,
                    transaction_type='delivery',
                    document_number=delivery.document_number,
                    quantity=-item.stock_quantity(),
                    balance_after=stock_item.quantity,
                    reference=delivery.customer,
                    created_by=request.user,
                )

            items_payload = [
                {
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_delta': str(-item.stock_quantity()),
                    'bin_id': item.bin_id,
                    'bin_code': item.bin.code if item.bin else None,
                }
                for item in delivery.items.all()
            ]
            payload = {
                'document_number': delivery.document_number,
                'warehouse_id': delivery.warehouse_id,
                'warehouse_name': delivery.warehouse.name,
                'completed_at': delivery.completed_at,
                'items': items_payload,
            }
            _emit_integration_event('delivery_completed', payload)
            _emit_integration_event('stock_change', {**payload, 'source': 'delivery'})
            log_audit_event(
                document_type='deliveryorder',
                document_id=delivery.id,
                action='validation',
                user=request.user,
                message='Delivery completed',
                before={'status': previous_status},
                after={'status': delivery.status},
            )
        
        return Response({
            'success': success,
            'message': message
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class ReturnOrderViewSet(viewsets.ModelViewSet):
    """Customer returns (RMA) management"""
    queryset = ReturnOrder.objects.select_related('warehouse', 'created_by', 'delivery_order').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'created_by', 'delivery_order']
    search_fields = ['document_number']
    ordering_fields = ['created_at', 'document_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ReturnOrderCreateSerializer
        return ReturnOrderSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a return so it can transition to ready/done when required."""
        return_order = self.get_object()
        success, message = return_order.approve(user=request.user, notes=request.data.get('notes', ''))
        status_code = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        serializer = self.get_serializer(return_order)
        return Response({'success': success, 'message': message, 'return': serializer.data}, status=status_code)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate and complete return, writing ledger entries.

        Stock is always adjusted in the same warehouse chosen by
        `ReturnOrder._get_target_warehouse_for_stock`, so the ledger reflects
        the actual location (quarantine or original).
        """
        from products.models import Warehouse as ProductWarehouse
        from decimal import Decimal

        return_order = self.get_object()
        previous_status = return_order.status
        success, message = return_order.validate_and_complete()

        if success:
            # Resolve the effective warehouse used for stock movements.
            quarantine = ProductWarehouse.objects.filter(is_active=True, is_quarantine=True).first()
            target_warehouse = quarantine or return_order.warehouse

            # Create ledger entries. For restock/repair, quantity is positive; for scrap, we log zero-movement.
            for item in return_order.items.all():
                quantity = item.quantity if return_order.disposition in ['restock', 'repair'] else Decimal('0.00')

                # Get current stock balance after the operation for audit.
                try:
                    stock_item = StockItem.objects.get(
                        product=item.product,
                        warehouse=target_warehouse,
                    )
                    balance_after = stock_item.quantity
                except StockItem.DoesNotExist:
                    balance_after = Decimal('0.00')

                StockLedger.objects.create(
                    product=item.product,
                    warehouse=target_warehouse,
                    bin=None,
                    transaction_type='return',
                    document_number=return_order.document_number,
                    quantity=quantity,
                    balance_after=balance_after,
                    reference=f"Disposition: {return_order.disposition}; Reason: {return_order.reason}",
                    created_by=request.user,
                )

            payload = {
                'document_number': return_order.document_number,
                'warehouse_id': target_warehouse.id,
                'warehouse_name': target_warehouse.name,
                'disposition': return_order.disposition,
                'completed_at': return_order.completed_at,
                'items': [
                    {
                        'product_id': item.product_id,
                        'product_name': item.product.name,
                        'quantity_delta': str(item.quantity if return_order.disposition in ['restock', 'repair'] else 0),
                    }
                    for item in return_order.items.all()
                ],
            }
            _emit_integration_event('return_completed', payload)
            _emit_integration_event('stock_change', {**payload, 'source': 'return'})

        if success:
            log_audit_event(
                document_type='returnorder',
                document_id=return_order.id,
                action='validation',
                user=request.user,
                message='Return processed',
                before={'status': previous_status},
                after={'status': return_order.status},
            )

        return Response(
            {'success': success, 'message': message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
        )


class InternalTransferViewSet(viewsets.ModelViewSet):
    """Internal Transfer CRUD operations"""
    queryset = InternalTransfer.objects.select_related('warehouse', 'to_warehouse', 'created_by').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'to_warehouse', 'created_by']
    search_fields = ['document_number']
    ordering_fields = ['created_at', 'document_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return InternalTransferCreateSerializer
        return InternalTransferSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a transfer so it can transition to ready/done when required."""
        transfer = self.get_object()
        success, message = transfer.approve(user=request.user, notes=request.data.get('notes', ''))
        status_code = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        serializer = self.get_serializer(transfer)
        return Response({'success': success, 'message': message, 'transfer': serializer.data}, status=status_code)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate and complete transfer"""
        transfer = self.get_object()
        previous_status = transfer.status
        success, message = transfer.validate_and_complete()
        
        if success:
            # Create ledger entries
            for item in transfer.items.select_related('product').all():
                transfer_qty = item.stock_quantity()
                # Outgoing entry
                try:
                    from_stock = StockItem.objects.get(
                        product=item.product,
                        warehouse=transfer.warehouse
                    )
                except StockItem.DoesNotExist:
                    from_stock = StockItem.objects.create(
                        product=item.product,
                        warehouse=transfer.warehouse,
                        quantity=0
                    )
                StockLedger.objects.create(
                    product=item.product,
                    warehouse=transfer.warehouse,
                    bin=None,
                    transaction_type='transfer_out',
                    document_number=transfer.document_number,
                    quantity=-transfer_qty,
                    balance_after=from_stock.quantity,
                    reference=f"To {transfer.to_warehouse.name}",
                    created_by=request.user,
                )
                
                # Incoming entry
                try:
                    to_stock = StockItem.objects.get(
                        product=item.product,
                        warehouse=transfer.to_warehouse
                    )
                except StockItem.DoesNotExist:
                    to_stock = StockItem.objects.create(
                        product=item.product,
                        warehouse=transfer.to_warehouse,
                        quantity=0
                    )
                StockLedger.objects.create(
                    product=item.product,
                    warehouse=transfer.to_warehouse,
                    bin=item.bin,
                    transaction_type='transfer_in',
                    document_number=transfer.document_number,
                    quantity=transfer_qty,
                    balance_after=to_stock.quantity,
                    reference=f"From {transfer.warehouse.name}",
                    created_by=request.user,
                )

            items_payload = [
                {
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_delta': str(item.stock_quantity()),
                    'destination_bin_id': item.bin_id,
                    'destination_bin_code': item.bin.code if item.bin else None,
                }
                for item in transfer.items.all()
            ]
            payload = {
                'document_number': transfer.document_number,
                'from_warehouse_id': transfer.warehouse_id,
                'from_warehouse_name': transfer.warehouse.name,
                'to_warehouse_id': transfer.to_warehouse_id,
                'to_warehouse_name': transfer.to_warehouse.name,
                'completed_at': transfer.completed_at,
                'items': items_payload,
            }
            _emit_integration_event('transfer_completed', payload)
            _emit_integration_event('stock_change', {**payload, 'source': 'transfer'})
            log_audit_event(
                document_type='internaltransfer',
                document_id=transfer.id,
                action='validation',
                user=request.user,
                message='Transfer completed',
                before={'status': previous_status},
                after={'status': transfer.status},
            )
        
        return Response({
            'success': success,
            'message': message
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    """Stock Adjustment CRUD operations"""
    queryset = StockAdjustment.objects.select_related('warehouse', 'created_by').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'adjustment_type', 'created_by']
    search_fields = ['document_number', 'reason']
    ordering_fields = ['created_at', 'document_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StockAdjustmentCreateSerializer
        return StockAdjustmentSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a stock adjustment so it can transition to ready/done when required."""
        adjustment = self.get_object()
        success, message = adjustment.approve(user=request.user, notes=request.data.get('notes', ''))
        status_code = status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
        serializer = self.get_serializer(adjustment)
        return Response({'success': success, 'message': message, 'adjustment': serializer.data}, status=status_code)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate and complete adjustment"""
        adjustment = self.get_object()
        previous_status = adjustment.status
        success, message = adjustment.validate_and_complete()
        
        if success:
            payload_items = []
            # Create ledger entries - optimize with select_related
            for item in adjustment.items.select_related('product').all():
                try:
                    stock_item = StockItem.objects.get(
                        product=item.product,
                        warehouse=adjustment.warehouse
                    )
                except StockItem.DoesNotExist:
                    # Create stock item if it doesn't exist
                    stock_item = StockItem.objects.create(
                        product=item.product,
                        warehouse=adjustment.warehouse,
                        quantity=0
                    )
                quantity = item.adjustment_quantity
                if adjustment.adjustment_type == 'decrease':
                    quantity = -quantity
                elif adjustment.adjustment_type == 'set':
                    quantity = item.adjustment_quantity - item.current_quantity
                
                StockLedger.objects.create(
                    product=item.product,
                    warehouse=adjustment.warehouse,
                    bin=None,
                    transaction_type='adjustment',
                    document_number=adjustment.document_number,
                    quantity=quantity,
                    balance_after=stock_item.quantity,
                    reference=adjustment.reason,
                    created_by=request.user
                )
                payload_items.append({
                    'product_id': item.product_id,
                    'product_name': item.product.name,
                    'quantity_delta': str(quantity),
                })

            payload = {
                'document_number': adjustment.document_number,
                'warehouse_id': adjustment.warehouse_id,
                'warehouse_name': adjustment.warehouse.name,
                'completed_at': adjustment.completed_at,
                'adjustment_type': adjustment.adjustment_type,
                'items': payload_items,
            }
            _emit_integration_event('adjustment_completed', payload)
            _emit_integration_event('stock_change', {**payload, 'source': 'adjustment'})
            log_audit_event(
                document_type='stockadjustment',
                document_id=adjustment.id,
                action='validation',
                user=request.user,
                message='Adjustment posted',
                before={'status': previous_status},
                after={'status': adjustment.status},
            )
        
        return Response({
            'success': success,
            'message': message
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


class StockLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """Stock Ledger - Read-only audit trail"""
    queryset = StockLedger.objects.select_related('product', 'warehouse', 'created_by')
    serializer_class = StockLedgerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'warehouse', 'transaction_type', 'document_number']
    search_fields = ['product__name', 'product__sku', 'document_number']
    ordering_fields = ['created_at']


class CycleCountTaskViewSet(viewsets.ModelViewSet):
    """Cycle count task management"""
    queryset = CycleCountTask.objects.select_related('warehouse', 'created_by').prefetch_related('items__product')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'created_by', 'scheduled_date']
    search_fields = ['document_number']
    ordering_fields = ['scheduled_date', 'created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CycleCountTaskCreateSerializer
        return CycleCountTaskSerializer

    def perform_create(self, serializer):
        # CycleCountTaskCreateSerializer sets created_by from request.user.
        # Passing it here as well causes: "got multiple values for keyword argument 'created_by'".
        serializer.save()

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Mark cycle count as 'ready' so counting can begin."""
        task = self.get_object()
        if task.status not in ['draft', 'waiting']:
            return Response({'detail': 'Task cannot be started from current status.'}, status=status.HTTP_400_BAD_REQUEST)
        task.status = 'ready'
        task.save(update_fields=['status'])
        return Response({'success': True, 'status': task.status})

    @action(detail=True, methods=['post'])
    def update_counts(self, request, pk=None):
        """Update counted quantities for items in this cycle count."""
        task = self.get_object()
        if task.status != 'ready':
            return Response({'detail': "Task must be in 'ready' status to update counts."}, status=status.HTTP_400_BAD_REQUEST)

        items_data = request.data.get('items', [])
        if not isinstance(items_data, list):
            return Response({'detail': 'items must be a list of {id, counted_quantity}.'}, status=status.HTTP_400_BAD_REQUEST)

        item_map = {item.id: item for item in task.items.all()}

        from decimal import Decimal

        updated_count = 0
        for entry in items_data:
            item_id = entry.get('id')
            counted_qty = entry.get('counted_quantity')
            if item_id is None or counted_qty is None:
                continue

            try:
                item = item_map[int(item_id)]
            except (KeyError, ValueError, TypeError):
                continue

            try:
                item.counted_quantity = Decimal(str(counted_qty))
            except Exception:
                continue

            item.save(update_fields=['counted_quantity'])
            updated_count += 1

        return Response({'success': True, 'updated_items': updated_count})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete a cycle count and generate a stock adjustment if needed."""
        task = self.get_object()
        if task.status != 'ready':
            return Response({'detail': "Task must be in 'ready' status to complete."}, status=status.HTTP_400_BAD_REQUEST)

        # Build adjustment only for items where counted != expected
        variance_items = [item for item in task.items.all() if item.variance != 0]
        if not variance_items:
            task.status = 'done'
            task.completed_at = timezone.now()
            task.save(update_fields=['status', 'completed_at'])
            return Response({'success': True, 'message': 'Cycle count completed. No stock differences found.'})

        # Create StockAdjustment with type 'set' so quantities match counted values
        adjustment = StockAdjustment.objects.create(
            warehouse=task.warehouse,
            created_by=task.created_by,
            status='ready',
            reason=f'Cycle count {task.document_number}',
            adjustment_type='set',
            notes=task.notes,
        )

        for item in variance_items:
            # Determine current quantity from StockItem; fall back to expected_quantity if missing
            try:
                stock_item = StockItem.objects.get(product=item.product, warehouse=task.warehouse)
                current_qty = stock_item.quantity
            except StockItem.DoesNotExist:
                current_qty = item.expected_quantity

            AdjustmentItem.objects.create(
                adjustment=adjustment,
                product=item.product,
                current_quantity=current_qty,
                adjustment_quantity=item.counted_quantity,
                reason=f'Cycle count variance ({item.variance})',
            )

        # Apply adjustment and create ledger entries using existing logic pattern
        success, message = adjustment.validate_and_complete()

        if success:
            for adj_item in adjustment.items.all():
                stock_item = StockItem.objects.get(
                    product=adj_item.product,
                    warehouse=adjustment.warehouse,
                )
                quantity = adj_item.adjustment_quantity
                if adjustment.adjustment_type == 'decrease':
                    quantity = -quantity
                elif adjustment.adjustment_type == 'set':
                    quantity = adj_item.adjustment_quantity - adj_item.current_quantity

                StockLedger.objects.create(
                    product=adj_item.product,
                    warehouse=adjustment.warehouse,
                    bin=None,
                    transaction_type='adjustment',
                    document_number=adjustment.document_number,
                    quantity=quantity,
                    balance_after=stock_item.quantity,
                    reference=adjustment.reason,
                    created_by=request.user,
                )

            task.status = 'done'
            task.completed_at = timezone.now()
            task.generated_adjustment = adjustment
            task.save(update_fields=['status', 'completed_at', 'generated_adjustment'])

            payload = {
                'document_number': task.document_number,
                'warehouse_id': task.warehouse_id,
                'warehouse_name': task.warehouse.name,
                'completed_at': task.completed_at,
                'variance_items': [
                    {
                        'product_id': item.product_id,
                        'product_name': item.product.name,
                        'expected_quantity': str(item.expected_quantity),
                        'counted_quantity': str(item.counted_quantity),
                        'variance': str(item.variance),
                    }
                    for item in variance_items
                ],
                'generated_adjustment': adjustment.document_number,
            }
            _emit_integration_event('cycle_count_completed', payload)
            log_audit_event(
                document_type='cyclecounttask',
                document_id=task.id,
                action='validation',
                user=request.user,
                message='Cycle count completed',
                before={'status': 'ready'},
                after={'status': task.status},
            )

        return Response({
            'success': success,
            'message': message,
            'adjustment_id': adjustment.id,
            'adjustment_document_number': adjustment.document_number,
        }, status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST)


# New ViewSets for the missing features

class PickWaveViewSet(viewsets.ModelViewSet):
    """Pick wave management for batch picking"""
    queryset = PickWave.objects.select_related('warehouse', 'created_by', 'assigned_picker').prefetch_related('delivery_orders')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'assigned_picker', 'created_by']
    search_fields = ['name']
    ordering_fields = ['created_at', 'name']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PickWaveCreateSerializer
        return PickWaveSerializer

    def perform_create(self, serializer):
        # PickWaveCreateSerializer sets created_by from request.user.
        serializer.save()

    @action(detail=True, methods=['post'])
    def start_picking(self, request, pk=None):
        """Start the picking process for this wave."""
        pick_wave = self.get_object()
        success, message = pick_wave.start_picking()
        if success:
            return Response({'success': True, 'message': message})
        return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def complete_picking(self, request, pk=None):
        """Complete the picking process for this wave."""
        pick_wave = self.get_object()
        success, message = pick_wave.complete_picking()
        if success:
            return Response({'success': True, 'message': message})
        return Response({'success': False, 'message': message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def generate_wave(self, request):
        """Generate a new pick wave from delivery orders based on filters.

        This is a collection-level action exposed at
        `/operations/pick-waves/generate_wave/`, matching the frontend
        `operationsService.generatePickWave` helper.
        """
        from .models import DeliveryOrder
        from django.db.models import Q

        # Get filter parameters from request
        warehouse_id = request.data.get('warehouse')
        date_from = request.data.get('date_from')
        date_to = request.data.get('date_to')
        status_value = request.data.get('status', 'ready')

        # Build query for delivery orders
        query = Q(status=status_value)
        if warehouse_id:
            query &= Q(warehouse_id=warehouse_id)
        if date_from:
            query &= Q(created_at__gte=date_from)
        if date_to:
            query &= Q(created_at__lte=date_to)

        # Get matching delivery orders
        delivery_orders = DeliveryOrder.objects.filter(query)

        if not delivery_orders.exists():
            return Response(
                {'success': False, 'message': 'No matching delivery orders found'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # All delivery orders must belong to the same warehouse to keep waves consistent.
        warehouses = delivery_orders.values_list('warehouse_id', flat=True).distinct()
        if warehouses.count() > 1:
            return Response(
                {'success': False, 'message': 'Pick waves cannot span multiple warehouses. Please filter by a single warehouse.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create pick wave
        name = request.data.get('name', f'Wave {timezone.now().strftime("%Y-%m-%d %H:%M")}')
        warehouse = delivery_orders.first().warehouse

        pick_wave = PickWave.objects.create(
            name=name,
            warehouse=warehouse,
            created_by=request.user,
            status='planned',
        )

        # Assign delivery orders to the wave
        pick_wave.delivery_orders.set(delivery_orders)

        serializer = self.get_serializer(pick_wave)
        return Response({'success': True, 'pick_wave': serializer.data})

    @action(detail=True, methods=['get'])
    def pick_list(self, request, pk=None):
        """Return aggregated pick list grouped by product and bin for this wave.

        The response contains rows with product and bin information along with
        total quantity to pick and the number of orders that include the item.
        """
        pick_wave = self.get_object()

        # Build aggregation from delivery order items
        rows = {}
        for order in pick_wave.delivery_orders.all().prefetch_related('items__product', 'items__bin'):
            for item in order.items.all():
                key = f"{item.product_id}|{item.bin_id or 'none'}"
                bin_code = item.bin.code if item.bin else '-'
                quantity = item.stock_quantity()

                if key not in rows:
                    rows[key] = {
                        'product_id': item.product_id,
                        'product_name': item.product.name,
                        'product_sku': item.product.sku,
                        'bin_code': bin_code,
                        'total_quantity': 0,
                        'order_count': 0,
                    }
                rows[key]['total_quantity'] += float(quantity)
                rows[key]['order_count'] += 1

        # Sort by bin then SKU for efficient floor picking
        sorted_rows = sorted(rows.values(), key=lambda r: (r['bin_code'] or '', r['product_sku'] or ''))
        return Response({'results': sorted_rows})


class ApprovalViewSet(viewsets.ModelViewSet):
    """Generic approval management"""
    queryset = Approval.objects.select_related('approver')
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['document_type', 'document_id', 'approver']
    ordering_fields = ['approved_at']


class DocumentCommentViewSet(viewsets.ModelViewSet):
    """Generic document comments management"""
    queryset = DocumentComment.objects.select_related('author')
    serializer_class = DocumentCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['document_type', 'document_id', 'author']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class DocumentAttachmentViewSet(viewsets.ModelViewSet):
    """Generic document attachments management"""
    queryset = DocumentAttachment.objects.select_related('uploaded_by')
    serializer_class = DocumentAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['document_type', 'document_id', 'uploaded_by']
    ordering_fields = ['uploaded_at']
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        if not uploaded_file:
            raise ValidationError({'file': 'An attachment file is required.'})

        filename = uploaded_file.name
        path = f"document_attachments/{timezone.now().strftime('%Y/%m/%d')}_{uuid4().hex}_{filename}"
        saved_path = default_storage.save(path, uploaded_file)
        mime_type = uploaded_file.content_type or mimetypes.guess_type(filename)[0] or 'application/octet-stream'

        serializer.save(
            uploaded_by=self.request.user,
            file_name=filename,
            file_path=saved_path,
            file_size=uploaded_file.size,
            mime_type=mime_type,
        )


class SavedViewViewSet(viewsets.ModelViewSet):
    """Saved views/filters management"""
    queryset = SavedView.objects.select_related('user')
    serializer_class = SavedViewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'page_key']
    ordering_fields = ['created_at', 'page_key']

    def get_queryset(self):
        # Users can only see their own saved views
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def by_page(self, request):
        """Get saved views for a specific page"""
        page_key = request.query_params.get('page_key')
        if not page_key:
            return Response({'detail': 'page_key parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        saved_views = self.get_queryset().filter(page_key=page_key)
        serializer = self.get_serializer(saved_views, many=True)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log access."""

    queryset = AuditLog.objects.select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document_type', 'document_id', 'action', 'user']
    search_fields = ['message']
    ordering_fields = ['created_at']
