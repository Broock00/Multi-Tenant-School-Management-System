from django.contrib import admin
from .models import Class, Subject, ClassSubject, ClassSchedule, Attendance, Assignment, AssignmentSubmission

admin.site.register(Class)
admin.site.register(Subject)
admin.site.register(ClassSubject)
admin.site.register(ClassSchedule)
admin.site.register(Attendance)
admin.site.register(Assignment)
admin.site.register(AssignmentSubmission)
