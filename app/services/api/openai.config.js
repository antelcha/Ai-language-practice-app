import OpenAI from 'openai';
import Constants from 'expo-constants';

const openai = new OpenAI({
  apiKey: Constants.expoConfig.extra.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for React Native
});

export default openai; 