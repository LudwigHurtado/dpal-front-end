import React, { useEffect, useState } from 'react';
import { ShieldCheck } from './icons';
import { computeVerifierScore } from '../services/operationsService';

const VerifierConfidenceCard: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    computeVerifierScore({
      baseTrust: 70,
      evidenceIntegrity: 82,
      timeliness: 74,
      historicalAccuracy: 78,
      peerConsensus: 69,
    }).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/40">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-purple-300 font-black">Verifier Reputation</p>
        <ShieldCheck className="w-4 h-4 text-purple-300" />
      </div>
      <div className="mt-2 flex items-end gap-3">
        <p className="text-2xl font-black text-white">{data.trustScore}</p>
        <p className="text-[10px] uppercase text-zinc-500 mb-1">Confidence {data.confidence}%</p>
      </div>
      <p className="text-[10px] uppercase text-zinc-400">{data.label} trust</p>
    </div>
  );
};

export default VerifierConfidenceCard;
