#!/usr/bin/env python3
"""
Test script to verify the global admin room setup
"""

import requests
import json

# Configuration
BASE_URL = 'http://localhost:8000'
LOGIN_URL = f'{BASE_URL}/api/v1/auth/login/'
CHAT_ROOMS_URL = f'{BASE_URL}/api/v1/chat/rooms/'

def test_global_admin_room():
    print("🔍 Testing Global Admin Room Setup")
    print("=" * 50)
    
    # Test credentials
    test_users = [
        {'username': 'testadmin', 'password': 'testpass123'},
        {'username': 'central school', 'password': 'testpass123'},
        {'username': 'Firew Desta', 'password': 'testpass123'},
    ]
    
    for user in test_users:
        print(f"\n👤 Testing as: {user['username']}")
        print("-" * 30)
        
        try:
            # Login
            login_response = requests.post(LOGIN_URL, json=user)
            if login_response.status_code != 200:
                print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
                continue
                
            token = login_response.json()['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Get chat rooms
            rooms_response = requests.get(CHAT_ROOMS_URL, headers=headers)
            if rooms_response.status_code != 200:
                print(f"❌ Failed to get chat rooms: {rooms_response.status_code}")
                continue
                
            rooms_data = rooms_response.json()
            rooms = rooms_data.get('results', []) if 'results' in rooms_data else rooms_data
            
            # Find global admin room
            global_admin_room = None
            admin_rooms = []
            
            for room in rooms:
                if room.get('is_global_admin_room'):
                    global_admin_room = room
                if room.get('room_type') == 'admin':
                    admin_rooms.append(room)
            
            print(f"✅ Found {len(admin_rooms)} admin room(s)")
            
            if global_admin_room:
                print(f"✅ Global Admin Room: {global_admin_room['name']}")
                print(f"   Participants: {len(global_admin_room.get('participants_info', []))}")
                
                # Show participants
                participants = global_admin_room.get('participants_info', [])
                print("   Participants:")
                for p in participants:
                    print(f"     - {p['name']} ({p['role']})")
                    
                # Check if user is in the room
                user_in_room = any(p['name'] == user['username'] for p in participants)
                if user_in_room:
                    print(f"   ✅ {user['username']} is a participant")
                else:
                    print(f"   ❌ {user['username']} is NOT a participant")
                    
            else:
                print("❌ No global admin room found")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Global Admin Room Test Complete!")

if __name__ == '__main__':
    test_global_admin_room() 