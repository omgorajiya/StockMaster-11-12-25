from django.core.files.storage import default_storage
from rest_framework import serializers
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
from products.serializers import ProductSerializer, WarehouseSerializer


class ReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    bin_code = serializers.CharField(source='bin.code', read_only=True)

    class Meta:
        model = ReceiptItem
        fields = '__all__'
        read_only_fields = ('receipt',)  # receipt is auto-assigned, not provided by client


class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = Receipt
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at')


class ReceiptCreateSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True)

    class Meta:
        model = Receipt
        fields = '__all__'
        read_only_fields = ('document_number', 'created_by', 'created_at', 'updated_at', 'completed_at')

    def create(self, validated_data):
        from products.models import Product

        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required'})
        
        receipt = Receipt.objects.create(**validated_data)

        # Evaluate approval policy based on total received quantity.
        try:
            from decimal import Decimal
            from .policies import requires_approval

            total_qty = Decimal('0.00')
            for entry in items_data:
                qty = entry.get('quantity_received') or Decimal('0.00')
                factor = getattr(entry.get('product'), 'unit_conversion_factor', None) or Decimal('1.0')
                if entry.get('unit_of_measure') == 'purchase':
                    qty = qty * factor
                total_qty += Decimal(qty)

            receipt.requires_approval = requires_approval(
                document_type='receipt',
                warehouse=receipt.warehouse,
                total_quantity=total_qty,
            )
            receipt.save(update_fields=['requires_approval'])
        except Exception:
            pass

        for item_data in items_data:
            # Validate product exists
            product = item_data.get('product')
            if not product:
                raise serializers.ValidationError({'items': 'Product is required for all items'})
            
            # Validate quantity_received
            if not item_data.get('quantity_received') or item_data.get('quantity_received', 0) <= 0:
                raise serializers.ValidationError({'items': 'Quantity received must be greater than 0'})
            
            # Auto-assign bin using the product's default_bin when the client
            # did not specify a bin and the default bin belongs to the same
            # warehouse. This keeps existing explicit bin behaviour intact
            # while enabling a simple put-away strategy.
            if not item_data.get('bin'):
                if isinstance(product, Product):
                    default_bin = getattr(product, 'default_bin', None)
                else:
                    try:
                        product_obj = Product.objects.get(pk=product)
                        default_bin = getattr(product_obj, 'default_bin', None)
                    except Product.DoesNotExist:
                        raise serializers.ValidationError({'items': f'Product with id {product} does not exist'})

                if default_bin and default_bin.warehouse_id == receipt.warehouse_id:
                    item_data['bin'] = default_bin

            ReceiptItem.objects.create(receipt=receipt, **item_data)

        return receipt


class DeliveryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    bin_code = serializers.CharField(source='bin.code', read_only=True)

    class Meta:
        model = DeliveryItem
        fields = '__all__'
        read_only_fields = ('delivery',)  # delivery is auto-assigned, not provided by client


class ReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = ReturnItem
        fields = '__all__'
        read_only_fields = ('return_order',)  # return_order is auto-assigned, not provided by client


class ReturnOrderSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    delivery_document_number = serializers.CharField(
        source='delivery_order.document_number', read_only=True, allow_null=True
    )

    class Meta:
        model = ReturnOrder
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at')


class ReturnOrderCreateSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True)

    class Meta:
        model = ReturnOrder
        fields = '__all__'
        read_only_fields = ('document_number', 'created_by', 'created_at', 'updated_at', 'completed_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required'})
        
        return_order = ReturnOrder.objects.create(**validated_data)

        # Evaluate approval policy based on total returned quantity.
        try:
            from decimal import Decimal
            from .policies import requires_approval

            total_qty = sum([Decimal(str(entry.get('quantity') or 0)) for entry in items_data], Decimal('0.00'))
            return_order.requires_approval = requires_approval(
                document_type='return',
                warehouse=return_order.warehouse,
                total_quantity=total_qty,
            )
            return_order.save(update_fields=['requires_approval'])
        except Exception:
            pass

        for item_data in items_data:
            # Validate product exists
            product = item_data.get('product')
            if not product:
                raise serializers.ValidationError({'items': 'Product is required for all items'})
            
            # Validate quantity
            if not item_data.get('quantity') or item_data.get('quantity', 0) <= 0:
                raise serializers.ValidationError({'items': 'Quantity must be greater than 0'})
            
            ReturnItem.objects.create(return_order=return_order, **item_data)
        return return_order


class DeliveryOrderSerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = DeliveryOrder
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at')


class DeliveryOrderCreateSerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True)

    class Meta:
        model = DeliveryOrder
        fields = '__all__'
        read_only_fields = ('document_number', 'created_by', 'created_at', 'updated_at', 'completed_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required'})
        
        delivery = DeliveryOrder.objects.create(**validated_data)

        # Evaluate approval policy based on total shipped quantity.
        try:
            from decimal import Decimal
            from .policies import requires_approval

            total_qty = Decimal('0.00')
            for entry in items_data:
                qty = entry.get('quantity') or Decimal('0.00')
                factor = getattr(entry.get('product'), 'unit_conversion_factor', None) or Decimal('1.0')
                if entry.get('unit_of_measure') == 'purchase':
                    qty = qty * factor
                total_qty += Decimal(qty)

            delivery.requires_approval = requires_approval(
                document_type='delivery',
                warehouse=delivery.warehouse,
                total_quantity=total_qty,
            )
            delivery.save(update_fields=['requires_approval'])
        except Exception:
            pass

        for item_data in items_data:
            # Validate product exists
            product = item_data.get('product')
            if not product:
                raise serializers.ValidationError({'items': 'Product is required for all items'})
            
            # Validate quantity
            if not item_data.get('quantity') or item_data.get('quantity', 0) <= 0:
                raise serializers.ValidationError({'items': 'Quantity must be greater than 0'})
            
            DeliveryItem.objects.create(delivery=delivery, **item_data)
        return delivery


class TransferItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    bin_code = serializers.CharField(source='bin.code', read_only=True)

    class Meta:
        model = TransferItem
        fields = '__all__'
        read_only_fields = ('transfer',)  # transfer is auto-assigned, not provided by client


class InternalTransferSerializer(serializers.ModelSerializer):
    items = TransferItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = InternalTransfer
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at')


class InternalTransferCreateSerializer(serializers.ModelSerializer):
    items = TransferItemSerializer(many=True)

    class Meta:
        model = InternalTransfer
        fields = '__all__'
        read_only_fields = ('document_number', 'created_by', 'created_at', 'updated_at', 'completed_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required'})
        
        transfer = InternalTransfer.objects.create(**validated_data)

        # Evaluate approval policy based on total transfer quantity.
        try:
            from decimal import Decimal
            from .policies import requires_approval

            total_qty = Decimal('0.00')
            for entry in items_data:
                qty = entry.get('quantity') or Decimal('0.00')
                factor = getattr(entry.get('product'), 'unit_conversion_factor', None) or Decimal('1.0')
                if entry.get('unit_of_measure') == 'purchase':
                    qty = qty * factor
                total_qty += Decimal(qty)

            transfer.requires_approval = requires_approval(
                document_type='transfer',
                warehouse=transfer.warehouse,
                total_quantity=total_qty,
            )
            transfer.save(update_fields=['requires_approval'])
        except Exception:
            pass

        for item_data in items_data:
            # Validate product exists
            product = item_data.get('product')
            if not product:
                raise serializers.ValidationError({'items': 'Product is required for all items'})
            
            # Validate quantity
            if not item_data.get('quantity') or item_data.get('quantity', 0) <= 0:
                raise serializers.ValidationError({'items': 'Quantity must be greater than 0'})
            
            TransferItem.objects.create(transfer=transfer, **item_data)
        return transfer


class AdjustmentItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = AdjustmentItem
        fields = '__all__'
        read_only_fields = ('adjustment',)  # adjustment is auto-assigned, not provided by client


class StockAdjustmentSerializer(serializers.ModelSerializer):
    items = AdjustmentItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = StockAdjustment
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at')


class StockAdjustmentCreateSerializer(serializers.ModelSerializer):
    items = AdjustmentItemSerializer(many=True)

    class Meta:
        model = StockAdjustment
        fields = '__all__'
        read_only_fields = ('document_number', 'created_by', 'created_at', 'updated_at', 'completed_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item is required'})
        
        adjustment = StockAdjustment.objects.create(**validated_data)

        # Evaluate approval policy based on absolute total quantity delta.
        try:
            from decimal import Decimal
            from .policies import requires_approval

            total_delta = Decimal('0.00')
            adjustment_type = adjustment.adjustment_type
            for entry in items_data:
                adj_qty = Decimal(str(entry.get('adjustment_quantity') or 0))
                current_qty = Decimal(str(entry.get('current_quantity') or 0))

                if adjustment_type in ['increase', 'decrease']:
                    delta = adj_qty
                else:
                    delta = abs(adj_qty - current_qty)
                total_delta += abs(delta)

            adjustment.requires_approval = requires_approval(
                document_type='adjustment',
                warehouse=adjustment.warehouse,
                total_quantity=total_delta,
            )
            adjustment.save(update_fields=['requires_approval'])
        except Exception:
            pass

        for item_data in items_data:
            # Validate product exists
            product = item_data.get('product')
            if not product:
                raise serializers.ValidationError({'items': 'Product is required for all items'})
            
            # Validate adjustment_quantity
            if item_data.get('adjustment_quantity') is None:
                raise serializers.ValidationError({'items': 'Adjustment quantity is required for all items'})
            
            AdjustmentItem.objects.create(adjustment=adjustment, **item_data)
        return adjustment


class StockLedgerSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    bin_code = serializers.CharField(source='bin.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = StockLedger
        fields = '__all__'


class CycleCountItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CycleCountItem
        fields = '__all__'


class CycleCountTaskSerializer(serializers.ModelSerializer):
    items = CycleCountItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = CycleCountTask
        fields = '__all__'
        read_only_fields = ('document_number', 'created_at', 'updated_at', 'completed_at', 'generated_adjustment')


class CycleCountTaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating cycle count tasks with items.

    By default the client sends an explicit list of product IDs. When
    `method="abc"` and the list is empty or omitted, the backend will
    automatically select high-value products using a simple ABC-style
    ranking so users can quickly schedule strategic cycle counts.
    """

    items = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of product IDs to include in this cycle count. When using method='abc', this may be omitted to auto-select high-value products.",
    )

    class Meta:
        model = CycleCountTask
        fields = (
            'id', 'document_number', 'status', 'warehouse', 'scheduled_date',
            'method', 'notes', 'items',
        )
        read_only_fields = ('document_number',)

    def _get_abc_product_ids_for_warehouse(self, warehouse):
        """Select a focused set of high-value products for ABC cycle counts.

        This mirrors the ABC logic in the dashboard at a high level but keeps
        the implementation local to avoid tight coupling between apps.
        """
        from decimal import Decimal
        from django.db.models import Sum, Avg
        from products.models import Product, StockItem
        from operations.models import ReceiptItem

        # Aggregate stock quantities for this warehouse only.
        stock_by_product = (
            StockItem.objects.filter(warehouse=warehouse)
            .values('product')
            .annotate(total_quantity=Sum('quantity'))
        )
        stock_dict = {row['product']: row['total_quantity'] or 0 for row in stock_by_product}

        if not stock_dict:
            return []

        products = Product.objects.filter(id__in=stock_dict.keys(), is_active=True)

        product_values = []
        for product in products:
            total_stock = stock_dict.get(product.id, 0) or 0
            if total_stock == 0:
                continue

            avg_price = (
                ReceiptItem.objects.filter(product=product)
                .aggregate(avg=Avg('unit_price'))['avg']
                or Decimal('0.00')
            )
            total_value = Decimal(total_stock) * Decimal(avg_price)
            product_values.append((product.id, total_value))

        if not product_values:
            return []

        # Sort by inventory value descending and take top 20% as "A" class.
        product_values.sort(key=lambda x: x[1], reverse=True)
        top_count = max(1, int(len(product_values) * 0.2))
        top_ids = [pid for pid, _ in product_values[:top_count]]
        return top_ids

    def create(self, validated_data):
        from products.models import StockItem
        from decimal import Decimal

        # Pop items list (may be missing or empty).
        product_ids = validated_data.pop('items', []) or []
        method = validated_data.get('method', 'full')
        warehouse = validated_data.get('warehouse')

        if method == 'partial' and not product_ids:
            raise serializers.ValidationError({'items': 'Select at least one product for partial cycle counts.'})

        # If method is "full" and the client did not send products, default to
        # all products that currently have StockItem rows in this warehouse.
        if method == 'full' and not product_ids and warehouse is not None:
            product_ids = list(
                StockItem.objects.filter(warehouse=warehouse)
                .values_list('product_id', flat=True)
                .distinct()
            )

        # If ABC-based method is selected and no explicit products were
        # provided, auto-select a focused set of high-value products for the
        # chosen warehouse.
        if method == 'abc' and not product_ids and warehouse is not None:
            product_ids = self._get_abc_product_ids_for_warehouse(warehouse)

        request = self.context.get('request')
        user = getattr(request, 'user', None)

        task = CycleCountTask.objects.create(created_by=user, **validated_data)

        if not product_ids:
            # No products to count – create an empty task that can be edited
            # later from the UI.
            return task

        stock_qs = StockItem.objects.filter(
            warehouse=task.warehouse,
            product_id__in=product_ids,
        )
        stock_map = {s.product_id: s.quantity for s in stock_qs}

        for product_id in product_ids:
            expected_qty = stock_map.get(product_id, Decimal('0.00'))
            CycleCountItem.objects.create(
                task=task,
                product_id=product_id,
                expected_quantity=expected_qty,
                counted_quantity=expected_qty,
            )

        return task


# New serializers for the missing features

class PickWaveSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    assigned_picker_name = serializers.CharField(source='assigned_picker.email', read_only=True, allow_null=True)
    delivery_order_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PickWave
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'completed_at')
    
    def get_delivery_order_count(self, obj):
        return obj.delivery_orders.count()


class PickWaveCreateSerializer(serializers.ModelSerializer):
    delivery_orders = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = PickWave
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'completed_at')
    
    def create(self, validated_data):
        delivery_order_ids = validated_data.pop('delivery_orders', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        
        pick_wave = PickWave.objects.create(created_by=user, **validated_data)
        
        if delivery_order_ids:
            from .models import DeliveryOrder
            from accounts.scoping import scope_queryset

            delivery_orders = scope_queryset(
                DeliveryOrder.objects.filter(id__in=delivery_order_ids),
                user,
                warehouse_fields=('warehouse',),
            )
            pick_wave.delivery_orders.set(delivery_orders)
        
        return pick_wave


class ApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.email', read_only=True)
    
    class Meta:
        model = Approval
        fields = '__all__'
        read_only_fields = ('approved_at', 'approver')


class DocumentCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.email', read_only=True)
    
    class Meta:
        model = DocumentComment
        fields = '__all__'
        read_only_fields = ('created_at', 'author')


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.email', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentAttachment
        fields = '__all__'
        read_only_fields = (
            'uploaded_at',
            'uploaded_by',
            'file_name',
            'file_path',
            'file_size',
            'mime_type',
        )

    def get_file_url(self, obj):
        if not obj.file_path:
            return None
        url = default_storage.url(obj.file_path)
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class SavedViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedView
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'
