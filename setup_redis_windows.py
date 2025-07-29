#!/usr/bin/env python3
"""
Redis Setup Script for Windows
Downloads and sets up Redis for the School Management Platform
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import shutil
from pathlib import Path

def download_file(url, filename):
    """Download a file from URL"""
    print(f"📥 Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        return True
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return False

def extract_zip(zip_path, extract_to):
    """Extract zip file"""
    print(f"📦 Extracting {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        return True
    except Exception as e:
        print(f"❌ Failed to extract {zip_path}: {e}")
        return False

def setup_redis():
    """Set up Redis for Windows"""
    print("🔧 Setting up Redis for Windows...")
    
    # Redis download URL (using Memurai as Redis alternative for Windows)
    redis_url = "https://github.com/memurai/development/releases/download/2.0.4/Memurai-Developer-2.0.4.zip"
    redis_zip = "memurai.zip"
    redis_dir = Path("redis")
    
    # Create redis directory
    redis_dir.mkdir(exist_ok=True)
    
    # Download Redis
    if not download_file(redis_url, redis_zip):
        print("❌ Failed to download Redis")
        return False
    
    # Extract Redis
    if not extract_zip(redis_zip, redis_dir):
        print("❌ Failed to extract Redis")
        return False
    
    # Clean up zip file
    if os.path.exists(redis_zip):
        os.remove(redis_zip)
    
    # Find the redis-server executable
    redis_server = None
    for root, dirs, files in os.walk(redis_dir):
        for file in files:
            if file.lower() in ['redis-server.exe', 'memurai.exe']:
                redis_server = os.path.join(root, file)
                break
        if redis_server:
            break
    
    if not redis_server:
        print("❌ Could not find Redis server executable")
        return False
    
    print(f"✅ Redis server found at: {redis_server}")
    
    # Create a batch file to start Redis
    batch_content = f'''@echo off
echo Starting Redis server...
"{redis_server}" --port 6379
pause
'''
    
    with open("start_redis.bat", "w") as f:
        f.write(batch_content)
    
    print("✅ Created start_redis.bat file")
    print("\n📋 To start Redis:")
    print("1. Double-click start_redis.bat")
    print("2. Or run: start_redis.bat")
    print("3. Keep the Redis window open while testing")
    
    return True

def alternative_setup():
    """Provide alternative setup instructions"""
    print("\n🔄 Alternative Redis Setup Options:")
    print("\nOption 1: Use Docker (Recommended)")
    print("1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop")
    print("2. Run: docker run -d -p 6379:6379 redis:alpine")
    
    print("\nOption 2: Use WSL2 (Windows Subsystem for Linux)")
    print("1. Install WSL2: wsl --install")
    print("2. Install Redis in WSL: sudo apt-get install redis-server")
    print("3. Start Redis: sudo service redis-server start")
    
    print("\nOption 3: Use Redis Cloud (Free tier)")
    print("1. Sign up at: https://redis.com/try-free/")
    print("2. Get your Redis URL and update settings.py")
    
    print("\nOption 4: Manual Download")
    print("1. Download from: https://github.com/microsoftarchive/redis/releases")
    print("2. Extract and run redis-server.exe")

def main():
    """Main function"""
    print("🔧 Redis Setup for Windows")
    print("=" * 40)
    
    # Check if Redis is already running
    try:
        result = subprocess.run(["redis-cli", "ping"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and "PONG" in result.stdout:
            print("✅ Redis is already running!")
            return
    except:
        pass
    
    # Try to set up Redis
    if not setup_redis():
        print("\n❌ Automatic setup failed.")
        alternative_setup()
        return
    
    print("\n🎉 Redis setup completed!")
    print("\n📋 Next steps:")
    print("1. Start Redis: double-click start_redis.bat")
    print("2. Run the chat testing script: python start_chat_testing.py")

if __name__ == "__main__":
    main() 