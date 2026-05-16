import React from 'react';
import { DMRV_FAMILIES, DPAL_ENGINE_TREE, type DmrvFamilyId } from '../dmrvCatalog';

type Props = {
  onSelectFamily: (id: DmrvFamilyId) => void;
};

export function FamilySelectorView({ onSelectFamily }: Props): React.ReactElement {
  const gridFamilies = DMRV_FAMILIES.filter((f) => f.id !== 'custom-intelligence');
  const customFamily = DMRV_FAMILIES.find((f) => f.id === 'custom-intelligence');

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
      <aside className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md lg:sticky lg:top-4 lg:self-start">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">DPAL Best Version</h2>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">
          Layered architecture for investors — each layer connects to live DPAL modules when configured.
        </p>
        <div className="mt-4 space-y-4 font-mono text-[10px] leading-relaxed text-slate-700">
          <div>
            <p className="font-bold text-slate-900">DPAL</p>
            <p className="text-slate-500">│</p>
          </div>
          {DPAL_ENGINE_TREE.map((layer) => (
            <div key={layer.title}>
              <p className="font-bold text-slate-800">
                <span className="text-slate-500">├── </span>
                {layer.title}
              </p>
              {layer.children.map((child) => (
                <p key={child} className="pl-3 text-slate-600">
                  <span className="text-slate-400">│   ├── </span>
                  {child}
                </p>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div>
        <div className="mb-4 rounded-xl border border-slate-300 bg-[#f8fafc] px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-700">
          <p className="font-bold text-slate-900">DPAL Adaptive DMRV Engine</p>
          <p className="text-slate-500">│</p>
          {DMRV_FAMILIES.map((f, i) => (
            <p key={f.id}>
              <span className="text-slate-500">{i === DMRV_FAMILIES.length - 1 ? '└── ' : '├── '}</span>
              {f.title}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {gridFamilies.map((family) => (
            <button
              key={family.id}
              type="button"
              onClick={() => onSelectFamily(family.id)}
              className="group flex min-h-[120px] flex-col rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ borderTopWidth: 4, borderTopColor: family.hex }}
            >
              <span
                className="mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: family.hex }}
              >
                {family.types.length} types
              </span>
              <h3 className="text-lg font-black uppercase tracking-wide text-slate-900">{family.cardLabel}</h3>
              <p className="mt-2 flex-1 text-sm leading-snug text-slate-600">{family.description}</p>
              <span className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500 group-hover:text-slate-800">
                Select family →
              </span>
            </button>
          ))}
        </div>

        {customFamily && (
          <button
            type="button"
            onClick={() => onSelectFamily(customFamily.id)}
            className="group mt-4 flex w-full min-h-[100px] flex-col rounded-2xl border border-slate-300 bg-white p-5 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ borderTopWidth: 4, borderTopColor: customFamily.hex }}
          >
            <span
              className="mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
              style={{ backgroundColor: customFamily.hex }}
            >
              {customFamily.types.length} types
            </span>
            <h3 className="text-lg font-black uppercase tracking-wide text-slate-900">{customFamily.cardLabel}</h3>
            <p className="mt-2 text-sm leading-snug text-slate-600">{customFamily.description}</p>
            <span className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500 group-hover:text-slate-800">
              Select family →
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
