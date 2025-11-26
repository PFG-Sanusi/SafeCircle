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

// POST /api/families - Create new family
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Family name is required' });
        }

        // Generate unique invite code
        const inviteCode = Math.random().toString(36).substring(2, 12).toUpperCase();

        const { data: family, error } = await supabase
            .from('families')
            .insert({
                name,
                description,
                created_by: userId,
                invite_code: inviteCode
            })
            .select()
            .single();

        if (error) throw error;

        // Add creator as admin member
        await supabase
            .from('family_members')
            .insert({
                family_id: family.id,
                user_id: userId,
                role: 'admin'
            });

        res.status(201).json({ message: 'Family created successfully', family });

    } catch (error) {
        console.error('Create family error:', error);
        res.status(500).json({ error: 'Failed to create family' });
    }
});

// GET /api/families - Get user's families
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: memberships, error } = await supabase
            .from('family_members')
            .select(`
                role,
                joined_at,
                family:families(
                    id,
                    name,
                    description,
                    invite_code,
                    created_at,
                    created_by
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const families = memberships.map(m => ({
            ...m.family,
            role: m.role,
            joined_at: m.joined_at
        }));

        res.json({ families });

    } catch (error) {
        console.error('Get families error:', error);
        res.status(500).json({ error: 'Failed to get families' });
    }
});

// POST /api/families/join - Join family with invite code
router.post('/join', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        // Find family by invite code
        const { data: family, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('invite_code', inviteCode)
            .eq('is_active', true)
            .single();

        if (familyError || !family) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_id', family.id)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'You are already a member of this family' });
        }

        // Add as member
        const { error: joinError } = await supabase
            .from('family_members')
            .insert({
                family_id: family.id,
                user_id: userId,
                role: 'member'
            });

        if (joinError) throw joinError;

        res.json({ message: 'Successfully joined family', family });

    } catch (error) {
        console.error('Join family error:', error);
        res.status(500).json({ error: 'Failed to join family' });
    }
});

// GET /api/families/:familyId/members - Get family members
router.get('/:familyId/members', async (req, res) => {
    try {
        const userId = req.user.userId;
        const familyId = req.params.familyId;

        // Verify user is member
        const { data: membership } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_id', familyId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this family' });
        }

        // Get all members
        const { data: members, error } = await supabase
            .from('family_members')
            .select(`
                role,
                joined_at,
                user:users(id, full_name, phone_number, profile_picture_url)
            `)
            .eq('family_id', familyId)
            .order('joined_at');

        if (error) throw error;

        res.json({ members });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get family members' });
    }
});

// DELETE /api/families/:familyId/leave - Leave family
router.delete('/:familyId/leave', async (req, res) => {
    try {
        const userId = req.user.userId;
        const familyId = req.params.familyId;

        const { error } = await supabase
            .from('family_members')
            .delete()
            .eq('family_id', familyId)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ message: 'Left family successfully' });

    } catch (error) {
        console.error('Leave family error:', error);
        res.status(500).json({ error: 'Failed to leave family' });
    }
});

module.exports = router;
