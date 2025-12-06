import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, Activity, Skill, Achievement, Notification, PortfolioData, ShareableLink } from '@/types/database';
import * as authService from '@/services/authService';
import * as activityService from '@/services/activityService';
import * as statsService from '@/services/statsService';
import * as portfolioItemsService from '@/services/portfolioItemsService';
import * as notificationService from '@/services/notificationService';
import * as portfolioExportService from '@/services/portfolioExportService';

// Types
export type UserRole = 'student' | 'faculty' | 'admin';

export interface StudentStats {
  total_activities: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_points: number;
  certificates_count: number;
}

export interface FacultyStats {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  total_reviewed: number;
  total_approved: number;
  total_rejected: number;
}

export interface AdminStats {
  total_students: number;
  total_faculty: number;
  total_activities: number;
  activities_pending: number;
  activities_approved: number;
  activities_rejected: number;
  total_points_awarded: number;
  activities_by_category: Array<{ category: string; count: number }>;
  top_students: Array<{ id: string; full_name: string; department: string; total_points: number; activity_count: number }>;
}

interface AuthContextType {
  // Auth State
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Auth Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, role: 'student' | 'faculty') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  
  // Activities
  activities: Activity[];
  activitiesLoading: boolean;
  fetchActivities: () => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'user_id' | 'status' | 'points' | 'created_at' | 'approved_by' | 'approved_at' | 'rejection_reason'>) => Promise<{ success: boolean; error?: string }>;
  deleteActivity: (activityId: string) => Promise<{ success: boolean; error?: string }>;
  approveActivity: (activityId: string, points: number) => Promise<{ success: boolean; error?: string }>;
  rejectActivity: (activityId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  
  // Skills & Achievements
  skills: Skill[];
  achievements: Achievement[];
  skillsLoading: boolean;
  fetchSkills: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  addSkill: (skill: Omit<Skill, 'id' | 'user_id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateSkill: (skillId: string, data: Partial<Skill>) => Promise<{ success: boolean; error?: string }>;
  deleteSkill: (skillId: string) => Promise<{ success: boolean; error?: string }>;
  addAchievement: (achievement: Omit<Achievement, 'id' | 'user_id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  deleteAchievement: (achievementId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Stats
  studentStats: StudentStats;
  facultyStats: FacultyStats;
  adminStats: AdminStats;
  statsLoading: boolean;
  fetchStudentStats: () => Promise<void>;
  fetchFacultyStats: () => Promise<void>;
  fetchAdminStats: () => Promise<void>;
  
  // Pending activities (for faculty)
  pendingActivities: (Activity & { student?: any })[];
  pendingLoading: boolean;
  fetchPendingActivities: () => Promise<void>;
  
  // Faculty review history
  facultyHistory: Activity[];
  historyLoading: boolean;
  fetchFacultyHistory: () => Promise<void>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  notificationsLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Portfolio Export
  exportToPDF: () => Promise<{ success: boolean; error?: string }>;
  exportToCSV: () => Promise<{ success: boolean; error?: string }>;
  previewPDF: () => Promise<{ success: boolean; error?: string }>;
  getPortfolioData: () => Promise<PortfolioData | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default stats values
const defaultStudentStats: StudentStats = {
  total_activities: 0,
  pending_count: 0,
  approved_count: 0,
  rejected_count: 0,
  total_points: 0,
  certificates_count: 0,
};

const defaultFacultyStats: FacultyStats = {
  pending_count: 0,
  approved_today: 0,
  rejected_today: 0,
  total_reviewed: 0,
  total_approved: 0,
  total_rejected: 0,
};

const defaultAdminStats: AdminStats = {
  total_students: 0,
  total_faculty: 0,
  total_activities: 0,
  activities_pending: 0,
  activities_approved: 0,
  activities_rejected: 0,
  total_points_awarded: 0,
  activities_by_category: [],
  top_students: [],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Activities state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Skills & Achievements state
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  
  // Stats state
  const [studentStats, setStudentStats] = useState<StudentStats>(defaultStudentStats);
  const [facultyStats, setFacultyStats] = useState<FacultyStats>(defaultFacultyStats);
  const [adminStats, setAdminStats] = useState<AdminStats>(defaultAdminStats);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Faculty specific state
  const [pendingActivities, setPendingActivities] = useState<(Activity & { student?: any })[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [facultyHistory, setFacultyHistory] = useState<Activity[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await authService.getCurrentUser();
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        resetState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to real-time notifications when user is authenticated
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const resetState = () => {
    setActivities([]);
    setSkills([]);
    setAchievements([]);
    setStudentStats(defaultStudentStats);
    setFacultyStats(defaultFacultyStats);
    setAdminStats(defaultAdminStats);
    setPendingActivities([]);
    setFacultyHistory([]);
    setNotifications([]);
    setUnreadCount(0);
  };

  // Auth functions
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await authService.signIn({ email, password });
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: 'student' | 'faculty'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const result = await authService.signUp({ email, password, full_name: fullName, role });
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      resetState();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await authService.updateUserProfile(user.id, data);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  // Activities functions
  const fetchActivities = async (): Promise<void> => {
    if (!user) return;
    setActivitiesLoading(true);
    try {
      const result = await activityService.getStudentActivities(user.id);
      if (!result.error) {
        setActivities(result.data as Activity[]);
      }
    } catch (error) {
      console.error('Fetch activities error:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const addActivity = async (
    activity: Omit<Activity, 'id' | 'user_id' | 'status' | 'points' | 'created_at' | 'approved_by' | 'approved_at' | 'rejection_reason'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await activityService.createActivity({
      ...activity,
      user_id: user.id,
    });
    
    if (result.success && result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  };

  const deleteActivity = async (activityId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await activityService.deleteActivity(activityId);
    if (result.success) {
      setActivities(prev => prev.filter(a => a.id !== activityId));
    }
    return result;
  };

  const approveActivity = async (activityId: string, points: number): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'faculty') {
      return { success: false, error: 'Not authorized' };
    }
    
    const result = await activityService.approveActivity(activityId, user.id, points);
    if (result.success) {
      await fetchPendingActivities();
    }
    return result;
  };

  const rejectActivity = async (activityId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'faculty') {
      return { success: false, error: 'Not authorized' };
    }
    
    const result = await activityService.rejectActivity(activityId, user.id, reason);
    if (result.success) {
      await fetchPendingActivities();
    }
    return result;
  };

  // Skills functions
  const fetchSkills = async (): Promise<void> => {
    if (!user) return;
    setSkillsLoading(true);
    try {
      const data = await portfolioItemsService.getSkills(user.id);
      setSkills(data);
    } catch (error) {
      console.error('Fetch skills error:', error);
    } finally {
      setSkillsLoading(false);
    }
  };

  const addSkill = async (
    skill: Omit<Skill, 'id' | 'user_id' | 'created_at'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await portfolioItemsService.addSkill({
      ...skill,
      user_id: user.id,
    });
    
    if (result.success && result.data) {
      setSkills(prev => [...prev, result.data!].sort((a, b) => b.proficiency - a.proficiency));
    }
    return result;
  };

  const updateSkill = async (skillId: string, data: Partial<Skill>): Promise<{ success: boolean; error?: string }> => {
    const result = await portfolioItemsService.updateSkill(skillId, data);
    if (result.success && result.data) {
      setSkills(prev => prev.map(s => s.id === skillId ? result.data! : s));
    }
    return result;
  };

  const deleteSkill = async (skillId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await portfolioItemsService.deleteSkill(skillId);
    if (result.success) {
      setSkills(prev => prev.filter(s => s.id !== skillId));
    }
    return result;
  };

  // Achievements functions
  const fetchAchievements = async (): Promise<void> => {
    if (!user) return;
    try {
      const data = await portfolioItemsService.getAchievements(user.id);
      setAchievements(data);
    } catch (error) {
      console.error('Fetch achievements error:', error);
    }
  };

  const addAchievement = async (
    achievement: Omit<Achievement, 'id' | 'user_id' | 'created_at'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const result = await portfolioItemsService.addAchievement({
      ...achievement,
      user_id: user.id,
    });
    
    if (result.success && result.data) {
      setAchievements(prev => [result.data!, ...prev]);
    }
    return result;
  };

  const deleteAchievement = async (achievementId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await portfolioItemsService.deleteAchievement(achievementId);
    if (result.success) {
      setAchievements(prev => prev.filter(a => a.id !== achievementId));
    }
    return result;
  };

  // Stats functions
  const fetchStudentStats = async (): Promise<void> => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const stats = await statsService.getStudentStats(user.id);
      if (stats) {
        setStudentStats(stats);
      }
    } catch (error) {
      console.error('Fetch student stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchFacultyStats = async (): Promise<void> => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const stats = await statsService.getFacultyStats(user.id);
      if (stats) {
        setFacultyStats(stats);
      }
    } catch (error) {
      console.error('Fetch faculty stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAdminStats = async (): Promise<void> => {
    setStatsLoading(true);
    try {
      const [stats, categories, topStudents] = await Promise.all([
        statsService.getAdminStats(),
        statsService.getActivitiesByCategory(),
        statsService.getTopStudents(5),
      ]);
      
      if (stats) {
        setAdminStats({
          ...stats,
          activities_by_category: categories,
          top_students: topStudents,
        });
      }
    } catch (error) {
      console.error('Fetch admin stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Pending activities (faculty)
  const fetchPendingActivities = async (): Promise<void> => {
    if (!user || user.role !== 'faculty') return;
    setPendingLoading(true);
    try {
      const result = await activityService.getPendingActivities();
      if (!result.error) {
        setPendingActivities(result.data);
      }
    } catch (error) {
      console.error('Fetch pending activities error:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  // Faculty history
  const fetchFacultyHistory = async (): Promise<void> => {
    if (!user || user.role !== 'faculty') return;
    setHistoryLoading(true);
    try {
      // Get activities reviewed by this faculty
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('approved_by', user.id)
        .order('approved_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setFacultyHistory(data);
      }
    } catch (error) {
      console.error('Fetch faculty history error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Notifications functions
  const fetchNotifications = async (): Promise<void> => {
    if (!user) return;
    setNotificationsLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (notificationId: string): Promise<void> => {
    const result = await notificationService.markAsRead(notificationId);
    if (result.success) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    if (!user) return;
    const result = await notificationService.markAllAsRead(user.id);
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Portfolio export functions
  const exportToPDF = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return portfolioExportService.exportToPDF(user.id);
  };

  const exportToCSV = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return portfolioExportService.exportToCSV(user.id);
  };

  const previewPDF = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return portfolioExportService.previewPDF(user.id);
  };

  const getPortfolioData = async (): Promise<PortfolioData | null> => {
    if (!user) return null;
    return portfolioExportService.fetchPortfolioData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        // Auth State
        user,
        isLoading,
        isAuthenticated: !!user,
        
        // Auth Actions
        login,
        register,
        logout,
        updateProfile,
        
        // Activities
        activities,
        activitiesLoading,
        fetchActivities,
        addActivity,
        deleteActivity,
        approveActivity,
        rejectActivity,
        
        // Skills & Achievements
        skills,
        achievements,
        skillsLoading,
        fetchSkills,
        fetchAchievements,
        addSkill,
        updateSkill,
        deleteSkill,
        addAchievement,
        deleteAchievement,
        
        // Stats
        studentStats,
        facultyStats,
        adminStats,
        statsLoading,
        fetchStudentStats,
        fetchFacultyStats,
        fetchAdminStats,
        
        // Pending activities (faculty)
        pendingActivities,
        pendingLoading,
        fetchPendingActivities,
        
        // Faculty history
        facultyHistory,
        historyLoading,
        fetchFacultyHistory,

        // Notifications
        notifications,
        unreadCount,
        notificationsLoading,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,

        // Portfolio Export
        exportToPDF,
        exportToCSV,
        previewPDF,
        getPortfolioData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
