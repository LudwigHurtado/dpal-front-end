import React, { useEffect, useMemo, useState } from 'react';
import type { AquaScanEvidenceReport } from '../../types/aquascanReport';
import { getAquaScanEvidenceReportByRoomId } from '../../services/aquascanReportService';
import { parseAquaScanSituationRoomIdFromPath } from '../../utils/appRoutes';
import SituationRoomShell from '../situation-room/SituationRoomShell';

interface AquaScanSituationRoomProps {
  roomId?: string | null;
  onBack: () => void;
}

export default function AquaScanSituationRoom({
  roomId,
  onBack,
}: AquaScanSituationRoomProps): React.ReactElement {
  // Compatibility route wrapper: AquaScan uses the shared SituationRoomShell engine.
  const resolvedRoomId = useMemo(() => roomId ?? parseAquaScanSituationRoomIdFromPath(window.location.pathname), [roomId]);
  const [report, setReport] = useState<AquaScanEvidenceReport | null>(null);

  useEffect(() => {
    if (!resolvedRoomId) {
      setReport(null);
      return;
    }
    setReport(getAquaScanEvidenceReportByRoomId(resolvedRoomId));
  }, [resolvedRoomId]);

  if (!report || !resolvedRoomId) {
    return (
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          Back
        </button>
        <h1 className="mt-4 text-2xl font-black text-white">Situation room not found</h1>
        <p className="mt-2 text-sm text-slate-400">No AquaScan report is currently linked to this room ID.</p>
      </div>
    );
  }

  return (
    <SituationRoomShell
      sourceType="aqua_scan"
      roomId={report.situationRoom.roomId}
      reportId={report.reportId}
      projectId={report.projectId}
      title={report.projectName || report.reportId}
      category="AquaScan"
      evidencePacket={report.evidencePacket}
      aiSummary={report.aiIntelligence}
      location={
        report.aquaScanResult?.centerPoint
          ? {
              label: report.aquaScanResult.aoiName || report.projectName,
              lat: report.aquaScanResult.centerPoint.lat,
              lng: report.aquaScanResult.centerPoint.lng,
            }
          : undefined
      }
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
      onBack={onBack}
    />
  );
}
