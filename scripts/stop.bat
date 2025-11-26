@echo off
echo ========================================
echo   Stopping SafeCircle Application
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul

echo Stopping all Expo processes...
taskkill /F /IM expo.exe 2>nul

echo.
echo ========================================
echo  SafeCircle Stopped Successfully!
echo ========================================
echo.
echo All backend and mobile servers have been stopped.
echo.
pause
