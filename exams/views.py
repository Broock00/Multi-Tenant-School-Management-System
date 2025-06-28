from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Exam, ExamSchedule, ExamResult
from .serializers import (
    ExamSerializer, ExamScheduleSerializer, ExamResultSerializer
)


class ExamViewSet(viewsets.ModelViewSet):
    """Exam management viewset"""
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter exams based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return Exam.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return Exam.objects.filter(subject__teacher=teacher)
            except:
                return Exam.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return Exam.objects.filter(class_obj=student.current_class)
            except:
                return Exam.objects.none()
        return Exam.objects.none()
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get results for this exam"""
        exam = self.get_object()
        results = exam.results.all()
        serializer = ExamResultSerializer(results, many=True)
        return Response(serializer.data)


class ExamScheduleViewSet(viewsets.ModelViewSet):
    """Exam schedule management viewset"""
    queryset = ExamSchedule.objects.all()
    serializer_class = ExamScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter exam schedules based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return ExamSchedule.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return ExamSchedule.objects.filter(exam__subject__teacher=teacher)
            except:
                return ExamSchedule.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return ExamSchedule.objects.filter(exam__class_obj=student.current_class)
            except:
                return ExamSchedule.objects.none()
        return ExamSchedule.objects.none()
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming exams"""
        from django.utils import timezone
        queryset = self.get_queryset().filter(
            exam_date__gte=timezone.now().date()
        ).order_by('exam_date')
        serializer = ExamScheduleSerializer(queryset, many=True)
        return Response(serializer.data)


class ExamResultViewSet(viewsets.ModelViewSet):
    """Exam result management viewset"""
    queryset = ExamResult.objects.all()
    serializer_class = ExamResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter exam results based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL]:
            return ExamResult.objects.all()
        elif user.role == user.UserRole.TEACHER:
            try:
                teacher = user.teacher_profile
                return ExamResult.objects.filter(exam__subject__teacher=teacher)
            except:
                return ExamResult.objects.none()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return ExamResult.objects.filter(student=student)
            except:
                return ExamResult.objects.none()
        return ExamResult.objects.none()
    
    @action(detail=False, methods=['get'])
    def performance_summary(self, request):
        """Get performance summary for user"""
        user = request.user
        
        if user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                results = ExamResult.objects.filter(student=student)
                
                total_exams = results.count()
                if total_exams == 0:
                    return Response({'message': 'No exam results found'})
                
                total_marks = sum([result.marks_obtained for result in results])
                total_max_marks = sum([result.exam.total_marks for result in results])
                average_percentage = (total_marks / total_max_marks * 100) if total_max_marks > 0 else 0
                
                # Subject-wise performance
                subject_performance = {}
                for result in results:
                    subject = result.exam.subject.name
                    if subject not in subject_performance:
                        subject_performance[subject] = {
                            'total_marks': 0,
                            'max_marks': 0,
                            'exams_count': 0
                        }
                    subject_performance[subject]['total_marks'] += result.marks_obtained
                    subject_performance[subject]['max_marks'] += result.exam.total_marks
                    subject_performance[subject]['exams_count'] += 1
                
                # Calculate percentage for each subject
                for subject, data in subject_performance.items():
                    data['percentage'] = (data['total_marks'] / data['max_marks'] * 100) if data['max_marks'] > 0 else 0
                
                return Response({
                    'total_exams': total_exams,
                    'average_percentage': average_percentage,
                    'subject_performance': subject_performance
                })
            except:
                return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
