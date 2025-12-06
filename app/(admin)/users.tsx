import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, GraduationCap, UserCog, ChevronRight, MoreVertical } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { getStudents, getFaculty } from '@/services/userService';
import { Profile } from '@/types/database';
import LoadingSpinner from '@/components/LoadingSpinner';

interface StudentData {
  id: string;
  name: string;
  enrollment: string;
  department: string;
  points: number;
  activities: number;
}

interface FacultyData {
  id: string;
  name: string;
  email: string;
  department: string;
  reviewed: number;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'students' | 'faculty'>('students');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [faculty, setFaculty] = useState<FacultyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      // Fetch students with their stats
      const studentsResult = await getStudents();
      if (studentsResult.data) {
        const studentData: StudentData[] = studentsResult.data.map((profile: Profile) => ({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          enrollment: profile.enrollment_number || 'N/A',
          department: profile.department || 'Not Assigned',
          points: 0, // Will be fetched separately or set from profile
          activities: 0,
        }));
        setStudents(studentData);
      }

      // Fetch faculty
      const facultyResult = await getFaculty();
      if (facultyResult.data) {
        const facultyData: FacultyData[] = facultyResult.data.map((profile: Profile) => ({
          id: profile.id,
          name: profile.full_name || 'Unknown',
          email: profile.email,
          department: profile.department || 'Not Assigned',
          reviewed: 0, // Will be fetched separately
        }));
        setFaculty(facultyData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaculty = faculty.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerSubtitle}>Manage students and faculty</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'students' && styles.tabActive]}
          onPress={() => setSelectedTab('students')}
        >
          <GraduationCap size={18} color={selectedTab === 'students' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, selectedTab === 'students' && styles.tabTextActive]}>
            Students ({students.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'faculty' && styles.tabActive]}
          onPress={() => setSelectedTab('faculty')}
        >
          <UserCog size={18} color={selectedTab === 'faculty' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, selectedTab === 'faculty' && styles.tabTextActive]}>
            Faculty ({faculty.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : selectedTab === 'students' ? (
          <View style={styles.usersList}>
            {filteredStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            ) : filteredStudents.map((student, index) => (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.userCard,
                  index === filteredStudents.length - 1 && styles.lastUserCard
                ]}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{student.name}</Text>
                  <Text style={styles.userMeta}>{student.enrollment} • {student.department}</Text>
                </View>
                <View style={styles.userStats}>
                  <Text style={styles.userStatValue}>{student.points}</Text>
                  <Text style={styles.userStatLabel}>pts</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.usersList}>
            {filteredFaculty.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No faculty found</Text>
              </View>
            ) : filteredFaculty.map((member, index) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.userCard,
                  index === filteredFaculty.length - 1 && styles.lastUserCard
                ]}
              >
                <View style={[styles.userAvatar, { backgroundColor: COLORS.secondary + '15' }]}>
                  <Text style={[styles.avatarText, { color: COLORS.secondary }]}>
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{member.name}</Text>
                  <Text style={styles.userMeta}>{member.department}</Text>
                </View>
                <View style={styles.userStats}>
                  <Text style={styles.userStatValue}>{member.reviewed}</Text>
                  <Text style={styles.userStatLabel}>reviewed</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                  <ChevronRight size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  usersList: {
    marginHorizontal: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  lastUserCard: {
    borderBottomWidth: 0,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  userStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  userStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  moreButton: {
    padding: 4,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
