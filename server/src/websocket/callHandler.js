import { getAIResponse, INTAKE_SYSTEM_PROMPT } from '../services/llmService.js';
import { transcribeAudio } from '../services/sttService.js';
import { textToSpeech } from '../services/ttsService.js';
import { generateHealthReport } from '../services/reportService.js';
import { config } from '../config/env.js';

export function setupCallWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('[WS] Client connected.');

    // Initialize session state for this connection
    const session = {
      transcriptHistory: [],
      audioChunks: [], // Accumulates base64 chunks for the current turn
      isProcessing: false,
    };

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        const { event } = payload;

        switch (event) {
          case 'START_CALL': {
            console.log('[WS] Call Started.');
            session.transcriptHistory = [];
            session.audioChunks = [];
            session.isProcessing = false;

            const isHindi = payload.language === 'hi';
            const greetingText = isHindi
              ? 'नमस्ते! मैं आपका एआई स्वास्थ्य स्क्रीनिंग सहायक हूँ। मैं आपकी स्वास्थ्य संबंधी समस्या को समझने के लिए कुछ बुनियादी सवाल पूछूँगा। शुरू करने के लिए, क्या आप मुझे अपना नाम बता सकते हैं?'
              : 'Hello! I am your AI health screening assistant. I will ask you a few basic questions to help summarize your concern. To start, could you please tell me your name?';

            // Add greeting to transcript history
            session.transcriptHistory.push({ role: 'assistant', content: greetingText });

            // Send greeting text back
            ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: greetingText }));

            // Try to generate greeting audio if server TTS is active
            if (config.OPENAI_API_KEY) {
              try {
                const audioBase64 = await textToSpeech(greetingText);
                ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: audioBase64 }));
              } catch (err) {
                console.error('[WS] Failed to generate greeting TTS:', err);
                ws.send(JSON.stringify({ event: 'TTS_ERROR', message: 'Could not generate greeting voice.' }));
              }
            }
            break;
          }

          case 'USER_AUDIO_CHUNK': {
            // Accumulate base64 chunks
            if (payload.chunk) {
              session.audioChunks.push(Buffer.from(payload.chunk, 'base64'));
            }
            break;
          }

          case 'USER_SPEECH_STOP': {
            if (session.isProcessing) {
              console.warn('[WS] Already processing previous turn, ignoring speech stop.');
              break;
            }
            session.isProcessing = true;
            ws.send(JSON.stringify({ event: 'STATUS', status: 'THINKING' }));

            try {
              if (session.audioChunks.length === 0) {
                throw new Error('No audio chunks received.');
              }

              console.log(`[WS] Speech stopped. Assembling ${session.audioChunks.length} audio chunks...`);
              const completeAudioBuffer = Buffer.concat(session.audioChunks);
              session.audioChunks = []; // Clear for next turn

              // 1. STT: Transcribe Audio
              const userTranscript = await transcribeAudio(completeAudioBuffer, payload.mimeType || 'audio/webm');
              
              if (!userTranscript) {
                console.log('[WS] Empty transcript detected (silence/noise).');
                ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
                session.isProcessing = false;
                break;
              }

              // Send transcribed text back to client
              ws.send(JSON.stringify({ event: 'USER_TEXT_UPDATE', text: userTranscript }));

              // Process transcript turn
              await handleUserSpeechText(userTranscript);

            } catch (err) {
              console.error('[WS] Error processing speech stop:', err);
              ws.send(JSON.stringify({ event: 'ERROR', message: `Failed to transcribe audio: ${err.message}` }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
              session.isProcessing = false;
            }
            break;
          }

          case 'USER_TEXT': {
            // Hybrid Client-side STT: Directly process the text sent from browser
            if (session.isProcessing) {
              console.warn('[WS] Already processing previous turn, ignoring user text.');
              break;
            }
            session.isProcessing = true;
            ws.send(JSON.stringify({ event: 'STATUS', status: 'THINKING' }));

            try {
              const text = payload.text || '';
              if (!text.trim()) {
                ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
                session.isProcessing = false;
                break;
              }
              console.log(`[WS] Received client-side transcript: "${text}"`);
              await handleUserSpeechText(text);
            } catch (err) {
              console.error('[WS] Error processing client text:', err);
              ws.send(JSON.stringify({ event: 'ERROR', message: `Failed to process speech input: ${err.message}` }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
              session.isProcessing = false;
            }
            break;
          }

          case 'END_CALL': {
            console.log('[WS] Call Ended. Synthesizing final report...');
            ws.send(JSON.stringify({ event: 'STATUS', status: 'COMPILING_REPORT' }));

            try {
              const report = await generateHealthReport(session.transcriptHistory);
              ws.send(JSON.stringify({ event: 'FINAL_REPORT', report }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
            } catch (err) {
              console.error('[WS] Error generating report:', err);
              ws.send(JSON.stringify({ event: 'ERROR', message: 'Failed to generate screening report.' }));
              ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
            }
            break;
          }

          default:
            console.warn('[WS] Unknown event:', event);
        }
      } catch (err) {
        console.error('[WS] Error processing websocket message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected.');
    });

    // Helper to run LLM and TTS pipeline for user text inputs
    async function handleUserSpeechText(userText) {
      session.transcriptHistory.push({ role: 'user', content: userText });

      // 2. LLM: Get Agent text response
      const agentResponseText = await getAIResponse(session.transcriptHistory);
      session.transcriptHistory.push({ role: 'assistant', content: agentResponseText });

      // Send agent text response
      ws.send(JSON.stringify({ event: 'AGENT_TEXT', text: agentResponseText }));

      // 3. TTS: Synthesize speech if OpenAI key is present
      if (config.OPENAI_API_KEY) {
        try {
          const audioBase64 = await textToSpeech(agentResponseText);
          ws.send(JSON.stringify({ event: 'AGENT_AUDIO', audio: audioBase64 }));
        } catch (err) {
          console.error('[WS] Failed to generate TTS audio:', err);
          ws.send(JSON.stringify({ event: 'TTS_ERROR', message: 'Could not generate speech audio.' }));
        }
      }

      ws.send(JSON.stringify({ event: 'STATUS', status: 'IDLE' }));
      session.isProcessing = false;
    }
  });
}
