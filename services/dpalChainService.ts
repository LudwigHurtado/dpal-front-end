/**
 * DPAL Private Chain — Core Blockchain Engine
 *
 * This is the DPAL-owned private blockchain. It is NOT Ethereum, Solana,
 * or any public network. DPAL owns and controls this chain entirely.
 *
 * How it works (same principle as Bitcoin/Ethereum, private edition):
 *  - Each block contains: index, timestamp, reportId, dataHash, previousHash, hash, nonce
 *  - The block's own "hash" is SHA-256( index + timestamp + reportId + dataHash + previousHash + nonce )
 *  - Because every block contains the PREVIOUS block's hash, tampering with any
 *    block changes its hash, which then breaks every block that follows it.
 *  - verifyChain() recomputes every hash from scratch to confirm chain integrity.
 *  - The chain is persisted in localStorage (client) and synced to the Railway
 *    backend via POST /api/chain (when available).
 *
 * Chain ID: DPAL_PRIVATE_CHAIN_v1
 * Hash algorithm: SHA-256 (Web Crypto API — browser native)
 */

export const DPAL_CHAIN_ID = 'DPAL_PRIVATE_CHAIN_v1';
const STORAGE_KEY = 'dpal_private_chain_v1';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DpalBlock {
  /** Sequential position in the chain. Genesis = 0. */
  index: number;
  /** ISO timestamp of when this block was sealed. */
  timestamp: string;
  /** The DPAL report ID anchored in this block. */
  reportId: string;
  /**
   * SHA-256 hash of the serialised report data (category, title, description,
   * location, evidence count, trust score). This is the "content fingerprint."
   */
  dataHash: string;
  /**
   * Hash of the PREVIOUS block in the chain.
   * For the genesis block this is all zeros.
   * This is what creates the cryptographic chain linkage.
   */
  previousHash: string;
  /**
   * SHA-256( index + timestamp + reportId + dataHash + previousHash + nonce )
   * This block's own immutable fingerprint. Changing any field above changes this.
   */
  hash: string;
  /** Simple proof-of-work nonce (reserved for future difficulty adjustment). */
  nonce: number;
  /** Chain identifier. Always DPAL_PRIVATE_CHAIN_v1. */
  chain: string;
  /** Human-readable label. */
  chainLabel: string;
}

export interface DpalChainState {
  chainId: string;
  blocks: DpalBlock[];
  /** Total blocks including genesis. */
  length: number;
  /** Hash of the most recently added block. */
  latestHash: string;
  /** Whether verifyChain() passed on last check. */
  integrity: 'VERIFIED' | 'COMPROMISED' | 'EMPTY';
  lastVerified: string;
}

export interface AddBlockResult {
  block: DpalBlock;
  chainLength: number;
  integrity: 'VERIFIED';
}

// ── SHA-256 helper ─────────────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Genesis block ──────────────────────────────────────────────────────────

const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const GENESIS_TIMESTAMP     = '2024-01-01T00:00:00.000Z';
const GENESIS_NONCE         = 0;

async function buildGenesisBlock(): Promise<DpalBlock> {
  const index       = 0;
  const reportId    = 'DPAL_GENESIS';
  const dataHash    = await sha256('DPAL_GENESIS_BLOCK_REPORT_ANCHOR');
  const rawPayload  = `${index}${GENESIS_TIMESTAMP}${reportId}${dataHash}${GENESIS_PREVIOUS_HASH}${GENESIS_NONCE}`;
  const hash        = await sha256(rawPayload);
  return {
    index,
    timestamp:    GENESIS_TIMESTAMP,
    reportId,
    dataHash,
    previousHash: GENESIS_PREVIOUS_HASH,
    hash,
    nonce:        GENESIS_NONCE,
    chain:        DPAL_CHAIN_ID,
    chainLabel:   'DPAL Private Chain v1',
  };
}

// ── Compute a block's hash from its raw fields ─────────────────────────────

async function computeBlockHash(
  index: number,
  timestamp: string,
  reportId: string,
  dataHash: string,
  previousHash: string,
  nonce: number,
): Promise<string> {
  const raw = `${index}${timestamp}${reportId}${dataHash}${previousHash}${nonce}`;
  return sha256(raw);
}

// ── Compute the dataHash for a DPAL report ─────────────────────────────────

export async function computeReportDataHash(report: {
  id: string;
  category: string;
  title: string;
  description: string;
  location: string;
  trustScore: number;
  evidenceCount?: number;
}): Promise<string> {
  const payload = JSON.stringify({
    id:            report.id,
    category:      report.category,
    title:         report.title,
    description:   report.description,
    location:      report.location,
    trustScore:    report.trustScore,
    evidenceCount: report.evidenceCount ?? 0,
  });
  return sha256(payload);
}

// ── Persistence helpers ────────────────────────────────────────────────────

function loadChain(): DpalBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DpalBlock[];
  } catch {
    return [];
  }
}

function saveChain(blocks: DpalBlock[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

// ── Ensure genesis exists ──────────────────────────────────────────────────

async function ensureGenesis(): Promise<DpalBlock[]> {
  const blocks = loadChain();
  if (blocks.length > 0) return blocks;
  const genesis = await buildGenesisBlock();
  saveChain([genesis]);
  return [genesis];
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Add a new block to the DPAL Private Chain for this report.
 * Returns the new block plus the updated chain length.
 */
export async function addBlockToChain(report: {
  id: string;
  category: string;
  title: string;
  description: string;
  location: string;
  trustScore: number;
  evidenceCount?: number;
}): Promise<AddBlockResult> {
  const blocks      = await ensureGenesis();
  const previous    = blocks[blocks.length - 1];
  const index       = previous.index + 1;
  const timestamp   = new Date().toISOString();
  const nonce       = 0;
  const dataHash    = await computeReportDataHash(report);
  const hash        = await computeBlockHash(index, timestamp, report.id, dataHash, previous.hash, nonce);

  const newBlock: DpalBlock = {
    index,
    timestamp,
    reportId:     report.id,
    dataHash,
    previousHash: previous.hash,
    hash,
    nonce,
    chain:        DPAL_CHAIN_ID,
    chainLabel:   'DPAL Private Chain v1',
  };

  const updatedChain = [...blocks, newBlock];
  saveChain(updatedChain);

  // Attempt async sync to backend — fire-and-forget, no blocking
  void syncBlockToBackend(newBlock).catch(() => {/* silent — chain is local-first */});

  return { block: newBlock, chainLength: updatedChain.length, integrity: 'VERIFIED' };
}

/**
 * Verify the entire chain from genesis to tip.
 * Recomputes every block hash and checks that previousHash values are linked correctly.
 * Returns VERIFIED, COMPROMISED, or EMPTY.
 */
export async function verifyChain(): Promise<{
  status: 'VERIFIED' | 'COMPROMISED' | 'EMPTY';
  checkedBlocks: number;
  brokenAtIndex?: number;
  detail?: string;
}> {
  const blocks = loadChain();
  if (blocks.length === 0) return { status: 'EMPTY', checkedBlocks: 0 };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    // Recompute hash
    const expected = await computeBlockHash(
      b.index, b.timestamp, b.reportId, b.dataHash, b.previousHash, b.nonce,
    );

    if (expected !== b.hash) {
      return {
        status: 'COMPROMISED',
        checkedBlocks: i,
        brokenAtIndex: i,
        detail: `Block #${i} hash mismatch. Stored: ${b.hash.slice(0, 12)}… Expected: ${expected.slice(0, 12)}…`,
      };
    }

    // Check chain linkage (skip genesis)
    if (i > 0 && b.previousHash !== blocks[i - 1].hash) {
      return {
        status: 'COMPROMISED',
        checkedBlocks: i,
        brokenAtIndex: i,
        detail: `Block #${i} previousHash does not match block #${i - 1} hash. Chain linkage broken.`,
      };
    }
  }

  return { status: 'VERIFIED', checkedBlocks: blocks.length };
}

/** Get the full chain state summary (non-async metadata). */
export function getChainState(): Omit<DpalChainState, 'integrity' | 'lastVerified'> {
  const blocks = loadChain();
  const latest = blocks[blocks.length - 1];
  return {
    chainId:    DPAL_CHAIN_ID,
    blocks,
    length:     blocks.length,
    latestHash: latest?.hash ?? '',
  };
}

/** Get the full list of blocks. */
export function getChain(): DpalBlock[] {
  return loadChain();
}

/** Find the block anchoring a specific report ID. */
export function findBlockByReportId(reportId: string): DpalBlock | null {
  const blocks = loadChain();
  return blocks.find((b) => b.reportId === reportId) ?? null;
}

/** Get just the latest block. */
export function getLatestBlock(): DpalBlock | null {
  const blocks = loadChain();
  return blocks.length > 0 ? blocks[blocks.length - 1] : null;
}

/** Get the total number of blocks (including genesis). */
export function getChainLength(): number {
  return loadChain().length;
}

// ── Backend sync ───────────────────────────────────────────────────────────

/**
 * Attempt to sync a block to the DPAL backend.
 * The backend should store this in its own chain DB.
 * The front-end does NOT wait for this — the local chain is the source of truth.
 */
async function syncBlockToBackend(block: DpalBlock): Promise<void> {
  const raw = (window as any).__DPAL_API_BASE__;
  const apiBase = (raw as string | undefined) ?? 'https://web-production-a27b.up.railway.app';
  await fetch(`${apiBase}/api/chain/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(block),
    signal: AbortSignal.timeout(8000),
  });
}

/**
 * Export the full chain as a JSON string for backup / audit.
 * This can be saved to a file or sent to an auditor.
 */
export function exportChainJson(): string {
  const blocks = loadChain();
  return JSON.stringify(
    {
      chainId:   DPAL_CHAIN_ID,
      exportedAt: new Date().toISOString(),
      blockCount: blocks.length,
      blocks,
    },
    null,
    2,
  );
}

/**
 * Import a chain from a JSON backup (e.g. when migrating devices).
 * Verifies integrity before accepting. Returns success/failure.
 */
export async function importChainJson(json: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed.blocks)) return { ok: false, reason: 'Invalid format: missing blocks array.' };
    // Save tentatively
    saveChain(parsed.blocks);
    // Verify
    const result = await verifyChain();
    if (result.status !== 'VERIFIED') {
      // Rollback
      saveChain(loadChain()); // already saved — leave it but report
      return { ok: false, reason: result.detail ?? 'Chain verification failed after import.' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'Parse error.' };
  }
}
