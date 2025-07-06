import requests
import json

# Test login to get a fresh token
login_url = "http://localhost:8000/api/v1/auth/login/"
login_data = {
    "username": "central",
    "password": "test1212"
}

try:
    response = requests.post(login_url, json=login_data)
    print(f"Login Status Code: {response.status_code}")
    print(f"Login Response: {response.text}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get('access')
        print(f"\nAccess Token: {access_token}")
        
        # Test teachers API with fresh token
        teachers_url = "http://localhost:8000/api/v1/auth/teachers/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        print("\n=== Testing GET /api/v1/auth/teachers/ with fresh token ===")
        teachers_response = requests.get(teachers_url, headers=headers)
        print(f"Status Code: {teachers_response.status_code}")
        print(f"Response: {teachers_response.text}")
        
        # Test creating a teacher
        print("\n=== Testing POST /api/v1/auth/teachers/ ===")
        teacher_data = {
            "user_id": 4,  # central user ID
            "employee_id": "emp13",  # New unique ID
            "department": "Mathematics",
            "qualification": "MSc Mathematics",
            "experience_years": 5,
            "is_head_teacher": False,
            "can_manage_students": True,
            "can_manage_attendance": True,
            "can_manage_grades": True,
            "can_send_notifications": True,
            "can_view_reports": True,
            "subjects_ids": [1]  # Assuming subject ID 1 exists
        }
        
        create_response = requests.post(teachers_url, headers=headers, json=teacher_data)
        print(f"Create Status Code: {create_response.status_code}")
        print(f"Create Response: {create_response.text}")
        
except Exception as e:
    print(f"Error: {e}") 