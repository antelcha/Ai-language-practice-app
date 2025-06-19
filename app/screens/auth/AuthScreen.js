import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import supabaseService from '../../services/supabase';
import DuoButton from '../../components/DuoButton';
import Layout from '../../components/Layout';
import { useNavigation } from '@react-navigation/native';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [storedSession, setStoredSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const session = await supabaseService.getStoredSession();
      setStoredSession(session);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleQuickLogin = async () => {
    try {
      setLoading(true);
      const success = await supabaseService.restoreSession();
      if (!success) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        await supabaseService.clearSession();
        setStoredSession(null);
      } else {
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore session. Please sign in again.');
      await supabaseService.clearSession();
      setStoredSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      if (isLogin) {
        await supabaseService.signIn(email, password);
        navigation.replace('Home');
      } else {
        await supabaseService.signUp(email, password);
        Alert.alert('Success', 'Please check your email for verification');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const ButtonContent = ({ text, isLoading }) => (
    <View style={styles.buttonContent}>
      {isLoading ? (
        <ActivityIndicator color="#ffffff" size={20} />
      ) : (
        <Text style={styles.buttonText}>{text}</Text>
      )}
    </View>
  );

  return (
    <Layout>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.title}>
          {isLogin ? 'Welcome back!' : 'Join now'}
        </Text>

        {checkingSession ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size={20} color="#58cc02" />
          </View>
        ) : storedSession?.user ? (
          <View style={styles.quickLoginContainer}>
            <Text style={styles.quickLoginText}>
              Welcome back, {storedSession.user.email}
            </Text>
            <DuoButton
              onPress={handleQuickLogin}
              disabled={loading}
              variant="primary"
            >
              <ButtonContent 
                text="Continue session"
                isLoading={loading} 
              />
            </DuoButton>
            <TouchableOpacity
              onPress={() => setStoredSession(null)}
              style={styles.switchAuth}
              disabled={loading}
            >
              <Text style={styles.switchAuthText}>
                Use a different account
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
              
              <DuoButton
                onPress={handleEmailAuth}
                disabled={loading}
                variant="primary"
              >
                <ButtonContent 
                  text={isLogin ? 'Sign in' : 'Create account'}
                  isLoading={loading} 
                />
              </DuoButton>
            </View>

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchAuth}
              disabled={loading}
            >
              <Text style={[
                styles.switchAuthText,
                loading && styles.switchAuthTextDisabled
              ]}>
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    height: 48,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtons: {
    marginTop: 16,
    gap: 12,
  },
  switchAuth: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#58cc02',
    fontSize: 14,
    fontWeight: '600',
  },
  switchAuthTextDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLoginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  quickLoginText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
});

export default AuthScreen; 