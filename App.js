import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './app/screens/auth/LoginScreen';
import HomeScreen from './app/screens/home/HomeScreen';
import WritingProScreen from './app/screens/writing/WritingProScreen';
import WritingQuestionScreen from './app/screens/writing/WritingQuestionScreen';
import SpeakingScreen from './app/screens/speaking/SpeakingScreen';
import MistakesScreen from './app/screens/mistakes/MistakesScreen';
import WritingHistoryScreen from './app/screens/history/WritingHistoryScreen';
import SpeakingHistoryScreen from './app/screens/history/SpeakingHistoryScreen';
import ProfileScreen from './app/screens/profile/ProfileScreen';
import { Platform, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SUPABASE_CONFIG } from './app/services/supabase/config';
import SupabaseService from './app/services/supabase/SupabaseService';

// Global error handlers to prevent native crashes
const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  const originalHandler = global.Promise._unhandledRejectionHandler;
  global.Promise._unhandledRejectionHandler = function(id, error) {
    console.error('Unhandled promise rejection:', error);
    // Don't let it crash the app
    if (originalHandler) {
      originalHandler(id, error);
    }
  };

  // Handle global errors
  const originalErrorHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    console.error('Global error:', error, 'isFatal:', isFatal);
    // Don't let non-fatal errors crash the app
    if (isFatal) {
      // Only call original handler for truly fatal errors
      originalErrorHandler?.(error, isFatal);
    }
  });
};

// Set up error handlers immediately
setupGlobalErrorHandlers();

const Stack = createNativeStackNavigator();

// Validate configuration before creating service
const validateConfig = () => {
  if (!SUPABASE_CONFIG?.supabaseUrl || !SUPABASE_CONFIG?.supabaseKey) {
    throw new Error('Supabase configuration is missing URL or Key');
  }
  if (!SUPABASE_CONFIG.supabaseUrl.startsWith('https://')) {
    throw new Error('Supabase URL must start with https://');
  }
  return true;
};

let supabaseService;
try {
  validateConfig();
  supabaseService = new SupabaseService(SUPABASE_CONFIG);
} catch (error) {
  console.error('Failed to initialize app:', error);
  // Fallback service or error handling
  supabaseService = null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      // Check if service is available
      if (!supabaseService) {
        console.error('SupabaseService not initialized');
        setInitError('Failed to initialize database connection');
        setIsLoggedIn(false);
        return;
      }

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 10000)
      );
      
      const sessionPromise = (async () => {
        const userId = await supabaseService.getCurrentUserId();
        console.log('Current user ID:', userId);
        
        if (userId) {
          // Verify user still exists in database
          const user = await supabaseService.getUserProfile(userId);
          console.log('User profile:', user);
          return !!user;
        } else {
          console.log('No user ID found');
          return false;
        }
      })();

      const isLoggedIn = await Promise.race([sessionPromise, timeoutPromise]);
      setIsLoggedIn(isLoggedIn);
      
    } catch (error) {
      console.error('Session check error:', error);
      setIsLoggedIn(false);
      setInitError(`Session check failed: ${error.message}`);
      
      // Clear potentially corrupted data
      if (supabaseService) {
        try {
          await supabaseService.clearCurrentUser();
        } catch (clearError) {
          console.error('Error clearing user data:', clearError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Development only: Show error state
  if (__DEV__ && initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 20 }}>
          App Initialization Error:
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          {initError}
        </Text>
        <Text style={{ textAlign: 'center', fontSize: 12, color: 'gray' }}>
          This error screen only appears in development mode.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  console.log('App render - isLoggedIn:', isLoggedIn);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#ffffff' },
              animation: Platform.select({ ios: 'default', android: 'fade' })
            }}
            initialRouteName={isLoggedIn ? "Home" : "Login"}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="WritingPro" component={WritingProScreen} />
            <Stack.Screen name="WritingQuestion" component={WritingQuestionScreen} />
            <Stack.Screen name="Speaking" component={SpeakingScreen} />
            <Stack.Screen name="Mistakes" component={MistakesScreen} />
            <Stack.Screen name="WritingHistory" component={WritingHistoryScreen} />
            <Stack.Screen name="SpeakingHistory" component={SpeakingHistoryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
