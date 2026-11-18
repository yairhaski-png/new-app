"""Claude brain via the local `claude -p` CLI.

Stateless subprocess call per turn. Conversation history is packed into
the prompt. Uses the Claude Pro/Max subscription behind the `claude`
binary, so no API key or cost at our layer.
"""

from __future__ import annotations

import os
import shutil
import subprocess

from . import config
from .errors import BrainTimeout, BrainUnavailable


def _binary() -> str:
    return os.getenv("CLAUDE_BIN", config.get("brains.claude_binary", "claude"))


def ask(
    system_instruction: str,
    history_text: str,
    user_text: str,
    timeout_s: float = 60.0,
) -> str:
    binary = _binary()
    if shutil.which(binary) is None:
        raise BrainUnavailable(
            f"'{binary}' CLI not on PATH. Install with: "
            "npm install -g @anthropic-ai/claude-code"
        )

    parts: list[str] = []
    if system_instruction:
        parts.append(system_instruction)
    if history_text:
        parts.append("Conversation so far:\n" + history_text)
    parts.append(f"User: {user_text}")
    prompt = "\n\n".join(parts)

    try:
        result = subprocess.run(
            [binary, "-p", prompt],
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as e:
        raise BrainTimeout(f"Claude did not reply within {timeout_s}s") from e
    except FileNotFoundError as e:
        raise BrainUnavailable(f"'{binary}' binary disappeared: {e}") from e

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise BrainUnavailable(
            f"Claude exited {result.returncode}: {stderr[:300]}"
        )

    out = (result.stdout or "").strip()
    if not out:
        raise BrainUnavailable("Claude returned empty output")
    return out
