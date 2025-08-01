#!/usr/bin/env python3
"""
Test script for file upload functionality in the chat system.
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = 'http://localhost:8000'
API_BASE = f'{BASE_URL}/api/v1'

def login_user(username, password):
    """Login and get access token"""
    login_url = f'{API_BASE}/auth/login/'
    login_data = {
        'username': username,
        'password': password
    }
    
    print(f"🔐 Attempting login for user: {username}")
    print(f"📡 Login URL: {login_url}")
    
    try:
        response = requests.post(login_url, json=login_data)
        print(f"📊 Response status: {response.status_code}")
        print(f"📄 Response content: {response.text}")
        
        if response.status_code == 200:
            token = response.json().get('access_token')
            print(f"✅ Login successful, token: {token[:20]}..." if token else "❌ No access token in response")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Exception during login: {e}")
        return None

def get_chat_rooms(token):
    """Get available chat rooms"""
    headers = {'Authorization': f'Bearer {token}'}
    rooms_url = f'{API_BASE}/chat/rooms/'
    
    response = requests.get(rooms_url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get chat rooms: {response.status_code} - {response.text}")
        return []

def test_file_upload(token, room_id):
    """Test file upload functionality"""
    headers = {'Authorization': f'Bearer {token}'}
    upload_url = f'{API_BASE}/chat/files/upload/'
    
    # Create a test file with proper content type
    test_file_path = 'test_upload.txt'
    with open(test_file_path, 'w') as f:
        f.write('This is a test file for upload functionality.')
    
    # Set proper content type for the file
    import mimetypes
    mimetypes.add_type('text/plain', '.txt')
    
    try:
        # Prepare the file upload
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_upload.txt', f, 'text/plain')}
            data = {'room_id': room_id}
            
            print(f"📤 Uploading file to room {room_id}...")
            response = requests.post(upload_url, files=files, data=data, headers=headers)
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ File upload successful!")
                print(f"   Response: {result}")
                if 'data' in result and 'id' in result['data']:
                    print(f"   Message ID: {result['data']['id']}")
                    print(f"   File name: {result['data'].get('attachment_name', 'N/A')}")
                    print(f"   Content: {result['data'].get('content', 'N/A')}")
                    return result['data']['id']
                else:
                    print(f"   Unexpected response structure: {result}")
                    return None
            else:
                print(f"❌ File upload failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
    except Exception as e:
        print(f"❌ Error during file upload: {e}")
        return None
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_file_download(token, message_id):
    """Test file download functionality"""
    headers = {'Authorization': f'Bearer {token}'}
    download_url = f'{API_BASE}/chat/messages/{message_id}/download_file/'
    
    print(f"📥 Testing file download for message {message_id}...")
    response = requests.get(download_url, headers=headers)
    
    if response.status_code == 200:
        print(f"✅ File download successful!")
        print(f"   Content-Type: {response.headers.get('content-type')}")
        print(f"   Content-Length: {len(response.content)} bytes")
        return True
    else:
        print(f"❌ File download failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_file_info(token, message_id):
    """Test file info functionality"""
    headers = {'Authorization': f'Bearer {token}'}
    info_url = f'{API_BASE}/chat/messages/{message_id}/get_file_info/'
    
    print(f"📋 Testing file info for message {message_id}...")
    response = requests.get(info_url, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ File info retrieved successfully!")
        print(f"   Filename: {result['filename']}")
        print(f"   Size: {result['size']} bytes")
        print(f"   Content-Type: {result['content_type']}")
        print(f"   Uploaded by: {result['uploaded_by']}")
        return True
    else:
        print(f"❌ File info failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def main():
    print("🧪 Testing Chat File Upload Functionality")
    print("=" * 50)
    
    # Login as a test user (using newly created user)
    token = login_user('filetest', 'testpass123')
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    print(f"✅ Logged in successfully")
    
    # Get chat rooms
    rooms = get_chat_rooms(token)
    print(f"🐞 rooms raw: {rooms}")
    if not rooms:
        print("❌ No chat rooms available")
        return
    
    # Try to handle both list and dict response
    if isinstance(rooms, dict) and 'results' in rooms:
        room_list = rooms['results']
    elif isinstance(rooms, list):
        room_list = rooms
    else:
        print(f"❌ Unexpected chat rooms structure: {type(rooms)}")
        return
    
    print(f"✅ Found {len(room_list)} chat rooms")
    
    # Use the first available room
    if not room_list:
        print("❌ No chat rooms in list")
        return
    room_id = room_list[0]['id']
    print(f"📝 Using room: {room_list[0]['name']} (ID: {room_id})")
    
    # Test file upload
    message_id = test_file_upload(token, room_id)
    if message_id:
        # Test file download
        test_file_download(token, message_id)
        
        # Test file info
        test_file_info(token, message_id)
    
    print("\n🎉 File upload testing completed!")

if __name__ == '__main__':
    main() 