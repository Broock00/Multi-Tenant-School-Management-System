from django.db import models
from users.models import User
from classes.models import Class, Subject


class Exam(models.Model):
    """Exam model"""
    EXAM_TYPES = [
        ('midterm', 'Mid Term'),
        ('final', 'Final Term'),
        ('unit', 'Unit Test'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment'),
    ]
    
    name = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='exams')
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='exams')
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(default=60)
    instructions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.subject.name} ({self.class_obj.name})"


class ExamSchedule(models.Model):
    """Exam schedule model"""
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='schedules')
    exam_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['exam_date', 'start_time']
    
    def __str__(self):
        return f"{self.exam.name} - {self.exam_date}"


class ExamResult(models.Model):
    """Exam result model"""
    GRADES = [
        ('A+', 'A+'),
        ('A', 'A'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B', 'B'),
        ('B-', 'B-'),
        ('C+', 'C+'),
        ('C', 'C'),
        ('C-', 'C-'),
        ('D+', 'D+'),
        ('D', 'D'),
        ('F', 'F'),
    ]
    
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='exam_results')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2)
    grade = models.CharField(max_length=2, choices=GRADES, null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'exam']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.exam.name}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate grade based on percentage
        if self.marks_obtained and self.total_marks:
            percentage = (self.marks_obtained / self.total_marks) * 100
            if percentage >= 97:
                self.grade = 'A+'
            elif percentage >= 93:
                self.grade = 'A'
            elif percentage >= 90:
                self.grade = 'A-'
            elif percentage >= 87:
                self.grade = 'B+'
            elif percentage >= 83:
                self.grade = 'B'
            elif percentage >= 80:
                self.grade = 'B-'
            elif percentage >= 77:
                self.grade = 'C+'
            elif percentage >= 73:
                self.grade = 'C'
            elif percentage >= 70:
                self.grade = 'C-'
            elif percentage >= 67:
                self.grade = 'D+'
            elif percentage >= 63:
                self.grade = 'D'
            else:
                self.grade = 'F'
        super().save(*args, **kwargs)
