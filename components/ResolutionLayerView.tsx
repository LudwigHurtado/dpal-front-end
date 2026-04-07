import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Clock, FileText, Filter, Hash, MapPin, Search, Send, ShieldCheck, User } from './icons';

type ResolutionStatus = 'Verified' | 'Escalated' | 'Resolved' | 'Ignored';
type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

type ResolutionCase = {
  id: string;
  title: string;
  category: string;
  location: string;
  severity: Severity;
  status: ResolutionStatus;
  entity: string;
  reporter: string;
  verifier: string;
  resolutionScore: number;
  responseSla: string;
  lastUpdate: string;
  summary: string;
  publicImpact: string;
  nextAction: string;
};

const CASES: ResolutionCase[] = [
  {
    id: 'DPAL-2026-004821',
    title: 'Unsafe housing: exposed wiring and water intrusion',
    category: 'Housing Conditions',
    location: 'Santa Cruz, Bolivia',
    severity: 'High',
    status: 'Escalated',
    entity: 'Landlord / Property Manager',
    reporter: 'Verified Reporter',
    verifier: 'Regional Housing Verifier',
    resolutionScore: 68,
    responseSla: '48 hours',
    lastUpdate: 'Apr 7, 2026 · 3:14 PM',
    summary:
      'Verified evidence confirms recurring leaks, exposed electrical wiring, and unsafe sleeping conditions affecting a family with children.',
    publicImpact: 'Potential fire risk, child safety hazard, and ongoing habitability violations.',
    nextAction: 'Awaiting code enforcement acknowledgement and repair deadline confirmation.',
  },
  {
    id: 'DPAL-2026-004901',
    title: 'School meal safety follow-up after contamination complaint',
    category: 'School Neglect / Underfunding',
    location: 'El Alto, Bolivia',
    severity: 'Medium',
    status: 'Verified',
    entity: 'School Administration',
    reporter: 'Parent Group',
    verifier: 'Education Verifier',
    resolutionScore: 41,
    responseSla: '72 hours',
    lastUpdate: 'Apr 7, 2026 · 12:06 PM',
    summary:
      'Parents submitted photo evidence and meal logs. Verification confirmed sanitation concerns, but no agency response has been logged yet.',
    publicImpact: 'Ongoing student exposure risk and trust breakdown between families and school leadership.',
    nextAction: 'Escalate to district health office and open mission for meal-condition recheck.',
  },
  {
    id: 'DPAL-2026-004777',
    title: 'Road hazard unresolved after prior city promise',
    category: 'Road Hazards',
    location: 'La Paz, Bolivia',
    severity: 'High',
    status: 'Ignored',
    entity: 'Municipal Roads Department',
    reporter: 'Neighborhood Mission Team',
    verifier: 'Infrastructure Verifier',
    resolutionScore: 22,
    responseSla: '7 days',
    lastUpdate: 'Apr 6, 2026 · 6:48 PM',
    summary: 'A previously promised repair remains incomplete. Follow-up evidence confirms worsening risk.',
    publicImpact: 'Vehicle damage risk and pedestrian danger continuing beyond public repair deadline.',
    nextAction: 'Trigger promise-tracker comparison and publish unresolved status to scorecard.',
  },
];

const statusStyle: Record<ResolutionStatus, string> = {
  Verified: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  Escalated: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  Resolved: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  Ignored: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
};

const severityStyle: Record<Severity, string> = {
  Low: 'bg-slate-600/40 text-slate-100',
  Medium: 'bg-yellow-500/20 text-yellow-100',
  High: 'bg-orange-500/20 text-orange-100',
  Critical: 'bg-rose-500/20 text-rose-100',
};

const joinClasses = (...parts: Array<string | false | undefined>): string => parts.filter(Boolean).join(' ');

interface ResolutionLayerViewProps {
  onReturn: () => void;
}

const ResolutionLayerView: React.FC<ResolutionLayerViewProps> = ({ onReturn }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ResolutionStatus>('All');
  const [selectedId, setSelectedId] = useState(CASES[0].id);

  const filteredCases = useMemo(
    () =>
      CASES.filter((entry) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          q.length === 0 ||
          entry.id.toLowerCase().includes(q) ||
          entry.title.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.location.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || entry.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [query, statusFilter]
  );

  const activeCase = filteredCases.find((entry) => entry.id === selectedId) ?? filteredCases[0] ?? CASES[0];

  return (
    <section className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24">
      <div className="rounded-3xl border dpal-border-subtle dpal-bg-panel p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-cyan-300">DPAL Resolution Layer</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Truth to Action to Outcome</h2>
            <p className="mt-2 text-sm text-slate-300">Track verified cases from escalation through confirmation of correction.</p>
          </div>
          <button
            type="button"
            onClick={onReturn}
            className="rounded-xl border dpal-border-subtle bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            Back to Main Menu
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-2xl border dpal-border-subtle dpal-bg-panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-xl border dpal-border-subtle bg-black/20 px-3 py-2">
              <Search className="h-4 w-4 text-slate-300" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search case ID, category, location, or title"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-lg border dpal-border-subtle px-3 py-2 text-xs text-slate-300">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Status
              </span>
              {(['All', 'Verified', 'Escalated', 'Resolved', 'Ignored'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={joinClasses(
                    'rounded-lg border px-3 py-2 text-xs transition',
                    statusFilter === status
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                      : 'dpal-border-subtle bg-white/5 text-slate-200 hover:bg-white/10'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="xl:col-span-4 rounded-2xl border dpal-border-subtle dpal-bg-panel p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-slate-300">Verified Cases</p>
              <p className="mt-1 text-xl font-semibold text-white">1,248</p>
            </div>
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-slate-300">Escalations</p>
              <p className="mt-1 text-xl font-semibold text-white">872</p>
            </div>
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-slate-300">Avg. Response</p>
              <p className="mt-1 text-xl font-semibold text-white">34h</p>
            </div>
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-slate-300">Resolved Rate</p>
              <p className="mt-1 text-xl font-semibold text-white">63%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="xl:col-span-4 rounded-2xl border dpal-border-subtle dpal-bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Resolution Queue</h3>
            <span className="text-xs text-slate-300">{filteredCases.length} cases</span>
          </div>
          <div className="space-y-2">
            {filteredCases.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedId(entry.id)}
                className={joinClasses(
                  'w-full rounded-xl border p-3 text-left',
                  activeCase.id === entry.id
                    ? 'border-cyan-400/50 bg-cyan-500/10'
                    : 'dpal-border-subtle bg-white/5 hover:bg-white/10'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{entry.id}</p>
                  <span className={joinClasses('rounded-md border px-2 py-0.5 text-[10px]', statusStyle[entry.status])}>{entry.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-200">{entry.title}</p>
                <p className="mt-2 inline-flex items-center text-xs text-slate-300">
                  <MapPin className="mr-1 h-3 w-3" />
                  {entry.location}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <div className="xl:col-span-8 rounded-2xl border dpal-border-subtle dpal-bg-panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border dpal-border-subtle px-2 py-1 text-xs text-slate-300">
              <Hash className="mr-1 h-3.5 w-3.5" />
              {activeCase.id}
            </span>
            <span className={joinClasses('rounded-md border px-2 py-1 text-xs', statusStyle[activeCase.status])}>{activeCase.status}</span>
            <span className={joinClasses('rounded-md border-0 px-2 py-1 text-xs', severityStyle[activeCase.severity])}>{activeCase.severity}</span>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-white">{activeCase.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{activeCase.summary}</p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Entity</p>
              <p className="mt-1 text-sm text-white">{activeCase.entity}</p>
            </div>
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Reporter / Verifier</p>
              <p className="mt-1 text-sm text-white">{activeCase.reporter}</p>
              <p className="text-xs text-slate-400">{activeCase.verifier}</p>
            </div>
            <div className="rounded-xl border dpal-border-subtle bg-black/20 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">SLA + Confidence</p>
              <p className="mt-1 text-sm text-white">{activeCase.responseSla}</p>
              <p className="text-xs text-slate-400">Resolution score: {activeCase.resolutionScore}%</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="inline-flex items-center text-sm font-semibold text-amber-200">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Public Impact
              </p>
              <p className="mt-1 text-sm text-amber-50">{activeCase.publicImpact}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
              <p className="inline-flex items-center text-sm font-semibold text-cyan-200">
                <ArrowRight className="mr-2 h-4 w-4" />
                Next Action
              </p>
              <p className="mt-1 text-sm text-cyan-50">{activeCase.nextAction}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300">
              <Send className="mr-2 h-3.5 w-3.5" />
              Escalate Now
            </button>
            <button type="button" className="inline-flex items-center rounded-lg border dpal-border-subtle bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10">
              <FileText className="mr-2 h-3.5 w-3.5" />
              Export Case
            </button>
            <button type="button" className="inline-flex items-center rounded-lg border dpal-border-subtle bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10">
              <User className="mr-2 h-3.5 w-3.5" />
              Assign Responder
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border dpal-border-subtle bg-black/20 p-3 text-xs text-slate-200">
              <p className="inline-flex items-center text-cyan-200">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Route Integrity
              </p>
              <p className="mt-1">Escalation chain verified with evidence hash checks.</p>
            </div>
            <div className="rounded-lg border dpal-border-subtle bg-black/20 p-3 text-xs text-slate-200">
              <p className="inline-flex items-center text-emerald-200">
                <Check className="mr-1 h-3.5 w-3.5" />
                Evidence Completeness
              </p>
              <p className="mt-1">Reporter files are complete and ready for agency intake.</p>
            </div>
            <div className="rounded-lg border dpal-border-subtle bg-black/20 p-3 text-xs text-slate-200">
              <p className="inline-flex items-center text-amber-200">
                <Clock className="mr-1 h-3.5 w-3.5" />
                Last Updated
              </p>
              <p className="mt-1">{activeCase.lastUpdate}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResolutionLayerView;
