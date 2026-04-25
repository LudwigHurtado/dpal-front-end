import React from 'react';

interface RiskScoreCardProps {
  title: string;
  score: number;
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ title, score }) => {
  const tone = score >= 80 ? 'text-red-600' : score >= 50 ? 'text-amber-600' : 'text-emerald-600';
  const badgeTone = score >= 80 ? 'bg-red-100 text-red-700 border-red-200' : score >= 50 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  const riskLabel = score >= 80 ? 'High Risk' : score >= 50 ? 'Medium Risk' : 'Low Risk';
  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{title}</p>
        <span className={`text-xs rounded-full border px-2.5 py-1 ${badgeTone}`}>{riskLabel}</span>
      </div>
      <p className={`text-3xl font-bold mt-3 ${tone}`}>{score}</p>
      <p className="text-xs text-slate-500 mt-1">0 (best) to 100 (highest risk)</p>
    </article>
  );
};

export default RiskScoreCard;
