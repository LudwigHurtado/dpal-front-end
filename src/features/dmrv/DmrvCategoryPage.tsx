import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, Shield } from '../../../components/icons';
import { DmrvConnectorPanel } from './components/DmrvConnectorPanel';
import { DmrvInfographicBoard } from './components/DmrvInfographicBoard';
import { DmrvWorkflowPanel } from './components/DmrvWorkflowPanel';
import { MrvMultiAiValidatorPanel } from './components/MrvMultiAiValidatorPanel';
import { getCategoryBySlug, getConnector, type DmrvType } from './dmrvRegistry';
import { openDmrvConnector } from './dmrvNavigation';
import { DmrvWorkflowShell } from './reporting/DmrvWorkflowShell';
import { useDmrvLiveReportSync } from './reporting/useDmrvLiveReportSync';

export type DmrvCategoryPageProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

export default function DmrvCategoryPage({ onReturn, onNavigate }: DmrvCategoryPageProps): React.ReactElement {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const typeIdFromUrl = searchParams.get('typeId');
  const navigate = useNavigate();
  const category = getCategoryBySlug(categorySlug);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(typeIdFromUrl);
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null);
  const [workflowStep, setWorkflowStep] = useState(2);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);

  useEffect(() => {
    if (!category?.types.length) return;
    const match = typeIdFromUrl && category.types.some((t) => t.id === typeIdFromUrl);
    setSelectedTypeId(match ? typeIdFromUrl : category.types[0].id);
    setActiveConnectorId(null);
    setWorkflowStep(2);
    setShowWorkflow(false);
  }, [category?.slug, category?.types, typeIdFromUrl]);

  const selectedType = useMemo(
    () => category?.types.find((t) => t.id === selectedTypeId),
    [category, selectedTypeId],
  );

  const handleSelectType = useCallback(
    (typeId: string) => {
      setSelectedTypeId(typeId);
      setActiveConnectorId(null);
      setShowWorkflow(true);
      const params = new URLSearchParams();
      params.set('typeId', typeId);
      if (projectId) params.set('projectId', projectId);
      navigate(
        { pathname: `/dmrv/${encodeURIComponent(categorySlug ?? '')}`, search: params.toString() },
        { replace: true },
      );
    },
    [categorySlug, navigate, projectId],
  );

  const handleConnectorOpen = useCallback((connectorId: string) => {
    setActiveConnectorId(connectorId);
    setShowWorkflow(true);
  }, []);

  if (!category) {
    return <Navigate to="/dmrv" replace />;
  }

  const connectors = selectedType?.connectors ?? [];
  const mockHash = `dpal-evidence-${category.slug}-${selectedTypeId ?? 'none'}-${Date.now().toString(36)}`;

  return (
    <div className="min-h-full bg-[#f4f6f9] text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1520px)] px-4 py-6 sm:px-6 lg:px-8">
        <CategoryNav onReturn={onReturn} categoryTitle={category.title} />

        <DmrvInfographicBoard
          category={category}
          types={category.types}
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
          projectId={projectId}
        />

        {selectedType && showWorkflow ? (
          projectId && categorySlug ? (
            <CategoryWorkflowWithLiveReport
              projectId={projectId}
              categorySlug={categorySlug}
              typeId={selectedType.id}
            >
              <DmrvWorkflowSection
                selectedType={selectedType}
                projectId={projectId}
                connectors={connectors}
                activeConnectorId={activeConnectorId}
                workflowStep={workflowStep}
                onWorkflowStepChange={setWorkflowStep}
                onConnectorOpen={handleConnectorOpen}
                onConnectorClose={() => setActiveConnectorId(null)}
                onNavigate={onNavigate}
                navigate={navigate}
                showBlockchain={showBlockchain}
                mockHash={mockHash}
                onToggleBlockchain={() => setShowBlockchain((v) => !v)}
                onEvidencePacket={() => onNavigate?.('previewEvidencePacket')}
              />
            </CategoryWorkflowWithLiveReport>
          ) : (
            <DmrvWorkflowSection
              selectedType={selectedType}
              projectId={projectId}
              connectors={connectors}
              activeConnectorId={activeConnectorId}
              workflowStep={workflowStep}
              onWorkflowStepChange={setWorkflowStep}
              onConnectorOpen={handleConnectorOpen}
              onConnectorClose={() => setActiveConnectorId(null)}
              onNavigate={onNavigate}
              navigate={navigate}
              showBlockchain={showBlockchain}
              mockHash={mockHash}
              onToggleBlockchain={() => setShowBlockchain((v) => !v)}
              onEvidencePacket={() => onNavigate?.('previewEvidencePacket')}
            />
          )
        ) : null}

        <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-500">
          DMRV configuration does not imply certified credits, automatic verification, or regulatory approval.
          Select a type above to open connectors and workflow actions.
        </p>
      </div>
    </div>
  );
}

function CategoryWorkflowWithLiveReport({
  projectId,
  categorySlug,
  typeId,
  children,
}: {
  projectId: string;
  categorySlug: string;
  typeId: string;
  children: React.ReactNode;
}): React.ReactElement {
  useDmrvLiveReportSync(projectId, 'category-hub');
  return (
    <DmrvWorkflowShell
      projectId={projectId}
      categorySlug={categorySlug}
      typeId={typeId}
      workflowStep="category-hub"
    >
      {children}
    </DmrvWorkflowShell>
  );
}

function CategoryNav({
  onReturn,
  categoryTitle,
}: {
  onReturn?: () => void;
  categoryTitle?: string;
}): React.ReactElement {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        to="/dmrv"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        All MRV categories
      </Link>
      {categoryTitle ? (
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#1e3a5f]">
          {categoryTitle}
        </span>
      ) : null}
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
  );
}

type DmrvWorkflowSectionProps = {
  selectedType: DmrvType;
  projectId?: string | null;
  connectors: string[];
  activeConnectorId: string | null;
  workflowStep: number;
  onWorkflowStepChange: (step: number) => void;
  onConnectorOpen: (id: string) => void;
  onConnectorClose: () => void;
  onNavigate?: (view: string) => void;
  navigate: ReturnType<typeof useNavigate>;
  showBlockchain: boolean;
  mockHash: string;
  onToggleBlockchain: () => void;
  onEvidencePacket: () => void;
};

function DmrvWorkflowSection({
  selectedType,
  projectId,
  connectors,
  activeConnectorId,
  workflowStep,
  onWorkflowStepChange,
  onConnectorOpen,
  onConnectorClose,
  onNavigate,
  navigate,
  showBlockchain,
  mockHash,
  onToggleBlockchain,
  onEvidencePacket,
}: DmrvWorkflowSectionProps): React.ReactElement {
  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm md:p-5">
      <div className="border-b border-slate-100 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Active selection</p>
        <h2 className="mt-1 text-base font-black text-[#1e3a5f]">{selectedType.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{selectedType.description}</p>
      </div>

      <ConnectorButtons
        connectors={connectors}
        activeConnectorId={activeConnectorId}
        onConnectorOpen={onConnectorOpen}
      />

      {activeConnectorId ? (
        <DmrvConnectorPanel
          connectorId={activeConnectorId}
          onClose={onConnectorClose}
          onOpenRoute={(meta) =>
            openDmrvConnector(meta, { onNavigate, navigatePath: (path) => navigate(path) })
          }
        />
      ) : null}

      <DmrvWorkflowPanel
        activeStep={workflowStep}
        onStepChange={onWorkflowStepChange}
        riskFlags={selectedType.riskFlags}
      />

      <MrvMultiAiValidatorPanel selectedType={selectedType} projectId={projectId} />

      {showBlockchain ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase text-[#1e3a5f]">Blockchain record (placeholder)</h3>
          <p className="mt-2 font-mono text-xs text-slate-700">{mockHash}</p>
          <p className="mt-2 text-[11px] text-slate-600">
            Local DPAL evidence fingerprint — not a public blockchain transaction until a live anchor service is
            configured.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onEvidencePacket}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#152a47]"
        >
          <Package className="h-4 w-4" />
          Generate Evidence Packet
        </button>
        <button
          type="button"
          onClick={() =>
            openDmrvConnector(getConnector('validator-portal')!, {
              onNavigate,
              navigatePath: (p) => navigate(p),
            })
          }
          className="inline-flex items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
        >
          <Shield className="h-4 w-4" />
          Open Validator Review
        </button>
        <button
          type="button"
          onClick={onToggleBlockchain}
          className="rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
        >
          Blockchain Record
        </button>
      </div>
    </section>
  );
}

function ConnectorButtons({
  connectors,
  activeConnectorId,
  onConnectorOpen,
}: {
  connectors: string[];
  activeConnectorId: string | null;
  onConnectorOpen: (id: string) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((id) => {
        const c = getConnector(id);
        if (!c) return null;
        const active = activeConnectorId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onConnectorOpen(id)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
              active
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
            }`}
          >
            {c.label}
            <span className="ml-1 opacity-75">· {c.status === 'live' ? 'Live' : 'Planned'}</span>
          </button>
        );
      })}
    </div>
  );
}
