import type { WaterEvidencePacket } from './waterIntelligenceTypes';
import { COLORADO_MOCK_EVIDENCE_PACKETS, COLORADO_MOCK_PROJECTS } from './coloradoRiverMockData';

export function listEvidencePackets(): WaterEvidencePacket[] {
  return COLORADO_MOCK_EVIDENCE_PACKETS;
}

export function getEvidencePacket(id: string): WaterEvidencePacket | undefined {
  return COLORADO_MOCK_EVIDENCE_PACKETS.find((e) => e.id === id);
}

export function buildPlaceholderPacket(projectId: string): WaterEvidencePacket | null {
  const p = COLORADO_MOCK_PROJECTS.find((x) => x.id === projectId);
  if (!p) return null;
  const existing = COLORADO_MOCK_EVIDENCE_PACKETS.find((e) => e.projectId === projectId);
  if (existing) return { ...existing, evidenceHashPlaceholder: `regen-${Date.now()}-demo` };
  return null;
}
