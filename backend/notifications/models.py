from django.db import models
from django.utils import timezone
from accounts.models import User


class Notification(models.Model):
    """Notification model for real-time alerts"""
    NOTIFICATION_TYPES = [
        ('low_stock', 'Low Stock Alert'),
        ('out_of_stock', 'Out of Stock'),
        ('expiry_warning', 'Expiry Warning'),
        ('pending_approval', 'Pending Approval'),
        ('delivery_due', 'Delivery Due'),
        ('anomaly', 'Anomaly Detected'),
        ('overstock', 'Overstock Alert'),
        ('quality_issue', 'Quality Issue'),
    ]

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_object_type = models.CharField(max_length=50, blank=True)  # e.g., 'product', 'receipt'
    related_object_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['notification_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email if self.user else 'All Users'}"

    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = timezone.now()
        self.save()


class NotificationPreference(models.Model):
    """User notification preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    quiet_hours_start = models.TimeField(null=True, blank=True)  # e.g., 21:00
    quiet_hours_end = models.TimeField(null=True, blank=True)  # e.g., 07:00
    
    # Per-type preferences
    low_stock_enabled = models.BooleanField(default=True)
    out_of_stock_enabled = models.BooleanField(default=True)
    expiry_warning_enabled = models.BooleanField(default=True)
    pending_approval_enabled = models.BooleanField(default=True)
    delivery_due_enabled = models.BooleanField(default=True)
    anomaly_enabled = models.BooleanField(default=True)
    overstock_enabled = models.BooleanField(default=True)
    quality_issue_enabled = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Notification Preferences - {self.user.email}"


class NotificationJobStatus(models.Model):
    """Track background notification job executions."""

    JOB_LOW_STOCK = 'low_stock_digest'
    JOB_DAILY_SUMMARY = 'daily_summary'
    JOB_CHOICES = [
        (JOB_LOW_STOCK, 'Low stock digest'),
        (JOB_DAILY_SUMMARY, 'Daily summary'),
    ]
    STATUS_CHOICES = [
        ('idle', 'Idle'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    job_name = models.CharField(max_length=50, choices=JOB_CHOICES, unique=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    last_duration_ms = models.IntegerField(null=True, blank=True)
    last_message = models.TextField(blank=True)
    triggered_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='triggered_notification_jobs',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['job_name']

    def __str__(self):
        return f"{self.job_name} ({self.last_status})"

