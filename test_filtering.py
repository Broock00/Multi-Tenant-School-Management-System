import requests
import json

def test_filtering():
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
        
        # Test different filter combinations
        test_cases = [
            {
                "name": "No filters (all teachers)",
                "params": {}
            },
            {
                "name": "Department filter: sw",
                "params": {"department": "sw"}
            },
            {
                "name": "Department filter: computer science",
                "params": {"department": "computer science"}
            },
            {
                "name": "Qualification filter: masters",
                "params": {"qualification": "masters"}
            },
            {
                "name": "Subject filter: Physics (ID 3)",
                "params": {"subject": "3"}
            },
            {
                "name": "Subject filter: Mathematics (ID 1)",
                "params": {"subject": "1"}
            },
            {
                "name": "Search filter: firew",
                "params": {"search": "firew"}
            },
            {
                "name": "Search filter: roy",
                "params": {"search": "roy"}
            },
            {
                "name": "Department + Qualification",
                "params": {"department": "sw", "qualification": "masters"}
            },
            {
                "name": "Department + Subject",
                "params": {"department": "computer science", "subject": "3"}
            },
            {
                "name": "All filters combined",
                "params": {"department": "computer science", "qualification": "masters", "subject": "3"}
            }
        ]
        
        for test_case in test_cases:
            print(f"\n=== {test_case['name']} ===")
            response = requests.get(
                "http://localhost:8000/api/v1/auth/teachers/",
                headers=headers,
                params=test_case['params']
            )
            print(f"Status Code: {response.status_code}")
            print(f"URL: {response.url}")
            if response.status_code == 200:
                data = response.json()
                print(f"Count: {data.get('count', 0)}")
                if data.get('results'):
                    for teacher in data['results']:
                        print(f"  - {teacher['user']['first_name']} {teacher['user']['last_name']} (Dept: {teacher['department']}, Qual: {teacher['qualification']})")
                else:
                    print("  No results")
            else:
                print(f"Error: {response.text}")
        
    else:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)

if __name__ == "__main__":
    test_filtering() 