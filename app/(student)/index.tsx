import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Clock, Award, FileText, Plus, Share2, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');

export default function StudentDashboard() {
  const router = useRouter();
  const { user, studentStats, statsLoading, fetchStudentStats, activities, fetchActivities, activitiesLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStudentStats();
    fetchActivities();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStudentStats(), fetchActivities()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Academic data from user profile
  const academicInfo = {
    currentSemester: user?.semester ? `${user.semester}${getOrdinalSuffix(user.semester)}` : '-',
    cgpa: user?.cgpa || 0,
    progress: user?.semester ? Math.round((user.semester / 8) * 100) : 0,
  };

  function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  // Stats for grid display - using real data
  const statsGrid = [
    {
      label: 'Total Activities',
      value: studentStats?.total_activities ?? 0,
      icon: Activity,
      color: COLORS.primary,
      bgColor: COLORS.primary + '10',
    },
    {
      label: 'Pending Approval',
      value: studentStats?.pending_count ?? 0,
      icon: Clock,
      color: COLORS.warning,
      bgColor: COLORS.warning + '10',
    },
    {
      label: 'Certificates',
      value: studentStats?.certificates_count ?? 0,
      icon: FileText,
      color: COLORS.secondary,
      bgColor: COLORS.secondary + '10',
    },
    {
      label: 'Score Points',
      value: studentStats?.total_points ?? 0,
      icon: Award,
      color: COLORS.success,
      bgColor: COLORS.success + '10',
    },
  ];

  const recentActivities = activities.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.studentName}>{user?.full_name || 'Student'}</Text>
          <Text style={styles.studentId}>ID: {user?.enrollment_number || 'Not assigned'}</Text>
        </View>

        {/* Academic Progress Card */}
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.academicCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.academicContent}>
            <View style={styles.academicLeft}>
              <Text style={styles.academicTitle}>Academic Progress</Text>
              <Text style={styles.academicSemester}>Current Semester: {academicInfo.currentSemester}</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${academicInfo.progress}%` }]} />
                </View>
              </View>
            </View>
            <View style={styles.academicRight}>
              <Text style={styles.cgpaValue}>{academicInfo.cgpa}</Text>
              <Text style={styles.cgpaLabel}>CGPA</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        {statsLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statsGrid.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                  <stat.icon size={22} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(student)/activities')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Plus size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Add Activity</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(student)/portfolio')}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Share2 size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Generate Portfolio</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/(student)/activities')}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {activitiesLoading ? (
            <LoadingSpinner />
          ) : recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No activities yet</Text>
              <Text style={styles.emptySubtext}>Start by adding your first activity</Text>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {recentActivities.map((activity, index) => (
                <TouchableOpacity 
                  key={activity.id} 
                  style={[
                    styles.activityCard,
                    index === recentActivities.length - 1 && styles.lastActivityCard
                  ]}
                >
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {activity.category.replace('_', ' ')} • {new Date(activity.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          activity.status === 'approved'
                            ? COLORS.success + '15'
                            : activity.status === 'rejected'
                            ? COLORS.error + '15'
                            : COLORS.warning + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            activity.status === 'approved'
                              ? COLORS.success
                              : activity.status === 'rejected'
                              ? COLORS.error
                              : COLORS.warning,
                        },
                      ]}
                    >
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  studentName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  studentId: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  academicCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  academicContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  academicLeft: {
    flex: 1,
  },
  academicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  academicSemester: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  academicRight: {
    alignItems: 'center',
    marginLeft: 20,
  },
  cgpaValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
  },
  cgpaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    width: (screenWidth - 52) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  activitiesList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  lastActivityCard: {
    borderBottomWidth: 0,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  bottomPadding: {
    height: 20,
  },
});
