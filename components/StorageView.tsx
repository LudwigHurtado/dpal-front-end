import React, { useEffect, useState } from 'react';
import { ArrowLeft, Database } from './icons';
import { getApiBase } from '../constants';
import { listEscrows } from '../services/operationsService';

interface StorageViewProps {
  onReturn: () => void;
  reportCount?: number;
}

const StorageView: React.FC<StorageViewProps> = ({ onReturn, reportCount = 0 }) => {
  const [escrowCount, setEscrowCount] = useState(0);

  useEffect(() => {
    listEscrows().then((list) => setEscrowCount(list.length)).catch(() => setEscrowCount(0));
  }, []);

  const apiBase = getApiBase();
  const storageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}${window.location.pathname.endsWith('/') ? '' : ''}?view=storage`
    : `${apiBase}/?view=storage`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(storageUrl)}&bgcolor=0f172a&color=22d3ee&margin=12`;

  return (
    <div className="max-w-2xl mx-auto text-white font-mono animate-fade-in pb-28 px-4">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onReturn} className="inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>
        <h1 className="text-sm font-black uppercase tracking-tight">Storage & MongoDB</h1>
      </header>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Where your data is stored</h2>
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
          All folders and collections (escrows, reports, NFTs, etc.) are stored on MongoDB via the backend below.
        </p>
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700 break-all">
          <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Backend (Railway → MongoDB)</p>
          <a
            href={apiBase}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-cyan-400 hover:underline"
          >
            {apiBase}
          </a>
        </div>
        <ul className="text-xs text-zinc-400 space-y-1">
          <li>• Escrows (this device + backend when API is live)</li>
          <li>• Reports (Ledger)</li>
          <li>• NFT receipts, personas, missions (when backend is configured)</li>
        </ul>
      </div>

      <div className="mt-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
        <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-2">QR code – link to this storage page</h2>
        <p className="text-[10px] text-zinc-500 mb-4">Scan to open this view and see where data is stored.</p>
        <div className="inline-flex flex-col items-center p-4 rounded-2xl bg-zinc-950 border-2 border-cyan-500/30">
          <img src={qrImageUrl} alt="QR code linking to storage / MongoDB info" className="w-[280px] h-[280px]" />
          <p className="mt-3 text-[9px] font-black uppercase text-zinc-500 tracking-wider max-w-[260px] break-all">
            {storageUrl}
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-500">
        <p className="font-black uppercase text-zinc-400 mb-1">Current counts (this session)</p>
        <p>Escrows: {escrowCount} · Reports: {reportCount}</p>
      </div>
    </div>
  );
};

export default StorageView;
