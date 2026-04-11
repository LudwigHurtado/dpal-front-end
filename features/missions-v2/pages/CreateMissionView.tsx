import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import type { MissionAssignmentV2Model } from '../types';
import { buildUserCreatedMission } from '../services/createMissionAdapter';
import type { CreateMissionInput } from '../createMissionTypes';
import {
  USER_MISSION_TYPE_OPTIONS,
  MISSION_CATEGORY_CARDS,
  MISSION_ENTRY_TYPE_CHIPS,
} from '../createMissionTypes';

interface CreateMissionViewProps {
  onCancel: () => void;
  /** Emits a full V2 model — parent saves and opens MissionAssignmentV2. */
  onComplete: (model: MissionAssignmentV2Model) => void;
  /** Mission Assignment V2 hub (browse / join). */
  onBrowseMissions: () => void;
}

/** Shared with MainMenu hero — `public/main-screen/dpal-mission-control-hero.png` */
const MISSION_CONTROL_HERO_SRC = '/main-screen/dpal-mission-control-hero.png';

/** Dark teal shell — aligned with DPAL civic / mission-control teal (not bright cyan). */
const shell = 'min-h-full bg-teal-950 text-slate-100';
const card =
  'rounded-2xl border border-teal-800/40 bg-teal-950/70 shadow-[0_0_48px_rgba(13,148,136,0.12)] backdrop-blur-sm';
const cardInner = 'rounded-xl border border-teal-900/45 bg-slate-950/55';
const sectionTitle =
  'mb-4 flex items-baseline gap-2 border-b border-teal-800/45 pb-2.5 text-[12px] font-bold uppercase tracking-[0.18em] text-teal-100/95';
const labelCls = 'text-[11px] font-semibold uppercase tracking-wider text-teal-300/80';
const field =
  'mt-1 w-full rounded-lg border border-teal-900/55 bg-slate-950/95 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-600/55 focus:outline-none focus:ring-2 focus:ring-teal-500/25';
const btnPrimary =
  'rounded-xl bg-gradient-to-r from-teal-800 to-teal-600 px-5 py-3 text-sm font-bold text-teal-50 shadow-[0_0_28px_rgba(13,148,136,0.4)] transition hover:from-teal-700 hover:to-teal-500 hover:shadow-[0_0_36px_rgba(13,148,136,0.5)]';
const btnGhost =
  'rounded-xl border border-teal-900/65 bg-teal-950/60 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-teal-700/60 hover:bg-teal-950/90';
const btnChip =
  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors';
const btnChipOn =
  'border-teal-500/50 bg-teal-950/90 text-teal-100 shadow-[0_0_18px_rgba(13,148,136,0.22)]';
const btnChipOff = 'border-teal-900/55 bg-teal-950/45 text-slate-300 hover:border-teal-800/80';

const CreateMissionView: React.FC<CreateMissionViewProps> = ({ onCancel, onComplete, onBrowseMissions }) => {
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const creator = useMemo(
    () => ({
      userId: user?.id ?? 'local',
      displayName: user?.fullName?.trim() || user?.username || 'Mission creator',
      profileHandle: user?.username ? `@${user.username}` : '@you',
    }),
    [user],
  );

  const [selectedEntryChip, setSelectedEntryChip] = useState<string | null>(null);

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

  const applyEntryChip = (p: (typeof MISSION_ENTRY_TYPE_CHIPS)[number]) => {
    setCategory(p.category);
    setMissionType(p.missionType);
    setSelectedEntryChip(p.label);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  return (
    <div className={`${shell} pb-28`}>
      <div className="mx-auto max-w-[880px] px-4 pt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-400/90">DPAL Mission Control</p>
          <button type="button" onClick={onCancel} className={btnGhost}>
            Exit to home
          </button>
        </div>

        {/* Interactive mission entry — not a passive banner */}
        <section
          className={`${card} overflow-hidden`}
          aria-label="How do you want to begin?"
        >
          <div className="relative min-h-[200px]">
            <img
              src={MISSION_CONTROL_HERO_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-950/90 to-teal-950/35"
              aria-hidden
            />
            <div className="relative z-10 px-5 pb-5 pt-8 sm:px-8 sm:pt-10">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-[2rem]">
                Create Your Own Mission
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Browse active missions in the hub, or build a custom mission for your community, team, or cause. Pick a
                mission type below, then complete the details — you&apos;ll land in the same Mission Assignment V2
                workspace as report-linked missions.
              </p>
            </div>
          </div>

          <div className="space-y-6 border-t border-teal-800/35 bg-teal-950/80 px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Choose how to begin</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={onBrowseMissions}
                className="group flex flex-col rounded-2xl border border-teal-900/70 bg-teal-950/70 p-6 text-left transition hover:border-teal-800 hover:bg-teal-950/95"
              >
                <span className="text-2xl" aria-hidden>
                  🗂️
                </span>
                <span className="mt-3 font-mono text-lg font-bold text-white">Browse Missions</span>
                <span className="mt-2 text-sm text-slate-400">
                  Open the mission hub — see workspaces, tasks, and teams.
                </span>
                <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-400/90 group-hover:text-teal-300">
                  Go to hub →
                </span>
              </button>

              <button
                type="button"
                onClick={scrollToForm}
                className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-teal-500/45 bg-gradient-to-br from-teal-800/35 via-teal-950/90 to-slate-950 p-6 text-left shadow-[0_0_40px_rgba(13,148,136,0.22)] ring-1 ring-teal-500/30 transition hover:border-teal-400/55 hover:shadow-[0_0_52px_rgba(13,148,136,0.32)]"
              >
                <span className="text-2xl" aria-hidden>
                  ✨
                </span>
                <span className="mt-3 font-mono text-lg font-bold text-white">Create Your Own Mission</span>
                <span className="mt-2 text-sm text-teal-100/90">
                  Define title, location, rewards, and proof — then create &amp; open your workspace.
                </span>
                <span className="mt-4 inline-flex items-center text-xs font-bold uppercase tracking-wide text-teal-200/95">
                  Continue to mission details ↓
                </span>
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mission type</p>
              <p className="mt-1 text-xs text-slate-500">
                Sets your category and mission type — refine anything in the form below.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MISSION_ENTRY_TYPE_CHIPS.map((p) => {
                  const on = selectedEntryChip === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        applyEntryChip(p);
                        scrollToForm();
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        on
                          ? 'border-teal-500/50 bg-teal-950/90 text-teal-50 shadow-[0_0_20px_rgba(13,148,136,0.22)]'
                          : 'border-teal-900/60 bg-teal-950/40 text-slate-300 hover:border-teal-800'
                      }`}
                    >
                      <span aria-hidden>{p.icon}</span>
                      <span className="font-medium leading-tight">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600/80">
          Mission details
        </p>

        <form
          ref={formRef}
          id="create-mission-details"
          onSubmit={handleSubmit}
          className={`${card} mt-3 space-y-8 p-5 sm:p-8`}
        >
          <section className={`space-y-5 p-1`}>
            <h2 className={sectionTitle}>
              <span className="text-teal-400/95">01</span> Mission basics
            </h2>
            <label className="block text-sm">
              <span className="text-slate-200">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={field}
                placeholder="Short, clear mission title"
              />
            </label>
            <div>
              <p className={labelCls}>Category</p>
              <p className="mt-1 text-xs text-slate-500">How this mission reads in lists and filters.</p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {MISSION_CATEGORY_CARDS.map((c) => {
                  const on = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                        on
                          ? 'border-teal-500/50 bg-teal-950/80 shadow-[0_0_22px_rgba(13,148,136,0.18)]'
                          : 'border-teal-900/60 bg-teal-950/45 hover:border-teal-800'
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
              <span className="text-slate-200">Description</span>
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
                <span className="text-slate-200">Location</span>
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
                  className="rounded border-teal-800 bg-teal-950 text-teal-500 focus:ring-teal-500/40"
                />
                Remote / online
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-slate-200">Urgency</span>
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
                <span className="text-slate-200">Start (optional)</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-200">Deadline (optional)</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={field}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-200">Max participants</span>
              <input
                type="number"
                min={1}
                value={participantLimit}
                onChange={(e) => setParticipantLimit(Math.max(1, Number(e.target.value || 1)))}
                className={`${field} max-w-[200px]`}
              />
            </label>
          </section>

          <section className={`space-y-4 p-1`}>
            <h2 className={sectionTitle}>
              <span className="text-teal-400/95">02</span> Mission type
            </h2>
            <div className={`${cardInner} p-4`}>
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
            </div>
          </section>

          <section className={`space-y-4 p-1`}>
            <h2 className={sectionTitle}>
              <span className="text-teal-400/95">03</span> Participation
            </h2>
            <div className={`${cardInner} grid grid-cols-1 gap-4 p-4 sm:grid-cols-2`}>
              <label className="block text-sm">
                <span className="text-slate-200">Visibility</span>
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
                <span className="text-slate-200">Join policy</span>
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

          <section className={`space-y-5 p-1`}>
            <h2 className={sectionTitle}>
              <span className="text-teal-400/95">04</span> Rewards &amp; proof
            </h2>
            <div className={`${cardInner} space-y-4 p-4`}>
              <div>
                <p className="text-sm text-slate-200">Reward type</p>
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
                  <span className="text-slate-200">Amount</span>
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
                  className="rounded border-teal-800 bg-teal-950 text-teal-500 focus:ring-teal-500/40"
                />
                Require proof items for completion
              </label>
              <div>
                <p className="text-sm text-slate-200">Proof items</p>
                <p className="text-[11px] text-slate-500">Add each requirement as its own line.</p>
                <ul className="mt-2 space-y-2">
                  {proofItems.map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-teal-900/50 bg-teal-950/60 px-3 py-2 text-sm text-slate-200"
                    >
                      <span>{line}</span>
                      <button
                        type="button"
                        onClick={() => removeProof(i)}
                        className="shrink-0 text-xs text-rose-400/95 hover:text-rose-300"
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
            </div>
          </section>

          <section className={`space-y-4 p-1`}>
            <h2 className={sectionTitle}>
              <span className="text-teal-400/95">05</span> Initial tasks (optional)
            </h2>
            <div className={`${cardInner} space-y-3 p-4`}>
              <ul className="space-y-2">
                {taskItems.map((line, i) => (
                  <li
                    key={`${line}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-teal-900/50 bg-teal-950/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <span>{line}</span>
                    <button
                      type="button"
                      onClick={() => removeTask(i)}
                      className="text-xs text-rose-400/95 hover:text-rose-300"
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
            </div>
          </section>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-teal-800/40 pt-6">
            <button type="submit" className={btnPrimary}>
              Create &amp; open workspace
            </button>
            <button type="button" onClick={onCancel} className={btnGhost}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMissionView;
