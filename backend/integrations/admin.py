from django.contrib import admin

from .models import IntegrationEvent, WebhookConfiguration


@admin.register(WebhookConfiguration)
class WebhookConfigurationAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'is_active', 'created_at')
    search_fields = ('name', 'url')
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(IntegrationEvent)
class IntegrationEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'webhook', 'status', 'created_at', 'sent_at', 'retry_count')
    list_filter = ('status', 'event_type', 'webhook')
    search_fields = ('payload',)
    readonly_fields = ('payload', 'response_body', 'created_at', 'sent_at')
