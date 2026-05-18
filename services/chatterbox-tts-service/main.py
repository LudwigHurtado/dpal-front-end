"""
dpal-chatterbox-tts — Chatterbox TTS microservice for DPAL Assistant voice.

Run:
  uvicorn main:app --host 0.0.0.0 --port ${PORT:-8020}
"""

from __future__ import annotations

import gc
import logging
import os
import resource
import threading
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

logger = logging.getLogger("deepal-chatterbox")
logging.basicConfig(level=logging.INFO, format="%(levelname)s [deepal-chatterbox] %(message)s")

SERVICE_NAME = "deepal-chatterbox"
ENGINE_NAME = "chatterbox"
DEFAULT_MAX_TEXT_CHARS = 500
AUDIO_DIR = Path(os.getenv("AUDIO_OUTPUT_DIR", "audio"))
VOICES_DIR = Path(os.getenv("VOICES_DIR", "voices"))
REQUIRED_API_KEY = os.getenv("CHATTERBOX_API_KEY", "").strip()
DEFAULT_VOICE = os.getenv("DEFAULT_VOICE", "positive").strip()
MODEL_VARIANT = os.getenv("CHATTERBOX_MODEL", "english").strip().lower()

_tts_model: Any | None = None
_sample_rate: int = 24_000
_synthesis_slot_lock = threading.Lock()
_model_load_lock = threading.Lock()
_synthesis_busy = False


def configured_device() -> str:
    """CPU unless CHATTERBOX_DEVICE=cuda is explicitly set."""
    raw = os.getenv("CHATTERBOX_DEVICE", "cpu").strip().lower()
    return "cuda" if raw == "cuda" else "cpu"


def max_text_chars() -> int:
    raw = os.getenv("VOICE_MAX_CHARS", str(DEFAULT_MAX_TEXT_CHARS)).strip()
    try:
        n = int(raw)
        return n if n > 0 else DEFAULT_MAX_TEXT_CHARS
    except ValueError:
        return DEFAULT_MAX_TEXT_CHARS


def preload_enabled() -> bool:
    return os.getenv("CHATTERBOX_PRELOAD", "false").strip().lower() == "true"


def rss_mb() -> float:
    """Process RSS in megabytes (Linux Railway)."""
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(usage / 1024, 2)


def log_memory(stage: str) -> None:
    logger.info("[memory] %s rss_mb=%.2f model_loaded=%s synthesis_busy=%s", stage, rss_mb(), _tts_model is not None, _synthesis_busy)


class HealthResponse(BaseModel):
    ok: bool = True
    service: str = SERVICE_NAME
    engine: str = ENGINE_NAME
    modelLoaded: bool = False
    device: str = "cpu"


class MemoryDebugResponse(BaseModel):
    ok: bool = True
    rssMb: float
    modelLoaded: bool
    synthesisBusy: bool
    device: str


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str | None = None
    voice_id: str | None = None


class SynthesizeSuccess(BaseModel):
    ok: bool = True
    audioUrl: str
    ttsText: str
    voiceEngine: str = ENGINE_NAME
    generatedAt: str | None = None
    contentType: str = "audio/wav"


def public_base_url() -> str:
    port = os.getenv("PORT", "8020")
    return os.getenv("PUBLIC_BASE_URL", f"http://localhost:{port}").rstrip("/")


def public_base_url_is_placeholder() -> bool:
    raw = os.getenv("PUBLIC_BASE_URL", "").strip()
    if not raw:
        return False
    lowered = raw.lower()
    return "<" in lowered or "your-" in lowered or "example.com" in lowered


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


def _try_acquire_synthesis() -> bool:
    global _synthesis_busy
    with _synthesis_slot_lock:
        if _synthesis_busy:
            return False
        _synthesis_busy = True
        return True


def _release_synthesis() -> None:
    global _synthesis_busy
    with _synthesis_slot_lock:
        _synthesis_busy = False


def load_tts_model() -> tuple[Any, int]:
    """Lazy-load model on first synthesis only (not on import or /health)."""
    global _tts_model, _sample_rate

    if _tts_model is not None:
        return _tts_model, _sample_rate

    with _model_load_lock:
        if _tts_model is not None:
            return _tts_model, _sample_rate

        device = configured_device()
        log_memory("model loading started")
        logger.info("Model loading started variant=%s device=%s", MODEL_VARIANT, device)

        import torch

        if MODEL_VARIANT == "turbo":
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            model = ChatterboxTurboTTS.from_pretrained(device=device)
        elif MODEL_VARIANT in ("multilingual", "mtl"):
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS

            model = ChatterboxMultilingualTTS.from_pretrained(device=device)
        else:
            from chatterbox.tts import ChatterboxTTS

            model = ChatterboxTTS.from_pretrained(device=device)

        _tts_model = model
        _sample_rate = int(getattr(model, "sr", 24_000))
        logger.info("Model loaded sample_rate=%s device=%s", _sample_rate, device)
        log_memory("model loaded")

    return _tts_model, _sample_rate


def tensor_to_numpy(wav: Any) -> Any:
    import numpy as np

    if hasattr(wav, "detach"):
        arr = wav.detach().cpu().numpy()
    else:
        arr = np.asarray(wav)
    return np.squeeze(arr).astype(np.float32)


def generate_audio(text: str, voice_prompt: str | None) -> tuple[Any, int]:
    import torch

    model, sr = load_tts_model()
    kwargs: dict[str, Any] = {}
    if voice_prompt:
        kwargs["audio_prompt_path"] = voice_prompt

    log_memory("generation started")
    logger.info("Generation started chars=%s", len(text))

    device = configured_device()
    with torch.inference_mode():
        try:
            if MODEL_VARIANT == "turbo" and not voice_prompt:
                raise ValueError(
                    "Chatterbox-Turbo requires a reference voice clip. "
                    "Add voices/<name>.wav or set CHATTERBOX_MODEL=english."
                )
            wav = model.generate(text, **kwargs)
        except TypeError:
            wav = model.generate(text)

    audio_np = tensor_to_numpy(wav)

    if device == "cuda" and torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

    log_memory("generation completed")
    logger.info("Generation completed")
    return audio_np, sr


@asynccontextmanager
async def lifespan(_app: FastAPI):
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Starting %s audio_dir=%s voices_dir=%s device=%s preload=%s max_chars=%s api_key_required=%s",
        SERVICE_NAME,
        AUDIO_DIR.resolve(),
        VOICES_DIR.resolve(),
        configured_device(),
        preload_enabled(),
        max_text_chars(),
        bool(REQUIRED_API_KEY and REQUIRED_API_KEY.lower() != "none"),
    )
    if public_base_url_is_placeholder():
        logger.warning(
            "PUBLIC_BASE_URL looks like a placeholder (%s). "
            "Set it to your public Railway URL so audioUrl is valid; "
            "the Node backend can still fetch /audio/* via CHATTERBOX_API_URL.",
            public_base_url(),
        )
    if preload_enabled():
        logger.warning("CHATTERBOX_PRELOAD=true — loading model at startup (high memory)")
        try:
            load_tts_model()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Preload failed (will retry on first /synthesize): %s", exc)
    yield


app = FastAPI(title="dpal-chatterbox-tts", version="1.1.0", lifespan=lifespan)

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
        device=configured_device(),
    )


@app.get("/debug/memory", response_model=MemoryDebugResponse)
def debug_memory() -> MemoryDebugResponse:
    return MemoryDebugResponse(
        rssMb=rss_mb(),
        modelLoaded=_tts_model is not None,
        synthesisBusy=_synthesis_busy,
        device=configured_device(),
    )


@app.post("/synthesize", response_model=SynthesizeSuccess)
def synthesize(
    body: SynthesizeRequest,
    _: None = Depends(verify_api_key),
) -> SynthesizeSuccess:
    if not _try_acquire_synthesis():
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "error": "TTS_BUSY",
                "message": "Voice engine is warming up or speaking. Try again shortly.",
            },
        )

    try:
        text = body.text.strip()
        limit = max_text_chars()
        if not text:
            raise HTTPException(
                status_code=400,
                detail={"ok": False, "error": "VALIDATION_ERROR", "message": "Text is required."},
            )
        if len(text) > limit:
            raise HTTPException(
                status_code=400,
                detail={
                    "ok": False,
                    "error": "VALIDATION_ERROR",
                    "message": f"Text exceeds maximum length of {limit} characters.",
                },
            )

        voice_prompt = resolve_voice_prompt(body.voice, body.voice_id)

        try:
            audio_np, sr = generate_audio(text, voice_prompt)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("Synthesis failed")
            raise HTTPException(
                status_code=503,
                detail={"ok": False, "error": "SYNTHESIS_FAILED", "message": str(exc)},
            ) from exc

        import soundfile as sf

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
    finally:
        _release_synthesis()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8020"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
