import React from 'react';

const FacilitySearchPanel: React.FC = () => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="font-semibold text-slate-900">Facility / Project Search</h3>
      <input
        type="text"
        placeholder="Search by name, permit, ID, or coordinates"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option>Risk Level</option>
        </select>
        <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option>Jurisdiction</option>
        </select>
      </div>
    </section>
  );
};

export default FacilitySearchPanel;
