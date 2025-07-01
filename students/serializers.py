from rest_framework import serializers
from .models import Student
from users.serializers import UserSerializer
from classes.serializers import ClassSerializer


class StudentSerializer(serializers.ModelSerializer):
    """Student serializer"""
    user = UserSerializer(read_only=True)
    current_class = ClassSerializer(read_only=True)
    current_class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    age = serializers.ReadOnlyField()
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'user', 'school', 'current_class', 'current_class_id',
            'student_id', 'date_of_birth', 'gender', 'address', 'phone_number',
            'emergency_contact', 'emergency_contact_name', 'enrollment_date',
            'year', 'is_active', 'academic_status', 'blood_group',
            'allergies', 'medical_conditions', 'notes', 'age',
            'created_at', 'updated_at', 'payment_status'
        ]
        read_only_fields = ['id', 'enrollment_date', 'created_at', 'updated_at']
    
    def validate_student_id(self, value):
        """Validate unique student ID"""
        if Student.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("Student ID must be unique.")
        return value
    
    def create(self, validated_data):
        """Create student with user"""
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

    def get_payment_status(self, obj):
        from fees.models import StudentFee, Scholarship
        from django.utils import timezone
        today = timezone.now().date()
        # Check if student is a scholar and has an active scholarship
        active_scholarship = obj.scholarships.filter(is_active=True, start_date__lte=today).order_by('-start_date').first()
        if active_scholarship:
            # If scholarship has end_date, check if still valid
            if active_scholarship.end_date and active_scholarship.end_date < today:
                pass  # Expired
            else:
                return 'paid'
        # Otherwise, check student fees
        fees = StudentFee.objects.filter(student=obj)
        if not fees.exists():
            return 'paid'  # No fees = paid
        if fees.filter(status__in=['pending', 'partial', 'overdue']).exists():
            return 'pending'
        return 'paid'


class StudentListSerializer(serializers.ModelSerializer):
    """Simplified student serializer for list views"""
    user = UserSerializer(read_only=True)
    current_class = ClassSerializer(read_only=True)
    age = serializers.ReadOnlyField()
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'user', 'current_class', 'student_id', 'date_of_birth',
            'gender', 'is_active', 'academic_status', 'age', 'enrollment_date', 'payment_status'
        ] 
    
    def get_payment_status(self, obj):
        from fees.models import StudentFee, Scholarship
        from django.utils import timezone
        today = timezone.now().date()
        active_scholarship = obj.scholarships.filter(is_active=True, start_date__lte=today).order_by('-start_date').first()
        if active_scholarship:
            if active_scholarship.end_date and active_scholarship.end_date < today:
                pass
            else:
                return 'paid'
        fees = StudentFee.objects.filter(student=obj)
        if not fees.exists():
            return 'paid'
        if fees.filter(status__in=['pending', 'partial', 'overdue']).exists():
            return 'pending'
        return 'paid' 