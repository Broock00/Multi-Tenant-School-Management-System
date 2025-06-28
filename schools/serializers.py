from rest_framework import serializers
from .models import School, Subscription, SubscriptionPlan


class SchoolSerializer(serializers.ModelSerializer):
    """School serializer"""
    subscription_status = serializers.ReadOnlyField()
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'address', 'phone', 'email', 'website',
            'principal_name', 'principal_email', 'principal_phone',
            'established_date', 'school_type', 'is_active', 'is_verified',
            'subscription_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Subscription serializer"""
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_code = serializers.CharField(source='school.code', read_only=True)
    plan_display = serializers.CharField(source='plan.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'school', 'school_name', 'school_code', 'plan', 'plan_display',
            'status', 'status_display', 'start_date', 'end_date', 'amount',
            'currency', 'max_users', 'max_students', 'features', 'auto_renew',
            'next_billing_date', 'payment_method', 'transaction_id', 'notes',
            'is_active', 'days_remaining', 'is_expiring_soon', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate subscription data"""
        # Ensure end_date is after start_date
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError("End date must be after start date")
        
        # Ensure amount is positive
        if data.get('amount') and data['amount'] <= 0:
            raise serializers.ValidationError("Amount must be positive")
        
        return data


class SchoolWithSubscriptionSerializer(serializers.ModelSerializer):
    """School serializer with current subscription details"""
    current_subscription = SubscriptionSerializer(read_only=True)
    subscription_status = serializers.ReadOnlyField()
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'code', 'address', 'phone', 'email', 'website',
            'principal_name', 'principal_email', 'principal_phone',
            'established_date', 'school_type', 'is_active', 'is_verified',
            'current_subscription', 'subscription_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__' 