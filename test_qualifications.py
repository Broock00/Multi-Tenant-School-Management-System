import requests
import json

# Test the qualifications endpoint
def test_qualifications():
    # First login to get a token
    login_data = {
        "username": "central",
        "password": "test1212"
    }
    
    login_response = requests.post(
        "http://localhost:8000/api/v1/auth/login/",
        json=login_data
    )
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test qualifications endpoint
        qualifications_response = requests.get(
            "http://localhost:8000/api/v1/auth/teachers/qualifications/",
            headers=headers
        )
        
        print("=== Testing qualifications endpoint ===")
        print(f"Status Code: {qualifications_response.status_code}")
        print(f"Response: {qualifications_response.text}")
        
        # Test teachers endpoint with search
        teachers_response = requests.get(
            "http://localhost:8000/api/v1/auth/teachers/?search=firew",
            headers=headers
        )
        
        print("\n=== Testing teachers search ===")
        print(f"Status Code: {teachers_response.status_code}")
        print(f"Response: {teachers_response.text}")
        
    else:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)

if __name__ == "__main__":
    test_qualifications() 