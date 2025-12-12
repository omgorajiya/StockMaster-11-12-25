import hashlib
import hmac
import json
from typing import Iterable, Sequence

import requests
from django.utils import timezone

from .models import IntegrationEvent, WebhookConfiguration

REQUEST_TIMEOUT = 6  # seconds
SIGNATURE_HEADER = 'X-StockMaster-Signature'
EVENT_HEADER = 'X-StockMaster-Event'


def _sign_payload(secret: str, payload: dict) -> str:
    """Return HMAC-SHA256 signature for payload."""
    encoded = json.dumps(payload, separators=(',', ':'), default=str).encode('utf-8')
    digest = hmac.new(secret.encode('utf-8'), encoded, hashlib.sha256).hexdigest()
    return digest


def _deliver(event: IntegrationEvent) -> tuple[bool, str]:
    """Send webhook payload synchronously and update event state."""
    payload = event.payload
    webhook = event.webhook
    headers = {
        'Content-Type': 'application/json',
        EVENT_HEADER: event.event_type,
        SIGNATURE_HEADER: _sign_payload(webhook.secret, payload),
    }

    try:
        response = requests.post(
            webhook.url,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        if response.ok:
            event.mark_attempt(
                status='sent',
                response_status=response.status_code,
                response_body=response.text[:2000],
            )
            return True, 'Delivered successfully'

        event.mark_attempt(
            status='failed',
            response_status=response.status_code,
            response_body=response.text[:2000],
            increment_retry=True,
        )
        return False, f'Webhook returned HTTP {response.status_code}'

    except requests.RequestException as exc:
        event.mark_attempt(
            status='failed',
            response_status=None,
            response_body=str(exc),
            increment_retry=True,
        )
        return False, str(exc)


def emit_event(event_type: str, payload: dict, webhooks: Sequence[WebhookConfiguration] | None = None):
    """Persist an IntegrationEvent per matching webhook and deliver immediately."""
    if webhooks is None:
        webhooks = WebhookConfiguration.objects.filter(is_active=True)

    for webhook in webhooks:
        if not webhook.supports_event(event_type):
            continue

        event = IntegrationEvent.objects.create(
            webhook=webhook,
            event_type=event_type,
            payload=payload,
            status='pending',
        )
        _deliver(event)


def resend_event(event: IntegrationEvent) -> tuple[bool, str]:
    """Manually retry a historical event."""
    event.mark_attempt(status='retrying', increment_retry=True)
    return _deliver(event)

