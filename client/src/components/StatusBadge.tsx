import React from 'react';
import { ConnectionStatus } from '../hooks/useWebSocket';

interface StatusBadgeProps {
  status: ConnectionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'disconnected':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: 'Call Ended / Inactive'
        };
      case 'connecting':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
          dot: 'bg-amber-400',
          label: 'Connecting to Server...'
        };
      case 'connected':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500 animate-ping',
          label: 'Connected - Idle'
        };
      case 'listening':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-200 border-2',
          dot: 'bg-teal-500 animate-pulse',
          label: 'Listening (Speak Now)'
        };
      case 'thinking':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
          dot: 'bg-blue-500',
          label: 'AI is Thinking...'
        };
      case 'speaking':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500 animate-bounce',
          label: 'AI is Speaking'
        };
      case 'compiling_report':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse',
          dot: 'bg-purple-500',
          label: 'Compiling Structured Report...'
        };
      case 'error':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Connection Error'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: status
        };
    }
  };

  const current = getBadgeStyle();

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${current.bg} shadow-sm`}>
      <span className={`w-2.5 h-2.5 rounded-full ${current.dot}`}></span>
      {current.label}
    </span>
  );
}
export default StatusBadge;
