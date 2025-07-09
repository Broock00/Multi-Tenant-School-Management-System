from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Student
from .serializers import StudentSerializer, StudentListSerializer
from rest_framework.exceptions import ValidationError, PermissionDenied


class StudentViewSet(viewsets.ModelViewSet):
    """Student viewset"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return students based on user role and school"""
        user = self.request.user
        
        if user.role == 'super_admin':
            return Student.objects.all()
        elif user.role in ['school_admin', 'secretary']:
            return Student.objects.filter(school=user.school)
        elif user.role == 'teacher':
            # Teachers can see students in their classes
            return Student.objects.filter(
                current_class__teachers=user,
                school=user.school
            )
        elif user.role == 'student':
            # Students can only see their own profile
            return Student.objects.filter(user=user)
        elif user.role == 'parent':
            # Parents can see their children (would need parent-child relationship)
            return Student.objects.none()
        
        return Student.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer
    
    def check_student_permissions(self, user, student=None, class_id=None):
        """Check if user has permission to create/update students"""
        if user.role == 'super_admin':
            return True
        elif user.role in ['school_admin', 'secretary']:
            # School admins and secretaries can manage all students in their school
            if student and student.school != user.school:
                raise PermissionDenied("You can only manage students in your school.")
            return True
        elif user.role == 'teacher' and user.is_head_teacher:
            # Head teachers can only manage students in their assigned classes
            if class_id:
                if not user.head_teacher_classes.filter(id=class_id).exists():
                    raise PermissionDenied("You can only manage students in classes where you are the head teacher.")
            elif student:
                if not user.head_teacher_classes.filter(id=student.current_class.id).exists():
                    raise PermissionDenied("You can only manage students in classes where you are the head teacher.")
            return True
        else:
            raise PermissionDenied("You don't have permission to manage students.")
    
    def perform_create(self, serializer):
        """Set the school based on the current user and enforce permissions"""
        user = self.request.user
        school = user.school
        
        # Check subscription limits
        plan = school.current_subscription.plan if school and school.current_subscription else None
        if plan and school.students.count() >= plan.max_students:
            raise ValidationError("Student limit reached for your subscription plan.")
        
        # Check permissions
        class_id = serializer.validated_data.get('current_class')
        if class_id:
            self.check_student_permissions(user, class_id=class_id.id)
        else:
            self.check_student_permissions(user)
        
        # Save with appropriate school
        if user.role in ['school_admin', 'secretary']:
            serializer.save(school=user.school)
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        """Enforce permissions for updating students"""
        user = self.request.user
        student = serializer.instance
        
        # Check permissions
        class_id = serializer.validated_data.get('current_class')
        if class_id:
            self.check_student_permissions(user, student, class_id=class_id.id)
        else:
            self.check_student_permissions(user, student)
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Enforce permissions for deleting students"""
        user = self.request.user
        self.check_student_permissions(user, instance)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        """Get current user's student profile"""
        if request.user.role != 'student':
            return Response(
                {'error': 'Only students can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            student = Student.objects.get(user=request.user)
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search students by name or student ID"""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter "q" is required'})
        
        queryset = self.get_queryset().filter(
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query) |
            Q(student_id__icontains=query)
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Get students by class"""
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({'error': 'Class ID is required'})
        
        queryset = self.get_queryset().filter(current_class_id=class_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active students"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
