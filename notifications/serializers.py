from rest_framework import serializers
from .models import Notification, Announcement


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    sender_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'sender_info', 'title', 'message',
            'notification_type', 'related_object_type', 'related_object_id',
            'is_read', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'recipient', 'created_at', 'updated_at']
    
    def get_sender_info(self, obj):
        if obj.sender:
            return {
                'id': obj.sender.id,
                'name': obj.sender.get_full_name(),
                'role': obj.sender.get_role_display()
            }
        return None 

class AnnouncementSerializer(serializers.ModelSerializer):
    author_info = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = '__all__'  # school will now be included automatically

    def get_author_info(self, obj):
        if obj.author:
            return {
                'id': obj.author.id,
                'username': obj.author.username,
                'full_name': obj.author.get_full_name(),
                'role': obj.author.role,
            }
        return None 