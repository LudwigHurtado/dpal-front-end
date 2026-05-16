import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from '../../../../components/icons';
import type { DmrvCategory, DmrvInputDef, DmrvType } from '../dmrvRegistry';
import {
  dmrvInputConfigPath,
  dmrvNewProjectPath,
  dmrvProjectConfigPath,
} from '../dmrvNavigation';
import { DMRV_FOOTER_TAGLINES } from '../dmrvInfographicTheme';
import { getDmrvProjectContext, isDmrvProjectContextComplete } from '../services/dmrvProjectContextService';
import { DmrvBlockchainSymbol } from './DmrvBlockchainSymbol';
import { DmrvInfographicRow } from './DmrvInfographicRow';
import { DmrvSelectorDial } from './DmrvSelectorDial';
import { DmrvWorkflowProgress } from './DmrvWorkflowProgress';

export type DmrvInfographicBoardProps = {
  category: DmrvCategory;
  types: DmrvType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
  /** Active project — unlocks evidence source cards when complete */
  projectId?: string | null;
};

export function dmrvTypeRowId(typeId: string): string {
  return `dmrv-type-row-${typeId}`;
}

export function DmrvInfographicBoard({
  category,
  types,
  selectedTypeId,
  onSelectType,
  projectId,
}: DmrvInfographicBoardProps): React.ReactElement {
  const navigate = useNavigate();
  const footerTagline = DMRV_FOOTER_TAGLINES[category.slug] ?? 'environmental intelligence';

  const projectCtx = useMemo(
    () => (projectId ? getDmrvProjectContext(projectId) : null),
    [projectId],
  );
  const projectUnlocked = isDmrvProjectContextComplete(projectId);
  const workflowStep = projectUnlocked ? 1 : 0;

  const handleOpenProject = useCallback(
    (typeId: string) => {
      if (projectId && projectCtx) {
        navigate(dmrvProjectConfigPath(projectId));
        return;
      }
      navigate(dmrvNewProjectPath(category.slug, typeId));
    },
    [category.slug, navigate, projectCtx, projectId],
  );

  const handleConfigureInput = useCallback(
    (typeId: string, inputDef: DmrvInputDef) => {
      if (!projectId || !projectUnlocked) return;
      navigate(dmrvInputConfigPath(projectId, category.slug, inputDef.key, typeId));
    },
    [category.slug, navigate, projectId, projectUnlocked],
  );

  const handleSelectType = useCallback(
    (typeId: string) => {
      onSelectType(typeId);
      requestAnimationFrame(() => {
        document.getElementById(dmrvTypeRowId(typeId))?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      });
    },
    [onSelectType],
  );

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex max-w-md items-center justify-center gap-2">
          <DmrvBlockchainSymbol size={36} accentColor={category.color} className="rounded-lg overflow-hidden shadow-sm" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Blockchain accountability layer
          </span>
        </div>
        <h1 className="text-lg font-black uppercase tracking-[0.06em] text-[#1e3a5f] md:text-2xl">
          DPAL Adaptive DMRV: {category.title}
        </h1>
        <p className="mx-auto mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
          {category.subtitle}
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-slate-500">
          {types.length} DMRV types · {category.types.length} evaluation pathways on this board
        </p>
      </header>

      <DmrvWorkflowProgress activeStep={workflowStep} />

      {projectCtx ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-900">
          Project <span className="font-bold">{projectCtx.projectName || projectCtx.projectId}</span> is active.
          Evidence sources unlock when project configuration is complete.
        </p>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
          Project configuration is optional. Configure project identity anytime, or open individual inputs directly.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <DmrvSelectorDial
          category={category}
          types={types}
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
        />

        <section className="min-w-0 space-y-3">
          <div className="hidden items-center gap-2 px-1 xl:flex">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {category.title} DMRV types
            </p>
            <span className="flex-1 border-t border-dashed border-slate-300" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Inputs for evaluation (examples)
            </p>
          </div>

          <ul className="space-y-2">
            {types.map((type, i) => (
              <DmrvInfographicRow
                key={type.id}
                rowId={dmrvTypeRowId(type.id)}
                index={i + 1}
                type={type}
                active={type.id === selectedTypeId}
                onSelect={() => handleSelectType(type.id)}
                projectUnlocked={projectUnlocked}
                onOpenProjectConfig={() => handleOpenProject(type.id)}
                onConfigureInput={(inputDef) => handleConfigureInput(type.id, inputDef)}
              />
            ))}
          </ul>
        </section>
      </div>

      <footer className="flex items-center justify-center gap-3 rounded-2xl border border-[#1e3a5f]/25 bg-[#e8f0f7] px-5 py-4 text-center">
        <DmrvBlockchainSymbol size={40} accentColor={category.color} className="shrink-0 rounded-lg overflow-hidden shadow-sm" />
        <ShieldCheck className="h-7 w-7 shrink-0 text-[#1e3a5f]" aria-hidden />
        <p className="text-xs font-medium leading-snug text-slate-700 md:text-sm">
          <span className="font-black uppercase tracking-wide text-[#1e3a5f]">
            Adaptive. Transparent. Scientific.
          </span>{' '}
          One DMRV system with blockchain evidence timestamps, configured for {footerTagline}.
        </p>
      </footer>
    </div>
  );
}
