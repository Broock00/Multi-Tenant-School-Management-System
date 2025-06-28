from django.db import models
from django.conf import settings
from pathlib import Path
import os

# Create your models here.

class SystemSettings(models.Model):
    maintenance_mode = models.BooleanField(default=False)
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    auto_backup = models.BooleanField(default=True)
    session_timeout = models.PositiveIntegerField(default=30)  # minutes
    data_retention = models.PositiveIntegerField(default=365)  # days
    max_file_size = models.PositiveIntegerField(default=10)  # MB
    language = models.CharField(max_length=10, default='en')
    updated_at = models.DateTimeField(auto_now=True)
    BACKUP_FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    backup_frequency = models.CharField(max_length=10, choices=BACKUP_FREQUENCY_CHOICES, default='daily')
    maintenance_bypass_users = models.TextField(
        blank=True, default="", help_text="Comma-separated usernames or emails allowed during maintenance mode."
    )

    def save(self, *args, **kwargs):
        self.pk = 1  # Always use the same PK
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'System Settings'

    @classmethod
    def email_enabled(cls):
        return cls.get_solo().email_notifications

    @classmethod
    def sms_enabled(cls):
        return cls.get_solo().sms_notifications

    @classmethod
    def auto_backup_enabled(cls):
        return cls.get_solo().auto_backup

    @classmethod
    def get_data_retention_days(cls):
        return cls.get_solo().data_retention

    def get_latest_backup_file(self):
        backup_dir = Path(settings.BASE_DIR) / 'backups'
        if not backup_dir.exists():
            return None
        files = list(backup_dir.glob('db_backup_*'))
        if not files:
            return None
        latest = max(files, key=os.path.getctime)
        return str(latest)
    
    def get_bypass_usernames(self):
        return [u.strip() for u in self.maintenance_bypass_users.split(",") if u.strip()]
