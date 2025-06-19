import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';
import MistakesService from '../../services/WritingMistakesService';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [statistics, setStatistics] = useState({
    totalWriting: 0,
    totalSpeaking: 0,
    averageWritingScore: 0,
    averageSpeakingScore: 0,
    totalErrors: 0,
    streak: 0
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    learningGoal: ''
  });

  const supabaseService = new SupabaseService(SUPABASE_CONFIG);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await supabaseService.getCurrentUserId();
      if (!userId) {
        navigation.replace('Login');
        return;
      }
      
      setCurrentUserId(userId);
      
      // Load user profile
      const profile = await supabaseService.getUserProfile(userId);
      setUserProfile(profile);
      
      if (profile) {
        setEditForm({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          learningGoal: profile.learning_goal || ''
        });
      }

      // Load statistics
      await loadStatistics(userId);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async (userId) => {
    try {
      const writingHistory = await MistakesService.getAllMistakes(userId);
      const speakingHistory = await MistakesService.getAllSpeakingMistakes(userId);
      
      const totalWriting = writingHistory.length;
      const totalSpeaking = speakingHistory.length;
      
      const writingScores = writingHistory.filter(item => item.score > 0).map(item => item.score);
      const speakingScores = speakingHistory.map(item => item.scores?.overallScore || 0).filter(score => score > 0);
      
      const averageWritingScore = writingScores.length > 0 
        ? Math.round(writingScores.reduce((sum, score) => sum + score, 0) / writingScores.length)
        : 0;
      
      const averageSpeakingScore = speakingScores.length > 0
        ? Math.round(speakingScores.reduce((sum, score) => sum + score, 0) / speakingScores.length)
        : 0;

      const totalErrors = writingHistory.reduce((sum, item) => sum + (item.errors?.length || 0), 0) +
                         speakingHistory.reduce((sum, item) => sum + (item.errors?.length || 0), 0);

      // Calculate streak (simplified - consecutive days with practice)
      const allDates = [...writingHistory, ...speakingHistory]
        .map(item => new Date(item.date).toDateString())
        .filter((date, index, array) => array.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));

      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (allDates.includes(today) || allDates.includes(yesterday)) {
        streak = 1;
        for (let i = 1; i < allDates.length; i++) {
          const currentDate = new Date(allDates[i-1]);
          const nextDate = new Date(allDates[i]);
          const diffTime = currentDate - nextDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }

      setStatistics({
        totalWriting,
        totalSpeaking,
        averageWritingScore,
        averageSpeakingScore,
        totalErrors,
        streak
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const updates = {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        learning_goal: editForm.learningGoal
      };

      await supabaseService.updateUserProfile(currentUserId, updates);
      setUserProfile({ ...userProfile, ...updates });
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.clearCurrentUser();
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <Layout>
        <Header title="Profile" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1CB0F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Profile" showBack={true} />
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#1CB0F6" />
          </View>
          <Text style={styles.userName}>
            {userProfile?.first_name || userProfile?.last_name 
              ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
              : 'User'}
          </Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
          {userProfile?.learning_goal && (
            <Text style={styles.learningGoal}>🎯 {userProfile.learning_goal}</Text>
          )}
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="pencil" size={16} color="#1CB0F6" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Writing Practices"
              value={statistics.totalWriting}
              icon="document-text"
              color="#1CB0F6"
              subtitle={statistics.averageWritingScore > 0 ? `Avg: ${statistics.averageWritingScore}%` : ''}
            />
            <StatCard
              title="Speaking Practices"
              value={statistics.totalSpeaking}
              icon="mic"
              color="#34C759"
              subtitle={statistics.averageSpeakingScore > 0 ? `Avg: ${statistics.averageSpeakingScore}%` : ''}
            />
            <StatCard
              title="Current Streak"
              value={`${statistics.streak} days`}
              icon="flame"
              color="#FF9500"
              subtitle="Keep it up!"
            />
            <StatCard
              title="Total Errors Fixed"
              value={statistics.totalErrors}
              icon="checkmark-circle"
              color="#FF3B30"
              subtitle="Learning progress"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('WritingHistory')}
          >
            <Ionicons name="document-text" size={24} color="#1CB0F6" />
            <Text style={styles.actionText}>View Writing History</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('SpeakingHistory')}
          >
            <Ionicons name="mic" size={24} color="#34C759" />
            <Text style={styles.actionText}>View Speaking History</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.firstName}
                onChangeText={(text) => setEditForm({...editForm, firstName: text})}
                placeholder="Enter your first name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.lastName}
                onChangeText={(text) => setEditForm({...editForm, lastName: text})}
                placeholder="Enter your last name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Learning Goal</Text>
              <TextInput
                style={styles.input}
                value={editForm.learningGoal}
                onChangeText={(text) => setEditForm({...editForm, learningGoal: text})}
                placeholder="What's your English learning goal?"
                multiline
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  learningGoal: {
    fontSize: 14,
    color: '#1CB0F6',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1CB0F6',
  },
  editButtonText: {
    color: '#1CB0F6',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSave: {
    fontSize: 16,
    color: '#1CB0F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
});

export default ProfileScreen; 