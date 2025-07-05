from django.db import models
from django.utils.translation import gettext_lazy as _
from schools.models import School


class Class(models.Model):
    """Class/Grade model"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classes', null=True, blank=True)
    name = models.CharField(max_length=50)  # e.g., "Class 10", "Grade 11"
    section = models.CharField(max_length=10, blank=True)  # e.g., "A", "B", "Science"
    academic_year = models.CharField(max_length=20)
    capacity = models.PositiveIntegerField(default=40)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['name', 'section', 'academic_year', 'school']
        verbose_name_plural = 'Classes'
        ordering = ['name', 'section']
    
    def __str__(self):
        return f"{self.name} - {self.section} ({self.academic_year}) [{self.school.name}]"
    
    @property
    def current_students_count(self):
        return self.enrolled_students.count()
    
    @property
    def is_full(self):
        return self.current_students_count >= self.capacity


class Subject(models.Model):
    """Subject model"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_core = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassSubject(models.Model):
    """Many-to-many relationship between Class and Subject"""
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='classes')
    teacher = models.ForeignKey('users.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    is_compulsory = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['class_obj', 'subject']
    
    def __str__(self):
        return f"{self.class_obj} - {self.subject}"


class ClassSchedule(models.Model):
    """Class schedule/timetable"""
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='schedules')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey('users.Teacher', on_delete=models.CASCADE)
    
    class DayOfWeek(models.TextChoices):
        MONDAY = 'monday', _('Monday')
        TUESDAY = 'tuesday', _('Tuesday')
        WEDNESDAY = 'wednesday', _('Wednesday')
        THURSDAY = 'thursday', _('Thursday')
        FRIDAY = 'friday', _('Friday')
        SATURDAY = 'saturday', _('Saturday')
        SUNDAY = 'sunday', _('Sunday')
    
    day = models.CharField(max_length=10, choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['class_obj', 'day', 'start_time']
        ordering = ['day', 'start_time']
    
    def __str__(self):
        return f"{self.class_obj} - {self.subject} - {self.day} {self.start_time}"


class Attendance(models.Model):
    """Student attendance tracking"""
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='attendances')
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    
    class Status(models.TextChoices):
        PRESENT = 'present', _('Present')
        ABSENT = 'absent', _('Absent')
        LATE = 'late', _('Late')
        EXCUSED = 'excused', _('Excused')
    
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    remarks = models.TextField(blank=True)
    marked_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['student', 'class_obj', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.student} - {self.date} - {self.get_status_display()}"


class Assignment(models.Model):
    """Class assignments/homework"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey('users.Teacher', on_delete=models.CASCADE)
    
    due_date = models.DateTimeField()
    total_marks = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.class_obj}"


class AssignmentSubmission(models.Model):
    """Student assignment submissions"""
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='submissions')
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    submitted_file = models.FileField(upload_to='assignments/', blank=True, null=True)
    submission_text = models.TextField(blank=True)
    marks_obtained = models.PositiveIntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True)
    graded_by = models.ForeignKey('users.Teacher', on_delete=models.SET_NULL, null=True, blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['assignment', 'student']
    
    def __str__(self):
        return f"{self.student} - {self.assignment.title}"
    
    @property
    def is_late(self):
        return self.submitted_at > self.assignment.due_date
    
    @property
    def percentage(self):
        if self.marks_obtained and self.assignment.total_marks:
            return (self.marks_obtained / self.assignment.total_marks) * 100
        return 0
