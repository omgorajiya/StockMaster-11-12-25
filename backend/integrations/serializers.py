from rest_framework import serializers

from .models import IntegrationEvent, WebhookConfiguration


class WebhookConfigurationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source='created_by.email',
        read_only=True,
    )

    class Meta:
        model = WebhookConfiguration
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by')
        extra_kwargs = {
            # Never return the shared secret in API responses
            'secret': {'write_only': True},
        }


class IntegrationEventSerializer(serializers.ModelSerializer):
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)

    class Meta:
        model = IntegrationEvent
        fields = '__all__'
        read_only_fields = ('created_at', 'sent_at', 'retry_count')

