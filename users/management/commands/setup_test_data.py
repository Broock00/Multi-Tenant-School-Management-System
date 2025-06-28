from django.core.management.base import BaseCommand
from schools.models import School
from users.models import User, UserActivity
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Set up test data for the dashboard'

    def handle(self, *args, **options):
        self.stdout.write('Setting up test data...')
        
        # Create test schools
        schools_data = [
            {
                'name': 'Springfield High School',
                'code': 'SHS001',
                'address': '123 Main St, Springfield',
                'phone': '555-0123',
                'email': 'info@springfield.edu',
                'principal_name': 'Dr. John Principal',
                'principal_phone': '555-0124',
                'principal_email': 'principal@springfield.edu',
            },
            {
                'name': 'Riverside Academy',
                'code': 'RA002',
                'address': '456 Oak Ave, Riverside',
                'phone': '555-0456',
                'email': 'info@riverside.edu',
                'principal_name': 'Dr. Sarah Johnson',
                'principal_phone': '555-0457',
                'principal_email': 'principal@riverside.edu',
            },
            {
                'name': 'Central Elementary',
                'code': 'CE003',
                'address': '789 Pine Rd, Central',
                'phone': '555-0789',
                'email': 'info@central.edu',
                'principal_name': 'Ms. Mary Wilson',
                'principal_phone': '555-0790',
                'principal_email': 'principal@central.edu',
            },
            {
                'name': 'North High School',
                'code': 'NHS004',
                'address': '321 Elm St, North',
                'phone': '555-0321',
                'email': 'info@north.edu',
                'principal_name': 'Dr. Robert Brown',
                'principal_phone': '555-0322',
                'principal_email': 'principal@north.edu',
            },
            {
                'name': 'South Middle School',
                'code': 'SMS005',
                'address': '654 Maple Dr, South',
                'phone': '555-0654',
                'email': 'info@south.edu',
                'principal_name': 'Mr. David Lee',
                'principal_phone': '555-0655',
                'principal_email': 'principal@south.edu',
            },
        ]
        
        created_schools = 0
        for school_data in schools_data:
            school, created = School.objects.get_or_create(
                name=school_data['name'],
                defaults=school_data
            )
            if created:
                created_schools += 1
                self.stdout.write(f'Created school: {school.name}')
        
        # Create some test users
        users_data = [
            {
                'username': 'teacher1',
                'email': 'teacher1@springfield.edu',
                'first_name': 'John',
                'last_name': 'Smith',
                'role': User.UserRole.TEACHER,
                'school': School.objects.get(name='Springfield High School'),
            },
            {
                'username': 'teacher2',
                'email': 'teacher2@riverside.edu',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'role': User.UserRole.TEACHER,
                'school': School.objects.get(name='Riverside Academy'),
            },
            {
                'username': 'student1',
                'email': 'student1@springfield.edu',
                'first_name': 'Mike',
                'last_name': 'Davis',
                'role': User.UserRole.STUDENT,
                'school': School.objects.get(name='Springfield High School'),
            },
            {
                'username': 'student2',
                'email': 'student2@riverside.edu',
                'first_name': 'Emma',
                'last_name': 'Wilson',
                'role': User.UserRole.STUDENT,
                'school': School.objects.get(name='Riverside Academy'),
            },
        ]
        
        created_users = 0
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            if created:
                user.set_password('password123')
                user.save()
                created_users += 1
                self.stdout.write(f'Created user: {user.username}')
        
        # Create some test activities
        activities_data = [
            {
                'user': User.objects.get(username='admin'),
                'action': 'New school registered: Springfield High School',
                'ip_address': '127.0.0.1',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            {
                'user': User.objects.get(username='admin'),
                'action': 'System maintenance completed',
                'ip_address': '127.0.0.1',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            {
                'user': User.objects.get(username='admin'),
                'action': 'Payment received from Riverside Academy',
                'ip_address': '127.0.0.1',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            {
                'user': User.objects.get(username='admin'),
                'action': 'Support ticket resolved for Central Elementary',
                'ip_address': '127.0.0.1',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        ]
        
        created_activities = 0
        for activity_data in activities_data:
            # Set created_at to different times
            activity_data['created_at'] = timezone.now() - timedelta(hours=created_activities * 2)
            activity, created = UserActivity.objects.get_or_create(
                user=activity_data['user'],
                action=activity_data['action'],
                defaults=activity_data
            )
            if created:
                created_activities += 1
                self.stdout.write(f'Created activity: {activity.action}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up test data:\n'
                f'- Created {created_schools} schools\n'
                f'- Created {created_users} users\n'
                f'- Created {created_activities} activities'
            )
        ) 