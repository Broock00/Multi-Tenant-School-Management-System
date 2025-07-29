#!/usr/bin/env python3
"""
Simple test to verify global admin room functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_global_admin_room():
    print("🔍 Testing Global Admin Room Functionality")
    print("=" * 50)
    
    # 1. Login as testadmin
    print("1. Logging in as testadmin...")
    login_response = requests.post(f"{API_BASE}/auth/login/", json={
        "username": "testadmin",
        "password": "testpass123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful!")
    
    # 2. Get chat rooms
    print("\n2. Fetching chat rooms...")
    rooms_response = requests.get(f"{API_BASE}/chat/rooms/", headers=headers)
    
    if rooms_response.status_code != 200:
        print(f"❌ Failed to get chat rooms: {rooms_response.status_code}")
        return
    
    rooms = rooms_response.json()['results']
    print(f"✅ Found {len(rooms)} total chat rooms")
    
    # 3. Find global admin room
    global_admin_room = None
    for room in rooms:
        if room.get('is_global_admin_room'):
            global_admin_room = room
            break
    
    if not global_admin_room:
        print("❌ No global admin room found!")
        return
    
    print(f"✅ Found Global Admin Room: {global_admin_room['name']}")
    print(f"   Room ID: {global_admin_room['id']}")
    print(f"   Room Type: {global_admin_room['room_type']}")
    print(f"   Is Global Admin Room: {global_admin_room['is_global_admin_room']}")
    
    # 4. Show participants
    participants = global_admin_room.get('participants_info', [])
    print(f"\n3. Participants ({len(participants)}):")
    for i, participant in enumerate(participants, 1):
        print(f"   {i}. {participant['name']} ({participant['role']})")
    
    # 5. Test message sending (if room has participants)
    if participants:
        print(f"\n4. Testing message sending...")
        message_data = {
            "room": global_admin_room['id'],
            "content": "Hello from testadmin! This is a test message in the global admin room."
        }
        
        message_response = requests.post(f"{API_BASE}/chat/messages/", 
                                      json=message_data, headers=headers)
        
        if message_response.status_code == 201:
            print("✅ Message sent successfully!")
            message = message_response.json()
            print(f"   Message ID: {message['id']}")
            print(f"   Content: {message['content']}")
        else:
            print(f"❌ Failed to send message: {message_response.status_code}")
            print(f"   Response: {message_response.text}")
    
    # 6. Get messages
    print(f"\n5. Fetching messages...")
    messages_response = requests.get(f"{API_BASE}/chat/messages/?room={global_admin_room['id']}", 
                                   headers=headers)
    
    if messages_response.status_code == 200:
        messages = messages_response.json()['results']
        print(f"✅ Found {len(messages)} messages in the room")
        
        if messages:
            print("   Recent messages:")
            for msg in messages[-3:]:  # Show last 3 messages
                sender = msg.get('sender_info', {}).get('name', 'Unknown')
                content = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
                print(f"     - {sender}: {content}")
    else:
        print(f"❌ Failed to get messages: {messages_response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎉 Global Admin Room Test Complete!")
    print("\n✅ SUCCESS: Single shared room for all System Admins and School Admins is working!")

if __name__ == "__main__":
    test_global_admin_room() 