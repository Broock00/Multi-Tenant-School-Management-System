#!/usr/bin/env python3
"""
Quick Start Script for Chat Testing
This script helps you quickly set up and test the real-time chat functionality.
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def run_command(command, cwd=None, shell=True):
    """Run a command and return the result"""
    try:
        result = subprocess.run(command, cwd=cwd, shell=shell, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    # Check Python
    success, stdout, stderr = run_command("python --version")
    if not success:
        print("❌ Python not found. Please install Python 3.8+")
        return False
    print(f"✅ Python: {stdout.strip()}")
    
    # Check Node.js
    success, stdout, stderr = run_command("node --version")
    if not success:
        print("❌ Node.js not found. Please install Node.js 16+")
        return False
    print(f"✅ Node.js: {stdout.strip()}")
    
    # Check Redis
    success, stdout, stderr = run_command("redis-windows\\redis-cli.exe ping")
    if not success:
        print("⚠️  Redis not running. Please start Redis server: redis-windows\\redis-server.exe")
        print("   You can install Redis from: https://redis.io/download")
        return False
    print("✅ Redis: Running")
    
    return True

def setup_backend():
    """Set up the Django backend"""
    print("\n🐍 Setting up Django backend...")
    
    # Check if virtual environment exists
    venv_path = Path("venv")
    if not venv_path.exists():
        print("📦 Creating virtual environment...")
        success, stdout, stderr = run_command("python -m venv venv")
        if not success:
            print(f"❌ Failed to create virtual environment: {stderr}")
            return False
    
    # Activate virtual environment and install dependencies
    if os.name == 'nt':  # Windows
        activate_cmd = "venv\\Scripts\\activate"
        pip_cmd = "venv\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        activate_cmd = "source venv/bin/activate"
        pip_cmd = "venv/bin/pip"
    
    print("📦 Installing Python dependencies...")
    success, stdout, stderr = run_command(f"{pip_cmd} install -r requirements.txt")
    if not success:
        print(f"❌ Failed to install dependencies: {stderr}")
        return False
    
    print("✅ Backend dependencies installed")
    return True

def setup_frontend():
    """Set up the React frontend"""
    print("\n⚛️  Setting up React frontend...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    print("📦 Installing Node.js dependencies...")
    success, stdout, stderr = run_command("npm install", cwd="frontend")
    if not success:
        print(f"❌ Failed to install frontend dependencies: {stderr}")
        return False
    
    print("✅ Frontend dependencies installed")
    return True

def setup_database():
    """Set up the database and create sample data"""
    print("\n🗄️  Setting up database...")
    
    # Run migrations
    success, stdout, stderr = run_command("python manage.py migrate")
    if not success:
        print(f"❌ Failed to run migrations: {stderr}")
        return False
    
    # Create superuser if needed
    print("👤 Creating superuser...")
    success, stdout, stderr = run_command("python manage.py createsuperuser --noinput --username admin --email admin@example.com")
    if not success:
        print("⚠️  Superuser creation failed (might already exist)")
    
    # Set up sample data
    print("📊 Setting up sample data...")
    success, stdout, stderr = run_command("python manage.py setup_demo_user")
    if not success:
        print("⚠️  Demo user setup failed")
    
    success, stdout, stderr = run_command("python manage.py setup_test_data")
    if not success:
        print("⚠️  Test data setup failed")
    
    # Set up sample chat rooms
    print("💬 Setting up sample chat rooms...")
    success, stdout, stderr = run_command("python manage.py setup_sample_chat_rooms")
    if not success:
        print("⚠️  Chat rooms setup failed")
    
    print("✅ Database setup completed")
    return True

def start_servers():
    """Start the backend and frontend servers"""
    print("\n🚀 Starting servers...")
    
    # Start Django server in background
    print("🌐 Starting Django server...")
    if os.name == 'nt':  # Windows
        subprocess.Popen("python manage.py runserver", shell=True)
    else:  # Unix/Linux/Mac
        subprocess.Popen("python manage.py runserver", shell=True)
    
    # Wait a moment for Django to start
    time.sleep(3)
    
    # Start React server in background
    print("⚛️  Starting React server...")
    if os.name == 'nt':  # Windows
        subprocess.Popen("npm start", cwd="frontend", shell=True)
    else:  # Unix/Linux/Mac
        subprocess.Popen("npm start", cwd="frontend", shell=True)
    
    # Wait for servers to start
    print("⏳ Waiting for servers to start...")
    time.sleep(10)
    
    # Open browser
    print("🌐 Opening browser...")
    webbrowser.open("http://localhost:3000")
    
    print("✅ Servers started!")
    print("\n📋 Next Steps:")
    print("1. Login with username: admin, password: admin123")
    print("2. Navigate to the Chat page")
    print("3. Test real-time messaging")
    print("4. Open multiple browser windows to test between users")
    
    return True

def main():
    """Main function"""
    print("🎉 Welcome to the School Management Chat Testing Setup!")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies and try again.")
        return
    
    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed.")
        return
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed.")
        return
    
    # Setup database
    if not setup_database():
        print("\n❌ Database setup failed.")
        return
    
    # Start servers
    if not start_servers():
        print("\n❌ Failed to start servers.")
        return
    
    print("\n🎉 Setup completed successfully!")
    print("\n📚 For more information, see: CHAT_IMPLEMENTATION_GUIDE.md")
    print("🧪 For automated testing, run: python test_chat_functionality.py")

if __name__ == "__main__":
    main() 