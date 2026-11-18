"""Cross-session memory. JSON on disk, cached in-process.

Dot-path getters/setters: memory.set("user.name", "Haski"). Writes are
flushed to disk on every set() so a crash never loses a fact. Phase 5's
lessons/corrections pile up in the same file under their own keys.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config


_mem: dict | None = None


def _path() -> Path:
    rel = config.get("paths.memory", "data/memory.json")
    return config.project_root() / rel


def _blank() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "user": {},
        "lessons": [],
        "created_at": now,
        "last_updated": now,
    }


def load() -> dict:
    global _mem
    if _mem is not None:
        return _mem
    p = _path()
    if p.exists():
        try:
            _mem = json.loads(p.read_text(encoding="utf-8"))
            # Normalize in case the file was hand-edited and lost a key.
            _mem.setdefault("user", {})
            _mem.setdefault("lessons", [])
            _mem.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        except Exception:
            _mem = _blank()
    else:
        _mem = _blank()
    return _mem


def save() -> None:
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    data = load()
    data["last_updated"] = datetime.now(timezone.utc).isoformat()
    p.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def get(path: str, default: Any = None) -> Any:
    cur: Any = load()
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur


def set(path: str, value: Any) -> None:
    cur = load()
    parts = path.split(".")
    for key in parts[:-1]:
        if key not in cur or not isinstance(cur[key], dict):
            cur[key] = {}
        cur = cur[key]
    cur[parts[-1]] = value
    save()


def summary_for_prompt() -> str:
    """One-liner facts to inject into the system prompt."""
    data = load()
    user = data.get("user", {})
    lines: list[str] = []
    if "name" in user:
        lines.append(f"The user's name is {user['name']}.")
    if "language_preference" in user:
        lines.append(
            f"They usually prefer {user['language_preference']}, "
            "but respond in whichever language they spoke."
        )
    return "\n".join(lines)


def reset_cache_for_tests() -> None:
    global _mem
    _mem = None
