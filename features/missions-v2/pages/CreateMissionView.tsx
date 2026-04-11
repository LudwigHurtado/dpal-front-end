import React, { useMemo, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import type { MissionAssignmentV2Model } from '../types';
import { buildUserCreatedMission } from '../services/createMissionAdapter';
import type { CreateMissionInput } from '../createMissionTypes';
import { USER_MISSION_TYPE_OPTIONS } from '../createMissionTypes';

interface CreateMissionViewProps {
  onCancel: () => void;
  /** Emits a full V2 model — parent saves and opens MissionAssignmentV2. */
  onComplete: (model: MissionAssignmentV2Model) => void;
}

const emptyTaskLines = '';

/** Shared with MainMenu hero — `public/main-screen/dpal-mission-control-hero.png` */
const MISSION_CONTROL_HERO_SRC = '/main-screen/dpal-mission-control-hero.png';

const CreateMissionView: React.FC<CreateMissionViewProps> = ({ onCancel, onComplete }) => {
  const { user } = useAuth();
  const creator = useMemo(
    () => ({
      userId: user?.id ?? 'local',
      displayName: user?.fullName?.trim() || user?.username || 'Mission creator',
      profileHandle: user?.username ? `@${user.username}` : '@you',
    }),
    [user],
  );

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Community');
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
  const [proofLines, setProofLines] = useState('Photo or timestamp\nWritten confirmation');
  const [taskLines, setTaskLines] = useState(emptyTaskLines);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Add a mission title.');
      return;
    }
    setError(null);
    const proofLabels = proofLines
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const initialTasks = taskLines
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

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
    <div className="mx-auto max-w-[720px] space-y-4 pb-24 text-slate-800">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
        <img
          src={MISSION_CONTROL_HERO_SRC}
          alt="DPAL Mission Control"
          className="h-auto w-full max-h-[min(52vh,320px)] object-cover object-center"
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Create mission</h1>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      <p className="text-sm text-slate-600">
        This uses the same Mission Assignment V2 workspace as report-driven missions. Invites and join requests come in a later phase.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">1. Mission basics</h2>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Short, clear mission title"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="What needs to happen, constraints, safety notes…"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Location</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isRemote}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-200"
                placeholder={isRemote ? 'Remote' : 'Address or area'}
              />
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
              Remote / online
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Urgency</span>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Start (optional)</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Deadline (optional)</span>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Max participants</span>
            <input
              type="number"
              min={1}
              value={participantLimit}
              onChange={(e) => setParticipantLimit(Math.max(1, Number(e.target.value || 1)))}
              className="mt-1 w-full max-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">2. Mission type</h2>
          <select
            value={missionType}
            onChange={(e) => setMissionType(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {USER_MISSION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">3. Participation</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Visibility</span>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as CreateMissionInput['visibility'])}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="public">Public</option>
                <option value="invite_only">Invite only</option>
                <option value="hybrid">Hybrid (public + invites)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Join policy</span>
              <select
                value={joinPolicy}
                onChange={(e) => setJoinPolicy(e.target.value as CreateMissionInput['joinPolicy'])}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="approval_required">Approval required</option>
                <option value="invite_only">Invite only</option>
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">4. Rewards & proof</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Reward type</span>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as CreateMissionInput['rewardType'])}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="None">No reward</option>
                <option value="HC">DPAL HC</option>
                <option value="Coins">Coins</option>
                <option value="Tokens">Tokens</option>
              </select>
            </label>
            {rewardType !== 'None' ? (
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Amount</span>
                <input
                  type="number"
                  min={0}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Math.max(0, Number(e.target.value || 0)))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiresProof} onChange={(e) => setRequiresProof(e.target.checked)} />
            Require proof items for completion
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Proof lines (one per line)</span>
            <textarea
              value={proofLines}
              onChange={(e) => setProofLines(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Initial tasks (optional)</h2>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">One task per line</span>
            <textarea
              value={taskLines}
              onChange={(e) => setTaskLines(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="First arrival&#10;Document handoff"
            />
          </label>
        </section>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create &amp; open workspace
          </button>
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateMissionView;
