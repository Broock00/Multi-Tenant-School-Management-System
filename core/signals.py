from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SystemSettings
from django.conf import settings

try:
    from django_celery_beat.models import PeriodicTask, IntervalSchedule
except ImportError:
    PeriodicTask = None
    IntervalSchedule = None

@receiver(post_save, sender=SystemSettings)
def update_backup_schedule(sender, instance, **kwargs):
    if not PeriodicTask or not IntervalSchedule:
        return  # django-celery-beat not installed
    # Remove old schedule
    PeriodicTask.objects.filter(name='auto-backup-task').delete()
    if not instance.auto_backup:
        return
    # Determine interval
    if instance.backup_frequency == 'daily':
        interval, _ = IntervalSchedule.objects.get_or_create(every=1, period=IntervalSchedule.DAYS)
    elif instance.backup_frequency == 'weekly':
        interval, _ = IntervalSchedule.objects.get_or_create(every=7, period=IntervalSchedule.DAYS)
    elif instance.backup_frequency == 'monthly':
        interval, _ = IntervalSchedule.objects.get_or_create(every=30, period=IntervalSchedule.DAYS)
    else:
        interval, _ = IntervalSchedule.objects.get_or_create(every=1, period=IntervalSchedule.DAYS)
    # Create new periodic task
    PeriodicTask.objects.create(
        interval=interval,
        name='auto-backup-task',
        task='core.tasks.run_auto_backup',
        enabled=True,
    ) 