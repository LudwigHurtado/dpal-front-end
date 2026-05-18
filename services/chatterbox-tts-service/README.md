# dpal-chatterbox-tts

Standalone **Python FastAPI** service that wraps [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox) for natural speech used by the DPAL Assistant.

The repo **`backend/`** (Railway service `web`) proxies voice requests here via `CHATTERBOX_API_URL`. It does **not** replace Gemini/OpenAI chat routes.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Lightweight liveness — **does not load the model** |
| `GET` | `/debug/memory` | Process RSS memory (MB), busy flag, model loaded |
| `POST` | `/synthesize` | Generate WAV (lazy model load, single-flight) |

### `POST /synthesize` body

```json
{
  "text": "Hello from DPAL",
  "voice": "positive"
}
```

Also accepts `voice_id` (sent by the DPAL backend when `CHATTERBOX_VOICE_ID` is set).

### Success response

```json
{
  "ok": true,
  "audioUrl": "https://your-service.up.railway.app/audio/20260518020000-abc123.wav",
  "ttsText": "Hello from DPAL",
  "voiceEngine": "chatterbox",
  "generatedAt": "2026-05-18T02:00:00.000Z",
  "contentType": "audio/wav"
}
```

### Busy response (concurrent request while synthesizing)

```json
{
  "ok": false,
  "error": "TTS_BUSY",
  "message": "Voice engine is warming up or speaking. Try again shortly."
}
```

HTTP **503** — compatible with DPAL backend `VOICE_UNAVAILABLE` fallback.

## Quick start (local)

```bash
cd services/chatterbox-tts-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8020
```

### Smoke tests

```bash
curl http://localhost:8020/health
curl http://localhost:8020/debug/memory

curl -X POST http://localhost:8020/synthesize \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello from DPAL.\"}"
```

## Wire DPAL Railway backend

On the **`web`** Railway service (Node `backend/`), **not** on this service:

| Variable | Example |
|----------|---------|
| `CHATTERBOX_API_URL` | `http://dpal-chatterbox-tts.railway.internal` (private) or public URL |
| `CHATTERBOX_VOICE_ID` | `positive` |
| `CHATTERBOX_API_KEY` | Same secret on both services if auth enabled |

## Environment variables (dpal-chatterbox-tts)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8020` | HTTP port (Railway sets `$PORT`) |
| `PUBLIC_BASE_URL` | `http://localhost:{PORT}` | Absolute `audioUrl` prefix — set to **public** Railway URL |
| `VOICE_MAX_CHARS` | `500` | Max input length (raise after CPU testing) |
| `CHATTERBOX_DEVICE` | `cpu` | **`cpu`** unless explicitly set to `cuda` |
| `CHATTERBOX_PRELOAD` | `false` | **`false`** — do not load model at startup (saves RAM) |
| `CHATTERBOX_MODEL` | `english` | `english` \| `turbo` \| `multilingual` |
| `AUDIO_OUTPUT_DIR` | `audio` | Generated WAV directory |
| `VOICES_DIR` | `voices` | Reference clips e.g. `voices/positive.wav` |
| `DEFAULT_VOICE` | `positive` | Default voice id |
| `CHATTERBOX_API_KEY` | *(empty)* | Optional Bearer auth |
| `CORS_ORIGINS` | `*` | Comma-separated origins |

### Railway low-memory profile (recommended)

```env
CHATTERBOX_DEVICE=cpu
CHATTERBOX_PRELOAD=false
VOICE_MAX_CHARS=500
CHATTERBOX_MODEL=english
PUBLIC_BASE_URL=https://your-dpal-chatterbox-tts.up.railway.app
```

## Deploy on Railway

1. Create service **dpal-chatterbox-tts** with root directory `services/chatterbox-tts-service`.
2. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set env vars above; keep **≥8 GB** plan for first model load on CPU, or use GPU + `CHATTERBOX_DEVICE=cuda`.
4. Point **`web`** service `CHATTERBOX_API_URL` at this service (internal or public URL).

## Memory behavior

- **Lazy load:** model loads on first `POST /synthesize` only.
- **Single-flight:** only one synthesis at a time; others get `TTS_BUSY`.
- **Inference:** `torch.inference_mode()`, then `gc.collect()` (and `cuda.empty_cache()` if CUDA).
- **Logs:** model loading started/loaded, generation started/completed, RSS before/after stages.

## Notes

- First synthesis after cold start downloads/loads the model — can take several minutes on CPU.
- `/health` stays lightweight for Railway healthchecks.
- This service is independent of `/api/deepal/chat` — voice only.
