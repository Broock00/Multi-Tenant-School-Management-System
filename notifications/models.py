from django.db import models
from users.models import User


class Notification(models.Model):
    """Notification model"""
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('assignment', 'Assignment'),
        ('exam', 'Exam'),
        ('fee', 'Fee'),
        ('attendance', 'Attendance'),
        ('chat', 'Chat'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='system_notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    related_object_type = models.CharField(max_length=50, blank=True)  # e.g., 'assignment', 'exam'
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.recipient.get_full_name()}"


class Announcement(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    title = models.CharField(max_length=200)
    content = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    author = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='announcements')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, null=True, blank=True, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    target_audience = models.JSONField(default=list)  # List of roles or 'all'

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
