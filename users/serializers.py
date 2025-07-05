from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Teacher, Principal, Accountant, UserPermission, UserActivity, Parent
from schools.models import School, Subscription
from core.models import SystemSettings
from django.utils import timezone
from users.models import User


class SchoolSerializer(serializers.ModelSerializer):
    """School serializer for nested display"""
    class Meta:
        model = School
        fields = ['id', 'name', 'code']


class UserSerializer(serializers.ModelSerializer):
    """Base user serializer"""
    school = SchoolSerializer(read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        queryset=School.objects.all(), source='school', write_only=True, required=False
    )
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.SerializerMethodField()
    dashboard_url = serializers.CharField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'phone', 'address', 'date_of_birth',
            'profile_picture', 'school', 'school_id', 'is_active', 'is_verified',
            'dashboard_url', 'created_at', 'updated_at', 'password'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def validate(self, attrs):
        """Validate user data"""
        role = attrs.get('role') or getattr(self.instance, 'role', None)
        school = attrs.get('school') or getattr(self.instance, 'school', None)
        if role == 'school_admin' and not school:
            raise serializers.ValidationError({'school_id': 'School is required for school admin users.'})
        
        # Check if username is unique
        username = attrs.get('username')
        email = attrs.get('email')
        
        if username:
            if User.objects.filter(username=username).exists():
                if self.instance and self.instance.username == username:
                    pass  # Same user, allow update
                else:
                    raise serializers.ValidationError({'username': 'Username already exists.'})
        
        if email:
            if User.objects.filter(email=email).exists():
                if self.instance and self.instance.email == email:
                    pass  # Same user, allow update
                else:
                    raise serializers.ValidationError({'email': 'Email already exists.'})
        
        # Validate role field
        if role:
            valid_roles = dict(User.UserRole.choices).keys()
            if role not in valid_roles:
                raise serializers.ValidationError({
                    'role': f'Invalid role "{role}". Must be one of: {list(valid_roles)}'
                })
        
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        """Update user with password handling"""
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def validate_profile_picture(self, value):
        if value:
            settings = SystemSettings.get_solo()
            max_size = settings.max_file_size * 1024 * 1024  # MB to bytes
            if value.size > max_size:
                raise serializers.ValidationError(f"File size exceeds the maximum allowed size of {settings.max_file_size} MB.")
        return value


class TeacherSerializer(serializers.ModelSerializer):
    """Teacher serializer with user data"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    subjects = serializers.SerializerMethodField()
    
    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_id', 'employee_id', 'department', 'qualification',
            'experience_years', 'subjects', 'is_head_teacher',
            'can_manage_students', 'can_manage_attendance', 'can_manage_grades',
            'can_send_notifications', 'can_view_reports'
        ]
    
    def get_subjects(self, obj):
        return [{'id': subject.id, 'name': subject.name, 'code': subject.code} 
                for subject in obj.subjects.all()]


class PrincipalSerializer(serializers.ModelSerializer):
    """Principal serializer with user data"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Principal
        fields = [
            'id', 'user', 'user_id', 'employee_id', 'qualification',
            'experience_years', 'can_manage_teachers', 'can_manage_students',
            'can_manage_classes', 'can_view_all_reports', 'can_approve_requests',
            'can_send_bulk_notifications'
        ]


class AccountantSerializer(serializers.ModelSerializer):
    """Accountant serializer with user data"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Accountant
        fields = [
            'id', 'user', 'user_id', 'employee_id', 'department',
            'can_manage_fees', 'can_view_financial_reports', 'can_process_payments',
            'can_send_fee_reminders', 'can_manage_scholarships'
        ]


class UserPermissionSerializer(serializers.ModelSerializer):
    """User permission serializer"""
    class Meta:
        model = UserPermission
        fields = ['id', 'user', 'permission_name', 'is_granted', 'created_at']


class UserActivitySerializer(serializers.ModelSerializer):
    """User activity serializer"""
    class Meta:
        model = UserActivity
        fields = ['id', 'user', 'action', 'details', 'ip_address', 'user_agent', 'created_at']


class LoginSerializer(serializers.Serializer):
    """Login serializer"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            # Subscription lockout logic
            if hasattr(user, 'role') and user.role != user.UserRole.SUPER_ADMIN and hasattr(user, 'school') and user.school:
                today = timezone.now().date()
                subscription = user.school.current_subscription
                if subscription:
                    status = getattr(subscription, 'computed_status', subscription.status)
                    if status == Subscription.Status.CANCELLED:
                        raise serializers.ValidationError('Your subscription has been cancelled. Please contact your administrator to renew.')
                    elif status == Subscription.Status.EXPIRED:
                        raise serializers.ValidationError('Your subscription expired more than 7 days ago. Please contact your administrator to renew.')
                    # PENDING: allow login (read-only enforced by middleware)
                    # ACTIVE: allow login
                else:
                    # No active subscription, check for most recent expired or cancelled subscription
                    expired_sub = user.school.subscriptions.filter(status__in=[Subscription.Status.EXPIRED, Subscription.Status.CANCELLED]).order_by('-end_date').first()
                    if expired_sub:
                        status = getattr(expired_sub, 'computed_status', expired_sub.status)
                        if status == Subscription.Status.CANCELLED:
                            raise serializers.ValidationError('Your subscription has been cancelled. Please contact your administrator to renew.')
                        elif status == Subscription.Status.EXPIRED:
                            raise serializers.ValidationError('Your subscription expired more than 7 days ago. Please contact your administrator to renew.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password.')
        
        return attrs


class DashboardSerializer(serializers.Serializer):
    """Dashboard data serializer for different user roles"""
    user = UserSerializer(source='*')
    role_specific_data = serializers.SerializerMethodField()
    notifications = serializers.SerializerMethodField()
    recent_activities = serializers.SerializerMethodField()
    quick_stats = serializers.SerializerMethodField()
    subscription_alert = serializers.SerializerMethodField()
    school_stats = serializers.SerializerMethodField()
    
    def get_role_specific_data(self, obj):
        """Get role-specific data for dashboard"""
        if obj.role == User.UserRole.TEACHER:
            try:
                teacher = obj.teacher_profile
                return {
                    'teacher_id': teacher.id,
                    'employee_id': teacher.employee_id,
                    'department': teacher.department,
                    'subjects_count': teacher.subjects.count(),
                    'classes_teaching': teacher.subjects.count(),
                    'students_count': sum([cs.class_obj.students.count() for cs in teacher.subjects.all()])
                }
            except Teacher.DoesNotExist:
                return {}
        
        elif obj.role == User.UserRole.STUDENT:
            try:
                from students.models import Student
                student = obj.student_profile
                return {
                    'student_id': student.student_id,
                    'class': student.current_class.name if student.current_class else None,
                    'section': student.current_class.section if student.current_class else None,
                    'enrollment_date': student.enrollment_date,
                    'academic_status': student.academic_status
                }
            except Student.DoesNotExist:
                return {}
        
        elif obj.role == User.UserRole.PRINCIPAL:
            try:
                principal = obj.principal_profile
                return {
                    'principal_id': principal.id,
                    'employee_id': principal.employee_id,
                    'qualification': principal.qualification,
                    'experience_years': principal.experience_years
                }
            except Principal.DoesNotExist:
                return {}
        
        elif obj.role == User.UserRole.ACCOUNTANT:
            try:
                accountant = obj.accountant_profile
                return {
                    'accountant_id': accountant.id,
                    'employee_id': accountant.employee_id,
                    'department': accountant.department
                }
            except Accountant.DoesNotExist:
                return {}
        
        return {}
    
    def get_notifications(self, obj):
        """Get user notifications"""
        from notifications.models import Notification
        notifications = Notification.objects.filter(recipient=obj, is_read=False)[:5]
        return [{
            'id': notif.id,
            'title': notif.title,
            'message': notif.message,
            'type': notif.notification_type,
            'created_at': notif.created_at
        } for notif in notifications]
    
    def get_recent_activities(self, obj):
        """Get recent user activities"""
        activities = obj.activities.order_by('-created_at')[:5]
        return [{
            'id': activity.id,
            'action': activity.action,
            'created_at': activity.created_at
        } for activity in activities]
    
    def get_quick_stats(self, obj):
        """Get quick stats based on user role"""
        if obj.role == User.UserRole.TEACHER:
            return {
                'students_count': self.get_teacher_students_count(obj),
                'classes_count': self.get_teacher_classes_count(obj),
                'pending_assignments': self.get_pending_assignments_count(obj)
            }
        elif obj.role == User.UserRole.STUDENT:
            return {
                'attendance_percentage': self.get_student_attendance_percentage(obj),
                'pending_fees': self.get_student_pending_fees(obj),
                'upcoming_exams': self.get_upcoming_exams_count(obj)
            }
        elif obj.role == User.UserRole.ACCOUNTANT:
            return {
                'pending_payments': self.get_pending_payments_count(),
                'today_collections': self.get_today_collections()
            }
        
        return {}
    
    def get_teacher_students_count(self, user):
        """Get count of students taught by teacher"""
        try:
            teacher = user.teacher_profile
            return sum([cs.class_obj.students.count() for cs in teacher.subjects.all()])
        except Teacher.DoesNotExist:
            return 0
    
    def get_teacher_classes_count(self, user):
        """Get count of classes taught by teacher"""
        try:
            teacher = user.teacher_profile
            return teacher.subjects.count()
        except Teacher.DoesNotExist:
            return 0
    
    def get_pending_assignments_count(self, user):
        """Get count of pending assignments for teacher"""
        # Mock data - in real app, this would query assignment submissions
        return 5
    
    def get_student_attendance_percentage(self, user):
        """Get student attendance percentage"""
        # Mock data - in real app, this would calculate from attendance records
        return 92.5
    
    def get_student_pending_fees(self, user):
        """Get student pending fees count"""
        # Mock data - in real app, this would query fee records
        return 2
    
    def get_upcoming_exams_count(self, user):
        """Get count of upcoming exams for student"""
        # Mock data - in real app, this would query exam schedules
        return 3
    
    def get_unread_notifications_count(self, user):
        """Get count of unread notifications"""
        from notifications.models import Notification
        return Notification.objects.filter(recipient=user, is_read=False).count()
    
    def get_pending_payments_count(self):
        """Get count of pending payments for accountant"""
        # Mock data - in real app, this would query payment records
        return 15
    
    def get_today_collections(self):
        """Get today's collections for accountant"""
        # Mock data - in real app, this would query payment records
        return 25000
    
    def get_subscription_alert(self, obj):
        # Only for school admins
        if obj.role == User.UserRole.SCHOOL_ADMIN and obj.school:
            school = obj.school
            subscription = getattr(school, 'current_subscription', None)
            if not subscription:
                return {'status': 'no_subscription', 'message': 'No active subscription found.'}
            status = subscription.status
            days_remaining = subscription.days_remaining
            alert = None
            if status == 'active' and days_remaining <= 3:
                alert = f'Subscription is expiring in {days_remaining} day(s). Please renew soon.'
            elif status == 'expired':
                alert = 'Your subscription has expired. Please renew to regain full access.'
            elif status == 'cancelled':
                alert = 'Your subscription has been cancelled. Please contact support.'
            elif status == 'pending':
                alert = 'Your subscription is pending. Please wait for activation.'
            if alert:
                return {
                    'status': status,
                    'days_remaining': days_remaining,
                    'message': alert
                }
        return None

    def get_school_stats(self, obj):
        """Return school-specific stats for school admins"""
        if obj.role == User.UserRole.SCHOOL_ADMIN and obj.school:
            from students.models import Student
            from classes.models import Class
            school = obj.school
            # Total students in this school
            total_students = Student.objects.filter(school=school).count()
            # Classes: get all classes that have at least one student in this school
            class_ids = Student.objects.filter(school=school, current_class__isnull=False).values_list('current_class', flat=True).distinct()
            total_classes = class_ids.count()
            # Total teachers in this school
            total_teachers = User.objects.filter(role=User.UserRole.TEACHER, school=school).count()
            # You can add more stats as needed (e.g., recent enrollments)
            return {
                'school_name': school.name,
                'total_students': total_students,
                'total_classes': total_classes,
                'total_teachers': total_teachers,
            }
        return None


class ParentSerializer(serializers.ModelSerializer):
    """Parent serializer with user data"""
    class Meta:
        model = Parent
        fields = '__all__' 