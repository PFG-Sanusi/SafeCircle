@echo off
echo ========================================
echo   Restarting SafeCircle Application
echo ========================================
echo.

echo Step 1: Stopping all servers...
call "%~dp0stop.bat"

echo.
echo Step 2: Starting servers again...
timeout /t 2 /nobreak >nul
call "%~dp0start.bat"
