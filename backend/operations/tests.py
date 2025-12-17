from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from products.models import Warehouse, UnitOfMeasure, Product, StockItem
from operations.models import Receipt, Approval


class WarehouseScopingAndRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Minimal required fixtures
        self.uom, _ = UnitOfMeasure.objects.get_or_create(name='Pieces', code='PCS')

        self.w1 = Warehouse.objects.create(name='Main', code='MAIN')
        self.w2 = Warehouse.objects.create(name='Secondary', code='SEC')

        self.product = Product.objects.create(
            name='Widget',
            sku='W-001',
            stock_unit=self.uom,
            reorder_level=0,
            reorder_quantity=0,
        )

        StockItem.objects.create(product=self.product, warehouse=self.w1, quantity='10.00')
        StockItem.objects.create(product=self.product, warehouse=self.w2, quantity='99.00')

        self.staff = User.objects.create_user(
            email='staff1@example.com',
            username='Staff 1',
            password='StrongPass123!',
            role='warehouse_staff',
        )
        self.staff.allowed_warehouses.set([self.w1])

        self.manager = User.objects.create_user(
            email='mgr@example.com',
            username='Manager',
            password='StrongPass123!',
            role='inventory_manager',
        )
        self.manager.allowed_warehouses.set([self.w1])

        self.admin = User.objects.create_user(
            email='admin@example.com',
            username='Admin',
            password='StrongPass123!',
            role='admin',
        )

        # Create receipts in each warehouse
        self.receipt_w1 = Receipt.objects.create(
            warehouse=self.w1,
            supplier='Supplier A',
            created_by=self.admin,
            status='draft',
        )
        self.receipt_w2 = Receipt.objects.create(
            warehouse=self.w2,
            supplier='Supplier B',
            created_by=self.admin,
            status='draft',
        )

        # Create an approval record for the w2 receipt (so we can verify approval list scoping)
        Approval.objects.create(
            document_type='receipt',
            document_id=self.receipt_w2.id,
            approver=self.admin,
            notes='seed',
        )

    def test_receipt_retrieve_is_warehouse_scoped(self):
        self.client.force_authenticate(user=self.staff)

        # Allowed warehouse -> OK
        res_ok = self.client.get(f'/api/operations/receipts/{self.receipt_w1.id}/')
        self.assertEqual(res_ok.status_code, 200)

        # Disallowed warehouse -> 404 (object hidden)
        res_blocked = self.client.get(f'/api/operations/receipts/{self.receipt_w2.id}/')
        self.assertEqual(res_blocked.status_code, 404)

    def test_approve_requires_ops_approve_capability(self):
        # warehouse_staff should be forbidden
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(f'/api/operations/receipts/{self.receipt_w1.id}/approve/', {'notes': 'x'}, format='json')
        self.assertEqual(res.status_code, 403)

        # inventory_manager should be allowed
        self.client.force_authenticate(user=self.manager)
        res2 = self.client.post(f'/api/operations/receipts/{self.receipt_w1.id}/approve/', {'notes': 'x'}, format='json')
        self.assertEqual(res2.status_code, 200)

    def test_product_stock_by_warehouse_is_scoped(self):
        self.client.force_authenticate(user=self.staff)

        # Allowed warehouse -> 200
        res_ok = self.client.get(
            f'/api/products/products/{self.product.id}/stock_by_warehouse/?warehouse_id={self.w1.id}'
        )
        self.assertEqual(res_ok.status_code, 200)
        self.assertEqual(int(res_ok.data.get('warehouse')), self.w1.id)

        # Disallowed warehouse -> 404
        res_blocked = self.client.get(
            f'/api/products/products/{self.product.id}/stock_by_warehouse/?warehouse_id={self.w2.id}'
        )
        self.assertEqual(res_blocked.status_code, 404)

        # No warehouse_id -> returns only scoped warehouses
        res_all = self.client.get(f'/api/products/products/{self.product.id}/stock_by_warehouse/')
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(len(res_all.data), 1)
        self.assertEqual(int(res_all.data[0].get('warehouse')), self.w1.id)

    def test_approvals_list_requires_document_context_for_non_admin(self):
        self.client.force_authenticate(user=self.staff)

        # Without document context -> empty
        res = self.client.get('/api/operations/approvals/')
        self.assertEqual(res.status_code, 200)

        # DRF default pagination may return {'count', 'results'} or a bare list
        payload = res.data
        if isinstance(payload, dict):
            self.assertEqual(payload.get('count', 0), 0)
        else:
            self.assertEqual(len(payload), 0)

        # With document context but out-of-scope doc -> still empty
        res2 = self.client.get(
            f'/api/operations/approvals/?document_type=receipt&document_id={self.receipt_w2.id}'
        )
        self.assertEqual(res2.status_code, 200)
        payload2 = res2.data
        if isinstance(payload2, dict):
            self.assertEqual(payload2.get('count', 0), 0)
        else:
            self.assertEqual(len(payload2), 0)
