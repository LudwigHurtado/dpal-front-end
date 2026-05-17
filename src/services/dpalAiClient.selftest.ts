/**
 * Pure env parsing assertions (run: npx tsx src/services/dpalAiClient.selftest.ts).
 */
import assert from 'node:assert/strict';

function parseUseServerAi(raw: unknown): boolean {
  return String(raw ?? '').toLowerCase() === 'true';
}

function normalizeApiBase(raw: unknown): string {
  return String(raw ?? '').trim().replace(/\/+$/, '');
}

assert.equal(parseUseServerAi('true'), true);
assert.equal(parseUseServerAi('True'), true);
assert.equal(parseUseServerAi(true), true);
assert.equal(parseUseServerAi('false'), false);
assert.equal(parseUseServerAi(undefined), false);
assert.equal(parseUseServerAi(''), false);

assert.equal(normalizeApiBase('https://example.com/'), 'https://example.com');
assert.equal(normalizeApiBase('https://example.com///'), 'https://example.com');

console.log('dpalAiClient.selftest: all passed');
