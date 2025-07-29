#!/usr/bin/env python3
"""
Script to clean up the old global admin room
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from chat.models import ChatRoom, ChatParticipant, Message, MessageRead

def cleanup_global_admin_room():
    print("🧹 Cleaning up old global admin room...")
    print("=" * 50)
    
    # Find the global admin room
    global_room = ChatRoom.objects.filter(is_global_admin_room=True).first()
    
    if global_room:
        print(f"Found global admin room: {global_room.name} (ID: {global_room.id})")
        print(f"Participants: {global_room.participants.count()}")
        print(f"Messages: {global_room.messages.count()}")
        
        # Delete the global admin room and all related data
        room_id = global_room.id
        
        # Delete MessageRead records
        message_reads_deleted = MessageRead.objects.filter(message__room=global_room).count()
        MessageRead.objects.filter(message__room=global_room).delete()
        print(f"Deleted {message_reads_deleted} MessageRead records")
        
        # Delete messages
        messages_deleted = global_room.messages.count()
        global_room.messages.all().delete()
        print(f"Deleted {messages_deleted} messages")
        
        # Delete participants
        participants_deleted = global_room.participants.count()
        global_room.participants.all().delete()
        print(f"Deleted {participants_deleted} participants")
        
        # Delete the room itself
        global_room.delete()
        print(f"Deleted global admin room")
        
        print("✅ Global admin room cleanup completed!")
    else:
        print("✅ No global admin room found to clean up")
    
    # Show current admin rooms
    print("\n📋 Current Admin Rooms:")
    admin_rooms = ChatRoom.objects.filter(room_type='admin')
    for room in admin_rooms:
        participants = room.participants.all()
        print(f"   - {room.name} (ID: {room.id}): {participants.count()} participants")
        for participant in participants:
            print(f"     * {participant.user.username} ({participant.user.role})")
    
    print(f"\nTotal admin rooms: {admin_rooms.count()}")
    print("🎉 Cleanup complete!")

if __name__ == '__main__':
    cleanup_global_admin_room() 