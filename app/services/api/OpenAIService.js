import { OPENAI_API_KEY } from '@env';
import MistakesService from '../WritingMistakesService';

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const WHISPER_API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

class OpenAIService {
  static async checkWritingErrors(text, topic) {
    try {
      const response = await fetch(OPENAI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a writing assistant that checks for grammatical errors, spelling mistakes, and awkward phrasing. 
              If you find errors, provide them in the following format:
              {
                "hasErrors": true,
                "errors": [
                  {
                    "wrong": "the incorrect text",
                    "correct": "the corrected version",
                    "reason": "brief explanation of the error"
                  }
                ]
              }
              If there are no errors, respond with: {"hasErrors": false, "errors": []}`
            },
            {
              role: "user",
              content: `Check this text for writing errors: "${text}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to check writing');
      }

      const result = JSON.parse(data.choices[0].message.content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async generateQuestion(topic) {
    try {
      const prompt = `Generate a thought-provoking question about ${topic.name}. Context: ${topic.description}. 
      The question should:
      - Be specific and focused
      - Encourage critical thinking
      - Be suitable for a short response
      - Be relevant to current trends and discussions
      - Avoid yes/no answers
      Format: Return only the question, without any additional text.`;

      const response = await fetch(OPENAI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a writing instructor creating thought-provoking questions for students to practice their writing skills."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 150,
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate question');
      }

      const question = data.choices[0].message.content.trim();
      return {
        success: true,
        data: question
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Whisper API - Ses dosyasını metne çevirme (Web için blob)
  static async transcribeAudio(audioBlob) {
    try {
      console.log('Transcribing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      const formData = new FormData();
      
      // Determine the best filename based on blob type
      let filename = 'audio.webm';
      if (audioBlob.type.includes('mp4')) {
        filename = 'audio.mp4';
      } else if (audioBlob.type.includes('wav')) {
        filename = 'audio.wav';
      } else if (audioBlob.type.includes('ogg')) {
        filename = 'audio.ogg';
      }
      
      formData.append('file', audioBlob, filename);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0');
      formData.append('prompt', 'This is a clear English speech recording for language learning practice. The speaker is introducing themselves and talking about their interests. Please transcribe accurately, paying attention to names and technical terms like "coding" or "programming".');

      console.log('Sending to Whisper API with filename:', filename);

      const response = await fetch(WHISPER_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Whisper API error response:', data);
        throw new Error(data.error?.message || 'Failed to transcribe audio');
      }

      console.log('Whisper response:', {
        text: data.text,
        language: data.language,
        duration: data.duration,
        segments: data.segments?.length || 0,
        confidence: data.segments?.[0]?.avg_logprob || 'N/A'
      });

      // Check if transcription seems too short for the audio duration
      if (data.duration > 2 && data.text.trim().split(' ').length < 3) {
        console.warn('Transcription seems too short for audio duration:', {
          duration: data.duration,
          text: data.text,
          wordCount: data.text.trim().split(' ').length
        });
      }

      return {
        success: true,
        text: data.text,
        confidence: data.segments ? data.segments.map(s => s.avg_logprob) : null,
        duration: data.duration || null,
        language: data.language || null
      };
    } catch (error) {
      console.error('Whisper API Error:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // Whisper API - Ses dosyasını metne çevirme (Mobile için dosya yolu)
  static async transcribeAudioFile(audioUri) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'audio.wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0');
      formData.append('prompt', 'This is a clear English speech recording for language learning practice. Please transcribe accurately.');

      const response = await fetch(WHISPER_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to transcribe audio');
      }

      console.log('Whisper response:', data);

      return {
        success: true,
        text: data.text,
        confidence: data.segments ? data.segments.map(s => s.avg_logprob) : null,
        duration: data.duration || null
      };
    } catch (error) {
      console.error('Whisper API Error:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // Konuşma analizi - Transcript'i analiz ederek gramer, soru yanıtlama ve uzunluk skorları
  static async analyzeSpeech(transcript, question) {
    try {
      const prompt = `Analyze this English speech transcript and provide scores based on these specific criteria:

Question: "${question}"
Transcript: "${transcript}"

Please analyze and return ONLY a valid JSON response with:
{
  "overallScore": number (0-100),
  "grammar": number (0-100),
  "addressingQuestion": number (0-100), 
  "length": number (0-100),
  "transcript": "${transcript}",
  "errors": [
    {
      "type": "grammar|question|length",
      "wrong": "incorrect text",
      "correct": "corrected text",
      "reason": "explanation"
    }
  ],
  "alternative": "An improved version of the response (only if there are significant issues to improve)"
}

Scoring criteria:
- Grammar (0-100): Evaluate grammatical correctness, sentence structure, verb tenses, articles, prepositions, and overall language accuracy
- Addressing Question (0-100): How well the response answers the specific question asked. Does it stay on topic? Does it provide relevant information? Is it a complete answer?
- Length (0-100): Evaluate if the response length is appropriate. Too short (under 20 words) = low score. Good length (20-100 words) = high score. Too long or repetitive = medium score
- Overall: Average of the three scores

Error handling:
- Only include errors in the "errors" array if there are actual mistakes that need correction
- If there are no significant errors but the response could be improved, provide an "alternative" suggestion
- If the response is good as is, leave "errors" array empty and "alternative" as empty string

Focus on constructive feedback for English language learners.

IMPORTANT: Return ONLY the JSON object, no additional text or explanations.`;

      const response = await fetch(OPENAI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an English language teacher specializing in speech analysis. You must respond with ONLY valid JSON, no additional text. Focus on grammar, question relevance, and response length. Only provide errors when there are actual mistakes, and suggest alternatives when helpful."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Whisper API error response:', data);
        throw new Error(data.error?.message || 'Failed to analyze speech');
      }

      let responseContent = data.choices[0].message.content.trim();
      
      // Extract JSON from the response (handle cases where there might be extra text)
      let jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseContent = jsonMatch[0];
      }
      
      // Try to parse the JSON
      let result;
      try {
        result = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response content:', responseContent);
        
        // Fallback: create a basic response structure
        result = {
          overallScore: 75,
          grammar: 75,
          addressingQuestion: 75,
          length: 75,
          transcript: transcript,
          errors: [],
          alternative: ""
        };
      }
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('Speech Analysis Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default OpenAIService; 