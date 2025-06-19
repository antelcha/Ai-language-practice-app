import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Layout from '../../components/Layout';
import Header from '../../components/Header';
import SupabaseService from '../../services/supabase/SupabaseService';
import { SUPABASE_CONFIG } from '../../services/supabase/config';

const MenuItem = ({ title, subtitle, icon, color, onPress }) => (
  <Pressable 
    style={({ pressed }) => [
      styles.menuItem,
      { backgroundColor: color },
      pressed && styles.menuItemPressed
    ]}
    onPress={onPress}
  >
    <View style={styles.menuContent}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
    </View>
  </Pressable>
);

const HomeScreen = () => {
  const navigation = useNavigation();
  const supabaseService = new SupabaseService(SUPABASE_CONFIG);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userId = await supabaseService.getCurrentUserId();
      if (userId) {
        const userProfile = await supabaseService.getUserProfile(userId);
        setCurrentUser(userProfile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    console.log('Logout button pressed');
    
    // Direct logout without Alert for web compatibility
    try {
      console.log('Starting logout process...');
      
      // Clear user session
      await supabaseService.clearCurrentUser();
      console.log('User session cleared');
      
      // Force navigation to Login and clear stack
      navigation.navigate('Login');
      
      // Also try to reset the stack after a small delay
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 100);
      
      console.log('Navigation reset complete');
    } catch (error) {
      console.error('Logout error:', error);
      // Use a simple alert for error
      alert('Failed to logout');
    }
  };

  const menuItems = [
    {
      id: '1',
      title: 'Writing Pro',
      description: 'Practice writing with AI-generated topics',
      icon: 'pencil-box',
      color: '#FF1744',
      onPress: () => navigation.navigate('WritingPro')
    },
    {
      id: '2',
      title: 'Speaking Practice',
      description: 'Improve your pronunciation and fluency',
      icon: 'microphone-variant',
      color: '#00E676',
      onPress: () => navigation.navigate('Speaking', { topic: { name: 'Technology' } })
    },
    {
      id: '3',
      title: 'Writing History',
      description: 'View your past writing practices',
      icon: 'file-document-multiple',
      color: '#2196F3',
      onPress: () => navigation.navigate('WritingHistory')
    },
    {
      id: '4',
      title: 'Speaking History',
      description: 'Review your speaking practice sessions',
      icon: 'chat-processing',
      color: '#FF9800',
      onPress: () => navigation.navigate('SpeakingHistory')
    }
  ];

  return (
    <Layout>
      <Header 
        title="AI Writing Assistant" 
        showBack={false}
        rightComponent={
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            >
              <MaterialCommunityIcons name="account-circle" size={24} color="#FF5722" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#E91E63" />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              title={item.title}
              subtitle={item.description}
              icon={item.icon}
              color={item.color}
              onPress={item.onPress}
            />
          ))}
        </View>

        <View style={styles.achievementSection}>
          <View style={styles.achievementHeader}>
            <MaterialCommunityIcons name="trophy-award" size={24} color="#F6BA1E" />
            <Text style={styles.achievementTitle}>Achievements</Text>
          </View>
          <Text style={styles.achievementText}>Complete tasks to earn XP and unlock achievements!</Text>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 16,
  },
  welcomeSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1CB0F6',
    marginBottom: 8,
  },
  streakText: {
    fontSize: 16,
    color: '#FF9600',
    fontWeight: '600',
  },
  menuSection: {
    gap: 12,
  },
  menuItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  achievementSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF5D9',
    borderRadius: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6BA1E',
    marginLeft: 8,
  },
  achievementText: {
    fontSize: 14,
    color: '#B49512',
    lineHeight: 20,
  },
  logoutButton: {
    padding: 8,
    marginRight: -8,
    borderRadius: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
  },
});

export default HomeScreen; 