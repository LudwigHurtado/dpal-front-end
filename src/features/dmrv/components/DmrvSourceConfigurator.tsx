import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle,
  ChevronRight,
  Crosshair,
  Database,
  Globe,
  Lock,
  Satellite,
  Sun,
  TreePine,
  Waves,
} from '../../../../components/icons';
import type { IconProps } from '../../../../components/icons';
import { getDefaultSourceIds, getTypeHelperCopy } from '../dmrvRecommendedSources';
import {
  DMRV_SENSOR_TYPE_LABELS,
  getSensorImageUrl,
  getSensorSourceById,
  getSensorSourcesForKind,
  sourceStatusBadgeClass,
  sourceStatusDisplay,
  type DmrvSensorSource,
  type DmrvSensorUiIcon,
  type DmrvSourceConfiguratorKind,
} from '../dmrvSensorCatalog';
import { getDmrvProjectContext } from '../services/dmrvProjectContextService';
import { GEDI_LIDAR_GALLERY } from './DmrvGediLidarGallery';

export type DmrvSourceConfiguratorProps = {
  dmrvTypeId: string;
  dmrvTypeName: string;
  sourceKind: DmrvSourceConfiguratorKind;
  projectId: string;
  onClose: () => void;
  onSaveSelectedSources: (ids: string[]) => void;
  onDraftSelectionChange?: (ids: string[]) => void;
  initialSelectedIds?: string[];
};

const EVIDENCE_CHAIN = [
  'Project Config',
  'AOI Boundary',
  'Selected Sources',
  'Scene Search',
  'Index / Signal Calculation',
  'Evidence Packet',
  'Blockchain Anchor',
] as const;

function SensorIcon({ icon, className }: { icon: DmrvSensorUiIcon; className?: string }): React.ReactElement {
  const props: IconProps = { className: className ?? 'h-5 w-5', size: 20 };
  const map: Record<DmrvSensorUiIcon, React.ReactElement> = {
    satellite: <Satellite {...props} />,
    radar: <Activity {...props} />,
    waves: <Waves {...props} />,
    trees: <TreePine {...props} />,
    mountain: <Globe {...props} />,
    scan: <Crosshair {...props} />,
    layers: <Box {...props} />,
    thermal: <Sun {...props} />,
    database: <Database {...props} />,
    lock: <Lock {...props} />,
    check: <CheckCircle {...props} />,
  };
  return map[icon] ?? <Satellite {...props} />;
}

function kindTitle(kind: DmrvSourceConfiguratorKind): string {
  switch (kind) {
    case 'lidar':
      return 'LiDAR Source Configurator';
    case 'field':
      return 'Field Source Configurator';
    case 'blockchain':
      return 'Blockchain Evidence Configurator';
    case 'satellite':
    default:
      return 'Satellite Source Configurator';
  }
}

export function DmrvSourceConfigurator({
  dmrvTypeId,
  dmrvTypeName,
  sourceKind,
  projectId,
  onClose,
  onSaveSelectedSources,
  onDraftSelectionChange,
  initialSelectedIds = [],
}: DmrvSourceConfiguratorProps): React.ReactElement {
  const [draftIds, setDraftIds] = useState<string[]>(initialSelectedIds);
  const sources = useMemo(() => getSensorSourcesForKind(sourceKind), [sourceKind]);
  const recommendedDefaults = useMemo(
    () => getDefaultSourceIds(dmrvTypeId, sourceKind === 'lidar' ? 'lidar' : 'satellite'),
    [dmrvTypeId, sourceKind],
  );
  const recommendedSet = useMemo(() => new Set(recommendedDefaults), [recommendedDefaults]);

  const projectCtx = useMemo(() => getDmrvProjectContext(projectId), [projectId]);
  const hasAoi = Boolean(
    projectCtx?.location.aoiId?.trim() ||
      (projectCtx?.location.latitude?.trim() && projectCtx?.location.longitude?.trim()),
  );

  useEffect(() => {
    const seed = initialSelectedIds.length > 0 ? initialSelectedIds : recommendedDefaults;
    setDraftIds(seed);
  }, [initialSelectedIds, recommendedDefaults]);

  useEffect(() => {
    onDraftSelectionChange?.(draftIds);
  }, [draftIds, onDraftSelectionChange]);

  const toggle = useCallback(
    (id: string, checked: boolean) => {
      setDraftIds((prev) => {
        const set = new Set(prev);
        if (checked) set.add(id);
        else set.delete(id);
        return sources.map((s) => s.id).filter((sid) => set.has(sid));
      });
    },
    [sources],
  );

  const selectedSources = useMemo(
    () => draftIds.map((id) => getSensorSourceById(id)).filter((s): s is DmrvSensorSource => Boolean(s)),
    [draftIds],
  );

  const helperCopy = getTypeHelperCopy(dmrvTypeId, sourceKind === 'lidar' ? 'lidar' : 'satellite');

  const handleSave = () => {
    onSaveSelectedSources(draftIds);
    onClose();
  };

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="dmrv-source-configurator-title"
    >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-[#e8f0f7] to-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">DPAL DMRV</p>
            <h2 id="dmrv-source-configurator-title" className="text-lg font-black text-[#1e3a5f] md:text-xl">
              {kindTitle(sourceKind)}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose the {sourceKind === 'lidar' ? 'LiDAR' : 'satellite'} stack DPAL will use to evaluate this{' '}
              <span className="font-semibold">{dmrvTypeName}</span> project. Selection is saved as configuration for
              evidence search — not a live scan.
            </p>
          </div>
        </header>

        {helperCopy ? (
          <p className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs leading-relaxed text-slate-700">
            {helperCopy}
          </p>
        ) : null}

        <div className="px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,280px)]">
            <aside className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">Recommended stack</h3>
              <ul className="space-y-2">
                {recommendedDefaults.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    No defaults for this type — pick sources manually.
                  </li>
                ) : (
                  recommendedDefaults.map((id) => {
                    const src = getSensorSourceById(id);
                    if (!src) return null;
                    const checked = draftIds.includes(id);
                    return (
                      <li
                        key={id}
                        className={`rounded-lg border px-2.5 py-2 text-xs ${
                          checked ? 'border-[#1e3a5f]/40 bg-[#e8f0f7]' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <span className="font-bold text-slate-900">{src.shortName}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-600">{src.evidenceRole}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            <main className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">
                  Available sources ({sources.length})
                </h3>
                <span className="text-xs font-semibold text-slate-600">{draftIds.length} selected</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    checked={draftIds.includes(source.id)}
                    isRecommended={recommendedSet.has(source.id)}
                    onToggle={(checked) => toggle(source.id, checked)}
                    showMissionArt={sourceKind === 'satellite' || Boolean(getSensorImageUrl(source))}
                  />
                ))}
              </div>
            </main>

            <aside className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">
                Selected evidence chain
              </h3>
              <ol className="space-y-1">
                {EVIDENCE_CHAIN.map((step, i) => {
                  const active =
                    (step === 'Selected Sources' && draftIds.length > 0) ||
                    (step === 'Project Config' && Boolean(projectCtx?.projectName?.trim())) ||
                    (step === 'AOI Boundary' && hasAoi);
                  return (
                    <li
                      key={step}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                        active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span className="font-mono text-[9px] opacity-60">{i + 1}</span>
                      {step}
                      {active ? <CheckCircle className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
                    </li>
                  );
                })}
              </ol>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500">Your selection</p>
                {selectedSources.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No sources selected yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {selectedSources.map((s) => (
                      <li key={s.id} className="text-xs font-medium text-slate-800">
                        {s.shortName}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                  Configured selections flow into scene search rules, index calculations, evidence packet assembly, and
                  optional blockchain anchor metadata.
                </p>
              </div>
            </aside>
          </div>
        </div>

        <footer className="shrink-0 space-y-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          {draftIds.length === 0 ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Select at least one source to unlock scene search configuration.
            </p>
          ) : !hasAoi ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {sourceKind === 'lidar' ? 'LiDAR' : 'Satellite'} sources are configured, but scene search requires a saved
              AOI boundary in project config.
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Status: <span className="font-semibold text-[#1e3a5f]">Configured for evidence search</span> — DPAL has
              not pulled live scenes until you run a scan with a configured API host.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={draftIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
            >
              Save source stack
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
    </div>
  );
}

function SourceCardImage({
  src,
  alt,
  sourceId,
  uiIcon,
}: {
  src: string;
  alt: string;
  sourceId: string;
  uiIcon: DmrvSensorUiIcon;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full min-h-[108px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#e8f0f7] to-slate-100 px-3 text-center">
        <SensorIcon icon={uiIcon} className="h-8 w-8 text-[#1e3a5f]/70" />
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{sourceId}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="mx-auto h-full max-h-[120px] w-full object-contain object-center p-2"
      onError={() => setFailed(true)}
    />
  );
}

function SourceCard({
  source,
  checked,
  isRecommended,
  onToggle,
  showMissionArt,
}: {
  source: DmrvSensorSource;
  checked: boolean;
  isRecommended: boolean;
  onToggle: (checked: boolean) => void;
  showMissionArt: boolean;
}): React.ReactElement {
  const statusLabel = sourceStatusDisplay(source.status);
  const imageUrl = getSensorImageUrl(source);
  const hasArt = showMissionArt && Boolean(imageUrl);

  return (
    <label
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border transition hover:shadow-md ${
        checked ? 'border-[#1e3a5f] bg-[#f8fafc] ring-2 ring-[#1e3a5f]/15' : 'border-slate-200 bg-white'
      }`}
    >
      {hasArt && imageUrl ? (
        <div className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          {source.id === 'gedi-lidar' ? (
            <div className="divide-y divide-slate-100">
              {GEDI_LIDAR_GALLERY.map((item) => (
                <div key={item.src} className="flex min-h-[100px] items-center justify-center px-1 py-1">
                  <SourceCardImage
                    src={item.src}
                    alt={item.alt}
                    sourceId={source.id}
                    uiIcon={source.uiIcon}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[112px] items-center justify-center">
              <SourceCardImage
                src={imageUrl}
                alt={`${source.name} spacecraft`}
                sourceId={source.id}
                uiIcon={source.uiIcon}
              />
            </div>
          )}
          <div className="absolute right-2 top-2 z-10">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 bg-white text-[#1e3a5f] shadow-md"
              aria-label={`Select ${source.name}`}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          {!hasArt ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1e3a5f]"
            />
          ) : null}
          {!hasArt ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0f7] text-[#1e3a5f]">
              <SensorIcon icon={source.uiIcon} />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">{source.name}</span>
            {isRecommended ? (
              <span className="rounded-full bg-[#1e3a5f] px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                Rec
              </span>
            ) : null}
          </span>
          <span className="text-[10px] text-slate-500">{source.provider}</span>
        </span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${sourceStatusBadgeClass(statusLabel)}`}
        >
          {statusLabel}
        </span>
      </div>
      <span className="inline-flex w-fit rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-700">
        {DMRV_SENSOR_TYPE_LABELS[source.sensorType]}
      </span>
      <dl className="grid gap-1 text-[10px] text-slate-600">
        <div>
          <dt className="font-bold uppercase text-slate-500">Detects</dt>
          <dd>{source.detects.join(' · ')}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase text-slate-500">Best for</dt>
          <dd>{source.bestFor}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase text-slate-500">Evidence role</dt>
          <dd>{source.evidenceRole}</dd>
        </div>
      </dl>
      </div>
    </label>
  );
}
