import { config } from '../config/env.js';
import { OpenAI } from 'openai';

let openaiClient = null;
if (config.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

/**
 * Synthesize text into speech audio using OpenAI TTS
 * @param {string} text - Text response to speak
 * @returns {Promise<string>} - Base64 encoded audio string (MP3)
 */
export async function textToSpeech(text) {
  if (!openaiClient) {
    throw new Error('OpenAI client not configured. TTS requires OPENAI_API_KEY.');
  }

  try {
    console.log(`[TTS] Synthesizing text: "${text.substring(0, 40)}..."`);
    const mp3Response = await openaiClient.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const base64Audio = buffer.toString('base64');
    console.log(`[TTS] Synthesized successfully. Audio size: ${buffer.length} bytes.`);
    return base64Audio;
  } catch (error) {
    console.error('[TTS] OpenAI Speech Synthesis Error:', error);
    throw error;
  }
}
