from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from notifications.services import EmailService
from users.models import User
from datetime import timedelta

# Create your models here.

class School(models.Model):
    """School model for multi-tenancy"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True, null=True)
    principal_name = models.CharField(max_length=100)
    principal_email = models.EmailField()
    principal_phone = models.CharField(max_length=20)
    
    # School details
    established_date = models.DateField(null=True, blank=True)
    school_type = models.CharField(max_length=50, choices=[
        ('primary', 'Primary School'),
        ('secondary', 'Secondary School'),
        ('high', 'High School'),
        ('college', 'College'),
        ('university', 'University'),
        ('mixed', 'Mixed'),
    ], default='mixed')
    
    # Status
    is_active = models.BooleanField(default=True)  # type: ignore
    is_verified = models.BooleanField(default=False)  # type: ignore
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    @property
    def current_subscription(self):
        """Get the current active subscription"""
        return self.subscriptions.filter(status='active').first()
    
    @property
    def subscription_status(self):
        """Get the current subscription status"""
        subscription = self.current_subscription
        if subscription:
            return subscription.status
        return 'no_subscription'


class SubscriptionPlan(models.Model):
    PLAN_CHOICES = [
        ('basic', 'Basic'),
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]
    name = models.CharField(max_length=20, choices=PLAN_CHOICES, unique=True)
    max_students = models.PositiveIntegerField(default=200)
    max_teachers = models.PositiveIntegerField(default=20)
    max_secretaries = models.PositiveIntegerField(default=2)
    max_emails_per_month = models.PositiveIntegerField(default=1000)
    max_sms_per_month = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class Subscription(models.Model):
    """School subscription model"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    
    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        PENDING = 'pending', _('Pending')
        EXPIRED = 'expired', _('Expired')
        CANCELLED = 'cancelled', _('Cancelled')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Subscription period
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Pricing
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Features
    max_users = models.PositiveIntegerField(default=200)  # type: ignore
    max_students = models.PositiveIntegerField(default=500)  # type: ignore
    features = models.JSONField(default=list)  # List of features included
    
    # Auto-renewal
    auto_renew = models.BooleanField(default=True)  # type: ignore
    next_billing_date = models.DateField(null=True, blank=True)
    
    # Payment info
    payment_method = models.CharField(max_length=50, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.school.name} - {self.plan.get_name_display()} ({self.get_status_display()})"
    
    @property
    def is_active(self):
        """Check if subscription is currently active"""
        from django.utils import timezone
        today = timezone.now().date()
        return (
            self.status == self.Status.ACTIVE and
            self.start_date <= today <= self.end_date
        )
    
    @property
    def days_remaining(self):
        """Get days remaining in subscription"""
        from django.utils import timezone
        today = timezone.now().date()
        if self.end_date > today:
            return (self.end_date - today).days  # type: ignore
        return 0
    
    @property
    def is_expiring_soon(self):
        """Check if subscription is expiring within 30 days"""
        return 0 < self.days_remaining <= 30
    
    def get_features_list(self):
        """Get list of features based on plan"""
        plan_features = {
            self.plan.name: [
                'Up to 200 Users',
                'Basic Analytics',
                'Email Support',
                'Standard Reports'
            ],
            'standard': [
                'Up to 500 Users',
                'Advanced Analytics',
                'Email & Phone Support',
                'Custom Reports',
                'API Access'
            ],
            'premium': [
                'Unlimited Users',
                'Advanced Analytics',
                'Priority Support',
                'Custom Reports',
                'API Access',
                'White-label Options',
                'Advanced Security'
            ],
            'enterprise': [
                'Unlimited Everything',
                'Dedicated Support',
                'Custom Development',
                'On-premise Option',
                'SLA Guarantee',
                'Training & Consulting'
            ]
        }
        return plan_features.get(self.plan.name, [])
    
    def save(self, *args, **kwargs):
        # Auto-set features based on plan if not provided
        if not self.features:
            self.features = self.get_features_list()
        
        # Auto-set max users based on plan
        plan_limits = {
            'basic': 200,
            'standard': 500,
            'premium': 10000,
            'enterprise': 100000
        }
        if not self.max_users or self.max_users == 200:  # Default value
            self.max_users = plan_limits.get(self.plan.name, 200)
        
        super().save(*args, **kwargs)

    @property
    def computed_status(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.status == self.Status.CANCELLED:
            return self.Status.CANCELLED
        if self.end_date >= today >= self.start_date:
            return self.Status.ACTIVE
        elif self.end_date < today <= self.end_date + timedelta(days=7):
            return self.Status.PENDING
        elif today > self.end_date + timedelta(days=7):
            return self.Status.EXPIRED
        return self.status

# Signal handlers for Subscription
@receiver(post_save, sender=Subscription)
def subscription_post_save(sender, instance, created, **kwargs):
    school = instance.school
    # Get all school admin users for this school
    admin_emails = list(User.objects.filter(school=school, role=User.UserRole.SCHOOL_ADMIN).values_list('email', flat=True))
    # Add school email and principal email
    recipient_emails = set(email for email in admin_emails + [school.email, school.principal_email] if email)
    # Prepare subscription and school dicts for email service
    subscription_data = {
        'plan': instance.plan.get_name_display(),
        'status': instance.get_status_display(),
        'startDate': instance.start_date.strftime('%Y-%m-%d') if instance.start_date else '',
        'endDate': instance.end_date.strftime('%Y-%m-%d') if instance.end_date else '',
        'amount': instance.amount,
        'currency': instance.currency,
        'features': instance.features,
        'autoRenew': instance.auto_renew,
    }
    school_data = {
        'name': school.name,
        'email': school.email,
        'principal_email': school.principal_email,
    }
    action = 'created' if created else 'updated'
    for email in recipient_emails:
        school_data['principal_email'] = email
        EmailService.send_subscription_notification(action, subscription_data, school_data)

@receiver(post_delete, sender=Subscription)
def subscription_post_delete(sender, instance, **kwargs):
    school = instance.school
    admin_emails = list(User.objects.filter(school=school, role=User.UserRole.SCHOOL_ADMIN).values_list('email', flat=True))
    recipient_emails = set(email for email in admin_emails + [school.email, school.principal_email] if email)
    subscription_data = {
        'plan': instance.plan.get_name_display(),
        'status': instance.get_status_display(),
        'startDate': instance.start_date.strftime('%Y-%m-%d') if instance.start_date else '',
        'endDate': instance.end_date.strftime('%Y-%m-%d') if instance.end_date else '',
        'amount': instance.amount,
        'currency': instance.currency,
        'features': instance.features,
        'autoRenew': instance.auto_renew,
    }
    school_data = {
        'name': school.name,
        'email': school.email,
        'principal_email': school.principal_email,
    }
    for email in recipient_emails:
        school_data['principal_email'] = email
        EmailService.send_subscription_notification('deleted', subscription_data, school_data)

class SchoolCommunicationUsage(models.Model):
    school = models.ForeignKey('School', on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()
    emails_sent = models.PositiveIntegerField(default=0)
    sms_sent = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('school', 'year', 'month')

    def __str__(self):
        return f"{self.school.name} {self.year}-{self.month:02d} (E:{self.emails_sent}, S:{self.sms_sent})"
