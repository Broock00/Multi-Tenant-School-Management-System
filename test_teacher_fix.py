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
        
        # Step 1: Create a new user first
        print("\n=== Step 1: Creating a new user ===")
        user_data = {
            "username": "teacher_test",
            "email": "teacher_test@example.com",
            "first_name": "Test",
            "last_name": "Teacher",
            "phone": "1234567890",
            "password": "testpass123",
            "role": "teacher"
        }
        
        users_url = "http://localhost:8000/api/v1/auth/users/"
        user_response = requests.post(users_url, headers=headers, json=user_data)
        print(f"User Creation Status: {user_response.status_code}")
        print(f"User Response: {user_response.text}")
        
        if user_response.status_code == 201:
            new_user = user_response.json()
            user_id = new_user['id']
            print(f"✓ User created with ID: {user_id}")
            
            # Step 2: Create a teacher for this user
            print("\n=== Step 2: Creating a teacher ===")
            teacher_data = {
                "user_id": user_id,
                "employee_id": "emp_test_001",
                "department": "Computer Science",
                "qualification": "MSc Computer Science",
                "experience_years": 3,
                "is_head_teacher": False,
                "can_manage_students": True,
                "can_manage_attendance": True,
                "can_manage_grades": True,
                "can_send_notifications": True,
                "can_view_reports": True,
                "subjects_ids": []
            }
            
            teachers_url = "http://localhost:8000/api/v1/auth/teachers/"
            teacher_response = requests.post(teachers_url, headers=headers, json=teacher_data)
            print(f"Teacher Creation Status: {teacher_response.status_code}")
            print(f"Teacher Response: {teacher_response.text}")
            
            if teacher_response.status_code == 201:
                print("✓ Teacher created successfully")
                
                # Step 3: Fetch teachers list
                print("\n=== Step 3: Fetching teachers list ===")
                teachers_list_response = requests.get(teachers_url, headers=headers)
                print(f"Teachers List Status: {teachers_list_response.status_code}")
                print(f"Teachers List Response: {teachers_list_response.text}")
                
                if teachers_list_response.status_code == 200:
                    teachers_data = teachers_list_response.json()
                    count = teachers_data.get('count', 0)
                    results = teachers_data.get('results', [])
                    print(f"✓ Found {count} teachers in the list")
                    if results:
                        print("✓ Teachers are now visible in the list!")
                    else:
                        print("✗ Teachers list is still empty")
                else:
                    print("✗ Failed to fetch teachers list")
            else:
                print("✗ Failed to create teacher")
        else:
            print("✗ Failed to create user")
    else:
        print("✗ Login failed")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"Error: {e}") 