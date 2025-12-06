# Supabase Backend Setup Guide

## 🚀 Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be provisioned

### 2. Run Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and run the SQL

This will create:
- ✅ All tables (profiles, activities, skills, achievements, notifications, shareable_links)
- ✅ All ENUM types (user_role, activity_category, activity_status, notification_type)
- ✅ All indexes for performance
- ✅ All database functions for statistics
- ✅ All triggers (auto profile creation, notifications)
- ✅ All RLS policies for security

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials:
   - Go to **Project Settings > API**
   - Copy `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - Copy `anon/public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. Update `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Install Dependencies

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage expo-file-system expo-sharing expo-print
```

### 5. Switch to Real AuthContext

Replace the current AuthContext with the new Supabase-enabled version:

```bash
# Backup old context
mv context/AuthContext.tsx context/AuthContext.backup.tsx

# Use new context
mv context/AuthContextNew.tsx context/AuthContext.tsx
```

---

## 📊 Database Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (linked to auth.users) |
| `activities` | Student activities (workshops, competitions, etc.) |
| `skills` | Student skills with proficiency levels |
| `achievements` | Student achievements and awards |
| `notifications` | In-app notifications |
| `shareable_links` | Portfolio sharing links |

### User Roles

| Role | Capabilities |
|------|--------------|
| `student` | Create activities, manage skills/achievements, export portfolio |
| `faculty` | Review and approve/reject pending activities |
| `admin` | View all stats, manage users (admin only created manually) |

### Activity Flow

```
Student creates activity → status: 'pending'
        ↓
Faculty reviews
        ↓
    APPROVE → status: 'approved', points: 1-100
    REJECT → status: 'rejected', rejection_reason
        ↓
Student gets notification
```

---

## 🔐 Security (RLS Policies)

All tables have Row Level Security enabled:

- **Students** can only see/edit their own data
- **Faculty** can view all activities and approve/reject
- **Admin** can view everything

---

## 📁 File Structure

```
lib/
  └── supabase.ts          # Supabase client
types/
  └── database.ts          # TypeScript types
services/
  ├── index.ts             # Export all services
  ├── authService.ts       # Authentication
  ├── activityService.ts   # Activities CRUD
  ├── statsService.ts      # Statistics
  ├── portfolioItemsService.ts  # Skills & Achievements
  ├── userService.ts       # User management
  ├── notificationService.ts    # Notifications
  └── portfolioExportService.ts # PDF/CSV export
supabase/
  └── schema.sql           # Complete database schema
context/
  └── AuthContextNew.tsx   # Updated AuthContext with Supabase
```

---

## 🧪 Creating Admin User

Admin users cannot self-register. Create manually:

1. Create user in **Supabase Auth > Users > Add User**
2. Run this SQL to set their role:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@university.edu';
```

---

## 📱 Portfolio Export

Students can export their portfolio in two formats:

### PDF Export
- Professional formatted document
- Includes profile, activities, skills, achievements
- Beautiful styling with charts

### CSV Export
- Excel-compatible data export
- All activity details
- Easy to share/analyze

---

## 🔄 Real-time Features

Notifications are real-time using Supabase Realtime:
- Activity approved/rejected → Student notified instantly
- New pending activity → Faculty notified

---

## 🐛 Troubleshooting

### "Backend not connected"
- Check `.env` file has correct credentials
- Restart Expo development server

### RLS Policy errors
- Make sure you're authenticated
- Check user role in profiles table

### Profile not created on signup
- Verify the `handle_new_user` trigger exists
- Check for errors in Supabase logs

---

## 📞 Support

For issues with the database schema or backend setup, check:
1. Supabase Dashboard > Logs
2. Browser/App Console for error messages
