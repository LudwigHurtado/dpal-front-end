const DEFAULT_PROVIDER_MODELS = {
  gemini: 'gemini-1.5-pro',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-latest',
};

const PROVIDER_LABELS = {
  gemini: 'Gemini',
  openai: 'ChatGPT / OpenAI',
  anthropic: 'Claude / Anthropic',
};

const MAX_USER_PROMPT_CHARS = 8000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, body) {
  setCors(res);
  res.status(status).json(body);
}

function safeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeProviders(providers) {
  const raw = Array.isArray(providers) && providers.length ? providers : ['gemini'];
  return [...new Set(raw.map((p) => String(p).toLowerCase().trim()))].filter((p) =>
    Object.prototype.hasOwnProperty.call(PROVIDER_LABELS, p),
  );
}

function getAvailability() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

function providerModel(provider) {
  if (provider === 'gemini') return process.env.GEMINI_MODEL || DEFAULT_PROVIDER_MODELS.gemini;
  if (provider === 'openai') return process.env.OPENAI_MODEL || DEFAULT_PROVIDER_MODELS.openai;
  if (provider === 'anthropic') return process.env.ANTHROPIC_MODEL || DEFAULT_PROVIDER_MODELS.anthropic;
  return 'unknown';
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildSystemPrompt() {
  return [
    'You are a DPAL MRV validator assistant.',
    'Your job is to analyze MRV evidence readiness, not to certify credits or make regulatory approvals.',
    'Return strict JSON only.',
    'Do not expose private hidden chain-of-thought. Instead provide a concise validatorReasoningSummary that explains the audit rationale in reviewable form.',
    'Be honest about missing data, assumptions, source limits, uncertainty, and what a human validator must verify.',
  ].join(' ');
}

function buildUserPrompt(payload) {
  const context = payload?.context && typeof payload.context === 'object' ? payload.context : {};
  const text = [
    `MRV type: ${safeText(payload?.mrvTypeTitle, 'Unknown MRV type')}`,
    `MRV type id: ${safeText(payload?.mrvTypeId, 'unknown')}`,
    `Project id: ${safeText(payload?.projectId, 'not provided')}`,
    `Validator question: ${safeText(payload?.prompt, 'Review the MRV readiness and risks.')}`,
    '',
    'Context JSON:',
    JSON.stringify(context, null, 2),
    '',
    'Return this JSON shape:',
    JSON.stringify(
      {
        summary: 'plain-language MRV answer',
        validatorReasoningSummary: 'reviewable rationale summary for validators; no hidden chain-of-thought',
        evidenceReadiness: 'Ready | Partially ready | Not ready',
        missingEvidence: ['specific missing evidence item'],
        riskFlags: ['specific MRV / data / legal risk'],
        recommendedNextSteps: ['concrete next step'],
        validatorQuestions: ['question a validator should ask'],
        confidence: 0.0,
      },
      null,
      2,
    ),
  ].join('\n');

  return text.slice(0, MAX_USER_PROMPT_CHARS);
}

function parseJsonish(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

function normalizeProviderPayload(provider, model, parsed, rawText, startedAt, finishedAt) {
  const fallbackSummary = rawText || 'No model text was returned.';
  return {
    provider,
    label: PROVIDER_LABELS[provider],
    model,
    status: 'ok',
    startedAt,
    finishedAt,
    latencyMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    summary: safeText(parsed?.summary, fallbackSummary),
    validatorReasoningSummary: safeText(
      parsed?.validatorReasoningSummary,
      'The model did not return a separate validator rationale summary.',
    ),
    evidenceReadiness: safeText(parsed?.evidenceReadiness, 'Partially ready'),
    missingEvidence: Array.isArray(parsed?.missingEvidence) ? parsed.missingEvidence.map(String) : [],
    riskFlags: Array.isArray(parsed?.riskFlags) ? parsed.riskFlags.map(String) : [],
    recommendedNextSteps: Array.isArray(parsed?.recommendedNextSteps) ? parsed.recommendedNextSteps.map(String) : [],
    validatorQuestions: Array.isArray(parsed?.validatorQuestions) ? parsed.validatorQuestions.map(String) : [],
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : null,
    rawText,
  };
}

function providerError(provider, model, message, startedAt) {
  const finishedAt = new Date().toISOString();
  return {
    provider,
    label: PROVIDER_LABELS[provider],
    model,
    status: 'error',
    startedAt,
    finishedAt,
    latencyMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    error: message,
    summary: `${PROVIDER_LABELS[provider]} could not complete this MRV review.`,
    validatorReasoningSummary: 'No validator rationale was stored because the provider call failed.',
    evidenceReadiness: 'Not ready',
    missingEvidence: [],
    riskFlags: ['AI provider unavailable or misconfigured'],
    recommendedNextSteps: ['Check provider API key, model name, and server logs.'],
    validatorQuestions: [],
    confidence: null,
    rawText: '',
  };
}

async function callGemini(systemPrompt, userPrompt) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = providerModel('gemini');
  const startedAt = new Date().toISOString();
  if (!key) return providerError('gemini', model, 'Missing GEMINI_API_KEY or GOOGLE_API_KEY.', startedAt);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || `Gemini HTTP ${response.status}`);
    const rawText = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim() || '';
    const parsed = parseJsonish(rawText);
    return normalizeProviderPayload('gemini', model, parsed, rawText, startedAt, new Date().toISOString());
  } catch (error) {
    return providerError('gemini', model, error?.message || 'Unknown Gemini error.', startedAt);
  }
}

async function callOpenAi(systemPrompt, userPrompt) {
  const key = process.env.OPENAI_API_KEY;
  const model = providerModel('openai');
  const startedAt = new Date().toISOString();
  if (!key) return providerError('openai', model, 'Missing OPENAI_API_KEY.', startedAt);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || `OpenAI HTTP ${response.status}`);
    const rawText = body?.choices?.[0]?.message?.content?.trim() || '';
    const parsed = parseJsonish(rawText);
    return normalizeProviderPayload('openai', model, parsed, rawText, startedAt, new Date().toISOString());
  } catch (error) {
    return providerError('openai', model, error?.message || 'Unknown OpenAI error.', startedAt);
  }
}

async function callAnthropic(systemPrompt, userPrompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = providerModel('anthropic');
  const startedAt = new Date().toISOString();
  if (!key) return providerError('anthropic', model, 'Missing ANTHROPIC_API_KEY.', startedAt);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1600,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || `Anthropic HTTP ${response.status}`);
    const rawText = Array.isArray(body?.content)
      ? body.content.map((part) => (part?.type === 'text' ? part.text : '')).join('\n').trim()
      : '';
    const parsed = parseJsonish(rawText);
    return normalizeProviderPayload('anthropic', model, parsed, rawText, startedAt, new Date().toISOString());
  } catch (error) {
    return providerError('anthropic', model, error?.message || 'Unknown Anthropic error.', startedAt);
  }
}

async function backupAuditRecord(auditRecord) {
  const webhookUrl = process.env.MRV_AI_AUDIT_WEBHOOK_URL;
  if (!webhookUrl) {
    return { status: 'client_backup_only', message: 'No MRV_AI_AUDIT_WEBHOOK_URL configured.' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.MRV_AI_AUDIT_WEBHOOK_TOKEN
          ? `Bearer ${process.env.MRV_AI_AUDIT_WEBHOOK_TOKEN}`
          : undefined,
      },
      body: JSON.stringify(auditRecord),
    });
    if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
    return { status: 'server_backup_stored', message: 'Audit record sent to configured MRV backup endpoint.' };
  } catch (error) {
    return { status: 'server_backup_failed', message: error?.message || 'Backup webhook failed.' };
  }
}

function makeValidatorDigest(results) {
  const successful = results.filter((r) => r.status === 'ok');
  const failures = results.filter((r) => r.status !== 'ok');
  return {
    providerCount: results.length,
    successfulProviders: successful.map((r) => r.provider),
    failedProviders: failures.map((r) => ({ provider: r.provider, error: r.error || 'Unknown error' })),
    consensusReadiness: successful.map((r) => `${r.label}: ${r.evidenceReadiness}`),
    combinedMissingEvidence: [...new Set(successful.flatMap((r) => r.missingEvidence || []))],
    combinedRiskFlags: [...new Set(successful.flatMap((r) => r.riskFlags || []))],
    combinedNextSteps: [...new Set(successful.flatMap((r) => r.recommendedNextSteps || []))],
    validatorReasoningSummaries: successful.map((r) => ({
      provider: r.provider,
      model: r.model,
      summary: r.validatorReasoningSummary,
    })),
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      endpoint: 'DPAL MRV Multi-AI Router',
      providers: getAvailability(),
      models: {
        gemini: providerModel('gemini'),
        openai: providerModel('openai'),
        anthropic: providerModel('anthropic'),
      },
    });
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  const providers = normalizeProviders(req.body?.providers);
  if (!providers.length) {
    json(res, 400, { ok: false, error: 'Select at least one provider: gemini, openai, anthropic.' });
    return;
  }

  const createdAt = new Date().toISOString();
  const requestText = JSON.stringify({
    providers,
    prompt: req.body?.prompt,
    mrvTypeId: req.body?.mrvTypeId,
    mrvTypeTitle: req.body?.mrvTypeTitle,
    projectId: req.body?.projectId,
    context: req.body?.context,
  });
  const inputHash = await sha256(requestText);
  const requestId = `dpal-mrv-ai-${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}-${inputHash.slice(0, 10)}`;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req.body);
  const calls = providers.map((provider) => {
    if (provider === 'gemini') return callGemini(systemPrompt, userPrompt);
    if (provider === 'openai') return callOpenAi(systemPrompt, userPrompt);
    return callAnthropic(systemPrompt, userPrompt);
  });

  const results = await Promise.all(calls);
  const auditRecord = {
    requestId,
    createdAt,
    inputHash,
    requestedProviders: providers,
    mrvTypeId: safeText(req.body?.mrvTypeId, 'unknown'),
    mrvTypeTitle: safeText(req.body?.mrvTypeTitle, 'Unknown MRV type'),
    projectId: safeText(req.body?.projectId, ''),
    prompt: safeText(req.body?.prompt, ''),
    context: req.body?.context || {},
    results,
    validatorDigest: makeValidatorDigest(results),
    disclosure:
      'This audit record stores provider outputs and concise validator rationale summaries. It does not expose private hidden chain-of-thought and is not a certification or regulatory approval.',
  };

  const backup = await backupAuditRecord(auditRecord);

  json(res, 200, {
    ok: true,
    auditRecord,
    backup,
  });
}
