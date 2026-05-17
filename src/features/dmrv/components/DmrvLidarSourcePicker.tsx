import React, { useMemo, useState } from 'react';
import {
  DMRV_LIDAR_SOURCES,
  getLidarSourcesForIds,
  parseSelectedLidarIds,
  toggleLidarSelection,
} from '../dmrvLidarCatalog';
import {
  getSensorImageUrl,
  sourceStatusBadgeClass,
  sourceStatusDisplay,
  type DmrvSensorSource,
} from '../dmrvSensorCatalog';
import { GEDI_LIDAR_GALLERY } from './DmrvGediLidarGallery';

type DmrvLidarSourcePickerProps = {
  selectedRaw: unknown;
  onChange: (serializedIds: string) => void;
};

function SourceImage({ src, alt, fallbackLabel }: { src: string; alt: string; fallbackLabel: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#e8f0f7] to-slate-100 px-3 text-center">
        <span className="text-[10px] font-black uppercase tracking-wide text-[#1e3a5f]">Image unavailable</span>
        <span className="text-[9px] text-slate-500">{fallbackLabel}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="mx-auto h-full max-h-[140px] w-full object-contain object-center p-2"
      onError={() => setFailed(true)}
    />
  );
}

function LidarCardImage({ source }: { source: DmrvSensorSource }): React.ReactElement {
  const imageUrl = getSensorImageUrl(source);
  if (!imageUrl) {
    return (
      <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#e8f0f7] to-slate-100 px-3 text-center">
        <span className="text-sm font-black text-[#1e3a5f]">{source.shortName}</span>
        <span className="text-[10px] text-slate-500">{source.provider}</span>
      </div>
    );
  }
  return <SourceImage src={imageUrl} alt={source.name} fallbackLabel={source.shortName} />;
}

function GediGalleryFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="bg-white">
      <div className="flex min-h-[160px] items-center justify-center bg-gradient-to-b from-slate-50 to-white p-2 sm:min-h-[200px]">
        {failed ? (
          <span className="px-3 text-center text-[10px] text-slate-500">{caption}</span>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="max-h-[min(220px,28vh)] w-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption className="border-t border-slate-100 px-3 py-2 text-[10px] leading-snug text-slate-600">
        {caption}
      </figcaption>
    </figure>
  );
}

export function DmrvLidarSourcePicker({ selectedRaw, onChange }: DmrvLidarSourcePickerProps): React.ReactElement {
  const selectedIds = useMemo(() => parseSelectedLidarIds(selectedRaw), [selectedRaw]);
  const selectedNames = useMemo(
    () => getLidarSourcesForIds(selectedIds).map((s) => s.shortName).join(', '),
    [selectedIds],
  );

  const handleToggle = (sourceId: string, checked: boolean) => {
    const next = toggleLidarSelection(selectedIds, sourceId, checked);
    onChange(next.join(','));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e3a5f]/15 bg-gradient-to-br from-[#e8f0f7] to-white px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">LiDAR stack</p>
        <p className="mt-1 text-sm text-slate-700">
          Pick spaceborne, airborne, or field LiDAR sources for canopy height, terrain, and 3D structure evidence.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {selectedIds.length === 0
            ? 'No LiDAR source selected yet — choose at least one for structure validation.'
            : `${selectedIds.length} selected: ${selectedNames}`}
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#1e3a5f]/20 bg-gradient-to-br from-[#e8f0f7] to-white">
        <div className="border-b border-[#1e3a5f]/10 px-4 py-2.5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">NASA GEDI reference</p>
          <p className="mt-0.5 text-xs text-slate-600">
            ISS mount and laser bench — educational reference for spaceborne canopy LiDAR (not a live AOI pull).
          </p>
        </div>
        <div className="grid gap-0 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {GEDI_LIDAR_GALLERY.map((item) => (
            <GediGalleryFigure key={item.src} {...item} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DMRV_LIDAR_SOURCES.map((source) => {
          const checked = selectedIds.includes(source.id);
          return (
            <label
              key={source.id}
              className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                checked
                  ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="relative border-b border-slate-100 bg-white">
                <div className="flex min-h-[132px] items-center justify-center bg-gradient-to-b from-slate-50 to-white">
                  {source.id === 'gedi-lidar' ? (
                    <img
                      src={GEDI_LIDAR_GALLERY[0]?.src ?? getSensorImageUrl(source) ?? ''}
                      alt="GEDI on ISS"
                      loading="lazy"
                      className="max-h-[140px] w-full object-contain p-2"
                    />
                  ) : (
                    <LidarCardImage source={source} />
                  )}
                </div>
                <div className="absolute right-2 top-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggle(source.id, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 bg-white text-[#1e3a5f] shadow-md"
                    aria-label={`Select ${source.name}`}
                  />
                </div>
              </div>

              <div className="border-b border-slate-100 bg-[#1e3a5f] px-3 py-2 text-white">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black leading-tight">{source.name}</p>
                    <p className="text-[10px] font-medium text-white/85">{source.provider}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${sourceStatusBadgeClass(sourceStatusDisplay(source.status))}`}
                  >
                    {sourceStatusDisplay(source.status)}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-xs leading-relaxed text-slate-700">{source.bestFor}</p>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Evidence role</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{source.evidenceRole}</p>
                </div>
                {source.resolutionLabel ? (
                  <p className="mt-auto text-[10px] text-slate-500">
                    {source.resolutionLabel}
                    {source.revisitLabel ? ` · ${source.revisitLabel}` : ''}
                  </p>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
