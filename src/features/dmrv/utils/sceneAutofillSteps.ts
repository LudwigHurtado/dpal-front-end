const STEP_DELAY_MS = 480;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function coerceFieldValue(value: unknown): string | boolean | null {
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export async function runSceneSteppedAutofill(
  parsed: Record<string, unknown>,
  typeTitle: string,
  applyField: (key: string, value: string | boolean) => void,
  setStatus: (message: string) => void,
): Promise<void> {
  const steps: { keys: string[]; message: string }[] = [
    { keys: ['provider'], message: 'Selecting recommended provider…' },
    { keys: ['collection'], message: `Choosing product for ${typeTitle}…` },
    { keys: ['cloudCoverLimit'], message: 'Applying cloud threshold…' },
    { keys: ['resolution', 'minimumCoveragePct'], message: 'Setting resolution and coverage rules…' },
    { keys: ['startDate', 'endDate'], message: 'Setting monitoring date window…' },
    { keys: ['refreshFrequency'], message: 'Setting refresh cadence…' },
    { keys: ['aoiRequired'], message: 'Requiring AOI for evidence integrity…' },
  ];

  for (const step of steps) {
    const entries = step.keys
      .map((key) => ({ key, value: coerceFieldValue(parsed[key]) }))
      .filter((entry): entry is { key: string; value: string | boolean } => entry.value !== null);

    if (entries.length === 0) continue;

    setStatus(step.message);
    for (const { key, value } of entries) {
      applyField(key, value);
    }
    await delay(STEP_DELAY_MS);
  }

  setStatus('Scene configuration ready');
}
