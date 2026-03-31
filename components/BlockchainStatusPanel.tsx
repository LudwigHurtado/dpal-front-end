import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '../i18n';
import { Cube, Search, Loader, Database, CheckCircle, AlertTriangle, Activity, ShieldCheck, Globe } from './icons';
import { getApiBase } from '../constants';
import {
  getChainState,
  getChain,
  verifyChain,
  exportChainJson,
  DPAL_CHAIN_ID,
  type DpalBlock,
} from '../services/dpalChainService';

type BlockLookupResult = { ok: true } | { ok: false; reason: 'invalid' | 'not_found' };
type BackendHealth = 'checking' | 'reachable' | 'unreachable' | 'unknown';

interface BlockchainStatusPanelProps {
  totalReports: number;
  latestHash?: string;
  latestBlockNumber?: number;
  onOpenReportByBlock?: (raw: string) => Promise<BlockLookupResult>;
}

const BlockchainStatusPanel: React.FC<BlockchainStatusPanelProps> = ({
  totalReports,
  latestHash: _latestHashProp,
  latestBlockNumber: _latestBlockNumberProp,
  onOpenReportByBlock,
}) => {
  const { t } = useTranslations();

  // ── DPAL Private Chain state ──
  const [chainBlocks, setChainBlocks]           = useState<DpalBlock[]>([]);
  const [chainIntegrity, setChainIntegrity]     = useState<'VERIFIED' | 'COMPROMISED' | 'EMPTY' | 'CHECKING'>('CHECKING');
  const [integrityDetail, setIntegrityDetail]   = useState<string>('');
  const [backendHealth, setBackendHealth]       = useState<BackendHealth>('unknown');
  const [backendLatency, setBackendLatency]     = useState<number | null>(null);
  const [lastVerified, setLastVerified]         = useState<string>('');
  const [blockInput, setBlockInput]             = useState('');
  const [lookupBusy, setLookupBusy]             = useState(false);
  const [lookupHint, setLookupHint]             = useState<string | null>(null);
  const [showChainBlocks, setShowChainBlocks]   = useState(false);
  const [showTxLog, setShowTxLog]               = useState(false);

  // ── Load chain state and run verification ──
  const refreshChain = useCallback(async () => {
    const state = getChainState();
    const allBlocks = getChain();
    setChainBlocks(allBlocks);
    setChainIntegrity('CHECKING');
    const result = await verifyChain();
    setChainIntegrity(result.status);
    setIntegrityDetail(
      result.status === 'COMPROMISED'
        ? (result.detail ?? 'Chain integrity check failed.')
        :       result.status === 'EMPTY'
        ? 'Chain engine is ready. Submit your first report to initialize the genesis block and begin recording.'
        : `All ${result.checkedBlocks} blocks verified. Chain is intact.`,
    );
    setLastVerified(new Date().toISOString());
    void state; // suppress unused warning
  }, []);

  useEffect(() => {
    void refreshChain();
    const id = setInterval(() => void refreshChain(), 30_000);
    return () => clearInterval(id);
  }, [refreshChain]);

  // ── Backend health check ──
  // Any HTTP response at all (even 404/405/500) means the server is UP and reachable.
  // Only a network-level failure (timeout, DNS fail, refused) means truly unreachable.
  const checkBackend = useCallback(async () => {
    setBackendHealth('checking');
    const t0 = performance.now();
    try {
      const base = getApiBase().replace(/\/$/, '');
      // Try HEAD first; fall back to GET if HEAD isn't supported
      let res: Response;
      try {
        res = await fetch(`${base}/api/reports`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        res = await fetch(`${base}/api/reports`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
      }
      setBackendLatency(Math.round(performance.now() - t0));
      // Any HTTP response = server is reachable (even 404 = server up, route not configured)
      setBackendHealth('reachable');
    } catch {
      // True network failure — DNS, connection refused, timeout
      setBackendHealth('unreachable');
      setBackendLatency(null);
    }
  }, []);

  useEffect(() => {
    void checkBackend();
    const id = setInterval(() => void checkBackend(), 60_000);
    return () => clearInterval(id);
  }, [checkBackend]);

  const runBlockLookup = async () => {
    if (!onOpenReportByBlock || !blockInput.trim() || lookupBusy) return;
    setLookupBusy(true);
    setLookupHint(null);
    try {
      const result = await onOpenReportByBlock(blockInput);
      if (result.ok) {
        setBlockInput('');
      } else if (result.reason === 'invalid') {
        setLookupHint(t('blockchainLookup.invalidBlock'));
      } else {
        setLookupHint(t('blockchainLookup.notFound'));
      }
    } finally {
      setLookupBusy(false);
    }
  };

  const handleExport = () => {
    const json = exportChainJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `dpal-private-chain-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derived display values
  const latest        = chainBlocks[chainBlocks.length - 1];
  const latestHash    = latest?.hash ?? '';
  const chainLength   = chainBlocks.length;
  const nonGenesis    = chainBlocks.filter((b) => b.reportId !== 'DPAL_GENESIS');

  const integrityColor = chainIntegrity === 'VERIFIED' ? '#16a34a' : chainIntegrity === 'COMPROMISED' ? '#dc2626' : chainIntegrity === 'CHECKING' ? '#d97706' : '#0077C8';
  const integrityLabel = chainIntegrity === 'VERIFIED' ? 'VERIFIED ✓' : chainIntegrity === 'COMPROMISED' ? 'COMPROMISED ✗' : chainIntegrity === 'CHECKING' ? 'Verifying…' : 'READY — Awaiting First Report';
  const integrityBg    = chainIntegrity === 'VERIFIED' ? '#f0fdf4' : chainIntegrity === 'COMPROMISED' ? '#fef2f2' : chainIntegrity === 'EMPTY' ? '#EFF6FF' : '#fffbeb';

  const backendColor = backendHealth === 'reachable' ? '#16a34a' : backendHealth === 'unreachable' ? '#dc2626' : '#d97706';
  const backendLabel = backendHealth === 'reachable' ? 'Online ✓' : backendHealth === 'unreachable' ? 'Unreachable' : backendHealth === 'checking' ? 'Checking…' : 'Unknown';

  return (
    <div style={{ margin: '24px 0', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

      {/* ── TOP HEADER STRIP ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Database style={{ width: 17, height: 17, color: '#7dd3fc' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '0.04em' }}>DPAL Private Chain</p>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.25em', margin: '1px 0 0' }}>{DPAL_CHAIN_ID}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '3px 8px', borderRadius: 5 }}>
            SHA-256 Linked Blocks
          </span>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a3e635', background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.3)', padding: '3px 8px', borderRadius: 5 }}>
            DPAL Owned · Private
          </span>
        </div>
      </div>

      {/* ── CHAIN INTEGRITY BANNER ── */}
      <div style={{ background: integrityBg, borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {chainIntegrity === 'CHECKING'
          ? <Loader style={{ width: 14, height: 14, color: '#d97706' }} className="animate-spin" />
          : chainIntegrity === 'VERIFIED'
          ? <ShieldCheck style={{ width: 14, height: 14, color: '#16a34a' }} />
          : chainIntegrity === 'COMPROMISED'
          ? <AlertTriangle style={{ width: 14, height: 14, color: '#dc2626' }} />
          : <ShieldCheck style={{ width: 14, height: 14, color: '#0077C8' }} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: integrityColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Chain Integrity: {integrityLabel}
          </p>
          <p style={{ fontSize: 9, color: '#6b7280', margin: '2px 0 0' }}>{integrityDetail}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => void refreshChain()}
            style={{ fontSize: 9, fontWeight: 700, color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
          >
            Re-verify
          </button>
          {chainLength > 1 && (
            <button
              type="button"
              onClick={handleExport}
              style={{ fontSize: 9, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
            >
              Export Chain
            </button>
          )}
        </div>
        {lastVerified && (
          <p style={{ fontSize: 8, color: '#9ca3af', flexShrink: 0 }}>Last verified: {lastVerified.substring(11, 19)} UTC</p>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
        {/* Chain length */}
        <div style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 5px' }}>Chain Length</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Cube style={{ width: 14, height: 14, color: '#3b82f6' }} />
            <p style={{ fontSize: 22, fontWeight: 900, color: '#2563eb', margin: 0, fontFamily: 'monospace' }}>{chainLength}</p>
          </div>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>blocks (incl. genesis)</p>
        </div>

        {/* Report records */}
        <div style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 5px' }}>Reports Anchored</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0, fontFamily: 'monospace' }}>{nonGenesis.length}</p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>on DPAL Private Chain</p>
        </div>

        {/* Integrity */}
        <div style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #f1f5f9', background: integrityBg }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 5px' }}>Integrity</p>
          <p style={{ fontSize: chainIntegrity === 'EMPTY' ? 10 : 14, fontWeight: 900, color: integrityColor, margin: 0, fontFamily: 'monospace' }}>{chainIntegrity === 'EMPTY' ? 'READY' : integrityLabel}</p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>{chainIntegrity === 'EMPTY' ? 'Awaiting first report' : 'Full SHA-256 chain check'}</p>
        </div>

        {/* Backend sync */}
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', margin: '0 0 5px' }}>Backend Sync</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {backendHealth === 'checking'
              ? <Loader style={{ width: 13, height: 13, color: '#d97706' }} className="animate-spin" />
              : backendHealth === 'reachable'
              ? <CheckCircle style={{ width: 13, height: 13, color: '#16a34a' }} />
              : <AlertTriangle style={{ width: 13, height: 13, color: '#dc2626' }} />}
            <p style={{ fontSize: 13, fontWeight: 900, color: backendColor, margin: 0 }}>{backendLabel}</p>
          </div>
          {backendLatency !== null && (
            <p style={{ fontSize: 8, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>{backendLatency}ms</p>
          )}
        </div>
      </div>

      {/* ── LATEST BLOCK HASH ── */}
      {latestHash && (
        <div style={{ padding: '10px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9ca3af', margin: 0, flexShrink: 0 }}>Latest Block Hash</p>
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#1e40af', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={latestHash}>
            {latestHash}
          </p>
          {latest && (
            <p style={{ fontSize: 8, color: '#9ca3af', margin: 0, flexShrink: 0 }}>
              Block #{latest.index} · {latest.timestamp.substring(0, 10)}
            </p>
          )}
        </div>
      )}

      {/* ── TRANSACTION LOG (expandable) ── */}
      {nonGenesis.length > 0 && (
        <div style={{ borderBottom: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => setShowTxLog((s) => !s)}
            style={{ width: '100%', padding: '9px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
          >
            <Activity style={{ width: 12, height: 12, color: '#64748b' }} />
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#374151' }}>
              Transaction Log — {nonGenesis.length} records on-chain
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{showTxLog ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showTxLog && (
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 24px 12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Timestamp', 'Report ID', 'Data Hash', 'Block Hash', 'Prev Hash'].map((h) => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...nonGenesis].reverse().map((b) => (
                    <tr key={b.index} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 900 }}>#{b.index}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#374151' }}>{b.timestamp.substring(0, 19).replace('T', ' ')}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#374151', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.reportId}>{b.reportId}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#6b7280' }}>{b.dataHash.substring(0, 10)}…</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>{b.hash.substring(0, 12)}…</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#9ca3af' }}>{b.previousHash.substring(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FULL BLOCK EXPLORER (expandable) ── */}
      {chainLength > 0 && (
        <div style={{ borderBottom: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => setShowChainBlocks((s) => !s)}
            style={{ width: '100%', padding: '9px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}
          >
            <Globe style={{ width: 12, height: 12, color: '#64748b' }} />
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#374151' }}>
              Full Block Explorer — {chainLength} total blocks
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{showChainBlocks ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showChainBlocks && (
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...chainBlocks].reverse().map((b) => (
                <div key={b.index} style={{ background: b.reportId === 'DPAL_GENESIS' ? '#f8fafc' : '#ffffff', border: `1px solid ${b.reportId === 'DPAL_GENESIS' ? '#e2e8f0' : '#dbeafe'}`, borderRadius: 8, padding: '9px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: b.reportId === 'DPAL_GENESIS' ? '#6b7280' : '#1e40af', fontFamily: 'monospace' }}>
                      Block #{b.index} {b.reportId === 'DPAL_GENESIS' ? '— GENESIS' : ''}
                    </span>
                    <span style={{ fontSize: 8, color: '#9ca3af', fontFamily: 'monospace' }}>{b.timestamp.substring(0, 19).replace('T', ' ')} UTC</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '2px 8px', fontSize: 8 }}>
                    {[
                      ['Report ID', b.reportId],
                      ['Data Hash', b.dataHash],
                      ['Block Hash', b.hash],
                      ['Prev Hash', b.previousHash],
                    ].map(([label, val]) => (
                      <React.Fragment key={label}>
                        <span style={{ fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                        <span style={{ fontFamily: 'monospace', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>{val}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCK LOOKUP ── */}
      {onOpenReportByBlock && (
        <div style={{ padding: '14px 24px' }}>
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
