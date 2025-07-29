from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from chat.models import ChatRoom, ChatParticipant
from classes.models import Class
from users.models import User
from schools.models import School

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up sample chat rooms for testing'

    def handle(self, *args, **options):
        self.stdout.write('Setting up sample chat rooms...')
        
        # Get or create sample users
        try:
            # Try to get existing users
            admin_user = User.objects.filter(role=User.UserRole.SUPER_ADMIN).first()
            school_admins = User.objects.filter(role=User.UserRole.SCHOOL_ADMIN)
            teacher = User.objects.filter(role=User.UserRole.TEACHER).first()
            student = User.objects.filter(role=User.UserRole.STUDENT).first()
            secretary = User.objects.filter(role=User.UserRole.SECRETARY).first()
            
            if not admin_user:
                self.stdout.write(self.style.WARNING('No super admin user found. Please create users first.'))
                return
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error getting users: {e}'))
            return

        # Create sample chat rooms
        rooms_created = 0
        
        # 1. Create separate admin rooms for each school
        schools = School.objects.all()
        for school in schools:
            # Find school admin for this school
            school_admin = school_admins.filter(school=school).first()
            
            if school_admin:
                room_name = f"{school.name} - Admin Chat"
                if not ChatRoom.objects.filter(name=room_name).exists():
                    admin_room = ChatRoom.objects.create(
                        name=room_name,
                        room_type='admin',
                        description=f'Administrative communication for {school.name}',
                        is_global_admin_room=False  # Individual school admin room
                    )
                    
                    # Add System Admin and School Admin to this room
                    ChatParticipant.objects.get_or_create(room=admin_room, user=admin_user)
                    ChatParticipant.objects.get_or_create(room=admin_room, user=school_admin)
                    
                    rooms_created += 1
                    self.stdout.write(f'Created: {admin_room.name} (School: {school.name})')
                    self.stdout.write(f'   Participants: System Admin + {school_admin.username}')

        # 2. General Staff Room
        if not ChatRoom.objects.filter(name='General Staff Room').exists():
            staff_room = ChatRoom.objects.create(
                name='General Staff Room',
                room_type='staff',
                description='General communication for all staff members'
            )
            
            # Add participants
            for user in [admin_user, school_admin, teacher, secretary]:
                if user:
                    ChatParticipant.objects.get_or_create(room=staff_room, user=user)
            
            rooms_created += 1
            self.stdout.write(f'Created: {staff_room.name}')

        # 3. General Chat Room
        if not ChatRoom.objects.filter(name='General Chat').exists():
            general_room = ChatRoom.objects.create(
                name='General Chat',
                room_type='general',
                description='General purpose chat for all users'
            )
            
            # Add all participants
            for user in [admin_user, school_admin, teacher, student, secretary]:
                if user:
                    ChatParticipant.objects.get_or_create(room=general_room, user=user)
            
            rooms_created += 1
            self.stdout.write(f'Created: {general_room.name}')

        # 4. Class-specific rooms (if classes exist)
        classes = Class.objects.all()[:3]  # Get first 3 classes
        for class_obj in classes:
            room_name = f'{class_obj.name} Class Chat'
            if not ChatRoom.objects.filter(name=room_name).exists():
                class_room = ChatRoom.objects.create(
                    name=room_name,
                    room_type='class',
                    class_obj=class_obj,
                    description=f'Chat room for {class_obj.name} class'
                )
                
                # Add teachers who teach subjects in this class
                class_subjects = class_obj.subjects.all()
                for class_subject in class_subjects:
                    if class_subject.teacher:
                        ChatParticipant.objects.get_or_create(room=class_room, user=class_subject.teacher.user)
                
                # Add students from this class
                for student in class_obj.enrolled_students.all()[:5]:  # Add first 5 students
                    ChatParticipant.objects.get_or_create(room=class_room, user=student.user)
                
                rooms_created += 1
                self.stdout.write(f'Created: {class_room.name}')

        # 5. Parent-Teacher Room (if parents exist)
        parents = User.objects.filter(role=User.UserRole.PARENT)[:2]  # Get first 2 parents
        if parents.exists() and teacher:
            for i, parent in enumerate(parents):
                room_name = f'Parent-Teacher Chat {i+1}'
                if not ChatRoom.objects.filter(name=room_name).exists():
                    pt_room = ChatRoom.objects.create(
                        name=room_name,
                        room_type='parent_teacher',
                        description=f'Parent-teacher communication room {i+1}'
                    )
                    
                    ChatParticipant.objects.get_or_create(room=pt_room, user=parent)
                    ChatParticipant.objects.get_or_create(room=pt_room, user=teacher)
                    
                    rooms_created += 1
                    self.stdout.write(f'Created: {pt_room.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {rooms_created} chat rooms!'
            )
        )
        
        # Display summary
        total_rooms = ChatRoom.objects.count()
        total_participants = ChatParticipant.objects.count()
        admin_rooms = ChatRoom.objects.filter(room_type='admin')
        
        self.stdout.write(f'Total chat rooms: {total_rooms}')
        self.stdout.write(f'Total participants: {total_participants}')
        self.stdout.write(f'Admin rooms created: {admin_rooms.count()}')
        
        # Show admin rooms
        for room in admin_rooms:
            participants = room.participants.all()
            self.stdout.write(f'   - {room.name}: {participants.count()} participants')
        
        self.stdout.write(
            self.style.SUCCESS(
                '\n🎉 Sample chat rooms are ready for testing!'
            )
        ) 