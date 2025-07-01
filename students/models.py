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
    student_id = models.CharField(max_length=20, unique=True, help_text="Auto-generated student ID (do not set manually)")
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    address = models.TextField()
    phone_number = models.CharField(max_length=15, blank=True)
    emergency_contact = models.CharField(max_length=15)
    emergency_contact_name = models.CharField(max_length=100)
    
    # Academic Information
    enrollment_date = models.DateField(auto_now_add=True)
    year = models.CharField(max_length=4, help_text="Academic year (e.g., 1, 2, ..., 12)")
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
    def age(self):
        from datetime import date
        dob = self.date_of_birth
        if not dob:
            return None
        if not isinstance(dob, date):
            return None
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def save(self, *args, **kwargs):
        if not self.student_id:
            last = self.__class__.objects.order_by('-id').first()
            next_id = 1 if not last else last.id + 1
            self.student_id = f'STU{next_id:04d}'
        super().save(*args, **kwargs)
