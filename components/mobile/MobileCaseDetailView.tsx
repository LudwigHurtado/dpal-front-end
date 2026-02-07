import React, { useState } from 'react';
import { Report as ReportType, ReportStatus } from '../../types';
import { CATEGORIES_WITH_ICONS } from '../../constants';
import {
  ArrowLeft,
  CheckCircle,
  Camera,
  MessageSquare,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from '../icons';

type CaseDetailTab = 'detail' | 'map' | 'resolution';

interface MobileCaseDetailViewProps {
  report: ReportType;
  onReturn: () => void;
  onConfirmWitness?: (report: ReportType) => void;
  onAddEvidence?: (report: ReportType) => void;
  onMessageReporter?: (report: ReportType) => void;
  onUpdateReport?: (report: ReportType, updates: Partial<ReportType>) => void;
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MobileCaseDetailView: React.FC<MobileCaseDetailViewProps> = ({
  report: initialReport,
  onReturn,
  onConfirmWitness,
  onAddEvidence,
  onMessageReporter,
  onUpdateReport,
}) => {
  const [report, setReport] = useState(initialReport);
  const [activeTab, setActiveTab] = useState<CaseDetailTab>('detail');
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [resolutionStatus, setResolutionStatus] = useState<ReportStatus>(report.status);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [closeEvidence, setCloseEvidence] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [confirmPressed, setConfirmPressed] = useState(false);

  const categoryInfo = CATEGORIES_WITH_ICONS.find((c) => c.value === report.category);
  const evidenceUrls = report.imageUrls?.length ? report.imageUrls : ['https://picsum.photos/seed/' + report.id + '/800/400'];
  const currentEvidence = evidenceUrls[evidenceIndex % evidenceUrls.length];

  const handleStatusChange = (status: ReportStatus) => {
    setResolutionStatus(status);
    const updated = { ...report, status };
    setReport(updated);
    onUpdateReport?.(report, { status });
  };

  const handleCloseCase = () => {
    if (!closeReason.trim()) return;
    const updated = { ...report, status: 'Resolved' as ReportStatus };
    setReport(updated);
    setResolutionStatus('Resolved');
    onUpdateReport?.(report, { status: 'Resolved' });
  };

  const tabs: { id: CaseDetailTab; label: string }[] = [
    { id: 'detail', label: 'Case' },
    { id: 'map', label: 'Map' },
    { id: 'resolution', label: 'Resolution' },
  ];

  return (
    <div className="dpal-mobile-ui min-h-full bg-zinc-950 text-zinc-100 font-mono pb-8">
      {/* Header with back */}
      <header className="sticky top-0 z-20 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onReturn}
          className="p-2 rounded-xl border border-zinc-700 text-cyan-400 touch-manipulation active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-zinc-400 uppercase tracking-wider truncate flex-1">Case Detail</h1>
      </header>

      {/* B1 / B2 / B3 tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/80">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider touch-manipulation ${
              activeTab === id ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* B1 — Case Detail */}
      {activeTab === 'detail' && (
        <div className="px-4 py-4 space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">
            {report.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-lg bg-zinc-800 text-cyan-400 text-xs font-bold uppercase">
              {report.category}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
              (report.trustScore ?? 0) >= 70 ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/30 text-amber-400 border border-amber-500/30'
            }`}>
              {(report.trustScore ?? 0) >= 70 ? 'Verified' : 'Needs review'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold uppercase">
              {report.severity || 'Standard'}
            </span>
          </div>

          {/* Evidence gallery (swipe) */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
            <div className="aspect-video bg-zinc-900 flex items-center justify-center">
              <img src={currentEvidence} alt="" className="w-full h-full object-cover" />
            </div>
            {evidenceUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setEvidenceIndex((i) => (i - 1 + evidenceUrls.length) % evidenceUrls.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEvidenceIndex((i) => (i + 1) % evidenceUrls.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Timeline</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-400">Reported</span>
                <span className="text-zinc-600 text-xs ml-auto">{formatTime(report.timestamp)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${report.status !== 'Submitted' ? 'bg-cyan-500' : 'bg-zinc-600'}`} />
                <span className="text-zinc-400">Confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${report.status === 'Resolved' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                <span className="text-zinc-400">Resolved</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-zinc-400">{report.description}</p>

          {/* Buttons: Confirm/Witness, Add Evidence, Message Reporter */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => { onConfirmWitness?.(report); setConfirmPressed(true); }}
              className={`w-full py-3 rounded-xl font-bold uppercase touch-manipulation flex items-center justify-center gap-2 ${
                confirmPressed ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-cyan-500 text-black border border-cyan-400'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              {confirmPressed ? 'Witnessed' : 'Confirm / Witness'}
            </button>
            <button
              type="button"
              onClick={() => onAddEvidence?.(report)}
              className="w-full py-3 rounded-xl font-bold uppercase touch-manipulation flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-cyan-400"
            >
              <Camera className="w-5 h-5" />
              Add Evidence
            </button>
            <button
              type="button"
              onClick={() => onMessageReporter?.(report)}
              className="w-full py-3 rounded-xl font-bold uppercase touch-manipulation flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-400"
            >
              <MessageSquare className="w-5 h-5" />
              Message Reporter
            </button>
          </div>
        </div>
      )}

      {/* B2 — Map & Activity */}
      {activeTab === 'map' && (
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video flex items-center justify-center">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-cyan-400"
            >
              <MapPin className="w-12 h-12" />
              <span className="text-xs font-bold uppercase">Open in Maps</span>
              <span className="text-zinc-500 text-[10px]">{report.location}</span>
            </a>
          </div>
          <p className="text-xs text-zinc-500">
            Last updated · {formatTime(report.timestamp)}
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Activity</p>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>Report submitted to ledger.</p>
              <p>No moderator notes yet.</p>
            </div>
          </div>
          <label className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 touch-manipulation cursor-pointer">
            <span className="text-sm font-bold text-zinc-300">Subscribe to updates</span>
            <input
              type="checkbox"
              checked={subscribed}
              onChange={(e) => setSubscribed(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 text-cyan-500 bg-zinc-800"
            />
          </label>
        </div>
      )}

      {/* B3 — Resolution Panel */}
      {activeTab === 'resolution' && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Status</label>
            <div className="flex gap-2">
              {(['Submitted', 'In Review', 'Resolved'] as ReportStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase touch-manipulation ${
                    resolutionStatus === status
                      ? 'bg-cyan-500 text-black border border-cyan-400'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {status.replace(' ', '\n')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Resolution notes</label>
            <textarea
              placeholder="Add resolution notes..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              className="dpal-input w-full resize-none"
            />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2">Organization response</p>
            <p className="text-sm text-zinc-500">No verified org response yet.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Close case</p>
            <p className="text-xs text-zinc-500">Requires a reason and evidence to prevent abuse.</p>
            <input
              type="text"
              placeholder="Reason for closing"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="dpal-input w-full"
            />
            <input
              type="text"
              placeholder="Evidence link or reference"
              value={closeEvidence}
              onChange={(e) => setCloseEvidence(e.target.value)}
              className="dpal-input w-full"
            />
            <button
              type="button"
              onClick={handleCloseCase}
              disabled={!closeReason.trim()}
              className="w-full py-3 rounded-xl font-bold uppercase touch-manipulation bg-amber-500/20 border border-amber-500/50 text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close case
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCaseDetailView;
