require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIO = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const locationRoutes = require('./src/routes/locations');
const familyRoutes = require('./src/routes/families');
const connectionRoutes = require('./src/routes/connections');
const sosRoutes = require('./src/routes/sos');
const emergencyContactRoutes = require('./src/routes/emergencyContacts');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);

// Socket.IO for real-time location tracking
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // User joins with their ID
    socket.on('join', (userId) => {
        activeUsers.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    // Real-time location update
    socket.on('location_update', async (data) => {
        const { userId, latitude, longitude, accuracy, altitude, speed, heading } = data;

        try {
            // Save location to database
            const { data: location, error } = await supabase
                .from('user_locations')
                .insert({
                    user_id: userId,
                    latitude,
                    longitude,
                    location: `POINT(${longitude} ${latitude})`,
                    accuracy,
                    altitude,
                    speed,
                    heading,
                    timestamp: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Get users who can see this user's location
            const { data: permissions } = await supabase
                .from('location_permissions')
                .select('shared_with_user_id')
                .eq('user_id', userId)
                .eq('is_enabled', true);

            // Broadcast to authorized users
            if (permissions) {
                permissions.forEach(perm => {
                    const targetSocketId = activeUsers.get(perm.shared_with_user_id);
                    if (targetSocketId) {
                        io.to(targetSocketId).emit('location_updated', {
                            userId,
                            latitude,
                            longitude,
                            accuracy,
                            timestamp: location.timestamp
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Location update error:', error);
            socket.emit('error', { message: 'Failed to update location' });
        }
    });

    // SOS alert triggered
    socket.on('sos_alert', async (data) => {
        const { userId, latitude, longitude, message } = data;

        try {
            // Create SOS alert in database
            const { data: alert, error } = await supabase
                .from('sos_alerts')
                .insert({
                    user_id: userId,
                    latitude,
                    longitude,
                    location: `POINT(${longitude} ${latitude})`,
                    message: message || 'Emergency! I need help!'
                })
                .select()
                .single();

            if (error) throw error;

            // Get user info
            const { data: user } = await supabase
                .from('users')
                .select('full_name, phone_number')
                .eq('id', userId)
                .single();

            // Get emergency contacts
            const { data: contacts } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', userId)
                .order('priority');

            // Send notifications to emergency contacts
            const notificationPromises = contacts.map(async (contact) => {
                // Send push notification if contact is app user
                if (contact.contact_user_id) {
                    const targetSocketId = activeUsers.get(contact.contact_user_id);
                    if (targetSocketId) {
                        io.to(targetSocketId).emit('sos_received', {
                            alertId: alert.id,
                            from: user.full_name,
                            fromPhone: user.phone_number,
                            latitude,
                            longitude,
                            message: alert.message,
                            timestamp: alert.created_at
                        });
                    }

                    // Send FCM push notification
                    const { data: contactUser } = await supabase
                        .from('users')
                        .select('fcm_token')
                        .eq('id', contact.contact_user_id)
                        .single();

                    if (contactUser?.fcm_token) {
                        // FCM notification will be sent via separate service
                        await sendFCMNotification(contactUser.fcm_token, {
                            title: '🚨 SOS ALERT',
                            body: `${user.full_name} needs help! Location: ${latitude}, ${longitude}`,
                            data: {
                                type: 'sos',
                                alertId: alert.id,
                                latitude: latitude.toString(),
                                longitude: longitude.toString()
                            }
                        });
                    }
                }

                // Send SMS (via Africa's Talking or similar)
                if (contact.contact_phone) {
                    await sendSMS(contact.contact_phone,
                        `🚨 SOS: ${user.full_name} needs help! Location: https://maps.google.com/?q=${latitude},${longitude}`
                    );
                }

                // Log notification
                return supabase
                    .from('sos_notifications')
                    .insert({
                        sos_alert_id: alert.id,
                        recipient_user_id: contact.contact_user_id,
                        recipient_phone: contact.contact_phone,
                        notification_type: contact.contact_user_id ? 'push' : 'sms',
                        is_delivered: true,
                        delivered_at: new Date().toISOString()
                    });
            });

            await Promise.all(notificationPromises);

            socket.emit('sos_sent', {
                alertId: alert.id,
                message: 'SOS alert sent to emergency contacts'
            });

        } catch (error) {
            console.error('SOS alert error:', error);
            socket.emit('error', { message: 'Failed to send SOS alert' });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            activeUsers.delete(socket.userId);
            console.log(`User ${socket.userId} disconnected`);
        }
    });
});

// Helper: Send FCM notification
async function sendFCMNotification(fcmToken, payload) {
    const axios = require('axios');

    try {
        await axios.post('https://fcm.googleapis.com/fcm/send', {
            to: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
                sound: 'default',
                priority: 'high'
            },
            data: payload.data
        }, {
            headers: {
                'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('FCM notification error:', error.message);
    }
}

// Helper: Send SMS (Africa's Talking)
async function sendSMS(phoneNumber, message) {
    // This is a placeholder - implement based on your SMS provider
    // Example for Africa's Talking:
    /*
    const AfricasTalking = require('africastalking')({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME
    });
    
    const sms = AfricasTalking.SMS;
    await sms.send({
        to: [phoneNumber],
        message: message
    });
    */
    console.log(`SMS to ${phoneNumber}: ${message}`);
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 WebSocket ready for real-time location tracking`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io, supabase };
