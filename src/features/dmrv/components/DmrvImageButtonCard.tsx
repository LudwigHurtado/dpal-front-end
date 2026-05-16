import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from '../../../../components/icons';
import type { DmrvCategory } from '../dmrvRegistry';

export type DmrvImageButtonCardProps = {
  category: DmrvCategory;
};

export function DmrvImageButtonCard({ category }: DmrvImageButtonCardProps): React.ReactElement {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();
  const href = `/dmrv/${category.slug}`;

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-md shadow-slate-900/[0.06] transition duration-200 hover:-translate-y-0.5 hover:border-[#1e3a5f]/35 hover:shadow-lg hover:shadow-[#1e3a5f]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {!imgFailed ? (
          <img
            src={category.image}
            alt={`${category.title} DMRV infographic entry`}
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
            style={{ borderBottom: `4px solid ${category.color}` }}
          >
            <span className="px-4 text-center text-sm font-bold uppercase tracking-wide text-[#1e3a5f]">
              {category.title}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/55 to-transparent px-4 pb-3 pt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/90">DMRV category</p>
          <h3 className="mt-0.5 text-lg font-black tracking-tight text-white">{category.title}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm leading-relaxed text-slate-600">{category.description}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#1e3a5f]">
          Open DMRV Connectors
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </button>
  );
}
