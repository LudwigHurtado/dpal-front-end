import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle } from './icons';
import { fetchOpsConfidence } from '../services/operationsService';

const OperationalConfidencePanel: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchOpsConfidence().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-black">Operational Confidence</p>
        <Activity className="w-4 h-4 text-cyan-400" />
      </div>
      <p className="text-2xl font-black text-white mt-2">{data.score}%</p>
      <p className="text-[10px] uppercase text-zinc-400">{data.status}</p>
      {Array.isArray(data.alerts) && data.alerts.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.alerts.map((a: string, i: number) => (
            <p key={i} className="text-[10px] text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{a}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperationalConfidencePanel;
