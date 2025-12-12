from rest_framework import serializers
from .models import (
    Category,
    Warehouse,
    Product,
    StockItem,
    BinLocation,
    BinStockItem,
    Supplier,
    ProductSupplier,
    SupplierPerformance,
    UnitOfMeasure,
    UnitConversion,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'


class BinLocationSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)

    class Meta:
        model = BinLocation
        fields = '__all__'


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = '__all__'


class StockItemSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    available_quantity = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = StockItem
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    stock_items = StockItemSerializer(many=True, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_unit_detail = UnitOfMeasureSerializer(source='stock_unit', read_only=True)
    purchase_unit_detail = UnitOfMeasureSerializer(source='purchase_unit', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_stock = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    stock_unit_detail = UnitOfMeasureSerializer(source='stock_unit', read_only=True)
    purchase_unit_detail = UnitOfMeasureSerializer(source='purchase_unit', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'sku', 'code', 'category', 'category_name', 'stock_unit', 'purchase_unit',
                  'reorder_level', 'total_stock', 'is_low_stock', 'is_active', 'created_at',
                  'stock_unit_detail', 'purchase_unit_detail')

    def get_total_stock(self, obj):
        """Calculate total stock efficiently"""
        if hasattr(obj, 'stock_items'):
            return sum(item.quantity for item in obj.stock_items.all())
        return obj.get_total_stock()

    def get_is_low_stock(self, obj):
        """Check if low stock efficiently"""
        total_stock = self.get_total_stock(obj)
        return total_stock <= obj.reorder_level


class SupplierSerializer(serializers.ModelSerializer):
    performance = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = '__all__'
    
    def get_performance(self, obj):
        """Get supplier performance data"""
        try:
            perf = obj.performance
            return {
                'order_count': perf.order_count,
                'on_time_percentage': float(perf.on_time_percentage),
                'quality_score': float(perf.quality_score),
                'average_lead_time_days': float(perf.average_lead_time_days),
            }
        except SupplierPerformance.DoesNotExist:
            return None


class ProductSupplierSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_code = serializers.CharField(source='supplier.code', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = ProductSupplier
        fields = '__all__'


class SupplierPerformanceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    on_time_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = SupplierPerformance
        fields = '__all__'


class UnitConversionSerializer(serializers.ModelSerializer):
    from_unit_detail = UnitOfMeasureSerializer(source='from_unit', read_only=True)
    to_unit_detail = UnitOfMeasureSerializer(source='to_unit', read_only=True)

    class Meta:
        model = UnitConversion
        fields = '__all__'

