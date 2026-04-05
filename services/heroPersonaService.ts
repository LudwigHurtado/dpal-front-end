import { apiUrl, API_ROUTES } from "../constants";
import type { HeroPersona } from "../types";

export type SavedPersonaRow = {
  id: string;
  userId: string;
  clientPersonaId: string;
  walletAddress: string;
  name: string;
  backstory: string;
  combatStyle: string;
  imageUrl: string;
  prompt: string;
  archetype: string;
  isMinted: boolean;
  tokenId: string;
  metadataUri: string;
  mintedAt: string | null;
  updatedAt: string | null;
};

export async function saveHeroPersonaToServer(params: {
  userId: string;
  walletAddress?: string;
  persona: HeroPersona;
}): Promise<{ id: string }> {
  const res = await fetch(apiUrl(API_ROUTES.HERO_PERSONAS), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: params.userId,
      walletAddress: params.walletAddress,
      persona: params.persona,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Save failed (${res.status})`);
  }
  const data = await res.json();
  if (!data?.ok || !data.id) throw new Error("Invalid save response");
  return { id: data.id as string };
}

export async function fetchSavedHeroPersonas(userId: string): Promise<SavedPersonaRow[]> {
  const url = `${apiUrl(API_ROUTES.HERO_PERSONAS)}?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data?.ok || !Array.isArray(data.items)) return [];
  return data.items as SavedPersonaRow[];
}
