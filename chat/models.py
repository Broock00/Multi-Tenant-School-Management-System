from django.db import models
from django.utils.translation import gettext_lazy as _


class ChatRoom(models.Model):
    """Chat rooms for different purposes"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    class RoomType(models.TextChoices):
        CLASS = 'class', _('Class Room')
        STAFF = 'staff', _('Staff Room')
        PARENT_TEACHER = 'parent_teacher', _('Parent-Teacher')
        ADMIN = 'admin', _('Administrative')
        GENERAL = 'general', _('General')
    
    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.GENERAL)
    class_obj = models.ForeignKey('classes.Class', on_delete=models.CASCADE, null=True, blank=True, related_name='chat_rooms')
    is_active = models.BooleanField(default=True)
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()})"


class ChatParticipant(models.Model):
    """Participants in chat rooms"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='chat_participations')
    
    class Role(models.TextChoices):
        ADMIN = 'admin', _('Admin')
        MODERATOR = 'moderator', _('Moderator')
        MEMBER = 'member', _('Member')
        READ_ONLY = 'read_only', _('Read Only')
    
    role = models.CharField(max_length=15, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['room', 'user']
    
    def __str__(self):
        return f"{self.user.username} in {self.room.name}"


class Message(models.Model):
    """Chat messages"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    
    class MessageType(models.TextChoices):
        TEXT = 'text', _('Text')
        IMAGE = 'image', _('Image')
        FILE = 'file', _('File')
        SYSTEM = 'system', _('System Message')
        NOTIFICATION = 'notification', _('Notification')
    
    message_type = models.CharField(max_length=15, choices=MessageType.choices, default=MessageType.TEXT)
    attachment = models.FileField(upload_to='chat_attachments/', blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    
    # Message status
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    # Reply functionality
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}..."


class MessageRead(models.Model):
    """Track message read status"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_by')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='read_messages')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'user']
    
    def __str__(self):
        return f"{self.user.username} read message at {self.read_at}"


class Notification(models.Model):
    """System notifications"""
    recipient = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='chat_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    class NotificationType(models.TextChoices):
        INFO = 'info', _('Information')
        SUCCESS = 'success', _('Success')
        WARNING = 'warning', _('Warning')
        ERROR = 'error', _('Error')
        REMINDER = 'reminder', _('Reminder')
        ANNOUNCEMENT = 'announcement', _('Announcement')
    
    notification_type = models.CharField(max_length=15, choices=NotificationType.choices, default=NotificationType.INFO)
    
    # Delivery methods
    is_sms_sent = models.BooleanField(default=False)
    is_email_sent = models.BooleanField(default=False)
    is_push_sent = models.BooleanField(default=False)
    is_in_app_sent = models.BooleanField(default=True)
    
    # Read status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_url = models.URLField(blank=True)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.recipient.username} - {self.title}"


class BulkMessage(models.Model):
    """Bulk messaging for announcements"""
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='bulk_messages')
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    class TargetAudience(models.TextChoices):
        ALL = 'all', _('All Users')
        STUDENTS = 'students', _('Students')
        TEACHERS = 'teachers', _('Teachers')
        PARENTS = 'parents', _('Parents')
        ADMINISTRATORS = 'administrators', _('Administrators')
        SPECIFIC_CLASS = 'specific_class', _('Specific Class')
        SPECIFIC_USERS = 'specific_users', _('Specific Users')
    
    target_audience = models.CharField(max_length=20, choices=TargetAudience.choices)
    target_class = models.ForeignKey('classes.Class', on_delete=models.CASCADE, null=True, blank=True)
    target_users = models.ManyToManyField('users.User', blank=True, related_name='targeted_bulk_messages')
    
    # Delivery status
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    
    # Delivery methods
    send_sms = models.BooleanField(default=False)
    send_email = models.BooleanField(default=False)
    send_push = models.BooleanField(default=False)
    send_in_app = models.BooleanField(default=True)
    
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.get_target_audience_display()}"


class ChatSettings(models.Model):
    """Chat settings for users"""
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='chat_settings')
    
    # Notification preferences
    enable_notifications = models.BooleanField(default=True)
    enable_sound = models.BooleanField(default=True)
    enable_vibration = models.BooleanField(default=True)
    
    # Privacy settings
    show_online_status = models.BooleanField(default=True)
    allow_direct_messages = models.BooleanField(default=True)
    
    # Message settings
    auto_delete_messages = models.BooleanField(default=False)
    message_retention_days = models.PositiveIntegerField(default=30)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Chat settings for {self.user.username}"

