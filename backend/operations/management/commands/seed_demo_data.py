from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone
from datetime import date, timedelta

from products.models import Category, Warehouse, Product, StockItem, Supplier, UnitOfMeasure
from operations.models import (
    Receipt, ReceiptItem, DeliveryOrder, DeliveryItem, InternalTransfer, TransferItem,
    StockAdjustment, AdjustmentItem, ReturnOrder, ReturnItem, CycleCountTask, CycleCountItem,
    PickWave, StockLedger, AuditLog
)


class Command(BaseCommand):
    help = "Seed demo data for StockMaster (users, master data, stock levels, and a few operations)"

    def handle(self, *args, **options):
        User = get_user_model()

        # 1) Demo user
        demo_user, created = User.objects.get_or_create(
            email="demo@stockmaster.com",
            defaults={
                "username": "demo",
                "role": "inventory_manager",
            },
        )
        if created or not demo_user.has_usable_password():
            demo_user.set_password("Demo1234!")
            demo_user.is_staff = True
            demo_user.is_superuser = True
            demo_user.save()
        self.stdout.write(self.style.SUCCESS("Created/updated demo user demo@stockmaster.com / Demo1234!"))

        # 2) Categories
        electronics, _ = Category.objects.get_or_create(
            name="Electronics",
            defaults={"description": "Electronic finished goods"},
        )
        raw, _ = Category.objects.get_or_create(
            name="Raw Materials",
            defaults={"description": "Raw materials"},
        )
        spares, _ = Category.objects.get_or_create(
            name="Spare Parts",
            defaults={"description": "Maintenance and critical spare parts"},
        )
        packaging, _ = Category.objects.get_or_create(
            name="Packaging Supplies",
            defaults={"description": "Cartons, mailers, and inserts"},
        )

        # 3) Units of measure
        pcs_uom, _ = UnitOfMeasure.objects.get_or_create(
            code="PCS",
            defaults={"name": "Pieces", "description": "Individual units"},
        )
        kg_uom, _ = UnitOfMeasure.objects.get_or_create(
            code="KG",
            defaults={"name": "Kilograms", "description": "Weight in kilograms"},
        )
        box_uom, _ = UnitOfMeasure.objects.get_or_create(
            code="BOX",
            defaults={"name": "Boxes", "description": "Standard carton"},
        )
        kit_uom, _ = UnitOfMeasure.objects.get_or_create(
            code="KIT",
            defaults={"name": "Kits", "description": "Pre-packaged maintenance kits"},
        )
        pack_uom, _ = UnitOfMeasure.objects.get_or_create(
            code="PACK",
            defaults={"name": "Packs", "description": "Bundled mailers"},
        )

        # 3) Warehouses
        main_wh, _ = Warehouse.objects.get_or_create(
            code="WH-001",
            defaults={"name": "Main Warehouse"},
        )
        secondary_wh, _ = Warehouse.objects.get_or_create(
            code="WH-002",
            defaults={"name": "Secondary Warehouse"},
        )
        micro_hub, _ = Warehouse.objects.get_or_create(
            code="WH-003",
            defaults={"name": "Micro Fulfillment Hub"},
        )

        # 4) Products
        laptop, _ = Product.objects.get_or_create(
            sku="LAP-001",
            defaults={
                "name": "Laptop 15-inch",
                "category": electronics,
                "stock_unit": pcs_uom,
                "purchase_unit": pcs_uom,
                "reorder_level": Decimal("5"),
                "reorder_quantity": Decimal("20"),
            },
        )
        steel, _ = Product.objects.get_or_create(
            sku="STL-001",
            defaults={
                "name": "Steel Rods",
                "category": raw,
                "stock_unit": kg_uom,
                "purchase_unit": kg_uom,
                "reorder_level": Decimal("50"),
                "reorder_quantity": Decimal("200"),
            },
        )
        box, _ = Product.objects.get_or_create(
            sku="BOX-001",
            defaults={
                "name": "Cardboard Box",
                "category": raw,
                "stock_unit": box_uom,
                "purchase_unit": box_uom,
                "reorder_level": Decimal("30"),
                "reorder_quantity": Decimal("100"),
            },
        )
        tablet, _ = Product.objects.get_or_create(
            sku="TAB-201",
            defaults={
                "name": "Tablet 11-inch Pro",
                "category": electronics,
                "stock_unit": pcs_uom,
                "purchase_unit": pcs_uom,
                "reorder_level": Decimal("8"),
                "reorder_quantity": Decimal("30"),
            },
        )
        servo_drive, _ = Product.objects.get_or_create(
            sku="DRV-050",
            defaults={
                "name": "Precision Servo Drive",
                "category": electronics,
                "stock_unit": pcs_uom,
                "purchase_unit": pcs_uom,
                "reorder_level": Decimal("3"),
                "reorder_quantity": Decimal("12"),
            },
        )
        battery_pack, _ = Product.objects.get_or_create(
            sku="BAT-500",
            defaults={
                "name": "Lithium Battery Pack",
                "category": spares,
                "stock_unit": pcs_uom,
                "purchase_unit": pcs_uom,
                "reorder_level": Decimal("15"),
                "reorder_quantity": Decimal("40"),
            },
        )
        filament, _ = Product.objects.get_or_create(
            sku="FIL-120",
            defaults={
                "name": "Nylon Filament 12kg",
                "category": raw,
                "stock_unit": kg_uom,
                "purchase_unit": kg_uom,
                "reorder_level": Decimal("25"),
                "reorder_quantity": Decimal("75"),
            },
        )
        maint_kit, _ = Product.objects.get_or_create(
            sku="KIT-900",
            defaults={
                "name": "Maintenance Kit Deluxe",
                "category": spares,
                "stock_unit": kit_uom,
                "purchase_unit": kit_uom,
                "reorder_level": Decimal("6"),
                "reorder_quantity": Decimal("18"),
            },
        )
        mailer_pack, _ = Product.objects.get_or_create(
            sku="PKG-250",
            defaults={
                "name": "Eco Mailer Pack",
                "category": packaging,
                "stock_unit": pack_uom,
                "purchase_unit": pack_uom,
                "reorder_level": Decimal("40"),
                "reorder_quantity": Decimal("120"),
            },
        )
        sensor, _ = Product.objects.get_or_create(
            sku="SEN-330",
            defaults={
                "name": "Temperature Sensor Module",
                "category": electronics,
                "stock_unit": pcs_uom,
                "purchase_unit": pcs_uom,
                "reorder_level": Decimal("20"),
                "reorder_quantity": Decimal("60"),
            },
        )

        # 5) Stock levels
        StockItem.objects.get_or_create(
            product=laptop,
            warehouse=main_wh,
            defaults={"quantity": Decimal("40"), "reserved_quantity": Decimal("5")},
        )
        StockItem.objects.get_or_create(
            product=steel,
            warehouse=main_wh,
            defaults={"quantity": Decimal("500"), "reserved_quantity": Decimal("0")},
        )
        StockItem.objects.get_or_create(
            product=box,
            warehouse=secondary_wh,
            defaults={"quantity": Decimal("150"), "reserved_quantity": Decimal("10")},
        )
        stock_matrix = [
            (tablet, main_wh, Decimal("28"), Decimal("4")),
            (servo_drive, main_wh, Decimal("12"), Decimal("2")),
            (battery_pack, secondary_wh, Decimal("60"), Decimal("5")),
            (filament, main_wh, Decimal("210"), Decimal("15")),
            (maint_kit, micro_hub, Decimal("18"), Decimal("1")),
            (mailer_pack, micro_hub, Decimal("240"), Decimal("20")),
            (sensor, secondary_wh, Decimal("95"), Decimal("8")),
        ]
        for product, warehouse, qty, reserved in stock_matrix:
            StockItem.objects.get_or_create(
                product=product,
                warehouse=warehouse,
                defaults={"quantity": qty, "reserved_quantity": reserved},
        )

        # 6) Suppliers
        Supplier.objects.get_or_create(
            code="SUP-001",
            defaults={"name": "Global Electronics", "email": "sales@globalelec.test"},
        )
        Supplier.objects.get_or_create(
            code="SUP-002",
            defaults={"name": "Steel Corp", "email": "contact@steelcorp.test"},
        )
        Supplier.objects.get_or_create(
            code="SUP-003",
            defaults={"name": "Northern Components", "email": "hello@northerncomponents.test"},
        )
        Supplier.objects.get_or_create(
            code="SUP-004",
            defaults={"name": "EcoPack Solutions", "email": "sales@ecopack.test"},
        )

        # 7) A few demo operations (one receipt, one delivery, one transfer, one adjustment)
        # Only create if none exist, to keep the DB tidy.
        if not Receipt.objects.exists():
            receipt = Receipt.objects.create(
                warehouse=main_wh,
                supplier="Global Electronics",
                supplier_reference="PO-1001",
                created_by=demo_user,
                status="ready",
            )
            ReceiptItem.objects.create(
                receipt=receipt,
                product=laptop,
                quantity_ordered=Decimal("10"),
                quantity_received=Decimal("10"),
                unit_price=Decimal("800.00"),
            )
            receipt.validate_and_complete()

        if not DeliveryOrder.objects.exists():
            delivery = DeliveryOrder.objects.create(
                warehouse=main_wh,
                customer="Acme Corp",
                customer_reference="SO-2001",
                shipping_address="123 Business St",
                created_by=demo_user,
                status="ready",
            )
            DeliveryItem.objects.create(
                delivery=delivery,
                product=laptop,
                quantity=Decimal("2"),
            )
            delivery.validate_and_complete()

        if not InternalTransfer.objects.exists():
            transfer = InternalTransfer.objects.create(
                warehouse=main_wh,
                to_warehouse=secondary_wh,
                created_by=demo_user,
                status="ready",
                notes="Initial stock balancing",
            )
            TransferItem.objects.create(
                transfer=transfer,
                product=steel,
                quantity=Decimal("50"),
            )
            transfer.validate_and_complete()

        if not StockAdjustment.objects.exists():
            adjustment = StockAdjustment.objects.create(
                warehouse=secondary_wh,
                reason="Year-end count correction",
                adjustment_type="set",
                created_by=demo_user,
                status="ready",
            )
            AdjustmentItem.objects.create(
                adjustment=adjustment,
                product=box,
                current_quantity=Decimal("150"),
                adjustment_quantity=Decimal("140"),
                reason="10 damaged boxes removed",
            )
            adjustment.validate_and_complete()

        # Targeted demo documents to highlight the new SKUs (idempotent per reference)
        if not Receipt.objects.filter(supplier_reference="PO-HUB-301").exists():
            hub_receipt = Receipt.objects.create(
                warehouse=micro_hub,
                supplier="Northern Components",
                supplier_reference="PO-HUB-301",
                created_by=demo_user,
                status="ready",
            )
            ReceiptItem.objects.create(
                receipt=hub_receipt,
                product=battery_pack,
                quantity_ordered=Decimal("25"),
                quantity_received=Decimal("25"),
                unit_price=Decimal("55"),
            )
            ReceiptItem.objects.create(
                receipt=hub_receipt,
                product=maint_kit,
                quantity_ordered=Decimal("10"),
                quantity_received=Decimal("10"),
                unit_price=Decimal("95"),
            )
            hub_receipt.validate_and_complete()

        if not Receipt.objects.filter(supplier_reference="PO-ECO-112").exists():
            eco_receipt = Receipt.objects.create(
                warehouse=secondary_wh,
                supplier="EcoPack Solutions",
                supplier_reference="PO-ECO-112",
                created_by=demo_user,
                status="ready",
            )
            ReceiptItem.objects.create(
                receipt=eco_receipt,
                product=mailer_pack,
                quantity_ordered=Decimal("120"),
                quantity_received=Decimal("120"),
                unit_price=Decimal("12.50"),
            )
            eco_receipt.validate_and_complete()

        if not DeliveryOrder.objects.filter(customer_reference="SO-RED-88").exists():
            sensor_delivery = DeliveryOrder.objects.create(
                warehouse=secondary_wh,
                customer="Redline Robotics",
                customer_reference="SO-RED-88",
                shipping_address="22 Automation Way",
                created_by=demo_user,
                status="ready",
            )
            DeliveryItem.objects.create(
                delivery=sensor_delivery,
                product=sensor,
                quantity=Decimal("12"),
            )
            DeliveryItem.objects.create(
                delivery=sensor_delivery,
                product=servo_drive,
                quantity=Decimal("4"),
            )
            sensor_delivery.validate_and_complete()

        if not InternalTransfer.objects.filter(notes="Balancing tablets to hub").exists():
            tablet_transfer = InternalTransfer.objects.create(
                warehouse=main_wh,
                to_warehouse=micro_hub,
                created_by=demo_user,
                status="ready",
                notes="Balancing tablets to hub",
            )
            TransferItem.objects.create(
                transfer=tablet_transfer,
                product=tablet,
                quantity=Decimal("6"),
            )
            tablet_transfer.validate_and_complete()

        if not StockAdjustment.objects.filter(reason="Routine servo calibration loss").exists():
            servo_adjustment = StockAdjustment.objects.create(
                warehouse=main_wh,
                reason="Routine servo calibration loss",
                adjustment_type="remove",
                created_by=demo_user,
                status="ready",
            )
            AdjustmentItem.objects.create(
                adjustment=servo_adjustment,
                product=servo_drive,
                current_quantity=Decimal("12"),
                adjustment_quantity=Decimal("10"),
                reason="2 drives consumed during calibration",
            )
            servo_adjustment.validate_and_complete()

        # 8) Always add a bit more demo activity on each run so the UI looks busy
        #    This is intentionally not idempotent: re-running the command will
        #    create more history (useful for demos).
        
        # Add more adjustments for demo
        adjustment_count = StockAdjustment.objects.count()
        if adjustment_count < 5:
            for i in range(3):
                extra_adjustment = StockAdjustment.objects.create(
                    warehouse=main_wh if i % 2 == 0 else secondary_wh,
                    reason=f'Demo adjustment {i+1} - Inventory correction',
                    adjustment_type='increase' if i % 2 == 0 else 'decrease',
                    created_by=demo_user,
                    status='ready' if i < 2 else 'draft',
                )
                product_to_adjust = laptop if i % 2 == 0 else tablet
                stock_item = StockItem.objects.filter(product=product_to_adjust, warehouse=extra_adjustment.warehouse).first()
                current_qty = stock_item.quantity if stock_item else Decimal("0")
                AdjustmentItem.objects.create(
                    adjustment=extra_adjustment,
                    product=product_to_adjust,
                    current_quantity=current_qty,
                    adjustment_quantity=Decimal("5") if i % 2 == 0 else Decimal("2"),
                    reason=f'Demo adjustment item {i+1}',
                )
                if extra_adjustment.status == 'ready':
                    extra_adjustment.validate_and_complete()

        # Extra receipts (increase stock)
        for i in range(3):
            extra_receipt = Receipt.objects.create(
                warehouse=main_wh,
                supplier="Global Electronics" if i % 2 == 0 else "Steel Corp",
                supplier_reference=f"PO-EXTRA-{100 + i}",
                created_by=demo_user,
                status="ready",
            )
            if i % 2 == 0:
                ReceiptItem.objects.create(
                    receipt=extra_receipt,
                    product=laptop,
                    quantity_ordered=Decimal("5"),
                    quantity_received=Decimal("5"),
                    unit_price=Decimal("780.00"),
                )
            else:
                ReceiptItem.objects.create(
                    receipt=extra_receipt,
                    product=steel,
                    quantity_ordered=Decimal("100"),
                    quantity_received=Decimal("100"),
                    unit_price=Decimal("2.50"),
                )
            extra_receipt.validate_and_complete()

        # Extra small delivery (reduce stock a bit)
        extra_delivery = DeliveryOrder.objects.create(
            warehouse=main_wh,
            customer="Demo Customer",
            customer_reference="SO-EXTRA-1",
            shipping_address="456 Demo Ave",
            created_by=demo_user,
            status="ready",
        )
        DeliveryItem.objects.create(
            delivery=extra_delivery,
            product=laptop,
            quantity=Decimal("1"),
        )
        extra_delivery.validate_and_complete()

        # Extra transfer between warehouses
        extra_transfer = InternalTransfer.objects.create(
            warehouse=main_wh,
            to_warehouse=secondary_wh,
            created_by=demo_user,
            status="ready",
            notes="Auto-generated demo transfer",
        )
        TransferItem.objects.create(
            transfer=extra_transfer,
            product=steel,
            quantity=Decimal("20"),
        )
        extra_transfer.validate_and_complete()

        # 9) Create Cycle Count Tasks (always add more for demo)
        cycle_count_count = CycleCountTask.objects.count()
        if cycle_count_count < 5:
            # Create a few cycle count tasks with different statuses
            cycle_count_ready = CycleCountTask.objects.create(
                warehouse=main_wh,
                scheduled_date=date.today() + timedelta(days=2),
                method='partial',
                created_by=demo_user,
                status='ready',
                notes='Quarterly partial count for high-value items'
            )
            CycleCountItem.objects.create(
                task=cycle_count_ready,
                product=laptop,
                expected_quantity=Decimal("40"),
                counted_quantity=Decimal("0"),
            )
            CycleCountItem.objects.create(
                task=cycle_count_ready,
                product=tablet,
                expected_quantity=Decimal("28"),
                counted_quantity=Decimal("0"),
            )

            cycle_count_done = CycleCountTask.objects.create(
                warehouse=secondary_wh,
                scheduled_date=date.today() - timedelta(days=5),
                method='full',
                created_by=demo_user,
                status='done',
                notes='Monthly full warehouse count completed'
            )
            CycleCountItem.objects.create(
                task=cycle_count_done,
                product=box,
                expected_quantity=Decimal("150"),
                counted_quantity=Decimal("148"),
            )
            CycleCountItem.objects.create(
                task=cycle_count_done,
                product=sensor,
                expected_quantity=Decimal("95"),
                counted_quantity=Decimal("95"),
            )

            cycle_count_waiting = CycleCountTask.objects.create(
                warehouse=micro_hub,
                scheduled_date=date.today() + timedelta(days=7),
                method='abc',
                created_by=demo_user,
                status='waiting',
                notes='ABC-based count scheduled for next week'
            )
            CycleCountItem.objects.create(
                task=cycle_count_waiting,
                product=battery_pack,
                expected_quantity=Decimal("60"),
                counted_quantity=Decimal("0"),
            )
            
            # Add more cycle counts for better demo
            if cycle_count_count < 3:
                cycle_count_draft = CycleCountTask.objects.create(
                    warehouse=main_wh,
                    scheduled_date=date.today() + timedelta(days=14),
                    method='partial',
                    created_by=demo_user,
                    status='draft',
                    notes='Weekly partial count - draft'
                )
                CycleCountItem.objects.create(
                    task=cycle_count_draft,
                    product=servo_drive,
                    expected_quantity=Decimal("12"),
                    counted_quantity=Decimal("0"),
                )
                
                cycle_count_ready2 = CycleCountTask.objects.create(
                    warehouse=secondary_wh,
                    scheduled_date=date.today() + timedelta(days=3),
                    method='full',
                    created_by=demo_user,
                    status='ready',
                    notes='Monthly full count - ready to start'
                )
                CycleCountItem.objects.create(
                    task=cycle_count_ready2,
                    product=mailer_pack,
                    expected_quantity=Decimal("240"),
                    counted_quantity=Decimal("0"),
                )

        # 10) Create Return Orders (always add more for demo)
        return_count = ReturnOrder.objects.count()
        if return_count < 5:
            # Get a delivery order to link returns to
            delivery_for_return = DeliveryOrder.objects.first()
            
            return_restock = ReturnOrder.objects.create(
                warehouse=main_wh,
                delivery_order=delivery_for_return,
                reason='Customer changed mind',
                disposition='restock',
                created_by=demo_user,
                status='ready',
                notes='Product in original packaging, can be restocked'
            )
            ReturnItem.objects.create(
                return_order=return_restock,
                product=laptop,
                quantity=Decimal("1"),
            )
            return_restock.validate_and_complete()

            return_scrap = ReturnOrder.objects.create(
                warehouse=secondary_wh,
                delivery_order=delivery_for_return,
                reason='Damaged during shipping',
                disposition='scrap',
                created_by=demo_user,
                status='ready',
                notes='Box crushed, product damaged beyond repair'
            )
            ReturnItem.objects.create(
                return_order=return_scrap,
                product=sensor,
                quantity=Decimal("2"),
            )
            return_scrap.validate_and_complete()

            return_repair = ReturnOrder.objects.create(
                warehouse=main_wh,
                delivery_order=delivery_for_return,
                reason='Manufacturing defect',
                disposition='repair',
                created_by=demo_user,
                status='draft',
                notes='Screen flickering issue, needs repair'
            )
            ReturnItem.objects.create(
                return_order=return_repair,
                product=tablet,
                quantity=Decimal("1"),
            )
            
            # Add more returns for better demo
            if return_count < 3:
                return_waiting = ReturnOrder.objects.create(
                    warehouse=main_wh,
                    delivery_order=delivery_for_return,
                    reason='Quality issue reported',
                    disposition='restock',
                    created_by=demo_user,
                    status='waiting',
                    notes='Customer reported minor defect, awaiting inspection'
                )
                ReturnItem.objects.create(
                    return_order=return_waiting,
                    product=laptop,
                    quantity=Decimal("1"),
                )
                
                return_ready = ReturnOrder.objects.create(
                    warehouse=secondary_wh,
                    delivery_order=delivery_for_return,
                    reason='Wrong item shipped',
                    disposition='restock',
                    created_by=demo_user,
                    status='ready',
                    notes='Correct item will be shipped, wrong item can be restocked'
                )
                ReturnItem.objects.create(
                    return_order=return_ready,
                    product=sensor,
                    quantity=Decimal("1"),
                )

        # 11) Create Pick Waves (always add more for demo)
        pick_wave_count = PickWave.objects.count()
        if pick_wave_count < 5:
            # Get some delivery orders for pick waves
            delivery_orders = list(DeliveryOrder.objects.filter(status='done')[:5])
            
            if delivery_orders:
                pick_wave_planned = PickWave.objects.create(
                    name='Morning Wave 001',
                    warehouse=main_wh,
                    status='planned',
                    created_by=demo_user,
                )
                pick_wave_planned.delivery_orders.set(delivery_orders[:2])

                pick_wave_picking = PickWave.objects.create(
                    name='Afternoon Wave 002',
                    warehouse=secondary_wh,
                    status='picking',
                    assigned_picker=demo_user,
                    created_by=demo_user,
                )
                pick_wave_picking.delivery_orders.set(delivery_orders[2:4] if len(delivery_orders) > 2 else delivery_orders[:2])

                pick_wave_completed = PickWave.objects.create(
                    name='Evening Wave 003',
                    warehouse=micro_hub,
                    status='completed',
                    assigned_picker=demo_user,
                    created_by=demo_user,
                    completed_at=timezone.now() - timedelta(hours=2),
                )
                if len(delivery_orders) > 4:
                    pick_wave_completed.delivery_orders.set([delivery_orders[4]])
            
            # Add more pick waves for better demo
            if pick_wave_count < 3 and len(delivery_orders) > 0:
                pick_wave_planned2 = PickWave.objects.create(
                    name='Weekend Wave 004',
                    warehouse=main_wh,
                    status='planned',
                    created_by=demo_user,
                )
                if len(delivery_orders) > 0:
                    pick_wave_planned2.delivery_orders.set(delivery_orders[:1])
                
                pick_wave_canceled = PickWave.objects.create(
                    name='Canceled Wave 005',
                    warehouse=secondary_wh,
                    status='canceled',
                    created_by=demo_user,
                )
                if len(delivery_orders) > 1:
                    pick_wave_canceled.delivery_orders.set(delivery_orders[1:2])

        # 12) Create additional Audit Log entries (always add more for demo)
        audit_log_count = AuditLog.objects.count()
        if audit_log_count < 10:
            # Create audit log entries for various document types
            from operations.audit import log_audit_event
            
            # Log some validation events
            if Receipt.objects.exists():
                receipt = Receipt.objects.first()
                log_audit_event(
                    document_type='receipt',
                    document_id=receipt.id,
                    action='validate',
                    user=demo_user,
                    message='Receipt validated and stock updated',
                )
            
            if DeliveryOrder.objects.exists():
                delivery = DeliveryOrder.objects.first()
                log_audit_event(
                    document_type='deliveryorder',
                    document_id=delivery.id,
                    action='validate',
                    user=demo_user,
                    message='Delivery validated and stock reduced',
                )
            
            if StockAdjustment.objects.exists():
                adjustment = StockAdjustment.objects.first()
                log_audit_event(
                    document_type='stockadjustment',
                    document_id=adjustment.id,
                    action='validate',
                    user=demo_user,
                    message='Stock adjustment validated',
                )
            
            # Add more audit log entries for better demo
            if audit_log_count < 5:
                # Log approval events
                if Receipt.objects.exists():
                    receipt2 = Receipt.objects.order_by('-id').first()
                    if receipt2:
                        log_audit_event(
                            document_type='receipt',
                            document_id=receipt2.id,
                            action='approve',
                            user=demo_user,
                            message='Receipt approved by manager',
                        )
                
                if DeliveryOrder.objects.exists():
                    delivery2 = DeliveryOrder.objects.order_by('-id').first()
                    if delivery2:
                        log_audit_event(
                            document_type='deliveryorder',
                            document_id=delivery2.id,
                            action='approve',
                            user=demo_user,
                            message='Delivery order approved',
                        )
                
                if InternalTransfer.objects.exists():
                    transfer = InternalTransfer.objects.first()
                    log_audit_event(
                        document_type='internaltransfer',
                        document_id=transfer.id,
                        action='validate',
                        user=demo_user,
                        message='Internal transfer validated',
                    )
                
                if ReturnOrder.objects.exists():
                    return_order = ReturnOrder.objects.first()
                    log_audit_event(
                        document_type='returnorder',
                        document_id=return_order.id,
                        action='validate',
                        user=demo_user,
                        message='Return order processed',
                    )
                
                if CycleCountTask.objects.exists():
                    cycle_count = CycleCountTask.objects.first()
                    log_audit_event(
                        document_type='cyclecounttask',
                        document_id=cycle_count.id,
                        action='start',
                        user=demo_user,
                        message='Cycle count task started',
                    )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
