import React, { useRef, useState } from "react";
import { Archetype, type Hero } from "../types";
import { Loader, User, Camera, X, Sparkles } from "./icons";

const ARCHETYPES: Array<{
  type: Archetype;
  label: string;
  hint: string;
}> = [
  { type: Archetype.Analyst, label: "Thoughtful", hint: "Clear and careful" },
  { type: Archetype.Shepherd, label: "Caring", hint: "Brings people together" },
  { type: Archetype.Seeker, label: "Truth-seeker", hint: "Asks good questions" },
  { type: Archetype.Sentinel, label: "Watchful", hint: "Stands up for neighbors" },
  { type: Archetype.Firefighter, label: "Responder", hint: "Shows up when it counts" },
  { type: Archetype.Seraph, label: "Uplifting", hint: "Warmth & protection (human)" },
  { type: Archetype.Guide, label: "Guide", hint: "Helps others find the way" },
];

interface HeroPersonaMintStationProps {
  hero: Hero;
  onAddHeroPersona: (description: string, archetype: Archetype, sourceImage?: string) => Promise<void>;
}

/**
 * Mint tab: human hero personas only. No NFT themes, categories, or non-persona flows.
 */
const HeroPersonaMintStation: React.FC<HeroPersonaMintStationProps> = ({ hero, onAddHeroPersona }) => {
  const [archetype, setArchetype] = useState<Archetype>(Archetype.Sentinel);
  const [notes, setNotes] = useState("");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const count = hero.personas?.length ?? 0;

  const handleMint = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onAddHeroPersona(notes, archetype, sourceImage || undefined);
      setNotes("");
      setSourceImage(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-24 font-sans">
      <div className="rounded-3xl border border-amber-900/40 bg-gradient-to-b from-stone-900 to-stone-950 p-8 shadow-xl md:p-10">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-2xl border border-amber-700/40 bg-amber-950/40 p-3">
            <Sparkles className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-50">Mint a human hero</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              This space is only for creating a <strong className="text-stone-200">human</strong> hero portrait and story.
              Write a little about them—or leave it brief. If your notes are vague or off-topic, we still build a
              neighbor-style hero from your tone and the role you pick.
            </p>
          </div>
        </div>

        <>
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">How they show up</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.type}
                    type="button"
                    onClick={() => setArchetype(a.type)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      archetype === a.type
                        ? "border-amber-500 bg-amber-500/15 text-amber-50"
                        : "border-stone-700 bg-stone-900/80 text-stone-400 hover:border-stone-600"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{a.label}</span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">{a.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                Describe your hero (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="e.g. A parent who checks on elders after storms, soft-spoken but steady…"
                className="w-full rounded-2xl border border-stone-700 bg-stone-950/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-600 outline-none focus:border-amber-600/50 focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Not about a person? We’ll still shape a human community helper from what you give us.
              </p>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Reference photo (optional)</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                className="relative flex aspect-video max-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-700 bg-stone-900/50 transition-colors hover:border-amber-700/50"
              >
                {sourceImage ? (
                  <>
                    <img src={sourceImage} alt="" className="absolute inset-0 h-full w-full rounded-2xl object-cover opacity-90" />
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-full border border-stone-600 bg-black/70 p-2 text-stone-300 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceImage(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="mb-2 h-10 w-10 text-stone-600" />
                    <span className="text-sm font-medium text-stone-500">Tap to add a face reference</span>
                    <span className="mt-1 text-center text-[11px] text-stone-600">Helps keep the portrait human; still AI-generated.</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleMint}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-900 bg-amber-500 py-4 text-base font-semibold text-stone-900 shadow-lg transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
            >
              {busy ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Creating your human hero…
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  Create human hero
                </>
              )}
            </button>

            <p className="mt-4 text-center text-[11px] text-stone-600">
              {count} {count === 1 ? "hero" : "heroes"} · Appears on your profile when ready
            </p>
        </>
      </div>

      <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6 text-sm text-stone-500">
        <p className="font-semibold text-stone-400">What this is not</p>
        <p className="mt-2">
          This tab does not mint report NFTs, random artwork, or non-human characters. For on-chain mint of an existing
          hero card, open that hero from your profile.
        </p>
      </div>
    </div>
  );
};

export default HeroPersonaMintStation;
