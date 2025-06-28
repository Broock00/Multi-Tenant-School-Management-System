from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from schools.models import School, Subscription


class Command(BaseCommand):
    help = 'Set up sample subscription data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up sample subscription data...')
        
        # Get existing schools or create some if none exist
        schools = School.objects.all()
        if not schools.exists():
            self.stdout.write('No schools found. Creating sample schools...')
            schools = [
                School.objects.create(
                    name='Springfield High School',
                    code='SHS',
                    address='123 Main St, Springfield',
                    phone='555-0101',
                    email='info@springfield.edu',
                    website='https://springfield.edu',
                    principal_name='John Smith',
                    principal_email='principal@springfield.edu',
                    principal_phone='555-0102',
                    school_type='high',
                    is_active=True,
                    is_verified=True
                ),
                School.objects.create(
                    name='Riverside Academy',
                    code='RA',
                    address='456 Oak Ave, Riverside',
                    phone='555-0201',
                    email='info@riverside.edu',
                    website='https://riverside.edu',
                    principal_name='Sarah Johnson',
                    principal_email='principal@riverside.edu',
                    principal_phone='555-0202',
                    school_type='mixed',
                    is_active=True,
                    is_verified=True
                ),
                School.objects.create(
                    name='Central Elementary',
                    code='CE',
                    address='789 Pine St, Central',
                    phone='555-0301',
                    email='info@central.edu',
                    website='https://central.edu',
                    principal_name='Mike Davis',
                    principal_email='principal@central.edu',
                    principal_phone='555-0302',
                    school_type='primary',
                    is_active=True,
                    is_verified=True
                ),
                School.objects.create(
                    name='North High School',
                    code='NHS',
                    address='321 Elm St, North',
                    phone='555-0401',
                    email='info@north.edu',
                    website='https://north.edu',
                    principal_name='Lisa Wilson',
                    principal_email='principal@north.edu',
                    principal_phone='555-0402',
                    school_type='high',
                    is_active=True,
                    is_verified=True
                ),
            ]
        
        # Create subscriptions for each school
        plans = [
            (Subscription.Plan.PREMIUM, 1200, '2025-01-01', '2025-12-31'),
            (Subscription.Plan.STANDARD, 800, '2025-01-01', '2025-07-31'),
            (Subscription.Plan.BASIC, 500, '2025-01-01', '2025-02-28'),
            (Subscription.Plan.STANDARD, 800, '2025-01-01', '2025-06-15'),
        ]
        
        for i, school in enumerate(schools):
            plan, amount, start_date, end_date = plans[i % len(plans)]
            
            # Check if school already has a subscription
            if not school.subscriptions.exists():
                subscription = Subscription.objects.create(
                    school=school,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
                    start_date=start_date,
                    end_date=end_date,
                    amount=amount,
                    auto_renew=True,
                    payment_method='credit_card',
                    transaction_id=f'TXN-{school.code}-{i+1:03d}',
                    notes=f'Sample subscription for {school.name}'
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created {subscription.get_plan_display()} subscription for {school.name}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Subscription already exists for {school.name}'
                    )
                )
        
        # Create some expired and pending subscriptions for variety
        if schools.count() >= 2:
            # Make one subscription expired
            expired_school = schools[1]
            expired_sub = expired_school.subscriptions.first()
            if expired_sub:
                expired_sub.status = Subscription.Status.EXPIRED
                expired_sub.end_date = date.today() - timedelta(days=30)
                expired_sub.save()
                self.stdout.write(
                    self.style.WARNING(
                        f'Made subscription expired for {expired_school.name}'
                    )
                )
            
            # Make one subscription pending
            if schools.count() >= 3:
                pending_school = schools[2]
                pending_sub = pending_school.subscriptions.first()
                if pending_sub:
                    pending_sub.status = Subscription.Status.PENDING
                    pending_sub.save()
                    self.stdout.write(
                        self.style.WARNING(
                            f'Made subscription pending for {pending_school.name}'
                        )
                    )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully set up sample subscription data!')
        ) 