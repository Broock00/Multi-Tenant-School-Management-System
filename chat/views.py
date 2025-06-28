from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import ChatRoom, Message, Notification
from .serializers import (
    ChatRoomSerializer, MessageSerializer, NotificationSerializer, AnnouncementSerializer
)
from schools.models import SchoolCommunicationUsage, Subscription
from users.models import User, Parent
from datetime import datetime
from students.models import Student
from classes.models import Class
from django.utils import timezone
from notifications.models import Notification as NotificationModel, Announcement

# Create your views here.

class ChatRoomViewSet(viewsets.ModelViewSet):
    """Chat room management viewset"""
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter chat rooms based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return ChatRoom.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                # Teachers can see rooms they're part of or rooms with their students
                return ChatRoom.objects.filter(
                    Q(participants=user) |
                    Q(room_type='class', class_obj__subjects__teacher=teacher) |
                    Q(room_type='teacher_student', teacher=teacher)
                ).distinct()
            except:
                return ChatRoom.objects.filter(participants=user)
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                # Students can see rooms they're part of or their class rooms
                return ChatRoom.objects.filter(
                    Q(participants=user) |
                    Q(room_type='class', class_obj=student.current_class) |
                    Q(room_type='teacher_student', student=student)
                ).distinct()
            except:
                return ChatRoom.objects.filter(participants=user)
        
        return ChatRoom.objects.filter(participants=user)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a chat room"""
        room = self.get_object()
        user = request.user
        
        if user not in room.participants.all():
            room.participants.add(user)
            return Response({'message': 'Successfully joined the room'})
        return Response({'message': 'Already a member of this room'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a chat room"""
        room = self.get_object()
        user = request.user
        
        if user in room.participants.all():
            room.participants.remove(user)
            return Response({'message': 'Successfully left the room'})
        return Response({'message': 'Not a member of this room'})


class MessageViewSet(viewsets.ModelViewSet):
    """Message management viewset"""
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter messages based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Message.objects.all()
        else:
            # Users can only see messages from rooms they're part of
            room_ids = user.chat_rooms.values_list('id', flat=True)
            return Message.objects.filter(room_id__in=room_ids)
    
    def perform_create(self, serializer):
        """Set the sender when creating a message"""
        serializer.save(sender=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread message count for user"""
        user = request.user
        room_ids = user.chat_rooms.values_list('id', flat=True)
        
        unread_count = Message.objects.filter(
            room_id__in=room_ids,
            sender__id__in=user.chat_rooms.values_list('participants', flat=True),
            is_read=False
        ).exclude(sender=user).count()
        
        return Response({'unread_count': unread_count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        user = request.user
        
        if user in message.room.participants.all():
            message.is_read = True
            message.save()
            return Response({'message': 'Message marked as read'})
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)


class NotificationViewSet(viewsets.ModelViewSet):
    """Notification management viewset"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter notifications based on user role"""
        user = self.request.user
        return Notification.objects.filter(recipient=user)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        user = request.user
        notifications = Notification.objects.filter(
            recipient=user,
            is_read=False
        ).order_by('-created_at')
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        user = request.user
        
        if notification.recipient == user:
            notification.is_read = True
            notification.save()
            return Response({'message': 'Notification marked as read'})
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        user = request.user
        Notification.objects.filter(
            recipient=user,
            is_read=False
        ).update(is_read=True)
        
        return Response({'message': 'All notifications marked as read'})


class BulkMessageViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """
        Send bulk messages (email/SMS) to selected students, classes, or the whole school.
        Enforces plan limits for email and SMS.
        """
        user = request.user
        school = getattr(user, 'school', None)
        if not school:
            return Response({'error': 'User is not associated with a school.'}, status=400)

        # Parse request data
        target_type = request.data.get('target_type')  # 'student', 'class', 'classes', 'all', 'selected_students'
        target_ids = request.data.get('target_ids', [])
        send_email = request.data.get('send_email', False)
        send_sms = request.data.get('send_sms', False)
        sms_to = request.data.get('sms_to', 'student')  # 'student' or 'parent'
        title = request.data.get('title', '')
        message = request.data.get('message', '')

        # 1. Resolve recipients
        students = Student.objects.none()
        if target_type == 'student' or target_type == 'selected_students':
            students = Student.objects.filter(id__in=target_ids, school=school)
        elif target_type == 'class':
            students = Student.objects.filter(current_class_id__in=target_ids, school=school)
        elif target_type == 'classes':
            students = Student.objects.filter(current_class_id__in=target_ids, school=school)
        elif target_type == 'all':
            students = Student.objects.filter(school=school)
        else:
            return Response({'error': 'Invalid target_type'}, status=400)

        # 2. Build recipient lists
        email_recipients = set()
        sms_recipients = set()
        if send_email:
            email_recipients = set(s.user.email for s in students if s.user.email)
        if send_sms:
            if sms_to == 'student':
                sms_recipients = set(s.phone_number for s in students if s.phone_number)
            elif sms_to == 'parent':
                sms_recipients = set(s.emergency_contact for s in students if s.emergency_contact)
            else:
                return Response({'error': 'Invalid sms_to value'}, status=400)

        # 3. Plan enforcement
        now = timezone.now()
        year, month = now.year, now.month
        usage, _ = SchoolCommunicationUsage.objects.get_or_create(school=school, year=year, month=month)
        subscription = Subscription.objects.filter(school=school, status=Subscription.Status.ACTIVE).order_by('-end_date').first()
        if not subscription:
            return Response({'error': 'No active subscription for this school.'}, status=403)
        plan = subscription.plan
        max_emails = getattr(plan, 'max_emails_per_month', 0)
        max_sms = getattr(plan, 'max_sms_per_month', 0)
        if send_email and (usage.emails_sent + len(email_recipients) > max_emails):
            return Response({'error': f'Email limit exceeded: {usage.emails_sent}/{max_emails} sent this month.'}, status=403)
        if send_sms and (usage.sms_sent + len(sms_recipients) > max_sms):
            return Response({'error': f'SMS limit exceeded: {usage.sms_sent}/{max_sms} sent this month.'}, status=403)

        # 4. Send messages (mocked for now)
        emails_sent = 0
        sms_sent = 0
        for email in email_recipients:
            # TODO: Integrate with real email sending logic
            emails_sent += 1
        for phone in sms_recipients:
            # TODO: Integrate with real SMS sending logic
            sms_sent += 1
        usage.emails_sent += emails_sent
        usage.sms_sent += sms_sent
        usage.save()

        return Response({
            'message': 'Bulk message sent successfully.',
            'emails_sent': emails_sent,
            'sms_sent': sms_sent,
            'email_recipients': list(email_recipients),
            'sms_recipients': list(sms_recipients),
        }, status=200)
