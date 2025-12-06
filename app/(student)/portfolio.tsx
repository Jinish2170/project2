import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Star, Trophy, BookOpen, Share2, CheckCircle, FileText, ExternalLink } from 'lucide-react-native';
import { COLORS, GRADIENTS, getCategoryColor } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { PortfolioExportOptions, ActivityCategory, CATEGORY_LABELS } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ShareModal from '@/components/ShareModal';
import { VerificationStamp } from '@/components/VerificationBadge';

export default function StudentPortfolio() {
  const { 
    user, 
    skills, 
    achievements, 
    activities,
    studentStats,
    skillsLoading, 
    fetchSkills, 
    fetchAchievements,
    fetchActivities,
    fetchStudentStats
  } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Get approved activities only
  const approvedActivities = activities.filter(a => a.status === 'approved');

  // Group activities by category for summary
  const activitySummary = approvedActivities.reduce((acc, activity) => {
    acc[activity.category] = (acc[activity.category] || 0) + 1;
    return acc;
  }, {} as Record<ActivityCategory, number>);

  useEffect(() => {
    fetchSkills();
    fetchAchievements();
    fetchActivities();
    fetchStudentStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSkills(), 
      fetchAchievements(),
      fetchActivities(),
      fetchStudentStats()
    ]);
    setRefreshing(false);
  };

  const handleExportPortfolio = async (options: PortfolioExportOptions) => {
    // TODO: Implement with Supabase Edge Functions
    // This will generate PDF or create shareable link
    Alert.alert(
      'Coming Soon',
      'Portfolio export will be available once the backend is connected.',
      [{ text: 'OK' }]
    );
    return { 
      success: false, 
      error: 'Backend not connected. Portfolio export will be available soon.' 
    };
  };

  const getAchievementIcon = (icon?: string) => {
    switch (icon) {
      case 'trophy':
        return <Trophy size={20} color={COLORS.warning} />;
      case 'book-open':
        return <BookOpen size={20} color={COLORS.primary} />;
      case 'star':
        return <Star size={20} color={COLORS.warning} />;
      default:
        return <Award size={20} color={COLORS.warning} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name || 'Student'}</Text>
              <Text style={styles.profileTitle}>{user?.department || 'Department'}</Text>
              <Text style={styles.profileId}>
                {user?.enrollment_number || 'Student ID'} • Semester {user?.semester || '-'}
              </Text>
            </View>
            {/* Share Button */}
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => setShowShareModal(true)}
            >
              <Share2 size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Portfolio Stats Summary */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studentStats?.total_points || 0}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{approvedActivities.length}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{skills.length}</Text>
            <Text style={styles.statLabel}>Skills</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{achievements.length}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Verified Activities Summary */}
        {approvedActivities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Verified Activities</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle size={14} color={COLORS.success} />
                <Text style={styles.verifiedText}>
                  {approvedActivities.length} Verified
                </Text>
              </View>
            </View>
            <View style={styles.activitySummaryCard}>
              {Object.entries(activitySummary).map(([category, count]) => (
                <View key={category} style={styles.categorySummary}>
                  <View 
                    style={[
                      styles.categoryDot, 
                      { backgroundColor: getCategoryColor(category as ActivityCategory) }
                    ]} 
                  />
                  <Text style={styles.categoryName}>
                    {CATEGORY_LABELS[category as ActivityCategory]}
                  </Text>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills & Competencies</Text>
          </View>

          {skillsLoading ? (
            <LoadingSpinner />
          ) : skills.length === 0 ? (
            <EmptyState
              title="No skills added"
              message="Your skills will appear here as you complete activities"
              icon="award"
            />
          ) : (
            <View style={styles.skillsList}>
              {skills.map((skill) => (
                <View key={skill.id} style={styles.skillItem}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    <Text style={styles.skillPercentage}>{skill.proficiency}%</Text>
                  </View>
                  <View style={styles.skillBar}>
                    <View
                      style={[
                        styles.skillProgress,
                        { 
                          width: `${skill.proficiency}%`, 
                          backgroundColor: skill.proficiency > 70 ? COLORS.success : 
                                          skill.proficiency > 40 ? COLORS.warning : COLORS.error
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          {achievements.length === 0 ? (
            <EmptyState
              title="No achievements yet"
              message="Complete activities to earn achievements"
              icon="award"
            />
          ) : (
            <View style={styles.achievementsList}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementIcon}>
                    {getAchievementIcon(achievement.icon ?? undefined)}
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    <Text style={styles.achievementDate}>{achievement.date_earned}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onExport={handleExportPortfolio}
        userName={user?.full_name || 'Student'}
      />
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
    paddingTop: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  profileId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    padding: 24,
    paddingBottom: 0,
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  activitySummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  categorySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  skillsList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  skillItem: {
    marginBottom: 16,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  skillPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  skillBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillProgress: {
    height: '100%',
    borderRadius: 4,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  bottomPadding: {
    height: 40,
  },
});
