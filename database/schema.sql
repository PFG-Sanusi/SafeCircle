-- SafeCircle Database Schema with PostGIS
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- Added for authentication
    profile_picture_url TEXT,
    fcm_token TEXT, -- For push notifications
    last_login TIMESTAMP WITH TIME ZONE,  -- Added for tracking last login
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User locations (real-time tracking with PostGIS)
CREATE TABLE user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS geography type
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- GPS accuracy in meters
    altitude DECIMAL(10, 2),
    speed DECIMAL(10, 2), -- Speed in m/s
    heading DECIMAL(5, 2), -- Direction in degrees
    is_sharing BOOLEAN DEFAULT true,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for spatial queries (find nearby users)
CREATE INDEX idx_user_locations_geography ON user_locations USING GIST(location);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_timestamp ON user_locations("timestamp" DESC);

-- Families/Groups
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invite_code VARCHAR(10) UNIQUE NOT NULL, -- For joining families
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family members
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- User connections (individual user-to-user relationships)
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_user_connections_requester ON user_connections(requester_id);
CREATE INDEX idx_user_connections_addressee ON user_connections(addressee_id);

-- Emergency contacts (SOS recipients)
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- If contact is app user
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    priority INTEGER DEFAULT 1, -- Order of notification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (user_id != contact_user_id)
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- SOS alerts (emergency history)
CREATE TABLE sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'false_alarm'
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_alerts_geography ON sos_alerts USING GIST(location);
CREATE INDEX idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_sos_alerts_created ON sos_alerts(created_at DESC);

-- SOS notifications (who was notified)
CREATE TABLE sos_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_alert_id UUID REFERENCES sos_alerts(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(255),
    notification_type VARCHAR(20), -- 'push', 'sms', 'email'
    is_delivered BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_notifications_alert ON sos_notifications(sos_alert_id);
CREATE INDEX idx_sos_notifications_recipient ON sos_notifications(recipient_user_id);

-- Location sharing permissions
CREATE TABLE location_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional temporary sharing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_family_id IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_family_id IS NOT NULL)
    ),
    CHECK (user_id != shared_with_user_id)
);

CREATE INDEX idx_location_permissions_user ON location_permissions(user_id);
CREATE INDEX idx_location_permissions_shared_user ON location_permissions(shared_with_user_id);
CREATE INDEX idx_location_permissions_shared_family ON location_permissions(shared_with_family_id);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- 'sos', 'connection_request', 'family_invite', etc.
    data JSONB, -- Additional data
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_connections_updated_at BEFORE UPDATE ON user_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_permissions_updated_at BEFORE UPDATE ON location_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PostGIS Function: Find nearby users
CREATE OR REPLACE FUNCTION find_nearby_users(
    user_lat DECIMAL,
    user_lon DECIMAL,
    radius_meters INTEGER
)
RETURNS TABLE (
    user_id UUID,
    full_name VARCHAR,
    distance_meters DOUBLE PRECISION,
    latitude DECIMAL,
    longitude DECIMAL,
    "timestamp" TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ul.user_id)
        u.id as user_id,
        u.full_name,
        ST_Distance(
            ul.location,
            ST_MakePoint(user_lon, user_lat)::geography
        ) as distance_meters,
        ul.latitude,
        ul.longitude,
        ul."timestamp"
    FROM user_locations ul
    JOIN users u ON u.id = ul.user_id
    WHERE 
        ul.is_sharing = true
        AND ST_DWithin(
            ul.location,
            ST_MakePoint(user_lon, user_lat)::geography,
            radius_meters
        )
        AND ul."timestamp" > NOW() - INTERVAL '1 hour'  -- Only recent locations
    ORDER BY ul.user_id, ul."timestamp" DESC;
END;
$$ LANGUAGE plpgsql;

-- Useful PostGIS queries (examples)

-- Find users within 5km of a point:
-- SELECT * FROM find_nearby_users(6.5244, 3.3792, 5000);

-- Calculate distance between two users:
-- SELECT ST_Distance(
--     (SELECT location FROM user_locations WHERE user_id = 'user1_id' ORDER BY timestamp DESC LIMIT 1),
--     (SELECT location FROM user_locations WHERE user_id = 'user2_id' ORDER BY timestamp DESC LIMIT 1)
-- ) as distance_meters;

-- Get all active SOS alerts with location:
-- SELECT 
--     sa.*,
--     u.full_name,
--     ST_AsText(sa.location) as location_text
-- FROM sos_alerts sa
-- JOIN users u ON u.id = sa.user_id
-- WHERE sa.status = 'active'
-- ORDER BY sa.created_at DESC;
