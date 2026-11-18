"""Gemini brain — fast, free tier, handles the common case.

Each call is stateless from Gemini's point of view: the conversation
history is formatted into the prompt. That matches how the Claude brain
works, so swapping between them is seamless.
"""

from __future__ import annotations

import os

from . import config
from .errors import BrainTimeout, BrainUnavailable


def _build_model(system_instruction: str):
    import google.generativeai as genai

    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise BrainUnavailable(
            "GEMINI_API_KEY is not set in .env (get one at "
            "https://aistudio.google.com/apikey)"
        )
    genai.configure(api_key=key)
    model_name = config.get("brains.gemini_model", "gemini-2.0-flash")
    return genai.GenerativeModel(
        model_name=model_name, system_instruction=system_instruction
    )


def ask(
    system_instruction: str,
    history_text: str,
    user_text: str,
    timeout_s: float = 30.0,
) -> str:
    try:
        model = _build_model(system_instruction)
    except BrainUnavailable:
        raise
    except Exception as e:
        raise BrainUnavailable(f"Could not initialize Gemini: {e}") from e

    if history_text:
        prompt = f"{history_text}\nUser: {user_text}\nGarvis:"
    else:
        prompt = f"User: {user_text}\nGarvis:"

    try:
        resp = model.generate_content(
            prompt, request_options={"timeout": timeout_s}
        )
    except Exception as e:
        # DeadlineExceeded, ConnectionError, Unauthenticated, etc.
        msg = str(e).lower()
        if "timeout" in msg or "deadline" in msg:
            raise BrainTimeout(f"Gemini timed out after {timeout_s}s") from e
        raise BrainUnavailable(f"Gemini request failed: {e}") from e

    text = getattr(resp, "text", None)
    if not text or not text.strip():
        raise BrainUnavailable("Gemini returned an empty response")
    return text.strip()
