import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import type { MissionAssignmentV2Model } from '../types';
import { buildUserCreatedMission } from '../services/createMissionAdapter';
import type { CreateMissionInput } from '../createMissionTypes';
import {
  USER_MISSION_TYPE_OPTIONS,
  MISSION_CATEGORY_CARDS,
  SUGGESTED_JOIN_MISSIONS,
  QUICK_START_PRESETS,
} from '../createMissionTypes';

interface CreateMissionViewProps {
  onCancel: () => void;
  /** Emits a full V2 model — parent saves and opens MissionAssignmentV2. */
  onComplete: (model: MissionAssignmentV2Model) => void;
  /** “Browse missions” — Mission Assignment V2 hub. */
  onBrowseMissions: () => void;
}

/** Shared with MainMenu hero — `public/main-screen/dpal-mission-control-hero.png` */
const MISSION_CONTROL_HERO_SRC = '/main-screen/dpal-mission-control-hero.png';

const shell = 'min-h-full bg-slate-950 text-slate-100';
const card =
  'rounded-2xl border border-cyan-500/20 bg-slate-900/85 shadow-[0_0_40px_rgba(0,198,255,0.08)] backdrop-blur-sm';
const cardInner = 'border border-white/5';
const labelCls =
  'text-[11px] font-semibold uppercase tracking-wider text-cyan-200/75';
const field =
  'mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30';
const btnPrimary =
  'rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:from-cyan-500 hover:to-cyan-400';
const btnGhost =
  'rounded-xl border border-slate-600 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800';
const btnChip =
  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors';
const btnChipOn = 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.2)]';
const btnChipOff = 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500';

const CreateMissionView: React.FC<CreateMissionViewProps> = ({
  onCancel,
  onComplete,
  onBrowseMissions,
}) => {
  const { user } = useAuth();
  const creator = useMemo(
    () => ({
      userId: user?.id ?? 'local',
      displayName: user?.fullName?.trim() || user?.username || 'Mission creator',
      profileHandle: user?.username ? `@${user.username}` : '@you',
    }),
    [user],
  );

  const [step, setStep] = useState<'choice' | 'create'>('choice');
  const [browseTab, setBrowseTab] = useState<'suggested' | 'community'>('suggested');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(MISSION_CATEGORY_CARDS[0]!.value);
  const [missionType, setMissionType] = useState(USER_MISSION_TYPE_OPTIONS[0]!.value);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [visibility, setVisibility] = useState<CreateMissionInput['visibility']>('public');
  const [joinPolicy, setJoinPolicy] = useState<CreateMissionInput['joinPolicy']>('approval_required');
  const [participantLimit, setParticipantLimit] = useState(24);
  const [startsAt, setStartsAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rewardType, setRewardType] = useState<CreateMissionInput['rewardType']>('None');
  const [rewardAmount, setRewardAmount] = useState(100);
  const [requiresProof, setRequiresProof] = useState(true);
  const [proofItems, setProofItems] = useState<string[]>(['Photo or timestamp', 'Written confirmation']);
  const [newProof, setNewProof] = useState('');
  const [taskItems, setTaskItems] = useState<string[]>([]);
  const [newTask, setNewTask] = useState('');

  const [error, setError] = useState<string | null>(null);

  const applyPreset = (p: (typeof QUICK_START_PRESETS)[number]) => {
    setCategory(p.category);
    setMissionType(p.missionType);
    setSelectedPresetKey(p.label);
  };

  const startCreating = () => {
    const preset = selectedPresetKey
      ? QUICK_START_PRESETS.find((x) => x.label === selectedPresetKey)
      : undefined;
    if (preset) {
      setCategory(preset.category);
      setMissionType(preset.missionType);
    }
    setStep('create');
  };

  const addProof = () => {
    const t = newProof.trim();
    if (!t) return;
    setProofItems((prev) => [...prev, t]);
    setNewProof('');
  };

  const removeProof = (index: number) => {
    setProofItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    setTaskItems((prev) => [...prev, t]);
    setNewTask('');
  };

  const removeTask = (index: number) => {
    setTaskItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Add a mission title.');
      return;
    }
    setError(null);
    const proofLabels = proofItems.map((s) => s.trim()).filter(Boolean);
    const initialTasks = taskItems.map((s) => s.trim()).filter(Boolean);

    const input: CreateMissionInput = {
      title: t,
      category: category.trim() || 'Community',
      missionType,
      description: description.trim(),
      location: location.trim(),
      isRemote,
      urgency,
      visibility,
      joinPolicy,
      participantLimit,
      startsAt: startsAt.trim() || undefined,
      deadline: deadline.trim() || undefined,
      rewardType,
      rewardAmount: rewardType === 'None' ? 0 : Math.max(0, rewardAmount),
      requiresProof,
      proofLabels,
      initialTasks,
      creator,
    };

    onComplete(buildUserCreatedMission(input));
  };

  if (step === 'choice') {
    return (
      <div className={`${shell} pb-24`}>
        <div className="mx-auto max-w-[1200px] px-4 pt-4">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 shadow-[0_0_60px_rgba(0,198,255,0.12)]">
            <img
              src={MISSION_CONTROL_HERO_SRC}
              alt=""
              className="h-[min(42vh,360px)] w-full object-cover object-center opacity-95"
              loading="eager"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
                DPAL Mission Control
              </p>
              <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start a Mission
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Join an existing mission or create your own — same V2 workspace as report-driven missions.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {(['suggested', 'community'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBrowseTab(tab)}
                className={`${btnChip} ${
                  browseTab === tab ? btnChipOn : btnChipOff
                }`}
              >
                {tab === 'suggested' ? 'Suggested Missions' : 'Community Missions'}
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Quick mission themes — select one, then choose <span className="text-cyan-400/90">Start Creating</span> on the
            right.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {QUICK_START_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={`${btnChip} ${
                  selectedPresetKey === p.label ? btnChipOn : btnChipOff
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
            <div className="space-y-4 xl:col-span-7">
              <h2 className="font-mono text-sm font-bold uppercase tracking-wide text-cyan-200/80">
                {browseTab === 'suggested' ? 'Join / pick a mission' : 'Community missions'}
              </h2>
              {browseTab === 'suggested' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {SUGGESTED_JOIN_MISSIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={onBrowseMissions}
                      className={`${card} p-4 text-left transition hover:border-cyan-400/40 hover:shadow-[0_0_28px_rgba(34,211,238,0.12)]`}
                    >
                      <div className="flex gap-3">
                        <span className="text-2xl" aria-hidden>
                          {m.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{m.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{m.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-slate-600/80 bg-slate-950/50 px-1.5 py-0.5 text-[10px] text-slate-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span>{m.isRemote ? 'Remote' : m.locationLabel}</span>
                            <span>·</span>
                            <span>{m.hasReward ? m.rewardLabel : 'No reward'}</span>
                            <span>·</span>
                            <span>{m.participantCount} joined</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`${card} p-8 text-center`}>
                  <p className="text-slate-400">
                    Community-wide listings will connect here. For now, browse suggested missions or open the mission
                    hub.
                  </p>
                  <button type="button" onClick={onBrowseMissions} className={`${btnPrimary} mt-6`}>
                    Open mission hub
                  </button>
                </div>
              )}

              <div className={`${card} p-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Browse all active missions</p>
                    <p className="text-xs text-slate-500">Mission Assignment V2 — workspaces, tasks, and teams.</p>
                  </div>
                  <button type="button" onClick={onBrowseMissions} className={btnPrimary}>
                    Browse missions
                  </button>
                </div>
              </div>
            </div>

            <div className="xl:col-span-5">
              <div
                className={`${card} sticky top-4 overflow-hidden xl:min-h-[420px]`}
                style={{ boxShadow: '0 0 48px rgba(34, 211, 238, 0.12)' }}
              >
                <div className="border-b border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent px-5 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Option 2</p>
                  <h3 className="mt-1 font-mono text-xl font-bold text-white">Create your own mission</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Start a mission for your community, team, family, or cause. You’ll fill details on the next screen.
                  </p>
                </div>
                <div className="space-y-3 p-5">
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex gap-2">
                      <span className="text-cyan-400">✓</span>
                      Same V2 board as report-linked missions
                    </li>
                    <li className="flex gap-2">
                      <span className="text-cyan-400">✓</span>
                      Proof, rewards, and tasks you define
                    </li>
                    <li className="flex gap-2">
                      <span className="text-cyan-400">✓</span>
                      Invites & join flow in a later phase
                    </li>
                  </ul>
                  <button type="button" onClick={startCreating} className={`${btnPrimary} w-full py-3 text-base`}>
                    Start creating
                  </button>
                  <button type="button" onClick={onCancel} className={`${btnGhost} w-full`}>
                    Back to home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} pb-24`}>
      <div className="mx-auto max-w-[760px] px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20">
          <img
            src={MISSION_CONTROL_HERO_SRC}
            alt=""
            className="max-h-[200px] w-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h1 className="font-mono text-2xl font-bold text-white">Create your own mission</h1>
            <p className="text-xs text-slate-400">Define the mission — you’ll open the V2 workspace after submit.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setStep('choice')} className={btnGhost}>
            ← Mission choice
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className={btnGhost}>
              Exit
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`${card} mt-6 space-y-8 p-5 sm:p-6`}>
          <section className={`space-y-4 ${cardInner} rounded-xl p-4`}>
            <h2 className={labelCls}>1 · Mission basics</h2>
            <label className="block text-sm">
              <span className="text-slate-300">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={field}
                placeholder="Short, clear mission title"
              />
            </label>
            <div>
              <p className="text-slate-300">Category</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Pick one — drives how the mission reads in lists.</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MISSION_CATEGORY_CARDS.map((c) => {
                  const on = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        on
                          ? 'border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                          : 'border-slate-600 bg-slate-950/40 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {c.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{c.label}</span>
                        <span className="block text-[11px] text-slate-500">{c.short}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block text-sm">
              <span className="text-slate-300">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={field}
                placeholder="What needs to happen, constraints, safety notes…"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-300">Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isRemote}
                  className={`${field} disabled:opacity-50`}
                  placeholder={isRemote ? 'Remote' : 'Address or area'}
                />
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="rounded border-slate-500 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
                />
                Remote / online
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-slate-300">Urgency</span>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                  className={field}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Start (optional)</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Deadline (optional)</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={field}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-300">Max participants</span>
              <input
                type="number"
                min={1}
                value={participantLimit}
                onChange={(e) => setParticipantLimit(Math.max(1, Number(e.target.value || 1)))}
                className={`${field} max-w-[200px]`}
              />
            </label>
          </section>

          <section className={`space-y-3 ${cardInner} rounded-xl p-4`}>
            <h2 className={labelCls}>2 · Mission type</h2>
            <div className="flex flex-wrap gap-2">
              {USER_MISSION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMissionType(opt.value)}
                  className={`${btnChip} ${missionType === opt.value ? btnChipOn : btnChipOff}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className={`space-y-3 ${cardInner} rounded-xl p-4`}>
            <h2 className={labelCls}>3 · Participation</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-300">Visibility</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as CreateMissionInput['visibility'])}
                  className={field}
                >
                  <option value="public">Public</option>
                  <option value="invite_only">Invite only</option>
                  <option value="hybrid">Hybrid (public + invites)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-300">Join policy</span>
                <select
                  value={joinPolicy}
                  onChange={(e) => setJoinPolicy(e.target.value as CreateMissionInput['joinPolicy'])}
                  className={field}
                >
                  <option value="open">Open</option>
                  <option value="approval_required">Approval required</option>
                  <option value="invite_only">Invite only</option>
                </select>
              </label>
            </div>
          </section>

          <section className={`space-y-4 ${cardInner} rounded-xl p-4`}>
            <h2 className={labelCls}>4 · Rewards & proof</h2>
            <div>
              <p className="text-slate-300">Reward type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['None', 'HC', 'Coins', 'Tokens'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRewardType(r)}
                    className={`${btnChip} ${rewardType === r ? btnChipOn : btnChipOff}`}
                  >
                    {r === 'None' ? 'No reward' : r === 'HC' ? 'DPAL HC' : r}
                  </button>
                ))}
              </div>
            </div>
            {rewardType !== 'None' ? (
              <label className="block text-sm">
                <span className="text-slate-300">Amount</span>
                <input
                  type="number"
                  min={0}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Math.max(0, Number(e.target.value || 0)))}
                  className={`${field} max-w-[200px]`}
                />
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={requiresProof}
                onChange={(e) => setRequiresProof(e.target.checked)}
                className="rounded border-slate-500 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
              />
              Require proof items for completion
            </label>
            <div>
              <p className="text-slate-300">Proof items</p>
              <p className="text-[11px] text-slate-500">Add each requirement as its own line.</p>
              <ul className="mt-2 space-y-2">
                {proofItems.map((line, i) => (
                  <li
                    key={`${line}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <span>{line}</span>
                    <button
                      type="button"
                      onClick={() => removeProof(i)}
                      className="shrink-0 text-xs text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={newProof}
                  onChange={(e) => setNewProof(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProof())}
                  className={`${field} min-w-[200px] flex-1`}
                  placeholder="e.g. Photo at drop-off"
                />
                <button type="button" onClick={addProof} className={btnGhost}>
                  Add proof item
                </button>
              </div>
            </div>
          </section>

          <section className={`space-y-3 ${cardInner} rounded-xl p-4`}>
            <h2 className={labelCls}>Initial tasks (optional)</h2>
            <ul className="space-y-2">
              {taskItems.map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
                >
                  <span>{line}</span>
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                className={`${field} min-w-[200px] flex-1`}
                placeholder="First checkpoint, handoff, etc."
              />
              <button type="button" onClick={addTask} className={btnGhost}>
                Add task
              </button>
            </div>
          </section>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className={btnPrimary}>
              Create &amp; open workspace
            </button>
            <button type="button" onClick={() => setStep('choice')} className={btnGhost}>
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMissionView;
