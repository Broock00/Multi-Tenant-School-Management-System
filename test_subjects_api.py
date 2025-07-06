import requests
import json

# Test the subjects API endpoint
base_url = "http://localhost:8000/api/v1/classes/subjects/"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUxODAzODQyLCJpYXQiOjE3NTE4MDAyNDIsImp0aSI6IjRhYjM4OGUwNTNkMjRmOWU5NjI4NjE5YmNjZDU5MDlmIiwidXNlcl9pZCI6Mn0.0zJNxp5UUBH23rmy_MbCT0Zozjs5oGk5ycTPHHOvOR0",
    "Content-Type": "application/json"
}

# Test GET request
print("=== Testing GET /api/v1/classes/subjects/ ===")
try:
    response = requests.get(base_url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Testing POST /api/v1/classes/subjects/ ===")
# Test POST request to create a subject
subject_data = {
    "name": "Mathematics",
    "code": "MATH101",
    "description": "Basic mathematics course",
    "is_core": True,
    "is_active": True
}

try:
    response = requests.post(base_url, headers=headers, json=subject_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}") 