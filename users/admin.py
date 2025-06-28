from django.contrib import admin
from .models import User, Teacher, Principal, Accountant, UserPermission, UserActivity

admin.site.register(User)
admin.site.register(Teacher)
admin.site.register(Principal)
admin.site.register(Accountant)
admin.site.register(UserPermission)
admin.site.register(UserActivity)