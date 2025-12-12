from django.conf import settings
from django.db import models


class WebhookConfiguration(models.Model):
    """Configuration for outbound webhooks/integration connectors."""

    EVENT_CHOICES = [
        ('stock_change', 'Stock Change'),
        ('receipt_completed', 'Receipt Completed'),
        ('delivery_completed', 'Delivery Completed'),
        ('return_completed', 'Return Completed'),
        ('transfer_completed', 'Transfer Completed'),
        ('adjustment_completed', 'Adjustment Completed'),
        ('cycle_count_completed', 'Cycle Count Completed'),
    ]

    name = models.CharField(max_length=100)
    url = models.URLField(help_text="Endpoint URL to send webhook payloads to")
    secret = models.CharField(
        max_length=255,
        help_text="Secret used to sign webhook requests (HMAC-SHA256)",
    )
    is_active = models.BooleanField(default=True)

    event_types = models.JSONField(
        default=list,
        help_text="Subset of event types this webhook should receive. Empty list = all events.",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_webhooks',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def supports_event(self, event_type: str) -> bool:
        """Return True if this webhook is configured for the given event."""
        if not self.event_types:
            return True
        return event_type in self.event_types


class IntegrationEvent(models.Model):
    """Outgoing event payload + delivery status tracking."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]

    webhook = models.ForeignKey(
        WebhookConfiguration,
        on_delete=models.CASCADE,
        related_name='events',
    )
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    response_status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['webhook', 'status']),
            models.Index(fields=['event_type', '-created_at']),
        ]

    def mark_attempt(
        self,
        *,
        status: str,
        response_status: int | None = None,
        response_body: str | None = None,
        increment_retry: bool = False,
    ):
        """Update status/response metadata after a delivery attempt."""
        from django.utils import timezone

        self.status = status
        self.response_status_code = response_status
        self.response_body = response_body or ''
        if status == 'sent':
            self.sent_at = timezone.now()
        if increment_retry:
            self.retry_count += 1
        self.save(update_fields=[
            'status',
            'response_status_code',
            'response_body',
            'sent_at',
            'retry_count',
        ])
