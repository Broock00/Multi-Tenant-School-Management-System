from django.db import models
from users.models import User
from schools.models import School
from classes.models import Class


class Student(models.Model):
    """Student model"""
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='students')
    current_class = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrolled_students')
    
    # Personal Information
    student_id = models.CharField(max_length=20, unique=True, help_text="Unique student ID")
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address = models.TextField()
    phone_number = models.CharField(max_length=15, blank=True)
    emergency_contact = models.CharField(max_length=15)
    emergency_contact_name = models.CharField(max_length=100)
    
    # Academic Information
    enrollment_date = models.DateField(auto_now_add=True)
    graduation_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    academic_status = models.CharField(max_length=20, default='enrolled', choices=[
        ('enrolled', 'Enrolled'),
        ('graduated', 'Graduated'),
        ('transferred', 'Transferred'),
        ('expelled', 'Expelled'),
    ])
    
    # Additional Information
    blood_group = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    medical_conditions = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    parents = models.ManyToManyField('users.Parent', related_name='children', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.student_id}"
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    @property
    def email(self):
        return self.user.email
    
    @property
    def age(self):
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
