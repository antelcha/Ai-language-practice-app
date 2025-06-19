import AsyncStorage from '@react-native-async-storage/async-storage';
import SupabaseService from './supabase/SupabaseService';
import { SUPABASE_CONFIG } from './supabase/config';

class MistakesService {
  static WRITING_STORAGE_KEY = '@writing_mistakes';
  static SPEAKING_STORAGE_KEY = '@speaking_mistakes';
  static supabaseService = new SupabaseService(SUPABASE_CONFIG);

  // Writing mistakes methods
  static async storeMistake(data, userId = null) {
    try {
      const mistake = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        question: data.question,
        answer: data.originalText,
        errors: data.errors,
        type: 'writing'
      };

      // Store locally for backward compatibility
      const mistakes = await this.getAllMistakes();
      mistakes.push(mistake);
      await AsyncStorage.setItem(this.WRITING_STORAGE_KEY, JSON.stringify(mistakes));

      // Store in Supabase if user is logged in
      if (userId) {
        await this.supabaseService.saveWritingHistory(userId, {
          question: data.question,
          topic: data.topic,
          originalText: data.originalText,
          errors: data.errors,
          correctedText: data.correctedText,
          score: data.score
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error storing mistake:', error);
      return { success: false, error: error.message };
    }
  }

  static async storeSpeakingMistake(data, userId = null) {
    try {
      const mistake = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'speaking',
        topic: data.topic,
        question: data.question,
        audioFile: data.audioFile,
        transcript: data.transcript,
        errors: data.errors,
        scores: data.scores
      };

      // Store locally for backward compatibility
      const mistakes = await this.getAllSpeakingMistakes();
      mistakes.push(mistake);
      await AsyncStorage.setItem(this.SPEAKING_STORAGE_KEY, JSON.stringify(mistakes));

      // Store in Supabase if user is logged in
      if (userId) {
        await this.supabaseService.saveSpeakingHistory(userId, {
          question: data.question,
          topic: data.topic,
          transcript: data.transcript,
          audioUrl: data.audioUrl,
          errors: data.errors,
          scores: data.scores,
          duration: data.duration
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error storing speaking mistake:', error);
      return { success: false, error: error.message };
    }
  }

  // Get methods - prioritize Supabase data if available
  static async getAllMistakes(userId = null) {
    try {
      if (userId) {
        // Get from Supabase
        const supabaseData = await this.supabaseService.getWritingHistory(userId);
        return supabaseData.map(item => ({
          id: item.id.toString(),
          date: item.created_at,
          question: item.question,
          answer: item.original_text,
          errors: item.errors,
          type: 'writing',
          topic: item.topic,
          score: item.score
        }));
      } else {
        // Fallback to local storage
        const mistakes = await AsyncStorage.getItem(this.WRITING_STORAGE_KEY);
        return mistakes ? JSON.parse(mistakes) : [];
      }
    } catch (error) {
      console.error('Error getting mistakes:', error);
      // Fallback to local storage on error
      const mistakes = await AsyncStorage.getItem(this.WRITING_STORAGE_KEY);
      return mistakes ? JSON.parse(mistakes) : [];
    }
  }

  static async getAllSpeakingMistakes(userId = null) {
    try {
      if (userId) {
        // Get from Supabase
        const supabaseData = await this.supabaseService.getSpeakingHistory(userId);
        return supabaseData.map(item => ({
          id: item.id.toString(),
          date: item.created_at,
          type: 'speaking',
          topic: item.topic,
          question: item.question,
          audioFile: item.audio_url,
          transcript: item.transcript,
          errors: item.errors,
          scores: item.scores
        }));
      } else {
        // Fallback to local storage
        const mistakes = await AsyncStorage.getItem(this.SPEAKING_STORAGE_KEY);
        return mistakes ? JSON.parse(mistakes) : [];
      }
    } catch (error) {
      console.error('Error getting speaking mistakes:', error);
      // Fallback to local storage on error
      const mistakes = await AsyncStorage.getItem(this.SPEAKING_STORAGE_KEY);
      return mistakes ? JSON.parse(mistakes) : [];
    }
  }

  static async getAllCombinedMistakes(userId = null) {
    try {
      const writingMistakes = await this.getAllMistakes(userId);
      const speakingMistakes = await this.getAllSpeakingMistakes(userId);
      
      const typedWritingMistakes = writingMistakes.map(mistake => ({
        ...mistake,
        type: mistake.type || 'writing'
      }));
      
      const allMistakes = [...typedWritingMistakes, ...speakingMistakes];
      allMistakes.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return allMistakes;
    } catch (error) {
      console.error('Error getting combined mistakes:', error);
      return [];
    }
  }

  static async getMistakesByDateAndQuestion(userId = null) {
    try {
      const mistakes = await this.getAllCombinedMistakes(userId);
      
      const groupedByDate = mistakes.reduce((acc, mistake) => {
        const date = new Date(mistake.date).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(mistake);
        return acc;
      }, {});

      const result = {};
      Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const questionsForDate = groupedByDate[date].reduce((acc, mistake) => {
          const questionKey = `${mistake.type}_${mistake.question}`;
          const found = acc.find(q => q.questionKey === questionKey);
          if (found) {
            found.attempts.push({
              id: mistake.id,
              answer: mistake.answer || mistake.transcript,
              errors: mistake.errors,
              date: mistake.date,
              type: mistake.type,
              scores: mistake.scores,
              audioFile: mistake.audioFile
            });
          } else {
            acc.push({
              questionKey,
              question: mistake.question,
              type: mistake.type,
              topic: mistake.topic,
              attempts: [{
                id: mistake.id,
                answer: mistake.answer || mistake.transcript,
                errors: mistake.errors,
                date: mistake.date,
                type: mistake.type,
                scores: mistake.scores,
                audioFile: mistake.audioFile
              }]
            });
          }
          return acc;
        }, []);
        result[date] = questionsForDate;
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error grouping mistakes:', error);
      return { success: false, error: error.message };
    }
  }

  static async getMistakesByTopic(userId = null) {
    try {
      const mistakes = await this.getAllCombinedMistakes(userId);
      const grouped = mistakes.reduce((acc, mistake) => {
        const topicName = mistake.topic?.name || mistake.topic || 'Uncategorized';
        if (!acc[topicName]) {
          acc[topicName] = [];
        }
        acc[topicName].push(mistake);
        return acc;
      }, {});

      const sortedTopics = Object.keys(grouped).sort();
      const sortedGrouped = {};
      sortedTopics.forEach(topic => {
        sortedGrouped[topic] = grouped[topic];
      });

      return { success: true, data: sortedGrouped };
    } catch (error) {
      console.error('Error grouping by topic:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteMistake(mistakeId, type = 'writing', userId = null) {
    try {
      if (userId) {
        // Delete from Supabase
        if (type === 'speaking') {
          await this.supabaseService.deleteSpeakingHistory(userId, mistakeId);
        } else {
          await this.supabaseService.deleteWritingHistory(userId, mistakeId);
        }
      }

      // Also delete from local storage for backward compatibility
      const storageKey = type === 'speaking' ? this.SPEAKING_STORAGE_KEY : this.WRITING_STORAGE_KEY;
      const mistakes = type === 'speaking' ? await this.getAllSpeakingMistakes() : await this.getAllMistakes();
      const updatedMistakes = mistakes.filter(m => m.id !== mistakeId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMistakes));

      return { success: true };
    } catch (error) {
      console.error('Error deleting mistake:', error);
      return { success: false, error: error.message };
    }
  }

  static async clearAllMistakes() {
    try {
      await AsyncStorage.removeItem(this.WRITING_STORAGE_KEY);
      await AsyncStorage.removeItem(this.SPEAKING_STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Error clearing mistakes:', error);
      return { success: false, error: error.message };
    }
  }

  // Migration method to move local data to Supabase
  static async migrateLocalDataToSupabase(userId) {
    try {
      const localWriting = await AsyncStorage.getItem(this.WRITING_STORAGE_KEY);
      const localSpeaking = await AsyncStorage.getItem(this.SPEAKING_STORAGE_KEY);

      if (localWriting) {
        const writingMistakes = JSON.parse(localWriting);
        for (const mistake of writingMistakes) {
          await this.supabaseService.saveWritingHistory(userId, {
            question: mistake.question,
            topic: mistake.topic || 'General',
            originalText: mistake.answer,
            errors: mistake.errors,
            correctedText: '',
            score: 0
          });
        }
      }

      if (localSpeaking) {
        const speakingMistakes = JSON.parse(localSpeaking);
        for (const mistake of speakingMistakes) {
          await this.supabaseService.saveSpeakingHistory(userId, {
            question: mistake.question,
            topic: mistake.topic || 'General',
            transcript: mistake.transcript,
            audioUrl: mistake.audioFile,
            errors: mistake.errors,
            scores: mistake.scores,
            duration: 0
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error migrating data:', error);
      return { success: false, error: error.message };
    }
  }
}

export default MistakesService; 