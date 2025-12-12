from django.contrib.auth.models import AbstractUser
from django.db import models
import random
import string
from datetime import datetime, timedelta
from django.utils import timezone


class User(AbstractUser):
    """Custom User model"""
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=[
            ('inventory_manager', 'Inventory Manager'),
            ('warehouse_staff', 'Warehouse Staff'),
            ('admin', 'Admin'),
        ],
        default='warehouse_staff'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class OTP(models.Model):
    """OTP model for password reset"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    @classmethod
    def generate_otp(cls, user):
        """Generate a new OTP for user"""
        # Invalidate previous OTPs
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Generate 6-digit OTP
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timedelta(minutes=10)
        
        otp = cls.objects.create(
            user=user,
            code=code,
            expires_at=expires_at
        )
        return otp

    def is_valid(self):
        """Check if OTP is valid and not expired"""
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"{self.user.email} - {self.code}"

