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

const WritingHistoryScreen = () => {
  const navigation = useNavigation();
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [writingHistory, setWritingHistory] = useState([]);
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
      await loadWritingHistory(userId);
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadWritingHistory = async (userId) => {
    try {
      const history = await supabaseService.getWritingHistory(userId);
      setWritingHistory(history);
    } catch (error) {
      console.error('Error loading writing history:', error);
      Alert.alert('Error', 'Failed to load writing history');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWritingHistory(currentUserId);
    setRefreshing(false);
  };

  const handleDelete = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this writing practice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteWritingHistory(currentUserId, itemId);
              await loadWritingHistory(currentUserId);
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

  const renderWritingItem = (item, index) => {
    const isExpanded = selectedItem === item.id;
    const errorCount = item.errors?.length || 0;
    const score = item.score || 0;

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
              {score > 0 && (
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="star" size={16} color={getScoreColor(score)} />
                  <Text style={[styles.statText, { color: getScoreColor(score) }]}>
                    {score}%
                  </Text>
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Answer:</Text>
              <Text style={styles.answerText}>{item.answer}</Text>
            </View>

            {item.errors && item.errors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Errors Found:</Text>
                {item.errors.map((error, errorIndex) => (
                  <View key={errorIndex} style={styles.errorItem}>
                    <View style={styles.errorHeader}>
                      <Text style={styles.wrongText}>❌ {error.wrong}</Text>
                      <Text style={styles.correctText}>✅ {error.correct}</Text>
                    </View>
                    <Text style={styles.reasonText}>{error.reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.topic && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Topic:</Text>
                <Text style={styles.topicText}>{item.topic}</Text>
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
        <Header title="Writing History" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1CB0F6" />
          <Text style={styles.loadingText}>Loading your writing history...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Writing History" showBack={true} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {writingHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Writing History</Text>
            <Text style={styles.emptySubtitle}>
              Start practicing writing to see your history here
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('WritingPro')}
            >
              <Text style={styles.startButtonText}>Start Writing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyList}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Total Practices: {writingHistory.length}</Text>
            </View>
            {writingHistory.map((item, index) => renderWritingItem(item, index))}
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
    backgroundColor: '#1CB0F6',
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
  answerText: {
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
  topicText: {
    fontSize: 14,
    color: '#1CB0F6',
    fontWeight: '500',
  },
});

export default WritingHistoryScreen; 