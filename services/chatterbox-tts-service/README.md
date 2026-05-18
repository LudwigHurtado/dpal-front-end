# DeepAL Chatterbox TTS Service

Standalone **Python FastAPI** microservice that wraps [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox) for natural speech used by the DPAL Assistant.

The repo **`backend/`** (Railway) proxies voice requests to this service via `CHATTERBOX_API_URL`. It does **not** replace Gemini/OpenAI chat routes.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ ok, service: "deepal-chatterbox", engine: "chatterbox" }` |
| `POST` | `/synthesize` | Generate WAV, save under `/audio/`, return JSON with `audioUrl` |

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
  "audioUrl": "http://localhost:8020/audio/20260518020000-abc123.wav",
  "ttsText": "Hello from DPAL",
  "voiceEngine": "chatterbox",
  "generatedAt": "2026-05-18T02:00:00.000Z",
  "contentType": "audio/wav"
}
```

## Quick start (local)

```bash
cd services/chatterbox-tts-service
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt

# Optional: place a 6–10s reference clip for voice cloning
# mkdir voices && cp your-ref.wav voices/positive.wav

uvicorn main:app --host 0.0.0.0 --port ${PORT:-8020}
```

### Smoke tests

```bash
curl http://localhost:8020/health

curl -X POST http://localhost:8020/synthesize \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello from DPAL AquaScan.\"}"
```

Open the returned `audioUrl` in a browser or VLC.

## Wire DPAL Railway backend

On the **DPAL `backend/` Railway service** (not Vercel):

| Variable | Example |
|----------|---------|
| `CHATTERBOX_API_URL` | `https://your-chatterbox-service.up.railway.app` |
| `CHATTERBOX_VOICE_ID` | `positive` (matches `voices/positive.wav` if using a ref clip) |
| `CHATTERBOX_API_KEY` | Same secret as this service, if you enable auth below |

Redeploy **`backend/`** after setting variables.

Verify:

```bash
curl https://web-production-a27b.up.railway.app/api/deepal/health
# expect chatterboxConfigured: true

curl -X POST https://web-production-a27b.up.railway.app/api/deepal/voice/synthesize \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello from DPAL\"}"
```

## Environment variables (this service)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8020` | HTTP port |
| `PUBLIC_BASE_URL` | `http://localhost:{PORT}` | Absolute `audioUrl` prefix (set on Railway) |
| `VOICE_MAX_CHARS` | `2500` | Max input length |
| `AUDIO_OUTPUT_DIR` | `audio` | Generated WAV directory (served at `/audio`) |
| `VOICES_DIR` | `voices` | Reference clips: `voices/positive.wav`, etc. |
| `DEFAULT_VOICE` | `positive` | Used when `voice` / `voice_id` omitted |
| `CHATTERBOX_MODEL` | `english` | `english` \| `turbo` \| `multilingual` |
| `CHATTERBOX_DEVICE` | `cuda` if available else `cpu` | Torch device |
| `CHATTERBOX_EAGER_LOAD` | `false` | Load model on startup |
| `CHATTERBOX_API_KEY` | *(empty)* | If set, requires `Authorization: Bearer <key>` |
| `CORS_ORIGINS` | `*` | Comma-separated origins |

## Deploy on Railway (separate service)

1. Create a new Railway service from this repo with **root directory** `services/chatterbox-tts-service`.
2. Set start command:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. Set `PUBLIC_BASE_URL` to the public Railway URL (no trailing slash).
4. Use a **GPU** plan if possible (`CHATTERBOX_DEVICE=cuda`); CPU works but is slower on first request.
5. Copy the public URL into DPAL `CHATTERBOX_API_URL`.

## Voice reference clips

- **English model** (`CHATTERBOX_MODEL=english`): works without a reference clip; optional `voices/<name>.wav` for cloning.
- **Turbo** (`CHATTERBOX_MODEL=turbo`): requires `voices/<name>.wav` (≈10s clean speech).

## Security

- v1 local dev: no API key required when `CHATTERBOX_API_KEY` is unset.
- Production: set the same `CHATTERBOX_API_KEY` on **both** this service and the DPAL `backend/` so the Node proxy can authenticate.

## Notes

- First `/synthesize` after cold start may take 30–90s while the model downloads/loads.
- Generated files accumulate under `audio/`; add a cron or volume policy for cleanup in production.
- This service is independent of `/api/deepal/chat` and `/api/ai/gemini` — only TTS.
