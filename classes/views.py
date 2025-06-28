from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Class, Subject, ClassSubject, ClassSchedule, Attendance, Assignment, AssignmentSubmission
from .serializers import (
    ClassSerializer, SubjectSerializer, ClassScheduleSerializer, 
    AttendanceSerializer, AssignmentSerializer, AssignmentSubmissionSerializer
)


class ClassViewSet(viewsets.ModelViewSet):
    """Class management viewset"""
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['name', 'section', 'academic_year', 'capacity', 'created_at']
    ordering = ['name', 'section']
    
    def get_queryset(self):
        """Filter classes based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Class.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                class_ids = teacher.subjects.values_list('class_obj_id', flat=True)
                return Class.objects.filter(id__in=class_ids)
            except:
                return Class.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return Class.objects.filter(id=student.current_class.id)
            except:
                pass
        return Class.objects.none()
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get students in this class"""
        class_obj = self.get_object()
        from users.serializers import StudentSerializer
        students = class_obj.students.all()
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
            present_count=models.Count('id', filter=models.Q(status='present')),
            absent_count=models.Count('id', filter=models.Q(status='absent')),
            late_count=models.Count('id', filter=models.Q(status='late'))
        )
        
        return Response(attendance_data)


class SubjectViewSet(viewsets.ModelViewSet):
    """Subject management viewset"""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
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


class ClassScheduleViewSet(viewsets.ModelViewSet):
    """Class schedule management viewset"""
    queryset = ClassSchedule.objects.all()
    serializer_class = ClassScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
    permission_classes = [permissions.IsAuthenticated]
    
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
    permission_classes = [permissions.IsAuthenticated]
    
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
    permission_classes = [permissions.IsAuthenticated]
    
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
