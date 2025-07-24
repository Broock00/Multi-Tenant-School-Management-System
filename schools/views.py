from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import School, Subscription, SubscriptionPlan
from .serializers import SchoolSerializer, SubscriptionSerializer, SchoolWithSubscriptionSerializer, SubscriptionPlanSerializer
from django.db import models
from django.db.models import Q, Count, Sum
from django.utils import timezone

# Create your views here.

class SchoolViewSet(viewsets.ModelViewSet):
    """School management viewset"""
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['name', 'code', 'principal_name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter schools based on user role"""
        user = self.request.user
        
        if user.role == 'super_admin':
            return School.objects.all()
        elif user.role in ['school_admin', 'principal', 'secretary']:
            return School.objects.filter(id=user.school.id) if user.school else School.objects.none()
        else:
            return School.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve' or self.action == 'list':
            return SchoolWithSubscriptionSerializer
        return SchoolSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get school statistics"""
        user = request.user
        
        if user.role != 'super_admin':
            return Response(
                {'error': 'Only super admins can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get subscription statistics
        total_schools = School.objects.count()
        active_subscriptions = Subscription.objects.filter(status='active').count()
        expiring_soon = Subscription.objects.filter(
            status='active',
            end_date__lte=timezone.now().date() + timezone.timedelta(days=30),
            end_date__gt=timezone.now().date()
        ).count()
        expired_subscriptions = Subscription.objects.filter(
            status='active',
            end_date__lt=timezone.now().date()
        ).count()
        
        # Calculate revenue
        total_revenue = Subscription.objects.filter(
            status='active'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        stats = {
            'total_schools': total_schools,
            'active_subscriptions': active_subscriptions,
            'expiring_soon': expiring_soon,
            'expired_subscriptions': expired_subscriptions,
            'total_revenue': float(total_revenue),
            'subscription_rate': (active_subscriptions / total_schools * 100) if total_schools > 0 else 0
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def subscriptions(self, request, pk=None):
        """Get all subscriptions for a school"""
        school = self.get_object()
        subscriptions = school.subscriptions.all()
        serializer = SubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def current_subscription(self, request, pk=None):
        """Get current subscription for a school"""
        school = self.get_object()
        subscription = school.current_subscription
        if subscription:
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        return Response({'message': 'No active subscription found'}, status=status.HTTP_404_NOT_FOUND)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """Subscription management viewset"""
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['school__name', 'plan', 'status', 'start_date', 'end_date', 'amount', 'created_at']
    ordering = ['-created_at', 'school__name']
    
    def get_queryset(self):
        """Filter subscriptions based on user role"""
        user = self.request.user
        
        if user.role == 'super_admin':
            return Subscription.objects.all()
        elif user.role in ['school_admin', 'principal']:
            return Subscription.objects.filter(school=user.school) if user.school else Subscription.objects.none()
        else:
            return Subscription.objects.none()
    
    def perform_create(self, serializer):
        """Set the school based on the current user"""
        user = self.request.user
        if user.role in ['school_admin', 'principal'] and user.school:
            serializer.save(school=user.school)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active subscriptions"""
        queryset = self.get_queryset().filter(status='active')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get subscriptions expiring within 30 days"""
        from django.utils import timezone
        from datetime import timedelta
        
        thirty_days_from_now = timezone.now().date() + timedelta(days=30)
        queryset = self.get_queryset().filter(
            status='active',
            end_date__lte=thirty_days_from_now,
            end_date__gt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired subscriptions"""
        from django.utils import timezone
        
        queryset = self.get_queryset().filter(
            status='active',
            end_date__lt=timezone.now().date()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """Renew a subscription"""
        subscription = self.get_object()
        
        # Add renewal logic here
        # For now, just update the status
        subscription.status = 'active'
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()
        subscription.status = 'cancelled'
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'role', None) == 'super_admin'

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsSuperAdmin]
