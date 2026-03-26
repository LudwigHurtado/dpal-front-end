import React from 'react';

export interface ForensicQuestion {
  id: string;
  section?: string;
  label: string;
  help_text?: string;
  answer_type: string;
  options?: string[];
  required?: boolean;
}

export const ForensicField: React.FC<{
  question: ForensicQuestion;
  value: any;
  onChange: (val: any) => void;
}> = ({ question, value, onChange }) => {
  const { label, help_text, answer_type, options } = question;
  const baseClass =
    'w-full bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl text-sm font-bold text-white outline-none focus:border-cyan-600 transition-all placeholder:text-zinc-900 shadow-inner';

  switch (answer_type) {
    case 'single_select':
      return (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(options || []).map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`px-4 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase text-left truncate ${
                  value === opt
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    case 'multi_select':
      return (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
          <div className="grid grid-cols-2 gap-2">
            {(options || []).map((opt: string) => {
              const isSel = (value || []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const current = value || [];
                    onChange(isSel ? current.filter((v: any) => v !== opt) : [...current, opt]);
                  }}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase text-left truncate ${
                    isSel
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-700'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    case 'datetime':
      return (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
          <input type="datetime-local" value={value || ''} onChange={(e) => onChange(e.target.value)} className={baseClass} />
        </div>
      );
    case 'short_text':
      return (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-2">{label}</label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClass}
            placeholder={help_text || 'Input data...'}
          />
        </div>
      );
    default:
      return null;
  }
};
