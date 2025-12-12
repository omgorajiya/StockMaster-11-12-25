from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('password-reset/', views.request_password_reset, name='password-reset'),
    path('password-reset/verify/', views.verify_otp_and_reset_password, name='verify-otp'),
    path('profile/', views.get_profile, name='profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
]

