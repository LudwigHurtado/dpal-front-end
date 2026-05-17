import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from '../../../components/icons';
import { DmrvAiConfigHelper } from './components/DmrvAiConfigHelper';
import { DmrvBreadcrumb } from './components/DmrvBreadcrumb';
import { DmrvSourceConfigurator } from './components/DmrvSourceConfigurator';
import { DmrvWorkflowProgress } from './components/DmrvWorkflowProgress';
import { getCategoryBySlug, getTypeForCategory } from './dmrvRegistry';
import {
  dmrvCategoryPath,
  dmrvInputConfigPath,
  sourceStackKindToInputKey,
  type DmrvSourceStackKind,
} from './dmrvNavigation';
import {
  defaultDmrvProjectId,
  ensureDmrvProjectContext,
} from './services/dmrvProjectContextService';
import {
  getSelectedSourceIds,
  saveSelectedSourceIds,
} from './services/dmrvSourceSelectionService';
import { DmrvWorkflowShell } from './reporting/DmrvWorkflowShell';
import { DmrvWorkflowReportHeader } from './reporting/DmrvWorkflowReportHeader';
import { DMRV_REPORT_MILESTONES } from './reporting/dmrvReportMilestones';
import { rebuildAndPersistDmrvReport, saveReportSnapshot } from './reporting/dmrvReportStore';
import { useDmrvLiveReportSync } from './reporting/useDmrvLiveReportSync';

const VALID_KINDS = new Set<DmrvSourceStackKind>(['satellite', 'lidar']);

function parseSourceKind(raw: string | undefined): DmrvSourceStackKind | null {
  if (raw === 'satellite' || raw === 'lidar') return raw;
  return null;
}

export type DmrvSourceConfiguratorPageProps = {
  onReturn?: () => void;
};

export default function DmrvSourceConfiguratorPage({
  onReturn,
}: DmrvSourceConfiguratorPageProps): React.ReactElement {
  const { projectId = '', categorySlug = '', sourceKind: sourceKindParam = '' } = useParams<{
    projectId: string;
    categorySlug: string;
    sourceKind: string;
  }>();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';
  const navigate = useNavigate();

  const sourceKind = parseSourceKind(sourceKindParam);
  const category = getCategoryBySlug(categorySlug);
  const dmrvType = getTypeForCategory(categorySlug, typeId);

  const backPath = useMemo(
    () => dmrvCategoryPath(categorySlug, typeId, projectId),
    [categorySlug, projectId, typeId],
  );

  const handleBack = useCallback(() => {
    navigate(backPath);
  }, [backPath, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [projectId, sourceKind, categorySlug]);

  const handleSave = useCallback(
    (ids: string[]) => {
      if (!sourceKind) return;
      saveSelectedSourceIds(projectId, typeId, sourceKind, ids);
      rebuildAndPersistDmrvReport(projectId, {
        actor: 'user',
        workflowStep: 'satellite-config',
        changeSummary: `Saved ${sourceKind} source stack (${ids.length} sources)`,
      });
      saveReportSnapshot(projectId, DMRV_REPORT_MILESTONES.dataSources, 'satellite-config');
      navigate(backPath);
    },
    [backPath, navigate, projectId, sourceKind, typeId],
  );

  if (!sourceKind || !VALID_KINDS.has(sourceKind) || !category) {
    return <Navigate to="/dmrv" replace />;
  }

  if (!projectId) {
    const pid = defaultDmrvProjectId(categorySlug, typeId);
    return (
      <Navigate
        to={`/dmrv/projects/${encodeURIComponent(pid)}/${encodeURIComponent(categorySlug)}/sources/${sourceKind}?typeId=${encodeURIComponent(typeId)}`}
        replace
      />
    );
  }

  return (
    <DmrvSourceConfiguratorWorkspace
      projectId={projectId}
      categorySlug={categorySlug}
      category={category}
      sourceKind={sourceKind}
      typeId={typeId}
      typeTitle={dmrvType?.title ?? typeId}
      onReturn={onReturn}
      handleBack={handleBack}
      handleSave={handleSave}
      navigate={navigate}
    />
  );
}

type WorkspaceProps = {
  projectId: string;
  categorySlug: string;
  category: NonNullable<ReturnType<typeof getCategoryBySlug>>;
  sourceKind: DmrvSourceStackKind;
  typeId: string;
  typeTitle: string;
  onReturn?: () => void;
  handleBack: () => void;
  handleSave: (ids: string[]) => void;
  navigate: ReturnType<typeof useNavigate>;
};

function DmrvSourceConfiguratorWorkspace({
  projectId,
  categorySlug,
  category,
  sourceKind,
  typeId,
  typeTitle,
  onReturn,
  handleBack,
  handleSave,
  navigate,
}: WorkspaceProps): React.ReactElement {
  ensureDmrvProjectContext({
    categorySlug,
    categoryTitle: category.title,
    typeId,
    typeTitle,
    projectId,
  });

  const inputKey = sourceStackKindToInputKey(sourceKind);
  const sceneConfigPath = dmrvInputConfigPath(projectId, categorySlug, inputKey, typeId);
  const initialSelectedIds = useMemo(
    () => getSelectedSourceIds(projectId, typeId, sourceKind),
    [projectId, sourceKind, typeId],
  );
  const [draftSourceIds, setDraftSourceIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    setDraftSourceIds(initialSelectedIds);
  }, [initialSelectedIds]);

  const draftSourceSelections = useMemo(
    () => ({ [sourceKind]: draftSourceIds } as const),
    [draftSourceIds, sourceKind],
  );

  useDmrvLiveReportSync(projectId, 'satellite-config', { draftSourceSelections });

  const aiContextSummary = useMemo(
    () =>
      JSON.stringify(
        {
          categorySlug,
          typeId,
          typeTitle,
          sourceKind,
          projectId,
          selectedSourceIds: initialSelectedIds,
        },
        null,
        2,
      ),
    [categorySlug, initialSelectedIds, projectId, sourceKind, typeId, typeTitle],
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1520px)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {category.title}
          </button>
          <Link
            to="/dmrv"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            All MRV categories
          </Link>
          {onReturn ? (
            <button
              type="button"
              onClick={onReturn}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Main menu
            </button>
          ) : null}
        </div>

        <DmrvBreadcrumb
          crumbs={[
            { label: 'DMRV', onClick: () => navigate('/dmrv') },
            { label: category.title, onClick: handleBack },
            { label: typeTitle, onClick: handleBack },
            {
              label: sourceKind === 'lidar' ? 'LiDAR sources' : 'Satellite sources',
            },
          ]}
        />

        <DmrvWorkflowReportHeader
          projectId={projectId}
          categorySlug={categorySlug}
          typeId={typeId}
          className="mb-4"
        />

        <DmrvWorkflowProgress activeStep={2} />

        <p className="mb-4 text-xs text-slate-600">
          Full-page source stack — pick missions and sensors for evidence search. For scene dates, cloud limits, and live
          preview, open{' '}
          <Link to={sceneConfigPath} className="font-semibold text-[#1e3a5f] underline">
            {sourceKind === 'lidar' ? 'LiDAR' : 'satellite'} scene settings
          </Link>
          .
        </p>

        <DmrvWorkflowShell
          projectId={projectId}
          categorySlug={categorySlug}
          typeId={typeId}
          workflowStep="satellite-config"
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
            <DmrvSourceConfigurator
              dmrvTypeId={typeId}
              dmrvTypeName={typeTitle}
              sourceKind={sourceKind}
              projectId={projectId}
              onClose={handleBack}
              onSaveSelectedSources={handleSave}
              onDraftSelectionChange={setDraftSourceIds}
              initialSelectedIds={initialSelectedIds}
            />
            <DmrvAiConfigHelper
              variant={sourceKind === 'lidar' ? 'lidar' : 'satellite-imagery'}
              contextSummary={aiContextSummary}
              autofillPrompt={`Suggest ${sourceKind} mission/source IDs for ${typeTitle}. Return JSON: { "selectedSourceIds": ["id1","id2"] } using catalog missions appropriate for this MRV type.`}
            />
          </div>
        </DmrvWorkflowShell>
      </div>
    </div>
  );
}
