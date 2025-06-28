from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Notification, Announcement
from .serializers import NotificationSerializer, AnnouncementSerializer

User = get_user_model()

class NotificationViewSet(viewsets.ModelViewSet):
    """Notification viewset"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(recipient=self.request.user)
    
    def perform_create(self, serializer):
        """Set the sender to the current user"""
        serializer.save(sender=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent notifications (last 10)"""
        notifications = self.get_queryset()[:10]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        announcement = serializer.save(author=self.request.user)
        
        try:
            # Get target audience from the announcement
            target_roles = announcement.target_audience
            users = User.objects.none()
            
            if 'all' in target_roles:
                # Send to both super admins and school admins
                users = User.objects.filter(role__in=['super_admin', 'school_admin'])
            elif 'super_admin' in target_roles:
                # Send only to super admins
                users = User.objects.filter(role='super_admin')
            elif 'school_admin' in target_roles:
                # Send only to school admins
                users = User.objects.filter(role='school_admin')
            
            print(f"Creating notifications for {users.count()} users based on target_audience {target_roles}: {list(users.values_list('username', 'role'))}")
            
            for user in users:
                notification = Notification.objects.create(
                    recipient=user,
                    sender=self.request.user,
                    title=announcement.title,
                    message=announcement.content,
                    notification_type='info'
                )
                print(f"Created notification {notification.id} for user {user.username}")
                
        except Exception as e:
            print(f"Error creating notifications: {e}")
            # Don't fail the announcement creation if notification creation fails 