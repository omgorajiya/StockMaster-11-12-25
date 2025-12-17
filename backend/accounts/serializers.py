from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta
import secrets

from .models import User, OTP, Invite


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    invite_token = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        # NOTE: `role` is still present for backwards compatibility with older clients,
        # but it is ignored server-side (prevents privilege escalation).
        fields = ('id', 'username', 'email', 'password', 'password_confirm', 'phone', 'role', 'first_name', 'last_name', 'invite_token')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords don't match"})
        
        # Check if email already exists
        if User.objects.filter(email=attrs.get('email')).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists"})
        
        # Check if username already exists
        if attrs.get('username') and User.objects.filter(username=attrs.get('username')).exists():
            raise serializers.ValidationError({"username": "A user with this username already exists"})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data.pop('invite_token', None)
        # Never accept role from self-registration.
        validated_data.pop('role', None)

        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, role='warehouse_staff', **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'role', 'first_name', 'last_name', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-only user management serializer."""

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'phone',
            'role',
            'is_active',
            'allowed_warehouses',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class InviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invite
        fields = (
            'id',
            'token',
            'email',
            'role',
            'allowed_warehouses',
            'expires_at',
            'used_at',
            'revoked_at',
            'created_by',
            'created_at',
        )
        read_only_fields = (
            'id',
            'token',
            'used_at',
            'revoked_at',
            'created_by',
            'created_at',
        )


class InviteCreateSerializer(serializers.ModelSerializer):
    """Create an invite token for an email (admin-only)."""

    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=365)

    class Meta:
        model = Invite
        fields = ('id', 'token', 'email', 'role', 'allowed_warehouses', 'expires_at', 'expires_in_days')
        read_only_fields = ('id', 'token')

    def validate(self, attrs):
        expires_at = attrs.get('expires_at')
        expires_in_days = attrs.pop('expires_in_days', None)
        if expires_at and expires_in_days:
            raise serializers.ValidationError('Provide either expires_at or expires_in_days, not both.')
        if expires_in_days:
            attrs['expires_at'] = timezone.now() + timedelta(days=int(expires_in_days))
        return attrs

    def create(self, validated_data):
        validated_data['token'] = secrets.token_urlsafe(32)
        return super().create(validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Must include email and password')
        
        # Try to get user by email first
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid credentials')
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled')
        
        # Authenticate with email as username (since USERNAME_FIELD is 'email')
        authenticated_user = authenticate(username=email, password=password)
        if not authenticated_user:
            raise serializers.ValidationError('Invalid credentials')
        
        attrs['user'] = authenticated_user
        return attrs


class OTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User with this email does not exist')
        return value


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)

