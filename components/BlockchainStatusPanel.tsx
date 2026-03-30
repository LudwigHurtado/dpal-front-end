import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '../i18n';
import { Cube, Search, Loader, ShieldCheck, AlertTriangle, Database, Activity, Globe, CheckCircle } from './icons';
import { getApiBase } from '../constants';

type BlockLookupResult = { ok: true } | { ok: false; reason: 'invalid' | 'not_found' };
type AnchorHealth = 'checking' | 'reachable' | 'unreachable' | 'unknown';

interface BlockchainStatusPanelProps {
  totalReports: number;
  latestHash?: string;
  latestBlockNumber?: number;
  onOpenReportByBlock?: (raw: string) => Promise<BlockLookupResult>;
}

const CHAIN_NAME = 'DPAL Internal Ledger';
const CHAIN_TAG  = 'DPAL_INTERNAL';
const HASH_METHOD = 'SHA-256 (Web Crypto API)';

const BlockchainStatusPanel: React.FC<BlockchainStatusPanelProps> = ({
  totalReports,
  latestHash,
  latestBlockNumber,
  onOpenReportByBlock,
}) => {
  const { t } = useTranslations();
  const [currentBlock, setCurrentBlock] = useState(latestBlockNumber || 6843021);
  const [blockInput, setBlockInput] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const [anchorHealth, setAnchorHealth] = useState<AnchorHealth>('unknown');
  const [anchorLatency, setAnchorLatency] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (latestBlockNumber && latestBlockNumber > 0) setCurrentBlock(latestBlockNumber);
  }, [latestBlockNumber]);

  /* ── Real health check: ping the anchor endpoint ── */
  const checkAnchorHealth = useCallback(async () => {
    setAnchorHealth('checking');
    const t0 = performance.now();
    try {
      const base = getApiBase().replace(/\/$/, '');
      const res = await fetch(`${base}/api/reports`, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const ms = Math.round(performance.now() - t0);
      setAnchorLatency(ms);
      setAnchorHealth(res.ok || res.status === 405 ? 'reachable' : 'unreachable');
    } catch {
      setAnchorHealth('unreachable');
      setAnchorLatency(null);
    }
  }, []);

  useEffect(() => {
    void checkAnchorHealth();
    const id = setInterval(() => void checkAnchorHealth(), 60_000);
    return () => clearInterval(id);
  }, [checkAnchorHealth]);

  const runBlockLookup = async () => {
    if (!onOpenReportByBlock || !blockInput.trim() || lookupBusy) return;
    setLookupBusy(true);
    setLookupHint(null);
    try {
      const result = await onOpenReportByBlock(blockInput);
      if (result.ok) {
        setBlockInput('');
        setLookupHint(null);
      } else if (result.reason === 'invalid') {
        setLookupHint(t('blockchainLookup.invalidBlock'));
      } else {
        setLookupHint(t('blockchainLookup.notFound'));
      }
    } finally {
      setLookupBusy(false);
    }
  };

  const healthColor = anchorHealth === 'reachable' ? '#16a34a' : anchorHealth === 'unreachable' ? '#dc2626' : '#d97706';
  const healthLabel = anchorHealth === 'reachable' ? 'Backend Reachable' : anchorHealth === 'unreachable' ? 'Backend Unreachable' : anchorHealth === 'checking' ? 'Checking…' : 'Not Checked';
  const healthBg    = anchorHealth === 'reachable' ? '#f0fdf4' : anchorHealth === 'unreachable' ? '#fef2f2' : '#fffbeb';

  return (
    <div className="my-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div style={{ background: '#0f172a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Database style={{ width: 16, height: 16, color: '#94a3b8' }} />
        <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'white', margin: 0 }}>
          {CHAIN_NAME}
        </p>
        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b', background: '#1e293b', padding: '2px 7px', borderRadius: 4 }}>
          {CHAIN_TAG}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#475569' }}>
          Hash: {HASH_METHOD}
        </span>
      </div>

      {/* Honest transparency notice */}
      <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
        <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', margin: 0 }}>
          DPAL currently uses an <strong>internal SHA-256 ledger</strong> — not a public blockchain. Files are hashed with Web Crypto. Reports are anchored to a private backend. Public blockchain integration (Ethereum/Polygon) is a future milestone.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
        {/* Block height */}
        <div style={{ padding: '14px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', margin: '0 0 4px' }}>Latest Block</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Cube style={{ width: 14, height: 14, color: '#3b82f6' }} />
            <p style={{ fontSize: 18, fontWeight: 900, color: '#2563eb', margin: 0, fontFamily: 'monospace' }}>{currentBlock.toLocaleString()}</p>
          </div>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>Derived from report IDs</p>
        </div>

        {/* Total records */}
        <div style={{ padding: '14px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', margin: '0 0 4px' }}>Records Filed</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, fontFamily: 'monospace' }}>{totalReports.toLocaleString()}</p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>localStorage + backend</p>
        </div>

        {/* Backend health */}
        <div style={{ padding: '14px 16px', textAlign: 'center', borderRight: '1px solid #f1f5f9', background: healthBg }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', margin: '0 0 4px' }}>Backend Anchor</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {anchorHealth === 'checking'
              ? <Loader style={{ width: 14, height: 14, color: '#d97706' }} className="animate-spin" />
              : anchorHealth === 'reachable'
              ? <CheckCircle style={{ width: 14, height: 14, color: '#16a34a' }} />
              : <AlertTriangle style={{ width: 14, height: 14, color: '#dc2626' }} />}
            <p style={{ fontSize: 13, fontWeight: 900, color: healthColor, margin: 0 }}>{healthLabel}</p>
          </div>
          {anchorLatency !== null && (
            <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>{anchorLatency}ms latency</p>
          )}
        </div>

        {/* Latest hash */}
        <div style={{ padding: '14px 16px', textAlign: 'center', overflow: 'hidden' }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', margin: '0 0 4px' }}>Latest Hash (SHA-256)</p>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}
            title={latestHash || 'PENDING_FIRST_ANCHOR'}>
            {latestHash || 'PENDING_FIRST_ANCHOR'}
          </p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>Real SHA-256 when file attached</p>
        </div>
      </div>

      {/* What IS and ISN'T real — expand panel */}
      <div style={{ borderBottom: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={() => setShowDetails(d => !d)}
          style={{ width: '100%', padding: '9px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
        >
          <Activity style={{ width: 13, height: 13, color: '#64748b' }} />
          <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#374151' }}>
            Ledger Transparency Report — What is real vs simulated
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{showDetails ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showDetails && (
          <div style={{ padding: '4px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {([
              ['✅ Real', 'SHA-256 file hashing — browser Web Crypto API'],
              ['✅ Real', 'Report storage — Railway backend + localStorage'],
              ['✅ Real', 'Public lookup URL — ?reportId= link works across devices'],
              ['✅ Real', 'Evidence vault — files anchored via /api/reports/:id/evidence'],
              ['⚠️ Derived', 'Block numbers — computed from report ID hash (FNV), not a chain node'],
              ['⚠️ Fallback', 'Report hash — SHA-256 if API works; random 0x hex if backend down'],
              ['⚠️ Fallback', 'txHash — server value when anchored; random hex when offline'],
              ['❌ Not yet', 'Public blockchain — Ethereum/Polygon/Solana integration is a future milestone'],
              ['❌ Not yet', 'Smart contracts — no on-chain contract deployed'],
              ['❌ Not yet', 'Wallet signing — no web3 wallet connection in this version'],
            ] as [string, string][]).map(([status, desc]) => (
              <div key={desc} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{status.split(' ')[0]}</span>
                <div>
                  <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#374151' }}>{status.split(' ').slice(1).join(' ')}</span>
                  <p style={{ fontSize: 9, color: '#6b7280', margin: '1px 0 0', lineHeight: 1.4 }}>{desc}</p>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', marginTop: 6, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
                🔗 <strong>To connect a public blockchain:</strong> Set up a backend that calls an Ethereum/Polygon RPC node from <code>/api/reports/anchor</code>, returns a real <code>txHash</code> and <code>blockNumber</code>, and set <code>VITE_FEATURE_BLOCKCHAIN_ANCHOR=true</code> in your environment. The front end is already wired to use those values.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Block lookup */}
      {onOpenReportByBlock && (
        <div className="p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">{t('blockchainLookup.title')}</p>
          <p className="text-xs text-gray-500 text-center mb-3">{t('blockchainLookup.description')}</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200">
              <Search className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('blockchainLookup.placeholder')}
                value={blockInput}
                onChange={(e) => { setBlockInput(e.target.value); setLookupHint(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void runBlockLookup(); }}
                className="w-full min-w-0 bg-transparent text-sm font-mono text-gray-800 outline-none placeholder:text-gray-400"
                aria-label={t('blockchainLookup.title')}
              />
            </div>
            <button
              type="button"
              disabled={lookupBusy || !blockInput.trim()}
              onClick={() => void runBlockLookup()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lookupBusy ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('blockchainLookup.openFiling')}
            </button>
          </div>
          {lookupHint && <p className="mt-2 text-center text-xs text-rose-600">{lookupHint}</p>}
        </div>
      )}
    </div>
  );
};

export default BlockchainStatusPanel;
