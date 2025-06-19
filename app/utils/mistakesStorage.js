import AsyncStorage from '@react-native-async-storage/async-storage';

const MISTAKES_KEY = '@writing_mistakes';

export const saveMistake = async (mistake) => {
  try {
    const existingMistakes = await getMistakes();
    const updatedMistakes = [...existingMistakes, mistake];
    await AsyncStorage.setItem(MISTAKES_KEY, JSON.stringify(updatedMistakes));
    return true;
  } catch (error) {
    console.error('Error saving mistake:', error);
    return false;
  }
};

export const getMistakes = async () => {
  try {
    const mistakes = await AsyncStorage.getItem(MISTAKES_KEY);
    return mistakes ? JSON.parse(mistakes) : [];
  } catch (error) {
    console.error('Error getting mistakes:', error);
    return [];
  }
};

export const deleteMistake = async (mistakeToDelete) => {
  try {
    const existingMistakes = await getMistakes();
    const updatedMistakes = existingMistakes.filter(
      mistake => 
        mistake.wrong !== mistakeToDelete.wrong ||
        mistake.correct !== mistakeToDelete.correct ||
        mistake.reason !== mistakeToDelete.reason ||
        mistake.timestamp !== mistakeToDelete.timestamp
    );
    await AsyncStorage.setItem(MISTAKES_KEY, JSON.stringify(updatedMistakes));
    return true;
  } catch (error) {
    console.error('Error deleting mistake:', error);
    return false;
  }
};

export const clearMistakes = async () => {
  try {
    await AsyncStorage.setItem(MISTAKES_KEY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing mistakes:', error);
    return false;
  }
}; 