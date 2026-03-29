import React, { useEffect, useMemo, useState } from 'react';
import type { SituationRoomSummary } from '../services/situationService';
import type { Report } from '../types';
import { CATEGORIES_WITH_ICONS } from '../constants';
import {
  Activity,
  ArrowRight,
  Broadcast,
  Check,
  Clock,
  Heart,
  Map as MapIcon,
  MapPin,
  ShieldCheck,
  X,
} from './icons';

export type BeaconCoordStatus =
  | 'idle'
  | 'active'
  | 'help_requested'
  | 'responding'
  | 'monitoring'
  | 'resolved';

const ALERT_COPY: Record<string, string> = {
  roomMembers: 'Alert: notified people in this coordination room.',
  nearby: 'Alert: requested visibility for nearby helpers (feed + map).',
  moderators: 'Alert: moderators notified for review if configured.',
  pinMap: 'Alert: this area is highlighted on the shared map for this case.',
  liveThread: 'Alert: live coordination thread marked active.',
  escalate: 'Alert: case priority raised for follow-up.',
};

export interface DeployBeaconPanelProps {
  report: Report;
  roomsIndex: SituationRoomSummary[];
  /** Area / place label for the map + beacon */
  areaLabel: string;
  onAreaLabelChange: (v: string) => void;
  lockedAreaLabel: string;
  isBeaconActive: boolean;
  coordStatus: BeaconCoordStatus;
  deployedAt: number | null;
  onDeploy: (payload: {
    area: string;
    urgency: 'standard' | 'elevated' | 'urgent';
    alertKind: string;
    notes: string;
  }) => void;
  onResolve: () => void;
  onSendCoordinationNote: (text: string) => void;
  onJoinLinkedRoom?: (roomId: string) => void;
  onOpenLiveChat: () => void;
  mapUrl: string;
  mapLoading: boolean;
  mapInteractive: boolean;
  onMapLoad: () => void;
  onSetMapInteractive: (v: boolean) => void;
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const DeployBeaconPanel: React.FC<DeployBeaconPanelProps> = ({
  report,
  roomsIndex,
  areaLabel,
  onAreaLabelChange,
  lockedAreaLabel,
  isBeaconActive,
  coordStatus,
  deployedAt,
  onDeploy,
  onResolve,
  onSendCoordinationNote,
  onJoinLinkedRoom,
  onOpenLiveChat,
  mapUrl,
  mapLoading,
  mapInteractive,
  onMapLoad,
  onSetMapInteractive,
}) => {
  const [urgency, setUrgency] = useState<'standard' | 'elevated' | 'urgent'>('standard');
  const [alertKind, setAlertKind] = useState('community_help');
  const [notes, setNotes] = useState('');
  const [alertSent, setAlertSent] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());

  const primaryRoomTitle = report.title || 'This coordination room';
  const primaryRoomId = report.id;
  const categoryLabel = useMemo(
    () => CATEGORIES_WITH_ICONS.find((c) => c.value === report.category)?.headline ?? 'Report',
    [report.category]
  );
  const linkedFromIndex = roomsIndex[0];
  const participantHint = useMemo(() => {
    const n = linkedFromIndex?.activeUsers ?? linkedFromIndex?.participants ?? linkedFromIndex?.memberCount;
    if (typeof n === 'number') return `${n} connected`;
    return 'Room open';
  }, [linkedFromIndex]);

  useEffect(() => {
    if (!isBeaconActive || !deployedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isBeaconActive, deployedAt]);

  useEffect(() => {
    if (!isBeaconActive) setAlertSent({});
  }, [isBeaconActive]);

  const elapsed = deployedAt ? formatElapsed(now - deployedAt) : '—';

  const fireAlert = (key: keyof typeof ALERT_COPY) => {
    if (!isBeaconActive || alertSent[key]) return;
    setAlertSent((prev) => ({ ...prev, [key]: true }));
    onSendCoordinationNote(ALERT_COPY[key]);
  };

  const statusLabel =
    coordStatus === 'resolved'
      ? 'Resolved'
      : coordStatus === 'help_requested'
        ? 'Help requested'
        : coordStatus === 'responding'
          ? 'Response incoming'
          : coordStatus === 'monitoring'
            ? 'Under monitoring'
            : isBeaconActive
              ? 'Beacon active'
              : 'Ready';

  const canDeploy = areaLabel.trim().length > 0;

  return (
    <div className="rounded-[2rem] md:rounded-[2.5rem] border border-sky-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/90 text-slate-800 shadow-[0_20px_60px_-20px_rgba(14,116,144,0.25)] overflow-hidden font-sans">
      <div className="px-5 md:px-8 pt-6 md:pt-8 pb-4 border-b border-sky-100/90 bg-white/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Community coordination</p>
            <h2 className="mt-1 text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Deploy Beacon</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-xl leading-relaxed">
              Signal this case so helpers, moderators, and neighbors can find the room, see the area, and join live support.
              Family-safe, constructive, and tied to this record.
            </p>
          </div>
          <div
            className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold border ${
              isBeaconActive
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <span className="opacity-70">Response status · </span>
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-8 space-y-6 md:space-y-8">
        {/* Linked room */}
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-700">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            Linked room
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Room / case</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5 line-clamp-2">{primaryRoomTitle}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Room ID</p>
              <p className="text-xs font-mono text-slate-700 mt-0.5 break-all">{primaryRoomId}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Issue type</p>
              <p className="text-sm text-slate-800 mt-0.5 line-clamp-2">{categoryLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500">Activity</p>
              <p className="text-sm text-slate-800 mt-0.5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                {participantHint}
              </p>
            </div>
          </div>
          {linkedFromIndex && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onJoinLinkedRoom?.(linkedFromIndex.roomId)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors"
              >
                Open linked room
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* Map */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <MapIcon className="w-4 h-4 text-sky-600" />
            Map · Room visibility
          </div>
          <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video shadow-inner">
            <iframe
              src={mapUrl}
              className={`w-full h-full transition-all duration-700 ${mapLoading ? 'opacity-50 blur-sm' : 'opacity-100'} ${
                mapInteractive ? '' : 'pointer-events-none'
              }`}
              title="Area map for this beacon"
              onLoad={onMapLoad}
            />
            {!mapInteractive && (
              <button
                type="button"
                onClick={() => onSetMapInteractive(true)}
                className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/0 hover:bg-slate-900/10 transition-colors cursor-pointer"
              >
                <span className="rounded-full bg-white/95 border border-sky-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-sky-800 shadow-lg">
                  Enable map interaction
                </span>
              </button>
            )}
            {mapInteractive && (
              <button
                type="button"
                onClick={() => onSetMapInteractive(false)}
                className="absolute top-3 right-3 z-20 rounded-lg bg-white border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 shadow"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isBeaconActive && (
              <div className="absolute bottom-3 left-3 z-15 pointer-events-none flex items-center gap-2 rounded-xl bg-amber-100/95 border border-amber-300 px-3 py-1.5 text-[10px] font-bold text-amber-950 shadow">
                <MapPin className="w-3.5 h-3.5" />
                Beacon pinned · {lockedAreaLabel || areaLabel}
              </div>
            )}
          </div>
        </section>

        {/* Deploy form */}
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 md:p-5 space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Area or landmark</label>
          <div className="relative">
            <input
              type="text"
              value={areaLabel}
              onChange={(e) => onAreaLabelChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canDeploy && !isBeaconActive && onDeploy({ area: areaLabel.trim(), urgency, alertKind, notes })}
              placeholder="Neighborhood, address, or region for this signal"
              className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400"
            />
            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Alert type</label>
              <select
                value={alertKind}
                onChange={(e) => setAlertKind(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/50"
              >
                <option value="safety">Safety & wellbeing</option>
                <option value="community_help">Community help</option>
                <option value="lost_found">Lost & found / reunification</option>
                <option value="environment">Environmental / hazard</option>
                <option value="witness">Witness & accountability</option>
                <option value="education">Education support</option>
                <option value="other">Other coordination</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white py-3 px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/50"
              >
                <option value="standard">Standard</option>
                <option value="elevated">Elevated attention</option>
                <option value="urgent">Urgent response</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Beacon notes (shared to coordination thread)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What helpers should know — safe, factual, constructive."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/50 resize-y min-h-[72px]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {!isBeaconActive ? (
              <button
                type="button"
                disabled={!canDeploy}
                onClick={() => onDeploy({ area: areaLabel.trim(), urgency, alertKind, notes })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <Broadcast className="w-5 h-5" />
                Deploy Beacon
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenLiveChat}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Live support chat
                </button>
                <button
                  type="button"
                  onClick={onResolve}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  Resolve Beacon
                </button>
              </>
            )}
          </div>
        </section>

        {/* Active control panel */}
        {isBeaconActive && (
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 md:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
                <Broadcast className="w-5 h-5 text-amber-600" />
                Beacon active
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-900/90">
                <Clock className="w-4 h-4" />
                Time live · {elapsed}
              </div>
            </div>

            <p className="text-xs text-amber-950/90 leading-relaxed">
              Use the checklist to log alerts in the coordination thread. Each action sends a clear line so responders see what was requested.
            </p>

            <div className="grid sm:grid-cols-2 gap-2">
              {(
                [
                  ['roomMembers', 'Notify room members'],
                  ['nearby', 'Nearby helpers & feed visibility'],
                  ['moderators', 'Notify moderators'],
                  ['pinMap', 'Pin on shared map'],
                  ['liveThread', 'Mark live thread active'],
                  ['escalate', 'Escalate for review'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    alertSent[key] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-amber-200/80 hover:border-amber-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={!!alertSent[key]}
                    onChange={() => fireAlert(key)}
                  />
                  <span className="text-xs font-medium text-slate-800">{label}</span>
                  {alertSent[key] && <Check className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const line = notes.trim() ? `Coordination update: ${notes.trim()}` : 'Coordination update: status check-in.';
                onSendCoordinationNote(line);
                setNotes('');
              }}
              className="w-full sm:w-auto rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Send update to thread
            </button>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">Family safe · Community help · </span>
          Beacons raise visibility for this case only. They are not enforcement tools — they connect people who can help, verify, or coordinate support.
        </section>
      </div>
    </div>
  );
};

export default DeployBeaconPanel;
