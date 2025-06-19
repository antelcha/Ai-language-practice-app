import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Layout from '../../components/Layout';
import Header from '../../components/Header';

const topics = [
  { 
    id: 'random', 
    name: 'Random Topic', 
    icon: 'shuffle', 
    color: '#1CB0F6',
    description: 'Get a random topic for your writing practice'
  },
  { 
    id: '1', 
    name: 'Technology', 
    icon: 'hardware-chip', 
    color: '#5856D6',
    description: 'AI, future tech, and digital transformation'
  },
  { 
    id: '2', 
    name: 'Family', 
    icon: 'people', 
    color: '#FF2D55',
    description: 'Relationships, parenting, and family dynamics'
  },
  { 
    id: '3', 
    name: 'Life', 
    icon: 'heart', 
    color: '#FF9500',
    description: 'Personal growth, experiences, and lifestyle'
  },
  { 
    id: '4', 
    name: 'Education', 
    icon: 'school', 
    color: '#00C7BE',
    description: 'Learning, teaching, and academic development'
  },
  { 
    id: '5', 
    name: 'Career', 
    icon: 'briefcase', 
    color: '#34C759',
    description: 'Professional growth and workplace dynamics'
  },
  { 
    id: '6', 
    name: 'Society', 
    icon: 'globe', 
    color: '#007AFF',
    description: 'Culture, social issues, and community'
  },
  { 
    id: '7', 
    name: 'Environment', 
    icon: 'leaf', 
    color: '#FF3B30',
    description: 'Nature, sustainability, and climate'
  },
  { 
    id: '8', 
    name: 'Health', 
    icon: 'fitness', 
    color: '#AF52DE',
    description: 'Wellness, fitness, and mental health'
  }
];

const TopicCard = ({ item, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.topicCard,
      { backgroundColor: item.color },
      pressed && styles.topicCardPressed
    ]}
    onPress={() => onPress(item)}
  >
    <View style={styles.topicIconContainer}>
      <Ionicons 
        name={item.icon} 
        size={28}
        color="#ffffff" 
      />
    </View>
    <Text style={styles.topicName}>{item.name}</Text>
    <Text style={styles.topicDescription} numberOfLines={2}>
      {item.description}
    </Text>
  </Pressable>
);

const ListHeader = () => (
  <View style={styles.headerContainer}>
    <Text style={styles.title}>Choose a Topic</Text>
    <Text style={styles.subtitle}>Select a topic to practice your writing skills</Text>
  </View>
);

const WritingProScreen = ({ navigation }) => {
  const handleTopicSelect = (topic) => {
    if (topic.id === 'random') {
      const regularTopics = topics.slice(1);
      const randomTopic = regularTopics[Math.floor(Math.random() * regularTopics.length)];
      navigation.navigate('WritingQuestion', { topic: randomTopic });
    } else {
      navigation.navigate('WritingQuestion', { topic });
    }
  };

  return (
    <Layout>
      <Header title="Writing Pro" />
      <FlatList
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        data={topics}
        renderItem={({ item }) => (
          <View style={styles.topicGrid}>
            <TopicCard item={item} onPress={handleTopicSelect} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1CB0F6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 24,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topicGrid: {
    width: '48%',
  },
  topicCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  topicCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  topicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  }
});

export default WritingProScreen; 