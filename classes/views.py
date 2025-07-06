from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from .models import Class, Subject, ClassSubject, ClassSchedule, Attendance, Assignment, AssignmentSubmission
from .serializers import (
    ClassSerializer, SubjectSerializer, ClassSubjectSerializer, ClassScheduleSerializer, 
    AttendanceSerializer, AssignmentSerializer, AssignmentSubmissionSerializer
)


class ClassPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class ClassViewSet(viewsets.ModelViewSet):
    """Class management viewset"""
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    pagination_class = ClassPagination
    ordering_fields = ['name', 'section', 'academic_year', 'capacity', 'created_at']
    ordering = ['-academic_year', 'name', 'section']
    
    def get_queryset(self):
        """Filter classes based on user role and school"""
        user = self.request.user
        
        if user.role == user.UserRole.SUPER_ADMIN:
            queryset = Class.objects.all()
        elif user.role in [user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            queryset = Class.objects.filter(school=user.school)
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                class_ids = teacher.subjects.values_list('class_obj_id', flat=True)
                queryset = Class.objects.filter(id__in=class_ids, school=user.school)
            except:
                queryset = Class.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    queryset = Class.objects.filter(id=student.current_class.id, school=user.school)
                else:
                    queryset = Class.objects.none()
            except:
                queryset = Class.objects.none()
        else:
            queryset = Class.objects.none()
        
        # Apply academic_year filter if provided
        academic_year = self.request.query_params.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        
        # Ensure proper ordering: latest academic year first, then by name and section
        return queryset.order_by('-academic_year', 'name', 'section')
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get students in this class"""
        class_obj = self.get_object()
        from students.serializers import StudentSerializer
        students = class_obj.enrolled_students.all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Get class schedule"""
        class_obj = self.get_object()
        schedules = class_obj.schedules.all()
        serializer = ClassScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def attendance_summary(self, request, pk=None):
        """Get attendance summary for class"""
        class_obj = self.get_object()
        from django.utils import timezone
        from datetime import timedelta
        
        # Get attendance for last 30 days
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        attendance_data = Attendance.objects.filter(
            class_obj=class_obj,
            date__range=[start_date, end_date]
        ).values('student__user__first_name', 'student__user__last_name', 'status').annotate(
            present_count=Count('id', filter=Q(status='present')),
            absent_count=Count('id', filter=Q(status='absent')),
            late_count=Count('id', filter=Q(status='late'))
        )
        
        return Response(attendance_data)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(school=user.school)

    def perform_update(self, serializer):
        user = self.request.user
        serializer.save(school=user.school)

    @action(detail=False, methods=['post'])
    def auto_generate(self, request):
        """Auto generate classes for a new academic year"""
        user = request.user
        
        # Check permissions
        if user.role not in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Response({'error': 'Only administrators can auto-generate classes'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        target_year = request.data.get('target_year')
        if not target_year:
            return Response({'error': 'Target academic year is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get the most recent academic year for this school
        latest_year = Class.objects.filter(school=user.school).order_by('-academic_year').values_list('academic_year', flat=True).first()
        
        if not latest_year:
            return Response({'error': 'No existing classes found to duplicate'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if classes already exist for target year
        existing_classes = Class.objects.filter(school=user.school, academic_year=target_year)
        if existing_classes.exists():
            return Response({'error': f'Classes for academic year {target_year} already exist'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get all classes from the latest year
        source_classes = Class.objects.filter(school=user.school, academic_year=latest_year)
        
        created_classes = []
        for source_class in source_classes:
            # Create new class with same properties but new academic year
            new_class = Class.objects.create(
                school=user.school,
                name=source_class.name,
                section=source_class.section,
                academic_year=target_year,
                capacity=source_class.capacity,
                is_active=True
            )
            created_classes.append(new_class)
        
        return Response({
            'message': f'Successfully created {len(created_classes)} classes for academic year {target_year}',
            'created_count': len(created_classes),
            'source_year': latest_year,
            'target_year': target_year,
            'classes': ClassSerializer(created_classes, many=True).data
        })

    @action(detail=False, methods=['get'])
    def academic_years(self, request):
        """Get all available academic years for this school"""
        user = request.user
        
        if user.role == user.UserRole.SUPER_ADMIN:
            years = Class.objects.values_list('academic_year', flat=True).distinct().order_by('-academic_year')
        else:
            years = Class.objects.filter(school=user.school).values_list('academic_year', flat=True).distinct().order_by('-academic_year')
        
        return Response({
            'academic_years': list(years),
            'latest_year': years.first() if years.exists() else None
        })


class SubjectViewSet(viewsets.ModelViewSet):
    """Subject management viewset"""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    ordering_fields = ['name', 'code', 'is_core', 'is_active', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter subjects based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Subject.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return teacher.subjects.all()
            except:
                return Subject.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return student.current_class.subjects.all()
            except:
                pass
        return Subject.objects.none()
    
    def perform_create(self, serializer):
        """Ensure subject creation works properly"""
        serializer.save()
    
    def perform_update(self, serializer):
        """Ensure subject update works properly"""
        serializer.save()


class ClassSubjectViewSet(viewsets.ModelViewSet):
    """Class subject assignment management viewset"""
    queryset = ClassSubject.objects.all()
    serializer_class = ClassSubjectSerializer
    ordering_fields = ['class_obj__name', 'subject__name', 'teacher__user__first_name', 'created_at']
    ordering = ['class_obj__name', 'subject__name']
    
    def get_queryset(self):
        """Filter class subjects based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return ClassSubject.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return ClassSubject.objects.filter(teacher=teacher)
            except:
                return ClassSubject.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return ClassSubject.objects.filter(class_obj=student.current_class)
            except:
                pass
        return ClassSubject.objects.none()
    
    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Get all subjects and teachers for a specific class"""
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({'error': 'class_id parameter is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        class_subjects = ClassSubject.objects.filter(class_obj_id=class_id)
        serializer = self.get_serializer(class_subjects, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_teacher(self, request):
        """Get all classes and subjects for a specific teacher"""
        teacher_id = request.query_params.get('teacher_id')
        if not teacher_id:
            return Response({'error': 'teacher_id parameter is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        class_subjects = ClassSubject.objects.filter(teacher_id=teacher_id)
        serializer = self.get_serializer(class_subjects, many=True)
        return Response(serializer.data)


class ClassScheduleViewSet(viewsets.ModelViewSet):
    """Class schedule management viewset"""
    queryset = ClassSchedule.objects.all()
    serializer_class = ClassScheduleSerializer
    
    def get_queryset(self):
        """Filter schedules based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return ClassSchedule.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return ClassSchedule.objects.filter(teacher=teacher)
            except:
                return ClassSchedule.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return ClassSchedule.objects.filter(class_obj=student.current_class)
            except:
                pass
        return ClassSchedule.objects.none()


class AttendanceViewSet(viewsets.ModelViewSet):
    """Attendance management viewset"""
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    
    def get_queryset(self):
        """Filter attendance based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Attendance.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                class_ids = teacher.subjects.values_list('class_obj_id', flat=True)
                return Attendance.objects.filter(class_obj_id__in=class_ids)
            except:
                return Attendance.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return Attendance.objects.filter(student=student)
            except:
                return Attendance.objects.none()
        return Attendance.objects.none()
    
    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Bulk mark attendance for a class"""
        user = request.user
        if user.role != user.UserRole.TEACHER:
            return Response({'error': 'Only teachers can mark attendance'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        class_id = request.data.get('class_id')
        date = request.data.get('date')
        attendance_data = request.data.get('attendance_data', [])
        
        if not all([class_id, date, attendance_data]):
            return Response({'error': 'Missing required data'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update attendance records
        created_count = 0
        updated_count = 0
        
        for record in attendance_data:
            student_id = record.get('student_id')
            status = record.get('status')
            remarks = record.get('remarks', '')
            
            attendance, created = Attendance.objects.update_or_create(
                student_id=student_id,
                class_obj_id=class_id,
                date=date,
                defaults={
                    'status': status,
                    'remarks': remarks,
                    'marked_by': user
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'message': f'Attendance marked successfully. Created: {created_count}, Updated: {updated_count}',
            'created_count': created_count,
            'updated_count': updated_count
        })


class AssignmentViewSet(viewsets.ModelViewSet):
    """Assignment management viewset"""
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    
    def get_queryset(self):
        """Filter assignments based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Assignment.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return Assignment.objects.filter(teacher=teacher)
            except:
                return Assignment.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return Assignment.objects.filter(class_obj=student.current_class)
            except:
                return Assignment.objects.none()
        return Assignment.objects.none()
    
    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        """Get submissions for this assignment"""
        assignment = self.get_object()
        submissions = assignment.submissions.all()
        serializer = AssignmentSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)


class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    """Assignment submission management viewset"""
    queryset = AssignmentSubmission.objects.all()
    serializer_class = AssignmentSubmissionSerializer
    
    def get_queryset(self):
        """Filter submissions based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return AssignmentSubmission.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return AssignmentSubmission.objects.filter(assignment__teacher=teacher)
            except:
                return AssignmentSubmission.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return AssignmentSubmission.objects.filter(student=student)
            except:
                return AssignmentSubmission.objects.none()
        return AssignmentSubmission.objects.none()
    
    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        """Grade an assignment submission"""
        user = request.user
        if user.role != user.UserRole.TEACHER:
            return Response({'error': 'Only teachers can grade assignments'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        submission = self.get_object()
        marks_obtained = request.data.get('marks_obtained')
        feedback = request.data.get('feedback', '')
        
        if marks_obtained is None:
            return Response({'error': 'Marks are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        submission.marks_obtained = marks_obtained
        submission.feedback = feedback
        submission.graded_by = user
        submission.save()
        
        serializer = AssignmentSubmissionSerializer(submission)
        return Response(serializer.data)
