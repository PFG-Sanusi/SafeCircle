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

// GET /api/users/profile - Get user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, phone_number, email, full_name, profile_picture_url, is_active, created_at')
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, email, profilePictureUrl } = req.body;

        const updates = {};
        if (fullName) updates.full_name = fullName;
        if (email) updates.email = email;
        if (profilePictureUrl) updates.profile_picture_url = profilePictureUrl;

        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Profile updated successfully', user });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/users/search - Search users by phone or name
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 3) {
            return res.status(400).json({ error: 'Query must be at least 3 characters' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('id, full_name, phone_number, profile_picture_url')
            .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
            .eq('is_active', true)
            .limit(20);

        if (error) throw error;

        res.json({ users });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

module.exports = router;
