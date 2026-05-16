import React, { useState } from 'react';
import { ChevronRight } from '../../../../components/icons';
import type { DmrvFamilyDef, DmrvTypeDef } from '../dmrvCatalog';

type Props = {
  family: DmrvFamilyDef;
  onSelectType: (typeId: string) => void;
};

export function TypeSelectorView({ family, onSelectType }: Props): React.ReactElement {
  const [previewId, setPreviewId] = useState<string>(family.types[0]?.id ?? '');

  const preview: DmrvTypeDef | undefined = family.types.find((t) => t.id === previewId) ?? family.types[0];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,1fr)_minmax(360px,1.2fr)]">
      <div>
        <div className="mb-4 rounded-xl border border-slate-300 bg-[#f8fafc] px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-700">
          <p className="font-bold text-slate-900">{family.title}</p>
          <p className="text-slate-500">│</p>
          {family.types.map((t, i) => (
            <p key={t.id}>
              <span className="text-slate-500">
                {i === family.types.length - 1 ? '└── ' : '├── '}
              </span>
              {t.label}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          {family.types.map((t) => {
            const active = t.id === previewId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreviewId(t.id)}
                onDoubleClick={() => onSelectType(t.id)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition"
                style={{
                  borderColor: active ? family.hex : '#e2e8f0',
                  backgroundColor: active ? `${family.hex}14` : '#fff',
                  boxShadow: active ? `0 0 0 2px ${family.hex}33` : undefined,
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{ backgroundColor: family.hex }}
                >
                  {t.label.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black uppercase tracking-wide text-slate-900">{t.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600">{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectType(t.id);
                  }}
                  className="shrink-0 rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                >
                  Open
                </button>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-500 xl:text-left">
          Click a type to preview inputs. Press <strong>Open</strong> or double-click to open the DMRV profile &amp;
          workflow.
        </p>
      </div>

      {preview && (
        <aside className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md xl:sticky xl:top-4 xl:self-start">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-800">
            Inputs for Evaluation (Examples)
          </h3>
          <p className="mt-1 text-[11px] text-slate-600">{preview.label}</p>
          <div className="mt-3 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            {preview.inputExamples.map((label) => (
              <span
                key={label}
                className="rounded-lg border px-2 py-1.5 text-center text-[9px] font-semibold text-slate-700"
                style={{ borderColor: `${family.hex}55`, backgroundColor: `${family.hex}10` }}
              >
                {label}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-1 pl-4 text-[11px] text-slate-700">
            {preview.evaluationFocus.map((b) => (
              <li key={b} className="list-disc marker:text-slate-400">
                {b}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onSelectType(preview.id)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow"
            style={{ backgroundColor: family.hex }}
          >
            Open DMRV profile &amp; workflow
            <ChevronRight className="h-4 w-4" />
          </button>
        </aside>
      )}
    </div>
  );
}
