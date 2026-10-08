-- =============================================================================
-- Task Manager Web Application - Supabase PostgreSQL Database Schema
-- Compatible with Supabase SQL Editor and standard PostgreSQL 14+
-- =============================================================================

-- 1. Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive index for fast email authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 3. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT DEFAULT '',
    due_date VARCHAR(10) NOT NULL, -- Stored as ISO date string 'YYYY-MM-DD'
    due_time VARCHAR(5) DEFAULT '23:59', -- Stored as 'HH:MM' (24-hour)
    priority VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    category VARCHAR(20) DEFAULT 'Other' CHECK (category IN ('Study', 'Work', 'Personal', 'Other')),
    status VARCHAR(15) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & query filtering
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks (category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks (created_at DESC);

-- 4. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow backend service role / API service key full access
DROP POLICY IF EXISTS "Allow service role full access on users" ON public.users;
CREATE POLICY "Allow service role full access on users" ON public.users
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access on tasks" ON public.tasks;
CREATE POLICY "Allow service role full access on tasks" ON public.tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Initial Demo Seed Data (Optional)
-- Password below is bcrypt hash for: password123
INSERT INTO public.users (id, name, email, password)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Demo Student',
    'demo@example.com',
    '$2a$10$8oO1s4ISqsodlLvtZnXbVOYjYZxtfejKNHZ3rxNYVaRoJir6p3eSu'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.tasks (id, user_id, title, description, due_date, due_time, priority, category, status, subtasks, completed_at)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Explore Supabase PostgreSQL Schema & API',
    'Review PostgreSQL tables, foreign key constraints, JSONB subtasks, and RLS policies.',
    TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
    '18:00',
    'High',
    'Study',
    'Pending',
    '[{"title": "Inspect public.users table", "completed": true}, {"title": "Verify public.tasks foreign keys", "completed": true}, {"title": "Test JSONB subtasks array", "completed": false}]'::jsonb,
    NULL
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Complete Migration from MongoDB to Supabase',
    'Verify all REST endpoints: search, filter, sorting, subtasks, and JWT authentication.',
    TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYY-MM-DD'),
    '14:30',
    'Medium',
    'Work',
    'Pending',
    '[]'::jsonb,
    NULL
)
ON CONFLICT (id) DO NOTHING;
