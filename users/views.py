from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q, Count, Sum
from django.utils import timezone
from .models import User, Teacher, Parent, Principal, Accountant, UserPermission, UserActivity
from .serializers import (
    UserSerializer, TeacherSerializer, ParentSerializer, PrincipalSerializer, AccountantSerializer, LoginSerializer, DashboardSerializer
)
from django.core.mail import send_mail
from rest_framework.exceptions import ValidationError


class LoginView(APIView):
    """User login view"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Log user activity
            UserActivity.objects.create(
                user=user,
                action='User logged in',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': UserSerializer(user).data,
                'dashboard_url': user.dashboard_url
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardView(APIView):
    """Role-based dashboard view"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get dashboard data based on user role"""
        user = request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            # Super Admin gets system-wide statistics
            from schools.models import School, Subscription
            from classes.models import Class
            
            # Get system-wide stats
            total_schools = School.objects.count()
            total_users = User.objects.count()
            total_students = User.objects.filter(role=User.UserRole.STUDENT).count()
            total_teachers = User.objects.filter(role=User.UserRole.TEACHER).count()
            total_classes = Class.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            
            # Get real subscription data
            active_subscriptions = Subscription.objects.filter(status='active').count()
            total_revenue = Subscription.objects.filter(status='active').aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            # Calculate growth rate (mock for now - could be based on historical data)
            growth_rate = 15.5
            
            # Get recent activities
            recent_activities = UserActivity.objects.select_related('user').order_by('-created_at')[:10]
            activities_data = [{
                'id': activity.id,
                'action': activity.action,
                'user': activity.user.get_full_name() or activity.user.username,
                'time': f"{activity.created_at.strftime('%H:%M')} ago",
                'type': 'info',
            } for activity in recent_activities]
            
            dashboard_data = {
                'totalSchools': total_schools,
                'totalUsers': total_users,
                'totalStudents': total_students,
                'totalTeachers': total_teachers,
                'totalClasses': total_classes,
                'activeSubscriptions': active_subscriptions,
                'revenue': float(total_revenue),
                'growthRate': growth_rate,
                'systemHealth': 'excellent',
                'recentActivities': activities_data,
            }
            
            return Response(dashboard_data)
        else:
            # For other roles, use the existing serializer
            serializer = DashboardSerializer(user)
            return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """User management viewset"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    ordering_fields = ['username', 'first_name', 'last_name', 'email', 'role', 'created_at']
    ordering = ['-created_at', 'username']
    
    def get_queryset(self):
        """Filter users based on role and permissions"""
        user = self.request.user
        
        # Super admin can see all users
        if user.role == User.UserRole.SUPER_ADMIN:
            return User.objects.all()
        
        # School admin can see users in their school
        elif user.role == User.UserRole.SCHOOL_ADMIN:
            return User.objects.filter(school=user.school)
        
        # Principal can see teachers and students in their school
        elif user.role == User.UserRole.PRINCIPAL:
            return User.objects.filter(
                school=user.school,
                role__in=[User.UserRole.TEACHER, User.UserRole.STUDENT, User.UserRole.PARENT]
            )
        
        # Teachers can see their students
        elif user.role == User.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                student_ids = []
                for subject in teacher.subjects.all():
                    student_ids.extend(subject.class_obj.students.values_list('user_id', flat=True))
                return User.objects.filter(id__in=student_ids, role=User.UserRole.STUDENT)
            except Teacher.DoesNotExist:
                return User.objects.none()
        
        # Students can see their teachers
        elif user.role == User.UserRole.STUDENT:
            try:
                from students.models import Student
                student = user.student_profile
                if student.current_class:
                    teacher_ids = []
                    for subject in student.current_class.subjects.all():
                        if subject.teacher:
                            teacher_ids.append(subject.teacher.user_id)
                    return User.objects.filter(id__in=teacher_ids, role=User.UserRole.TEACHER)
            except Student.DoesNotExist:
                pass
        
        return User.objects.none()
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """Update current user profile"""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search users, optionally filter by role"""
        query = request.query_params.get('q', '')
        role = request.query_params.get('role', None)
        queryset = self.get_queryset()
        if query:
            queryset = queryset.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(username__icontains=query) |
                Q(email__icontains=query)
            )
        if role:
            queryset = queryset.filter(role=role)
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new user with plan enforcement for teachers and secretaries, and restrict secretary creation to school admins only."""
        user = request.user
        school = user.school
        plan = school.current_subscription.plan if school and school.current_subscription else None
        role = request.data.get('role')
        # Restrict secretary creation
        if role == 'secretary':
            if user.role != User.UserRole.SCHOOL_ADMIN:
                return Response({'detail': 'Only school admins can create secretaries.'}, status=status.HTTP_403_FORBIDDEN)
        # Prevent secretaries from creating any users
        if user.role == User.UserRole.SECRETARY:
            return Response({'detail': 'Secretaries are not allowed to create users.'}, status=status.HTTP_403_FORBIDDEN)
        if plan and school:
            if role == 'teacher' and school.user_set.filter(role='teacher').count() >= plan.max_teachers:
                raise ValidationError("Teacher limit reached for your subscription plan.")
            if role == 'secretary' and school.user_set.filter(role='secretary').count() >= plan.max_secretaries:
                raise ValidationError("Secretary limit reached for your subscription plan.")
        print("=== USER CREATE DEBUG ===")
        print("Raw request data:", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        print("Validated data:", serializer.validated_data)
        print("School in validated data:", serializer.validated_data.get('school'))
        user = serializer.save()
        # Send test email
        send_mail(
            'Welcome to the Platform',
            f'Hello {user.get_full_name()}, your account has been created.',
            'no-reply@example.com',
            [user.email],
            fail_silently=False,
        )
        print("User created successfully:", user.id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TeacherPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class TeacherViewSet(viewsets.ModelViewSet):
    """Teacher management viewset"""
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    pagination_class = TeacherPagination
    ordering_fields = ['user__username', 'user__first_name', 'user__last_name', 'department', 'employee_id']
    ordering = ['user__first_name', 'user__last_name']
    
    def get_queryset(self):
        """Filter teachers based on user role and various filters"""
        user = self.request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            queryset = Teacher.objects.all()
        elif user.role in [User.UserRole.SCHOOL_ADMIN, User.UserRole.PRINCIPAL, User.UserRole.SECRETARY]:
            queryset = Teacher.objects.filter(user__school=user.school)
        elif user.role == User.UserRole.TEACHER:
            queryset = Teacher.objects.filter(user=user)
        else:
            return Teacher.objects.none()
        
        # Filter by department if provided
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        # Filter by qualification if provided
        qualification = self.request.query_params.get('qualification')
        if qualification:
            queryset = queryset.filter(qualification=qualification)
        
        # Filter by subject if provided
        subject = self.request.query_params.get('subject')
        if subject:
            try:
                subject_id = int(subject)
                queryset = queryset.filter(subjects__id=subject_id)
            except (ValueError, TypeError):
                pass
        
        # Filter by is_head_teacher if provided
        is_head_teacher = self.request.query_params.get('is_head_teacher')
        if is_head_teacher is not None:
            if is_head_teacher.lower() == 'true':
                queryset = queryset.filter(is_head_teacher=True)
            elif is_head_teacher.lower() == 'false':
                queryset = queryset.filter(is_head_teacher=False)
        
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(department__icontains=search) |
                Q(qualification__icontains=search)
            )
        
        return queryset.distinct()
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get students taught by this teacher"""
        teacher = self.get_object()
        from students.models import Student
        
        students = Student.objects.filter(
            current_class__subjects__teacher=teacher
        ).distinct()
        
        from students.serializers import StudentListSerializer
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        """Get classes taught by this teacher"""
        teacher = self.get_object()
        from classes.serializers import ClassSerializer
        
        classes = teacher.subjects.values_list('class_obj', flat=True).distinct()
        from classes.models import Class
        class_objects = Class.objects.filter(id__in=classes)
        
        serializer = ClassSerializer(class_objects, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def departments(self, request):
        """Get list of departments for filtering"""
        user = request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            departments = Teacher.objects.values_list('department', flat=True).distinct()
        elif user.role in [User.UserRole.SCHOOL_ADMIN, User.UserRole.PRINCIPAL]:
            departments = Teacher.objects.filter(user__school=user.school).values_list('department', flat=True).distinct()
        else:
            departments = []
        
        return Response({'departments': list(departments)})
    
    @action(detail=False, methods=['get'])
    def qualifications(self, request):
        """Get list of qualifications for filtering"""
        user = request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            qualifications = Teacher.objects.values_list('qualification', flat=True).distinct()
        elif user.role in [User.UserRole.SCHOOL_ADMIN, User.UserRole.PRINCIPAL]:
            qualifications = Teacher.objects.filter(user__school=user.school).values_list('qualification', flat=True).distinct()
        else:
            qualifications = []
        
        return Response({'qualifications': list(qualifications)})


class PrincipalViewSet(viewsets.ModelViewSet):
    """Principal management viewset"""
    queryset = Principal.objects.all()
    serializer_class = PrincipalSerializer
    ordering_fields = ['user__username', 'user__first_name', 'user__last_name', 'employee_id']
    ordering = ['user__first_name', 'user__last_name']
    
    def get_queryset(self):
        """Filter principals based on user role"""
        user = self.request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            return Principal.objects.all()
        elif user.role == User.UserRole.PRINCIPAL:
            return Principal.objects.filter(user=user)
        else:
            return Principal.objects.none()
    
    @action(detail=False, methods=['get'])
    def school_stats(self, request):
        """Get school statistics for principal"""
        user = request.user
        if user.role != User.UserRole.PRINCIPAL:
            return Response(
                {'error': 'Only principals can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            principal = user.principal_profile
            school = user.school
            
            # Get school statistics
            total_students = User.objects.filter(school=school, role=User.UserRole.STUDENT).count()
            total_teachers = User.objects.filter(school=school, role=User.UserRole.TEACHER).count()
            total_classes = school.classes.count()
            attendance_rate = self.get_attendance_rate(school)
            fee_collection_rate = self.get_fee_collection_rate(school)
            
            stats = {
                'totalStudents': total_students,
                'totalTeachers': total_teachers,
                'totalClasses': total_classes,
                'attendanceRate': attendance_rate,
                'feeCollectionRate': fee_collection_rate,
            }
            
            return Response(stats)
        except Principal.DoesNotExist:
            return Response(
                {'error': 'Principal profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_attendance_rate(self, school):
        """Calculate attendance rate for the school"""
        # Mock calculation - in real app, this would use attendance data
        return 85.5
    
    def get_fee_collection_rate(self, school):
        """Calculate fee collection rate for the school"""
        # Mock calculation - in real app, this would use fee data
        return 92.3


class AccountantViewSet(viewsets.ModelViewSet):
    """Accountant management viewset"""
    queryset = Accountant.objects.all()
    serializer_class = AccountantSerializer
    ordering_fields = ['user__username', 'user__first_name', 'user__last_name', 'employee_id', 'department']
    ordering = ['user__first_name', 'user__last_name']
    
    def get_queryset(self):
        """Filter accountants based on user role"""
        user = self.request.user
        
        if user.role == User.UserRole.SUPER_ADMIN:
            return Accountant.objects.all()
        elif user.role == User.UserRole.ACCOUNTANT:
            return Accountant.objects.filter(user=user)
        else:
            return Accountant.objects.none()
    
    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Get financial summary for accountant"""
        user = request.user
        if user.role != User.UserRole.ACCOUNTANT:
            return Response(
                {'error': 'Only accountants can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            accountant = user.accountant_profile
            school = user.school
            
            # Mock financial data - in real app, this would come from fee models
            total_fees_collected = 125000
            pending_fees = 15000
            total_students = User.objects.filter(school=school, role=User.UserRole.STUDENT).count()
            students_with_pending_fees = 25
            
            summary = {
                'totalFeesCollected': total_fees_collected,
                'pendingFees': pending_fees,
                'totalStudents': total_students,
                'studentsWithPendingFees': students_with_pending_fees,
                'collectionRate': ((total_fees_collected - pending_fees) / total_fees_collected) * 100 if total_fees_collected > 0 else 0
            }
            
            return Response(summary)
        except Accountant.DoesNotExist:
            return Response(
                {'error': 'Accountant profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ParentViewSet(viewsets.ModelViewSet):
    """Parent management viewset"""
    queryset = Parent.objects.all()
    serializer_class = ParentSerializer


class SecretaryViewSet(viewsets.ModelViewSet):
    """Secretary management viewset"""
    queryset = User.objects.filter(role=User.UserRole.SECRETARY)
    serializer_class = UserSerializer
    pagination_class = PageNumberPagination
    ordering_fields = ['username', 'first_name', 'last_name', 'email', 'created_at']
    ordering = ['first_name', 'last_name']

    def get_queryset(self):
        user = self.request.user
        if user.role == User.UserRole.SUPER_ADMIN:
            return User.objects.filter(role=User.UserRole.SECRETARY)
        elif user.role == User.UserRole.SCHOOL_ADMIN:
            return User.objects.filter(role=User.UserRole.SECRETARY, school=user.school)
        elif user.role == User.UserRole.SECRETARY:
            return User.objects.filter(id=user.id)
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role == User.UserRole.SECRETARY:
            return Response({'detail': 'Secretaries cannot create secretaries.'}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role == User.UserRole.SECRETARY:
            return Response({'detail': 'Secretaries cannot update secretaries.'}, status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role == User.UserRole.SECRETARY:
            return Response({'detail': 'Secretaries cannot update secretaries.'}, status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role == User.UserRole.SECRETARY:
            return Response({'detail': 'Secretaries cannot delete secretaries.'}, status=403)
        return super().destroy(request, *args, **kwargs)
