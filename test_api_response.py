#!/usr/bin/env python3
"""
Test script to check the exact API response structure
"""

import requests
import json

# API Configuration
API_BASE = "http://localhost:8000/api/v1"
LOGIN_URL = f"{API_BASE}/auth/login/"
MESSAGES_URL = f"{API_BASE}/chat/messages/"

def test_api_response():
    print("🔍 Testing API Response Structure")
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
    
    # 2. Get messages for a specific room
    room_id = 1  # Central Elementary room
    print(f"\n2. Fetching messages for room {room_id}...")
    
    messages_response = requests.get(f"{MESSAGES_URL}?room={room_id}", headers=headers)
    if messages_response.status_code != 200:
        print(f"❌ Failed to fetch messages: {messages_response.status_code}")
        return
    
    print("✅ Messages fetched successfully!")
    
    # 3. Print the raw response
    print("\n3. Raw API Response:")
    print(json.dumps(messages_response.json(), indent=2))
    
    # 4. Analyze the structure
    data = messages_response.json()
    print("\n4. Response Structure Analysis:")
    print(f"   - Response type: {type(data)}")
    print(f"   - Has 'results' key: {'results' in data}")
    print(f"   - Has 'data' key: {'data' in data}")
    
    if 'results' in data:
        messages = data['results']
        print(f"   - Messages count: {len(messages)}")
        if messages:
            print(f"   - First message keys: {list(messages[0].keys())}")
            print(f"   - First message structure:")
            print(json.dumps(messages[0], indent=4))
    elif 'data' in data:
        messages = data['data']
        print(f"   - Messages count: {len(messages)}")
        if messages:
            print(f"   - First message keys: {list(messages[0].keys())}")
            print(f"   - First message structure:")
            print(json.dumps(messages[0], indent=4))
    else:
        print(f"   - Direct messages array: {len(data)}")
        if data:
            print(f"   - First message keys: {list(data[0].keys())}")
            print(f"   - First message structure:")
            print(json.dumps(data[0], indent=4))
    
    print("\n" + "=" * 50)
    print("🎉 API Response Test Complete!")

if __name__ == "__main__":
    test_api_response() 