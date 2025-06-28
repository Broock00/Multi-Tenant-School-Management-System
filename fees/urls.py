from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeeStructureViewSet, StudentFeeViewSet, PaymentViewSet,
    FeeCategoryViewSet, ScholarshipViewSet, FeeReportViewSet
)

router = DefaultRouter()
router.register(r'structures', FeeStructureViewSet)
router.register(r'student-fees', StudentFeeViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'categories', FeeCategoryViewSet)
router.register(r'scholarships', ScholarshipViewSet)
router.register(r'reports', FeeReportViewSet, basename='fee-report')

urlpatterns = [
    path('', include(router.urls)),
] 