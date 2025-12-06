-- =============================================
-- STUDENT ACTIVITY PORTAL - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

-- User roles
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');

-- Activity categories
CREATE TYPE activity_category AS ENUM (
  'workshop',
  'competition', 
  'certification',
  'seminar',
  'sports',
  'cultural',
  'social_service',
  'internship',
  'other'
);

-- Activity status
CREATE TYPE activity_status AS ENUM ('pending', 'approved', 'rejected');

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'activity_approved',
  'activity_rejected',
  'new_pending',
  'achievement_earned',
  'points_milestone',
  'system_announcement',
  'deadline_reminder'
);

-- =============================================
-- TABLES
-- =============================================

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  department TEXT,
  semester INTEGER CHECK (semester >= 1 AND semester <= 8),
  cgpa DECIMAL(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
  enrollment_number TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category activity_category NOT NULL,
  activity_date DATE NOT NULL,
  location TEXT,
  proof_url TEXT NOT NULL,
  status activity_status DEFAULT 'pending' NOT NULL,
  points INTEGER DEFAULT 0 CHECK (points >= 0 AND points <= 100),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  proficiency INTEGER NOT NULL CHECK (proficiency >= 0 AND proficiency <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date_earned DATE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,
  related_id UUID,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Shareable links table (for portfolio sharing)
CREATE TABLE shareable_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  full_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES for better query performance
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department ON profiles(department);
CREATE INDEX idx_profiles_enrollment ON profiles(enrollment_number);

-- Activities indexes
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_category ON activities(category);
CREATE INDEX idx_activities_approved_by ON activities(approved_by);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_user_status ON activities(user_id, status);

-- Skills indexes
CREATE INDEX idx_skills_user_id ON skills(user_id);

-- Achievements indexes
CREATE INDEX idx_achievements_user_id ON achievements(user_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Shareable links indexes
CREATE INDEX idx_shareable_links_user_id ON shareable_links(user_id);
CREATE INDEX idx_shareable_links_short_code ON shareable_links(short_code);

-- =============================================
-- SEQUENCE for enrollment numbers
-- =============================================

CREATE SEQUENCE IF NOT EXISTS enrollment_number_seq START WITH 1001;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate enrollment number
CREATE OR REPLACE FUNCTION generate_enrollment_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  seq_part := LPAD(NEXTVAL('enrollment_number_seq')::TEXT, 4, '0');
  RETURN year_part || 'STU' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, enrollment_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student') = 'student' 
      THEN generate_enrollment_number()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to create notification on activity status change
CREATE OR REPLACE FUNCTION notify_activity_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type notification_type;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    notification_type := 'activity_approved';
    notification_title := 'Activity Approved! 🎉';
    notification_message := 'Your activity "' || NEW.title || '" has been approved. You earned ' || NEW.points || ' points!';
  ELSIF NEW.status = 'rejected' THEN
    notification_type := 'activity_rejected';
    notification_title := 'Activity Needs Revision';
    notification_message := 'Your activity "' || NEW.title || '" was not approved. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, related_id, icon)
  VALUES (
    NEW.user_id,
    notification_type,
    notification_title,
    notification_message,
    NEW.id,
    CASE 
      WHEN NEW.status = 'approved' THEN 'check-circle'
      ELSE 'x-circle'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for activity status change notification
CREATE TRIGGER on_activity_status_change
  AFTER UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_status_change();

-- Function to notify faculty of new pending activity
CREATE OR REPLACE FUNCTION notify_new_pending_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all faculty members about new pending activity
  INSERT INTO notifications (user_id, type, title, message, related_id, icon)
  SELECT 
    p.id,
    'new_pending'::notification_type,
    'New Activity Pending Review',
    'A new activity "' || NEW.title || '" is waiting for your review.',
    NEW.id,
    'clock'
  FROM profiles p
  WHERE p.role = 'faculty';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new pending activity notification
CREATE TRIGGER on_new_activity_created
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_pending_activity();

-- =============================================
-- STATISTICAL FUNCTIONS
-- =============================================

-- Get student statistics
CREATE OR REPLACE FUNCTION get_student_stats(student_id UUID)
RETURNS TABLE (
  total_activities BIGINT,
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  total_points BIGINT,
  certificates_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activities,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_count,
    COALESCE(SUM(points) FILTER (WHERE status = 'approved'), 0)::BIGINT as total_points,
    COUNT(*) FILTER (WHERE status = 'approved' AND category = 'certification')::BIGINT as certificates_count
  FROM activities
  WHERE user_id = student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get faculty statistics
CREATE OR REPLACE FUNCTION get_faculty_stats(faculty_id UUID)
RETURNS TABLE (
  pending_count BIGINT,
  approved_today BIGINT,
  rejected_today BIGINT,
  total_reviewed BIGINT,
  total_approved BIGINT,
  total_rejected BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM activities WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE approved_by = faculty_id AND status = 'approved' AND DATE(approved_at) = CURRENT_DATE)::BIGINT as approved_today,
    COUNT(*) FILTER (WHERE approved_by = faculty_id AND status = 'rejected' AND DATE(approved_at) = CURRENT_DATE)::BIGINT as rejected_today,
    COUNT(*) FILTER (WHERE approved_by = faculty_id)::BIGINT as total_reviewed,
    COUNT(*) FILTER (WHERE approved_by = faculty_id AND status = 'approved')::BIGINT as total_approved,
    COUNT(*) FILTER (WHERE approved_by = faculty_id AND status = 'rejected')::BIGINT as total_rejected
  FROM activities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_students BIGINT,
  total_faculty BIGINT,
  total_activities BIGINT,
  activities_pending BIGINT,
  activities_approved BIGINT,
  activities_rejected BIGINT,
  total_points_awarded BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE role = 'student')::BIGINT as total_students,
    (SELECT COUNT(*) FROM profiles WHERE role = 'faculty')::BIGINT as total_faculty,
    (SELECT COUNT(*) FROM activities)::BIGINT as total_activities,
    (SELECT COUNT(*) FROM activities WHERE status = 'pending')::BIGINT as activities_pending,
    (SELECT COUNT(*) FROM activities WHERE status = 'approved')::BIGINT as activities_approved,
    (SELECT COUNT(*) FROM activities WHERE status = 'rejected')::BIGINT as activities_rejected,
    (SELECT COALESCE(SUM(points), 0) FROM activities WHERE status = 'approved')::BIGINT as total_points_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get activities count by category
CREATE OR REPLACE FUNCTION get_activities_by_category()
RETURNS TABLE (
  category activity_category,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.category,
    COUNT(*)::BIGINT as count
  FROM activities a
  WHERE a.status = 'approved'
  GROUP BY a.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top students by points
CREATE OR REPLACE FUNCTION get_top_students(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  department TEXT,
  total_points BIGINT,
  activity_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.department,
    COALESCE(SUM(a.points), 0)::BIGINT as total_points,
    COUNT(a.id) FILTER (WHERE a.status = 'approved')::BIGINT as activity_count
  FROM profiles p
  LEFT JOIN activities a ON a.user_id = p.id AND a.status = 'approved'
  WHERE p.role = 'student'
  GROUP BY p.id, p.full_name, p.department
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get complete portfolio data for a student (for PDF/CSV export)
CREATE OR REPLACE FUNCTION get_portfolio_data(student_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(p.*)
      FROM profiles p
      WHERE p.id = student_id
    ),
    'activities', (
      SELECT COALESCE(json_agg(row_to_json(a.*) ORDER BY a.activity_date DESC), '[]'::json)
      FROM activities a
      WHERE a.user_id = student_id AND a.status = 'approved'
    ),
    'skills', (
      SELECT COALESCE(json_agg(row_to_json(s.*) ORDER BY s.proficiency DESC), '[]'::json)
      FROM skills s
      WHERE s.user_id = student_id
    ),
    'achievements', (
      SELECT COALESCE(json_agg(row_to_json(ach.*) ORDER BY ach.date_earned DESC), '[]'::json)
      FROM achievements ach
      WHERE ach.user_id = student_id
    ),
    'stats', (
      SELECT json_build_object(
        'total_activities', COUNT(*) FILTER (WHERE status = 'approved'),
        'total_points', COALESCE(SUM(points) FILTER (WHERE status = 'approved'), 0),
        'certificates_count', COUNT(*) FILTER (WHERE status = 'approved' AND category = 'certification')
      )
      FROM activities
      WHERE user_id = student_id
    ),
    'category_breakdown', (
      SELECT COALESCE(json_object_agg(category, cnt), '{}'::json)
      FROM (
        SELECT category, COUNT(*) as cnt
        FROM activities
        WHERE user_id = student_id AND status = 'approved'
        GROUP BY category
      ) cat_counts
    ),
    'generated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareable_links ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Students can only view their own profile
CREATE POLICY "Students can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('faculty', 'admin')
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================
-- ACTIVITIES POLICIES
-- =============================================

-- Students see only their activities, Faculty and Admin see all
CREATE POLICY "View activities based on role"
  ON activities FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('faculty', 'admin')
  );

-- Only students can insert their own activities
CREATE POLICY "Students can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Students can update their own pending activities
-- Faculty can update any activity (for approval)
CREATE POLICY "Update activities based on role"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending') OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'faculty'
  )
  WITH CHECK (
    (user_id = auth.uid() AND status = 'pending') OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'faculty'
  );

-- Students can delete their own pending activities
CREATE POLICY "Students can delete pending activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() AND 
    status = 'pending' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- =============================================
-- SKILLS POLICIES
-- =============================================

-- Students see own skills, Faculty/Admin can view all
CREATE POLICY "View skills based on role"
  ON skills FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('faculty', 'admin')
  );

-- Only students can manage their own skills
CREATE POLICY "Students can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

CREATE POLICY "Students can update own skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can delete own skills"
  ON skills FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- ACHIEVEMENTS POLICIES
-- =============================================

-- Students see own achievements, Faculty/Admin can view all
CREATE POLICY "View achievements based on role"
  ON achievements FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('faculty', 'admin')
  );

-- Only students can manage their own achievements
CREATE POLICY "Students can insert achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

CREATE POLICY "Students can update own achievements"
  ON achievements FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can delete own achievements"
  ON achievements FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can only see their own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- SHAREABLE LINKS POLICIES
-- =============================================

-- Users can view their own shareable links
CREATE POLICY "Users view own shareable links"
  ON shareable_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create shareable links for their profile
CREATE POLICY "Users create own shareable links"
  ON shareable_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own shareable links
CREATE POLICY "Users update own shareable links"
  ON shareable_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own shareable links
CREATE POLICY "Users delete own shareable links"
  ON shareable_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Public access to shareable links by short_code (for portfolio viewing)
CREATE POLICY "Public view shareable links by code"
  ON shareable_links FOR SELECT
  TO anon
  USING (is_public = true AND (expires_at IS NULL OR expires_at > NOW()));

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================

-- Uncomment and run this section if you want test data

/*
-- Insert a test admin user (you need to create this user in Auth first)
-- INSERT INTO profiles (id, email, full_name, role, department)
-- VALUES ('your-admin-uuid', 'admin@university.edu', 'System Admin', 'admin', 'Administration');

-- Insert test categories data comment
-- Categories available: workshop, competition, certification, seminar, sports, cultural, social_service, internship, other
*/

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE enrollment_number_seq TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_student_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_faculty_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_activities_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_students TO authenticated;
GRANT EXECUTE ON FUNCTION get_portfolio_data TO authenticated;
