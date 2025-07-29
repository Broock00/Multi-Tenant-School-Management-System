#!/usr/bin/env python3
"""
Quick Chat System Runner
Runs all necessary commands to start the chat system
"""

import os
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

def main():
    print("🚀 Starting School Management Chat System")
    print("=" * 50)
    
    # Step 1: Install Pillow
    print("📦 Installing Pillow...")
    success, stdout, stderr = run_command("pip install Pillow==10.0.1")
    if success:
        print("✅ Pillow installed successfully")
    else:
        print("⚠️  Pillow installation failed, but continuing...")
    
    # Step 2: Run migrations
    print("\n🗄️  Running database migrations...")
    success, stdout, stderr = run_command("python manage.py migrate")
    if success:
        print("✅ Migrations completed")
    else:
        print(f"❌ Migrations failed: {stderr}")
        return
    
    # Step 3: Create sample chat rooms
    print("\n💬 Setting up sample chat rooms...")
    success, stdout, stderr = run_command("python manage.py setup_sample_chat_rooms")
    if success:
        print("✅ Sample chat rooms created")
    else:
        print("⚠️  Sample chat rooms setup failed, but continuing...")
    
    # Step 4: Start Django server
    print("\n🌐 Starting Django server...")
    print("Django will be available at: http://localhost:8000")
    
    # Start Django in background
    django_process = subprocess.Popen(
        "python manage.py runserver",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for Django to start
    time.sleep(5)
    
    # Step 5: Start React frontend
    print("\n⚛️  Starting React frontend...")
    print("Frontend will be available at: http://localhost:3000")
    
    # Check if frontend directory exists
    if not Path("frontend").exists():
        print("❌ Frontend directory not found")
        django_process.terminate()
        return
    
    # Start React in background
    react_process = subprocess.Popen(
        "npm start",
        cwd="frontend",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for servers to start
    print("\n⏳ Waiting for servers to start...")
    time.sleep(15)
    
    # Open browser
    print("\n🌐 Opening browser...")
    webbrowser.open("http://localhost:3000")
    
    print("\n🎉 Chat system is running!")
    print("\n📋 Access Points:")
    print("- Frontend: http://localhost:3000")
    print("- Backend API: http://localhost:8000")
    print("- Admin Panel: http://localhost:8000/admin")
    
    print("\n👤 Test Users (if available):")
    print("- Username: admin, Password: admin123")
    print("- Or create your own user through the registration")
    
    print("\n💬 To test chat:")
    print("1. Login with any user")
    print("2. Navigate to 'Chat' in the sidebar")
    print("3. Select a chat room and start messaging")
    print("4. Open multiple browser windows to test real-time messaging")
    
    print("\n⏹️  To stop the servers:")
    print("Press Ctrl+C in this terminal")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        django_process.terminate()
        react_process.terminate()
        print("✅ Servers stopped")

if __name__ == "__main__":
    main() 