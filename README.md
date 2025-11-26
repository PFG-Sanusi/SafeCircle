# SafeCircle - Mobile Safety App

**Real-time location tracking and SOS emergency alerts for iOS & Android**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed
- For mobile testing:
  - Android: Android Studio + Emulator OR physical device
  - iOS: Xcode + Simulator (macOS only) OR physical device

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SafeCircle
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Setup Mobile App**
   ```bash
   cd mobile
   npm install
   # Edit app.config.js with your API URL
   npm start
   ```

4. **Setup Database**
   - Create Supabase account: https://supabase.com
   - Create new project
   - Enable PostGIS extension
   - Run `database/schema.sql` in SQL Editor

## 📱 Project Structure

```
SafeCircle/
├── backend/          # Node.js API server
│   ├── src/
│   │   ├── routes/  # API endpoints
│   │   └── middleware/
│   ├── server.js
│   └── package.json
│
├── mobile/          # React Native app
│   ├── src/
│   │   ├── screens/
│   │   ├── context/
│   │   ├── services/
│   │   └── config/
│   ├── App.js
│   └── package.json
│
└── database/        # PostgreSQL schema
    └── schema.sql
```

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env`:
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
FCM_SERVER_KEY=your_fcm_key
```

### Mobile App Configuration
Edit `mobile/app.config.js`:
```javascript
extra: {
  apiUrl: "http://your-backend-url:3000"
}
```

## 🚀 Running the App

### Backend
```bash
cd backend
npm run dev          # Development with nodemon
# OR
npm start            # Production
```

### Mobile
```bash
cd mobile
npm start            # Start Expo
# Then:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Scan QR code with Expo Go app
```

## 🌟 Key Features

- ✅ Real-time GPS location tracking
- ✅ SOS emergency alerts
- ✅ Family/Group location sharing
- ✅ User connections management
- ✅ Emergency contacts
- ✅ Push notifications (FCM)
- ✅ SMS notifications (Africa's Talking)
- ✅ OpenStreetMap integration
- ✅ Socket.IO real-time updates
- ✅ JWT authentication

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- Socket.IO (WebSocket)
- Supabase (PostgreSQL + PostGIS)
- JWT Authentication

**Mobile:**
- React Native + Expo
- React Navigation
- OpenStreetMap (react-native-maps)
- expo-location
- Socket.IO Client

**Database:**
- PostgreSQL with PostGIS extension
- Hosted on Supabase (free tier available)

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Locations
- `GET /api/locations/connections` - Get connected users' locations
- `GET /api/locations/family/:familyId` - Get family members' locations
- `POST /api/locations/toggle-sharing` - Enable/disable sharing

### SOS Alerts
- `POST /api/sos/trigger` - Trigger SOS alert
- `GET /api/sos/alerts` - Get user's SOS history
- `GET /api/sos/received` - Get received SOS alerts
- `PUT /api/sos/alerts/:id/resolve` - Resolve alert

### Connections
- `POST /api/connections/request` - Send connection request
- `GET /api/connections` - Get connections
- `PUT /api/connections/:id/accept` - Accept request

### Families
- `POST /api/families` - Create family
- `POST /api/families/join` - Join with invite code
- `GET /api/families` - Get user's families

### Emergency Contacts
- `POST /api/emergency-contacts` - Add contact
- `GET /api/emergency-contacts` - Get contacts
- `PUT /api/emergency-contacts/:id` - Update contact
- `DELETE /api/emergency-contacts/:id` - Delete contact

## 🔒 Security

- JWT token-based authentication
- Password hashing with bcryptjs
- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection protection (Supabase)

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##support

For issues or questions:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Contact: your-email@example.com

---

**Built with ❤️ for keeping people safe**
