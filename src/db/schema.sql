-- ====================================================================
-- ZOLVE PLATFORM - POSTGRESQL / SUPABASE DATABASE SCHEMA
-- "Trusted Services. Stronger Communities."
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin', 'society_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE booking_status AS ENUM (
    'PAYMENT_PENDING',
    'CONFIRMED',
    'PROVIDER_ASSIGNED',
    'PROVIDER_ACCEPTED',
    'PROVIDER_ON_THE_WAY',
    'SERVICE_STARTED',
    'SERVICE_COMPLETED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED',
    'DISPUTED'
);
CREATE TYPE payment_status AS ENUM (
    'CREATED',
    'PENDING',
    'AUTHORIZED',
    'CAPTURED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);
CREATE TYPE coop_membership_status AS ENUM ('non_member', 'applicant', 'active_member', 'honorary_member');
CREATE TYPE proposal_status AS ENUM ('draft', 'active', 'passed', 'rejected', 'executed');
CREATE TYPE vote_choice AS ENUM ('YES', 'NO', 'ABSTAIN');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- 3. USERS TABLE (Integrated with Supabase auth.users or standalone)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Supabase Auth User ID link
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    avatar TEXT,
    location VARCHAR(255) DEFAULT 'Indiranagar, Bengaluru',
    address TEXT,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SERVICE CATEGORIES & SERVICES
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL, -- Household, Personal, Community
    subcategory VARCHAR(100) NOT NULL, -- Plumbing, Electrical, Cleaning, etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL,
    price_unit VARCHAR(50) DEFAULT 'per service',
    estimated_time VARCHAR(50) DEFAULT '1-2 hours',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SERVICE PROVIDERS TABLE
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years INT NOT NULL DEFAULT 1,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    rating_count INT NOT NULL DEFAULT 0,
    completed_jobs INT NOT NULL DEFAULT 0,
    service_area VARCHAR(255) DEFAULT 'Bengaluru Central & East',
    availability VARCHAR(100) DEFAULT 'Monday - Saturday (8:00 AM - 7:00 PM)',
    identity_verified BOOLEAN DEFAULT FALSE,
    skill_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT TRUE,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    kyc_document_url TEXT,
    kyc_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PROVIDER-SERVICES JUNCTION
CREATE TABLE provider_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_price NUMERIC(10, 2),
    UNIQUE(provider_id, service_id)
);

-- 7. COOPERATIVE MEMBERSHIP
CREATE TABLE cooperative_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
    membership_status coop_membership_status NOT NULL DEFAULT 'active_member',
    patronage_dividend_points NUMERIC(10, 2) DEFAULT 0,
    training_programs_completed INT DEFAULT 0,
    governance_participation_rate NUMERIC(5, 2) DEFAULT 100.0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. ZOL-8291
    customer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID REFERENCES providers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    address TEXT NOT NULL,
    coordinates POINT,
    service_instructions TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(50) NOT NULL,
    base_amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 80.00,
    coop_reserve_fee NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
    taxes NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    provider_earnings NUMERIC(10, 2) NOT NULL,
    booking_status booking_status NOT NULL DEFAULT 'PAYMENT_PENDING',
    payment_status payment_status NOT NULL DEFAULT 'CREATED',
    cancelled_reason TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENTS TABLE (Razorpay Secure Transaction Ledger)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50) DEFAULT 'razorpay_upi_card',
    status payment_status NOT NULL DEFAULT 'CREATED',
    webhook_verified BOOLEAN DEFAULT FALSE,
    refund_id VARCHAR(100),
    refund_amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REVIEWS TABLE (Multi-criteria evaluation for completed bookings)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
    customer_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    quality_rating INT NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
    professionalism_rating INT NOT NULL CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    punctuality_rating INT NOT NULL CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    communication_rating INT NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. COOPERATIVE GOVERNANCE & PROPOSALS
CREATE TABLE cooperative_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- Welfare, Equipment, Policy, Safety
    status proposal_status NOT NULL DEFAULT 'active',
    creator_id UUID REFERENCES users(id),
    voting_deadline TIMESTAMPTZ NOT NULL,
    quorum_required INT NOT NULL DEFAULT 50,
    yes_votes INT NOT NULL DEFAULT 0,
    no_votes INT NOT NULL DEFAULT 0,
    abstain_votes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cooperative_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES cooperative_proposals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES cooperative_members(id) ON DELETE CASCADE,
    vote vote_choice NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, member_id)
);

-- 12. SUPPORT & DISPUTES TICKETS
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    category VARCHAR(100) NOT NULL, -- 'No Show', 'Damage', 'Overcharge', 'Safety'
    description TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    assigned_admin_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'booking', 'payment', 'coop', 'system'
    read_status BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. HOUSING SOCIETY / COMMUNITY REQUESTS
CREATE TABLE society_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_name VARCHAR(255) NOT NULL,
    manager_id UUID REFERENCES users(id),
    service_type VARCHAR(100) NOT NULL,
    unit_or_block VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal', -- Normal, High, Emergency
    status VARCHAR(50) DEFAULT 'PENDING',
    scheduled_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own bookings
CREATE POLICY customer_bookings_policy ON bookings
    FOR ALL
    USING (customer_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Providers can view bookings assigned to them
CREATE POLICY provider_bookings_policy ON bookings
    FOR ALL
    USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid()) OR auth.jwt() ->> 'role' = 'admin');

-- Payment records accessible only to corresponding user or admin
CREATE POLICY payment_isolation_policy ON payments
    FOR SELECT
    USING (customer_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- 16. TRIGGERS FOR UPDATING TIMESTAMPS
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_bookings_timestamp BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_payments_timestamp BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
