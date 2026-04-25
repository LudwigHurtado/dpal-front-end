import React from 'react';

const EvidencePacketPreview: React.FC = () => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-slate-900">Evidence Packet Preview</h3>
      <div className="mt-3 rounded-lg border border-slate-200 p-3.5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">Packet ID</dt>
            <dd className="text-slate-800 font-medium mt-0.5">PKT-ENV-2049</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">Module</dt>
            <dd className="text-slate-800 font-medium mt-0.5">Fuel Storage Integrity Audit</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">Linked Sources</dt>
            <dd className="text-slate-800 font-medium mt-0.5">8 datasets</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs uppercase tracking-wide">Confidence</dt>
            <dd className="text-emerald-700 font-semibold mt-0.5">87%</dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default EvidencePacketPreview;
