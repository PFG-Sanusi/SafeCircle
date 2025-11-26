const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { phoneNumber, email, fullName, password } = req.body;

        // Validation
        if (!phoneNumber || !fullName || !password) {
            return res.status(400).json({
                error: 'Phone number, full name, and password are required'
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

        if (existingUser) {
            return res.status(409).json({
                error: 'User with this phone number already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                phone_number: phoneNumber,
                email,
                full_name: fullName,
                password_hash: hashedPassword
            })
            .select('id, phone_number, email, full_name, created_at')
            .single();

        if (error) throw error;

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({
                error: 'Phone number and password are required'
            });
        }

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', phoneNumber)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate token
        const token = generateToken(user.id);

        // Remove password from response
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            user,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// POST /api/auth/update-fcm-token - Update Firebase Cloud Messaging token
router.post('/update-fcm-token', authenticateToken, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.userId;

        if (!fcmToken) {
            return res.status(400).json({ error: 'FCM token is required' });
        }

        const { error } = await supabase
            .from('users')
            .update({ fcm_token: fcmToken })
            .eq('id', userId);

        if (error) throw error;

        res.json({ message: 'FCM token updated successfully' });

    } catch (error) {
        console.error('FCM token update error:', error);
        res.status(500).json({ error: 'Failed to update FCM token' });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, phone_number, email, full_name, profile_picture_url, is_active, created_at')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// POST /api/auth/logout - Logout user (clear FCM token)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Clear FCM token
        await supabase
            .from('users')
            .update({ fcm_token: null })
            .eq('id', userId);

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

module.exports = router;
