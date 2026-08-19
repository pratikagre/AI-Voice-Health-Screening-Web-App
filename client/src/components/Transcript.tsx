import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

interface DialogueTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface TranscriptProps {
  history: DialogueTurn[];
  status: string;
}

export function Transcript({ history, status }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, status]);

  return (
    <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-6 shadow-md flex-1 flex flex-col min-h-[350px] max-h-[500px]">
      <h3 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-3 mb-4">
        Live Conversation Transcript
      </h3>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scroll-smooth">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-2">
            <span className="text-4xl animate-bounce">🎙️</span>
            <p className="text-sm font-medium text-center max-w-[280px]">
              Click "Start Screening Call" to begin the AI voice session.
            </p>
          </div>
        ) : (
          history.map((turn, index) => {
            const isAgent = turn.role === 'assistant';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Profile Icon wrapper */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    isAgent
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Text Bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isAgent
                      ? 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                      : 'bg-indigo-600 text-white rounded-tr-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{turn.content}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Loading/Thinking Bubble */}
        {status === 'thinking' && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
export default Transcript;
