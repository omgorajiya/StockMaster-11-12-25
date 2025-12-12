from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Category(models.Model):
    """Product Category"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Categories'


class Warehouse(models.Model):
    """Warehouse/Location"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # Optional quarantine/returns flag for routing customer returns into a
    # dedicated location without changing existing document flows.
    is_quarantine = models.BooleanField(
        default=False,
        help_text="If enabled, customer returns can be routed into this warehouse instead of the original shipping warehouse.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class BinLocation(models.Model):
    """Physical bin/shelf location inside a warehouse (e.g. A1-01)."""

    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='bin_locations')
    code = models.CharField(max_length=50)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['warehouse', 'code']
        ordering = ['warehouse__name', 'code']

    def __str__(self):
        return f"{self.warehouse.code} - {self.code}"


class Product(models.Model):
    """Product Model"""
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    code = models.CharField(max_length=100, blank=True, null=True)
    barcode = models.CharField(max_length=200, blank=True, null=True, unique=True, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    # Optional default bin to support simple put-away strategies. When a
    # receipt is created without an explicit bin for a line item, this bin
    # will be used automatically if it belongs to the same warehouse.
    default_bin = models.ForeignKey(
        'BinLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_products',
        help_text="Preferred put-away bin for this product.",
    )
    # Units of measure support
    stock_unit = models.ForeignKey(
        'UnitOfMeasure',  # Using string reference to avoid circular import
        on_delete=models.PROTECT,
        related_name='stock_products',
        help_text="Canonical unit for stock accounting"
    )
    purchase_unit = models.ForeignKey(
        'UnitOfMeasure',  # Using string reference to avoid circular import
        on_delete=models.PROTECT,
        related_name='purchase_products',
        null=True,
        blank=True,
        help_text="Unit typically used when purchasing this product"
    )
    unit_conversion_factor = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal('1.000000'),
        help_text="How many stock_units equal one purchase_unit (if applicable)"
    )
    description = models.TextField(blank=True)
    reorder_level = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reorder_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def get_total_stock(self):
        """Get total stock across all warehouses"""
        return sum(item.quantity for item in self.stock_items.all())

    def get_stock_by_warehouse(self, warehouse):
        """Get stock for a specific warehouse"""
        try:
            return self.stock_items.get(warehouse=warehouse).quantity
        except StockItem.DoesNotExist:
            return Decimal('0.00')

    def is_low_stock(self, warehouse=None):
        """Check if product is low on stock"""
        if warehouse:
            stock = self.get_stock_by_warehouse(warehouse)
        else:
            stock = self.get_total_stock()
        return stock <= self.reorder_level


class StockItem(models.Model):
    """Stock Item - Product stock per warehouse (aggregated across bins)."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_items')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_items')
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reserved_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'warehouse']
        indexes = [
            models.Index(fields=['product', 'warehouse']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.warehouse.name}: {self.quantity}"

    def available_quantity(self):
        """Get available quantity (total - reserved)"""
        return self.quantity - self.reserved_quantity


class BinStockItem(models.Model):
    """Bin-level stock for a product inside a warehouse.

    This provides finer-grained visibility for put-away and picking strategies
    while StockItem continues to represent the warehouse-level aggregate.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='bin_stock_items')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='bin_stock_items')
    bin = models.ForeignKey(BinLocation, on_delete=models.CASCADE, related_name='bin_stock_items')
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    reserved_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'warehouse', 'bin']
        indexes = [
            models.Index(fields=['product', 'warehouse', 'bin']),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.warehouse.code}/{self.bin.code}: {self.quantity}"


class Supplier(models.Model):
    """Supplier/Vendor Model"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)  # e.g., "Net 30", "COD"
    lead_time_days = models.IntegerField(default=7, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        ordering = ['name']


class ProductSupplier(models.Model):
    """Many-to-many relationship between Product and Supplier with pricing"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_suppliers')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='supplier_products')
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    minimum_order_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    is_preferred = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['product', 'supplier']
        ordering = ['-is_preferred', 'unit_price']

    def __str__(self):
        return f"{self.product.name} - {self.supplier.name} @ {self.unit_price}"


class SupplierPerformance(models.Model):
    """Track supplier performance metrics"""
    supplier = models.OneToOneField(Supplier, on_delete=models.CASCADE, related_name='performance')
    order_count = models.IntegerField(default=0)
    total_orders_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    on_time_deliveries = models.IntegerField(default=0)
    late_deliveries = models.IntegerField(default=0)
    quality_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )  # 0-100
    average_lead_time_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    last_order_date = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.supplier.name} Performance"

    @property
    def on_time_percentage(self):
        """Calculate on-time delivery percentage"""
        total = self.on_time_deliveries + self.late_deliveries
        if total == 0:
            return Decimal('100.00')
        return (Decimal(self.on_time_deliveries) / Decimal(total)) * Decimal('100.00')


class UnitOfMeasure(models.Model):
    """Unit of measure for products (e.g., pieces, kilograms, liters)"""
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Unit of Measure'
        verbose_name_plural = 'Units of Measure'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class UnitConversion(models.Model):
    """Conversion factors between different units of measure"""
    from_unit = models.ForeignKey(UnitOfMeasure, on_delete=models.CASCADE, related_name='conversions_from')
    to_unit = models.ForeignKey(UnitOfMeasure, on_delete=models.CASCADE, related_name='conversions_to')
    conversion_factor = models.DecimalField(
        max_digits=10, 
        decimal_places=6,
        help_text="How many 'to_unit' units equal one 'from_unit' unit"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['from_unit', 'to_unit']
        ordering = ['from_unit__name']
    
    def __str__(self):
        return f"{self.from_unit.name} → {self.to_unit.name} ({self.conversion_factor})"


# Enhanced Product model with unit of measure support
# We'll modify the Product model to support purchase_unit vs stock_unit
