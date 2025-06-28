from django.core.management.base import BaseCommand
from django.utils import timezone
from schools.models import Subscription
from users.models import User
from notifications.services import EmailService

class Command(BaseCommand):
    help = 'Send warning emails for subscriptions expiring in 3 days and 1 day.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        for days_left in [3, 1]:
            target_date = today + timezone.timedelta(days=days_left)
            expiring_subs = Subscription.objects.filter(
                status=Subscription.Status.ACTIVE,
                end_date=target_date
            )
            for sub in expiring_subs:
                school = sub.school
                admin_emails = list(User.objects.filter(school=school, role=User.UserRole.SCHOOL_ADMIN).values_list('email', flat=True))
                recipient_emails = set(admin_emails + [school.email, school.principal_email])
                subscription_data = {
                    'plan': sub.get_plan_display(),  # type: ignore
                    'status': sub.get_status_display(),  # type: ignore
                    'start_date': sub.start_date,
                    'end_date': sub.end_date,
                    'amount': sub.amount,
                    'currency': sub.currency,
                }
                school_data = {
                    'name': school.name,
                    'email': school.email,
                    'principal_email': school.principal_email,
                }
                for email in recipient_emails:
                    school_data['principal_email'] = email
                    EmailService.send_subscription_expiry_warning(subscription_data, school_data, days_left)
                self.stdout.write(self.style.SUCCESS(f"Sent {days_left}-day expiry warning for {school.name}")) 