import { config } from '../config/env.js';
import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';

export const INTAKE_SYSTEM_PROMPT = `
You are a warm, professional, and empathetic medical intake voice assistant conducting a preliminary health screening.
Your goal is to collect the following information efficiently and gently:
1. Patient's Name
2. Primary Symptom / Chief Complaint (what is bothering them)
3. Onset and Duration (when did it start and how long has it been going on)
4. Severity rating (either qualitative like "very bad" / "mild", or on a scale from 1 to 10)
5. Any secondary or associated symptoms (e.g., fever, dizziness, nausea)

RULES:
- Ask only ONE question at a time. Do not ask for name and symptoms in the same turn.
- Keep responses concise (maximum 1-2 short sentences) since your output will be converted to speech. Longer responses sound unnatural over voice.
- Be supportive, validating the patient's concerns (e.g., "I'm sorry to hear you're feeling that way. How long has this...").
- If the user's response is vague, ask a brief clarifying follow-up question.
- Speak in simple language, avoiding overly complex clinical terminology.
- You must adapt to the user's language. If they greet or respond in Hindi, communicate in Hindi. If they use a mix of Hindi and English (Hinglish), you can respond in simple, clear Hindi or Hinglish that is easy to understand.
- When you have collected all 5 pieces of information, thank the patient and state clearly: "Thank you for sharing this. I have gathered all the necessary information for your screening report. I will wrap up the call now and generate your report. Please click 'End Call' to view it."
`;

let openaiClient = null;
let geminiClient = null;

if (config.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

if (config.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
}

/**
 * Generate AI Response based on transcript history
 * @param {Array} history - Array of { role: 'user'|'assistant', content: string }
 * @returns {Promise<string>}
 */
export async function getAIResponse(history) {
  let openaiError = null;
  let geminiError = null;

  // Try OpenAI
  if (openaiClient) {
    try {
      console.log('[LLM] Calling OpenAI API (gpt-4o-mini)...');
      const messages = [
        { role: 'system', content: INTAKE_SYSTEM_PROMPT },
        ...history
      ];
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 150,
        temperature: 0.7,
      });
      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('[LLM] OpenAI Error:', error);
      openaiError = error;
    }
  }

  // Try Gemini
  if (geminiClient) {
    try {
      console.log('[LLM] Calling Gemini API (gemini-2.0-flash)...');
      
      // Map history to Gemini API format
      const contents = history.map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }]
      }));

      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: INTAKE_SYSTEM_PROMPT,
          maxOutputTokens: 150,
          temperature: 0.7,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error('[LLM] Gemini Error:', error);
      geminiError = error;
    }
  }

  // Error reports
  if (openaiError && geminiError) {
    throw new Error(`OpenAI: ${openaiError.message} | Gemini: ${geminiError.message}`);
  } else if (openaiError) {
    throw new Error(`OpenAI Error: ${openaiError.message}`);
  } else if (geminiError) {
    throw new Error(`Gemini Error: ${geminiError.message}`);
  }

  throw new Error('No LLM provider configured. Please check GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
}
