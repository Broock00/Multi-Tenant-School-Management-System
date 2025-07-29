#!/usr/bin/env python3
"""
Test script for real-time chat functionality
This script helps verify that the chat system is working correctly.
"""

import requests
import json
import time
import websocket
import threading
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def get_auth_token(username, password):
    """Get JWT token for authentication"""
    url = f"{API_BASE}/auth/login/"
    data = {
        "username": username,
        "password": password
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            return response.json().get('access')
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error during login: {e}")
        return None

def get_chat_rooms(token):
    """Get available chat rooms"""
    url = f"{API_BASE}/chat/rooms/"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get chat rooms: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting chat rooms: {e}")
        return None

def send_message_via_api(token, room_id, message):
    """Send message via REST API"""
    url = f"{API_BASE}/chat/messages/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "room": room_id,
        "content": message
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 201:
            return response.json()
        else:
            print(f"Failed to send message: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

def get_messages(token, room_id):
    """Get messages for a room"""
    url = f"{API_BASE}/chat/messages/"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"room": room_id}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get messages: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting messages: {e}")
        return None

def test_websocket_connection(token, room_id, username):
    """Test WebSocket connection and send a message"""
    ws_url = f"ws://localhost:8000/ws/chat/{room_id}/?token={token}"
    
    def on_message(ws, message):
        data = json.loads(message)
        print(f"📨 Received: {data.get('sender')}: {data.get('message')}")
    
    def on_error(ws, error):
        print(f"❌ WebSocket error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("🔌 WebSocket connection closed")
    
    def on_open(ws):
        print("🔌 WebSocket connected!")
        # Send a test message
        test_message = f"Hello from {username} at {datetime.now().strftime('%H:%M:%S')}"
        ws.send(json.dumps({"message": test_message}))
        print(f"📤 Sent: {test_message}")
    
    try:
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Run WebSocket in a separate thread
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Keep connection alive for a few seconds
        time.sleep(5)
        ws.close()
        
    except Exception as e:
        print(f"Error with WebSocket: {e}")

def main():
    print("🧪 Testing Real-Time Chat Functionality")
    print("=" * 50)
    
    # Test credentials (you'll need to adjust these)
    test_users = [
        {"username": "testadmin", "password": "testpass123"},
    ]
    
    for i, user_creds in enumerate(test_users):
        print(f"\n👤 Testing with user: {user_creds['username']}")
        print("-" * 30)
        
        # Get authentication token
        token = get_auth_token(user_creds['username'], user_creds['password'])
        if not token:
            print(f"❌ Failed to authenticate {user_creds['username']}")
            continue
        
        print(f"✅ Authenticated as {user_creds['username']}")
        
        # Get chat rooms
        rooms_data = get_chat_rooms(token)
        if not rooms_data:
            print("❌ No chat rooms available")
            continue
        
        rooms = rooms_data.get('results', [])
        print(f"📋 Found {len(rooms)} chat rooms")
        
        for room in rooms[:2]:  # Test first 2 rooms
            room_id = room['id']
            room_name = room['name']
            room_type = room['room_type']
            
            print(f"\n🏠 Testing room: {room_name} ({room_type})")
            
            # Get existing messages
            messages = get_messages(token, room_id)
            if messages:
                msg_count = len(messages.get('results', []))
                print(f"📝 Found {msg_count} existing messages")
            
            # Send a test message via API
            test_msg = f"Test message from {user_creds['username']} via API at {datetime.now().strftime('%H:%M:%S')}"
            sent_msg = send_message_via_api(token, room_id, test_msg)
            if sent_msg:
                print(f"✅ Sent message via API: {test_msg[:50]}...")
            
            # Test WebSocket connection
            print("🔌 Testing WebSocket connection...")
            test_websocket_connection(token, room_id, user_creds['username'])
            
            time.sleep(1)  # Brief pause between rooms
    
    print("\n" + "=" * 50)
    print("🎉 Chat functionality test completed!")
    print("\n📋 Next Steps:")
    print("1. Start your Django server: python manage.py runserver")
    print("2. Start your React frontend: cd frontend && npm start")
    print("3. Open the chat page in your browser")
    print("4. Test real-time messaging between different users")

if __name__ == "__main__":
    main() 