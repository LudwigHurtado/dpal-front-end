import React, { useMemo } from 'react';
import { getCarbReportByRoomId } from '../../services/carbReportService';
import { parseCarbSituationRoomIdFromPath } from '../../utils/appRoutes';
import SituationRoomShell from '../situation-room/SituationRoomShell';

interface CarbSituationRoomProps {
  roomId?: string | null;
  onReturn: () => void;
  embedded?: boolean;
}

export default function CarbSituationRoom({ roomId, onReturn, embedded = false }: CarbSituationRoomProps): React.ReactElement {
  // Compatibility route wrapper: CARB uses the shared SituationRoomShell engine.
  const resolvedRoomId = useMemo(() => roomId ?? parseCarbSituationRoomIdFromPath(window.location.pathname), [roomId]);
  const report = useMemo(
    () => (resolvedRoomId ? getCarbReportByRoomId(resolvedRoomId) : null),
    [resolvedRoomId],
  );

  if (!report || !resolvedRoomId) {
    return (
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        {!embedded ? (
          <button type="button" onClick={onReturn} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
            Back
          </button>
        ) : null}
        <h1 className="mt-4 text-2xl font-black text-white">CARB Situation Room not found</h1>
      </div>
    );
  }

  return (
    <SituationRoomShell
      sourceType="carb_audit"
      roomId={report.situationRoom.roomId}
      reportId={report.reportId}
      projectId={report.auditId}
      title={report.facilityIdentity.facilityName}
      category="CARB Emissions Audit"
      evidencePacket={{
        dataSources: report.dataSources,
        findings: report.investigationFindings,
        emissionsComparison: report.emissionsComparison,
      }}
      aiSummary={{ narrative: report.aiNarrative }}
      location={{
        label: report.location.coordinatesLabel || report.facilityIdentity.facilityName,
        lat: report.location.latitude ?? undefined,
        lng: report.location.longitude ?? undefined,
        address: [report.location.city, report.location.county, report.location.state].filter(Boolean).join(', ') || undefined,
      }}
      ledger={{
        verificationStatus:
          report.ledger.verificationStatus === 'logged'
            ? 'verified'
            : report.ledger.verificationStatus,
        hash: report.ledger.currentHash,
        chain: report.ledger.chainName,
        blockNumber: report.ledger.blockId,
        transactionId: report.ledger.transactionId,
        timestamp: report.ledger.blockTimestamp,
      }}
      onBack={onReturn}
    />
  );
}
