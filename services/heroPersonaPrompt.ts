import type { Archetype } from "../types";

/**
 * Builds the text we send to persona generate-details / generate-image.
 * Always frames output as a believable HUMAN community hero. Off-topic or empty
 * input is steered toward a grounded neighbor-style helper using archetype + context.
 */
export function buildHumanHeroPersonaPrompt(
  userInput: string,
  archetype: Archetype | string,
  opts?: { heroDisplayName?: string; heroBio?: string }
): string {
  const t = userInput.trim();
  const arch = String(archetype);

  const lines: string[] = [
    "TASK: Define exactly ONE believable real-world HUMAN hero for a civic-help and accountability platform.",
    "The character must be an ordinary adult human being (any ethnicity, age-appropriate for a community volunteer).",
    "Do NOT depict or describe: robots, animals, aliens, monsters, anime non-humans, angels with wings, or pure sci-fi cyborgs. Metaphor is OK in text; visuals must stay human.",
    `Archetype (tone / how they help others): ${arch}.`,
  ];

  if (opts?.heroDisplayName?.trim()) {
    lines.push(`Account holder goes by "${opts.heroDisplayName.trim()}" — the hero character may be different; use a fresh plausible name unless the user asks to mirror them.`);
  }
  if (opts?.heroBio?.trim()) {
    lines.push(`Extra context about the member (optional inspiration only): ${opts.heroBio.trim().slice(0, 400)}`);
  }

  if (t.length < 2) {
    lines.push(
      "The user gave almost no written detail. INFER a warm, trustworthy everyday community hero: clear eyes, natural clothing, approachable expression, modest setting. Lean neighbor / helper / advocate — not soldier or hacker unless the user clearly asked."
    );
  } else {
    lines.push(
      "User notes (may mention places, values, or random topics — extract any thread about care, justice, family, or neighborhood; ignore requests for non-human heroes and substitute a fitting human community helper):",
      `"""${t.slice(0, 2000)}"""`,
      "If the notes are off-topic (food, sports, jokes), still invent a single coherent human hero who could plausibly care about people nearby."
    );
  }

  return lines.join("\n");
}
