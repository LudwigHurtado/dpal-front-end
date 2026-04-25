import React from 'react';

const ClaimAnalyzerPanel: React.FC = () => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="font-semibold text-slate-900">Claim Analyzer</h3>
      <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
        <li>Claimed output exceeds satellite-derived activity baseline by 11%.</li>
        <li>Declared storage turnover does not match transport logs in two windows.</li>
        <li>Permit threshold breach probability: medium.</li>
      </ul>
    </section>
  );
};

export default ClaimAnalyzerPanel;
