import { useState, useRef, useEffect } from 'react';

// Web Speech API Types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useAudioRecorder(
  onAudioChunk: (base64: string) => void,
  onSpeechStop: (mimeType: string) => void,
  onTextTranscription: (text: string) => void, // For client-side STT mode
  language: 'en' | 'hi' = 'en'
) {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // VAD tracking variables
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef(false);

  // Silence threshold
  const SILENCE_THRESHOLD = 0.015;
  const SILENCE_DURATION = 1600; // ms of silence before auto-triggering speech stop

  // Clean up all running audio resources
  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsRecording(false);
    setVolume(0);
    hasSpokenRef.current = false;
  };

  // 1. Server-Side Audio Pipeline: WebM Recorder with VAD
  const startAudioRecording = async () => {
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mimetype
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              const base64 = reader.result.split(',')[1];
              onAudioChunk(base64);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Start recording in 300ms intervals
      mediaRecorder.start(300);
      setIsRecording(true);

      // Start Client-Side Volume & Silence Detection (VAD)
      setupSilenceDetector(stream, mimeType);

    } catch (err) {
      console.error('Microphone access error:', err);
      throw new Error('Could not access microphone.');
    }
  };

  const setupSilenceDetector = (stream: MediaStream, mimeType: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current || !isRecording) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);
        
        // Calculate root mean square (RMS) volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Expose normalized volume for styling/visualizer
        setVolume(Math.min(rms * 10, 1));

        // VAD Logic
        if (rms > SILENCE_THRESHOLD) {
          hasSpokenRef.current = true;
          // Clear any active silence timer if user speaks
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          // If the user has started speaking and then fell silent
          if (hasSpokenRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log('[VAD] Silence detected. Stopping turn speech.');
              // Trigger stop speech event
              stopAudioRecording(mimeType);
            }, SILENCE_DURATION);
          }
        }

        if (isRecording) {
          requestAnimationFrame(checkVolume);
        }
      };

      // Delay starting silence checker slightly to prevent click noises triggering it
      setTimeout(() => {
        if (stream.active) {
          requestAnimationFrame(checkVolume);
        }
      }, 500);

    } catch (err) {
      console.warn('Web Audio API silence detection failed to initialize:', err);
    }
  };

  const stopAudioRecording = (mimeType: string) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Fire callback
    onSpeechStop(mimeType);

    // Pause recording states without fully killing microphone tracks
    // This allows keeping the mic warm or reset chunks for the next turn
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    hasSpokenRef.current = false;
    setVolume(0);
  };

  // 2. Client-Side Web Speech API (Fallback / Hybrid Pipeline)
  const startWebSpeechRecognition = () => {
    cleanup();

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      throw new Error('Web Speech API is not supported in this browser. Please use Chrome/Edge or provide an OpenAI API key.');
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        console.log('[STT-WebSpeech] Recognition active.');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          onTextTranscription(currentText);
        }

        // Simulate volume level briefly for visualizer during speech
        if (interimTranscript.length > 0) {
          setVolume(0.3 + Math.random() * 0.4);
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          setVolume(0);
          if (hasSpokenRef.current && !silenceTimerRef.current && finalTranscript) {
            silenceTimerRef.current = setTimeout(() => {
              console.log('[STT-WebSpeech] Final speech received. Wrapping turn.');
              onSpeechStop('text');
              hasSpokenRef.current = false;
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }, SILENCE_DURATION);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[STT-WebSpeech] Error event:', event.error);
        if (event.error === 'no-speech') {
          // Ignore no speech, keep listening
          return;
        }
        cleanup();
      };

      recognition.onend = () => {
        console.log('[STT-WebSpeech] Recognition stopped.');
        setIsRecording(false);
      };

      recognition.start();

    } catch (err) {
      console.error('Failed to initialize Web Speech Recognition:', err);
      throw err;
    }
  };

  // Handle language updates during an active session
  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      // Re-initialize for new language
      startWebSpeechRecognition();
    }
  }, [language]);

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    isRecording,
    volume,
    startAudioRecording,
    stopAudioRecording: () => {
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      stopAudioRecording(mimeType);
    },
    startWebSpeechRecognition,
    stopWebSpeechRecognition: () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      cleanup();
    },
    cleanup
  };
}
