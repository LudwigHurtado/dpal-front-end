import {
  API_ROUTES,
  CARBONPURA_PROJECT_EVIDENCE_EVENTS,
  CARBONPURA_PROJECT_EVIDENCE_PACKET_DRAFT,
  CARBONPURA_PROJECT_EVIDENCE_PACKETS,
  apiUrl,
} from '../../../../../constants';
import type {
  CarbonPuraEvidenceEvent,
  CarbonPuraEvidencePacket,
  CarbonPuraPersistenceMode,
  CarbonPuraProject,
  CreateCarbonPuraEvidenceEventInput,
} from './carbonPuraEvidenceTypes';
import { CARBONPURA_PARTNER_KEY } from '../carbonPuraProjectContext';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

export type CarbonPuraApiResult<T> =
  | { ok: true; data: T; persistenceMode?: CarbonPuraPersistenceMode }
  | { ok: false; error: string; status?: number };

export async function listCarbonPuraProjects(
  partnerKey = CARBONPURA_PARTNER_KEY,
): Promise<CarbonPuraApiResult<{ projects: CarbonPuraProject[]; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const url = `${apiUrl(API_ROUTES.CARBONPURA_PROJECTS)}?partnerKey=${encodeURIComponent(partnerKey)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { ok: false, error: `list_projects_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      projects?: CarbonPuraProject[];
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !Array.isArray(body.projects)) return { ok: false, error: 'invalid_list_projects_response' };
    return { ok: true, data: { projects: body.projects, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function createCarbonPuraProject(input: {
  projectId: string;
  name: string;
  partnerKey?: string;
  status?: string;
  locationLabel?: string | null;
}): Promise<CarbonPuraApiResult<{ project: CarbonPuraProject; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.CARBONPURA_PROJECTS), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerKey: input.partnerKey ?? CARBONPURA_PARTNER_KEY,
        projectId: input.projectId,
        name: input.name,
        status: input.status ?? 'draft',
        locationLabel: input.locationLabel ?? null,
      }),
    });
    if (!res.ok) return { ok: false, error: `create_project_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      project?: CarbonPuraProject;
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !body.project) return { ok: false, error: 'invalid_create_project_response' };
    return { ok: true, data: { project: body.project, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function listEvidenceEvents(
  projectId: string,
): Promise<CarbonPuraApiResult<{ events: CarbonPuraEvidenceEvent[]; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const res = await fetch(CARBONPURA_PROJECT_EVIDENCE_EVENTS(projectId), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `list_events_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      events?: CarbonPuraEvidenceEvent[];
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !Array.isArray(body.events)) return { ok: false, error: 'invalid_list_events_response' };
    return { ok: true, data: { events: body.events, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function createEvidenceEvent(
  projectId: string,
  payload: CreateCarbonPuraEvidenceEventInput,
): Promise<CarbonPuraApiResult<{ event: CarbonPuraEvidenceEvent; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const res = await fetch(CARBONPURA_PROJECT_EVIDENCE_EVENTS(projectId), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerKey: CARBONPURA_PARTNER_KEY,
        moduleId: payload.moduleId ?? null,
        moduleName: payload.moduleName,
        sourceSuite: payload.sourceSuite ?? null,
        eventType: payload.eventType ?? 'evidence_source_selected',
        title: payload.title,
        summary: payload.summary ?? null,
        status: payload.status ?? 'evidence_source_selected',
        confidenceUse: payload.confidenceUse ?? null,
        provider: payload.provider ?? null,
        rawPayloadJson: payload.rawPayloadJson ?? null,
        limitationsJson: payload.limitationsJson ?? [
          'Evidence selection only; scan output attachment pending unless module has exported result.',
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: `create_event_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      event?: CarbonPuraEvidenceEvent;
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !body.event) return { ok: false, error: 'invalid_create_event_response' };
    return { ok: true, data: { event: body.event, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function listEvidencePackets(
  projectId: string,
): Promise<CarbonPuraApiResult<{ packets: CarbonPuraEvidencePacket[]; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const res = await fetch(CARBONPURA_PROJECT_EVIDENCE_PACKETS(projectId), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `list_packets_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      packets?: CarbonPuraEvidencePacket[];
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !Array.isArray(body.packets)) return { ok: false, error: 'invalid_list_packets_response' };
    return { ok: true, data: { packets: body.packets, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function createDraftEvidencePacket(
  projectId: string,
  eventIds: string[],
  options?: { title?: string; summary?: string | null },
): Promise<CarbonPuraApiResult<{ packet: CarbonPuraEvidencePacket; persistenceMode?: CarbonPuraPersistenceMode }>> {
  try {
    const res = await fetch(CARBONPURA_PROJECT_EVIDENCE_PACKET_DRAFT(projectId), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerKey: CARBONPURA_PARTNER_KEY,
        eventIds,
        title: options?.title,
        summary: options?.summary ?? null,
      }),
    });
    if (!res.ok) return { ok: false, error: `create_packet_${res.status}`, status: res.status };
    const body = await parseJson<{
      ok: boolean;
      packet?: CarbonPuraEvidencePacket;
      persistenceMode?: CarbonPuraPersistenceMode;
    }>(res);
    if (!body.ok || !body.packet) return { ok: false, error: 'invalid_create_packet_response' };
    return { ok: true, data: { packet: body.packet, persistenceMode: body.persistenceMode } };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}
