import { useState, useEffect, useRef } from 'react';

export interface HealthReportData {
  status: string;
  patientName: string;
  chiefComplaint: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  summary: string;
  flaggedFollowUp: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'compiling_report' | 'error';

export function useWebSocket(
  onAgentText: (text: string) => void,
  onUserText: (text: string) => void,
  onReportGenerated: (report: HealthReportData) => void,
  onError: (msg: string) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingAudioRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play audio helper with queue management
  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      // Revert status to listening or connected if done speaking
      setStatus(prev => (prev === 'speaking' ? 'connected' : prev));
      return;
    }

    isPlayingAudioRef.current = true;
    setStatus('speaking');
    const base64 = audioQueueRef.current.shift()!;
    
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes.buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        playNextInQueue();
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        currentAudioRef.current = null;
        playNextInQueue();
      };

      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        currentAudioRef.current = null;
        playNextInQueue();
      });
    } catch (err) {
      console.error('Failed to decode base64 audio:', err);
      playNextInQueue();
    }
  };

  const playAudio = (base64: string) => {
    // If the browser speech synthesis is playing, cancel it
    window.speechSynthesis.cancel();
    
    audioQueueRef.current.push(base64);
    if (!isPlayingAudioRef.current) {
      playNextInQueue();
    }
  };

  const connect = (language: 'en' | 'hi') => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    // Connect to backend port 5000
    const socket = new WebSocket('ws://localhost:5000');
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('[WS] Connected to server.');
      setStatus('connected');
      // Send start call event
      socket.send(JSON.stringify({ event: 'START_CALL', language }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[WS] Received payload:', payload.event);

        switch (payload.event) {
          case 'AGENT_TEXT':
            onAgentText(payload.text);
            break;

          case 'AGENT_AUDIO':
            playAudio(payload.audio);
            break;

          case 'USER_TEXT_UPDATE':
            onUserText(payload.text);
            break;

          case 'STATUS':
            if (payload.status === 'THINKING') setStatus('thinking');
            if (payload.status === 'COMPILING_REPORT') setStatus('compiling_report');
            if (payload.status === 'IDLE') {
              setStatus(isPlayingAudioRef.current ? 'speaking' : 'connected');
            }
            break;

          case 'FINAL_REPORT':
            onReportGenerated(payload.report);
            setStatus('disconnected');
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            break;

          case 'ERROR':
            onError(payload.message);
            break;

          default:
            console.warn('[WS] Unrecognized backend event:', payload.event);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
      setStatus('error');
      onError('WebSocket connection error.');
    };

    socket.onclose = () => {
      console.log('[WS] Connection closed.');
      setStatus(prev => prev === 'compiling_report' || prev === 'disconnected' ? 'disconnected' : 'disconnected');
    };
  };

  const disconnect = () => {
    // Stop any ongoing audio playbacks
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    window.speechSynthesis.cancel();

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ event: 'END_CALL' }));
      // We don't close immediately so we can receive the FINAL_REPORT payload
    }
  };

  const forceClose = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  };

  const sendAudioChunk = (base64Chunk: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'USER_AUDIO_CHUNK',
        chunk: base64Chunk
      }));
    }
  };

  const stopUserSpeech = (mimeType: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStatus('thinking');
      wsRef.current.send(JSON.stringify({
        event: 'USER_SPEECH_STOP',
        mimeType
      }));
    }
  };

  const sendUserText = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStatus('thinking');
      wsRef.current.send(JSON.stringify({
        event: 'USER_TEXT',
        text
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    setStatus,
    connect,
    disconnect,
    forceClose,
    sendAudioChunk,
    stopUserSpeech,
    sendUserText,
    isPlayingAgentAudio: isPlayingAudioRef.current
  };
}
