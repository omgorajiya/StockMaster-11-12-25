from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import IsAdminOrInventoryManager

from .models import IntegrationEvent, WebhookConfiguration
from .serializers import IntegrationEventSerializer, WebhookConfigurationSerializer
from .services import emit_event, resend_event


class WebhookConfigurationViewSet(viewsets.ModelViewSet):
    """CRUD for webhook connector configurations."""

    queryset = WebhookConfiguration.objects.all()
    serializer_class = WebhookConfigurationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInventoryManager]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'url']
    ordering_fields = ['name', 'created_at', 'updated_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Fire a lightweight ping event to verify webhook connectivity."""
        webhook = self.get_object()
        emit_event(
            'integration_test',
            {
                'message': 'Test event from StockMaster',
                'triggered_by': request.user.email,
            },
            webhooks=[webhook],
        )
        return Response({'success': True, 'message': 'Test event queued'})


class IntegrationEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Expose historical webhook deliveries + allow manual retries."""

    queryset = IntegrationEvent.objects.select_related('webhook')
    serializer_class = IntegrationEventSerializer
    permission_classes = [IsAuthenticated, IsAdminOrInventoryManager]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_type', 'status', 'webhook']
    search_fields = ['payload', 'webhook__name']
    ordering_fields = ['created_at', 'sent_at', 'retry_count']

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Retry delivery for a failed/pending event."""
        event = self.get_object()
        success, message = resend_event(event)
        return Response(
            {'success': success, 'message': message},
            status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
        )
