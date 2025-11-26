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

// POST /api/emergency-contacts - Add emergency contact
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { contactName, contactPhone, contactEmail, contactUserId, priority } = req.body;

        if (!contactName || !contactPhone) {
            return res.status(400).json({ error: 'Contact name and phone are required' });
        }

        if (contactUserId && contactUserId === userId) {
            return res.status(400).json({ error: 'Cannot add yourself as emergency contact' });
        }

        const { data: contact, error } = await supabase
            .from('emergency_contacts')
            .insert({
                user_id: userId,
                contact_user_id: contactUserId || null,
                contact_name: contactName,
                contact_phone: contactPhone,
                contact_email: contactEmail || null,
                priority: priority || 1
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Emergency contact added',
            contact
        });

    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ error: 'Failed to add emergency contact' });
    }
});

// GET /api/emergency-contacts - Get user's emergency contacts
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: contacts, error } = await supabase
            .from('emergency_contacts')
            .select(`
                id,
                contact_name,
                contact_phone,
                contact_email,
                priority,
                created_at,
                contact_user:users(id, full_name, profile_picture_url)
            `)
            .eq('user_id', userId)
            .order('priority');

        if (error) throw error;

        res.json({ contacts });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Failed to get emergency contacts' });
    }
});

// PUT /api/emergency-contacts/:contactId - Update emergency contact
router.put('/:contactId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const contactId = req.params.contactId;
        const { contactName, contactPhone, contactEmail, priority } = req.body;

        // Verify contact belongs to user
        const { data: existing } = await supabase
            .from('emergency_contacts')
            .select('user_id')
            .eq('id', contactId)
            .single();

        if (!existing || existing.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to update this contact' });
        }

        const updates = {};
        if (contactName) updates.contact_name = contactName;
        if (contactPhone) updates.contact_phone = contactPhone;
        if (contactEmail !== undefined) updates.contact_email = contactEmail;
        if (priority !== undefined) updates.priority = priority;

        const { data: contact, error } = await supabase
            .from('emergency_contacts')
            .update(updates)
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'Emergency contact updated',
            contact
        });

    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ error: 'Failed to update emergency contact' });
    }
});

// DELETE /api/emergency-contacts/:contactId - Delete emergency contact
router.delete('/:contactId', async (req, res) => {
    try {
        const userId = req.user.userId;
        const contactId = req.params.contactId;

        // Verify contact belongs to user
        const { data: existing } = await supabase
            .from('emergency_contacts')
            .select('user_id')
            .eq('id', contactId)
            .single();

        if (!existing || existing.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to delete this contact' });
        }

        const { error } = await supabase
            .from('emergency_contacts')
            .delete()
            .eq('id', contactId);

        if (error) throw error;

        res.json({ message: 'Emergency contact deleted' });

    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ error: 'Failed to delete emergency contact' });
    }
});

module.exports = router;
