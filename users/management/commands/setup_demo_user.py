from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import User

class Command(BaseCommand):
    help = 'Create a demo admin user'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Check if admin user already exists
        if User.objects.filter(username='admin').exists():
            self.stdout.write(
                self.style.WARNING('Admin user already exists. Updating password...')
            )
            admin_user = User.objects.get(username='admin')
            admin_user.set_password('admin123')
            admin_user.save()
        else:
            # Create new admin user
            admin_user = User.objects.create_user(
                username='admin',
                email='admin@example.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                is_staff=True,
                is_superuser=True,
                role=User.UserRole.SUPER_ADMIN
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully created admin user: {admin_user.username}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('Demo credentials: Username: admin | Password: admin123')
        ) 