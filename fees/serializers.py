from rest_framework import serializers
from django.db import models
from .models import FeeStructure, StudentFee, Payment, FeeCategory, Scholarship


class FeeCategorySerializer(serializers.ModelSerializer):
    """Fee category serializer"""
    class Meta:
        model = FeeCategory
        fields = [
            'id', 'name', 'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FeeStructureSerializer(serializers.ModelSerializer):
    """Fee structure serializer"""
    class_obj = serializers.SerializerMethodField()
    category = FeeCategorySerializer(read_only=True)
    
    class Meta:
        model = FeeStructure
        fields = [
            'id', 'class_obj', 'category', 'amount', 'frequency',
            'academic_year', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_class_obj(self, obj):
        return {
            'id': obj.class_obj.id,
            'name': obj.class_obj.name,
            'section': obj.class_obj.section
        }


class StudentFeeSerializer(serializers.ModelSerializer):
    """Student fee serializer"""
    student_info = serializers.SerializerMethodField()
    fee_structure = FeeStructureSerializer(read_only=True)
    payments = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentFee
        fields = [
            'id', 'student', 'student_info', 'structure', 'fee_structure', 'amount',
            'due_date', 'status', 'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_student_info(self, obj):
        return {
            'id': obj.student.id,
            'name': obj.student.user.get_full_name(),
            'student_id': obj.student.student_id,
            'class': obj.student.current_class.name if obj.student.current_class else None
        }
    
    def get_payments(self, obj):
        payments = obj.payments.all()
        return [{
            'id': payment.id,
            'amount': payment.amount,
            'payment_method': payment.payment_method,
            'status': payment.status,
            'created_at': payment.created_at
        } for payment in payments]
    
    def get_paid_amount(self, obj):
        return obj.payments.filter(status='completed').aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    
    def get_remaining_amount(self, obj):
        paid = self.get_paid_amount(obj)
        return max(0, obj.amount - paid)


class PaymentSerializer(serializers.ModelSerializer):
    """Payment serializer"""
    student_fee = StudentFeeSerializer(read_only=True)
    processed_by_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student_fee', 'amount', 'payment_method', 'reference_number',
            'status', 'processed_by', 'processed_by_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_processed_by_info(self, obj):
        if obj.processed_by:
            return {
                'id': obj.processed_by.id,
                'name': obj.processed_by.get_full_name(),
                'role': obj.processed_by.get_role_display()
            }
        return None


class ScholarshipSerializer(serializers.ModelSerializer):
    """Scholarship serializer"""
    student_info = serializers.SerializerMethodField()
    approved_by_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Scholarship
        fields = [
            'id', 'student', 'student_info', 'scholarship_type', 'amount',
            'percentage', 'reason', 'status', 'approved_by', 'approved_by_info',
            'approved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'approved_at', 'created_at', 'updated_at']
    
    def get_student_info(self, obj):
        return {
            'id': obj.student.id,
            'name': obj.student.user.get_full_name(),
            'student_id': obj.student.student_id,
            'class': obj.student.current_class.name if obj.student.current_class else None
        }
    
    def get_approved_by_info(self, obj):
        if obj.approved_by:
            return {
                'id': obj.approved_by.id,
                'name': obj.approved_by.get_full_name(),
                'role': obj.approved_by.get_role_display()
            }
        return None 