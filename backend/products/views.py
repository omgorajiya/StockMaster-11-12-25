from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
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
from .serializers import (
    CategorySerializer,
    WarehouseSerializer,
    BinLocationSerializer,
    ProductSerializer,
    ProductListSerializer,
    StockItemSerializer,
    SupplierSerializer,
    ProductSupplierSerializer,
    SupplierPerformanceSerializer,
    UnitOfMeasureSerializer,
    UnitConversionSerializer,
)
import qrcode
import io
from django.http import HttpResponse


class CategoryViewSet(viewsets.ModelViewSet):
    """Category CRUD operations"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']


class WarehouseViewSet(viewsets.ModelViewSet):
    """Warehouse CRUD operations"""
    queryset = Warehouse.objects.filter(is_active=True)
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']


class BinLocationViewSet(viewsets.ModelViewSet):
    """Bin location CRUD operations per warehouse"""

    queryset = BinLocation.objects.select_related('warehouse')
    serializer_class = BinLocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['warehouse', 'is_active']
    search_fields = ['code', 'description', 'warehouse__name', 'warehouse__code']
    ordering_fields = ['warehouse__name', 'code', 'created_at']


class ProductViewSet(viewsets.ModelViewSet):
    """Product CRUD operations"""
    queryset = Product.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'sku', 'code']
    ordering_fields = ['name', 'sku', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Optimize: Only calculate stock for list view if needed
        # For detail view, these are calculated in serializer
        if self.action == 'list':
            # Prefetch related stock items for better performance
            queryset = queryset.prefetch_related('stock_items')
        return queryset

    @action(detail=True, methods=['get'])
    def stock_by_warehouse(self, request, pk=None):
        """Get stock for a product by warehouse"""
        product = self.get_object()
        warehouse_id = request.query_params.get('warehouse_id')
        
        if warehouse_id:
            try:
                warehouse = Warehouse.objects.get(id=warehouse_id)
                # Get the actual StockItem object for full details
                try:
                    stock_item = StockItem.objects.get(product=product, warehouse=warehouse)
                    serializer = StockItemSerializer(stock_item)
                    return Response(serializer.data)
                except StockItem.DoesNotExist:
                    # Return empty stock item structure
                    return Response({
                        'product': product.id,
                        'warehouse': warehouse.id,
                        'quantity': '0.00',
                        'reserved_quantity': '0.00',
                        'available_quantity': '0.00'
                })
            except Warehouse.DoesNotExist:
                return Response({'error': 'Warehouse not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Return stock for all warehouses
        stock_items = StockItem.objects.filter(product=product)
        serializer = StockItemSerializer(stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get all products with low stock.

        Optimized to avoid per-product stock queries by aggregating StockItem
        quantities and applying low-stock logic in a single pass, similar to
        the dashboard low-stock endpoint.
        """
        from django.db.models import Sum

        # Aggregate total stock per product in a single query
        stock_by_product = StockItem.objects.values('product').annotate(
            total_quantity=Sum('quantity')
        )
        stock_dict = {item['product']: item['total_quantity'] for item in stock_by_product}

        # Evaluate low-stock condition using aggregated quantities
        products = Product.objects.filter(is_active=True).select_related('category')
        low_stock_products = [
            product
            for product in products
            if stock_dict.get(product.id, 0) <= product.reorder_level
        ]

        serializer = ProductListSerializer(low_stock_products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Generate QR code for product"""
        product = self.get_object()
        
        # Use SKU or barcode as QR code data
        qr_data = product.barcode if product.barcode else product.sku
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to response
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        response = HttpResponse(buffer.read(), content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="qr_{product.sku}.png"'
        return response

    @action(detail=True, methods=['post'])
    def generate_barcode(self, request, pk=None):
        """Generate and assign barcode to product"""
        product = self.get_object()
        
        if not product.barcode:
            # Generate barcode from SKU
            import uuid
            product.barcode = str(uuid.uuid4())[:13]  # EAN-13 format
            product.save()
        
        return Response({
            'success': True,
            'barcode': product.barcode,
            'message': 'Barcode generated successfully'
        })

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Lookup product by barcode or SKU for scanner-assisted flows."""
        barcode = request.query_params.get('barcode')
        sku = request.query_params.get('sku')

        if not barcode and not sku:
            return Response({'error': 'barcode or sku parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if barcode:
                product = Product.objects.get(barcode=barcode)
            else:
                product = Product.objects.get(sku=sku)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductSerializer(product)
        return Response(serializer.data)


class StockItemViewSet(viewsets.ModelViewSet):
    """Stock Item CRUD operations"""
    queryset = StockItem.objects.all()
    serializer_class = StockItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['product', 'warehouse']
    search_fields = ['product__name', 'product__sku', 'warehouse__name']


class SupplierViewSet(viewsets.ModelViewSet):
    """Supplier CRUD operations"""
    queryset = Supplier.objects.filter(is_active=True)
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products supplied by this supplier"""
        supplier = self.get_object()
        product_suppliers = ProductSupplier.objects.filter(supplier=supplier)
        serializer = ProductSupplierSerializer(product_suppliers, many=True)
        return Response(serializer.data)


class ProductSupplierViewSet(viewsets.ModelViewSet):
    """Product-Supplier relationship management"""
    queryset = ProductSupplier.objects.all()
    serializer_class = ProductSupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['product', 'supplier', 'is_preferred']
    search_fields = ['product__name', 'product__sku', 'supplier__name']

    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Get all suppliers for a product"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        product_suppliers = ProductSupplier.objects.filter(product_id=product_id)
        serializer = self.get_serializer(product_suppliers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def best_supplier(self, request):
        """Get best supplier for a product (preferred or cheapest)"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get preferred supplier first, else cheapest
        preferred = ProductSupplier.objects.filter(
            product_id=product_id,
            is_preferred=True
        ).first()
        
        if preferred:
            serializer = self.get_serializer(preferred)
            return Response(serializer.data)
        
        # Get cheapest supplier
        cheapest = ProductSupplier.objects.filter(
            product_id=product_id
        ).order_by('unit_price').first()
        
        if cheapest:
            serializer = self.get_serializer(cheapest)
            return Response(serializer.data)
        
        return Response({'error': 'No suppliers found for this product'}, status=status.HTTP_404_NOT_FOUND)


class SupplierPerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    """Supplier performance metrics"""
    queryset = SupplierPerformance.objects.all()
    serializer_class = SupplierPerformanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['quality_score', 'on_time_percentage', 'average_lead_time_days']


class UnitOfMeasureViewSet(viewsets.ModelViewSet):
    """Unit of measure CRUD"""
    queryset = UnitOfMeasure.objects.filter(is_active=True)
    serializer_class = UnitOfMeasureSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'created_at']


class UnitConversionViewSet(viewsets.ModelViewSet):
    """Manage unit conversion ratios."""
    queryset = UnitConversion.objects.filter(is_active=True)
    serializer_class = UnitConversionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['from_unit__name', 'to_unit__name']
    ordering_fields = ['from_unit__name', 'to_unit__name', 'conversion_factor']

