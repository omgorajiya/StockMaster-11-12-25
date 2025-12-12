"""
ASGI config for stockmaster project.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stockmaster.settings')

application = get_asgi_application()

