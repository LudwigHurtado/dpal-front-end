"""
DeepAL Chatterbox TTS microservice.

Exposes GET /health and POST /synthesize for the DPAL Railway backend
(CHATTERBOX_API_URL → this host).

Run:
  uvicorn main:app --host 0.0.0.0 --port ${PORT:-8020}
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import torch
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

logger = logging.getLogger("deepal-chatterbox")
logging.basicConfig(level=logging.INFO, format="%(levelname)s [deepal-chatterbox] %(message)s")

SERVICE_NAME = "deepal-chatterbox"
ENGINE_NAME = "chatterbox"
MAX_TEXT_CHARS = int(os.getenv("VOICE_MAX_CHARS", "2500"))
AUDIO_DIR = Path(os.getenv("AUDIO_OUTPUT_DIR", "audio"))
VOICES_DIR = Path(os.getenv("VOICES_DIR", "voices"))
REQUIRED_API_KEY = os.getenv("CHATTERBOX_API_KEY", "").strip()
DEFAULT_VOICE = os.getenv("DEFAULT_VOICE", "positive").strip()
DEVICE = os.getenv("CHATTERBOX_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
MODEL_VARIANT = os.getenv("CHATTERBOX_MODEL", "english").strip().lower()

_tts_model: Any | None = None
_sample_rate: int = 24_000


class HealthResponse(BaseModel):
    ok: bool = True
    service: str = SERVICE_NAME
    engine: str = ENGINE_NAME
    modelLoaded: bool = False
    device: str = DEVICE


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str | None = None
    voice_id: str | None = None  # DPAL backend sends voice_id


class SynthesizeSuccess(BaseModel):
    ok: bool = True
    audioUrl: str
    ttsText: str
    voiceEngine: str = ENGINE_NAME
    generatedAt: str | None = None
    contentType: str = "audio/wav"


class ErrorResponse(BaseModel):
    ok: bool = False
    error: str
    message: str | None = None


def public_base_url() -> str:
    port = os.getenv("PORT", "8020")
    return os.getenv("PUBLIC_BASE_URL", f"http://localhost:{port}").rstrip("/")


def verify_api_key(authorization: str | None = Header(default=None)) -> None:
    if not REQUIRED_API_KEY or REQUIRED_API_KEY.lower() == "none":
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"ok": False, "error": "Unauthorized"})
    token = authorization.removeprefix("Bearer ").strip()
    if token != REQUIRED_API_KEY:
        raise HTTPException(status_code=401, detail={"ok": False, "error": "Unauthorized"})


def resolve_voice_prompt(voice: str | None, voice_id: str | None) -> str | None:
    key = (voice or voice_id or DEFAULT_VOICE or "").strip()
    if not key:
        return None
    for ext in (".wav", ".mp3", ".flac", ".ogg"):
        candidate = VOICES_DIR / f"{key}{ext}"
        if candidate.is_file():
            return str(candidate.resolve())
    return None


def load_tts_model() -> tuple[Any, int]:
    global _tts_model, _sample_rate
    if _tts_model is not None:
        return _tts_model, _sample_rate

    logger.info("Loading Chatterbox model variant=%s device=%s", MODEL_VARIANT, DEVICE)

    if MODEL_VARIANT == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        model = ChatterboxTurboTTS.from_pretrained(device=DEVICE)
    elif MODEL_VARIANT in ("multilingual", "mtl"):
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        model = ChatterboxMultilingualTTS.from_pretrained(device=DEVICE)
    else:
        from chatterbox.tts import ChatterboxTTS

        model = ChatterboxTTS.from_pretrained(device=DEVICE)

    _tts_model = model
    _sample_rate = int(getattr(model, "sr", 24_000))
    logger.info("Chatterbox model ready sample_rate=%s", _sample_rate)
    return _tts_model, _sample_rate


def tensor_to_numpy(wav: Any) -> np.ndarray:
    if hasattr(wav, "detach"):
        arr = wav.detach().cpu().numpy()
    else:
        arr = np.asarray(wav)
    return np.squeeze(arr).astype(np.float32)


def generate_audio(text: str, voice_prompt: str | None) -> tuple[np.ndarray, int]:
    model, sr = load_tts_model()
    kwargs: dict[str, Any] = {}
    if voice_prompt:
        kwargs["audio_prompt_path"] = voice_prompt

    try:
        if MODEL_VARIANT == "turbo" and not voice_prompt:
            raise ValueError(
                "Chatterbox-Turbo requires a reference voice clip. "
                "Add voices/<name>.wav or set CHATTERBOX_MODEL=english."
            )
        wav = model.generate(text, **kwargs)
    except TypeError:
        # Older signatures may not accept audio_prompt_path
        wav = model.generate(text)

    return tensor_to_numpy(wav), sr


@asynccontextmanager
async def lifespan(_app: FastAPI):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Starting %s audio_dir=%s voices_dir=%s api_key_required=%s",
        SERVICE_NAME,
        AUDIO_DIR.resolve(),
        VOICES_DIR.resolve(),
        bool(REQUIRED_API_KEY and REQUIRED_API_KEY.lower() != "none"),
    )
    if os.getenv("CHATTERBOX_EAGER_LOAD", "false").lower() == "true":
        try:
            load_tts_model()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Eager model load failed (will retry on first /synthesize): %s", exc)
    yield


app = FastAPI(title="DeepAL Chatterbox TTS", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        modelLoaded=_tts_model is not None,
        device=DEVICE,
    )


@app.post(
    "/synthesize",
    response_model=SynthesizeSuccess,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    dependencies=[Depends(verify_api_key)],
)
def synthesize(body: SynthesizeRequest) -> SynthesizeSuccess:
    text = body.text.strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail={"ok": False, "error": "VALIDATION_ERROR", "message": "Text is required."},
        )
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=400,
            detail={
                "ok": False,
                "error": "VALIDATION_ERROR",
                "message": f"Text exceeds maximum length of {MAX_TEXT_CHARS} characters.",
            },
        )

    voice_prompt = resolve_voice_prompt(body.voice, body.voice_id)

    try:
        audio_np, sr = generate_audio(text, voice_prompt)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Synthesis failed")
        raise HTTPException(
            status_code=503,
            detail={"ok": False, "error": "SYNTHESIS_FAILED", "message": str(exc)},
        ) from exc

    file_id = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:10]}"
    filename = f"{file_id}.wav"
    out_path = AUDIO_DIR / filename

    try:
        sf.write(str(out_path), audio_np, sr, subtype="PCM_16")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to write audio file")
        raise HTTPException(
            status_code=503,
            detail={"ok": False, "error": "WRITE_FAILED", "message": str(exc)},
        ) from exc

    relative_url = f"/audio/{filename}"
    absolute_url = f"{public_base_url()}{relative_url}"
    generated_at = datetime.now(timezone.utc).isoformat()

    logger.info(
        "Synthesized chars=%s voice=%s file=%s",
        len(text),
        body.voice or body.voice_id or DEFAULT_VOICE or "default",
        filename,
    )

    return SynthesizeSuccess(
        audioUrl=absolute_url,
        ttsText=text,
        generatedAt=generated_at,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8020"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
