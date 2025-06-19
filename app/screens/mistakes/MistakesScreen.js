import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, Alert, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import MistakesService from '../../services/WritingMistakesService';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';

const AlertDialog = ({ visible, title, message, onCancel, onConfirm }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity 
              onPress={onCancel}
              style={[styles.modalButton, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onConfirm}
              style={[styles.modalButton, styles.confirmButton]}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const QuestionSection = ({ questionData, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [answerToDelete, setAnswerToDelete] = useState(null);

  const handleDelete = (answerId) => {
    if (Platform.OS === 'web') {
      setAnswerToDelete(answerId);
      setShowDeleteAlert(true);
    } else {
      Alert.alert(
        "Delete Answer",
        "Are you sure you want to delete this answer?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            onPress: () => onDelete(answerId),
            style: "destructive"
          }
        ]
      );
    }
  };

  return (
    <View style={styles.questionContainer}>
      <TouchableOpacity 
        style={styles.questionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.questionTitleContainer}>
          <Text style={styles.questionTitle} numberOfLines={expanded ? undefined : 1}>
            {questionData.question}
          </Text>
          <Text style={styles.answerCount}>
            {questionData.attempts.reduce((total, answer) => total + answer.errors.length, 0)} mistakes
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#4B5563" 
          style={styles.expandIcon}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.answersContainer}>
          {questionData.attempts.map((answer, index) => (
            <View key={answer.id} style={styles.answerCard}>
              <View style={styles.answerHeader}>
                <Text style={styles.answerTime}>
                  {new Date(answer.date).toLocaleTimeString()}
                </Text>
                <TouchableOpacity 
                  onPress={() => handleDelete(answer.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.originalText} numberOfLines={2}>
                {answer.answer}
              </Text>

              {answer.errors.map((error, errorIndex) => (
                <View key={errorIndex} style={styles.errorItem}>
                  <View style={styles.errorTextColumn}>
                    <Text style={styles.wrongText}>{error.wrong}</Text>
                    <Text style={styles.correctText}>{error.correct}</Text>
                    <Text style={styles.reasonText}>{error.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <AlertDialog
        visible={showDeleteAlert}
        title="Delete Answer"
        message="Are you sure you want to delete this answer?"
        onCancel={() => {
          setShowDeleteAlert(false);
          setAnswerToDelete(null);
        }}
        onConfirm={() => {
          setShowDeleteAlert(false);
          onDelete(answerToDelete);
          setAnswerToDelete(null);
        }}
      />
    </View>
  );
};

const MistakesScreen = () => {
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedMistakes, setGroupedMistakes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showClearAlert, setShowClearAlert] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      filterMistakes();
    }
  }, [searchQuery]);

  const initializeScreen = async () => {
    // Get current user ID
    const userId = await supabaseService.getCurrentUserId();
    setCurrentUserId(userId);
    
    loadMistakes(userId);
  };

  const loadMistakes = async (userId = currentUserId) => {
    setIsLoading(true);
    try {
      console.log('Loading mistakes...');
      const result = await MistakesService.getMistakesByDateAndQuestion(userId);
      console.log('Mistakes result:', result);
      if (result.success) {
        console.log('Grouped mistakes:', result.data);
        // Sort dates in reverse chronological order
        const sortedData = Object.fromEntries(
          Object.entries(result.data)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, questions]) => [
              date,
              // Sort questions by their most recent answer's date
              questions.sort((a, b) => {
                const aLatest = Math.max(...a.attempts.map(ans => new Date(ans.date).getTime()));
                const bLatest = Math.max(...b.attempts.map(ans => new Date(ans.date).getTime()));
                return bLatest - aLatest;
              })
            ])
        );
        setGroupedMistakes(sortedData);
      }
    } catch (error) {
      console.error('Error loading mistakes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMistakes = async () => {
    if (!searchQuery) {
      loadMistakes();
      return;
    }

    try {
      const result = await MistakesService.getMistakesByDateAndQuestion(currentUserId);
      if (result.success) {
        const filtered = {};
        Object.entries(result.data)
          .sort((a, b) => new Date(b[0]) - new Date(a[0])) // Sort dates in reverse chronological order
          .forEach(([date, questions]) => {
            const filteredQuestions = questions
              .filter(q => 
                q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.attempts.some(a => 
                  a.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.errors.some(e => 
                    e.wrong.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.correct.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.reason.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
              )
              .sort((a, b) => { // Sort questions by their most recent answer's date
                const aLatest = Math.max(...a.attempts.map(ans => new Date(ans.date).getTime()));
                const bLatest = Math.max(...b.attempts.map(ans => new Date(ans.date).getTime()));
                return bLatest - aLatest;
              });
            
            if (filteredQuestions.length > 0) {
              filtered[date] = filteredQuestions;
            }
          });
        setGroupedMistakes(filtered);
      }
    } catch (error) {
      console.error('Error filtering mistakes:', error);
    }
  };

  const handleDelete = async (answerId) => {
    try {
      const result = await MistakesService.deleteMistake(answerId, 'writing', currentUserId);
      if (result.success) {
        await loadMistakes();
      } else {
        Alert.alert('Error', 'Failed to delete answer');
      }
    } catch (error) {
      console.error('Error deleting answer:', error);
      Alert.alert('Error', 'Failed to delete answer');
    }
  };

  const handleClearStorage = () => {
    if (Platform.OS === 'web') {
      setShowClearAlert(true);
    } else {
      Alert.alert(
        "Clear All Mistakes",
        "Are you sure you want to delete all your mistakes? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear All",
            onPress: clearAllMistakes,
            style: "destructive"
          }
        ]
      );
    }
  };

  const clearAllMistakes = async () => {
    try {
      const result = await MistakesService.clearAllMistakes();
      if (result.success) {
        setGroupedMistakes({});
      } else {
        if (Platform.OS === 'web') {
          alert('Failed to clear mistakes');
        } else {
          Alert.alert('Error', 'Failed to clear mistakes');
        }
      }
    } catch (error) {
      console.error('Error clearing mistakes:', error);
      if (Platform.OS === 'web') {
        alert('Failed to clear mistakes');
      } else {
        Alert.alert('Error', 'Failed to clear mistakes');
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Header title="Review Mistakes" />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1CB0F6" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <AlertDialog
        visible={showClearAlert}
        title="Clear All Mistakes"
        message="Are you sure you want to delete all your mistakes? This action cannot be undone."
        onCancel={() => setShowClearAlert(false)}
        onConfirm={() => {
          setShowClearAlert(false);
          clearAllMistakes();
        }}
      />
      <Header 
        title="Review Mistakes" 
        rightComponent={
          <TouchableOpacity 
            onPress={handleClearStorage}
            style={styles.clearButton}
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        }
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mistakes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>

        {Object.keys(groupedMistakes).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching mistakes found.' : 'No mistakes to review yet.'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Try a different search term.' : 'Practice more to see your mistakes here!'}
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(groupedMistakes).map(([date, questions]) => (
              <View key={date} style={styles.dateSection}>
                <Text style={styles.dateText}>{date}</Text>
                {questions.map((questionData, index) => (
                  <QuestionSection
                    key={index}
                    questionData={questionData}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  questionHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  questionTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  questionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  answerCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  answersContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
  },
  answerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  originalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorTextColumn: {
    gap: 8,
  },
  wrongText: {
    fontSize: 14,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
    lineHeight: 20,
  },
  correctText: {
    fontSize: 14,
    color: '#059669',
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
    lineHeight: 20,
  },
  reasonText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    padding: 8,
    marginRight: -8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  expandIcon: {
    marginTop: 2,
  },
});

export default MistakesScreen; 