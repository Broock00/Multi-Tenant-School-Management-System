from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, SubscriptionViewSet, SubscriptionPlanViewSet

router = DefaultRouter()
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'plans', SubscriptionPlanViewSet, basename='plan')

urlpatterns = [
    path('', include(router.urls)),
] 