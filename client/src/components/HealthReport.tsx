import React from 'react';
import { FileSpreadsheet, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { HealthReportData } from '../hooks/useWebSocket';

interface HealthReportProps {
  report: HealthReportData | null;
}

export function HealthReport({ report }: HealthReportProps) {
  if (!report) return null;

  const isIncomplete = report.status === 'INCOMPLETE';
  const isPartial = report.status === 'PARTIAL';

  return (
    <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-6 shadow-lg flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Health Screening Summary</h3>
            <p className="text-xs text-slate-400">Generated automatically via voice transcription analysis</p>
          </div>
        </div>

        {isIncomplete ? (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Incomplete
          </span>
        ) : isPartial ? (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Partial Call
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        )}
      </div>

      {/* Warning Banner for Short Calls */}
      {(isIncomplete || isPartial) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {isIncomplete ? 'Incomplete Intake Session' : 'Partial Intake Session'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              {isIncomplete
                ? 'The conversation ended before sufficient health screening details could be gathered. Please see details below for any partial information recorded.'
                : 'The call was concluded early. Some clinical screening details may be missing or unverified.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Patient Name */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Patient Name</span>
          <p className="text-base font-bold text-slate-800">{report.patientName || 'Not Provided'}</p>
        </div>

        {/* Onset / Duration */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Onset & Duration</span>
          <p className="text-base font-bold text-slate-800">{report.duration || 'Not Provided'}</p>
        </div>

        {/* Severity */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Symptom Severity</span>
          <p className="text-base font-bold text-slate-800">{report.severity || 'Not Provided'}</p>
        </div>

        {/* Associated Symptoms */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Associated Symptoms</span>
            <div className="flex flex-wrap gap-1.5">
              {report.associatedSymptoms && report.associatedSymptoms.length > 0 ? (
                report.associatedSymptoms.map((sym, idx) => (
                  <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                    {sym}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">None mentioned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chief Complaint */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chief Complaint</span>
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{report.chiefComplaint || 'Not Provided'}</p>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Clinical Summary</span>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.summary || 'Not Provided'}</p>
      </div>

      {/* Red Flags / Recommended Follow-Up */}
      {report.flaggedFollowUp && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800 text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold text-rose-900">Flagged Follow-Up / Red Flags</p>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed whitespace-pre-wrap">{report.flaggedFollowUp}</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default HealthReport;
