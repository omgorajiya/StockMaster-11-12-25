from rest_framework import serializers
from .models import Notification, NotificationPreference, NotificationJobStatus
from accounts.models import User


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = '__all__'


class NotificationJobStatusSerializer(serializers.ModelSerializer):
    triggered_by_name = serializers.CharField(source='triggered_by.email', read_only=True)

    class Meta:
        model = NotificationJobStatus
        fields = '__all__'

