from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    WarehouseViewSet,
    BinLocationViewSet,
    ProductViewSet,
    StockItemViewSet,
    SupplierViewSet,
    ProductSupplierViewSet,
    SupplierPerformanceViewSet,
    UnitOfMeasureViewSet,
    UnitConversionViewSet,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'warehouses', WarehouseViewSet)
router.register(r'bin-locations', BinLocationViewSet)
router.register(r'products', ProductViewSet)
router.register(r'stock-items', StockItemViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'product-suppliers', ProductSupplierViewSet)
router.register(r'supplier-performance', SupplierPerformanceViewSet)
router.register(r'units', UnitOfMeasureViewSet)
router.register(r'unit-conversions', UnitConversionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

