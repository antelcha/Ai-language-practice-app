import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Platform
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import DuoButton from '../../components/DuoButton';
import OpenAIService from '../../services/api/OpenAIService';
import MistakesService from '../../services/WritingMistakesService';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';
import { Ionicons } from '@expo/vector-icons';

const TIMER_DURATION = 120; // 2 minutes in seconds

const WritingQuestionScreen = () => {
  const route = useRoute();
  const { topic } = route.params;
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  
  const [question, setQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [sessionMistakes, setSessionMistakes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initializeScreen = async () => {
    // Get current user ID
    const userId = await supabaseService.getCurrentUserId();
    setCurrentUserId(userId);
    
    generateQuestion();
    startNewSession();
  };

  const startNewSession = () => {
    setTimeLeft(TIMER_DURATION);
    setIsSessionActive(true);
    setSessionMistakes([]);
    setUserAnswer('');
    setErrorMessage('');
    generateQuestion();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    setIsSessionActive(false);
    clearInterval(timerRef.current);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateQuestion = async () => {
    setIsLoading(true);
    try {
      if (!topic || !topic.name) {
        throw new Error('Invalid topic data');
      }
      
      const response = await OpenAIService.generateQuestion({
        name: topic.name,
        description: topic.description
      });
      
      if (response.success) {
        setQuestion(response.data);
      } else {
        setQuestion(`Write about ${topic.name}: ${topic.description}`);
      }
    } catch (error) {
      console.error('Error generating question:', error);
      setQuestion(`Share your thoughts about ${topic.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      setErrorMessage('Please write an answer before submitting.');
      return;
    }

    try {
      console.log('Submitting answer:', userAnswer);
      const response = await OpenAIService.checkWritingErrors(userAnswer, topic);
      console.log('OpenAI Response:', response);
      
      if (response.success) {
        if (response.data.hasErrors) {
          console.log('Mistakes found:', response.data.errors);
          
          // Store mistake immediately when errors are found
          await MistakesService.storeMistake({
            question: question,
            originalText: userAnswer,
            errors: response.data.errors,
            topic: topic.name,
            correctedText: '',
            score: 0
          }, currentUserId);

          setSessionMistakes(response.data.errors);
          setErrorMessage('Your text contains mistakes. Try again!');
        } else {
          setErrorMessage('');
          setSessionMistakes([]);
          generateQuestion();
          setUserAnswer('');
        }
      }
    } catch (error) {
      console.error('Error checking answer:', error);
      setErrorMessage('Error checking your answer. Please try again.');
    }
  };

  const handleInputPress = () => {
    if (Platform.OS === 'web') {
      inputRef.current?.focus();
    }
  };

  return (
    <Layout>
      <Header title={topic.name} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#1CB0F6" />
          ) : (
            <>
              <View style={styles.timerContainer}>
                <Text style={[
                  styles.timer,
                  timeLeft <= 30 && styles.timerWarning
                ]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>

              <View style={styles.questionContainer}>
                <Text style={styles.questionLabel}>Your Writing Challenge:</Text>
                <Text style={styles.question}>{question}</Text>
              </View>

              {isSessionActive ? (
                <>
                  <TouchableWithoutFeedback onPress={handleInputPress}>
                    <View>
                      <TextInput
                        ref={inputRef}
                        style={[
                          styles.input,
                          styles.inputActive,
                          Platform.OS === 'web' && styles.webInput
                        ]}
                        multiline
                        placeholder="Write your response here..."
                        value={userAnswer}
                        onChangeText={(text) => {
                          setUserAnswer(text);
                          setErrorMessage('');
                        }}
                        editable={isSessionActive}
                        textAlignVertical="top"
                      />
                    </View>
                  </TouchableWithoutFeedback>

                  {(errorMessage || sessionMistakes.length > 0) && (
                    <View style={styles.feedbackContainer}>
                      <View style={styles.feedbackHeader}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <Text style={styles.feedbackTitle}>Mistakes Found</Text>
                      </View>
                      <Text style={styles.feedbackMessage}>
                        {sessionMistakes.length > 0 
                          ? `Found ${sessionMistakes.length} mistake${sessionMistakes.length === 1 ? '' : 's'}. Please try again.`
                          : errorMessage}
                      </Text>
                    </View>
                  )}

                  <View style={styles.buttonContainer}>
                    <DuoButton
                      onPress={handleSubmit}
                      variant="primary"
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Submit</Text>
                    </DuoButton>
                  </View>
                </>
              ) : (
                <View style={styles.sessionSummary}>
                  <Text style={styles.summaryTitle}>Time's Up!</Text>
                  <Text style={styles.summaryText}>
                    You made {sessionMistakes.length} mistakes in this session.
                  </Text>
                  <DuoButton
                    onPress={startNewSession}
                    variant="primary"
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Start New Session</Text>
                  </DuoButton>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    flexGrow: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timer: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1CB0F6',
  },
  timerWarning: {
    color: '#FF3B30',
  },
  questionContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 150,
    marginBottom: 16,
  },
  inputActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  sessionSummary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1CB0F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  feedbackMessage: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 8,
  },
  mistakesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  mistakeItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mistakeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mistakeLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  wrongText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  correctText: {
    fontSize: 13,
    color: '#059669',
    flex: 1,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  button: {
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  webInput: {
    outlineWidth: 0,
    outlineColor: 'transparent',
    cursor: 'text',
  },
});

export default WritingQuestionScreen; 