from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Invite, User
from products.models import Warehouse, UnitOfMeasure


class RegistrationRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Required for product fixtures in other apps; safe to create once here too.
        UnitOfMeasure.objects.get_or_create(name='Pieces', code='PCS')

        self.w1 = Warehouse.objects.create(name='Main', code='MAIN')
        self.w2 = Warehouse.objects.create(name='Secondary', code='SEC')

    def test_public_registration_cannot_self_assign_admin(self):
        payload = {
            'email': 'staff@example.com',
            # Django's default username validator rejects spaces.
            'username': 'staffuser',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'role': 'admin',
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 201)

        user = User.objects.get(email='staff@example.com')
        self.assertEqual(user.role, 'warehouse_staff')

    def test_invite_sets_role_and_warehouses(self):
        invite = Invite.objects.create(
            token='token-123',
            email='manager@example.com',
            role='inventory_manager',
        )
        invite.allowed_warehouses.set([self.w1])

        payload = {
            'email': 'manager@example.com',
            'username': 'Manager',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'invite_token': 'token-123',
            'role': 'admin',  # should be ignored; invite controls
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 201)

        user = User.objects.get(email='manager@example.com')
        self.assertEqual(user.role, 'inventory_manager')
        self.assertEqual(list(user.allowed_warehouses.values_list('id', flat=True)), [self.w1.id])

        invite.refresh_from_db()
        self.assertIsNotNone(invite.used_at)

    def test_invite_email_mismatch_rejected(self):
        invite = Invite.objects.create(
            token='token-456',
            email='right@example.com',
            role='inventory_manager',
        )

        payload = {
            'email': 'wrong@example.com',
            'username': 'Wrong',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'invite_token': 'token-456',
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(email='wrong@example.com').exists())

    @override_settings(INVITE_ONLY_REGISTRATION=True)
    def test_invite_only_requires_token(self):
        payload = {
            'email': 'noinvite@example.com',
            'username': 'No Invite',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, 403)
