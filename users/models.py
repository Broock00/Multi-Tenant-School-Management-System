from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom User model with role-based access control"""
    
    class UserRole(models.TextChoices):
        SUPER_ADMIN = 'super_admin', _('Super Admin')
        SCHOOL_ADMIN = 'school_admin', _('School Admin')
        PRINCIPAL = 'principal', _('Principal')
        TEACHER = 'teacher', _('Teacher')
        STUDENT = 'student', _('Student')
        PARENT = 'parent', _('Parent')
        ACCOUNTANT = 'accountant', _('Accountant')
        LIBRARIAN = 'librarian', _('Librarian')
        NURSE = 'nurse', _('Nurse')
        SECURITY = 'security', _('Security')
    
    # Basic Information
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STUDENT)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    
    # School Information (for multi-tenancy)
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-created_at', 'username']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    @property
    def dashboard_url(self):
        """Return the appropriate dashboard URL based on user role"""
        role_dashboards = {
            self.UserRole.SUPER_ADMIN: '/admin/dashboard/',
            self.UserRole.SCHOOL_ADMIN: '/school-admin/dashboard/',
            self.UserRole.PRINCIPAL: '/principal/dashboard/',
            self.UserRole.TEACHER: '/teacher/dashboard/',
            self.UserRole.STUDENT: '/student/dashboard/',
            self.UserRole.PARENT: '/parent/dashboard/',
            self.UserRole.ACCOUNTANT: '/accountant/dashboard/',
            self.UserRole.LIBRARIAN: '/librarian/dashboard/',
            self.UserRole.NURSE: '/nurse/dashboard/',
            self.UserRole.SECURITY: '/security/dashboard/',
        }
        return role_dashboards.get(self.role, '/dashboard/')

    def save(self, *args, **kwargs):
        # Ensure only superusers have the SUPER_ADMIN role, and vice versa
        if self.is_superuser:
            self.role = self.UserRole.SUPER_ADMIN
        elif self.role == self.UserRole.SUPER_ADMIN:
            self.is_superuser = True
            self.is_staff = True
        super().save(*args, **kwargs)


class Teacher(models.Model):
    """Teacher-specific information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100)
    qualification = models.CharField(max_length=200)
    experience_years = models.PositiveIntegerField(default=0)
    subjects = models.ManyToManyField('classes.Subject', blank=True)
    is_head_teacher = models.BooleanField(default=False)
    head_teacher_classes = models.ManyToManyField('classes.Class', blank=True, related_name='head_teachers')
    
    # Dashboard permissions
    can_manage_students = models.BooleanField(default=True)
    can_manage_attendance = models.BooleanField(default=True)
    can_manage_grades = models.BooleanField(default=True)
    can_send_notifications = models.BooleanField(default=True)
    can_view_reports = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.department}"


class Principal(models.Model):
    """Principal-specific information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='principal_profile')
    employee_id = models.CharField(max_length=20, unique=True)
    qualification = models.CharField(max_length=200)
    experience_years = models.PositiveIntegerField(default=0)
    
    # Dashboard permissions
    can_manage_teachers = models.BooleanField(default=True)
    can_manage_students = models.BooleanField(default=True)
    can_manage_classes = models.BooleanField(default=True)
    can_view_all_reports = models.BooleanField(default=True)
    can_approve_requests = models.BooleanField(default=True)
    can_send_bulk_notifications = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - Principal"


class Accountant(models.Model):
    """Accountant-specific information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='accountant_profile')
    employee_id = models.CharField(max_length=20, unique=True)
    department = models.CharField(max_length=100, default='Finance')
    
    # Dashboard permissions
    can_manage_fees = models.BooleanField(default=True)
    can_view_financial_reports = models.BooleanField(default=True)
    can_process_payments = models.BooleanField(default=True)
    can_send_fee_reminders = models.BooleanField(default=True)
    can_manage_scholarships = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - Accountant"


class UserPermission(models.Model):
    """Custom permissions for role-based access control"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='permissions')
    permission_name = models.CharField(max_length=100)
    is_granted = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'permission_name']
    
    def __str__(self):
        return f"{self.user.username} - {self.permission_name}"


class UserActivity(models.Model):
    """Track user activities for audit and analytics"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=200)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'User Activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.created_at}"


class Parent(models.Model):
    """Parent-specific information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    occupation = models.CharField(max_length=100)
    emergency_contact = models.CharField(max_length=15)
    relationship = models.CharField(max_length=20, default='Parent')
    can_view_children_grades = models.BooleanField(default=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - Parent"
