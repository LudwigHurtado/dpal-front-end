/**
 * Situation Room path / QR contract checks — run: npx tsx src/features/situationRoom/situationRoomPaths.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildCanonicalSituationRoomUrl,
  parseSituationRoomIdFromPath,
  parseSituationRoomModeFromSearch,
  situationRoomPath,
} from '../../../utils/situationRoomPaths';

assert.equal(parseSituationRoomIdFromPath('/situation-room/rep-abc123'), 'rep-abc123');
assert.equal(parseSituationRoomIdFromPath('/'), null);
assert.equal(parseSituationRoomIdFromPath('/incident'), null);
assert.equal(situationRoomPath('room-1'), '/situation-room/room-1');
assert.equal(situationRoomPath('room-1', 'public'), '/situation-room/room-1?mode=public');

const url = buildCanonicalSituationRoomUrl('test-room');
assert.ok(url.includes('/situation-room/test-room'), `QR URL must include room path, got ${url}`);
assert.ok(!url.endsWith('/'), 'QR URL must not be bare home');

assert.equal(parseSituationRoomModeFromSearch('?mode=validator'), 'validator');
assert.equal(parseSituationRoomModeFromSearch('?mode=public'), 'public');
assert.equal(parseSituationRoomModeFromSearch(''), 'default');

console.log('situationRoomPaths.selftest: OK');
