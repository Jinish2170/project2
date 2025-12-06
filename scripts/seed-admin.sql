-- ================================================================
-- SEED ADMIN USER FOR STUDENT PORTAL
-- ================================================================
-- This script creates an admin user in Supabase
-- 
-- INSTRUCTIONS:
-- 1. First, create a user via Supabase Auth Dashboard or using the signup API
-- 2. Copy the user's UUID from the auth.users table
-- 3. Replace 'YOUR_ADMIN_USER_ID' below with the actual UUID
-- 4. Run this script in Supabase SQL Editor
--
-- Alternatively, you can create everything at once using the manual method below
-- ================================================================

-- ===========================================
-- METHOD 1: Update existing auth user to admin
-- ===========================================
-- If you already created a user via signup, just update their profile to admin role

-- First, find the user by email
-- SELECT id, email FROM auth.users WHERE email = 'admin@yourschool.edu';

-- Then update their profile to admin role (replace the UUID):
/*
UPDATE profiles
SET 
    role = 'admin',
    full_name = 'System Administrator',
    department = 'Administration',
    updated_at = NOW()
WHERE id = 'YOUR_ADMIN_USER_ID';
*/

-- ===========================================
-- METHOD 2: Create admin using Supabase Admin API
-- ===========================================
-- Run this in your Supabase SQL Editor or via the Admin API
-- Note: You need to first create the user in auth.users

-- Create admin profile (after creating user in auth)
/*
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    department,
    created_at
) VALUES (
    'YOUR_ADMIN_USER_ID',  -- Replace with actual UUID from auth.users
    'admin@yourschool.edu',
    'System Administrator',
    'admin',
    'Administration',
    NOW()
);
*/

-- ===========================================
-- METHOD 3: Quick test admin setup
-- ===========================================
-- Use this to quickly promote an existing student/faculty to admin for testing

/*
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
*/

-- ===========================================
-- VERIFY ADMIN USER
-- ===========================================
-- Check if admin user exists
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department,
    p.created_at
FROM profiles p
WHERE p.role = 'admin';

-- ===========================================
-- SAMPLE: Create demo users for testing
-- ===========================================
-- Uncomment and modify as needed

/*
-- Create demo student (replace UUID with actual from auth.users)
INSERT INTO profiles (id, email, full_name, role, department, semester, cgpa, enrollment_number, created_at)
VALUES (
    'STUDENT_USER_UUID_HERE',
    'student@university.edu',
    'John Student',
    'student',
    'Computer Science',
    5,
    8.5,
    '2024CSE001',
    NOW()
);

-- Create demo faculty (replace UUID with actual from auth.users)
INSERT INTO profiles (id, email, full_name, role, department, created_at)
VALUES (
    'FACULTY_USER_UUID_HERE',
    'faculty@university.edu',
    'Dr. Jane Faculty',
    'faculty',
    'Computer Science',
    NOW()
);

-- Create demo admin (replace UUID with actual from auth.users)
INSERT INTO profiles (id, email, full_name, role, department, created_at)
VALUES (
    'ADMIN_USER_UUID_HERE',
    'admin@university.edu',
    'Admin User',
    'admin',
    'Administration',
    NOW()
);
*/

-- ===========================================
-- USEFUL QUERIES
-- ===========================================

-- List all users by role
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;

-- List all users
SELECT id, email, full_name, role, department, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;
