#!/usr/bin/env python3
"""
Simple test script for chat functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_chat_functionality():
    print("🧪 Testing Chat Functionality")
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
    print(f"✅ Found {len(rooms)} chat rooms")
    
    # 3. Test Sending Message
    print("\n3. Testing Message Sending...")
    if rooms:
        room_id = rooms[0]['id']
        room_name = rooms[0]['name']
        
        message_data = {
            "room": room_id,
            "content": f"Test message from API at {json.dumps({'timestamp': 'now'})}"
        }
        
        message_response = requests.post(f"{API_BASE}/chat/messages/", 
                                      headers=headers, 
                                      json=message_data)
        
        if message_response.status_code == 201:
            print(f"✅ Message sent successfully to '{room_name}'")
        else:
            print(f"❌ Failed to send message: {message_response.status_code}")
    
    # 4. Test Getting Messages
    print("\n4. Testing Message Retrieval...")
    if rooms:
        room_id = rooms[0]['id']
        messages_response = requests.get(f"{API_BASE}/chat/messages/?room={room_id}", 
                                      headers=headers)
        
        if messages_response.status_code == 200:
            messages = messages_response.json()['results']
            print(f"✅ Retrieved {len(messages)} messages")
        else:
            print(f"❌ Failed to get messages: {messages_response.status_code}")
    
    print("\n" + "=" * 40)
    print("🎉 Chat functionality test completed!")
    print("\n📋 Next Steps:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Login with username: testadmin, password: testpass123")
    print("3. Navigate to the Chat page")
    print("4. Test the chat interface")

if __name__ == "__main__":
    test_chat_functionality() 