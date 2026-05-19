/**
 * Backend Situation Room persistence smoke — run: npx tsx src/services/situationRoomPersistence.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildCanonicalRoomPath,
  buildCanonicalRoomUrl,
  computeCmiAlignment,
  hashEvidence,
} from './situationRoomPersistence';

assert.equal(buildCanonicalRoomPath('abc'), '/situation-room/abc');
const url = buildCanonicalRoomUrl('abc');
assert.ok(url.includes('/situation-room/abc'));

const alignment = computeCmiAlignment(
  {
    id: '1',
    roomId: 'abc',
    sourceType: 'manual',
    title: 'Test',
    status: 'ACTIVE',
    publicVisibility: 'private',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    integrityHash: hashEvidence({ x: 1 }),
  },
  { validatorIdentity: 'V', conflictOfInterestDisclosure: 'none' } as never,
);
assert.equal((alignment.transactionIntegrity as { ok?: boolean }).ok, true);

console.log('situationRoomPersistence.selftest: OK');
