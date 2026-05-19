/**
 * CMI-aligned Situation Room extensions — seal, validator review, evidence export, public view.
 */
import { Router, type Request, type Response } from 'express';
import {
  buildCanonicalRoomUrl,
  computeCmiAlignment,
  getMessages,
  getRoomById,
  getValidatorReview,
  hashEvidence,
  sealRoom,
  upsertRoom,
  upsertValidatorReview,
  type SituationRoomDto,
} from '../services/situationRoomPersistence';
import { SituationRoomStatus, SituationValidatorReviewStatus } from '@prisma/client';

const router = Router();

function roomIsReadOnly(status: SituationRoomStatus): boolean {
  return status === SituationRoomStatus.SEALED || status === SituationRoomStatus.ARCHIVED;
}

router.patch('/rooms/:roomId', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    const existing = await getRoomById(roomId);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    if (roomIsReadOnly(existing.status)) {
      res.status(403).json({ ok: false, error: 'Room is sealed or archived and cannot be edited' });
      return;
    }
    const body = req.body ?? {};
    const updated = await upsertRoom({
      ...existing,
      ...body,
      roomId,
      status: body.status ? (String(body.status).toUpperCase() as SituationRoomStatus) : existing.status,
      cadTrustMetadata: body.cadTrustMetadata ?? existing.cadTrustMetadata,
    });
    const review = await getValidatorReview(roomId);
    const finalRoom = await upsertRoom({
      roomId,
      cmiAlignment: computeCmiAlignment(updated, review),
    });
    res.json({ ok: true, room: finalRoom });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.post('/rooms/:roomId/seal', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    const actorUserId = req.body?.actorUserId ? String(req.body.actorUserId) : undefined;
    const room = await sealRoom(roomId, actorUserId);
    res.json({ ok: true, room });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Seal failed';
    res.status(msg.includes('not found') ? 404 : 500).json({ ok: false, error: msg });
  }
});

router.get('/rooms/:roomId/validator-review', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const review = await getValidatorReview(roomId);
  res.json({ ok: true, review });
});

router.put('/rooms/:roomId/validator-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = String(req.params.roomId || '').trim();
    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found' });
      return;
    }
    if (roomIsReadOnly(room.status)) {
      res.status(403).json({ ok: false, error: 'Room is sealed or archived' });
      return;
    }
    const body = req.body ?? {};
    const review = await upsertValidatorReview(roomId, {
      validatorIdentity: body.validatorIdentity,
      organization: body.organization,
      accreditation: body.accreditation,
      conflictOfInterestDisclosure: body.conflictOfInterestDisclosure,
      filesReviewed: body.filesReviewed,
      questions: body.questions,
      findings: body.findings,
      deficiencies: body.deficiencies,
      reviewStatus: body.reviewStatus as SituationValidatorReviewStatus,
      finalNote: body.finalNote,
      attestationSignature: body.attestationSignature,
    });
    const cmiAlignment = computeCmiAlignment(room, review);
    await upsertRoom({ roomId, cmiAlignment });
    res.json({ ok: true, review, cmiAlignment });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Validator review save failed' });
  }
});

router.get('/rooms/:roomId/public', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const room = await getRoomById(roomId);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Room not found' });
    return;
  }
  const messages = await getMessages(roomId, { includeValidator: false });
  res.json({
    ok: true,
    room: {
      roomId: room.roomId,
      title: room.title,
      status: room.status,
      canonicalUrl: room.canonicalUrl,
      integrityHash: room.integrityHash,
      blockchainAnchorId: room.blockchainAnchorId,
      reportingPeriodStart: room.reportingPeriodStart,
      reportingPeriodEnd: room.reportingPeriodEnd,
      publicVisibility: room.publicVisibility,
    },
    messages: messages.filter((m) => !m.deletedAt && m.messageType !== 'VALIDATOR'),
    disclaimer:
      'Public view — validator-only notes and private coordination messages are not shown. DPAL is not a carbon registry.',
  });
});

router.get('/rooms/:roomId/evidence-export', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const room = await getRoomById(roomId);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Room not found' });
    return;
  }
  const [allMessages, validatorMessages, review] = await Promise.all([
    getMessages(roomId, { includeValidator: true }),
    getMessages(roomId, { includeValidator: true }),
    getValidatorReview(roomId),
  ]);
  const situationTranscript = allMessages.filter((m) => m.messageType !== 'VALIDATOR' && !m.deletedAt);
  const validatorTranscript = validatorMessages.filter((m) => m.messageType === 'VALIDATOR' && !m.deletedAt);
  const cmiAlignment = (room.cmiAlignment as Record<string, unknown>) ?? computeCmiAlignment(room, review);

  const packet = {
    cover: {
      title: room.title,
      roomId: room.roomId,
      projectId: room.projectId,
      status: room.status,
      generatedAt: new Date().toISOString(),
      canonicalUrl: room.canonicalUrl ?? buildCanonicalRoomUrl(roomId),
      qrUrl: room.qrUrl ?? buildCanonicalRoomUrl(roomId),
    },
    projectSummary: {
      reportId: room.reportId,
      category: room.category,
      methodologyId: room.methodologyId,
      reportingPeriodStart: room.reportingPeriodStart,
      reportingPeriodEnd: room.reportingPeriodEnd,
      aoiId: room.aoiId,
      location: room.location,
    },
    evidenceIndex: {
      evidencePacketId: room.evidencePacketId,
      evidencePacket: room.evidencePacket,
      attachmentsNote: 'See appendix JSON for raw structures when available.',
    },
    situationRoomTranscript: situationTranscript,
    validatorRoomTranscript: validatorTranscript,
    validatorReview: review,
    methodologyMapping: {
      methodologyId: room.methodologyId,
      linkedSteps: situationTranscript
        .filter((m) => m.linkedMethodologyStepId)
        .map((m) => ({ messageId: m.id, stepId: m.linkedMethodologyStepId })),
    },
    integrityManifest: {
      integrityHash: room.integrityHash ?? hashEvidence({ room, messages: allMessages }),
      messageHashes: allMessages.map((m) => ({
        id: m.id,
        contentHash: m.contentHash,
        previousMessageHash: m.previousMessageHash,
      })),
    },
    blockchainAnchor: {
      blockchainAnchorId: room.blockchainAnchorId,
      ledger: room.ledger,
      status: room.blockchainAnchorId ? 'anchored' : 'not_anchored',
    },
    cmiAlignment,
    cadTrustMetadata: room.cadTrustMetadata ?? {},
    appendix: {
      rawRoomJson: room,
      rawMessagesCsv: allMessages.map((m) => ({
        id: m.id,
        at: m.createdAt,
        type: m.messageType,
        author: m.authorName,
        body: m.body,
      })),
    },
    legalDisclaimer:
      'DPAL stores supporting MRV/evidence documentation. Registry-level data may be mapped to CAD Trust-compatible metadata where applicable. This packet does not constitute registry issuance.',
  };

  res.json({ ok: true, evidencePacket: packet });
});

export default router;
