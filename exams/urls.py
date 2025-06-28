from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExamViewSet, ExamScheduleViewSet, ExamResultViewSet
)

router = DefaultRouter()
router.register(r'exams', ExamViewSet)
router.register(r'schedules', ExamScheduleViewSet)
router.register(r'results', ExamResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 