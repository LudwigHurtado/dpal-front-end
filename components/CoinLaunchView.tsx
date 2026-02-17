import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Coins, Database, ShieldCheck, Zap, Broadcast, Scale, Award, Loader } from './icons';
import { createTokenRecord, fetchTokenRecords, type TokenAction, type TokenUtilityRecord } from '../services/tokenLaunchService';

interface CoinLaunchViewProps {
  onReturn: () => void;
}

const ACTIONS: Array<{ key: TokenAction; label: string; icon: React.ReactNode; hint: string }> = [
  { key: 'STAKE_VERIFY', label: 'Stake to Verify Reports', icon: <ShieldCheck className="w-4 h-4" />, hint: 'Stake utility tokens to validate evidence and consensus.' },
  { key: 'UNLOCK_TOOL', label: 'Unlock Investigation Tools', icon: <Zap className="w-4 h-4" />, hint: 'Activate advanced forensic and investigation modules.' },
  { key: 'SPONSOR_MISSION', label: 'Sponsor Missions', icon: <Broadcast className="w-4 h-4" />, hint: 'Fund community missions tied to active cases.' },
  { key: 'REWARD_WHISTLEBLOWER', label: 'Reward Whistleblowers', icon: <Award className="w-4 h-4" />, hint: 'Reward verified high-impact disclosures.' },
  { key: 'GOVERNANCE_VOTE', label: 'Governance Voting', icon: <Scale className="w-4 h-4" />, hint: 'Vote on treasury allocation and policy priorities.' },
];

const CoinLaunchView: React.FC<CoinLaunchViewProps> = ({ onReturn }) => {
  const [records, setRecords] = useState<TokenUtilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [actor, setActor] = useState('DPAL_OPERATOR');
  const [action, setAction] = useState<TokenAction>('STAKE_VERIFY');
  const [amount, setAmount] = useState<number>(50);
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchTokenRecords(100);
      setRecords(data);
    } catch (error) {
      console.warn('Token records load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const selectedActionMeta = useMemo(() => ACTIONS.find((a) => a.key === action), [action]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor.trim() || amount <= 0) return;

    setSubmitting(true);
    try {
      const created = await createTokenRecord({
        actor: actor.trim(),
        action,
        amount,
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setRecords((prev) => [created, ...prev]);
      setReferenceId('');
      setNotes('');
    } catch (error) {
      console.warn('Token record create failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in font-mono text-white max-w-6xl mx-auto px-4 pb-20">
      <button onClick={onReturn} className="inline-flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors mb-10 group">
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span>Return</span>
      </button>

      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/30 px-4 py-2 rounded-full">
          <Coins className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400">Token Launch</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mt-4">DPAL Utility Coin Control</h1>
        <p className="text-zinc-500 text-xs uppercase tracking-widest mt-3">Action-driven utility. No speculative framing.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleCreate} className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 space-y-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-cyan-400">Create Utility Record</h2>

          <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Actor" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm" />

          <select value={action} onChange={(e) => setAction(e.target.value as TokenAction)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm">
            {ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>

          <div className="text-[11px] text-zinc-400 uppercase">{selectedActionMeta?.hint}</div>

          <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} placeholder="Amount" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm" />
          <input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="Reference ID (optional)" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm min-h-[90px]" />

          <button type="submit" disabled={submitting} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-xl py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>{submitting ? 'Saving...' : 'Save Record to Ledger DB'}</span>
          </button>
        </form>

        <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Stored Launch Records</h2>
            <button onClick={loadRecords} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white">Refresh</button>
          </div>

          {loading ? (
            <div className="text-zinc-500 text-xs uppercase">Loading records...</div>
          ) : records.length === 0 ? (
            <div className="text-zinc-500 text-xs uppercase">No records stored yet.</div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-2">
              {records.map((r) => (
                <article key={r._id} className="bg-black/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">{r.action}</span>
                    <span className="text-[10px] text-emerald-400 font-black uppercase">Block #{r.blockNumber}</span>
                  </div>
                  <p className="text-xs text-white font-bold uppercase">{r.actor} • {r.amount} DPAL</p>
                  <p className="text-[10px] text-zinc-500 break-all">TX: {r.txHash}</p>
                  {r.referenceId && <p className="text-[10px] text-zinc-500 uppercase">REF: {r.referenceId}</p>}
                  {r.notes && <p className="text-[10px] text-zinc-400">{r.notes}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CoinLaunchView;
