from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


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
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='suppliers')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='products')
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
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='performance_records')
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

    class Meta:
        unique_together = ['supplier']

    def __str__(self):
        return f"{self.supplier.name} Performance"

    @property
    def on_time_percentage(self):
        """Calculate on-time delivery percentage"""
        total = self.on_time_deliveries + self.late_deliveries
        if total == 0:
            return Decimal('100.00')
        return (Decimal(self.on_time_deliveries) / Decimal(total)) * Decimal('100.00')

