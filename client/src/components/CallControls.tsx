import React from 'react';
import { PhoneCall, PhoneOff, Mic, Volume2 } from 'lucide-react';
import { ConnectionStatus } from '../hooks/useWebSocket';

interface CallControlsProps {
  status: ConnectionStatus;
  isRecording: boolean;
  volume: number;
  selectedLanguage: 'en' | 'hi';
  setSelectedLanguage: (lang: 'en' | 'hi') => void;
  speakingMode: 'ptt' | 'vad';
  setSpeakingMode: (mode: 'ptt' | 'vad') => void;
  pipelineMode: 'openai' | 'hybrid';
  setPipelineMode: (mode: 'openai' | 'hybrid') => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
}

export function CallControls({
  status,
  isRecording,
  volume,
  selectedLanguage,
  setSelectedLanguage,
  speakingMode,
  setSpeakingMode,
  pipelineMode,
  setPipelineMode,
  onStartCall,
  onEndCall,
  onStartRecord,
  onStopRecord
}: CallControlsProps) {
  const isCallActive = status !== 'disconnected' && status !== 'connecting';

  return (
    <div className="bg-emerald-50/80 p-6 rounded-2xl border border-emerald-100 shadow-md flex flex-col gap-6">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <PhoneCall className="w-5 h-5 text-teal-600" />
        Call Control Panel
      </h2>

      {/* Call Settings - Disabled when call is active to prevent session conflicts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Intake Language</label>
          <div className="flex gap-2">
            <button
              disabled={isCallActive}
              onClick={() => setSelectedLanguage('en')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                selectedLanguage === 'en'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              disabled={isCallActive}
              onClick={() => setSelectedLanguage('hi')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                selectedLanguage === 'hi'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              🇮🇳 Hindi (हिंदी)
            </button>
          </div>
        </div>

        {/* Turn-Taking Control Mode */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Speaking Control</label>
          <div className="flex gap-2">
            <button
              disabled={isCallActive}
              onClick={() => setSpeakingMode('ptt')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                speakingMode === 'ptt'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Push-to-Talk
            </button>
            <button
              disabled={isCallActive}
              onClick={() => setSpeakingMode('vad')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                speakingMode === 'vad'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Auto-VAD (Hands-Free)
            </button>
          </div>
        </div>

        {/* AI Voice Pipeline Choice */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">Voice Pipeline</label>
          <div className="flex gap-2">
            <button
              disabled={isCallActive}
              onClick={() => setPipelineMode('openai')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                pipelineMode === 'openai'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Server OpenAI (Full)
            </button>
            <button
              disabled={isCallActive}
              onClick={() => setPipelineMode('hybrid')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                pipelineMode === 'hybrid'
                  ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              Hybrid Gemini (Local)
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 my-1"></div>

      {/* Connection and Recording Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {!isCallActive ? (
          <button
            onClick={onStartCall}
            disabled={status === 'connecting'}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all disabled:opacity-50"
          >
            <PhoneCall className="w-5 h-5 animate-pulse" />
            {status === 'connecting' ? 'Connecting...' : 'Start Screening Call'}
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-between">
            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all"
            >
              <PhoneOff className="w-5 h-5" />
              End Call & Generate Report
            </button>

            {/* Speaking / Push to Talk controls when call is live */}
            <div className="flex flex-1 items-center justify-center gap-4">
              {speakingMode === 'ptt' ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onMouseDown={onStartRecord}
                    onMouseUp={onStopRecord}
                    onTouchStart={onStartRecord}
                    onTouchEnd={onStopRecord}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-90 ${
                      isRecording
                        ? 'bg-red-500 animate-pulse ring-4 ring-red-200'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    <Mic className="w-7 h-7" />
                    {isRecording && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                      </span>
                    )}
                  </button>
                  <span className="text-xs font-semibold text-slate-500 animate-pulse">
                    {isRecording ? 'Release to Send' : 'HOLD to speak'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-teal-50 py-2.5 px-5 rounded-full border border-teal-100">
                  <Volume2 className="w-5 h-5 text-teal-600 animate-bounce" />
                  <span className="text-sm font-semibold text-teal-800">
                    {isRecording ? 'Mic is Active (Auto VAD enabled)' : 'VAD Listening...'}
                  </span>
                </div>
              )}

              {/* Simple Volume Level Indicator */}
              <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mic Level</span>
                <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex items-center p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-75"
                    style={{ width: `${volume * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {pipelineMode === 'openai' && !isCallActive && (
        <p className="text-[11px] text-center text-amber-600 italic font-medium -mt-2">
          ⚠️ Server OpenAI mode requires setting OPENAI_API_KEY in the backend. If missing, the call will fall back to Gemini.
        </p>
      )}
    </div>
  );
}
export default CallControls;
