import React, { useEffect, useMemo, useState } from 'react';
import { useGwLang } from '../../../i18n/useGwLang';
import {
  CHARITY_DISCOVERY_LIVE_SEARCH_CONNECTED,
  discoverCauseOrganizations,
  type CauseDiscoveryQuery,
} from '../charityDiscoveryService';
import type {
  CauseLocationMode,
  CauseOrganization,
  CauseRouteMode,
  CauseSearchRadiusKm,
} from '../types';

type Props = {
  pickupLabel?: string;
  dropoffLabel?: string;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  onAttachToRide?: (cause: CauseOrganization) => void;
  onUseAsLocation?: (cause: CauseOrganization) => void;
  onSupportCause?: (cause: CauseOrganization) => void;
  compact?: boolean;
};

const LOCATION_MODES: Array<{ id: CauseLocationMode; labelKey: string }> = [
  { id: 'my_zone', labelKey: 'causeModeMyZone' },
  { id: 'other_city', labelKey: 'causeModeOtherCity' },
  { id: 'other_country', labelKey: 'causeModeOtherCountry' },
];

const ROUTE_MODES: Array<{ id: CauseRouteMode; labelKey: string }> = [
  { id: 'near_pickup', labelKey: 'causeRouteNearPickup' },
  { id: 'near_dropoff', labelKey: 'causeRouteNearDropoff' },
  { id: 'along_route', labelKey: 'causeRouteAlongRoute' },
  { id: 'manual_area', labelKey: 'causeRouteManualArea' },
];

const RADII: CauseSearchRadiusKm[] = [5, 10, 25, 50];

const panelChipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${active ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'}`;

const localizeTag = (tag: string, t: (key: any) => string) => {
  if (tag === 'near_pickup') return t('causeRouteNearPickup');
  if (tag === 'near_dropoff') return t('causeRouteNearDropoff');
  if (tag === 'along_route') return t('causeRouteAlongRoute');
  if (tag === 'manual_area') return t('causeRouteManualArea');
  return tag;
};

export default function CauseDiscoveryPanel({
  pickupLabel,
  dropoffLabel,
  routeDistanceKm,
  routeDurationMinutes,
  onAttachToRide,
  onUseAsLocation,
  onSupportCause,
  compact = false,
}: Props) {
  const t = useGwLang((s) => s.t);
  const [locationMode, setLocationMode] = useState<CauseLocationMode>('my_zone');
  const [routeMode, setRouteMode] = useState<CauseRouteMode>('near_pickup');
  const [country, setCountry] = useState('Bolivia');
  const [city, setCity] = useState('Santa Cruz');
  const [areaQuery, setAreaQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState<CauseSearchRadiusKm>(10);
  const [loading, setLoading] = useState(false);
  const [causes, setCauses] = useState<CauseOrganization[]>([]);
  const [selectedCauseId, setSelectedCauseId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [openDetail, setOpenDetail] = useState<CauseOrganization | null>(null);

  const query: CauseDiscoveryQuery = useMemo(
    () => ({ country, city, areaQuery, locationMode, routeMode, radiusKm, pickupLabel, dropoffLabel }),
    [country, city, areaQuery, locationMode, routeMode, radiusKm, pickupLabel, dropoffLabel],
  );

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    discoverCauseOrganizations(query)
      .then((rows) => {
        if (!cancel) setCauses(rows);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [query]);

  const selectedCause = useMemo(
    () => causes.find((cause) => cause.id === selectedCauseId) ?? null,
    [causes, selectedCauseId],
  );

  const mapSummary = useMemo(() => {
    if (routeMode === 'near_pickup') return t('causeMapNearPickup');
    if (routeMode === 'near_dropoff') return t('causeMapNearDropoff');
    if (routeMode === 'along_route') return t('causeMapAlongRoute');
    return t('causeMapSelectedArea');
  }, [routeMode, t]);

  const routeContextReady = Boolean(pickupLabel && dropoffLabel);
  const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3">
        <h3 className="text-[15px] font-black text-slate-900">{t('causeDiscoveryTitle')}</h3>
        <p className="mt-1 text-[11px] font-semibold text-slate-600">{t('causeDiscoverySubtitle')}</p>
      </div>

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        {LOCATION_MODES.map((mode) => (
          <button key={mode.id} type="button" className={panelChipClass(locationMode === mode.id)} onClick={() => setLocationMode(mode.id)}>
            {t(mode.labelKey as any)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {ROUTE_MODES.map((mode) => (
          <button key={mode.id} type="button" className={panelChipClass(routeMode === mode.id)} onClick={() => setRouteMode(mode.id)}>
            {t(mode.labelKey as any)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={t('causeCountryPlaceholder')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('causeCityPlaceholder')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
        />
        <input
          value={areaQuery}
          onChange={(e) => setAreaQuery(e.target.value)}
          placeholder={t('causeAreaSearch')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 sm:col-span-2"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {RADII.map((radius) => (
          <button key={radius} type="button" className={panelChipClass(radiusKm === radius)} onClick={() => setRadiusKm(radius)}>
            {radius} km
          </button>
        ))}
        <button type="button" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
          {t('causeUseMyLocation')}
        </button>
        <span className="text-[10px] font-semibold text-slate-500">{t('causePreviewMode')}</span>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-1 text-[11px] font-black uppercase tracking-[0.07em] text-slate-500">{t('causeMapPreviewTitle')}</div>
        <div className="rounded-xl bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-100 p-3">
          <p className="text-xs font-extrabold text-slate-800">{mapSummary}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-600">
            {t('causeMapRadiusSummary').replace('{{radius}}', String(radiusKm))}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {(city || t('causeNoCity'))} {country ? `, ${country}` : ''} {pickupLabel ? ` • ${pickupLabel.split(',')[0]}` : ''}
            {dropoffLabel ? ` -> ${dropoffLabel.split(',')[0]}` : ''}
          </p>
          {routeDistanceKm != null && (
            <p className="mt-1 text-[10px] font-bold text-slate-500">
              {routeDistanceKm.toFixed(1)} km · {routeDurationMinutes ?? '--'} min
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3">
        <p className="text-[11px] font-bold text-sky-800">{t('causeAiStripPrimary')}</p>
        <p className="mt-1 text-[11px] font-semibold text-sky-700">{t('causeAiStripSecondary')}</p>
      </div>

      {!routeContextReady && (routeMode === 'near_pickup' || routeMode === 'near_dropoff' || routeMode === 'along_route') && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          {t('causeRouteNeedsPickupDropoff')}
        </div>
      )}

      <div className={`mt-3 ${compact ? 'space-y-2' : 'grid grid-cols-1 gap-3 xl:grid-cols-2'}`}>
        {loading ? (
          <p className={`${compact ? '' : 'xl:col-span-2'} text-xs font-semibold text-slate-500`}>{t('loading')}</p>
        ) : causes.length === 0 ? (
          <div className={`${compact ? '' : 'xl:col-span-2'} rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700`}>
            <p>{t('causeNotFoundTitle')}</p>
            <p className="mt-1">{t('causeNotFoundHint')}</p>
          </div>
        ) : (
          causes.map((cause) => {
            const selected = selectedCauseId === cause.id;
            const mediaUrl = cause.media.previewVideoUrl ?? cause.media.previewGifUrl ?? cause.media.previewImageUrl;
            const hasVideo = Boolean(cause.media.previewVideoUrl);
            return (
              <article key={cause.id} className={`overflow-hidden rounded-2xl border ${selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                <div className="relative h-28 bg-slate-100">
                  {mediaUrl ? (
                    hasVideo ? (
                      <video src={mediaUrl} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <img src={mediaUrl} alt={cause.name} loading="lazy" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-r from-slate-100 to-slate-200 text-2xl">📍</div>
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-slate-700"
                    onClick={() => setSavedIds((prev) => (prev.includes(cause.id) ? prev.filter((id) => id !== cause.id) : [...prev, cause.id]))}
                  >
                    {savedIds.includes(cause.id) ? '★' : '☆'} {t('causeSave')}
                  </button>
                </div>
                <div className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">{cause.name}</h4>
                    {cause.verified && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">{t('causeVerified')}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">{cause.category} · {cause.city}, {cause.country}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{cause.shortDescription}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cause.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">{localizeTag(tag, t)}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-sky-700">{cause.aiReason}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-black text-white" onClick={() => setOpenDetail(cause)}>
                      {t('causeView')}
                    </button>
                    <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black text-slate-700" onClick={() => { setSelectedCauseId(cause.id); onAttachToRide?.(cause); }}>
                      {t('causeAttachToRide')}
                    </button>
                    <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black text-slate-700" onClick={() => onUseAsLocation?.(cause)}>
                      {t('causeUseThisLocation')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {selectedCause && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-black text-emerald-800">{t('causeAttachedSummary')}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">{selectedCause.name} · {selectedCause.category} · {selectedCause.city}</p>
        </div>
      )}

      {openDetail && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/50 p-3">
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-sm font-black text-slate-900">{openDetail.name}</h5>
              <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" onClick={() => setOpenDetail(null)}>✕</button>
            </div>
            {openDetail.media.previewImageUrl ? (
              <img src={openDetail.media.previewImageUrl} alt={openDetail.name} loading="lazy" className="mb-2 h-32 w-full rounded-xl object-cover" />
            ) : (
              <div className="mb-2 flex h-28 items-center justify-center rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 text-2xl">📍</div>
            )}
            <p className="text-xs font-semibold text-slate-600">{openDetail.mission}</p>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-black text-slate-700">{openDetail.city}, {openDetail.country}</p>
              <p className="text-[11px] font-semibold text-slate-600">{openDetail.address}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">
                {openDetail.distanceKm?.toFixed(1)} km · {openDetail.etaMinutes ?? '--'} min
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
              {openDetail.impactStats.animalsRescued != null && <div>🐾 {openDetail.impactStats.animalsRescued} {t('impactAnimalsRescued')}</div>}
              {openDetail.impactStats.mealsServed != null && <div>🍲 {openDetail.impactStats.mealsServed} {t('impactMealsServed')}</div>}
              {openDetail.impactStats.childrenSupported != null && <div>🧒 {openDetail.impactStats.childrenSupported} {t('impactChildrenSupported')}</div>}
              {openDetail.impactStats.seniorsServed != null && <div>👵 {openDetail.impactStats.seniorsServed} {t('impactSeniorsServed')}</div>}
            </div>
            <ul className="mt-2 list-disc pl-4 text-[11px] font-semibold text-slate-600">
              <li>{t('causeTrustBullet1')}</li>
              <li>{t('causeTrustBullet2')}</li>
              <li>{t('causeTrustBullet3')}</li>
              <li>{t('causeTrustBullet4')}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-black text-white" onClick={() => onUseAsLocation?.(openDetail)}>{t('causeUseThisLocation')}</button>
              <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black text-slate-700" onClick={() => onAttachToRide?.(openDetail)}>{t('causeAttachToRide')}</button>
              <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black text-slate-700" onClick={() => onSupportCause?.(openDetail)}>{t('causeSupport')}</button>
              <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black text-slate-700">{t('causeShareImpact')}</button>
              <button type="button" className="rounded-xl border border-amber-300 px-3 py-2 text-[11px] font-black text-amber-700">{t('causeOptionalDonate')}</button>
            </div>
          </div>
        </div>
      )}

      {isDev && (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 text-[10px] font-semibold text-slate-600">
          mode={locationMode} route={routeMode} city={city || '-'} country={country || '-'} selectedCause={selectedCauseId ?? '-'} attached={selectedCause ? 'yes' : 'no'} liveSearch={CHARITY_DISCOVERY_LIVE_SEARCH_CONNECTED ? 'connected' : 'not_connected'}
        </div>
      )}
    </section>
  );
}
