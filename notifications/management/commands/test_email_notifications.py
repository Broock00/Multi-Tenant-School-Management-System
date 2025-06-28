from django.core.management.base import BaseCommand
from notifications.services import EmailService
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Test email notifications for subscription events'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['created', 'updated', 'cancelled', 'expiring', 'expired'],
            default='created',
            help='Type of notification to test'
        )

    def handle(self, *args, **options):
        notification_type = options['type']
        
        # Sample data for testing
        school = {
            'name': 'Springfield High School',
            'principal_email': 'principal@springfield.edu',
        }
        
        subscription = {
            'plan': 'Premium',
            'status': 'active',
            'amount': 1200,
            'startDate': '2025-01-01',
            'endDate': '2025-12-31',
            'autoRenew': True,
            'features': ['Unlimited Users', 'Advanced Analytics', 'Priority Support'],
        }
        
        self.stdout.write(
            self.style.SUCCESS(f'Testing {notification_type} notification...')
        )
        
        try:
            if notification_type in ['created', 'updated', 'cancelled']:
                success = EmailService.send_subscription_notification(
                    notification_type, subscription, school
                )
            elif notification_type == 'expiring':
                success = EmailService.send_subscription_expiry_warning(
                    subscription, school, 30
                )
            elif notification_type == 'expired':
                success = EmailService.send_subscription_expired_notification(
                    subscription, school
                )
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ {notification_type} notification sent successfully!')
                )
                self.stdout.write(f'📧 Email sent to: {school["principal_email"]}')
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to send {notification_type} notification')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error sending notification: {str(e)}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('Test completed!')
        ) 