from django.db import models
from users.models import User
from schools.models import School
from classes.models import Class
import secrets
import string


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
    
    def generate_username(self):
        """Generate a unique username based on school code and sequential numbering"""
        if not self.school:
            return None
        
        school_code = self.school.code
        if not school_code:
            return None
        
        # Find the next available number for this school
        existing_students = Student.objects.filter(school=self.school).order_by('-id')
        
        if not existing_students.exists():
            next_number = 1
        else:
            # Try to extract number from existing usernames
            numbers = []
            for student in existing_students:
                if student.user.username.startswith(school_code):
                    try:
                        number_part = student.user.username[len(school_code):]
                        if number_part.isdigit():
                            numbers.append(int(number_part))
                    except (ValueError, IndexError):
                        continue
            
            if numbers:
                next_number = max(numbers) + 1
            else:
                next_number = 1
        
        # Format with 3-6 digits depending on expected student count
        if next_number <= 999:
            format_str = f"{school_code}{next_number:03d}"
        elif next_number <= 9999:
            format_str = f"{school_code}{next_number:04d}"
        elif next_number <= 99999:
            format_str = f"{school_code}{next_number:05d}"
        else:
            format_str = f"{school_code}{next_number:06d}"
        
        return format_str
    
    def generate_password(self):
        """Generate a secure random password"""
        # 8 characters: letters, numbers, symbols
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(8))
    
    def create_user_account(self):
        """Create a user account for the student with auto-generated credentials"""
        if not self.user:
            username = self.generate_username()
            password = self.generate_password()
            
            # Create user
            user = User.objects.create_user(
                username=username,
                email=self.user.email if hasattr(self, 'user') and self.user else f"{username}@school.com",
                password=password,
                first_name=self.user.first_name if hasattr(self, 'user') and self.user else '',
                last_name=self.user.last_name if hasattr(self, 'user') and self.user else '',
                role='student',
                school=self.school
            )
            
            self.user = user
            self.save()
            
            return {
                'username': username,
                'password': password,
                'user_id': user.id
            }
        return None

    def save(self, *args, **kwargs):
        if not self.student_id:
            last = self.__class__.objects.order_by('-id').first()
            next_id = 1 if not last else last.id + 1
            self.student_id = f'STU{next_id:04d}'
        super().save(*args, **kwargs)
