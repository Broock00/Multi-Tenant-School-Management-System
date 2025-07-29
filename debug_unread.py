#!/usr/bin/env python3
"""
Debug script to check MessageRead model and unread tracking
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from chat.models import ChatRoom, Message, MessageRead
from users.models import User

def debug_unread_tracking():
    print("🔍 Debugging Unread Message Tracking")
    print("=" * 50)
    
    # 1. Check if MessageRead model exists
    print("1. Checking MessageRead model...")
    try:
        message_reads = MessageRead.objects.all()
        print(f"✅ MessageRead model exists, {message_reads.count()} records")
    except Exception as e:
        print(f"❌ Error with MessageRead model: {e}")
        return
    
    # 2. Check global admin room
    print("\n2. Checking global admin room...")
    global_room = ChatRoom.objects.filter(is_global_admin_room=True).first()
    if global_room:
        print(f"✅ Global admin room: {global_room.name}")
        print(f"   Participants: {global_room.participants.count()}")
        print(f"   Messages: {global_room.messages.count()}")
    else:
        print("❌ No global admin room found")
        return
    
    # 3. Check messages and their read status
    print("\n3. Checking messages and read status...")
    messages = global_room.messages.all()
    print(f"   Total messages: {messages.count()}")
    
    for msg in messages:
        print(f"   Message {msg.id}: {msg.content[:30]}...")
        print(f"     Sender: {msg.sender.username}")
        print(f"     Read by: {msg.read_by.count()} users")
        for read_record in msg.read_by.all():
            print(f"       - {read_record.user.username} at {read_record.read_at}")
    
    # 4. Check participants
    print("\n4. Checking participants...")
    participants = global_room.participants.all()
    for participant in participants:
        print(f"   - {participant.user.username} ({participant.user.role})")
    
    # 5. Test unread count for a specific user
    print("\n5. Testing unread count for testadmin...")
    testadmin = User.objects.filter(username='testadmin').first()
    if testadmin:
        unread_messages = global_room.messages.exclude(
            sender=testadmin
        ).exclude(
            read_by__user=testadmin
        )
        print(f"   Unread messages for testadmin: {unread_messages.count()}")
        
        for msg in unread_messages:
            print(f"     - Message {msg.id}: {msg.content[:30]}...")
    else:
        print("❌ testadmin user not found")
    
    print("\n" + "=" * 50)
    print("🎉 Debug Complete!")

if __name__ == '__main__':
    debug_unread_tracking() 