import { apiUrl, API_ROUTES, CARBON_PROJECT_LEDGER } from '../../../../constants';
import { emitDmrvReportDirty } from '../reporting/dmrvReportEvents';
import { safeTrim } from '../utils/safeString';
import { utf8ToBase64 } from '../utils/utf8Base64';
import type { DmrvProjectContext, DmrvProjectStatus, DmrvProjectValidationResult } from './dmrvProjectContextTypes';

const STORAGE_KEY = 'dpal_dmrv_project_contexts_v1';

function readAll(): Record<string, DmrvProjectContext> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DmrvProjectContext>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, DmrvProjectContext>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function generateDmrvProjectId(categorySlug: string, typeId: string): string {
  const stamp = Date.now().toString(36).slice(-4);
  return `dmrv-${categorySlug}-${typeId}-${stamp}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/** Stable project id for a category + type when the operator has not created a named project yet. */
export function defaultDmrvProjectId(categorySlug: string, typeId: string): string {
  return `dmrv-${categorySlug}-${typeId}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/** Ensure a draft project context exists so evidence inputs can open without completing project setup first. */
export function ensureDmrvProjectContext(params: {
  categorySlug: string;
  categoryTitle: string;
  typeId: string;
  typeTitle: string;
  projectId?: string | null;
}): DmrvProjectContext {
  const projectId = params.projectId?.trim() || defaultDmrvProjectId(params.categorySlug, params.typeId);
  const existing = getDmrvProjectContext(projectId);
  if (existing) return existing;
  return createDmrvProjectContext(
    buildDefaultProjectContext({
      categorySlug: params.categorySlug,
      categoryTitle: params.categoryTitle,
      typeId: params.typeId,
      typeTitle: params.typeTitle,
      projectId,
    }),
  );
}

export function buildDefaultProjectContext(params: {
  categorySlug: string;
  categoryTitle: string;
  typeId: string;
  typeTitle: string;
  projectId?: string;
}): DmrvProjectContext {
  const projectId = params.projectId ?? generateDmrvProjectId(params.categorySlug, params.typeId);
  const now = new Date().toISOString();
  return {
    projectId,
    projectName: '',
    organization: '',
    description: '',
    categorySlug: params.categorySlug,
    categoryTitle: params.categoryTitle,
    typeId: params.typeId,
    typeTitle: params.typeTitle,
    location: {
      countryRegion: '',
      latitude: '',
      longitude: '',
      aoiId: '',
      aoiSummary: '',
      aoiGeoJson: '',
      geoJsonUploaded: false,
      coordinateValidation: 'pending',
    },
    reporting: {
      startDate: '',
      endDate: '',
      monitoringFrequency: 'monthly',
      baselineYear: '',
      comparisonPeriod: '',
    },
    methodology: {
      name: '',
      standardFramework: '',
      domain: 'carbon',
      requiredEvidenceSources: '',
      uncertaintyRules: '',
    },
    reviewer: {
      name: '',
      organization: '',
      role: 'validator',
      reviewRequired: true,
      humanVerificationRequired: true,
    },
    blockchain: { status: 'none' },
    status: 'required',
    createdAt: now,
    updatedAt: now,
  };
}

/** Repair partial or legacy localStorage project records before report build / validation. */
export function normalizeDmrvProjectContext(
  raw: Partial<DmrvProjectContext> | null | undefined,
): DmrvProjectContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const categorySlug = safeTrim(raw.categorySlug) || 'carbon-land';
  const typeId = safeTrim(raw.typeId) || 'forest-land-use';
  const base = buildDefaultProjectContext({
    categorySlug,
    categoryTitle: safeTrim(raw.categoryTitle) || categorySlug,
    typeId,
    typeTitle: safeTrim(raw.typeTitle) || typeId,
    projectId: safeTrim(raw.projectId) || undefined,
  });
  const loc: Partial<DmrvProjectContext['location']> =
    raw.location && typeof raw.location === 'object' ? raw.location : {};
  const reporting: Partial<DmrvProjectContext['reporting']> =
    raw.reporting && typeof raw.reporting === 'object' ? raw.reporting : {};
  const methodology: Partial<DmrvProjectContext['methodology']> =
    raw.methodology && typeof raw.methodology === 'object' ? raw.methodology : {};
  const reviewer: Partial<DmrvProjectContext['reviewer']> =
    raw.reviewer && typeof raw.reviewer === 'object' ? raw.reviewer : {};
  const blockchain: Partial<DmrvProjectContext['blockchain']> =
    raw.blockchain && typeof raw.blockchain === 'object' ? raw.blockchain : {};
  const normalized: DmrvProjectContext = {
    ...base,
    projectId: safeTrim(raw.projectId) || base.projectId,
    projectName: safeTrim(raw.projectName),
    organization: safeTrim(raw.organization),
    description: safeTrim(raw.description),
    location: {
      ...base.location,
      countryRegion: safeTrim(loc.countryRegion),
      latitude: safeTrim(loc.latitude),
      longitude: safeTrim(loc.longitude),
      aoiId: safeTrim(loc.aoiId),
      aoiSummary: safeTrim(loc.aoiSummary),
      aoiGeoJson: safeTrim(loc.aoiGeoJson),
      geoJsonUploaded: Boolean(loc.geoJsonUploaded),
      coordinateValidation:
        loc.coordinateValidation === 'valid' || loc.coordinateValidation === 'invalid'
          ? loc.coordinateValidation
          : 'pending',
    },
    reporting: {
      ...base.reporting,
      startDate: safeTrim(reporting.startDate),
      endDate: safeTrim(reporting.endDate),
      monitoringFrequency: safeTrim(reporting.monitoringFrequency) || base.reporting.monitoringFrequency,
      baselineYear: safeTrim(reporting.baselineYear),
      comparisonPeriod: safeTrim(reporting.comparisonPeriod),
    },
    methodology: {
      ...base.methodology,
      name: safeTrim(methodology.name),
      standardFramework: safeTrim(methodology.standardFramework),
      domain:
        methodology.domain === 'carbon' ||
        methodology.domain === 'biodiversity' ||
        methodology.domain === 'pollution' ||
        methodology.domain === 'water' ||
        methodology.domain === 'custom'
          ? methodology.domain
          : base.methodology.domain,
      requiredEvidenceSources: safeTrim(methodology.requiredEvidenceSources),
      uncertaintyRules: safeTrim(methodology.uncertaintyRules),
    },
    reviewer: {
      ...base.reviewer,
      name: safeTrim(reviewer.name),
      organization: safeTrim(reviewer.organization),
      role: safeTrim(reviewer.role) || base.reviewer.role,
      reviewRequired: reviewer.reviewRequired !== false,
      humanVerificationRequired: reviewer.humanVerificationRequired !== false,
    },
    blockchain: {
      ...base.blockchain,
      status:
        blockchain.status === 'pending' ||
        blockchain.status === 'anchored' ||
        blockchain.status === 'unavailable'
          ? blockchain.status
          : 'none',
      configHash: safeTrim(blockchain.configHash) || undefined,
      ledgerRecordId: safeTrim(blockchain.ledgerRecordId) || undefined,
      qrEvidenceRootUrl: safeTrim(blockchain.qrEvidenceRootUrl) || undefined,
      anchoredAt: safeTrim(blockchain.anchoredAt) || undefined,
      serviceMessage: safeTrim(blockchain.serviceMessage) || undefined,
    },
    createdAt: safeTrim(raw.createdAt) || base.createdAt,
    updatedAt: safeTrim(raw.updatedAt) || base.updatedAt,
    status: base.status,
  };
  normalized.status = deriveProjectStatus(normalized);
  return normalized;
}

export function createDmrvProjectContext(payload: DmrvProjectContext): DmrvProjectContext {
  const map = readAll();
  const normalized = normalizeDmrvProjectContext(payload) ?? payload;
  const saved = {
    ...normalized,
    updatedAt: new Date().toISOString(),
    status: deriveProjectStatus(normalized),
  };
  map[saved.projectId] = saved;
  writeAll(map);
  emitDmrvReportDirty(saved.projectId);
  return saved;
}

export function getDmrvProjectContext(projectId: string): DmrvProjectContext | null {
  const raw = readAll()[projectId];
  return raw ? normalizeDmrvProjectContext(raw) : null;
}

export function updateDmrvProjectContext(
  projectId: string,
  payload: Partial<DmrvProjectContext>,
): DmrvProjectContext | null {
  const existing = getDmrvProjectContext(projectId);
  if (!existing) return null;
  const merged: DmrvProjectContext = {
    ...existing,
    ...payload,
    projectId,
    location: { ...existing.location, ...payload.location },
    reporting: { ...existing.reporting, ...payload.reporting },
    methodology: { ...existing.methodology, ...payload.methodology },
    reviewer: { ...existing.reviewer, ...payload.reviewer },
    blockchain: { ...existing.blockchain, ...payload.blockchain },
    updatedAt: new Date().toISOString(),
  };
  merged.status = deriveProjectStatus(merged);
  return createDmrvProjectContext(merged);
}

export function validateDmrvProjectContext(ctx: DmrvProjectContext): DmrvProjectValidationResult {
  const missing: string[] = [];
  if (!ctx.projectName.trim()) missing.push('projectName');
  if (!ctx.projectId.trim()) missing.push('projectId');

  const hasCoords =
    ctx.location.latitude.trim() !== '' &&
    ctx.location.longitude.trim() !== '' &&
    !Number.isNaN(Number(ctx.location.latitude)) &&
    !Number.isNaN(Number(ctx.location.longitude));
  const hasPolygon = ctx.location.aoiGeoJson?.trim() !== '';
  const hasAoi = ctx.location.aoiId.trim() !== '' || hasPolygon;
  if (!hasCoords && !hasAoi) missing.push('coordinatesOrAoi');

  if (!ctx.reporting.startDate.trim()) missing.push('reportingPeriodStart');
  if (!ctx.reporting.endDate.trim()) missing.push('reportingPeriodEnd');
  if (!ctx.methodology.name.trim()) missing.push('methodology');

  const coordinateOk =
    hasAoi ||
    (hasCoords &&
      Number(ctx.location.latitude) >= -90 &&
      Number(ctx.location.latitude) <= 90 &&
      Number(ctx.location.longitude) >= -180 &&
      Number(ctx.location.longitude) <= 180);

  return {
    complete: missing.length === 0 && coordinateOk,
    missing,
    coordinateOk,
  };
}

export function isDmrvProjectContextComplete(projectId: string | null | undefined): boolean {
  if (!projectId) return false;
  const ctx = getDmrvProjectContext(projectId);
  if (!ctx) return false;
  return validateDmrvProjectContext(ctx).complete;
}

function deriveProjectStatus(ctx: DmrvProjectContext): DmrvProjectStatus {
  if (ctx.blockchain.status === 'anchored' && ctx.blockchain.configHash) return 'blockchain_ready';
  const v = validateDmrvProjectContext(ctx);
  if (v.complete) return 'complete';
  if (ctx.projectName.trim() || ctx.methodology.name.trim()) return 'draft';
  return 'required';
}

/** Integrity digest for project identity — not a public chain transaction until anchored via API. */
export async function generateDmrvProjectHash(ctx: DmrvProjectContext): Promise<string> {
  const canonical = JSON.stringify({
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    categorySlug: ctx.categorySlug,
    typeId: ctx.typeId,
    location: ctx.location,
    reporting: ctx.reporting,
    methodology: ctx.methodology,
    reviewer: ctx.reviewer,
    updatedAt: ctx.updatedAt,
  });
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(canonical);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `local-${utf8ToBase64(canonical).slice(0, 48)}`;
}

export type AnchorProjectResult =
  | { ok: true; configHash: string; ledgerRecordId?: string; qrEvidenceRootUrl?: string; anchoredAt: string }
  | { ok: false; message: string; adapterReady: boolean };

export async function anchorDmrvProjectIdentity(ctx: DmrvProjectContext): Promise<AnchorProjectResult> {
  const configHash = await generateDmrvProjectHash(ctx);
  const payload = {
    action: 'anchor_dmrv_project',
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    categorySlug: ctx.categorySlug,
    typeId: ctx.typeId,
    configHash,
    coordinates: {
      latitude: ctx.location.latitude,
      longitude: ctx.location.longitude,
      aoiId: ctx.location.aoiId,
      countryRegion: ctx.location.countryRegion,
      aoiSummary: ctx.location.aoiSummary,
      aoiGeoJson: ctx.location.aoiGeoJson,
    },
    methodology: ctx.methodology.name,
    reportingPeriod: `${ctx.reporting.startDate} — ${ctx.reporting.endDate}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(CARBON_PROJECT_LEDGER(ctx.projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      const hash = String(body.hash ?? body.anchoringHash ?? body.contentHash ?? configHash);
      return {
        ok: true,
        configHash: hash,
        ledgerRecordId: String(body.ledgerRecordId ?? body.recordId ?? ''),
        qrEvidenceRootUrl: typeof body.qrUrl === 'string' ? body.qrUrl : undefined,
        anchoredAt: String(body.anchoredAt ?? new Date().toISOString()),
      };
    }
  } catch {
    /* fall through */
  }

  try {
    const envRes = await fetch(apiUrl(`${API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_EVIDENCE_PACKETS}/anchor`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, scope: 'dmrv_project' }),
    });
    if (envRes.ok) {
      const body = (await envRes.json()) as Record<string, unknown>;
      const hash = String(body.integrityHash ?? body.hash ?? configHash);
      return {
        ok: true,
        configHash: hash,
        ledgerRecordId: String(body.packetId ?? ''),
        anchoredAt: new Date().toISOString(),
      };
    }
  } catch {
    /* fall through */
  }

  return {
    ok: false,
    adapterReady: true,
    message: 'Blockchain adapter ready — backend endpoint required.',
  };
}

/** Reporting period label for banners and anchor payloads. */
export function formatReportingPeriod(ctx: DmrvProjectContext): string {
  const { startDate, endDate } = ctx.reporting;
  if (startDate && endDate) return `${startDate} — ${endDate}`;
  return startDate || endDate || '—';
}
