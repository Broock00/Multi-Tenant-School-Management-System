from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from chat.models import ChatRoom, ChatParticipant
from classes.models import Class
from users.models import User
from schools.models import School
from itertools import combinations

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up comprehensive chat rooms with all role-based communication types'

    def handle(self, *args, **options):
        self.stdout.write('Setting up comprehensive chat rooms...')
        
        # Get or create sample users
        try:
            # Get all users by role
            system_admins = User.objects.filter(role=User.UserRole.SUPER_ADMIN)
            school_admins = User.objects.filter(role=User.UserRole.SCHOOL_ADMIN)
            teachers = User.objects.filter(role=User.UserRole.TEACHER)
            secretaries = User.objects.filter(role=User.UserRole.SECRETARY)
            students = User.objects.filter(role=User.UserRole.STUDENT)
            
            if not system_admins.exists():
                self.stdout.write(self.style.WARNING('No super admin users found. Please create users first.'))
                return
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error getting users: {e}'))
            return

        rooms_created = 0
        
        # 1. System Admin ↔ School Admins (Per School Room)
        self.stdout.write('\n1. Creating System ↔ School Admin rooms (one per school)...')
        schools = School.objects.all()
        for school in schools:
            # Find school admins for this school
            school_admins_for_school = school_admins.filter(school=school)
            
            if school_admins_for_school.exists():
                room_name = f"System ↔ {school.name}"
                if not ChatRoom.objects.filter(name=room_name).exists():
                    system_school_room = ChatRoom.objects.create(
                        name=room_name,
                        room_type='system_school_admin',
                        description=f'System Admins ↔ {school.name} School Admins',
                        is_global_admin_room=False
                    )
                    
                    # Add all System Admins
                    for system_admin in system_admins:
                        ChatParticipant.objects.get_or_create(room=system_school_room, user=system_admin)
                    
                    # Add all School Admins for this school
                    for school_admin in school_admins_for_school:
                        ChatParticipant.objects.get_or_create(room=system_school_room, user=school_admin)
                    
                    rooms_created += 1
                    self.stdout.write(f'   ✅ Created: {room_name}')
                    self.stdout.write(f'      Participants: {system_admins.count()} System Admins + {school_admins_for_school.count()} School Admins')

        # 2. School Admin ↔ School Admin (Within Same School)
        self.stdout.write('\n2. Creating School Admin ↔ School Admin rooms (within same school)...')
        for school in schools:
            school_admins_for_school = school_admins.filter(school=school)
            
            if school_admins_for_school.count() > 1:
                # Create one-on-one rooms for each pair of school admins
                for admin1, admin2 in combinations(school_admins_for_school, 2):
                    room_name = f"{admin1.username} - {admin2.username} ({school.name})"
                    if not ChatRoom.objects.filter(name=room_name).exists():
                        admin_admin_room = ChatRoom.objects.create(
                            name=room_name,
                            room_type='school_admin_to_admin',
                            description=f'School Admin to School Admin chat within {school.name}',
                            is_global_admin_room=False
                        )
                        
                        ChatParticipant.objects.get_or_create(room=admin_admin_room, user=admin1)
                        ChatParticipant.objects.get_or_create(room=admin_admin_room, user=admin2)
                        
                        rooms_created += 1
                        self.stdout.write(f'   ✅ Created: {room_name}')

        # 3. School Admin ↔ Secretaries (One-on-One, Same School)
        self.stdout.write('\n3. Creating School Admin ↔ Secretary rooms (one-on-one, same school)...')
        for school in schools:
            school_admins_for_school = school_admins.filter(school=school)
            secretaries_for_school = secretaries.filter(school=school)
            
            for school_admin in school_admins_for_school:
                for secretary in secretaries_for_school:
                    room_name = f"{school_admin.username} - {secretary.username} ({school.name})"
                    if not ChatRoom.objects.filter(name=room_name).exists():
                        admin_secretary_room = ChatRoom.objects.create(
                            name=room_name,
                            room_type='school_admin_to_secretary',
                            description=f'School Admin to Secretary chat within {school.name}',
                            is_global_admin_room=False
                        )
                        
                        ChatParticipant.objects.get_or_create(room=admin_secretary_room, user=school_admin)
                        ChatParticipant.objects.get_or_create(room=admin_secretary_room, user=secretary)
                        
                        rooms_created += 1
                        self.stdout.write(f'   ✅ Created: {room_name}')

        # 4. School Admin ↔ Teachers (One-on-One, Same School)
        self.stdout.write('\n4. Creating School Admin ↔ Teacher rooms (one-on-one, same school)...')
        for school in schools:
            school_admins_for_school = school_admins.filter(school=school)
            teachers_for_school = teachers.filter(school=school)
            
            for school_admin in school_admins_for_school:
                for teacher in teachers_for_school:
                    room_name = f"{school_admin.username} - {teacher.username} ({school.name})"
                    if not ChatRoom.objects.filter(name=room_name).exists():
                        admin_teacher_room = ChatRoom.objects.create(
                            name=room_name,
                            room_type='school_admin_to_teacher',
                            description=f'School Admin to Teacher chat within {school.name}',
                            is_global_admin_room=False
                        )
                        
                        ChatParticipant.objects.get_or_create(room=admin_teacher_room, user=school_admin)
                        ChatParticipant.objects.get_or_create(room=admin_teacher_room, user=teacher)
                        
                        rooms_created += 1
                        self.stdout.write(f'   ✅ Created: {room_name}')

        # 5. Secretaries ↔ Teachers (One-on-One, Same School)
        self.stdout.write('\n5. Creating Secretary ↔ Teacher rooms (one-on-one, same school)...')
        for school in schools:
            secretaries_for_school = secretaries.filter(school=school)
            teachers_for_school = teachers.filter(school=school)
            
            for secretary in secretaries_for_school:
                for teacher in teachers_for_school:
                    room_name = f"{secretary.username} - {teacher.username} ({school.name})"
                    if not ChatRoom.objects.filter(name=room_name).exists():
                        secretary_teacher_room = ChatRoom.objects.create(
                            name=room_name,
                            room_type='secretary_to_teacher',
                            description=f'Secretary to Teacher chat within {school.name}',
                            is_global_admin_room=False
                        )
                        
                        ChatParticipant.objects.get_or_create(room=secretary_teacher_room, user=secretary)
                        ChatParticipant.objects.get_or_create(room=secretary_teacher_room, user=teacher)
                        
                        rooms_created += 1
                        self.stdout.write(f'   ✅ Created: {room_name}')

        # 6. General Staff Room (Optional - for announcements)
        self.stdout.write('\n6. Creating General Staff Room...')
        if not ChatRoom.objects.filter(name='General Staff Room').exists():
            staff_room = ChatRoom.objects.create(
                name='General Staff Room',
                room_type='general_staff',
                description='General announcements and staff communication'
            )
            
            # Add all staff members
            all_staff = list(system_admins) + list(school_admins) + list(teachers) + list(secretaries)
            for user in all_staff:
                ChatParticipant.objects.get_or_create(room=staff_room, user=user)
            
            rooms_created += 1
            self.stdout.write(f'   ✅ Created: General Staff Room ({len(all_staff)} participants)')

        # Display summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('📊 CHAT ROOMS SUMMARY')
        self.stdout.write('=' * 60)
        
        total_rooms = ChatRoom.objects.count()
        total_participants = ChatParticipant.objects.count()
        
        self.stdout.write(f'Total chat rooms created: {total_rooms}')
        self.stdout.write(f'Total participants: {total_participants}')
        
        # Show rooms by type
        room_types = ChatRoom.objects.values_list('room_type', flat=True).distinct()
        for room_type in room_types:
            rooms_of_type = ChatRoom.objects.filter(room_type=room_type)
            self.stdout.write(f'\n{room_type.upper()} ROOMS ({rooms_of_type.count()}):')
            for room in rooms_of_type:
                participants = room.participants.count()
                self.stdout.write(f'   - {room.name} ({participants} participants)')
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f'🎉 Successfully created {rooms_created} new chat rooms!'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                '✅ Comprehensive chat room system is ready for testing!'
            )
        ) 