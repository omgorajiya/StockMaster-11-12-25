from django.urls import path
from . import views

urlpatterns = [
    path('kpis/', views.dashboard_kpis, name='dashboard-kpis'),
    path('recent-activities/', views.recent_activities, name='recent-activities'),
    path('low-stock/', views.low_stock_products, name='low-stock'),
    path('abc-analysis/', views.abc_analysis, name='abc-analysis'),
    path('inventory-turnover/', views.inventory_turnover, name='inventory-turnover'),
    path('analytics/', views.analytics_dashboard, name='analytics-dashboard'),
    path('analytics/replenishment/', views.replenishment_suggestions, name='replenishment'),
    path('analytics/service-levels/', views.service_level_metrics, name='service-levels'),
    path('analytics/abc-xyz/', views.abc_xyz_analysis, name='abc-xyz'),
]

