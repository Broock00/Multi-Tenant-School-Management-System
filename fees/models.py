from django.db import models
from django.utils.translation import gettext_lazy as _


class FeeCategory(models.Model):
    """Fee categories like tuition, library, sports, etc."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class FeeStructure(models.Model):
    """Fee structure for different classes"""
    class_obj = models.ForeignKey('classes.Class', on_delete=models.CASCADE, related_name='fee_structures')
    category = models.ForeignKey(FeeCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=[
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
        ('one_time', 'One Time'),
    ], default='monthly')
    academic_year = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['class_obj', 'category', 'academic_year']
    
    def __str__(self):
        return f"{self.class_obj} - {self.category} - {self.amount}"


class StudentFee(models.Model):
    """Individual student fee records"""
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='fees')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE)
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PARTIAL = 'partial', _('Partially Paid')
        PAID = 'paid', _('Paid')
        OVERDUE = 'overdue', _('Overdue')
        WAIVED = 'waived', _('Waived')
    
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student} - {self.fee_structure.category} - {self.due_date}"
    
    @property
    def balance(self):
        return self.amount - self.paid_amount
    
    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.due_date < timezone.now().date() and self.status != Status.PAID


class Payment(models.Model):
    """Payment records"""
    student_fee = models.ForeignKey(StudentFee, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    class PaymentMethod(models.TextChoices):
        CASH = 'cash', _('Cash')
        CARD = 'card', _('Card')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
        MOBILE_MONEY = 'mobile_money', _('Mobile Money')
        CHECK = 'check', _('Check')
    
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    transaction_id = models.CharField(max_length=100, blank=True)
    receipt_number = models.CharField(max_length=50, unique=True)
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
    
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    processed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student_fee.student} - {self.amount} - {self.payment_method}"


class Scholarship(models.Model):
    """Student scholarships and discounts"""
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='scholarships')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2)  # Discount percentage
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Fixed amount
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student} - {self.name}"


class FeeReminder(models.Model):
    """Automated fee reminders"""
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='fee_reminders')
    student_fee = models.ForeignKey(StudentFee, on_delete=models.CASCADE, related_name='reminders')
    
    class ReminderType(models.TextChoices):
        SMS = 'sms', _('SMS')
        EMAIL = 'email', _('Email')
        PUSH = 'push', _('Push Notification')
    
    reminder_type = models.CharField(max_length=10, choices=ReminderType.choices)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_sent = models.BooleanField(default=False)
    sent_to = models.CharField(max_length=100, blank=True)  # Phone/Email
    
    def __str__(self):
        return f"{self.student} - {self.reminder_type} - {self.sent_at}"


class FinancialReport(models.Model):
    """Financial reports and analytics"""
    title = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ])
    start_date = models.DateField()
    end_date = models.DateField()
    total_collected = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_pending = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_overdue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    report_data = models.JSONField(default=dict)  # Detailed report data
    generated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.start_date} to {self.end_date}"
