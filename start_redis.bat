@echo off
echo Starting Redis server...
cd /d "redis-windows"
"redis-windows\redis-server.exe" --port 6379
pause
