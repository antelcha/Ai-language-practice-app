import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@current_user_id';

// Singleton pattern to avoid multiple instances
let supabaseClientInstance = null;

class SupabaseService {
  constructor(config) {
    try {
      if (!config?.supabaseUrl || !config?.supabaseKey) {
        throw new Error('Supabase URL and Key are required');
      }

      if (!supabaseClientInstance) {
        supabaseClientInstance = createClient(config.supabaseUrl, config.supabaseKey, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            // Add error handling for auth state changes
            onAuthStateChange: (event, session) => {
              console.log('Auth state change:', event, session?.user?.id);
            }
          },
          // Add global error handling
          global: {
            headers: {
              'x-my-custom-header': 'aiApp'
            }
          }
        });
      }
      this.supabase = supabaseClientInstance;
      this.tables = config.tables;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  // Simple user management (no auth)
  async createUser(email, firstName, lastName, learningGoal) {
    const { data, error } = await this.supabase
      .from(this.tables.users)
      .insert([
        {
          email,
          first_name: firstName,
          last_name: lastName,
          learning_goal: learningGoal,
        },
      ])
      .select();

    if (error) throw error;
    
    const user = data[0];
    // Create analytics and settings for new user
    await this.createUserAnalytics(user.id);
    await this.createUserSettings(user.id);
    
    return user;
  }

  async getUserByEmail(email) {
    const { data, error } = await this.supabase
      .from(this.tables.users)
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async setCurrentUser(userId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, userId.toString());
    } catch (error) {
      console.error('Error storing user ID:', error);
    }
  }

  async getCurrentUserId() {
    try {
      const userId = await AsyncStorage.getItem(STORAGE_KEY);
      if (userId && !isNaN(parseInt(userId))) {
        return parseInt(userId);
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      // Clear corrupted data
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (clearError) {
        console.error('Error clearing corrupted user ID:', clearError);
      }
      return null;
    }
  }

  async clearCurrentUser() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing user ID:', error);
    }
  }

  // User Profile methods
  async getUserProfile(userId) {
    try {
      if (!userId || isNaN(parseInt(userId))) {
        console.warn('Invalid userId provided to getUserProfile:', userId);
        return null;
      }

      const { data, error } = await this.supabase
        .from(this.tables.users)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user doesn't exist
          console.log('User not found in database:', userId);
          return null;
        }
        console.error('Database error in getUserProfile:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('getUserProfile failed:', error);
      // Don't re-throw to prevent crashes
      return null;
    }
  }

  async updateUserProfile(userId, updates) {
    const { data, error } = await this.supabase
      .from(this.tables.users)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data[0];
  }

  // Writing History methods
  async saveWritingHistory(userId, writingData) {
    const { data, error } = await this.supabase
      .from(this.tables.writingHistory)
      .insert([
        {
          user_id: userId,
          question: writingData.question,
          topic: writingData.topic,
          original_text: writingData.originalText,
          errors: JSON.stringify(writingData.errors || []),
          corrected_text: writingData.correctedText,
          score: writingData.score,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

  async getWritingHistory(userId, limit = 50) {
    const { data, error } = await this.supabase
      .from(this.tables.writingHistory)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Parse JSON strings back to objects
    return data.map(item => ({
      ...item,
      errors: JSON.parse(item.errors || '[]')
    }));
  }

  async deleteWritingHistory(userId, historyId) {
    const { error } = await this.supabase
      .from(this.tables.writingHistory)
      .delete()
      .eq('user_id', userId)
      .eq('id', historyId);

    if (error) throw error;
    return { success: true };
  }

  // Speaking History methods
  async saveSpeakingHistory(userId, speakingData) {
    const { data, error } = await this.supabase
      .from(this.tables.speakingHistory)
      .insert([
        {
          user_id: userId,
          question: speakingData.question,
          topic: speakingData.topic,
          transcript: speakingData.transcript,
          audio_url: speakingData.audioUrl,
          errors: JSON.stringify(speakingData.errors || []),
          scores: JSON.stringify(speakingData.scores || {}),
          duration: speakingData.duration,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

  async getSpeakingHistory(userId, limit = 50) {
    const { data, error } = await this.supabase
      .from(this.tables.speakingHistory)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Parse JSON strings back to objects
    return data.map(item => ({
      ...item,
      errors: JSON.parse(item.errors || '[]'),
      scores: JSON.parse(item.scores || '{}')
    }));
  }

  async deleteSpeakingHistory(userId, historyId) {
    const { error } = await this.supabase
      .from(this.tables.speakingHistory)
      .delete()
      .eq('user_id', userId)
      .eq('id', historyId);

    if (error) throw error;
    return { success: true };
  }

  // Analytics methods
  async createUserAnalytics(userId) {
    const { data, error } = await this.supabase
      .from(this.tables.analytics)
      .insert([
        {
          user_id: userId,
          total_writing_sessions: 0,
          total_speaking_sessions: 0,
          total_errors_fixed: 0,
          average_writing_score: 0,
          average_speaking_score: 0,
          current_streak: 0,
          longest_streak: 0,
        },
      ])
      .select();

    if (error && error.code !== '23505') throw error;
    return data?.[0];
  }

  async getAnalytics(userId) {
    const { data, error } = await this.supabase
      .from(this.tables.analytics)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateAnalytics(userId, updates) {
    const { data, error } = await this.supabase
      .from(this.tables.analytics)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data[0];
  }

  // User Settings methods
  async createUserSettings(userId) {
    const { data, error } = await this.supabase
      .from(this.tables.userSettings)
      .insert([
        {
          user_id: userId,
          notifications_enabled: true,
          daily_goal: 1,
          preferred_topics: JSON.stringify([]),
          difficulty_level: 'intermediate',
        },
      ])
      .select();

    if (error && error.code !== '23505') throw error;
    return data?.[0];
  }

  async getUserSettings(userId) {
    const { data, error } = await this.supabase
      .from(this.tables.userSettings)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      return {
        ...data,
        preferred_topics: JSON.parse(data.preferred_topics || '[]')
      };
    }
    return data;
  }

  async updateUserSettings(userId, settings) {
    const { data, error } = await this.supabase
      .from(this.tables.userSettings)
      .update({
        ...settings,
        preferred_topics: JSON.stringify(settings.preferred_topics || []),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data[0];
  }
}

export default SupabaseService; 