import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Category, Report, SeverityLevel, EducationRole } from '../../types';
import { MapPin, Camera, CheckCircle, Loader, ShieldCheck, Sparkles } from '../icons';

type Phase = 'entry' | 'path' | 'role' | 'board' | 'review';
type MissionEntryMode = 'quick' | 'full' | 'mission' | 'evidence';

interface AttachedFile {
  file: File;
  preview: string | null;
  type: 'image' | 'video' | 'audio' | 'other';
}

const PROGRESS_LABELS = ['Detect', 'Document', 'Confirm', 'Connect', 'Submit'] as const;

const MISSION_CARDS: { mode: MissionEntryMode; title: string; subtitle: string }[] = [
  { mode: 'quick', title: 'Start Quick Report', subtitle: 'Minimum fields — submit fast when time is short.' },
  { mode: 'full', title: 'Build Full Case', subtitle: 'Guided cards, evidence, and review before submit.' },
  { mode: 'mission', title: 'Join Mission', subtitle: 'Structured accountability track for this report.' },
  { mode: 'evidence', title: 'Add Evidence', subtitle: 'Upload-first — document what you already know.' },
];

/** Report paths → form EDU_02 value + display label */
const EDUCATION_PATHS: { label: string; edu02: string }[] = [
  { label: 'Bullying', edu02: 'Bullying' },
  { label: 'Teacher misconduct', edu02: 'Staff misconduct' },
  { label: 'Unsafe food', edu02: 'Food/health' },
  { label: 'Missing resources', edu02: 'Underfunding' },
  { label: 'Administrative abuse', edu02: 'Other' },
  { label: 'Unsafe facilities', edu02: 'Safety hazard' },
];

const ROLE_ROWS: {
  ui: string;
  subtitle: string;
  edu03: string;
  badge: string;
  educationRole: EducationRole;
}[] = [
  { ui: 'Student', subtitle: 'Learner perspective', edu03: 'Student', badge: 'Student report', educationRole: EducationRole.Student },
  { ui: 'Parent', subtitle: 'Guardian perspective', edu03: 'Parent', badge: 'Parent report', educationRole: EducationRole.Observer },
  { ui: 'Teacher', subtitle: 'Instructional staff', edu03: 'Staff', badge: 'Teacher alert', educationRole: EducationRole.Teacher },
  { ui: 'Staff', subtitle: 'Non-teaching school staff', edu03: 'Staff', badge: 'Staff report', educationRole: EducationRole.Employee },
  { ui: 'Witness', subtitle: 'Observer / community', edu03: 'Community', badge: 'Witness context', educationRole: EducationRole.Observer },
];

const CHIPS = [
  'urgent',
  'repeat problem',
  'child involved',
  'health risk',
  'public safety risk',
  'happened today',
  'has proof',
] as const;

const CASEBOARD_IDS = [
  { id: 'what', title: 'What happened', hint: 'What exactly did you see or experience?' },
  { id: 'where', title: 'Where', hint: 'School, campus area, or online context' },
  { id: 'when', title: 'When', hint: 'Date / time or timeframe' },
  { id: 'who', title: 'Who was affected', hint: 'Students, staff, families…' },
  { id: 'evidence', title: 'Evidence', hint: 'Photos, documents, screenshots' },
  { id: 'pattern', title: 'Pattern / repeated issue', hint: 'Has this happened before?' },
  { id: 'severity', title: 'Severity', hint: 'How serious is the impact?' },
  { id: 'followup', title: 'Suggested follow-up', hint: 'What should happen next?' },
] as const;

const DRAFT_KEY = 'dpal-education-caseboard-draft-v1';

function tierFromScore(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'High-confidence', color: 'bg-violet-600' };
  if (score >= 50) return { label: 'Strong', color: 'bg-indigo-500' };
  if (score >= 25) return { label: 'Supported', color: 'bg-sky-500' };
  return { label: 'Basic', color: 'bg-stone-400' };
}

interface EducationCaseboardReportProps {
  addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
  prefilledDescription?: string;
}

const EducationCaseboardReport: React.FC<EducationCaseboardReportProps> = ({ addReport, prefilledDescription }) => {
  const [phase, setPhase] = useState<Phase>('entry');
  const [missionMode, setMissionMode] = useState<MissionEntryMode>('full');
  const [pathLabel, setPathLabel] = useState<string | null>(null);
  const [pathEdu02, setPathEdu02] = useState<string>('Bullying');
  const [roleRow, setRoleRow] = useState<(typeof ROLE_ROWS)[number] | null>(null);

  const [what, setWhat] = useState(prefilledDescription || '');
  const [where, setWhere] = useState('');
  const [when, setWhen] = useState('');
  const [who, setWho] = useState('');
  const [patternNote, setPatternNote] = useState('');
  const [patternFreq, setPatternFreq] = useState<'One-time' | 'Repeated' | 'Ongoing'>('One-time');
  const [followUp, setFollowUp] = useState('');
  const [setting, setSetting] = useState('Public');
  const [adminNotified, setAdminNotified] = useState('Unknown');
  const [adminResponse, setAdminResponse] = useState('Unknown');

  const [severity, setSeverity] = useState<SeverityLevel>('Standard');
  const [chips, setChips] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.what) setWhat(d.what);
      if (d.where) setWhere(d.where);
      if (d.when) setWhen(d.when);
      if (d.who) setWho(d.who);
      if (d.pathLabel) setPathLabel(d.pathLabel);
      if (d.pathEdu02) setPathEdu02(d.pathEdu02);
      if (d.phase) setPhase(d.phase);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const payload = {
      what,
      where,
      when,
      who,
      pathLabel,
      pathEdu02,
      phase,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [what, where, when, who, pathLabel, pathEdu02, phase]);

  const strengthScore = useMemo(() => {
    let s = 0;
    s += pathLabel ? 12 : 0;
    s += roleRow ? 10 : 0;
    s += where.trim().length > 4 ? 12 : 0;
    s += when.trim().length > 2 ? 10 : 0;
    s += what.trim().length > 40 ? 18 : what.trim().length > 10 ? 8 : 0;
    s += who.trim().length > 3 ? 8 : 0;
    s += attachments.length ? 18 : 0;
    s += patternNote.trim().length > 10 || patternFreq !== 'One-time' ? 10 : 0;
    s += followUp.trim().length > 10 ? 6 : 0;
    s += chips.length * 3;
    s += safetyConfirmed ? 8 : 0;
    return Math.min(100, s);
  }, [pathLabel, roleRow, where, when, what, who, attachments, patternNote, patternFreq, followUp, chips, safetyConfirmed]);

  const tier = tierFromScore(strengthScore);

  const badges = useMemo(() => {
    const b: string[] = [];
    if (where.trim().length > 6) b.push('Location Confirmed');
    if (when.trim().length > 2) b.push('Timeline Added');
    if (attachments.some((a) => a.type === 'image')) b.push('Photo Evidence Added');
    if (patternFreq !== 'One-time' || patternNote.trim().length > 8) b.push('Pattern Detected');
    if (roleRow?.ui === 'Witness' || who.toLowerCase().includes('witness')) b.push('Witness Context Added');
    return b;
  }, [where, when, attachments, patternFreq, patternNote, roleRow, who]);

  const phaseIndex: number = { entry: 0, path: 1, role: 2, board: 3, review: 4 }[phase];

  const cardComplete: Record<string, boolean> = useMemo(
    () => ({
      what: what.trim().length > 15,
      where: where.trim().length > 3,
      when: when.trim().length > 2,
      who: who.trim().length > 2,
      evidence: attachments.length > 0,
      pattern: patternNote.trim().length > 5 || patternFreq !== 'One-time',
      severity: true,
      followup: followUp.trim().length > 5,
    }),
    [what, where, when, who, attachments, patternNote, patternFreq, followUp]
  );

  const toggleChip = (c: string) => {
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const next: AttachedFile[] = Array.from(files).map((file) => {
      let type: AttachedFile['type'] = 'other';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      return { file, preview: type === 'image' ? URL.createObjectURL(file) : null, type };
    });
    setAttachments((prev) => [...prev, ...next]);
    e.target.value = '';
  };

  const submit = () => {
    if (!safetyConfirmed || !roleRow || !pathLabel) return;
    setIsSubmitting(true);
    const desc = [
      what.trim(),
      chips.length ? `Tags: ${chips.join(', ')}` : '',
      followUp.trim() ? `Follow-up: ${followUp}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    void Promise.resolve(
      addReport({
      title: `Education_Case_${Date.now().toString().slice(-4)}`,
      description: desc || 'Education case report',
      category: Category.Education,
      location: where.trim() || 'GEO_STAMPED_NODE',
      trustScore: strengthScore,
      severity,
      isActionable: strengthScore > 45,
      attachments: attachments.map((a) => a.file),
      structuredData: {
        EDU_01: setting,
        EDU_02: pathEdu02,
        EDU_03: roleRow.edu03,
        EDU_04: patternFreq,
        EDU_05: adminNotified,
        EDU_06: adminResponse,
        EDU_DD_01: 'Unknown',
        EDU_DD_02: [
          ...(attachments.some((a) => a.type === 'image') ? (['Photos'] as const) : []),
          ...(attachments.length ? (['Incident reports'] as const) : []),
          ...(patternNote.trim().length > 5 ? (['Witnesses'] as const) : []),
        ],
        education_mission_mode: missionMode,
        education_path_label: pathLabel,
        education_reporter_badge: roleRow.badge,
        education_reporter_role: roleRow.educationRole,
        education_reporter_ui: roleRow.ui,
        education_when: when,
        education_pattern_notes: patternNote,
        education_chips: chips,
        case_strength_tier: tier.label,
        case_strength_score: strengthScore,
        badges_earned: badges,
        fidelity: strengthScore,
        safety_checked: safetyConfirmed,
        reporting_experience: 'education_caseboard_v1',
      },
    })
    ).finally(() => setIsSubmitting(false));
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-1 sm:px-2">
      {/* Progress strip */}
      <div className="mb-8 rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mission progress</p>
          <p className="text-xs text-stone-400">{PROGRESS_LABELS[phaseIndex]} · step {phaseIndex + 1} / 5</p>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-0 sm:justify-between">
          {PROGRESS_LABELS.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                i <= phaseIndex ? 'bg-violet-100 text-violet-800' : 'bg-stone-100 text-stone-400'
              }`}
            >
              {i < phaseIndex ? <CheckCircle className="w-3.5 h-3.5 text-violet-600" /> : <span className="w-3.5 h-3.5 rounded-full bg-stone-300" />}
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Strength + badges */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Report strength</p>
          <div className="flex items-end gap-2 mb-2">
            <span className={`text-2xl font-bold text-white px-3 py-0.5 rounded-lg ${tier.color}`}>{tier.label}</span>
            <span className="text-stone-400 text-sm">{strengthScore}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${tier.color}`} style={{ width: `${strengthScore}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 mt-2">Finish cards and evidence to move toward High-confidence.</p>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Useful milestones</p>
          <ul className="flex flex-wrap gap-1.5">
            {badges.length === 0 ? (
              <li className="text-xs text-stone-400">Complete location, time, and evidence to earn badges.</li>
            ) : (
              badges.map((b) => (
                <li key={b} className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-1 rounded-lg">
                  {b}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {phase === 'entry' && (
        <section className="space-y-4 animate-fade-in">
          <h2 className="text-xl font-bold text-stone-800 tracking-tight">Build your report</h2>
          <p className="text-sm text-stone-600">Choose how you want to enter — you can still add evidence later.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {MISSION_CARDS.map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => {
                  setMissionMode(m.mode);
                  setPhase('path');
                }}
                className={`text-left rounded-2xl border p-4 transition-all shadow-sm hover:shadow-md hover:border-violet-300 ${
                  missionMode === m.mode ? 'border-violet-400 bg-violet-50/50 ring-1 ring-violet-200' : 'border-stone-200 bg-white'
                }`}
              >
                <p className="font-semibold text-stone-800">{m.title}</p>
                <p className="text-xs text-stone-500 mt-1">{m.subtitle}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === 'path' && (
        <section className="space-y-4 animate-fade-in">
          <h2 className="text-xl font-bold text-stone-800">Choose a report path</h2>
          <p className="text-sm text-stone-600">Pick the closest match — you can refine details on the caseboard.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {EDUCATION_PATHS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setPathLabel(p.label);
                  setPathEdu02(p.edu02);
                  setPhase('role');
                }}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-800 hover:border-violet-400 hover:bg-violet-50/40 transition-colors shadow-sm"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPhase('entry')} className="text-sm text-violet-700 font-medium hover:underline">
            ← Back
          </button>
        </section>
      )}

      {phase === 'role' && (
        <section className="space-y-4 animate-fade-in">
          <h2 className="text-xl font-bold text-stone-800">Choose your role</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLE_ROWS.map((r) => (
              <button
                key={r.ui}
                type="button"
                onClick={() => {
                  setRoleRow(r);
                  setWho((w) => w || r.ui);
                  setPhase('board');
                }}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-violet-400 hover:shadow-md transition-all"
              >
                <p className="font-semibold text-stone-800">{r.ui}</p>
                <p className="text-xs text-stone-500 mt-0.5">{r.subtitle}</p>
                <p className="text-[10px] mt-2 text-violet-600 font-medium">{r.badge}</p>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPhase('path')} className="text-sm text-violet-700 font-medium hover:underline">
            ← Back
          </button>
        </section>
      )}

      {phase === 'board' && (
        <section className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-stone-800">Assemble the case</h2>
              <p className="text-sm text-stone-600">Each card completes part of your file. Smart chips add searchable context.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleChip(c)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  chips.includes(c) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-stone-600 border-stone-200 hover:border-violet-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {CASEBOARD_IDS.map((card) => {
              const done = cardComplete[card.id as keyof typeof cardComplete];
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border p-4 transition-shadow ${
                    done ? 'border-emerald-300 bg-emerald-50/30 shadow-sm' : 'border-stone-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-stone-800">{card.title}</h3>
                    {done ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <span className="text-[10px] text-stone-400 uppercase">Open</span>}
                  </div>
                  <p className="text-xs text-stone-500 mb-3">{card.hint}</p>

                  {card.id === 'what' && (
                    <textarea
                      value={what}
                      onChange={(e) => setWhat(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-violet-400 outline-none"
                      placeholder="What exactly did you see? What makes this important?"
                    />
                  )}
                  {card.id === 'where' && (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                      <input
                        value={where}
                        onChange={(e) => setWhere(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-violet-400 outline-none"
                        placeholder="Address, building, or online"
                      />
                    </div>
                  )}
                  {card.id === 'when' && (
                    <input
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-violet-400 outline-none"
                      placeholder="e.g. March 2026, last Tuesday, ongoing"
                    />
                  )}
                  {card.id === 'who' && (
                    <input
                      value={who}
                      onChange={(e) => setWho(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-violet-400 outline-none"
                      placeholder="Who was harmed or put at risk?"
                    />
                  )}
                  {card.id === 'evidence' && (
                    <div>
                      <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={onFiles} />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-100"
                      >
                        <Camera className="w-4 h-4" />
                        Add files
                      </button>
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {attachments.map((a, i) => (
                            <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                              {a.preview ? (
                                <img src={a.preview} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full items-center justify-center text-[10px] text-stone-500">File</span>
                              )}
                              <button
                                type="button"
                                className="absolute top-0 right-0 bg-black/60 text-white text-[10px] px-1"
                                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {card.id === 'pattern' && (
                    <div className="space-y-2">
                      <select
                        value={patternFreq}
                        onChange={(e) => setPatternFreq(e.target.value as typeof patternFreq)}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="One-time">One-time</option>
                        <option value="Repeated">Repeated</option>
                        <option value="Ongoing">Ongoing</option>
                      </select>
                      <textarea
                        value={patternNote}
                        onChange={(e) => setPatternNote(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                        placeholder="Same place, same people, or same type of issue?"
                      />
                    </div>
                  )}
                  {card.id === 'severity' && (
                    <div className="flex flex-wrap gap-2">
                      {(['Informational', 'Standard', 'Critical', 'Catastrophic'] as SeverityLevel[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeverity(s)}
                          className={`rounded-xl px-3 py-2 text-xs font-medium border ${
                            severity === s ? 'bg-amber-100 border-amber-400 text-amber-900' : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {card.id === 'followup' && (
                    <textarea
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                      placeholder="What outcome or follow-up do you suggest?"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-500 uppercase">School context (structured)</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <label className="block">
                <span className="text-stone-500 text-xs">Setting</span>
                <select value={setting} onChange={(e) => setSetting(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5">
                  {['Public', 'Private', 'Charter', 'University', 'Daycare', 'Other'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-stone-500 text-xs">Admin notified?</span>
                <select value={adminNotified} onChange={(e) => setAdminNotified(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5">
                  {['Yes', 'No', 'Unsafe', 'Unknown'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-stone-500 text-xs">Response quality</span>
                <select value={adminResponse} onChange={(e) => setAdminResponse(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5">
                  {['Adequate', 'Inadequate', 'None', 'Unknown'].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPhase('role')} className="text-sm text-violet-700 font-medium hover:underline">
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setPhase('review')}
              disabled={!what.trim() || !where.trim()}
              className="ml-auto rounded-xl bg-violet-600 text-white px-5 py-2.5 text-sm font-semibold shadow hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review caseboard
            </button>
          </div>
        </section>
      )}

      {phase === 'review' && (
        <section className="space-y-6 animate-fade-in">
          <h2 className="text-xl font-bold text-stone-800">Caseboard summary</h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase">Path</p>
                <p className="text-stone-800 font-medium">{pathLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase">Role</p>
                <p className="text-stone-800 font-medium">{roleRow?.ui} · {roleRow?.badge}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase">Location</p>
                <p className="text-stone-800">{where || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase">When</p>
                <p className="text-stone-800">{when || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Narrative</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{what || '—'}</p>
            </div>
            {badges.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase mb-1">Milestones</p>
                <div className="flex flex-wrap gap-1">{badges.map((b) => <span key={b} className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">{b}</span>)}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSafetyConfirmed(!safetyConfirmed)}
            className={`w-full rounded-2xl border-2 p-4 flex items-center gap-3 text-left transition-colors ${
              safetyConfirmed ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-stone-50'
            }`}
          >
            <ShieldCheck className={`w-8 h-8 ${safetyConfirmed ? 'text-emerald-600' : 'text-stone-400'}`} />
            <div>
              <p className="font-semibold text-stone-800">Safety confirmation</p>
              <p className="text-xs text-stone-500">I am in a safe place to submit and have avoided direct confrontation.</p>
            </div>
            {safetyConfirmed && <Sparkles className="w-5 h-5 text-emerald-500 ml-auto" />}
          </button>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setPhase('board')} className="text-sm text-violet-700 font-medium hover:underline">
              ← Edit caseboard
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!safetyConfirmed || isSubmitting}
              className="ml-auto rounded-2xl bg-violet-600 text-white px-8 py-3 text-sm font-bold shadow-lg hover:bg-violet-700 disabled:opacity-40 inline-flex items-center gap-2"
            >
              {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : null}
              Submit report
            </button>
          </div>
        </section>
      )}

      <style>{`
        .animate-fade-in { animation: eduFade 0.35s ease-out forwards; }
        @keyframes eduFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default EducationCaseboardReport;
