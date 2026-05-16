import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from '../../../../components/icons';
import { getSensorSourceById } from '../dmrvSensorCatalog';
import type { DmrvSourceConfiguratorKind } from '../dmrvSensorCatalog';
import type { DmrvCategory, DmrvInputDef, DmrvType } from '../dmrvRegistry';
import {
  dmrvInputConfigPath,
  dmrvNewProjectPath,
  dmrvProjectConfigPath,
} from '../dmrvNavigation';
import { DMRV_FOOTER_TAGLINES } from '../dmrvInfographicTheme';
import {
  defaultDmrvProjectId,
  ensureDmrvProjectContext,
  getDmrvProjectContext,
} from '../services/dmrvProjectContextService';
import {
  getSelectedSourceIds,
  saveSelectedSourceIds,
} from '../services/dmrvSourceSelectionService';
import { DmrvBlockchainSymbol } from './DmrvBlockchainSymbol';
import { DmrvInfographicRow, type DmrvInputSourceMeta } from './DmrvInfographicRow';
import { DmrvSelectorDial } from './DmrvSelectorDial';
import { DmrvSourceConfigurator } from './DmrvSourceConfigurator';
import { DmrvWorkflowProgress } from './DmrvWorkflowProgress';

type SourceConfiguratorState = {
  typeId: string;
  typeName: string;
  sourceKind: DmrvSourceConfiguratorKind;
} | null;

export type DmrvInfographicBoardProps = {
  category: DmrvCategory;
  types: DmrvType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
  /** Active project id from URL — evidence inputs work with or without a completed profile */
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
  const [sourceConfigurator, setSourceConfigurator] = useState<SourceConfiguratorState>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);

  const projectCtx = useMemo(
    () => (projectId ? getDmrvProjectContext(projectId) : null),
    [projectId],
  );
  const workflowStep = 1;

  const resolveProjectId = useCallback(
    (typeId: string) => projectId?.trim() || defaultDmrvProjectId(category.slug, typeId),
    [category.slug, projectId],
  );

  const getInputSourceMeta = useCallback(
    (typeId: string, inputKey: string): DmrvInputSourceMeta | undefined => {
      void selectionRevision;
      const kind: DmrvSourceConfiguratorKind | null =
        inputKey === 'satellite-imagery' ? 'satellite' : inputKey === 'lidar' ? 'lidar' : null;
      if (!kind) return undefined;
      const pid = resolveProjectId(typeId);
      const ids = getSelectedSourceIds(pid, typeId, kind);
      const chips = ids
        .slice(0, 3)
        .map((id) => getSensorSourceById(id)?.shortName)
        .filter((name): name is string => Boolean(name));
      return {
        configured: ids.length > 0,
        selectedCount: ids.length,
        chips,
      };
    },
    [resolveProjectId, selectionRevision],
  );

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
      const type = types.find((t) => t.id === typeId);
      const pid = resolveProjectId(typeId);
      ensureDmrvProjectContext({
        categorySlug: category.slug,
        categoryTitle: category.title,
        typeId,
        typeTitle: type?.title ?? typeId,
        projectId: pid,
      });

      if (inputDef.key === 'satellite-imagery') {
        setSourceConfigurator({
          typeId,
          typeName: type?.title ?? typeId,
          sourceKind: 'satellite',
        });
        return;
      }
      if (inputDef.key === 'lidar') {
        setSourceConfigurator({
          typeId,
          typeName: type?.title ?? typeId,
          sourceKind: 'lidar',
        });
        return;
      }

      navigate(dmrvInputConfigPath(pid, category.slug, inputDef.key, typeId));
    },
    [category.slug, category.title, navigate, resolveProjectId, types],
  );

  const handleSaveSources = useCallback(
    (ids: string[]) => {
      if (!sourceConfigurator) return;
      const pid = resolveProjectId(sourceConfigurator.typeId);
      saveSelectedSourceIds(pid, sourceConfigurator.typeId, sourceConfigurator.sourceKind, ids);
      setSelectionRevision((n) => n + 1);
    },
    [resolveProjectId, sourceConfigurator],
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

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-700">
        {projectCtx?.projectName?.trim() ? (
          <>
            Active project: <span className="font-bold">{projectCtx.projectName}</span>. Configure any evidence input
            below — project details can be updated anytime.
          </>
        ) : (
          <>
            Configure any evidence input on the icons below. Project identity is optional and can be filled in when you
            are ready.
          </>
        )}
      </p>

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
                onOpenProjectConfig={() => handleOpenProject(type.id)}
                onConfigureInput={(inputDef) => handleConfigureInput(type.id, inputDef)}
                getInputSourceMeta={(inputKey) => getInputSourceMeta(type.id, inputKey)}
              />
            ))}
          </ul>
        </section>
      </div>

      {sourceConfigurator ? (
        <DmrvSourceConfigurator
          dmrvTypeId={sourceConfigurator.typeId}
          dmrvTypeName={sourceConfigurator.typeName}
          sourceKind={sourceConfigurator.sourceKind}
          projectId={resolveProjectId(sourceConfigurator.typeId)}
          isOpen
          onClose={() => setSourceConfigurator(null)}
          onSaveSelectedSources={handleSaveSources}
          initialSelectedIds={getSelectedSourceIds(
            resolveProjectId(sourceConfigurator.typeId),
            sourceConfigurator.typeId,
            sourceConfigurator.sourceKind,
          )}
        />
      ) : null}

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
