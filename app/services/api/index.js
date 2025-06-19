import LLMService from './LLMService';
import { API_CONFIG } from './config';

// Create a singleton instance of the LLM service
const llmService = new LLMService(API_CONFIG);

export default llmService; 