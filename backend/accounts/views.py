from rest_framework import status, generics, permissions, viewsets, mixins
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    AdminUserSerializer,
    LoginSerializer,
    OTPSerializer,
    OTPVerifySerializer,
    InviteSerializer,
    InviteCreateSerializer,
)
from .models import OTP, Invite
from .permissions import capability_required
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def get_tokens_for_user(user):
    """Generate JWT tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """User registration.

    Security hardening:
    - Prevent privilege escalation by never accepting user-supplied roles.
    - If INVITE_ONLY_REGISTRATION is enabled, require a valid invite token.
    - If an invite is used, the role and warehouse scope are derived from the invite.
    """
    try:
        invite_token = request.data.get('invite_token')
        invite = None

        # When invite-only mode is on, invite_token is mandatory.
        if getattr(settings, 'INVITE_ONLY_REGISTRATION', False):
            if not invite_token:
                return Response(
                    {'error': 'Invite-only registration is enabled. Please provide an invite_token.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # If token is provided (mandatory or optional), validate it.
        if invite_token:
            invite = Invite.objects.filter(token=invite_token).first()
            if not invite or not invite.is_active():
                return Response({'error': 'Invalid or expired invite token'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()  # created as warehouse_staff; role input ignored

            if invite:
                # Bind invite to email (prevents "stealing" an invite token).
                request_email = (request.data.get('email') or '').strip().lower()
                invite_email = (invite.email or '').strip().lower()
                if invite_email and request_email and invite_email != request_email:
                    user.delete()
                    return Response(
                        {'error': 'Invite token does not match the provided email.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                user.role = invite.role
                user.save(update_fields=['role'])

                # Apply warehouse scope from invite.
                user.allowed_warehouses.set(invite.allowed_warehouses.all())

                invite.used_at = timezone.now()
                invite.save(update_fields=['used_at'])

            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return Response(
            {'error': 'Registration failed. Please check your input and try again.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """User login"""
    try:
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return Response(
            {'error': 'Login failed. Please check your credentials and try again.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def request_password_reset(request):
    """Request OTP for password reset"""
    serializer = OTPSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            otp = OTP.generate_otp(user)
            # In production, send OTP via email/SMS
            logger.info(f"OTP for {email}: {otp.code}")
            return Response({
                'message': 'OTP sent to your email'
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_otp_and_reset_password(request):
    """Verify OTP and reset password"""
    serializer = OTPVerifySerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']
        
        try:
            user = User.objects.get(email=email)
            otp = OTP.objects.filter(user=user, code=code, is_used=False).order_by('-created_at').first()
            
            if not otp or not otp.is_valid():
                return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(new_password)
            user.save()
            otp.is_used = True
            otp.save()
            
            return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_profile(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    """Update current user profile"""
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InviteViewSet(viewsets.ModelViewSet):
    """Admin-managed onboarding invites."""

    queryset = Invite.objects.prefetch_related('allowed_warehouses').select_related('created_by')
    permission_classes = [permissions.IsAuthenticated, capability_required('users.manage')]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return InviteCreateSerializer
        return InviteSerializer

    def perform_create(self, serializer):
        invite = serializer.save(created_by=self.request.user)
        try:
            from operations.audit import log_audit_event

            log_audit_event(
                document_type='invite',
                document_id=invite.id,
                action='access_change',
                user=self.request.user,
                message=f"Invite created for {invite.email} ({invite.role})",
                before=None,
                after={'email': invite.email, 'role': invite.role},
                warehouse=None,
            )
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        invite = self.get_object()
        if invite.revoked_at is None:
            invite.revoked_at = timezone.now()
            invite.save(update_fields=['revoked_at'])

            try:
                from operations.audit import log_audit_event

                log_audit_event(
                    document_type='invite',
                    document_id=invite.id,
                    action='access_change',
                    user=request.user,
                    message=f"Invite revoked for {invite.email}",
                    before=None,
                    after={'revoked_at': invite.revoked_at.isoformat()},
                    warehouse=None,
                )
            except Exception:
                pass

        return Response({'success': True, 'invite': InviteSerializer(invite).data})


class AdminUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Admin user management (roles, activation, warehouse membership)."""

    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, capability_required('users.manage')]

    def perform_update(self, serializer):
        user_obj = self.get_object()
        before_role = user_obj.role
        before_active = user_obj.is_active
        before_warehouses = list(user_obj.allowed_warehouses.values_list('id', flat=True))

        updated = serializer.save()

        after_role = updated.role
        after_active = updated.is_active
        after_warehouses = list(updated.allowed_warehouses.values_list('id', flat=True))

        try:
            from operations.audit import log_audit_event

            changes = {}
            if before_role != after_role:
                changes['role'] = {'from': before_role, 'to': after_role}
            if before_active != after_active:
                changes['is_active'] = {'from': before_active, 'to': after_active}
            if before_warehouses != after_warehouses:
                changes['allowed_warehouses'] = {'from': before_warehouses, 'to': after_warehouses}

            if changes:
                log_audit_event(
                    document_type='user',
                    document_id=updated.id,
                    action='access_change',
                    user=self.request.user,
                    message=f"User access updated for {updated.email}",
                    before=changes,
                    after=None,
                    warehouse=None,
                )
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])

        try:
            from operations.audit import log_audit_event

            log_audit_event(
                document_type='user',
                document_id=user.id,
                action='access_change',
                user=request.user,
                message=f"User deactivated: {user.email}",
                before={'is_active': True},
                after={'is_active': False},
                warehouse=None,
            )
        except Exception:
            pass

        return Response({'success': True, 'user': AdminUserSerializer(user).data})

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])

        try:
            from operations.audit import log_audit_event

            log_audit_event(
                document_type='user',
                document_id=user.id,
                action='access_change',
                user=request.user,
                message=f"User reactivated: {user.email}",
                before={'is_active': False},
                after={'is_active': True},
                warehouse=None,
            )
        except Exception:
            pass

        return Response({'success': True, 'user': AdminUserSerializer(user).data})
