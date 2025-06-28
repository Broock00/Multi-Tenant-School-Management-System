from django.urls import path
from .views import SystemSettingsView

urlpatterns = [
    path('system-settings/', SystemSettingsView.as_view(), name='system-settings'),
] 