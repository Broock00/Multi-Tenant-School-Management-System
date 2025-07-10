from django.contrib import admin
from .models import School, SubscriptionPlan, Subscription, SchoolCommunicationUsage

# Register your models here.
admin.site.register(School)
admin.site.register(SubscriptionPlan)
admin.site.register(Subscription)
admin.site.register(SchoolCommunicationUsage)
