import React, { useEffect, useState } from 'react';
import { Database } from './icons';
import { fetchTransparencyMetrics } from '../services/operationsService';

const LiveTransparencyMetricsCard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchTransparencyMetrics().then(setData).catch(() => setData(null));
  }, []);

  if (!data?.totals) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-black">Live Transparency</p>
        <Database className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div><p className="text-lg font-black text-white">{data.totals.anchoredReports}</p><p className="text-[9px] text-zinc-400 uppercase">Anchored</p></div>
        <div><p className="text-lg font-black text-white">{data.totals.evidenceArtifacts}</p><p className="text-[9px] text-zinc-400 uppercase">Evidence</p></div>
        <div><p className="text-lg font-black text-white">{data.totals.anchorsLast24h}</p><p className="text-[9px] text-zinc-400 uppercase">24h</p></div>
      </div>
      <p className="text-[9px] text-zinc-500 mt-2">{data.utilityDisclosure}</p>
    </div>
  );
};

export default LiveTransparencyMetricsCard;
