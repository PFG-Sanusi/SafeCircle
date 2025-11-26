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

// POST /api/connections/request - Send connection request
router.post('/request', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { addresseeId } = req.body;

        if (!addresseeId) {
            return res.status(400).json({ error: 'Addressee user ID is required' });
        }

        if (userId === addresseeId) {
            return res.status(400).json({ error: 'Cannot connect with yourself' });
        }

        // Check if connection already exists
        const { data: existing } = await supabase
            .from('user_connections')
            .select('id, status')
            .or(`and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`)
            .single();

        if (existing) {
            return res.status(409).json({
                error: `Connection already exists with status: ${existing.status}`
            });
        }

        // Create connection request
        const { data: connection, error } = await supabase
            .from('user_connections')
            .insert({
                requester_id: userId,
                addressee_id: addresseeId,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Connection request sent',
            connection
        });

    } catch (error) {
        console.error('Send request error:', error);
        res.status(500).json({ error: 'Failed to send connection request' });
    }
});

// GET /api/connections - Get user's connections
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status = 'accepted' } = req.query;

        const { data: connections, error } = await supabase
            .from('user_connections')
            .select(`
                id,
                status,
                created_at,
                requester:users!user_connections_requester_id_fkey(id, full_name, phone_number, profile_picture_url),
                addressee:users!user_connections_addressee_id_fkey(id, full_name, phone_number, profile_picture_url)
            `)
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format connections
        const formattedConnections = connections.map(conn => {
            const isRequester = conn.requester.id === userId;
            return {
                id: conn.id,
                status: conn.status,
                created_at: conn.created_at,
                user: isRequester ? conn.addressee : conn.requester,
                direction: isRequester ? 'outgoing' : 'incoming'
            };
        });

        res.json({ connections: formattedConnections });

    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ error: 'Failed to get connections' });
    }
});

// GET /api/connections/pending - Get pending connection requests
router.get('/pending', async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: connections, error } = await supabase
            .from('user_connections')
            .select(`
                id,
                created_at,
                requester:users!user_connections_requester_id_fkey(id, full_name, phone_number, profile_picture_url)
            `)
            .eq('addressee_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ requests: connections });

    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ error: 'Failed to get pending requests' });
    }
});

// PUT /api/connections/:connectionId/accept - Accept connection request
router.put('/:connectionId/accept', async (req, res) => {
    try {
        const userId = req.user.userId;
        const connectionId = req.params.connectionId;

        // Verify user is addressee
        const { data: connection } = await supabase
            .from('user_connections')
            .select('addressee_id, status')
            .eq('id', connectionId)
            .single();

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        if (connection.addressee_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to accept this request' });
        }

        if (connection.status !== 'pending') {
            return res.status(400).json({ error: 'Connection is not pending' });
        }

        // Accept connection
        const { error } = await supabase
            .from('user_connections')
            .update({ status: 'accepted' })
            .eq('id', connectionId);

        if (error) throw error;

        res.json({ message: 'Connection accepted' });

    } catch (error) {
        console.error('Accept connection error:', error);
        res.status(500).json({ error: 'Failed to accept connection' });
    }
});

// DELETE /api/connections/:connectionId - Reject or remove connection
router.delete('/:connectionId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const connectionId = req.params.connectionId;

        // Verify user is part of connection
        const { data: connection } = await supabase
            .from('user_connections')
            .select('requester_id, addressee_id')
            .eq('id', connectionId)
            .single();

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        if (connection.requester_id !== userId && connection.addressee_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this connection' });
        }

        // Delete connection
        const { error } = await supabase
            .from('user_connections')
            .delete()
            .eq('id', connectionId);

        if (error) throw error;

        res.json({ message: 'Connection removed' });

    } catch (error) {
        console.error('Delete connection error:', error);
        res.status(500).json({ error: 'Failed to delete connection' });
    }
});

module.exports = router;
