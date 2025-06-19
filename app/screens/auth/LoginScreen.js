import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SUPABASE_CONFIG } from '../../services/supabase/config';
import SupabaseService from '../../services/supabase/SupabaseService';

const supabaseService = new SupabaseService(SUPABASE_CONFIG);

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      // Check if user exists
      const existingUser = await supabaseService.getUserByEmail(email.trim());
      
      if (existingUser) {
        // User exists, log them in
        await supabaseService.setCurrentUser(existingUser.id);
        
        // Reset navigation stack and go to Home
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // User doesn't exist, show registration form
        setIsNewUser(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to check user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in your name');
      return;
    }

    setIsLoading(true);
    try {
      // Create new user
      const newUser = await supabaseService.createUser(
        email.trim(),
        firstName.trim(),
        lastName.trim(),
        learningGoal.trim() || 'Improve English skills'
      );
      
      // Set as current user
      await supabaseService.setCurrentUser(newUser.id);
      
      Alert.alert('Welcome!', 'Your account has been created successfully.', [
        { 
          text: 'OK', 
          onPress: () => {
            // Reset navigation stack and go to Home
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }
        }
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setIsNewUser(false);
    setFirstName('');
    setLastName('');
    setLearningGoal('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {isNewUser ? 'Create Account' : 'Welcome to AI English'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isNewUser 
            ? 'Please complete your profile' 
            : 'Enter your email to continue'
          }
        </Text>

        {!isNewUser ? (
          // Email input for login/check
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleEmailSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Registration form
          <View style={styles.form}>
            <Text style={styles.emailDisplay}>Email: {email}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Learning Goal (optional)"
              value={learningGoal}
              onChangeText={setLearningGoal}
              multiline
              numberOfLines={2}
            />
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  emailDisplay: {
    fontSize: 16,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default LoginScreen; 