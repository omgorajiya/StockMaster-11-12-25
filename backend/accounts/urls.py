from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'invites', views.InviteViewSet, basename='invite')
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('password-reset/', views.request_password_reset, name='password-reset'),
    path('password-reset/verify/', views.verify_otp_and_reset_password, name='verify-otp'),
    path('profile/', views.get_profile, name='profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
]

