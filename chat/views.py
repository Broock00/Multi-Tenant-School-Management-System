from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import ChatRoom, Message, Notification, MessageRead
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
from rest_framework.exceptions import PermissionDenied
from django.http import HttpResponse, Http404
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import mimetypes

# Create your views here.

class ChatRoomViewSet(viewsets.ModelViewSet):
    """Chat room management viewset"""
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter chat rooms based on user role, restricting secretaries from chatting with super admins, but allowing school admins of the same school."""
        user = self.request.user
        qs = ChatRoom.objects.all()
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return qs
        elif user.role == user.UserRole.SECRETARY:
            # Secretaries: can only see rooms where all participants are not super admins, and if school admin is present, must be from the same school
            return qs.filter(
                participants__user__role__in=[user.UserRole.SECRETARY, user.UserRole.SCHOOL_ADMIN, user.UserRole.TEACHER, user.UserRole.STUDENT, user.UserRole.PARENT, user.UserRole.ACCOUNTANT, user.UserRole.LIBRARIAN, user.UserRole.NURSE, user.UserRole.SECURITY],
                participants__user__school=user.school
            ).exclude(participants__user__role=user.UserRole.SUPER_ADMIN).distinct()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return qs.filter(
                    Q(participants__user=user) |
                    Q(room_type='class', class_obj__subjects__teacher=teacher) |
                    Q(room_type='teacher_student', teacher=teacher)
                ).distinct()
            except:
                return qs.filter(participants__user=user)
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return qs.filter(
                    Q(participants__user=user) |
                    Q(room_type='class', class_obj=student.current_class) |
                    Q(room_type='teacher_student', student=student)
                ).distinct()
            except:
                return qs.filter(participants__user=user)
        return qs.filter(participants__user=user)
    
    def perform_create(self, serializer):
        user = self.request.user
        participants = self.request.data.get('participants', [])
        # Prevent secretaries from creating rooms with super admins
        if user.role == user.UserRole.SECRETARY:
            super_admins = User.objects.filter(id__in=participants, role=User.UserRole.SUPER_ADMIN)
            if super_admins.exists():
                raise PermissionDenied('Secretaries cannot create chat rooms with system admins.')
        return super().perform_create(serializer)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a chat room"""
        room = self.get_object()
        user = request.user
        # Prevent secretaries from joining rooms with super admins
        if user.role == user.UserRole.SECRETARY and room.participants.filter(user__role=User.UserRole.SUPER_ADMIN).exists():
            return Response({'detail': 'Secretaries cannot join chat rooms with system admins.'}, status=403)
        if not room.participants.filter(user=user).exists():
            from .models import ChatParticipant
            ChatParticipant.objects.create(room=room, user=user)
            return Response({'message': 'Successfully joined the room'})
        return Response({'message': 'Already a member of this room'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a chat room"""
        room = self.get_object()
        user = request.user
        
        if room.participants.filter(user=user).exists():
            from .models import ChatParticipant
            ChatParticipant.objects.filter(room=room, user=user).delete()
            return Response({'message': 'Successfully left the room'})
        return Response({'message': 'Not a member of this room'})


class MessageViewSet(viewsets.ModelViewSet):
    """Message management viewset"""
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter messages based on user role and room"""
        user = self.request.user
        queryset = super().get_queryset()
        room_id = self.request.query_params.get('room')
        if room_id:
            queryset = queryset.filter(room_id=room_id)
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return queryset
        else:
            # Users can only see messages from rooms they're part of
            room_ids = user.chat_participations.values_list('room_id', flat=True)
            return queryset.filter(room_id__in=room_ids)
    
    def perform_create(self, serializer):
        """Set the sender when creating a message and mark as unread for all recipients except sender"""
        message = serializer.save(sender=self.request.user)
        
        # Mark message as unread for all room participants except the sender
        room_participants = message.room.participants.all()
        for participant in room_participants:
            if participant.user != self.request.user:
                MessageRead.objects.get_or_create(
                    message=message,
                    user=participant.user,
                    defaults={'read_at': None}
                )
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread message count for user"""
        user = request.user
        room_ids = user.chat_participations.values_list('room_id', flat=True)
        
        # Count messages that haven't been read by this user
        unread_count = Message.objects.filter(
            room_id__in=room_ids
        ).exclude(
            sender=user
        ).exclude(
            read_by__user=user
        ).count()
        
        return Response({'unread_count': unread_count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        user = request.user
        
        if message.room.participants.filter(user=user).exists():
            # Create or update MessageRead record
            MessageRead.objects.get_or_create(
                message=message,
                user=user,
                defaults={'read_at': timezone.now()}
            )
            return Response({'message': 'Message marked as read'})
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    @action(detail=False, methods=['post'])
    def mark_room_read(self, request):
        """Mark all messages in a room as read for the current user"""
        user = request.user
        room_id = request.data.get('room_id')
        
        if not room_id:
            return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all unread messages in the room for this user
        unread_messages = Message.objects.filter(
            room_id=room_id
        ).exclude(
            sender=user
        ).exclude(
            read_by__user=user
        )
        
        # Mark all as read
        for message in unread_messages:
            MessageRead.objects.get_or_create(
                message=message,
                user=user,
                defaults={'read_at': timezone.now()}
            )
        
        return Response({'message': f'Marked {unread_messages.count()} messages as read'})

    @action(detail=False, methods=['post'])
    def upload_file(self, request):
        """Upload a file and create a message with the file attachment"""
        user = request.user
        room_id = request.data.get('room_id')
        file_obj = request.FILES.get('file')
        
        if not room_id:
            return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant in the room
        if not room.participants.filter(user=user).exists():
            return Response({'error': 'Not authorized to send messages in this room'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate file size (10MB limit)
        if file_obj.size > 10 * 1024 * 1024:
            return Response({'error': 'File size too large. Maximum size is 10MB'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type
        allowed_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv'
        ]
        
        if file_obj.content_type not in allowed_types:
            return Response({'error': 'File type not allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the message with file attachment
        message = Message.objects.create(
            room=room,
            sender=user,
            content=f"📎 {file_obj.name}",
            message_type=Message.MessageType.FILE,
            attachment=file_obj,
            attachment_name=file_obj.name
        )
        
        # Mark message as unread for all room participants except the sender
        room_participants = room.participants.all()
        for participant in room_participants:
            if participant.user != user:
                MessageRead.objects.get_or_create(
                    message=message,
                    user=participant.user,
                    defaults={'read_at': None}
                )
        
        serializer = MessageSerializer(message)
        return Response({
            'message': 'File uploaded successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def download_file(self, request, pk=None):
        """Download a file attachment from a message"""
        message = self.get_object()
        user = request.user
        
        # Check if user is a participant in the room
        if not message.room.participants.filter(user=user).exists():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        if not message.attachment:
            return Response({'error': 'No file attachment found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Get file path and check if it exists
            file_path = message.attachment.path
            if not os.path.exists(file_path):
                return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Read and return file
            with open(file_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type=content_type)
                response['Content-Disposition'] = f'attachment; filename="{message.attachment_name}"'
                return response
                
        except Exception as e:
            return Response({'error': 'Error downloading file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def get_file_info(self, request, pk=None):
        """Get file information for a message"""
        message = self.get_object()
        user = request.user
        
        # Check if user is a participant in the room
        if not message.room.participants.filter(user=user).exists():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        if not message.attachment:
            return Response({'error': 'No file attachment found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            file_path = message.attachment.path
            if not os.path.exists(file_path):
                return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
            
            file_size = os.path.getsize(file_path)
            content_type, _ = mimetypes.guess_type(file_path)
            
            return Response({
                'id': message.id,
                'filename': message.attachment_name,
                'size': file_size,
                'content_type': content_type,
                'uploaded_at': message.created_at,
                'uploaded_by': message.sender.username
            })
            
        except Exception as e:
            return Response({'error': 'Error getting file info'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['delete'])
    def delete_file(self, request, pk=None):
        """Delete a file attachment from a message"""
        message = self.get_object()
        user = request.user
        
        # Check if user is the sender or has admin privileges
        if user != message.sender and user.role not in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN]:
            return Response({'error': 'Not authorized to delete this file'}, status=status.HTTP_403_FORBIDDEN)
        
        if not message.attachment:
            return Response({'error': 'No file attachment found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Delete the file from storage
            if message.attachment:
                message.attachment.delete(save=False)
            
            # Update message to remove attachment
            message.attachment = None
            message.attachment_name = ''
            message.content = "🗑️ File deleted"
            message.save()
            
            return Response({'message': 'File deleted successfully'})
            
        except Exception as e:
            return Response({'error': 'Error deleting file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
