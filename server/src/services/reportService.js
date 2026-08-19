import { config } from '../config/env.js';
import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';

let openaiClient = null;
let geminiClient = null;

if (config.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

if (config.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
}

const REPORT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    patientName: { type: 'STRING', description: "The patient's name, or 'Not Provided' if not shared" },
    chiefComplaint: { type: 'STRING', description: "Primary symptom or reason for the call" },
    duration: { type: 'STRING', description: "When it started / how long it has been going on" },
    severity: { type: 'STRING', description: "Severity of the symptom (e.g. scale 1-10 or description)" },
    associatedSymptoms: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: "Any other symptoms the patient mentioned"
    },
    summary: { type: 'STRING', description: "A concise 2-3 sentence overview of the conversation" },
    flaggedFollowUp: { type: 'STRING', description: "Any warning signs, red flags, or recommendations for follow-up" }
  },
  required: ['patientName', 'chiefComplaint', 'duration', 'severity', 'associatedSymptoms', 'summary', 'flaggedFollowUp']
};

/**
 * Generate structured health report from transcript history
 * @param {Array} history - Array of { role: 'user'|'assistant', content: string }
 * @returns {Promise<Object>}
 */
export async function generateHealthReport(history) {
  // Graceful fallback for short, empty, or incomplete calls
  const userMessages = history.filter(item => item.role === 'user');
  if (!history || history.length === 0 || userMessages.length < 1) {
    return {
      status: 'INCOMPLETE',
      patientName: 'Not Provided',
      chiefComplaint: 'Call ended prematurely.',
      duration: 'Unknown',
      severity: 'Unknown',
      associatedSymptoms: [],
      summary: 'The call was ended before any screening questions could be answered.',
      flaggedFollowUp: 'No data collected. If this is an emergency, please contact local medical services.'
    };
  }

  const prompt = `
  You are an expert clinical summarizer. Review the following dialogue history from a medical intake screening call.
  Synthesize the conversation into a structured JSON medical report.
  
  Transcript History:
  ${JSON.stringify(history, null, 2)}
  
  Please extract and summarize:
  1. Patient's name.
  2. Chief complaint (main concern).
  3. Onset and duration.
  4. Severity.
  5. Associated symptoms.
  6. Overall conversational summary.
  7. Flagged follow-ups or red flags.

  If the call was very short or interrupted, extract as much information as possible and note the missing data.
  `;

  // Try OpenAI first
  if (openaiClient) {
    try {
      console.log('[Report] Synthesizing report using OpenAI...');
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a clinical summarizer. Respond ONLY with a valid JSON object matching this schema: 
            ${JSON.stringify(REPORT_SCHEMA, null, 2)}` 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });
      
      const parsedReport = JSON.parse(completion.choices[0].message.content);
      return { status: userMessages.length < 3 ? 'PARTIAL' : 'COMPLETE', ...parsedReport };
    } catch (error) {
      console.error('[Report] OpenAI report generation error, falling back to Gemini:', error);
    }
  }

  // Fallback to Gemini
  if (geminiClient) {
    try {
      console.log('[Report] Synthesizing report using Gemini...');
      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: REPORT_SCHEMA
        }
      });

      const parsedReport = JSON.parse(response.text);
      return { status: userMessages.length < 3 ? 'PARTIAL' : 'COMPLETE', ...parsedReport };
    } catch (error) {
      console.error('[Report] Gemini report generation error:', error);
      throw error;
    }
  }

  throw new Error('No LLM provider configured to generate health report.');
}
