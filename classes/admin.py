from django.contrib import admin
from .models import Class, Subject, ClassSubject, ClassSchedule, Attendance, Assignment, AssignmentSubmission

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'section', 'school', 'academic_year', 'capacity', 'current_students_count', 'is_active']
    list_filter = ['school', 'academic_year', 'is_active']
    search_fields = ['name', 'section', 'school__name']
    readonly_fields = ['current_students_count']

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_core', 'is_active']
    list_filter = ['is_core', 'is_active']
    search_fields = ['name', 'code']

@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_obj', 'subject', 'teacher', 'is_compulsory']
    list_filter = ['is_compulsory', 'class_obj__school']
    search_fields = ['class_obj__name', 'subject__name', 'teacher__user__first_name']

@admin.register(ClassSchedule)
class ClassScheduleAdmin(admin.ModelAdmin):
    list_display = ['class_obj', 'subject', 'teacher', 'day', 'start_time', 'end_time', 'room']
    list_filter = ['day', 'is_active', 'class_obj__school']
    search_fields = ['class_obj__name', 'subject__name', 'teacher__user__first_name']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'class_obj', 'date', 'status', 'marked_by']
    list_filter = ['status', 'date', 'class_obj__school']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'class_obj__name']
    date_hierarchy = 'date'

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'class_obj', 'subject', 'teacher', 'due_date', 'total_marks', 'is_active']
    list_filter = ['is_active', 'due_date', 'class_obj__school']
    search_fields = ['title', 'class_obj__name', 'subject__name']
    date_hierarchy = 'due_date'

@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'student', 'submitted_at', 'marks_obtained', 'graded_by']
    list_filter = ['submitted_at', 'assignment__class_obj__school']
    search_fields = ['assignment__title', 'student__user__first_name', 'student__user__last_name']
    date_hierarchy = 'submitted_at'
    readonly_fields = ['submitted_at']
