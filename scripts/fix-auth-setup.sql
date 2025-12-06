-- ================================================================
-- SUPABASE AUTH SETUP - FIX 500 ERROR ON SIGNUP
-- ================================================================
-- Run these commands in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query
-- ================================================================

-- ===========================================
-- STEP 1: Check if profiles table exists
-- ===========================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_table_exists;

-- ===========================================
-- STEP 2: Create profiles table if it doesn't exist
-- ===========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
    enrollment_number TEXT,
    department TEXT,
    semester INTEGER,
    cgpa DECIMAL(3,2),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ===========================================
-- STEP 3: Enable Row Level Security
-- ===========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- STEP 4: Create RLS Policies for profiles
-- ===========================================
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;

-- Simple policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Simple policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow insert during signup (trigger runs as SECURITY DEFINER, but this helps)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- For admin access: Use JWT claim instead of querying profiles table
-- This avoids infinite recursion!
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
    auth.uid() = id 
    OR 
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
    auth.uid() = id 
    OR 
    (auth.jwt() ->> 'role')::text = 'admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- ===========================================
-- STEP 5: Create or replace the trigger function
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, ignore
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail signup
        RAISE WARNING 'Error creating profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- STEP 6: Create or replace the trigger
-- ===========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- STEP 7: Grant necessary permissions
-- ===========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- ===========================================
-- STEP 8: Verify the setup
-- ===========================================
-- Check trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check policies exist
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- ===========================================
-- IMPORTANT: SUPABASE DASHBOARD SETTINGS
-- ===========================================
-- 1. Go to Authentication > Settings
-- 2. Under "Email Auth", make sure:
--    - Enable Email Signup: ON
--    - Confirm email: OFF (for testing) or configure SMTP
--    - Double confirm email changes: OFF (for testing)
--
-- 3. Under "Security":
--    - Enable RLS on all tables
--
-- If email confirmation is ON but SMTP is not configured,
-- signups will fail with 500 error!
-- ===========================================

COMMIT;
