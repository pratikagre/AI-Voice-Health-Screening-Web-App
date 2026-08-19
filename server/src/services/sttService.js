import { config } from '../config/env.js';
import { OpenAI, toFile } from 'openai';

let openaiClient = null;
if (config.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

/**
 * Transcribe binary audio buffer using OpenAI Whisper
 * @param {Buffer} audioBuffer - The complete audio buffer for the turn
 * @param {string} mimeType - e.g., 'audio/webm'
 * @returns {Promise<string>}
 */
export async function transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
  if (!openaiClient) {
    throw new Error('OpenAI client not configured. STT transcription requires OPENAI_API_KEY.');
  }

  try {
    console.log(`[STT] Transcribing audio buffer of size ${audioBuffer.length} bytes (Mime: ${mimeType})...`);
    
    // Convert buffer to file object that OpenAI SDK accepts
    const extension = mimeType.includes('wav') ? 'wav' : 'webm';
    const filename = `speech.${extension}`;
    const file = await toFile(audioBuffer, filename, { type: mimeType });

    const transcription = await openaiClient.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      // We don't specify language to allow automatic language detection (English/Hindi)
    });

    console.log(`[STT] Transcription result: "${transcription.text}"`);
    return transcription.text.trim();
  } catch (error) {
    console.error('[STT] Whisper Transcription Error:', error);
    throw error;
  }
}
