from django.contrib import admin
from .models import (
    Receipt, ReceiptItem,
    DeliveryOrder, DeliveryItem,
    InternalTransfer, TransferItem,
    StockAdjustment, AdjustmentItem,
    StockLedger
)


class ReceiptItemInline(admin.TabularInline):
    model = ReceiptItem
    extra = 1


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('document_number', 'supplier', 'warehouse', 'status', 'created_at')
    list_filter = ('status', 'warehouse', 'created_at')
    search_fields = ('document_number', 'supplier')
    inlines = [ReceiptItemInline]


class DeliveryItemInline(admin.TabularInline):
    model = DeliveryItem
    extra = 1


@admin.register(DeliveryOrder)
class DeliveryOrderAdmin(admin.ModelAdmin):
    list_display = ('document_number', 'customer', 'warehouse', 'status', 'created_at')
    list_filter = ('status', 'warehouse', 'created_at')
    search_fields = ('document_number', 'customer')
    inlines = [DeliveryItemInline]


class TransferItemInline(admin.TabularInline):
    model = TransferItem
    extra = 1


@admin.register(InternalTransfer)
class InternalTransferAdmin(admin.ModelAdmin):
    list_display = ('document_number', 'warehouse', 'to_warehouse', 'status', 'created_at')
    list_filter = ('status', 'warehouse', 'to_warehouse', 'created_at')
    search_fields = ('document_number',)
    inlines = [TransferItemInline]


class AdjustmentItemInline(admin.TabularInline):
    model = AdjustmentItem
    extra = 1


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('document_number', 'warehouse', 'adjustment_type', 'status', 'created_at')
    list_filter = ('status', 'adjustment_type', 'warehouse', 'created_at')
    search_fields = ('document_number', 'reason')
    inlines = [AdjustmentItemInline]


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ('product', 'warehouse', 'transaction_type', 'quantity', 'balance_after', 'created_at')
    list_filter = ('transaction_type', 'warehouse', 'created_at')
    search_fields = ('product__name', 'product__sku', 'document_number')
    readonly_fields = ('created_at',)

