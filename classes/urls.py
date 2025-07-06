from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClassViewSet, SubjectViewSet, ClassSubjectViewSet, AttendanceViewSet, AssignmentViewSet,
    ClassScheduleViewSet, AssignmentSubmissionViewSet
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet)
router.register(r'class-subjects', ClassSubjectViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'assignments', AssignmentViewSet)
router.register(r'schedules', ClassScheduleViewSet)
router.register(r'submissions', AssignmentSubmissionViewSet)
router.register(r'', ClassViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 