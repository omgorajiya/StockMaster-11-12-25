import statistics
from collections import defaultdict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import (
    Q,
    Count,
    Sum,
    Avg,
    F,
    DecimalField,
    Max,
    ExpressionWrapper,
    DurationField,
)
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from products.models import Product, StockItem
from operations.models import (
    Receipt,
    DeliveryOrder,
    InternalTransfer,
    StockAdjustment,
    ReceiptItem,
    DeliveryItem,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_kpis(request):
    """Get dashboard KPIs"""
    from products.models import StockItem
    from django.db.models import Sum, Q
    
    # Total Products in Stock
    total_products = Product.objects.filter(is_active=True).count()
    
    # Optimize: Use aggregation instead of iterating
    # Get all stock items grouped by product
    stock_by_product = StockItem.objects.values('product').annotate(
        total_quantity=Sum('quantity')
    )
    
    # Create a dict for quick lookup
    stock_dict = {item['product']: item['total_quantity'] for item in stock_by_product}
    
    # Low Stock / Out of Stock Items
    low_stock_count = 0
    out_of_stock_count = 0
    products = Product.objects.filter(is_active=True).select_related('category')
    
    for product in products:
        total_stock = stock_dict.get(product.id, 0)
        if total_stock == 0:
            out_of_stock_count += 1
        elif total_stock <= product.reorder_level:
            low_stock_count += 1
    
    # Pending Receipts
    pending_receipts = Receipt.objects.filter(
        status__in=['draft', 'waiting', 'ready']
    ).count()
    
    # Pending Deliveries
    pending_deliveries = DeliveryOrder.objects.filter(
        status__in=['draft', 'waiting', 'ready']
    ).count()
    
    # Internal Transfers Scheduled
    scheduled_transfers = InternalTransfer.objects.filter(
        status__in=['draft', 'waiting', 'ready']
    ).count()
    
    return Response({
        'total_products': total_products,
        'low_stock_items': low_stock_count,
        'out_of_stock_items': out_of_stock_count,
        'pending_receipts': pending_receipts,
        'pending_deliveries': pending_deliveries,
        'scheduled_transfers': scheduled_transfers,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activities(request):
    """Get recent activities"""
    limit = int(request.query_params.get('limit', 10))
    
    # Optimize: Use select_related to avoid N+1 queries
    # Get recent receipts
    recent_receipts = Receipt.objects.select_related('warehouse').order_by('-created_at')[:limit]
    receipts_data = [{
        'type': 'receipt',
        'document_number': r.document_number,
        'status': r.status,
        'warehouse': r.warehouse.name,
        'created_at': r.created_at,
    } for r in recent_receipts]
    
    # Get recent deliveries
    recent_deliveries = DeliveryOrder.objects.select_related('warehouse').order_by('-created_at')[:limit]
    deliveries_data = [{
        'type': 'delivery',
        'document_number': d.document_number,
        'status': d.status,
        'warehouse': d.warehouse.name,
        'created_at': d.created_at,
    } for d in recent_deliveries]
    
    # Get recent transfers
    recent_transfers = InternalTransfer.objects.select_related('warehouse', 'to_warehouse').order_by('-created_at')[:limit]
    transfers_data = [{
        'type': 'transfer',
        'document_number': t.document_number,
        'status': t.status,
        'from_warehouse': t.warehouse.name,
        'to_warehouse': t.to_warehouse.name,
        'created_at': t.created_at,
    } for t in recent_transfers]
    
    # Combine and sort by date
    all_activities = receipts_data + deliveries_data + transfers_data
    all_activities.sort(key=lambda x: x['created_at'], reverse=True)
    
    return Response(all_activities[:limit])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_products(request):
    """Get products with low stock"""
    from products.models import StockItem
    from django.db.models import Sum
    
    # Optimize: Use aggregation
    stock_by_product = StockItem.objects.values('product').annotate(
        total_quantity=Sum('quantity')
    )
    stock_dict = {item['product']: item['total_quantity'] for item in stock_by_product}
    
    products = Product.objects.filter(is_active=True).select_related('category')
    low_stock_products = []
    
    for product in products:
        total_stock = stock_dict.get(product.id, 0)
        if total_stock <= product.reorder_level:
            low_stock_products.append({
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'category': product.category.name if product.category else None,
                'current_stock': float(total_stock),
                'reorder_level': float(product.reorder_level),
                'reorder_quantity': float(product.reorder_quantity),
            })
    
    return Response(low_stock_products)


def _compute_abc_dataset():
    """Calculate ABC dataset reused across endpoints."""
    products = Product.objects.filter(is_active=True).select_related('category')
    stock_by_product = StockItem.objects.values('product').annotate(
        total_quantity=Sum('quantity')
    )
    stock_dict = {item['product']: item['total_quantity'] for item in stock_by_product}

    product_data = []
    for product in products:
        total_stock = stock_dict.get(product.id, 0)
        avg_price = ReceiptItem.objects.filter(
            product=product
        ).aggregate(avg=Avg('unit_price'))['avg'] or Decimal('0.00')

        total_value = Decimal(total_stock) * Decimal(avg_price)
        product_data.append({
            'product_id': product.id,
            'product_name': product.name,
            'sku': product.sku,
            'category': product.category.name if product.category else None,
            'stock_quantity': float(total_stock),
            'unit_price': float(avg_price),
            'total_value': float(total_value),
            'classification': 'C',
        })

    product_data.sort(key=lambda x: x['total_value'], reverse=True)
    total_value_sum = sum(p['total_value'] for p in product_data)
    cumulative_value = 0

    for product in product_data:
        cumulative_value += product['total_value']
        cumulative_percentage = (cumulative_value / total_value_sum * 100) if total_value_sum > 0 else 0

        if cumulative_percentage <= 80:
            product['classification'] = 'A'
        elif cumulative_percentage <= 95:
            product['classification'] = 'B'
        else:
            product['classification'] = 'C'

    summary = {
        'total_products': len(product_data),
        'total_value': float(total_value_sum),
        'class_a_count': sum(1 for p in product_data if p['classification'] == 'A'),
        'class_b_count': sum(1 for p in product_data if p['classification'] == 'B'),
        'class_c_count': sum(1 for p in product_data if p['classification'] == 'C'),
    }
    return product_data, summary


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def abc_analysis(request):
    """ABC Analysis - Pareto Principle (80/20 rule)"""
    product_data, summary = _compute_abc_dataset()
    return Response({'products': product_data, 'summary': summary})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_turnover(request):
    """Calculate Inventory Turnover Ratio.

    Optimized to avoid per-stock-item price aggregations by precomputing
    average prices and stock quantities in a small number of queries.
    """
    from products.models import StockItem
    from django.db.models import Sum, Avg
    from datetime import timedelta

    # Get date range (default: last 12 months)
    months = int(request.query_params.get('months', 12))
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months * 30)

    # Calculate COGS (Cost of Goods Sold) from deliveries
    cogs = DeliveryItem.objects.filter(
        delivery__status='done',
        delivery__completed_at__gte=start_date,
        delivery__completed_at__lte=end_date
    ).aggregate(
        total_quantity=Sum('quantity')
    )['total_quantity'] or 0

    # Precompute average unit price per product from receipts in a single query
    price_by_product = ReceiptItem.objects.values('product').annotate(
        avg_price=Avg('unit_price')
    )
    price_dict = {
        item['product']: Decimal(item['avg_price'] or 0)
        for item in price_by_product
    }

    # Precompute total stock quantity per product
    stock_by_product = StockItem.objects.values('product').annotate(
        total_quantity=Sum('quantity')
    )

    total_inventory_value = Decimal('0.00')
    for item in stock_by_product:
        product_id = item['product']
        quantity = Decimal(item['total_quantity'] or 0)
        avg_price = price_dict.get(product_id, Decimal('0.00'))
        total_inventory_value += quantity * avg_price

    # Average inventory (simplified - using current inventory)
    avg_inventory = total_inventory_value

    # Inventory Turnover Ratio = COGS / Average Inventory
    turnover_ratio = float(cogs / avg_inventory) if avg_inventory > 0 else 0

    return Response({
        'turnover_ratio': turnover_ratio,
        'cogs': float(cogs),
        'average_inventory': float(avg_inventory),
        'period_months': months,
        'start_date': start_date,
        'end_date': end_date,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    """Comprehensive analytics dashboard"""
    from products.models import StockItem
    from django.db.models import Sum, Avg, Count
    
    # ABC Analysis summary
    products = Product.objects.filter(is_active=True)
    stock_by_product = StockItem.objects.values('product').annotate(
        total_quantity=Sum('quantity')
    )
    stock_dict = {item['product']: item['total_quantity'] for item in stock_by_product}
    
    # Calculate product values
    product_values = []
    for product in products:
        total_stock = stock_dict.get(product.id, 0)
        avg_price = ReceiptItem.objects.filter(
            product=product
        ).aggregate(avg=Avg('unit_price'))['avg'] or Decimal('0.00')
        total_value = Decimal(total_stock) * Decimal(avg_price)
        product_values.append(total_value)
    
    product_values.sort(reverse=True)
    total_value = sum(product_values)
    
    # Classify products
    class_a_value = sum(product_values[:int(len(product_values) * 0.2)]) if product_values else 0
    class_b_value = sum(product_values[int(len(product_values) * 0.2):int(len(product_values) * 0.5)]) if product_values else 0
    class_c_value = sum(product_values[int(len(product_values) * 0.5):]) if product_values else 0
    
    # Inventory turnover
    months = 12
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months * 30)
    
    cogs = DeliveryItem.objects.filter(
        delivery__status='done',
        delivery__completed_at__gte=start_date,
        delivery__completed_at__lte=end_date
    ).aggregate(total=Sum('quantity'))['total'] or 0
    
    avg_inventory = sum(stock_dict.values()) if stock_dict else 1
    turnover_ratio = float(cogs / avg_inventory) if avg_inventory > 0 else 0
    
    # Dead stock (items not moved in 6+ months)
    six_months_ago = timezone.now() - timedelta(days=180)
    active_products = set(
        DeliveryItem.objects.filter(
            delivery__completed_at__gte=six_months_ago
        ).values_list('product_id', flat=True).distinct()
    )
    
    dead_stock_products = [p for p in products if p.id not in active_products]
    dead_stock_value = sum([
        float(stock_dict.get(p.id, 0)) * float(
            ReceiptItem.objects.filter(product=p).aggregate(avg=Avg('unit_price'))['avg'] or 0
        ) for p in dead_stock_products
    ])
    
    return Response({
        'abc_analysis': {
            'class_a': {
                'count': int(len(product_values) * 0.2),
                'value': float(class_a_value),
                'percentage': float((class_a_value / total_value * 100)) if total_value > 0 else 0,
            },
            'class_b': {
                'count': int(len(product_values) * 0.3),
                'value': float(class_b_value),
                'percentage': float((class_b_value / total_value * 100)) if total_value > 0 else 0,
            },
            'class_c': {
                'count': int(len(product_values) * 0.5),
                'value': float(class_c_value),
                'percentage': float((class_c_value / total_value * 100)) if total_value > 0 else 0,
            },
        },
        'inventory_turnover': {
            'ratio': turnover_ratio,
            'cogs': float(cogs),
            'average_inventory': float(avg_inventory),
        },
        'dead_stock': {
            'product_count': len(dead_stock_products),
            'total_value': dead_stock_value,
        },
        'total_inventory_value': float(total_value),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def replenishment_suggestions(request):
    """Suggest reorder quantities based on recent demand trends."""
    days = max(30, int(request.query_params.get('days', 90)))
    horizon_days = max(7, int(request.query_params.get('horizon_days', 30)))
    now = timezone.now()
    start_date = now - timedelta(days=days)

    demand_rows = (
        DeliveryItem.objects.filter(
            delivery__status='done',
            delivery__completed_at__gte=start_date,
        )
        .values('product_id', 'delivery__warehouse_id')
        .annotate(
            total_quantity=Sum('quantity'),
            last_delivery=Max('delivery__completed_at'),
        )
    )

    if not demand_rows:
        return Response({'results': [], 'count': 0})

    product_ids = {row['product_id'] for row in demand_rows}
    warehouse_ids = {row['delivery__warehouse_id'] for row in demand_rows}

    products = {
        product.id: product
        for product in Product.objects.filter(id__in=product_ids).select_related('category')
    }
    stock_items = {
        (item.product_id, item.warehouse_id): item.quantity
        for item in StockItem.objects.filter(
            product_id__in=product_ids,
            warehouse_id__in=warehouse_ids,
        )
    }

    suggestions = []
    for row in demand_rows:
        product = products.get(row['product_id'])
        if not product:
            continue

        total_quantity = Decimal(row['total_quantity'] or 0)
        avg_daily_demand = (total_quantity / Decimal(days)) if total_quantity > 0 else Decimal('0.00')
        current_stock = stock_items.get(
            (row['product_id'], row['delivery__warehouse_id']),
            Decimal('0.00'),
        )

        projected_consumption = avg_daily_demand * Decimal(horizon_days)
        suggested_quantity = max(
            Decimal(product.reorder_quantity or 0),
            projected_consumption - current_stock,
        )
        if suggested_quantity <= 0:
            continue

        days_until_stockout = float(current_stock / avg_daily_demand) if avg_daily_demand > 0 else None
        suggestions.append({
            'product_id': product.id,
            'product_name': product.name,
            'sku': product.sku,
            'warehouse_id': row['delivery__warehouse_id'],
            'current_stock': float(current_stock),
            'avg_daily_demand': float(avg_daily_demand),
            'suggested_quantity': float(suggested_quantity),
            'reorder_level': float(product.reorder_level),
            'reorder_quantity': float(product.reorder_quantity),
            'last_delivery_at': row['last_delivery'],
            'days_until_stockout': days_until_stockout,
        })

    suggestions.sort(key=lambda x: (x['days_until_stockout'] or 1e9))
    return Response({'results': suggestions, 'count': len(suggestions)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_level_metrics(request):
    """Service level + fill rate analytics per warehouse and overall."""
    sla_hours = int(request.query_params.get('sla_hours', 48))
    lookback_days = int(request.query_params.get('days', 30))
    start_date = timezone.now() - timedelta(days=lookback_days)

    deliveries = DeliveryOrder.objects.filter(created_at__gte=start_date)
    deliveries = deliveries.select_related('warehouse')

    total_deliveries = deliveries.count()
    done_deliveries = deliveries.filter(status='done', completed_at__isnull=False)

    sla_delta = timedelta(hours=sla_hours)
    on_time = done_deliveries.filter(completed_at__lte=F('created_at') + sla_delta).count()
    avg_lead_time = done_deliveries.annotate(
        lead_time=ExpressionWrapper(
            F('completed_at') - F('created_at'),
            output_field=DurationField(),
        )
    ).aggregate(avg=Avg('lead_time'))['avg']

    shipped_qty = DeliveryItem.objects.filter(delivery__status='done').aggregate(total=Sum('quantity'))['total'] or 0
    open_qty = DeliveryItem.objects.exclude(delivery__status='done').aggregate(total=Sum('quantity'))['total'] or 0
    total_requested = shipped_qty + open_qty

    per_warehouse = []
    warehouse_groups = deliveries.values('warehouse_id', 'warehouse__name').annotate(total=Count('id'))
    for group in warehouse_groups:
        warehouse_done = done_deliveries.filter(warehouse_id=group['warehouse_id'])
        warehouse_on_time = warehouse_done.filter(completed_at__lte=F('created_at') + sla_delta).count()
        per_warehouse.append({
            'warehouse_id': group['warehouse_id'],
            'warehouse_name': group['warehouse__name'],
            'total_deliveries': group['total'],
            'on_time_rate': float(warehouse_on_time / group['total']) if group['total'] else 0,
            'done_deliveries': warehouse_done.count(),
        })

    trend_rows = (
        done_deliveries
        .annotate(day=TruncDate('completed_at'))
        .values('day')
        .annotate(
            total=Count('id'),
            on_time=Count('id', filter=Q(completed_at__lte=F('created_at') + sla_delta)),
            avg_lead=Avg(
                ExpressionWrapper(
                    F('completed_at') - F('created_at'),
                    output_field=DurationField(),
                )
            ),
        )
        .order_by('day')
    )
    trend = [
        {
            'date': row['day'],
            'on_time_rate': float(row['on_time'] / row['total']) if row['total'] else 0,
            'avg_lead_time_hours': float((row['avg_lead'].total_seconds() / 3600) if row['avg_lead'] else 0),
        }
        for row in trend_rows
    ]

    overall = {
        'total_deliveries': total_deliveries,
        'completed_deliveries': done_deliveries.count(),
        'on_time_rate': float(on_time / total_deliveries) if total_deliveries else 0,
        'avg_lead_time_hours': float((avg_lead_time.total_seconds() / 3600) if avg_lead_time else 0),
        'fill_rate': float(shipped_qty / total_requested) if total_requested else 1.0,
        'shipped_units': float(shipped_qty),
        'open_units': float(open_qty),
    }

    return Response({
        'overall': overall,
        'warehouses': per_warehouse,
        'trend': trend,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def abc_xyz_analysis(request):
    """Combined ABC (value) + XYZ (demand variability) classification."""
    months = int(request.query_params.get('months', 6))
    start_date = timezone.now() - timedelta(days=months * 30)

    # ABC portion reuses inventory value weighting
    abc_products, _ = _compute_abc_dataset()
    abc_lookup = {product['product_id']: product for product in abc_products}
    abc_by_product = {pid: data['classification'] for pid, data in abc_lookup.items()}

    demand_rows = (
        DeliveryItem.objects.filter(
            delivery__status='done',
            delivery__completed_at__gte=start_date,
        )
        .annotate(month=TruncMonth('delivery__completed_at'))
        .values('product_id', 'month')
        .annotate(total=Sum('quantity'))
    )

    demand_map: dict[int, list[float]] = defaultdict(list)
    for row in demand_rows:
        demand_map[row['product_id']].append(float(row['total'] or 0))

    xyz_by_product = {}
    for product_id, series in demand_map.items():
        if not series:
            xyz_by_product[product_id] = 'Z'
            continue

        avg = sum(series) / len(series)
        if avg == 0:
            xyz_by_product[product_id] = 'Z'
            continue

        std_dev = statistics.pstdev(series)
        coefficient = std_dev / avg
        if coefficient <= 0.5:
            xyz = 'X'
        elif coefficient <= 1:
            xyz = 'Y'
        else:
            xyz = 'Z'
        xyz_by_product[product_id] = xyz

    matrix = defaultdict(lambda: {'count': 0, 'sample_products': []})
    for product_id, abc_class in abc_by_product.items():
        xyz_class = xyz_by_product.get(product_id, 'Z')
        key = f"{abc_class}{xyz_class}"
        entry = matrix[key]
        entry['count'] += 1
        if len(entry['sample_products']) < 3:
            product_meta = abc_lookup.get(product_id, {})
            entry['sample_products'].append({
                'id': product_id,
                'name': product_meta.get('product_name'),
                'sku': product_meta.get('sku'),
            })

    matrix_payload = {key: value for key, value in matrix.items()}

    return Response({
        'matrix': matrix_payload,
        'summary': {
            'total_products': len(abc_by_product),
            'months_analyzed': months,
        },
    })

