from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, DashboardView, UserViewSet, TeacherViewSet,
    PrincipalViewSet, AccountantViewSet, ParentViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'principals', PrincipalViewSet)
router.register(r'accountants', AccountantViewSet)
router.register(r'parents', ParentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    
    # Role-specific dashboard endpoints
    path('teacher/dashboard/', DashboardView.as_view(), name='teacher_dashboard'),
    path('student/dashboard/', DashboardView.as_view(), name='student_dashboard'),
    path('principal/dashboard/', DashboardView.as_view(), name='principal_dashboard'),
    path('accountant/dashboard/', DashboardView.as_view(), name='accountant_dashboard'),
    path('admin/dashboard/', DashboardView.as_view(), name='admin_dashboard'),
] 