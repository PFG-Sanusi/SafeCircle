const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// All routes require authentication
router.use(authenticateToken);

// POST /api/sos/trigger - Trigger SOS alert (primary endpoint, but Socket.IO is preferred)
router.post('/trigger', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { latitude, longitude, message } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Location coordinates required' });
        }

        // Get user info
        const { data: user } = await supabase
            .from('users')
            .select('full_name, phone_number, fcm_token')
            .eq('id', userId)
            .single();

        // Create SOS alert
        const { data: alert, error } = await supabase
            .from('sos_alerts')
            .insert({
                user_id: userId,
                latitude,
                longitude,
                location: `POINT(${longitude} ${latitude})`,
                message: message || `🚨 EMERGENCY! ${user.full_name} needs help!`,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        // Get emergency contacts
        const { data: contacts } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('user_id', userId)
            .order('priority');

        if (!contacts || contacts.length === 0) {
            return res.status(400).json({
                error: 'No emergency contacts configured. Please add emergency contacts first.'
            });
        }

        // Send notifications to all emergency contacts
        const notificationResults = await Promise.allSettled(
            contacts.map(contact => sendSOSNotification(contact, user, alert))
        );

        const successCount = notificationResults.filter(r => r.status === 'fulfilled').length;

        res.json({
            alertId: alert.id,
            message: 'SOS alert triggered',
            notificationsSent: successCount,
            totalContacts: contacts.length,
            alert: {
                id: alert.id,
                latitude: alert.latitude,
                longitude: alert.longitude,
                message: alert.message,
                createdAt: alert.created_at
            }
        });

    } catch (error) {
        console.error('SOS trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger SOS alert' });
    }
});

// GET /api/sos/alerts - Get user's SOS alert history
router.get('/alerts', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, limit = 50 } = req.query;

        let query = supabase
            .from('sos_alerts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (status) {
            query = query.eq('status', status);
        }

        const { data: alerts, error } = await query;

        if (error) throw error;

        res.json({ alerts });

    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

// GET /api/sos/received - Get SOS alerts received from others
router.get('/received', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 50 } = req.query;

        // Get alerts where user is an emergency contact
        const { data: notifications, error } = await supabase
            .from('sos_notifications')
            .select(`
                *,
                sos_alert:sos_alerts(
                    id,
                    latitude,
                    longitude,
                    message,
                    status,
                    created_at,
                    user:users(id, full_name, phone_number, profile_picture_url)
                )
            `)
            .eq('recipient_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        res.json({ alerts: notifications });

    } catch (error) {
        console.error('Get received alerts error:', error);
        res.status(500).json({ error: 'Failed to get received alerts' });
    }
});

// PUT /api/sos/alerts/:alertId/resolve - Mark alert as resolved
router.put('/alerts/:alertId/resolve', async (req, res) => {
    try {
        const userId = req.user.userId;
        const alertId = req.params.alertId;

        // Verify alert belongs to user
        const { data: alert } = await supabase
            .from('sos_alerts')
            .select('user_id')
            .eq('id', alertId)
            .single();

        if (!alert || alert.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to resolve this alert' });
        }

        // Update alert status
        const { error } = await supabase
            .from('sos_alerts')
            .update({
                status: 'resolved',
                is_resolved: true,
                resolved_at: new Date().toISOString()
            })
            .eq('id', alertId);

        if (error) throw error;

        // Notify emergency contacts that alert is resolved
        const { data: notifications } = await supabase
            .from('sos_notifications')
            .select('recipient_user_id, sos_alert:sos_alerts(user:users(full_name))')
            .eq('sos_alert_id', alertId);

        // Send resolution notifications
        if (notifications) {
            await Promise.allSettled(
                notifications.map(notif =>
                    sendResolutionNotification(notif.recipient_user_id, notif.sos_alert.user.full_name)
                )
            );
        }

        res.json({ message: 'Alert resolved successfully' });

    } catch (error) {
        console.error('Resolve alert error:', error);
        res.status(500).json({ error: 'Failed to resolve alert' });
    }
});

// PUT /api/sos/notifications/:notificationId/read - Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = req.params.notificationId;

        // Verify notification belongs to user
        const { data: notification } = await supabase
            .from('sos_notifications')
            .select('recipient_user_id')
            .eq('id', notificationId)
            .single();

        if (!notification || notification.recipient_user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Mark as read
        const { error } = await supabase
            .from('sos_notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);

        if (error) throw error;

        res.json({ message: 'Notification marked as read' });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// GET /api/sos/active - Get all active SOS alerts (for admin/monitoring)
router.get('/active', async (req, res) => {
    try {
        const { data: alerts, error } = await supabase
            .from('sos_alerts')
            .select(`
                *,
                user:users(id, full_name, phone_number, profile_picture_url)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ alerts });

    } catch (error) {
        console.error('Get active alerts error:', error);
        res.status(500).json({ error: 'Failed to get active alerts' });
    }
});

// Helper: Send SOS notification to emergency contact
async function sendSOSNotification(contact, user, alert) {
    const googleMapsLink = `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`;
    const message = `🚨 SOS ALERT: ${user.full_name} needs help!\n\nMessage: ${alert.message}\n\nLocation: ${googleMapsLink}\n\nTime: ${new Date(alert.created_at).toLocaleString()}`;

    let notificationType = 'sms';
    let isDelivered = false;

    try {
        // If contact is an app user, send push notification
        if (contact.contact_user_id) {
            const { data: contactUser } = await supabase
                .from('users')
                .select('fcm_token')
                .eq('id', contact.contact_user_id)
                .single();

            if (contactUser?.fcm_token) {
                await sendFCMNotification(contactUser.fcm_token, {
                    title: '🚨 SOS ALERT',
                    body: `${user.full_name} needs help!`,
                    data: {
                        type: 'sos',
                        alertId: alert.id,
                        latitude: alert.latitude.toString(),
                        longitude: alert.longitude.toString(),
                        userId: user.id,
                        userName: user.full_name
                    }
                });
                notificationType = 'push';
                isDelivered = true;
            }
        }

        // Always send SMS as backup
        if (contact.contact_phone) {
            await sendSMS(contact.contact_phone, message);
            if (notificationType !== 'push') {
                notificationType = 'sms';
            }
            isDelivered = true;
        }

        // Log notification
        await supabase
            .from('sos_notifications')
            .insert({
                sos_alert_id: alert.id,
                recipient_user_id: contact.contact_user_id,
                recipient_phone: contact.contact_phone,
                recipient_email: contact.contact_email,
                notification_type: notificationType,
                is_delivered: isDelivered,
                delivered_at: isDelivered ? new Date().toISOString() : null
            });

        return { success: true, contact: contact.contact_name };

    } catch (error) {
        console.error(`Failed to notify ${contact.contact_name}:`, error);

        // Log failed notification
        await supabase
            .from('sos_notifications')
            .insert({
                sos_alert_id: alert.id,
                recipient_user_id: contact.contact_user_id,
                recipient_phone: contact.contact_phone,
                notification_type: notificationType,
                is_delivered: false
            });

        throw error;
    }
}

// Helper: Send FCM push notification
async function sendFCMNotification(fcmToken, payload) {
    const axios = require('axios');

    await axios.post('https://fcm.googleapis.com/fcm/send', {
        to: fcmToken,
        priority: 'high',
        notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
            badge: 1
        },
        data: payload.data
    }, {
        headers: {
            'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
            'Content-Type': 'application/json'
        }
    });
}

// Helper: Send SMS
async function sendSMS(phoneNumber, message) {
    // Implement with your SMS provider (Africa's Talking, Termii, etc.)
    console.log(`SMS to ${phoneNumber}: ${message}`);

    // Example for Africa's Talking:
    /*
    const AfricasTalking = require('africastalking')({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME
    });
    
    const sms = AfricasTalking.SMS;
    await sms.send({
        to: [phoneNumber],
        message: message,
        from: 'SafeCircle'
    });
    */
}

// Helper: Send resolution notification
async function sendResolutionNotification(recipientUserId, userName) {
    const { data: user } = await supabase
        .from('users')
        .select('fcm_token')
        .eq('id', recipientUserId)
        .single();

    if (user?.fcm_token) {
        await sendFCMNotification(user.fcm_token, {
            title: '✅ SOS Resolved',
            body: `${userName} is now safe`,
            data: {
                type: 'sos_resolved',
                userId: recipientUserId,
                userName: userName
            }
        });
    }
}

module.exports = router;
