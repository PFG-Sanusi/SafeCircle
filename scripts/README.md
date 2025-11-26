# SafeCircle Scripts

This folder contains batch files to easily manage the SafeCircle application.

## Available Scripts

### `start.bat`
Starts both the backend server and mobile app in separate windows.

**Usage:**
```bash
# Double-click the file, or run from command line:
scripts\start.bat
```

**What it does:**
- Opens a new terminal window for the backend server (port 3000)
- Opens a new terminal window for the Expo mobile app
- Keeps both windows open so you can see logs

---

### `stop.bat`
Stops all running Node.js and Expo processes.

**Usage:**
```bash
# Double-click the file, or run from command line:
scripts\stop.bat
```

**What it does:**
- Forcefully terminates all Node.js processes (backend server)
- Terminates all Expo processes (mobile app)
- Closes all related terminal windows

⚠️ **Warning:** This will stop ALL Node.js processes on your system, not just SafeCircle.

---

### `restart.bat`
Restarts the entire application (stops then starts).

**Usage:**
```bash
# Double-click the file, or run from command line:
scripts\restart.bat
```

**What it does:**
- Runs `stop.bat` to kill all processes
- Waits 2 seconds
- Runs `start.bat` to start fresh servers

---

## Quick Start Guide

1. **First Time Setup:**
   - Make sure you've run `npm install` in both `backend` and `mobile` folders
   - Configure your `.env` file in the `backend` folder
   - Update `mobile/app.config.js` with your backend URL

2. **Start the App:**
   - Double-click `start.bat`
   - Wait for both servers to start
   - Scan QR code in Expo window with Expo Go app

3. **Stop the App:**
   - Double-click `stop.bat`
   - All servers will shut down

4. **Restart After Code Changes:**
   - Double-click `restart.bat`
   - Or just use `start.bat` (servers auto-reload on file changes)

---

## Troubleshooting

**"Port 3000 is already in use"**
- Run `stop.bat` to kill all processes
- Then run `start.bat` again

**Scripts not opening terminals**
- Make sure you're running Windows
- Right-click the file → "Run as Administrator" if needed

**Node.js not found**
- Make sure Node.js is installed and in your PATH
- Restart your computer after installing Node.js
