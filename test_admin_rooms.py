#!/usr/bin/env python3
"""
Test script to check admin rooms and their participants
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_admin_rooms():
    print("🔍 Testing Admin Rooms Display")
    print("=" * 40)
    
    # 1. Test Login
    print("1. Testing Login...")
    login_response = requests.post(f"{API_BASE}/auth/login/", json={
        "username": "testadmin",
        "password": "testpass123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()['access_token']
    print("✅ Login successful!")
    
    # 2. Test Chat Rooms
    print("\n2. Testing Chat Rooms...")
    headers = {"Authorization": f"Bearer {token}"}
    rooms_response = requests.get(f"{API_BASE}/chat/rooms/", headers=headers)
    
    if rooms_response.status_code != 200:
        print(f"❌ Failed to get chat rooms: {rooms_response.status_code}")
        return
    
    rooms = rooms_response.json()['results']
    print(f"✅ Found {len(rooms)} total chat rooms")
    
    # 3. Filter Admin Rooms
    admin_rooms = [r for r in rooms if r['room_type'] == 'admin']
    print(f"✅ Found {len(admin_rooms)} admin rooms")
    
    # 4. Display Admin Rooms
    print("\n3. Admin Rooms Details:")
    for i, room in enumerate(admin_rooms, 1):
        print(f"\n{i}. Room: {room['name']}")
        print(f"   ID: {room['id']}")
        print(f"   Type: {room['room_type']}")
        print(f"   Participants:")
        for participant in room['participants_info']:
            print(f"     - {participant['name']} ({participant['role']})")
        if room['last_message']:
            print(f"   Last Message: {room['last_message']['content'][:50]}...")
        else:
            print(f"   Last Message: No messages yet")
    
    print("\n" + "=" * 40)
    print("🎉 Admin rooms test completed!")

if __name__ == "__main__":
    test_admin_rooms() 