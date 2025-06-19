import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';

const SpeakingHistoryScreen = () => {
  const navigation = useNavigation();
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [speakingHistory, setSpeakingHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await supabaseService.getCurrentUserId();
      if (!userId) {
        navigation.replace('Login');
        return;
      }
      
      setCurrentUserId(userId);
      await loadSpeakingHistory(userId);
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSpeakingHistory = async (userId) => {
    try {
      const history = await supabaseService.getSpeakingHistory(userId);
      setSpeakingHistory(history);
    } catch (error) {
      console.error('Error loading speaking history:', error);
      Alert.alert('Error', 'Failed to load speaking history');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSpeakingHistory(currentUserId);
    setRefreshing(false);
  };

  const handleDelete = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this speaking practice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteSpeakingHistory(currentUserId, itemId);
              await loadSpeakingHistory(currentUserId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const renderScoreBar = (label, score, color) => (
    <View style={styles.scoreBarContainer}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBarBackground}>
        <View 
          style={[
            styles.scoreBarFill, 
            { width: `${score}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={[styles.scoreValue, { color }]}>{score}%</Text>
    </View>
  );

  const renderSpeakingItem = (item, index) => {
    const isExpanded = selectedItem === item.id;
    const errorCount = item.errors?.length || 0;
    const scores = item.scores || {};
    const overallScore = scores.overallScore || 0;

    return (
      <View key={item.id} style={styles.historyItem}>
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => setSelectedItem(isExpanded ? null : item.id)}
        >
          <View style={styles.itemInfo}>
            <Text style={styles.questionText} numberOfLines={2}>
              {item.question}
            </Text>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF3B30" />
                <Text style={styles.statText}>{errorCount} errors</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="star" size={16} color={getScoreColor(overallScore)} />
                <Text style={[styles.statText, { color: getScoreColor(overallScore) }]}>
                  {overallScore}%
                </Text>
              </View>
              {item.topic && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="bookmark-outline" size={16} color="#1CB0F6" />
                  <Text style={styles.statText}>{item.topic}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Scores Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Scores:</Text>
              <View style={styles.scoresContainer}>
                {renderScoreBar('Grammar', scores.grammar || 0, getScoreColor(scores.grammar || 0))}
                {renderScoreBar('Question Addressing', scores.addressingQuestion || 0, getScoreColor(scores.addressingQuestion || 0))}
                {renderScoreBar('Length', scores.length || 0, getScoreColor(scores.length || 0))}
                {renderScoreBar('Overall', overallScore, getScoreColor(overallScore))}
              </View>
            </View>

            {/* Transcript Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Speech Transcript:</Text>
              <Text style={styles.transcriptText}>{item.transcript}</Text>
            </View>

            {/* Errors Section */}
            {item.errors && item.errors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Issues Found:</Text>
                {item.errors.map((error, errorIndex) => (
                  <View key={errorIndex} style={styles.errorItem}>
                    <View style={styles.errorHeader}>
                      <Text style={styles.errorType}>{error.type?.toUpperCase() || 'ERROR'}</Text>
                      <Text style={styles.wrongText}>❌ {error.wrong}</Text>
                      <Text style={styles.correctText}>✅ {error.correct}</Text>
                    </View>
                    <Text style={styles.reasonText}>{error.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Audio Section */}
            {item.audioFile && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio Recording:</Text>
                <View style={styles.audioContainer}>
                  <MaterialCommunityIcons name="music-note" size={24} color="#1CB0F6" />
                  <Text style={styles.audioText}>Audio recording available</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Header title="Speaking History" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34C759" />
          <Text style={styles.loadingText}>Loading your speaking history...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Speaking History" showBack={true} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {speakingHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="microphone-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Speaking History</Text>
            <Text style={styles.emptySubtitle}>
              Start practicing speaking to see your history here
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('Speaking')}
            >
              <Text style={styles.startButtonText}>Start Speaking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyList}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Total Practices: {speakingHistory.length}</Text>
              {speakingHistory.length > 0 && (
                <Text style={styles.statsSubtitle}>
                  Average Score: {Math.round(
                    speakingHistory.reduce((sum, item) => sum + (item.scores?.overallScore || 0), 0) / speakingHistory.length
                  )}%
                </Text>
              )}
            </View>
            {speakingHistory.map((item, index) => renderSpeakingItem(item, index))}
          </View>
        )}
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyList: {
    padding: 16,
  },
  statsHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  scoresContainer: {
    gap: 8,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  scoreBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  transcriptText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  errorItem: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorHeader: {
    marginBottom: 4,
  },
  errorType: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 4,
  },
  wrongText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 2,
  },
  correctText: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
  },
  audioText: {
    fontSize: 14,
    color: '#1CB0F6',
    fontWeight: '500',
  },
});

export default SpeakingHistoryScreen; 