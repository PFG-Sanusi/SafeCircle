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

// GET /api/locations/nearby - Get nearby users within radius
router.get('/nearby', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { radius = 5000 } = req.query; // Default 5km

        // Get current user's location
        const { data: myLocation } = await supabase
            .from('user_locations')
            .select('latitude, longitude')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        if (!myLocation) {
            return res.status(404).json({ error: 'Your location not found' });
        }

        // Find users within radius using PostGIS
        const { data: nearbyUsers, error } = await supabase.rpc('find_nearby_users', {
            user_lat: myLocation.latitude,
            user_lon: myLocation.longitude,
            radius_meters: parseInt(radius)
        });

        if (error) throw error;

        res.json({ nearbyUsers });

    } catch (error) {
        console.error('Nearby users error:', error);
        res.status(500).json({ error: 'Failed to find nearby users' });
    }
});

// GET /api/locations/user/:userId - Get specific user's latest location
router.get('/user/:userId', async (req, res) => {
    try {
        const requesterId = req.user.userId;
        const targetUserId = req.params.userId;

        // Check if requester has permission to view this user's location
        const hasPermission = await checkLocationPermission(requesterId, targetUserId);

        if (!hasPermission) {
            return res.status(403).json({
                error: 'You do not have permission to view this user\'s location'
            });
        }

        // Get latest location
        const { data: location, error } = await supabase
            .from('user_locations')
            .select(`
                latitude,
                longitude,
                accuracy,
                altitude,
                speed,
                heading,
                timestamp,
                user:users(id, full_name, profile_picture_url)
            `)
            .eq('user_id', targetUserId)
            .eq('is_sharing', true)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        if (error || !location) {
            return res.status(404).json({ error: 'Location not found' });
        }

        res.json({ location });

    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
});

// GET /api/locations/family/:familyId - Get all family members' locations
router.get('/family/:familyId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const familyId = req.params.familyId;

        // Verify user is member of this family
        const { data: membership } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_id', familyId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this family' });
        }

        // Get all family members' latest locations
        const { data: locations, error } = await supabase
            .from('family_members')
            .select(`
                user_id,
                users!inner(id, full_name, profile_picture_url),
                user_locations!inner(latitude, longitude, accuracy, timestamp)
            `)
            .eq('family_id', familyId)
            .order('user_locations.timestamp', { ascending: false });

        if (error) throw error;

        // Group by user and get latest location for each
        const latestLocations = {};
        locations.forEach(loc => {
            if (!latestLocations[loc.user_id]) {
                latestLocations[loc.user_id] = {
                    user: loc.users,
                    location: loc.user_locations
                };
            }
        });

        res.json({
            familyId,
            locations: Object.values(latestLocations)
        });

    } catch (error) {
        console.error('Get family locations error:', error);
        res.status(500).json({ error: 'Failed to get family locations' });
    }
});

// GET /api/locations/connections - Get all connected users' locations
router.get('/connections', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get accepted connections
        const { data: connections, error } = await supabase
            .from('user_connections')
            .select(`
                addressee:users!user_connections_addressee_id_fkey(id, full_name, profile_picture_url),
                requester:users!user_connections_requester_id_fkey(id, full_name, profile_picture_url)
            `)
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) throw error;

        // Extract connected user IDs
        const connectedUserIds = connections.map(conn => {
            return conn.addressee?.id === userId ? conn.requester?.id : conn.addressee?.id;
        }).filter(Boolean);

        // Get their latest locations
        const locationPromises = connectedUserIds.map(async (connectedUserId) => {
            const { data } = await supabase
                .from('user_locations')
                .select(`
                    latitude,
                    longitude,
                    accuracy,
                    timestamp,
                    user:users(id, full_name, profile_picture_url)
                `)
                .eq('user_id', connectedUserId)
                .eq('is_sharing', true)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            return data;
        });

        const locations = (await Promise.all(locationPromises)).filter(Boolean);

        res.json({ locations });

    } catch (error) {
        console.error('Get connections locations error:', error);
        res.status(500).json({ error: 'Failed to get connections locations' });
    }
});

// POST /api/locations/toggle-sharing - Enable/disable location sharing
router.post('/toggle-sharing', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { isSharing } = req.body;

        if (typeof isSharing !== 'boolean') {
            return res.status(400).json({ error: 'isSharing must be a boolean' });
        }

        // Update all user's location records
        const { error } = await supabase
            .from('user_locations')
            .update({ is_sharing: isSharing })
            .eq('user_id', userId);

        if (error) throw error;

        res.json({
            message: `Location sharing ${isSharing ? 'enabled' : 'disabled'}`,
            isSharing
        });

    } catch (error) {
        console.error('Toggle sharing error:', error);
        res.status(500).json({ error: 'Failed to toggle location sharing' });
    }
});

// GET /api/locations/history - Get location history
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate, limit = 100 } = req.query;

        let query = supabase
            .from('user_locations')
            .select('latitude, longitude, accuracy, timestamp')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(parseInt(limit));

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }
        if (endDate) {
            query = query.lte('timestamp', endDate);
        }

        const { data: history, error } = await query;

        if (error) throw error;

        res.json({ history });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get location history' });
    }
});

// Helper function: Check if user has permission to view location
async function checkLocationPermission(requesterId, targetUserId) {
    if (requesterId === targetUserId) return true;

    // Check direct connection
    const { data: connection } = await supabase
        .from('user_connections')
        .select('id')
        .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${requesterId})`)
        .eq('status', 'accepted')
        .single();

    if (connection) return true;

    // Check if in same family
    const { data: sharedFamily } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', requesterId)
        .in('family_id',
            supabase
                .from('family_members')
                .select('family_id')
                .eq('user_id', targetUserId)
        );

    if (sharedFamily && sharedFamily.length > 0) return true;

    // Check explicit permission
    const { data: permission } = await supabase
        .from('location_permissions')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('shared_with_user_id', requesterId)
        .eq('is_enabled', true)
        .single();

    return !!permission;
}

module.exports = router;
