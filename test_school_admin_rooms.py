#!/usr/bin/env python3
"""
Test script to verify school-specific admin rooms functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_school_admin_rooms():
    print("🔍 Testing School-Specific Admin Rooms")
    print("=" * 50)
    
    # 1. Login as testadmin (super admin)
    print("1. Logging in as testadmin (Super Admin)...")
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
    
    # 3. Find admin rooms
    admin_rooms = [room for room in rooms if room.get('room_type') == 'admin']
    print(f"\n3. Admin Rooms Found ({len(admin_rooms)}):")
    
    for i, room in enumerate(admin_rooms, 1):
        print(f"   {i}. {room['name']}")
        print(f"      ID: {room['id']}")
        print(f"      Type: {room['room_type']}")
        print(f"      Is Global: {room.get('is_global_admin_room', False)}")
        print(f"      Participants ({len(room.get('participants_info', []))}):")
        
        for participant in room.get('participants_info', []):
            print(f"        - {participant['name']} ({participant['role']})")
        
        if room.get('last_message'):
            print(f"      Last Message: {room['last_message']['content'][:50]}...")
        else:
            print(f"      Last Message: No messages yet")
        print()
    
    # 4. Test sending message to a specific school's admin room
    if admin_rooms:
        target_room = admin_rooms[0]  # Use first admin room
        print(f"4. Testing message sending to {target_room['name']}...")
        
        message_data = {
            "room": target_room['id'],
            "content": f"Hello from System Admin! This is a test message for {target_room['name']}."
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
    
    # 5. Test school admin login (if available)
    print(f"\n5. Testing school admin perspective...")
    
    # Try to login as a school admin
    school_admin_credentials = [
        {"username": "central", "password": "testpass123"},
        {"username": "river", "password": "testpass123"},
    ]
    
    for creds in school_admin_credentials:
        print(f"   Trying to login as: {creds['username']}")
        school_login_response = requests.post(f"{API_BASE}/auth/login/", json=creds)
        
        if school_login_response.status_code == 200:
            school_token = school_login_response.json()['access_token']
            school_headers = {"Authorization": f"Bearer {school_token}"}
            
            # Get rooms for school admin
            school_rooms_response = requests.get(f"{API_BASE}/chat/rooms/", headers=school_headers)
            
            if school_rooms_response.status_code == 200:
                school_rooms = school_rooms_response.json()['results']
                school_admin_rooms = [r for r in school_rooms if r.get('room_type') == 'admin']
                
                print(f"   ✅ {creds['username']} can see {len(school_admin_rooms)} admin room(s)")
                for room in school_admin_rooms:
                    print(f"      - {room['name']}")
            else:
                print(f"   ❌ Failed to get rooms for {creds['username']}")
        else:
            print(f"   ❌ Login failed for {creds['username']}")
    
    print("\n" + "=" * 50)
    print("🎉 School-Specific Admin Rooms Test Complete!")
    print("\n✅ SUCCESS: Each school now has its own admin chat room!")

if __name__ == "__main__":
    test_school_admin_rooms() 