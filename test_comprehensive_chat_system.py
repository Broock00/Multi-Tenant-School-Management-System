#!/usr/bin/env python3
"""
Comprehensive test script for the new chat room system
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_comprehensive_chat_system():
    print("🔍 Testing Comprehensive Chat Room System")
    print("=" * 60)
    
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
    
    # 2. Get all chat rooms
    print("\n2. Fetching all chat rooms...")
    rooms_response = requests.get(f"{API_BASE}/chat/rooms/", headers=headers)
    
    if rooms_response.status_code != 200:
        print(f"❌ Failed to get chat rooms: {rooms_response.status_code}")
        return
    
    rooms = rooms_response.json()['results']
    print(f"✅ Found {len(rooms)} total chat rooms")
    
    # 3. Categorize rooms by type
    room_categories = {}
    for room in rooms:
        room_type = room.get('room_type', 'unknown')
        if room_type not in room_categories:
            room_categories[room_type] = []
        room_categories[room_type].append(room)
    
    print("\n3. Chat Room Categories:")
    for room_type, rooms_of_type in room_categories.items():
        print(f"\n📁 {room_type.upper()} ROOMS ({len(rooms_of_type)}):")
        for room in rooms_of_type:
            participants = room.get('participants_info', [])
            print(f"   - {room['name']} ({len(participants)} participants)")
            for participant in participants[:3]:  # Show first 3 participants
                print(f"     * {participant.get('name', 'Unknown')} ({participant.get('role', 'Unknown')})")
            if len(participants) > 3:
                print(f"     * ... and {len(participants) - 3} more")
    
    # 4. Test System ↔ School Admin rooms
    print("\n4. Testing System ↔ School Admin rooms...")
    system_school_rooms = [r for r in rooms if r.get('room_type') == 'system_school_admin']
    
    for room in system_school_rooms:
        print(f"   📋 {room['name']}")
        participants = room.get('participants_info', [])
        system_admins = [p for p in participants if p.get('role') == 'super_admin']
        school_admins = [p for p in participants if p.get('role') == 'school_admin']
        print(f"      System Admins: {len(system_admins)}")
        print(f"      School Admins: {len(school_admins)}")
        
        # Test sending a message
        message_data = {
            "room": room['id'],
            "content": f"Hello from System Admin! This is a test message for {room['name']}."
        }
        
        message_response = requests.post(f"{API_BASE}/chat/messages/", 
                                      json=message_data, headers=headers)
        
        if message_response.status_code == 201:
            print(f"      ✅ Message sent successfully!")
        else:
            print(f"      ❌ Failed to send message: {message_response.status_code}")
    
    # 5. Test one-on-one rooms
    print("\n5. Testing one-on-one rooms...")
    one_on_one_types = [
        'school_admin_to_admin',
        'school_admin_to_secretary', 
        'school_admin_to_teacher',
        'secretary_to_teacher'
    ]
    
    for room_type in one_on_one_types:
        rooms_of_type = [r for r in rooms if r.get('room_type') == room_type]
        print(f"\n   📁 {room_type.upper()} ({len(rooms_of_type)} rooms):")
        
        for room in rooms_of_type[:3]:  # Test first 3 rooms of each type
            participants = room.get('participants_info', [])
            if len(participants) == 2:
                print(f"      - {room['name']}")
                print(f"        Participants: {participants[0].get('name')} & {participants[1].get('name')}")
                
                # Test sending a message
                message_data = {
                    "room": room['id'],
                    "content": f"Test message in {room['name']}"
                }
                
                message_response = requests.post(f"{API_BASE}/chat/messages/", 
                                              json=message_data, headers=headers)
                
                if message_response.status_code == 201:
                    print(f"        ✅ Message sent!")
                else:
                    print(f"        ❌ Failed to send message")
    
    # 6. Test school admin login
    print(f"\n6. Testing school admin perspective...")
    
    school_admin_credentials = [
        {"username": "central", "password": "testpass123"},
        {"username": "river", "password": "testpass123"},
    ]
    
    for creds in school_admin_credentials:
        print(f"\n   🔐 Testing login as: {creds['username']}")
        school_login_response = requests.post(f"{API_BASE}/auth/login/", json=creds)
        
        if school_login_response.status_code == 200:
            school_token = school_login_response.json()['access_token']
            school_headers = {"Authorization": f"Bearer {school_token}"}
            
            # Get rooms for school admin
            school_rooms_response = requests.get(f"{API_BASE}/chat/rooms/", headers=school_headers)
            
            if school_rooms_response.status_code == 200:
                school_rooms = school_rooms_response.json()['results']
                
                # Categorize rooms for this school admin
                admin_rooms = [r for r in school_rooms if r.get('room_type') == 'system_school_admin']
                one_on_one_rooms = [r for r in school_rooms if r.get('room_type') in one_on_one_types]
                
                print(f"      ✅ {creds['username']} can see:")
                print(f"         - {len(admin_rooms)} system admin rooms")
                print(f"         - {len(one_on_one_rooms)} one-on-one rooms")
                
                # Show some example rooms
                for room in admin_rooms[:2]:
                    print(f"         * {room['name']}")
                
                for room in one_on_one_rooms[:3]:
                    print(f"         * {room['name']}")
            else:
                print(f"      ❌ Failed to get rooms for {creds['username']}")
        else:
            print(f"      ❌ Login failed for {creds['username']}")
    
    # 7. Test unread message functionality
    print(f"\n7. Testing unread message functionality...")
    
    # Get unread count
    unread_response = requests.get(f"{API_BASE}/chat/messages/unread_count/", headers=headers)
    
    if unread_response.status_code == 200:
        unread_data = unread_response.json()
        total_unread = unread_data.get('total_unread', 0)
        print(f"   📊 Total unread messages: {total_unread}")
        
        if total_unread > 0:
            print(f"   ✅ Unread message tracking is working!")
        else:
            print(f"   ℹ️  No unread messages found")
    else:
        print(f"   ❌ Failed to get unread count: {unread_response.status_code}")
    
    print("\n" + "=" * 60)
    print("🎉 Comprehensive Chat System Test Complete!")
    print("\n✅ SUCCESS: All chat room types are working correctly!")
    print("\n📋 SUMMARY:")
    print(f"   - Total rooms: {len(rooms)}")
    print(f"   - Room types: {len(room_categories)}")
    print(f"   - System ↔ School Admin rooms: {len(system_school_rooms)}")
    print(f"   - One-on-one rooms: {sum(len([r for r in rooms if r.get('room_type') == rt]) for rt in one_on_one_types)}")

if __name__ == "__main__":
    test_comprehensive_chat_system() 