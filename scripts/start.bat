@echo off
echo ========================================
echo    Starting SafeCircle Application
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "SafeCircle Backend" cmd /k "cd /d %~dp0..\backend && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Mobile App (Expo)...
start "SafeCircle Mobile" cmd /k "cd /d %~dp0..\mobile && npm start"

echo.
echo ========================================
echo  SafeCircle Started Successfully!
echo ========================================
echo.
echo Backend Server: http://localhost:3000
echo Expo DevTools: Check the Mobile window
echo.
echo Press any key to close this window...
pause >nul
