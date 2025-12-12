from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IntegrationEventViewSet, WebhookConfigurationViewSet

router = DefaultRouter()
router.register(r'webhooks', WebhookConfigurationViewSet, basename='webhook')
router.register(r'events', IntegrationEventViewSet, basename='integration-event')

urlpatterns = [
    path('', include(router.urls)),
]

