from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from accounts.models import User
from products.models import Product, StockItem

from .models import Notification, NotificationJobStatus, NotificationPreference


def _eligible_users(pref_attr: str) -> list[User]:
    """Return users whose notification preferences allow the given attribute."""
    users = User.objects.filter(is_active=True).select_related('notification_preferences')
    eligible = []
    for user in users:
        prefs: NotificationPreference | None = getattr(user, 'notification_preferences', None)
        if prefs is None or getattr(prefs, pref_attr, True):
            eligible.append(user)
    return eligible


def _run_low_stock_digest() -> int:
    """Create low-stock notifications for products at/below reorder level."""
    stock_by_product = StockItem.objects.values('product').annotate(total=Sum('quantity'))
    stock_dict = {row['product']: row['total'] or 0 for row in stock_by_product}

    products = Product.objects.filter(is_active=True)
    low_stock_products = [
        product for product in products
        if stock_dict.get(product.id, 0) <= product.reorder_level
    ]

    if not low_stock_products:
        return 0

    recipients = _eligible_users('low_stock_enabled')
    notifications_created = 0

    for product in low_stock_products:
        current_qty = stock_dict.get(product.id, 0)
        for user in recipients:
            exists = Notification.objects.filter(
                user=user,
                notification_type='low_stock',
                related_object_type='product',
                related_object_id=product.id,
                is_read=False,
            ).exists()
            if exists:
                continue

            Notification.objects.create(
                user=user,
                notification_type='low_stock',
                priority='high',
                title=f"Low stock: {product.name}",
                message=f"{product.name} is at {current_qty} units (reorder level {product.reorder_level}).",
                related_object_type='product',
                related_object_id=product.id,
            )
            notifications_created += 1

    return notifications_created


def _run_daily_summary() -> int:
    """Summarize the past day's notifications for each user."""
    since = timezone.now() - timedelta(days=1)
    users = _eligible_users('delivery_due_enabled')
    summaries_created = 0

    for user in users:
        recent_count = Notification.objects.filter(user=user, created_at__gte=since).count()
        if recent_count == 0:
            continue
        Notification.objects.create(
            user=user,
            notification_type='delivery_due',
            priority='low',
            title='Daily activity summary',
            message=f"You received {recent_count} notifications in the last 24 hours.",
        )
        summaries_created += 1

    return summaries_created


def run_notification_job(job_name: str, triggered_by: User | None = None) -> tuple[bool, str]:
    """Execute a background notification job and persist status."""
    status_obj, _ = NotificationJobStatus.objects.get_or_create(job_name=job_name)
    status_obj.last_status = 'running'
    status_obj.triggered_by = triggered_by
    status_obj.save(update_fields=['last_status', 'triggered_by', 'updated_at'])

    started = timezone.now()
    try:
        if job_name == NotificationJobStatus.JOB_LOW_STOCK:
            processed = _run_low_stock_digest()
            message = f"Created {processed} low-stock alerts"
            next_run = started + timedelta(hours=1)
        elif job_name == NotificationJobStatus.JOB_DAILY_SUMMARY:
            processed = _run_daily_summary()
            message = f"Queued {processed} daily summaries"
            next_run = started + timedelta(days=1)
        else:
            raise ValueError(f"Unknown job {job_name}")

        duration_ms = int((timezone.now() - started).total_seconds() * 1000)
        status_obj.last_status = 'success'
        status_obj.last_run_at = started
        status_obj.next_run_at = next_run
        status_obj.last_duration_ms = duration_ms
        status_obj.last_message = message
        status_obj.save(update_fields=[
            'last_status',
            'last_run_at',
            'next_run_at',
            'last_duration_ms',
            'last_message',
            'updated_at',
        ])
        return True, message

    except Exception as exc:
        duration_ms = int((timezone.now() - started).total_seconds() * 1000)
        status_obj.last_status = 'failed'
        status_obj.last_run_at = started
        status_obj.last_duration_ms = duration_ms
        status_obj.last_message = str(exc)
        status_obj.save(update_fields=[
            'last_status',
            'last_run_at',
            'last_duration_ms',
            'last_message',
            'updated_at',
        ])
        return False, str(exc)

