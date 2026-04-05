import { apiUrl, API_ROUTES } from "../constants";
import type { Category, NftTheme } from "../types";

export type NftMintRequestBody = {
  userId: string;
  prompt: string;
  theme: NftTheme | string;
  category: Category | string;
  priceCredits: number;
  idempotencyKey: string;
  nonce: string;
  timestamp: number;
  traits: Array<{ trait_type: string; value?: string }>;
  /** Mongo id from POST /api/hero-personas — links ledger mint to saved persona */
  savedPersonaId?: string;
};

export type NftMintReceipt = {
  ok?: boolean;
  tokenId: string;
  imageUrl: string;
  txHash: string;
  priceCredits?: number;
  mintedAt?: string;
  duplicate?: boolean;
  savedPersonaId?: string;
};

/**
 * Shared NFT mint call (same contract/server logic as Forge / NftMintingStation).
 */
export async function mintNftRequest(body: NftMintRequestBody, signal?: AbortSignal): Promise<NftMintReceipt> {
  let response: Response;
  try {
    response = await fetch("/api/nft/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    response = await fetch(apiUrl(API_ROUTES.NFT_MINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  }

  if (!response.ok) {
    let err: any = {};
    try {
      err = JSON.parse(await response.text());
    } catch {
      err = { message: `HTTP ${response.status}` };
    }
    const e = new Error(err.message || err.error || `HTTP ${response.status}`);
    (e as any).status = response.status;
    (e as any).errorCode = err.error;
    (e as any).details = err;
    throw e;
  }

  return response.json();
}
