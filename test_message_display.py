#!/usr/bin/env python3
"""
Test script to verify message display functionality
"""

import requests
import json

# API Configuration
API_BASE = "http://localhost:8000/api/v1"
LOGIN_URL = f"{API_BASE}/auth/login/"
CHAT_ROOMS_URL = f"{API_BASE}/chat/rooms/"
MESSAGES_URL = f"{API_BASE}/chat/messages/"

def test_message_display():
    print("🔍 Testing Message Display Functionality")
    print("=" * 50)
    
    # 1. Login
    print("1. Logging in as testadmin...")
    login_data = {
        "username": "testadmin",
        "password": "testpass123"
    }
    
    login_response = requests.post(LOGIN_URL, json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print("✅ Login successful!")
    
    # 2. Get chat rooms
    print("\n2. Fetching chat rooms...")
    rooms_response = requests.get(CHAT_ROOMS_URL, headers=headers)
    if rooms_response.status_code != 200:
        print(f"❌ Failed to get rooms: {rooms_response.status_code}")
        return
    
    rooms = rooms_response.json()['results']
    print(f"✅ Found {len(rooms)} chat rooms")
    
    # 3. Find a room with messages
    print("\n3. Looking for rooms with messages...")
    rooms_with_messages = []
    
    for room in rooms:
        if room.get('last_message'):
            rooms_with_messages.append(room)
            print(f"   📋 {room['name']} - Last message: {room['last_message']['content'][:50]}...")
    
    if not rooms_with_messages:
        print("   ⚠️ No rooms with messages found. Sending test messages...")
        
        # Send a test message to the first room
        if rooms:
            test_room = rooms[0]
            print(f"   📤 Sending test message to: {test_room['name']}")
            
            message_data = {
                "room": test_room['id'],
                "content": "Test message for display verification"
            }
            
            message_response = requests.post(MESSAGES_URL, json=message_data, headers=headers)
            if message_response.status_code == 201:
                print("   ✅ Test message sent successfully!")
                rooms_with_messages = [test_room]
            else:
                print(f"   ❌ Failed to send test message: {message_response.status_code}")
    
    # 4. Test message fetching
    if rooms_with_messages:
        test_room = rooms_with_messages[0]
        print(f"\n4. Testing message fetching for: {test_room['name']}")
        
        messages_response = requests.get(f"{MESSAGES_URL}?room={test_room['id']}", headers=headers)
        if messages_response.status_code == 200:
            messages = messages_response.json()['results']
            print(f"   ✅ Found {len(messages)} messages")
            
            if messages:
                print("   📋 Recent messages:")
                for i, msg in enumerate(messages[:3]):  # Show last 3 messages
                    sender = msg.get('sender_info', {}).get('name', 'Unknown')
                    content = msg.get('content', '')[:50]
                    timestamp = msg.get('created_at', '')[:19]  # Show date and time
                    print(f"      {i+1}. {sender}: {content}... ({timestamp})")
            else:
                print("   ⚠️ No messages found in this room")
        else:
            print(f"   ❌ Failed to fetch messages: {messages_response.status_code}")
    
    # 5. Test message structure
    print("\n5. Testing message structure...")
    if rooms_with_messages:
        test_room = rooms_with_messages[0]
        messages_response = requests.get(f"{MESSAGES_URL}?room={test_room['id']}", headers=headers)
        
        if messages_response.status_code == 200:
            messages = messages_response.json()['results']
            if messages:
                sample_message = messages[0]
                print("   📋 Sample message structure:")
                print(f"      ID: {sample_message.get('id')}")
                print(f"      Content: {sample_message.get('content')}")
                print(f"      Sender: {sample_message.get('sender_info', {}).get('name', 'Unknown')}")
                print(f"      Timestamp: {sample_message.get('created_at')}")
                print(f"      Has sender_info: {'Yes' if sample_message.get('sender_info') else 'No'}")
                
                # Check if structure matches frontend expectations
                required_fields = ['id', 'content', 'created_at']
                missing_fields = [field for field in required_fields if field not in sample_message]
                
                if missing_fields:
                    print(f"   ⚠️ Missing fields: {missing_fields}")
                else:
                    print("   ✅ Message structure looks good!")
            else:
                print("   ⚠️ No messages to test structure")
    
    print("\n" + "=" * 50)
    print("🎉 Message Display Test Complete!")

if __name__ == "__main__":
    test_message_display() 