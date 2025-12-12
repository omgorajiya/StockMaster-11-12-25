from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminOrInventoryManager
from django.utils import timezone
from .models import Notification, NotificationPreference, NotificationJobStatus
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationJobStatusSerializer,
)
from .services import run_notification_job


class NotificationViewSet(viewsets.ModelViewSet):
    """Notification CRUD operations"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get notifications for current user"""
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'success': True, 'message': 'Notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({
            'success': True,
            'message': f'{count} notifications marked as read'
        })

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'count': count})


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """Notification preference management"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationJobStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """Expose job run history and manual triggers."""

    queryset = NotificationJobStatus.objects.all()
    serializer_class = NotificationJobStatusSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInventoryManager]
    lookup_field = 'job_name'

    def get_queryset(self):
        # Ensure default job rows exist so the UI always has entries to display.
        for job_name, _ in NotificationJobStatus.JOB_CHOICES:
            NotificationJobStatus.objects.get_or_create(job_name=job_name)
        return super().get_queryset()

    @action(detail=True, methods=['post'])
    def run(self, request, job_name=None):
        job = self.get_object()
        success, message = run_notification_job(job.job_name, request.user)
        job.refresh_from_db()
        serializer = self.get_serializer(job)
        return Response(
            {'success': success, 'message': message, 'job': serializer.data},
            status=status.HTTP_200_OK if success else status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

