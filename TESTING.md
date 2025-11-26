# SafeCircle Testing Guide

This guide explains how to test both the Backend API and the Mobile Application.

## 1. Backend Testing

### Prerequisites
- Node.js installed
- Supabase project set up (or mock credentials)
- `.env` file created in `backend/` (copy from `.env.example`)

### Automated Tests (Jest)
We have set up Jest for automated testing.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not done):**
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```
   *Currently, this runs a health check test. You can add more tests in `backend/tests/`.*

### Manual API Testing (Postman / cURL)
You can test the API endpoints manually using Postman or cURL.

**Base URL:** `http://localhost:3000/api`

**Common Endpoints:**
- **Health Check:** `GET /health`
- **Register:** `POST /auth/register`
  - Body: `{ "phoneNumber": "+1234567890", "password": "password123", "fullName": "Test User" }`
- **Login:** `POST /auth/login`
  - Body: `{ "phoneNumber": "+1234567890", "password": "password123" }`
  - *Returns a JWT token. Use this token in the `Authorization` header for protected routes: `Bearer <TOKEN>`.*
- **Trigger SOS:** `POST /sos/trigger` (Requires Auth)
  - Body: `{ "latitude": 6.5244, "longitude": 3.3792, "message": "Help!" }`

## 2. Mobile App Testing

### Prerequisites
- Expo Go app installed on your phone (Android/iOS) OR an Android/iOS Simulator.

### Running the App
1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   *This will launch a QR code in your terminal/browser.*

4. **Load the app:**
   - **Physical Device:** Scan the QR code with the Expo Go app.
   - **Emulator:** Press `a` for Android or `i` for iOS in the terminal.

### Testing Real-time Features
1. Open the app on two different devices (or one simulator and one phone).
2. Log in with different accounts on each.
3. **Location:** Move one device (or simulate location change) and observe the map on the other device (if permissions allow).
4. **SOS:** Press the SOS button on one device. The other device (if set as an emergency contact) should receive a notification.

## 3. Real-time Socket Testing
The backend logs socket connections. watch the backend terminal:
- When the mobile app connects, you should see: `Client connected: <socket_id>`
- When a user logs in, you should see: `User <UUID> joined with socket <socket_id>`
