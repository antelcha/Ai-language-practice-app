import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import DuoButton from '../../components/DuoButton';
import OpenAIService from '../../services/api/OpenAIService';
import MistakesService from '../../services/WritingMistakesService';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';

const speakingTopics = {
  'Technology': [
    "Describe your favorite technology and how it helps you in daily life.",
    "What do you think about artificial intelligence? Is it helpful or dangerous?",
    "How has social media changed the way people communicate?",
    "Describe a mobile app that you use frequently and explain why you like it."
  ],
  'Family': [
    "Tell me about your family. How many people are in your family?",
    "What activities do you enjoy doing with your family?",
    "Describe a family tradition that is important to you.",
    "How has your relationship with your family changed over the years?"
  ],
  'Life': [
    "What are your goals for the next five years?",
    "Describe a challenge you faced and how you overcame it.",
    "What makes you happy in life?",
    "If you could change one thing about your life, what would it be?"
  ],
  'Education': [
    "Describe your educational background and your favorite subject.",
    "What do you think is the most important skill students should learn?",
    "How has online learning changed education?",
    "What advice would you give to someone starting university?"
  ],
  'Career': [
    "Describe your dream job and why you want to do it.",
    "What skills are most important in your field of work?",
    "How do you balance work and personal life?",
    "What career advice would you give to young people?"
  ],
  'Society': [
    "What is the biggest problem in society today?",
    "How can people help their community?",
    "Describe cultural differences you have observed.",
    "What role should government play in people's lives?"
  ],
  'Environment': [
    "What can individuals do to protect the environment?",
    "How has climate change affected your region?",
    "Describe your favorite place in nature.",
    "What do you think about renewable energy sources?"
  ],
  'Health': [
    "How do you stay healthy and fit?",
    "What is your opinion about mental health awareness?",
    "Describe your eating habits and lifestyle.",
    "How important is exercise in daily life?"
  ]
};

const SpeakingScreen = ({ navigation, route }) => {
  const { topic } = route.params || { topic: { name: 'Technology' } };
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const recordingTimeRef = useRef(null);
  const maxRecordingTime = 60000; // 1 minute in milliseconds

  useEffect(() => {
    initializeScreen();
    setupAudio();
    
    return () => {
      if (recording) {
        if (Platform.OS === 'web') {
          // Web cleanup
          if (recording.mediaRecorder && recording.mediaRecorder.state !== 'inactive') {
            recording.mediaRecorder.stop();
          }
          if (recording.stream) {
            recording.stream.getTracks().forEach(track => track.stop());
          }
        } else {
          // Mobile cleanup
          recording.stopAndUnloadAsync();
        }
      }
    };
  }, []);

  const initializeScreen = async () => {
    // Get current user ID
    const userId = await supabaseService.getCurrentUserId();
    setCurrentUserId(userId);
    
    generateNewQuestion();
  };

  const setupAudio = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const generateNewQuestion = () => {
    const questions = speakingTopics[topic.name] || speakingTopics['Technology'];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setAnalysisResult(null);
    setRecordingTime(0);
    setRecordingUri(null);
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web için MediaRecorder API kullanacağız
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          Alert.alert('Error', 'Recording is not supported in this browser');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000, // Whisper works best with 16kHz
            channelCount: 1 // Mono audio
          } 
        });
        
        // MediaRecorder options for better compatibility and quality
        const options = {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000 // Higher bitrate for better quality
        };
        
        // Fallback to other formats if webm is not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'audio/wav';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              delete options.mimeType; // Use default
            }
          }
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        const chunks = [];

        mediaRecorder.ondataavailable = (event) => {
          console.log('Data available:', event.data.size, 'bytes');
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('MediaRecorder stopped, chunks:', chunks.length);
          
          if (chunks.length === 0) {
            console.error('No audio data recorded');
            Alert.alert('Recording Error', 'No audio data was recorded. Please try again.');
            return;
          }

          const blob = new Blob(chunks, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          
          console.log('Final blob size:', blob.size, 'bytes');
          console.log('Final blob type:', blob.type);
          
          // Check minimum file size (should be at least 1KB for meaningful audio)
          if (blob.size < 1000) {
            console.error('Audio file too small:', blob.size, 'bytes');
            Alert.alert('Recording Error', 'Recording is too short or empty. Please speak louder and longer.');
            return;
          }

          const url = URL.createObjectURL(blob);
          console.log('Recording saved with URI:', url);
          setRecordingUri(url);
          
          // Analizi hemen başlat (minimum süre kontrolü kaldırıldı çünkü zaten blob size kontrolü var)
          console.log('Starting analysis immediately...');
          analyzeRecording(url);
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event.error);
          Alert.alert('Recording Error', 'An error occurred during recording. Please try again.');
        };

        // Start recording with less frequent chunking for better audio continuity
        mediaRecorder.start(1000); // Request data every 1 second instead of 100ms
        
        setRecording({ 
          mediaRecorder, 
          stream,
          chunks,
          stop: () => {
            console.log('Stopping MediaRecorder, state:', mediaRecorder.state);
            if (mediaRecorder.state === 'recording') {
              // Request final data before stopping
              mediaRecorder.requestData();
              setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 100);
            }
            // Stop all tracks
            stream.getTracks().forEach(track => {
              console.log('Stopping track:', track.kind);
              track.stop();
            });
          }
        });
      } else {
        // Mobile için Expo Audio
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }

      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer başlat
      recordingTimeRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 100;
          if (newTime >= maxRecordingTime) {
            stopRecording();
            return maxRecordingTime;
          }
          return newTime;
        });
      }, 100);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('stopRecording called, isRecording:', isRecording);
      
      if (recordingTimeRef.current) {
        clearInterval(recordingTimeRef.current);
        recordingTimeRef.current = null;
      }

      setIsRecording(false);

      if (recording) {
        if (Platform.OS === 'web') {
          console.log('Stopping web recording...');
          // Web'de onstop callback analizi başlatacak
          recording.stop();
        } else {
          // Mobile için
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecordingUri(uri);
          
          // Mobile'da direkt analizi başlat
          console.log('Starting analysis immediately for mobile...');
          analyzeRecording(uri);
        }
        setRecording(null);
      }

    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Could not stop recording properly. Please try again.');
    }
  };

  const analyzeRecording = async (audioUri = recordingUri) => {
    setIsAnalyzing(true);
    
    try {
      if (!audioUri) {
        throw new Error('No recording found. Please try recording again.');
      }

      console.log('Starting analysis with URI:', audioUri);

      // OpenAI Whisper API ile ses analizi
      let transcript = '';
      let analysisResult = null;

      if (Platform.OS === 'web') {
        // Web için blob'u base64'e çevir
        const response = await fetch(audioUri);
        const blob = await response.blob();
        
        console.log('Blob size:', blob.size, 'bytes');
        if (blob.size === 0) {
          throw new Error('Recording is empty. Please try again.');
        }
        
        // Whisper API çağrısı
        console.log('Sending to Whisper API...');
        const whisperResult = await OpenAIService.transcribeAudio(blob);
        if (!whisperResult.success) {
          throw new Error(`Transcription failed: ${whisperResult.error}`);
        }
        transcript = whisperResult.text || '';
        console.log('Transcript:', transcript);
        
        // Transcript'i analiz et
        if (transcript.trim()) {
          console.log('Analyzing speech...');
          analysisResult = await OpenAIService.analyzeSpeech(transcript, currentQuestion);
          if (!analysisResult.success) {
            throw new Error(`Speech analysis failed: ${analysisResult.error}`);
          }
        } else {
          throw new Error('No speech detected in the recording. Please speak clearly and try again.');
        }
      } else {
        // Mobile için dosya yolu kullan
        const whisperResult = await OpenAIService.transcribeAudioFile(audioUri);
        if (!whisperResult.success) {
          throw new Error(`Transcription failed: ${whisperResult.error}`);
        }
        transcript = whisperResult.text || '';
        
        if (transcript.trim()) {
          analysisResult = await OpenAIService.analyzeSpeech(transcript, currentQuestion);
          if (!analysisResult.success) {
            throw new Error(`Speech analysis failed: ${analysisResult.error}`);
          }
        } else {
          throw new Error('No speech detected in the recording. Please speak clearly and try again.');
        }
      }

      if (!analysisResult) {
        throw new Error('Failed to analyze speech');
      }

      console.log('Analysis result:', analysisResult);
      setAnalysisResult(analysisResult);
      setRecordingUri(audioUri); // State'i de güncelle
      
      // Hataları kaydet
      if (analysisResult.errors && analysisResult.errors.length > 0) {
        await saveSpeakingMistake(analysisResult);
      }
      
    } catch (error) {
      console.error('Error analyzing recording:', error);
      setIsAnalyzing(false);
      Alert.alert(
        'Analysis Failed', 
        `Could not analyze your speech: ${error.message}\n\nPlease check your internet connection and try again.`,
        [
          { text: 'Try Again', onPress: () => {
            setRecordingUri(null);
            setAnalysisResult(null);
          }},
          { text: 'OK' }
        ]
      );
      return;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveSpeakingMistake = async (analysis) => {
    try {
      const mistake = {
        type: 'speaking',
        topic: topic.name,
        question: currentQuestion,
        audioFile: recordingUri,
        audioUrl: recordingUri,
        transcript: analysis.transcript,
        errors: analysis.errors,
        scores: {
          overallScore: analysis.overallScore,
          grammar: analysis.grammar,
          addressingQuestion: analysis.addressingQuestion,
          length: analysis.length
        },
        duration: recordingTime
      };
      
      await MistakesService.storeSpeakingMistake(mistake, currentUserId);
      console.log('Speaking mistake saved successfully');
    } catch (error) {
      console.error('Error saving speaking mistake:', error);
    }
  };

  const handleMicrophonePress = () => {
    console.log('Microphone pressed, current state - isRecording:', isRecording, 'isAnalyzing:', isAnalyzing);
    if (!isRecording && !isAnalyzing) {
      startRecording();
    }
  };

  const handleMicrophoneRelease = () => {
    console.log('Microphone released, current state - isRecording:', isRecording);
    if (isRecording) {
      stopRecording();
    }
  };

  const handleTryAgain = () => {
    setAnalysisResult(null);
    setRecordingTime(0);
    setRecordingUri(null);
  };

  const handleNewQuestion = () => {
    generateNewQuestion();
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#34C759';
    if (score >= 80) return '#FF9500';
    if (score >= 70) return '#FF3B30';
    return '#8E8E93';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Needs work';
    return 'Poor';
  };

  if (analysisResult) {
    return (
      <Layout>
        <Header title="Speaking Practice" />
        <View style={styles.container}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>🎉 Analysis Complete!</Text>
            <Text style={styles.overallScore}>📊 Overall Score: {analysisResult.overallScore}/100</Text>
            
            <View style={styles.scoresContainer}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>📝 Grammar</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(analysisResult.grammar) }]}>
                  {analysisResult.grammar}/100
                </Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>🎯 Addressing Question</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(analysisResult.addressingQuestion) }]}>
                  {analysisResult.addressingQuestion}/100
                </Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>📏 Length</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(analysisResult.length) }]}>
                  {analysisResult.length}/100
                </Text>
              </View>
            </View>
            
            {/* Show alternative suggestion if available and no errors */}
            {analysisResult.alternative && analysisResult.alternative.trim() && 
             (!analysisResult.errors || analysisResult.errors.length === 0) && (
              <View style={styles.alternativeContainer}>
                <Text style={styles.alternativeTitle}>💡 Alternative Suggestion:</Text>
                <Text style={styles.alternativeText}>"{analysisResult.alternative}"</Text>
                <Text style={styles.alternativeNote}>
                  This is an enhanced version of your response that could make it even better!
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <DuoButton
                onPress={handleTryAgain}
                style={styles.actionButton}
                variant="secondary"
              >
                <Text style={styles.buttonText}>🔄 Try Again</Text>
              </DuoButton>
              <DuoButton
                onPress={handleNewQuestion}
                style={styles.actionButton}
                variant="primary"
              >
                <Text style={styles.buttonText}>✨ New Question</Text>
              </DuoButton>
            </View>
          </View>
        </View>
      </Layout>
    );
  }

  if (isAnalyzing) {
    return (
      <Layout>
        <Header title="Speaking Practice" />
        <View style={styles.container}>
          <View style={styles.analyzingContainer}>
            <Text style={styles.analyzingTitle}>🤖 Analyzing your speech...</Text>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>🎧</Text>
            </View>
            <Text style={styles.analyzingSubtitle}>Please wait while I process your recording...</Text>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Speaking Practice" />
      <View style={styles.container}>
        <View style={styles.topicContainer}>
          <Text style={styles.topicTitle}>🎯 {topic.name}</Text>
          <Text style={styles.questionText}>{currentQuestion}</Text>
        </View>

        <View style={styles.recordingContainer}>
          <View style={styles.microphoneSection}>
            <Pressable
              style={[
                styles.microphoneButton,
                isRecording && styles.microphoneButtonActive
              ]}
              onPressIn={handleMicrophonePress}
              onPressOut={handleMicrophoneRelease}
              disabled={isAnalyzing}
            >
              <Text style={styles.microphoneEmoji}>
                {isRecording ? "🔴" : "🎤"}
              </Text>
            </Pressable>
            
            <Text style={styles.instructionText}>
              {isRecording ? "🗣️ Recording..." : "🎙️ Hold to speak"}
            </Text>
          </View>
          
          <View style={styles.infoSection}>
            <View style={styles.dynamicContent}>
              {isRecording && (
                <View style={styles.audioLevelContainer}>
                  <Text style={styles.audioWave}>🌊 Audio Level</Text>
                  <View style={styles.audioLevelBar}>
                    {[...Array(8)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.audioLevelSegment,
                          i < audioLevel && styles.audioLevelSegmentActive
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
              
              {isRecording && (
                <Text style={styles.releaseText}>Release to analyze 🚀</Text>
              )}
            </View>
            
            <View style={styles.staticContent}>
              <Text style={styles.timerText}>
                ⏱️ {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
              </Text>
              
              <Text style={styles.tipText}>
                💡 Hold the microphone button and speak clearly
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  topicContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1CB0F6',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  recordingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microphoneSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1CB0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  microphoneButtonActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
    borderColor: '#FF3B30',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  infoSection: {
    alignItems: 'center',
    minHeight: 200,
  },
  dynamicContent: {
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'flex-start',
  },
  staticContent: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  audioLevelContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  audioWave: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  audioLevelBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
  },
  audioLevelSegment: {
    width: 4,
    height: 6,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  audioLevelSegmentActive: {
    backgroundColor: '#34C759',
    height: 24,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 20,
  },
  tipText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 10,
  },
  releaseText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1CB0F6',
    marginBottom: 30,
  },
  loadingContainer: {
    marginBottom: 30,
  },
  loadingEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 20,
  },
  overallScore: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1CB0F6',
    marginBottom: 30,
  },
  scoresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#ffffff',
  },
  microphoneEmoji: {
    fontSize: 60,
  },
  alternativeContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  alternativeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1CB0F6',
    marginBottom: 12,
  },
  alternativeText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  alternativeNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default SpeakingScreen; 