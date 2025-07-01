from rest_framework import serializers
from .models import ChatRoom, Message, Notification
from core.models import SystemSettings
from notifications.models import Announcement
from users.models import User
from .models import ChatParticipant


class ChatRoomSerializer(serializers.ModelSerializer):
    """Chat room serializer"""
    participants = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True, required=True
    )
    participants_info = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'class_obj',
            'participants', 'participants_info', 'last_message', 'unread_count',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        participants = validated_data.pop('participants', [])
        room = super().create(validated_data)
        for user in participants:
            ChatParticipant.objects.create(room=room, user=user)
        return room
    
    def get_participants_info(self, obj):
        return [{
            'id': p.user.id,
            'name': p.user.get_full_name(),
            'role': p.user.get_role_display(),
            'profile_picture': p.user.profile_picture.url if p.user.profile_picture else None
        } for p in obj.participants.all()]
    
    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            return {
                'id': last_message.id,
                'content': last_message.content,
                'sender_name': last_message.sender.get_full_name(),
                'created_at': last_message.created_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Messages not sent by the user and not read by the user
            return obj.messages.exclude(sender=request.user).exclude(read_by__user=request.user).count()
        return 0


class MessageSerializer(serializers.ModelSerializer):
    """Message serializer"""
    sender_info = serializers.SerializerMethodField()
    room_info = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'room', 'room_info', 'sender', 'sender_info', 'content',
            'attachment', 'created_at', 'updated_at', 'is_read'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'updated_at']
    
    def get_sender_info(self, obj):
        return {
            'id': obj.sender.id,
            'name': obj.sender.get_full_name(),
            'role': obj.sender.get_role_display(),
            'profile_picture': obj.sender.profile_picture.url if obj.sender.profile_picture else None
        }
    
    def get_room_info(self, obj):
        return {
            'id': obj.room.id,
            'name': obj.room.name,
            'room_type': obj.room.room_type
        }

    def get_is_read(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.read_by.filter(user=request.user).exists()
        return False

    def validate_attachment(self, value):
        if value:
            settings = SystemSettings.get_solo()
            max_size = settings.max_file_size * 1024 * 1024  # MB to bytes
            if value.size > max_size:
                raise serializers.ValidationError(f"File size exceeds the maximum allowed size of {settings.max_file_size} MB.")
        return value


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
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'type', 'priority', 'author', 'author_name',
            'created_at', 'is_active', 'target_audience'
        ]
        read_only_fields = ['id', 'created_at', 'author_name'] 