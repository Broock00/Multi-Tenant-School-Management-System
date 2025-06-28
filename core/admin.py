from django.contrib import admin
from .models import SystemSettings

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['maintenance_mode', 'auto_backup', 'backup_frequency', 'updated_at']
