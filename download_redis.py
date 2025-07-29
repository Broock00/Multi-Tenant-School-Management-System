#!/usr/bin/env python3
"""
Quick Redis Download for Windows
"""

import os
import urllib.request
import zipfile
import subprocess
from pathlib import Path

def main():
    print("🔧 Quick Redis Setup for Windows")
    print("=" * 40)
    
    # Redis download URL (Microsoft's Redis for Windows)
    redis_url = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.zip"
    redis_zip = "redis-windows.zip"
    
    print("📥 Downloading Redis for Windows...")
    print("This may take a few minutes...")
    
    try:
        urllib.request.urlretrieve(redis_url, redis_zip)
        print("✅ Download completed!")
    except Exception as e:
        print(f"❌ Download failed: {e}")
        print("\n🔄 Alternative: Please download manually from:")
        print("https://github.com/microsoftarchive/redis/releases")
        print("Download: Redis-x64-3.0.504.zip")
        return
    
    print("📦 Extracting Redis...")
    try:
        with zipfile.ZipFile(redis_zip, 'r') as zip_ref:
            zip_ref.extractall("redis-windows")
        print("✅ Extraction completed!")
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return
    
    # Clean up zip file
    if os.path.exists(redis_zip):
        os.remove(redis_zip)
    
    # Find redis-server.exe
    redis_server = None
    for root, dirs, files in os.walk("redis-windows"):
        for file in files:
            if file.lower() == "redis-server.exe":
                redis_server = os.path.join(root, file)
                break
        if redis_server:
            break
    
    if not redis_server:
        print("❌ Could not find redis-server.exe")
        return
    
    print(f"✅ Redis server found at: {redis_server}")
    
    # Create batch file to start Redis
    batch_content = f'''@echo off
echo Starting Redis server...
cd /d "{os.path.dirname(redis_server)}"
"{redis_server}" --port 6379
pause
'''
    
    with open("start_redis.bat", "w") as f:
        f.write(batch_content)
    
    print("✅ Created start_redis.bat file")
    print("\n📋 To start Redis:")
    print("1. Double-click start_redis.bat")
    print("2. Keep the Redis window open")
    print("3. Then run: python start_chat_testing.py")
    
    # Test if Redis starts
    print("\n🧪 Testing Redis...")
    try:
        result = subprocess.run([redis_server, "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Redis server is working!")
        else:
            print("⚠️  Redis server test failed, but you can still try to start it manually")
    except Exception as e:
        print(f"⚠️  Could not test Redis: {e}")

if __name__ == "__main__":
    main() 