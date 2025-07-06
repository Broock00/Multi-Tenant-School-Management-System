from rest_framework import serializers
from .models import Class, Subject, ClassSubject, ClassSchedule, Attendance, Assignment, AssignmentSubmission
from core.models import SystemSettings
from users.models import Teacher


class ClassSerializer(serializers.ModelSerializer):
    """Class serializer"""
    students_count = serializers.SerializerMethodField()
    subjects_count = serializers.SerializerMethodField()
    school_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Class
        fields = [
            'id', 'name', 'section', 'school', 'school_name', 'academic_year', 'capacity',
            'students_count', 'subjects_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'school', 'school_name', 'created_at', 'updated_at']
    
    def get_students_count(self, obj):
        return obj.enrolled_students.count()
    
    def get_subjects_count(self, obj):
        return obj.subjects.count()
    
    def get_school_name(self, obj):
        return obj.school.name if obj.school else ''


class SubjectSerializer(serializers.ModelSerializer):
    """Subject serializer"""
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'description', 'is_core', 'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ClassSubjectSerializer(serializers.ModelSerializer):
    """Class subject relationship serializer"""
    class_obj = ClassSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    teacher_info = serializers.SerializerMethodField()
    class_obj_id = serializers.IntegerField(write_only=True)
    subject_id = serializers.IntegerField(write_only=True)
    teacher_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = ClassSubject
        fields = [
            'id', 'class_obj', 'class_obj_id', 'subject', 'subject_id', 
            'teacher', 'teacher_id', 'teacher_info', 'is_compulsory', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_teacher_info(self, obj):
        if obj.teacher:
            return {
                'id': obj.teacher.id,
                'name': obj.teacher.user.get_full_name(),
                'employee_id': obj.teacher.employee_id
            }
        return None
    
    def create(self, validated_data):
        class_obj_id = validated_data.pop('class_obj_id')
        subject_id = validated_data.pop('subject_id')
        teacher_id = validated_data.pop('teacher_id', None)
        
        class_obj = Class.objects.get(id=class_obj_id)
        subject = Subject.objects.get(id=subject_id)
        teacher = None
        if teacher_id:
            teacher = Teacher.objects.get(id=teacher_id)
        
        class_subject, created = ClassSubject.objects.get_or_create(
            class_obj=class_obj,
            subject=subject,
            defaults={
                'teacher': teacher,
                'is_compulsory': validated_data.get('is_compulsory', True)
            }
        )
        
        if not created and teacher:
            class_subject.teacher = teacher
            class_subject.save()
        
        return class_subject


class ClassScheduleSerializer(serializers.ModelSerializer):
    """Class schedule serializer"""
    class_obj = ClassSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    teacher_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassSchedule
        fields = [
            'id', 'class_obj', 'subject', 'teacher', 'teacher_info',
            'day', 'start_time', 'end_time', 'room', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_teacher_info(self, obj):
        if obj.teacher:
            return {
                'id': obj.teacher.id,
                'name': obj.teacher.user.get_full_name(),
                'employee_id': obj.teacher.employee_id
            }
        return None


class AttendanceSerializer(serializers.ModelSerializer):
    """Attendance serializer"""
    student_info = serializers.SerializerMethodField()
    class_info = serializers.SerializerMethodField()
    marked_by_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_info', 'class_obj', 'class_info',
            'date', 'status', 'remarks', 'marked_by', 'marked_by_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_student_info(self, obj):
        return {
            'id': obj.student.id,
            'name': obj.student.user.get_full_name(),
            'student_id': obj.student.student_id,
            'roll_number': obj.student.roll_number
        }
    
    def get_class_info(self, obj):
        return {
            'id': obj.class_obj.id,
            'name': obj.class_obj.name,
            'section': obj.class_obj.section
        }
    
    def get_marked_by_info(self, obj):
        if obj.marked_by:
            return {
                'id': obj.marked_by.id,
                'name': obj.marked_by.get_full_name(),
                'role': obj.marked_by.get_role_display()
            }
        return None


class AssignmentSerializer(serializers.ModelSerializer):
    """Assignment serializer"""
    teacher_info = serializers.SerializerMethodField()
    class_info = serializers.SerializerMethodField()
    subject_info = serializers.SerializerMethodField()
    submissions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'teacher', 'teacher_info',
            'class_obj', 'class_info', 'subject', 'subject_info',
            'due_date', 'total_marks', 'submissions_count', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_teacher_info(self, obj):
        return {
            'id': obj.teacher.id,
            'name': obj.teacher.user.get_full_name(),
            'employee_id': obj.teacher.employee_id
        }
    
    def get_class_info(self, obj):
        return {
            'id': obj.class_obj.id,
            'name': obj.class_obj.name,
            'section': obj.class_obj.section
        }
    
    def get_subject_info(self, obj):
        return {
            'id': obj.subject.id,
            'name': obj.subject.name,
            'code': obj.subject.code
        }
    
    def get_submissions_count(self, obj):
        return obj.submissions.count()


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    """Assignment submission serializer"""
    student_info = serializers.SerializerMethodField()
    assignment_info = serializers.SerializerMethodField()
    graded_by_info = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'student', 'student_info', 'assignment', 'assignment_info',
            'submitted_file', 'submitted_text', 'submitted_at', 'marks_obtained',
            'total_marks', 'percentage', 'feedback', 'graded_by', 'graded_by_info',
            'graded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'graded_at', 'created_at', 'updated_at']
    
    def get_student_info(self, obj):
        return {
            'id': obj.student.id,
            'name': obj.student.user.get_full_name(),
            'student_id': obj.student.student_id,
            'roll_number': obj.student.roll_number
        }
    
    def get_assignment_info(self, obj):
        return {
            'id': obj.assignment.id,
            'title': obj.assignment.title,
            'due_date': obj.assignment.due_date,
            'total_marks': obj.assignment.total_marks
        }
    
    def get_graded_by_info(self, obj):
        if obj.graded_by:
            return {
                'id': obj.graded_by.id,
                'name': obj.graded_by.get_full_name(),
                'role': obj.graded_by.get_role_display()
            }
        return None
    
    def get_percentage(self, obj):
        if obj.marks_obtained and obj.total_marks:
            return (obj.marks_obtained / obj.total_marks) * 100
        return None

    def validate_submitted_file(self, value):
        if value:
            settings = SystemSettings.get_solo()
            max_size = settings.max_file_size * 1024 * 1024  # MB to bytes
            if value.size > max_size:
                raise serializers.ValidationError(f"File size exceeds the maximum allowed size of {settings.max_file_size} MB.")
        return value 