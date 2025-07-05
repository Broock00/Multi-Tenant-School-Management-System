from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from .models import (
    FeeStructure, StudentFee, Payment, FeeCategory, Scholarship
)
from .serializers import (
    FeeStructureSerializer, StudentFeeSerializer, PaymentSerializer,
    FeeCategorySerializer, ScholarshipSerializer
)


class FeeStructureViewSet(viewsets.ModelViewSet):
    """Fee structure management viewset"""
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter fee structures based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return FeeStructure.objects.all()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                if student.current_class:
                    return FeeStructure.objects.filter(class_obj=student.current_class)
            except:
                pass
        return FeeStructure.objects.none()


class StudentFeeViewSet(viewsets.ModelViewSet):
    """Student fee management viewset"""
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter student fees based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return StudentFee.objects.all()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return StudentFee.objects.filter(student=student)
            except:
                return StudentFee.objects.none()
        return StudentFee.objects.none()
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending fees"""
        queryset = self.get_queryset().filter(status='pending')
        serializer = StudentFeeSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue fees"""
        queryset = self.get_queryset().filter(status='overdue')
        serializer = StudentFeeSerializer(queryset, many=True)
        return Response(serializer.data)


class PaymentViewSet(viewsets.ModelViewSet):
    """Payment management viewset"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter payments based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return Payment.objects.all()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return Payment.objects.filter(student_fee__student=student)
            except:
                return Payment.objects.none()
        return Payment.objects.none()
    
    @action(detail=False, methods=['post'])
    def process_payment(self, request):
        """Process a payment"""
        user = request.user
        if user.role not in [user.UserRole.ACCOUNTANT, user.UserRole.SCHOOL_ADMIN]:
            return Response({'error': 'Only accountants and school admins can process payments'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        student_fee_id = request.data.get('student_fee_id')
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        reference_number = request.data.get('reference_number', '')
        
        if not all([student_fee_id, amount, payment_method]):
            return Response({'error': 'Missing required data'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            student_fee = StudentFee.objects.get(id=student_fee_id)
            
            # Create payment record
            payment = Payment.objects.create(
                student_fee=student_fee,
                amount=amount,
                payment_method=payment_method,
                reference_number=reference_number,
                processed_by=user
            )
            
            # Update student fee status
            if amount >= student_fee.amount:
                student_fee.status = 'paid'
            else:
                student_fee.status = 'partial'
            student_fee.save()
            
            serializer = PaymentSerializer(payment)
            return Response(serializer.data)
            
        except StudentFee.DoesNotExist:
            return Response({'error': 'Student fee not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def today_collections(self, request):
        """Get today's collections"""
        today = timezone.now().date()
        payments = self.get_queryset().filter(
            created_at__date=today,
            status='completed'
        )
        
        total_amount = payments.aggregate(total=Sum('amount'))['total'] or 0
        payment_count = payments.count()
        
        return Response({
            'date': today,
            'total_amount': total_amount,
            'payment_count': payment_count,
            'payments': PaymentSerializer(payments, many=True).data
        })


class FeeCategoryViewSet(viewsets.ModelViewSet):
    """Fee category management viewset"""
    queryset = FeeCategory.objects.all()
    serializer_class = FeeCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter fee categories based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return FeeCategory.objects.all()
        return FeeCategory.objects.none()


class ScholarshipViewSet(viewsets.ModelViewSet):
    """Scholarship management viewset"""
    queryset = Scholarship.objects.all()
    serializer_class = ScholarshipSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter scholarships based on user role"""
        user = self.request.user
        
        if user.role in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return Scholarship.objects.all()
        elif user.role == user.UserRole.STUDENT:
            try:
                student = user.student_profile
                return Scholarship.objects.filter(student=student)
            except:
                return Scholarship.objects.none()
        return Scholarship.objects.none()


class FeeReportViewSet(viewsets.ViewSet):
    """Fee reporting viewset"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get fee summary report"""
        user = request.user
        if user.role not in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get date range from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date and end_date:
            start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            # Default to current month
            today = timezone.now().date()
            start_date = today.replace(day=1)
            end_date = today
        
        # Calculate summary statistics
        total_fees = StudentFee.objects.filter(
            due_date__range=[start_date, end_date]
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        total_paid = Payment.objects.filter(
            created_at__date__range=[start_date, end_date],
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        pending_fees = StudentFee.objects.filter(
            status='pending',
            due_date__lte=timezone.now().date()
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        overdue_fees = StudentFee.objects.filter(
            status='overdue'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Payment method breakdown
        payment_methods = Payment.objects.filter(
            created_at__date__range=[start_date, end_date],
            status='completed'
        ).values('payment_method').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'summary': {
                'total_fees': total_fees,
                'total_paid': total_paid,
                'pending_fees': pending_fees,
                'overdue_fees': overdue_fees,
                'collection_rate': (total_paid / total_fees * 100) if total_fees > 0 else 0
            },
            'payment_methods': payment_methods
        })
    
    @action(detail=False, methods=['get'])
    def class_wise(self, request):
        """Get class-wise fee collection report"""
        user = request.user
        if user.role not in [user.UserRole.SUPER_ADMIN, user.UserRole.SCHOOL_ADMIN, user.UserRole.PRINCIPAL, user.UserRole.ACCOUNTANT]:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        from classes.models import Class
        
        classes = Class.objects.all()
        class_data = []
        
        for class_obj in classes:
            students = class_obj.enrolled_students.all()
            total_students = students.count()
            
            if total_students == 0:
                continue
            
            total_fees = StudentFee.objects.filter(
                student__in=students
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            total_paid = Payment.objects.filter(
                student_fee__student__in=students,
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            pending_count = StudentFee.objects.filter(
                student__in=students,
                status='pending'
            ).count()
            
            class_data.append({
                'class_id': class_obj.id,
                'class_name': f"{class_obj.name} - {class_obj.section}",
                'total_students': total_students,
                'total_fees': total_fees,
                'total_paid': total_paid,
                'pending_count': pending_count,
                'collection_rate': (total_paid / total_fees * 100) if total_fees > 0 else 0
            })
        
        return Response(class_data)
