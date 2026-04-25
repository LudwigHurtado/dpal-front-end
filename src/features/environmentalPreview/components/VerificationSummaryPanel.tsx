import React from 'react';

interface VerificationSummaryPanelProps {
  summary: string;
}

const VerificationSummaryPanel: React.FC<VerificationSummaryPanelProps> = ({ summary }) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="font-semibold text-slate-900">Verification Summary</h3>
      <p className="mt-2 text-sm text-slate-600">{summary}</p>
    </section>
  );
};

export default VerificationSummaryPanel;
