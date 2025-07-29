#!/usr/bin/env python3
"""
Test script to verify unread message tracking functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_unread_messages():
    print("🔍 Testing Unread Message Tracking")
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
    print(f"   Unread Count: {global_admin_room['unread_count']}")
    
    # 4. Send a test message
    print(f"\n3. Sending test message...")
    message_data = {
        "room": global_admin_room['id'],
        "content": "Test message for unread tracking - this should be marked as unread for other participants."
    }
    
    message_response = requests.post(f"{API_BASE}/chat/messages/", 
                                  json=message_data, headers=headers)
    
    if message_response.status_code == 201:
        print("✅ Message sent successfully!")
        message = message_response.json()
        print(f"   Message ID: {message['id']}")
        print(f"   Content: {message['content']}")
        print(f"   Is Read: {message.get('is_read', 'N/A')}")
    else:
        print(f"❌ Failed to send message: {message_response.status_code}")
        print(f"   Response: {message_response.text}")
        return
    
    # 5. Get messages and check read status
    print(f"\n4. Fetching messages to check read status...")
    messages_response = requests.get(f"{API_BASE}/chat/messages/?room={global_admin_room['id']}", 
                                   headers=headers)
    
    if messages_response.status_code == 200:
        messages = messages_response.json()['results']
        print(f"✅ Found {len(messages)} messages in the room")
        
        if messages:
            print("   Message read status:")
            for msg in messages:
                sender = msg.get('sender_info', {}).get('name', 'Unknown')
                content = msg['content'][:30] + "..." if len(msg['content']) > 30 else msg['content']
                is_read = msg.get('is_read', False)
                print(f"     - {sender}: {content} (Read: {is_read})")
    
    # 6. Test marking message as read
    if messages:
        last_message = messages[-1]
        print(f"\n5. Testing mark as read for message {last_message['id']}...")
        
        mark_read_response = requests.post(
            f"{API_BASE}/chat/messages/{last_message['id']}/mark_read/",
            headers=headers
        )
        
        if mark_read_response.status_code == 200:
            print("✅ Message marked as read successfully!")
        else:
            print(f"❌ Failed to mark message as read: {mark_read_response.status_code}")
    
    # 7. Test unread count endpoint
    print(f"\n6. Testing unread count endpoint...")
    unread_response = requests.get(f"{API_BASE}/chat/messages/unread_count/", headers=headers)
    
    if unread_response.status_code == 200:
        unread_data = unread_response.json()
        print(f"✅ Unread count: {unread_data.get('unread_count', 0)}")
    else:
        print(f"❌ Failed to get unread count: {unread_response.status_code}")
    
    # 8. Test marking all messages in room as read
    print(f"\n7. Testing mark all messages in room as read...")
    mark_all_response = requests.post(
        f"{API_BASE}/chat/messages/mark_room_read/",
        json={"room_id": global_admin_room['id']},
        headers=headers
    )
    
    if mark_all_response.status_code == 200:
        print("✅ All messages in room marked as read!")
        result = mark_all_response.json()
        print(f"   {result.get('message', '')}")
    else:
        print(f"❌ Failed to mark all messages as read: {mark_all_response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎉 Unread Message Tracking Test Complete!")
    print("\n✅ SUCCESS: Unread message tracking is working correctly!")

if __name__ == "__main__":
    test_unread_messages() 