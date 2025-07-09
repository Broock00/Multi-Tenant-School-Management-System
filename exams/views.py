from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
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
        
        if user.role == 'super_admin':
            return Exam.objects.all()
        elif user.role in ['school_admin', 'secretary']:
            return Exam.objects.filter(class_obj__school=user.school)
        elif user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                if teacher.is_head_teacher:
                    # Head teachers can see exams for their assigned classes
                    return Exam.objects.filter(
                        class_obj__in=teacher.head_teacher_classes.all(),
                        class_obj__school=user.school
                    )
                else:
                    # Regular teachers can see exams for subjects they teach
                    return Exam.objects.filter(subject__teacher=teacher)
            except:
                return Exam.objects.none()
        elif user.role == 'student':
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
        
        if user.role == 'super_admin':
            return ExamSchedule.objects.all()
        elif user.role in ['school_admin', 'secretary']:
            return ExamSchedule.objects.filter(exam__class_obj__school=user.school)
        elif user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                if teacher.is_head_teacher:
                    # Head teachers can see schedules for their assigned classes
                    return ExamSchedule.objects.filter(
                        exam__class_obj__in=teacher.head_teacher_classes.all(),
                        exam__class_obj__school=user.school
                    )
                else:
                    # Regular teachers can see schedules for subjects they teach
                    return ExamSchedule.objects.filter(exam__subject__teacher=teacher)
            except:
                return ExamSchedule.objects.none()
        elif user.role == 'student':
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
        
        if user.role == 'super_admin':
            return ExamResult.objects.all()
        elif user.role in ['school_admin', 'secretary']:
            return ExamResult.objects.filter(exam__class_obj__school=user.school)
        elif user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                if teacher.is_head_teacher:
                    # Head teachers can see results for their assigned classes
                    return ExamResult.objects.filter(
                        exam__class_obj__in=teacher.head_teacher_classes.all(),
                        exam__class_obj__school=user.school
                    )
                else:
                    # Regular teachers can see results for subjects they teach
                    return ExamResult.objects.filter(exam__subject__teacher=teacher)
            except:
                return ExamResult.objects.none()
        elif user.role == 'student':
            try:
                student = user.student_profile
                return ExamResult.objects.filter(student=student)
            except:
                return ExamResult.objects.none()
        return ExamResult.objects.none()
    
    def check_grade_permissions(self, user, exam_id=None, class_id=None):
        """Check if user has permission to manage grades"""
        if user.role == 'super_admin':
            return True
        elif user.role in ['school_admin', 'secretary']:
            # School admins and secretaries can manage grades for all classes in their school
            if exam_id:
                from .models import Exam
                try:
                    exam = Exam.objects.get(id=exam_id)
                    if exam.class_obj.school != user.school:
                        raise PermissionDenied("You can only manage grades for classes in your school.")
                except Exam.DoesNotExist:
                    raise PermissionDenied("Exam not found.")
            elif class_id:
                from classes.models import Class
                try:
                    class_obj = Class.objects.get(id=class_id)
                    if class_obj.school != user.school:
                        raise PermissionDenied("You can only manage grades for classes in your school.")
                except Class.DoesNotExist:
                    raise PermissionDenied("Class not found.")
            return True
        elif user.role == 'teacher':
            try:
                teacher = user.teacher_profile
                if teacher.is_head_teacher:
                    # Head teachers can only manage grades for their assigned classes
                    if exam_id:
                        from .models import Exam
                        try:
                            exam = Exam.objects.get(id=exam_id)
                            if not teacher.head_teacher_classes.filter(id=exam.class_obj.id).exists():
                                raise PermissionDenied("You can only manage grades for classes where you are the head teacher.")
                        except Exam.DoesNotExist:
                            raise PermissionDenied("Exam not found.")
                    elif class_id:
                        if not teacher.head_teacher_classes.filter(id=class_id).exists():
                            raise PermissionDenied("You can only manage grades for classes where you are the head teacher.")
                    return True
                else:
                    raise PermissionDenied("Only head teachers can manage grades.")
            except:
                raise PermissionDenied("Teacher profile not found.")
        else:
            raise PermissionDenied("You don't have permission to manage grades.")
    
    def perform_create(self, serializer):
        """Enforce permissions for creating exam results"""
        user = self.request.user
        exam_id = serializer.validated_data.get('exam')
        if exam_id:
            self.check_grade_permissions(user, exam_id=exam_id.id)
        else:
            self.check_grade_permissions(user)
        serializer.save()
    
    def perform_update(self, serializer):
        """Enforce permissions for updating exam results"""
        user = self.request.user
        exam_id = serializer.validated_data.get('exam')
        if exam_id:
            self.check_grade_permissions(user, exam_id=exam_id.id)
        else:
            self.check_grade_permissions(user)
        serializer.save()
    
    def perform_destroy(self, instance):
        """Enforce permissions for deleting exam results"""
        user = self.request.user
        self.check_grade_permissions(user, exam_id=instance.exam.id)
        instance.delete()
    
    @action(detail=False, methods=['post'])
    def bulk_grade(self, request):
        """Bulk grade exam results"""
        user = request.user
        
        # Check permissions
        exam_id = request.data.get('exam_id')
        try:
            self.check_grade_permissions(user, exam_id=exam_id)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        exam_id = request.data.get('exam_id')
        results_data = request.data.get('results_data', [])
        
        if not all([exam_id, results_data]):
            return Response({'error': 'Missing required data'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update exam results
        created_count = 0
        updated_count = 0
        
        for record in results_data:
            student_id = record.get('student_id')
            marks_obtained = record.get('marks_obtained')
            remarks = record.get('remarks', '')
            
            result, created = ExamResult.objects.update_or_create(
                student_id=student_id,
                exam_id=exam_id,
                defaults={
                    'marks_obtained': marks_obtained,
                    'total_marks': record.get('total_marks', 100),
                    'remarks': remarks
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'message': f'Grades updated successfully. Created: {created_count}, Updated: {updated_count}',
            'created_count': created_count,
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def performance_summary(self, request):
        """Get performance summary for user"""
        user = request.user
        
        if user.role == 'student':
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
