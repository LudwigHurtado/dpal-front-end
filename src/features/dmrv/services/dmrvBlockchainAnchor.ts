import { apiUrl, API_ROUTES, CARBON_PROJECT_LEDGER } from '../../../../constants';
import type { DmrvInputConfig } from './dmrvInputConfigTypes';

export type AnchorDmrvInputConfigParams = {
  projectId: string;
  categorySlug: string;
  inputKey: string;
  config: DmrvInputConfig;
  evidencePacketId?: string;
};

export type AnchorDmrvInputConfigResult =
  | {
      ok: true;
      anchored: true;
      lastAnchoredHash: string;
      ledgerRecordId?: string;
      anchoredAt: string;
      qrEvidenceUrl?: string;
      provider: string;
    }
  | {
      ok: false;
      anchored: false;
      message: string;
      adapterReady: boolean;
    };

/**
 * Attempts to anchor DMRV input configuration to an existing DPAL ledger endpoint.
 * Does not fabricate chain transactions — returns explicit unavailable state when routes 404.
 */
export async function anchorDmrvInputConfig(
  params: AnchorDmrvInputConfigParams,
): Promise<AnchorDmrvInputConfigResult> {
  const { projectId, categorySlug, inputKey, config, evidencePacketId } = params;
  const payload = {
    projectId,
    categorySlug,
    typeId: config.typeId,
    inputKey,
    evidencePacketId: evidencePacketId ?? config.evidencePacketId,
    configDigest: {
      projectContext: config.projectContext,
      dataSourceSettings: config.dataSourceSettings,
      validationRules: config.validationRules,
      updatedAt: config.updatedAt,
    },
  };

  const projectLedgerUrl = CARBON_PROJECT_LEDGER(projectId);
  try {
    const ledgerRes = await fetch(projectLedgerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'anchor_dmrv_input', ...payload }),
    });
    if (ledgerRes.ok) {
      const body = (await ledgerRes.json()) as Record<string, unknown>;
      const hash = String(body.hash ?? body.anchoringHash ?? body.contentHash ?? '');
      if (hash) {
        return {
          ok: true,
          anchored: true,
          lastAnchoredHash: hash,
          ledgerRecordId: String(body.ledgerRecordId ?? body.recordId ?? ''),
          anchoredAt: String(body.anchoredAt ?? new Date().toISOString()),
          qrEvidenceUrl: typeof body.qrUrl === 'string' ? body.qrUrl : undefined,
          provider: 'carbon_ledger',
        };
      }
    }
  } catch {
    /* try environmental ledger next */
  }

  try {
    const envRes = await fetch(apiUrl(`${API_ROUTES.ENVIRONMENTAL_INTELLIGENCE_EVIDENCE_PACKETS}/anchor`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (envRes.ok) {
      const body = (await envRes.json()) as Record<string, unknown>;
      const hash = String(body.integrityHash ?? body.hash ?? '');
      if (hash) {
        return {
          ok: true,
          anchored: true,
          lastAnchoredHash: hash,
          ledgerRecordId: String(body.packetId ?? body.ledgerRecordId ?? ''),
          anchoredAt: new Date().toISOString(),
          qrEvidenceUrl: typeof body.qrUrl === 'string' ? body.qrUrl : undefined,
          provider: 'environmental_intelligence',
        };
      }
    }
  } catch {
    /* fall through */
  }

  return {
    ok: false,
    anchored: false,
    adapterReady: true,
    message:
      'Blockchain adapter ready — backend endpoint required. Connect POST /api/carbon/ledger/:projectId or POST /api/environmental-intelligence/evidence-packets/anchor on your API host.',
  };
}
