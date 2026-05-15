import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CARBONPURA_DEFAULT_PROJECT_ID,
  CARBONPURA_PARTNER_KEY,
} from '../carbonPuraProjectContext';
import {
  createCarbonPuraProject,
  createDraftEvidencePacket,
  createEvidenceEvent,
  listCarbonPuraProjects,
  listEvidenceEvents,
  listEvidencePackets,
} from '../services/carbonPuraEvidenceApi';
import type {
  CarbonPuraEvidenceEvent,
  CarbonPuraEvidencePacket,
  CarbonPuraPersistenceMode,
  CarbonPuraProject,
  CreateCarbonPuraEvidenceEventInput,
} from '../services/carbonPuraEvidenceTypes';

export function useCarbonPuraEvidenceChain(projectId = CARBONPURA_DEFAULT_PROJECT_ID) {
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState<CarbonPuraPersistenceMode>('unavailable');
  const [project, setProject] = useState<CarbonPuraProject | null>(null);
  const [events, setEvents] = useState<CarbonPuraEvidenceEvent[]>([]);
  const [packets, setPackets] = useState<CarbonPuraEvidencePacket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listed = await listCarbonPuraProjects(CARBONPURA_PARTNER_KEY);
      if (!listed.ok) {
        setBackendAvailable(false);
        setPersistenceMode('unavailable');
        setProject(null);
        setEvents([]);
        setPackets([]);
        setError('Backend aggregation unavailable');
        return;
      }

      setBackendAvailable(true);
      const listedMode = listed.data.persistenceMode ?? 'memory';
      setPersistenceMode(listedMode);

      let active =
        listed.data.projects.find((p) => p.projectId === projectId) ?? null;

      if (!active) {
        const created = await createCarbonPuraProject({
          projectId,
          name: `CarbonPura project ${projectId}`,
          status: 'draft',
          locationLabel: null,
        });
        if (created.ok) active = created.data.project;
        else {
          setError(created.error);
          return;
        }
        if (created.data.persistenceMode) setPersistenceMode(created.data.persistenceMode);
      }

      setProject(active);

      const [evRes, pktRes] = await Promise.all([
        listEvidenceEvents(projectId),
        listEvidencePackets(projectId),
      ]);

      if (evRes.ok) {
        setEvents(evRes.data.events);
        if (evRes.data.persistenceMode) setPersistenceMode(evRes.data.persistenceMode);
      }
      if (pktRes.ok) {
        setPackets(pktRes.data.packets);
        if (pktRes.data.persistenceMode) setPersistenceMode(pktRes.data.persistenceMode);
      }
    } catch (e) {
      setBackendAvailable(false);
      setError(e instanceof Error ? e.message : 'refresh_failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const attachEvidenceEvent = useCallback(
    async (payload: CreateCarbonPuraEvidenceEventInput) => {
      if (!backendAvailable) return { ok: false as const, error: 'backend_unavailable' };
      setBusy(true);
      setError(null);
      try {
        const res = await createEvidenceEvent(projectId, payload);
        if (!res.ok) {
          setError(res.error);
          return res;
        }
        setEvents((prev) => [res.data.event, ...prev]);
        if (res.data.persistenceMode) setPersistenceMode(res.data.persistenceMode);
        return res;
      } finally {
        setBusy(false);
      }
    },
    [backendAvailable, projectId],
  );

  const createDraftPacket = useCallback(
    async (eventIds: string[]) => {
      if (!backendAvailable) return { ok: false as const, error: 'backend_unavailable' };
      if (eventIds.length === 0) return { ok: false as const, error: 'no_events' };
      setBusy(true);
      setError(null);
      try {
        const res = await createDraftEvidencePacket(projectId, eventIds);
        if (!res.ok) {
          setError(res.error);
          return res;
        }
        setPackets((prev) => [res.data.packet, ...prev]);
        if (res.data.persistenceMode) setPersistenceMode(res.data.persistenceMode);
        return res;
      } finally {
        setBusy(false);
      }
    },
    [backendAvailable, projectId],
  );

  const hasDraftPacket = useMemo(
    () => packets.some((p) => p.status === 'draft'),
    [packets],
  );

  const canCreateDraftPacket = backendAvailable && events.length > 0 && !busy;

  return {
    loading,
    busy,
    backendAvailable,
    persistenceMode,
    project,
    events,
    packets,
    error,
    hasDraftPacket,
    canCreateDraftPacket,
    refresh,
    attachEvidenceEvent,
    createDraftPacket,
  };
}
