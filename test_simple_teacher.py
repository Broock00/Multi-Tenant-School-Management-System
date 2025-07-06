import requests
import json

# Test login to get a fresh token
login_url = "http://localhost:8000/api/v1/auth/login/"
login_data = {
    "username": "central",
    "password": "test1212"
}

try:
    # Login
    response = requests.post(login_url, json=login_data)
    print(f"Login Status Code: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get('access')
        print("✓ Login successful")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Test teachers list
        print("\n=== Testing teachers list ===")
        teachers_url = "http://localhost:8000/api/v1/auth/teachers/"
        teachers_response = requests.get(teachers_url, headers=headers)
        print(f"Teachers List Status: {teachers_response.status_code}")
        print(f"Teachers List Response: {teachers_response.text}")
        
        if teachers_response.status_code == 200:
            teachers_data = teachers_response.json()
            count = teachers_data.get('count', 0)
            print(f"✓ Found {count} teachers")
            
            if count > 0:
                print("✓ Teachers are visible!")
            else:
                print("ℹ No teachers found yet")
        else:
            print("✗ Failed to fetch teachers")
    else:
        print("✗ Login failed")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"Error: {e}") 