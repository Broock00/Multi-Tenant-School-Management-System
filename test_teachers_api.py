import requests
import json

# Test the teachers API endpoint
base_url = "http://localhost:8000/api/v1/auth/teachers/"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUxODAzODQyLCJpYXQiOjE3NTE4MDAyNDIsImp0aSI6IjRhYjM4OGUwNTNkMjRmOWU5NjI4NjE5YmNjZDU5MDlmIiwidXNlcl9pZCI6Mn0.0zJNxp5UUBH23rmy_MbCT0Zozjs5oGk5ycTPHHOvOR0",
    "Content-Type": "application/json"
}

# Test GET request
print("=== Testing GET /api/v1/auth/teachers/ ===")
try:
    response = requests.get(base_url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Testing POST /api/v1/auth/teachers/ ===")
# Test POST request to create a teacher
teacher_data = {
    "user_id": 2,  # Assuming user ID 2 exists
    "employee_id": "emp12",  # Changed to avoid duplicate
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

try:
    response = requests.post(base_url, headers=headers, json=teacher_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}") 