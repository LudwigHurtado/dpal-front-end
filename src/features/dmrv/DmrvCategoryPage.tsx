import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Shield } from '../../../components/icons';
import { DmrvConnectorPanel } from './components/DmrvConnectorPanel';
import { DmrvDataSourcePanel } from './components/DmrvDataSourcePanel';
import { DmrvSelectorPanel } from './components/DmrvSelectorPanel';
import { DmrvTypeRows } from './components/DmrvTypeRows';
import { DmrvInfographicArrows } from './components/DmrvInfographicArrows';
import { DmrvWorkflowPanel } from './components/DmrvWorkflowPanel';
import { getCategoryBySlug, getConnector } from './dmrvRegistry';
import { openDmrvConnector } from './dmrvNavigation';

export type DmrvCategoryPageProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

export default function DmrvCategoryPage({ onReturn, onNavigate }: DmrvCategoryPageProps): React.ReactElement {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const category = getCategoryBySlug(categorySlug);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null);
  const [workflowStep, setWorkflowStep] = useState(2);
  const [showBlockchain, setShowBlockchain] = useState(false);

  useEffect(() => {
    if (category?.types[0]) {
      setSelectedTypeId(category.types[0].id);
      setSelectedLayers([]);
      setActiveConnectorId(null);
      setWorkflowStep(2);
    }
  }, [category?.slug]);

  const selectedType = useMemo(
    () => category?.types.find((t) => t.id === selectedTypeId),
    [category, selectedTypeId],
  );

  const toggleLayer = useCallback((layer: string) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  }, []);

  const handleConnectorOpen = useCallback((connectorId: string) => {
    setActiveConnectorId(connectorId);
  }, []);

  if (!category) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-black text-[#1e3a5f]">Category not found</h1>
        <Link to="/dmrv" className="mt-4 inline-block text-sm font-bold text-emerald-800 underline">
          Back to DMRV hub
        </Link>
      </div>
    );
  }

  const layers = selectedType
    ? [...new Set([...selectedType.dataLayers, ...selectedType.inputs])]
    : [];
  const connectors = selectedType?.connectors ?? [];

  const mockHash = `dpal-evidence-${category.slug}-${selectedTypeId ?? 'none'}-${Date.now().toString(36)}`;

  return (
    <div className="min-h-full bg-[#f4f6f9] text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1440px)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to="/dmrv"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            DMRV hub
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

        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <img
            src={category.image}
            alt=""
            className="h-24 w-full max-w-[200px] rounded-xl border border-slate-200 object-cover object-top shadow-sm sm:h-28"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Adaptive DMRV</p>
            <h1 className="mt-1 text-xl font-black uppercase tracking-[0.06em] text-[#1e3a5f] md:text-2xl">{category.title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">{category.subtitle}</p>
          </div>
        </header>

        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(240px,280px)]">
          <DmrvInfographicArrows />
          <DmrvSelectorPanel
            category={category}
            selectedTypeId={selectedTypeId}
            onSelectType={(id) => {
              setSelectedTypeId(id);
              setSelectedLayers([]);
              setActiveConnectorId(null);
            }}
          />

          <div className="space-y-4">
            <DmrvTypeRows
              types={category.types}
              selectedTypeId={selectedTypeId}
              accentColor={category.color}
              onSelectType={setSelectedTypeId}
            />

            {selectedType ? (
              <section className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Selected DMRV type</h2>
                <p className="mt-1 text-base font-black text-[#1e3a5f]">{selectedType.title}</p>
                <p className="mt-1 text-sm text-slate-600">{selectedType.description}</p>

                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Required data sources</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {selectedType.inputs.slice(0, 8).map((input) => (
                      <li
                        key={input}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700"
                      >
                        {input}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Available connectors</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {connectors.map((id) => {
                      const c = getConnector(id);
                      if (!c) return null;
                      const active = activeConnectorId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleConnectorOpen(id)}
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
                </div>

                <DmrvWorkflowPanel
                  activeStep={workflowStep}
                  onStepChange={setWorkflowStep}
                  riskFlags={selectedType.riskFlags}
                />
              </section>
            ) : null}
          </div>

          <div className="space-y-4">
            <DmrvDataSourcePanel
              layers={layers}
              selectedLayers={selectedLayers}
              onToggleLayer={toggleLayer}
              accentColor={category.color}
            />
            {activeConnectorId ? (
              <DmrvConnectorPanel
                connectorId={activeConnectorId}
                onClose={() => setActiveConnectorId(null)}
                onOpenRoute={(meta) =>
                  openDmrvConnector(meta, { onNavigate, navigatePath: (path) => navigate(path) })
                }
              />
            ) : null}
          </div>
        </div>

        {showBlockchain ? (
          <div className="mt-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black uppercase text-[#1e3a5f]">Blockchain record (placeholder)</h3>
            <p className="mt-2 font-mono text-xs text-slate-700">{mockHash}</p>
            <p className="mt-2 text-[11px] text-slate-600">
              Local DPAL evidence fingerprint — not a public blockchain transaction until a live anchor service is
              configured. Use Transparency Database for ledger lookup when deployed.
            </p>
          </div>
        ) : null}

        <footer className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-300 bg-[#e8f0f7] p-4">
          <button
            type="button"
            onClick={() => onNavigate?.('previewEvidencePacket')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#152a47]"
          >
            <Package className="h-4 w-4" />
            Generate Evidence Packet
          </button>
          <button
            type="button"
            onClick={() =>
              openDmrvConnector(getConnector('validator-portal')!, { onNavigate, navigatePath: (p) => navigate(p) })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            <Shield className="h-4 w-4" />
            Open Validator Review
          </button>
          <button
            type="button"
            onClick={() => setShowBlockchain((v) => !v)}
            className="rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            Blockchain Record
          </button>
        </footer>
      </div>
    </div>
  );
}
