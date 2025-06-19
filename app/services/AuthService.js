import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from './supabase';

class AuthService {
  static AUTH_TOKEN_KEY = '@auth_token';
  static USER_DATA_KEY = '@user_data';

  static async logout() {
    try {
      // Only sign out from Supabase but keep the stored session
      const { error } = await supabaseService.supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AuthService; 