import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_schools_api():
    # Get the first superuser
    try:
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            print("No superuser found")
            return
        
        print(f"Testing with superuser: {superuser.username}")
        
        # Create a token for the superuser
        refresh = RefreshToken.for_user(superuser)
        access_token = str(refresh.access_token)
        
        print(f"Generated token: {access_token[:20]}...")
        
        # Test the API endpoint
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('http://localhost:8000/api/v1/schools/', headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data.get('results', data))} schools")
            print(f"Response: {json.dumps(data, indent=2)[:500]}...")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_schools_api() 