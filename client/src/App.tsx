import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, FileSpreadsheet, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useWebSocket, HealthReportData, ConnectionStatus } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { CallControls } from './components/CallControls';
import { StatusBadge } from './components/StatusBadge';
import { Transcript } from './components/Transcript';
import { HealthReport } from './components/HealthReport';

interface DialogueTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>('en');
  const [speakingMode, setSpeakingMode] = useState<'ptt' | 'vad'>('ptt');
  const [pipelineMode, setPipelineMode] = useState<'openai' | 'hybrid'>('hybrid');
  
  const [transcriptHistory, setTranscriptHistory] = useState<DialogueTurn[]>([]);
  const [interimUserText, setInterimUserText] = useState<string>('');
  const [report, setReport] = useState<HealthReportData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs for callbacks to access current state without trigger issues
  const selectedLanguageRef = useRef(selectedLanguage);
  const speakingModeRef = useRef(speakingMode);
  const pipelineModeRef = useRef(pipelineMode);
  const interimUserTextRef = useRef('');

  useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);
  useEffect(() => { speakingModeRef.current = speakingMode; }, [speakingMode]);
  useEffect(() => { pipelineModeRef.current = pipelineMode; }, [pipelineMode]);

  // Client-Side local TTS playback (SpeechSynthesis)
  const speakTextLocally = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguageRef.current === 'hi' ? 'hi-IN' : 'en-US';
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const targetLang = selectedLanguageRef.current === 'hi' ? 'hi' : 'en';
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setWsStatus('speaking');
    };

    utterance.onend = () => {
      setWsStatus('connected');
      // If Auto-VAD is enabled and call is still active, start recording user's turn
      if (speakingModeRef.current === 'vad') {
        startRecordingTurn();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // WebSocket Handlers
  const handleAgentText = (text: string) => {
    setTranscriptHistory(prev => [...prev, { role: 'assistant', content: text }]);
    // If in Hybrid pipeline, generate speech synthesis locally in browser
    if (pipelineModeRef.current === 'hybrid') {
      speakTextLocally(text);
    }
  };

  const handleUserText = (text: string) => {
    // Called when server transcribes user audio in server-side Whisper pipeline
    setTranscriptHistory(prev => [...prev, { role: 'user', content: text }]);
  };

  const handleReportGenerated = (reportData: HealthReportData) => {
    setReport(reportData);
    cleanupAudio();
  };

  const handleWSError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 6000);
  };

  // Instantiate WebSocket hook
  const {
    status: wsStatus,
    setStatus: setWsStatus,
    connect: wsConnect,
    disconnect: wsDisconnect,
    forceClose: wsForceClose,
    sendAudioChunk,
    stopUserSpeech,
    sendUserText,
    isPlayingAgentAudio
  } = useWebSocket(handleAgentText, handleUserText, handleReportGenerated, handleWSError);

  // Audio Recording Handlers
  const handleAudioChunk = (base64Chunk: string) => {
    if (pipelineModeRef.current === 'openai') {
      sendAudioChunk(base64Chunk);
    }
  };

  const handleSpeechStop = (mimeType: string) => {
    if (pipelineModeRef.current === 'openai') {
      stopUserSpeech(mimeType);
    } else {
      // Hybrid mode: send transcribed local text to backend
      const textToSend = interimUserTextRef.current;
      if (textToSend.trim()) {
        setTranscriptHistory(prev => [...prev, { role: 'user', content: textToSend }]);
        sendUserText(textToSend);
        setInterimUserText('');
        interimUserTextRef.current = '';
      } else {
        // Fall back to connected state if silent
        setWsStatus('connected');
      }
    }
  };

  const handleLocalTranscription = (text: string) => {
    setInterimUserText(text);
    interimUserTextRef.current = text;
  };

  // Instantiate Audio hook
  const {
    isRecording,
    volume,
    startAudioRecording,
    stopAudioRecording,
    startWebSpeechRecognition,
    stopWebSpeechRecognition,
    cleanup: cleanupAudio
  } = useAudioRecorder(handleAudioChunk, handleSpeechStop, handleLocalTranscription, selectedLanguage);

  // Triggered when AI is speaking or thinking -> we should mute/disable user mic
  const isAgentSpeaking = wsStatus === 'speaking' || isPlayingAgentAudio;
  const isThinking = wsStatus === 'thinking' || wsStatus === 'compiling_report';

  // Toggle user audio capture
  const startRecordingTurn = async () => {
    if (isAgentSpeaking || isThinking) return;
    
    setErrorMsg(null);
    setWsStatus('listening');
    try {
      if (pipelineModeRef.current === 'openai') {
        await startAudioRecording();
      } else {
        startWebSpeechRecognition();
      }
    } catch (err: any) {
      handleWSError(err.message || 'Microphone error');
      setWsStatus('connected');
    }
  };

  const stopRecordingTurn = () => {
    if (pipelineModeRef.current === 'openai') {
      stopAudioRecording();
    } else {
      stopWebSpeechRecognition();
    }
  };

  // Start Screening Call
  const handleStartCall = () => {
    setTranscriptHistory([]);
    setReport(null);
    setErrorMsg(null);
    setInterimUserText('');
    
    // 1. Connect WebSocket
    wsConnect(selectedLanguage);
  };

  // End Screening Call
  const handleEndCall = () => {
    cleanupAudio();
    wsDisconnect();
  };

  // Reset page
  const handleReset = () => {
    wsForceClose();
    cleanupAudio();
    setTranscriptHistory([]);
    setReport(null);
    setErrorMsg(null);
    setInterimUserText('');
    interimUserTextRef.current = '';
    setWsStatus('disconnected');
  };

  // Web Speech API Voice Load Trigger
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Monitor status to trigger automatic recording in VAD mode
  useEffect(() => {
    // If we are in Auto-VAD mode, and the connection goes to "connected" (idle),
    // and the agent is not playing audio, we should automatically start recording user turn.
    if (
      wsStatus === 'connected' &&
      speakingMode === 'vad' &&
      !isRecording &&
      !isAgentSpeaking &&
      !isThinking &&
      transcriptHistory.length > 0 // Only start auto-VAD after greeting
    ) {
      // Start recording with a slight delay to avoid key/click transients
      const timer = setTimeout(() => {
        startRecordingTurn();
      }, 400);
      return () => clearTimeout(timer);
    }
    return;
  }, [wsStatus, speakingMode, isAgentSpeaking, isThinking]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-emerald-50/90 border-b border-emerald-100 py-4 px-6 sticky top-0 z-10 shadow-sm backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white p-2 rounded-xl shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Voice-Health Screen</h1>
              <p className="text-xs text-slate-400 font-medium">Conversational AI Patient Intake Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <StatusBadge status={wsStatus} />
            {transcriptHistory.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 py-1.5 px-3 rounded-lg font-semibold transition-all border border-slate-200 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset App
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left / Middle: Controls and Transcript */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm shadow-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">System Notification</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Call Setup and Main Buttons */}
          <CallControls
            status={wsStatus}
            isRecording={isRecording}
            volume={volume}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            speakingMode={speakingMode}
            setSpeakingMode={setSpeakingMode}
            pipelineMode={pipelineMode}
            setPipelineMode={setPipelineMode}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            onStartRecord={startRecordingTurn}
            onStopRecord={stopRecordingTurn}
          />

          {/* Real-time Dialogue Log */}
          <div className="flex-1 flex flex-col">
            <Transcript
              history={
                interimUserText
                  ? [...transcriptHistory, { role: 'user', content: interimUserText + '...' }]
                  : transcriptHistory
              }
              status={wsStatus}
            />
          </div>
        </div>

        {/* Right Pane: Health Intake Summary Report */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {report ? (
            <HealthReport report={report} />
          ) : (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-8 flex-1 shadow-md flex flex-col items-center justify-center text-center text-slate-400 gap-3 border-dashed border-2">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 animate-pulse" />
              <h3 className="font-bold text-slate-700 text-sm">Health Screening Report</h3>
              <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                Once the intake screening call is finished, a structured clinical summary report will be generated and displayed here.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-emerald-50/80 py-4 px-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Health screening application - Sasahyog Assignment</span>
          <span className="flex items-center gap-1.5">
            Powered by Node.js, React, WebSockets, OpenAI Whisper, and Google Gemini
          </span>
        </div>
      </footer>
    </div>
  );
}
export default App;
