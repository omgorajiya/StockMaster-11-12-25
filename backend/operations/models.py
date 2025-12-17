from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from products.models import Product, Warehouse, StockItem, BinLocation, BinStockItem
from accounts.models import User

UNIT_OF_MEASURE_CHOICES = [
    ('stock', 'Stock Unit'),
    ('purchase', 'Purchase Unit'),
]


class BaseDocument(models.Model):
    """Base class for all inventory documents"""
    DOCUMENT_STATUS = [
        ('draft', 'Draft'),
        ('waiting', 'Waiting'),
        ('ready', 'Ready'),
        ('done', 'Done'),
        ('canceled', 'Canceled'),
    ]

    document_number = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=DOCUMENT_STATUS, default='draft')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='%(class)s_documents')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='%(class)s_created')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Approval workflow fields
    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='%(class)s_approvals'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.__class__.__name__} - {self.document_number}"
        
    def is_approved(self):
        """Check if document is approved"""
        return self.approved_by is not None and self.approved_at is not None
        
    def approval_document_type(self) -> str:
        """Canonical document_type used in Approval/Comment/Attachment models."""
        cls_name = self.__class__.__name__
        mapping = {
            'Receipt': 'receipt',
            'DeliveryOrder': 'delivery',
            'ReturnOrder': 'return',
            'InternalTransfer': 'transfer',
            'StockAdjustment': 'adjustment',
            'CycleCountTask': 'cycle_count',
        }
        return mapping.get(cls_name, cls_name.lower())

    def approve(self, user, notes=''):
        """Approve the document.

        RBAC: only inventory_manager/admin can approve.
        """
        if self.is_approved():
            return False, "Document is already approved"

        if not getattr(user, 'is_authenticated', False) or getattr(user, 'role', None) not in ['admin', 'inventory_manager']:
            return False, "You are not allowed to approve this document"

        self.approved_by = user
        self.approved_at = timezone.now()

        # Create approval record
        Approval.objects.create(
            document_type=self.approval_document_type(),
            document_id=self.id,
            approver=user,
            notes=notes
        )

        self.save(update_fields=['approved_by', 'approved_at'])
        return True, "Document approved successfully"
        
    def can_transition_to_ready(self):
        """Check if document can be transitioned to ready status"""
        if not self.requires_approval:
            return True
        return self.is_approved()


class ApprovalPolicy(models.Model):
    """Configurable policy deciding when documents require approval.

    This is intentionally lightweight: it provides a threshold-based switch to
    require approvals on high-impact operations.
    """

    DOCUMENT_TYPES = [
        ('receipt', 'Receipt'),
        ('delivery', 'Delivery Order'),
        ('return', 'Return Order'),
        ('transfer', 'Internal Transfer'),
        ('adjustment', 'Stock Adjustment'),
        ('cycle_count', 'Cycle Count'),
    ]

    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, null=True, blank=True)

    # If set, approval is required when the computed quantity/variance meets or exceeds this.
    # If null, approval is always required for matching docs.
    threshold_total_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document_type', '-created_at']

    def __str__(self):
        scope = f"warehouse={self.warehouse.code}" if self.warehouse_id else "global"
        return f"ApprovalPolicy({self.document_type}, {scope})"


class Receipt(BaseDocument):
    """Receipt - Incoming stock from vendors"""
    supplier = models.CharField(max_length=200)
    supplier_reference = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_receipt = Receipt.objects.order_by('-id').first()
            num = (last_receipt.id if last_receipt else 0) + 1
            self.document_number = f"REC-{num:06d}"
        super().save(*args, **kwargs)

    def validate_and_complete(self):
        """Validate receipt and update stock"""
        if self.status != 'ready':
            return False, "Receipt must be in 'ready' status"
            
        # Check approval requirement
        if not self.can_transition_to_ready():
            return False, "Receipt requires approval before completion"
        
        # Update stock for each item
        for item in self.items.all():
            # Optional bin-level validation: bin must belong to the same warehouse
            if item.bin is not None and item.bin.warehouse_id != self.warehouse_id:
                return False, f"Bin {item.bin.code} does not belong to warehouse {self.warehouse.name}"

            received_qty = item.stock_quantity()

            stock_item, created = StockItem.objects.get_or_create(
                product=item.product,
                warehouse=self.warehouse,
                defaults={'quantity': Decimal('0.00')}
            )
            stock_item.quantity += received_qty
            stock_item.save()

            # Optional bin-level put-away
            if item.bin is not None:
                bin_stock, _ = BinStockItem.objects.get_or_create(
                    product=item.product,
                    warehouse=self.warehouse,
                    bin=item.bin,
                    defaults={'quantity': Decimal('0.00'), 'reserved_quantity': Decimal('0.00')},
                )
                bin_stock.quantity += received_qty
                bin_stock.save()
        
        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()
        return True, "Receipt completed successfully"


class ReceiptItem(models.Model):
    """Receipt Item"""
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    bin = models.ForeignKey(
        BinLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Optional bin where stock is put away",
    )
    quantity_ordered = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    quantity_received = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    unit_of_measure = models.CharField(
        max_length=20,
        choices=UNIT_OF_MEASURE_CHOICES,
        default='stock',
        help_text="Indicates whether the received quantity is expressed in stock or purchase units.",
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.receipt.document_number} - {self.product.name}"

    def stock_quantity(self) -> Decimal:
        """Return received quantity expressed in stock units."""
        factor = self.product.unit_conversion_factor or Decimal('1.0')
        if self.unit_of_measure == 'purchase':
            return self.quantity_received * factor
        return self.quantity_received


class DeliveryOrder(BaseDocument):
    """Delivery Order - Outgoing stock to customers"""
    customer = models.CharField(max_length=200)
    customer_reference = models.CharField(max_length=100, blank=True)
    shipping_address = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_delivery = DeliveryOrder.objects.order_by('-id').first()
            num = (last_delivery.id if last_delivery else 0) + 1
            self.document_number = f"DEL-{num:06d}"
        super().save(*args, **kwargs)

    def validate_and_complete(self):
        """Validate delivery and update stock"""
        if self.status != 'ready':
            return False, "Delivery must be in 'ready' status"
            
        # Check approval requirement
        if not self.can_transition_to_ready():
            return False, "Delivery requires approval before completion"
        
        # Check stock availability and update
        for item in self.items.all():
            # Optional bin-level validation: bin must belong to the same warehouse
            if item.bin is not None and item.bin.warehouse_id != self.warehouse_id:
                return False, f"Bin {item.bin.code} does not belong to warehouse {self.warehouse.name}"

            requested_quantity = item.stock_quantity()

            # Use get_or_create to handle cases where StockItem doesn't exist yet
            # If it doesn't exist, it means there's 0 stock, which we'll handle below
            stock_item, created = StockItem.objects.get_or_create(
                product=item.product,
                warehouse=self.warehouse,
                defaults={'quantity': Decimal('0.00'), 'reserved_quantity': Decimal('0.00')}
            )
            
            # Check if we have enough available stock
            available_qty = stock_item.available_quantity()
            if available_qty < requested_quantity:
                if created or stock_item.quantity == Decimal('0.00'):
                    return False, f"No stock available for {item.product.name} in {self.warehouse.name}. Current stock: 0, Required: {requested_quantity}"
                else:
                    return False, f"Insufficient stock for {item.product.name} in {self.warehouse.name}. Available: {available_qty}, Required: {requested_quantity}"
            
            stock_item.quantity -= requested_quantity
            stock_item.save()

            # Optional bin-level picking
            if item.bin is not None:
                try:
                    bin_stock = BinStockItem.objects.get(
                        product=item.product,
                        warehouse=self.warehouse,
                        bin=item.bin,
                    )
                    bin_stock.quantity -= requested_quantity
                    bin_stock.save()
                except BinStockItem.DoesNotExist:
                    # If no bin record exists, we skip without failing delivery.
                    pass
        
        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()
        return True, "Delivery completed successfully"


class DeliveryItem(models.Model):
    """Delivery Item"""
    delivery = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    bin = models.ForeignKey(
        BinLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Optional bin from which stock is picked",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_of_measure = models.CharField(
        max_length=20,
        choices=UNIT_OF_MEASURE_CHOICES,
        default='stock',
        help_text="Indicates whether the shipped quantity is expressed in stock or purchase units.",
    )

    def __str__(self):
        return f"{self.delivery.document_number} - {self.product.name}"

    def stock_quantity(self) -> Decimal:
        """Return shipped quantity expressed in stock units."""
        factor = self.product.unit_conversion_factor or Decimal('1.0')
        if self.unit_of_measure == 'purchase':
            return self.quantity * factor
        return self.quantity


class ReturnOrder(BaseDocument):
    """Customer return (RMA) linked to a delivery order."""

    DISPOSITION_CHOICES = [
        ('restock', 'Restock'),
        ('scrap', 'Scrap'),
        ('repair', 'Repair'),
    ]

    delivery_order = models.ForeignKey(
        DeliveryOrder,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='return_orders',
    )
    reason = models.CharField(max_length=255, blank=True)
    disposition = models.CharField(max_length=20, choices=DISPOSITION_CHOICES, default='restock')

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_return = ReturnOrder.objects.order_by('-id').first()
            num = (last_return.id if last_return else 0) + 1
            self.document_number = f"RET-{num:06d}"
        super().save(*args, **kwargs)

    def _get_target_warehouse_for_stock(self):
        """Decide where returned stock should land.

        If a quarantine warehouse is configured, use it; otherwise fall back to
        the document warehouse so existing behaviour is preserved.
        """
        from products.models import Warehouse as ProductWarehouse

        quarantine = ProductWarehouse.objects.filter(is_active=True, is_quarantine=True).first()
        return quarantine or self.warehouse

    def validate_and_complete(self):
        """Validate return and adjust stock appropriately."""
        if self.status != 'ready':
            return False, "Return must be in 'ready' status"
            
        # Check approval requirement
        if not self.can_transition_to_ready():
            return False, "Return requires approval before completion"

        target_warehouse = self._get_target_warehouse_for_stock()

        # For restock/repair we add stock back into the target warehouse.
        # For scrap we do not change stock (assume discarded), but still log in ledger.
        for item in self.items.all():
            if self.disposition in ['restock', 'repair']:
                stock_item, _ = StockItem.objects.get_or_create(
                    product=item.product,
                    warehouse=target_warehouse,
                    defaults={'quantity': Decimal('0.00')},
                )
                stock_item.quantity += item.quantity
                stock_item.save()

        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()
        return True, "Return processed successfully"


class ReturnItem(models.Model):
    """Line item within a customer return."""
    return_order = models.ForeignKey(ReturnOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    reason_code = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.return_order.document_number} - {self.product.name}"


class InternalTransfer(BaseDocument):
    """Internal Transfer - Move stock between warehouses"""
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='transfers_to')

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_transfer = InternalTransfer.objects.order_by('-id').first()
            num = (last_transfer.id if last_transfer else 0) + 1
            self.document_number = f"TRF-{num:06d}"
        super().save(*args, **kwargs)

    def validate_and_complete(self):
        """Validate transfer and move stock"""
        if self.status != 'ready':
            return False, "Transfer must be in 'ready' status"
            
        # Check approval requirement
        if not self.can_transition_to_ready():
            return False, "Transfer requires approval before completion"
            
        if self.warehouse == self.to_warehouse:
            return False, "Source and destination warehouses cannot be the same"
        
        # Move stock
        for item in self.items.all():
            # Optional bin-level validation: destination bin must belong to the destination warehouse
            if item.bin is not None and item.bin.warehouse_id != self.to_warehouse_id:
                return False, f"Bin {item.bin.code} does not belong to destination warehouse {self.to_warehouse.name}"

            transfer_qty = item.stock_quantity()

            # Decrease from source warehouse (warehouse-level aggregate only)
            # Use get_or_create to handle cases where StockItem doesn't exist yet
            from_stock, created = StockItem.objects.get_or_create(
                product=item.product,
                warehouse=self.warehouse,
                defaults={'quantity': Decimal('0.00'), 'reserved_quantity': Decimal('0.00')}
            )
            
            # Check if we have enough available stock
            available_qty = from_stock.available_quantity()
            if available_qty < transfer_qty:
                if created or from_stock.quantity == Decimal('0.00'):
                    return False, f"No stock available for {item.product.name} in source warehouse {self.warehouse.name}. Current stock: 0, Required: {transfer_qty}"
                else:
                    return False, f"Insufficient stock for {item.product.name} in source warehouse {self.warehouse.name}. Available: {available_qty}, Required: {transfer_qty}"
            
            from_stock.quantity -= transfer_qty
            from_stock.save()
            
            # Increase in destination warehouse
            to_stock, created = StockItem.objects.get_or_create(
                product=item.product,
                warehouse=self.to_warehouse,
                defaults={'quantity': Decimal('0.00')}
            )
            to_stock.quantity += transfer_qty
            to_stock.save()

            # Optional bin-level put-away in destination warehouse
            if item.bin is not None:
                to_bin_stock, _ = BinStockItem.objects.get_or_create(
                    product=item.product,
                    warehouse=self.to_warehouse,
                    bin=item.bin,
                    defaults={'quantity': Decimal('0.00'), 'reserved_quantity': Decimal('0.00')},
                )
                to_bin_stock.quantity += transfer_qty
                to_bin_stock.save()
        
        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()
        return True, "Transfer completed successfully"


class TransferItem(models.Model):
    """Transfer Item"""
    transfer = models.ForeignKey(InternalTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    bin = models.ForeignKey(
        BinLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Destination bin in the target warehouse (optional)",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_of_measure = models.CharField(
        max_length=20,
        choices=UNIT_OF_MEASURE_CHOICES,
        default='stock',
        help_text="Indicates whether the transfer quantity is expressed in stock or purchase units.",
    )

    def __str__(self):
        return f"{self.transfer.document_number} - {self.product.name}"

    def stock_quantity(self) -> Decimal:
        """Return shipped quantity expressed in stock units."""
        factor = self.product.unit_conversion_factor or Decimal('1.0')
        if self.unit_of_measure == 'purchase':
            return self.quantity * factor
        return self.quantity


class StockAdjustment(BaseDocument):
    """Stock Adjustment - Fix inventory discrepancies"""
    reason = models.CharField(max_length=200)
    adjustment_type = models.CharField(
        max_length=20,
        choices=[
            ('increase', 'Increase'),
            ('decrease', 'Decrease'),
            ('set', 'Set to Value'),
        ],
        default='set'
    )

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_adjustment = StockAdjustment.objects.order_by('-id').first()
            num = (last_adjustment.id if last_adjustment else 0) + 1
            self.document_number = f"ADJ-{num:06d}"
        super().save(*args, **kwargs)

    def validate_and_complete(self):
        """Validate adjustment and update stock"""
        if self.status != 'ready':
            return False, "Adjustment must be in 'ready' status"
            
        # Check approval requirement
        if not self.can_transition_to_ready():
            return False, "Adjustment requires approval before completion"
        
        # Apply adjustments
        for item in self.items.all():
            stock_item, created = StockItem.objects.get_or_create(
                product=item.product,
                warehouse=self.warehouse,
                defaults={'quantity': Decimal('0.00')}
            )
            
            if self.adjustment_type == 'increase':
                stock_item.quantity += item.adjustment_quantity
            elif self.adjustment_type == 'decrease':
                stock_item.quantity = max(Decimal('0.00'), stock_item.quantity - item.adjustment_quantity)
            else:  # set
                stock_item.quantity = item.adjustment_quantity
            
            stock_item.save()
        
        self.status = 'done'
        self.completed_at = timezone.now()
        self.save()
        return True, "Adjustment completed successfully"


class AdjustmentItem(models.Model):
    """Adjustment Item"""
    adjustment = models.ForeignKey(StockAdjustment, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    current_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    adjustment_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reason = models.TextField(blank=True)

    def __str__(self):
        return f"{self.adjustment.document_number} - {self.product.name}"


class StockLedger(models.Model):
    """Stock Ledger - Audit trail for all stock movements"""
    TRANSACTION_TYPES = [
        ('receipt', 'Receipt'),
        ('delivery', 'Delivery'),
        ('transfer_out', 'Transfer Out'),
        ('transfer_in', 'Transfer In'),
        ('adjustment', 'Adjustment'),
        ('return', 'Customer Return'),
    ]

    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT)
    bin = models.ForeignKey(BinLocation, on_delete=models.PROTECT, null=True, blank=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    document_number = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'warehouse', '-created_at']),
            models.Index(fields=['document_number']),
        ]

    def __str__(self):
        return f"{self.transaction_type} - {self.product.name} - {self.quantity}"


class CycleCountTask(BaseDocument):
    """Cycle count task for physical inventory counting."""
    METHOD_CHOICES = [
        ('full', 'Full Count'),
        ('partial', 'Partial Count'),
        ('abc', 'ABC-Based Count'),
    ]

    scheduled_date = models.DateField(null=True, blank=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='full')
    generated_adjustment = models.OneToOneField(
        StockAdjustment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cycle_count_task',
    )

    def save(self, *args, **kwargs):
        if not self.document_number:
            last_task = CycleCountTask.objects.order_by('-id').first()
            num = (last_task.id if last_task else 0) + 1
            self.document_number = f"CC-{num:06d}"
        super().save(*args, **kwargs)


class CycleCountItem(models.Model):
    """Line item within a cycle count task."""
    task = models.ForeignKey(CycleCountTask, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    expected_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    counted_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    class Meta:
        unique_together = ['task', 'product']

    def __str__(self):
        return f"{self.task.document_number} - {self.product.name}"

    @property
    def variance(self) -> Decimal:
        """Difference between counted and expected quantities."""
        return self.counted_quantity - self.expected_quantity


class PickWave(models.Model):
    """Pick wave for grouping multiple delivery orders for batch picking."""
    
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('picking', 'Picking'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
    ]
    
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='pick_waves')
    delivery_orders = models.ManyToManyField(DeliveryOrder, related_name='pick_waves', blank=True)
    assigned_picker = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_pick_waves'
    )
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_pick_waves')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Pick Wave {self.name} ({self.status})"
    
    def start_picking(self):
        """Start the picking process for this wave."""
        if self.status != 'planned':
            return False, "Wave must be in planned status to start picking"
        
        self.status = 'picking'
        self.save(update_fields=['status'])
        return True, "Picking started successfully"
    
    def complete_picking(self):
        """Complete the picking process for this wave."""
        if self.status != 'picking':
            return False, "Wave must be in picking status to complete"
        
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
        return True, "Picking completed successfully"


# Approval, DocumentComment, DocumentAttachment, SavedView models will be added here

class Approval(models.Model):
    """Generic approval model for documents"""
    DOCUMENT_TYPES = [
        ('receipt', 'Receipt'),
        ('delivery', 'Delivery Order'),
        ('return', 'Return Order'),
        ('transfer', 'Internal Transfer'),
        ('adjustment', 'Stock Adjustment'),
        # Backwards-compatible aliases (older code used model class names)
        ('deliveryorder', 'Delivery Order (legacy)'),
        ('returnorder', 'Return Order (legacy)'),
        ('internaltransfer', 'Internal Transfer (legacy)'),
        ('stockadjustment', 'Stock Adjustment (legacy)'),
    ]
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    document_id = models.PositiveIntegerField()
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approvals_given')
    approved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['document_type', 'document_id']
        ordering = ['-approved_at']
    
    def __str__(self):
        return f"Approval for {self.document_type} #{self.document_id}"


class DocumentComment(models.Model):
    """Generic comments for documents"""
    document_type = models.CharField(max_length=20)  # Matches BaseDocument subclasses
    document_id = models.PositiveIntegerField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_comments')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['document_type', 'document_id']),
        ]
    
    def __str__(self):
        return f"Comment on {self.document_type} #{self.document_id}"


class DocumentAttachment(models.Model):
    """Generic attachments for documents"""
    document_type = models.CharField(max_length=20)  # Matches BaseDocument subclasses
    document_id = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_attachments')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)  # Path or URL to the file
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['document_type', 'document_id']),
        ]
    
    def __str__(self):
        return f"Attachment for {self.document_type} #{self.document_id}: {self.file_name}"


class SavedView(models.Model):
    """Saved views/filters for list pages"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_views')
    page_key = models.CharField(max_length=50)  # e.g., 'receipts', 'products'
    name = models.CharField(max_length=100)
    filters = models.JSONField()  # Serialized filter parameters
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'page_key', 'name']
        ordering = ['page_key', 'name']
    
    def __str__(self):
        return f"{self.user.username}'s {self.page_key} view: {self.name}"


class AuditLog(models.Model):
    """Audit log for critical actions (documents + admin access changes)."""

    ACTION_CHOICES = [
        ('validation', 'Validation'),
        ('status_change', 'Status Change'),
        ('approval', 'Approval'),
        ('update', 'Update'),
        ('comment', 'Comment'),
        ('access_change', 'Access Change'),
    ]

    document_type = models.CharField(max_length=50)
    document_id = models.PositiveIntegerField()
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)

    # Optional warehouse context to enable warehouse-scoped audit review.
    warehouse = models.ForeignKey(Warehouse, null=True, blank=True, on_delete=models.SET_NULL)

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    message = models.CharField(max_length=255, blank=True)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['document_type', 'document_id']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.document_type}#{self.document_id} - {self.action}"
