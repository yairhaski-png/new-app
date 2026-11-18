"""Config + env loader.

One place to ask for settings. Reads config.yaml and .env lazily, caches both.
Use dot-paths: config.get("brains.default") -> "gemini".
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = ROOT / "config.yaml"
ENV_PATH = ROOT / ".env"

_config: dict | None = None


def _load() -> dict:
    global _config
    if _config is None:
        if ENV_PATH.exists():
            load_dotenv(ENV_PATH)
        if CONFIG_PATH.exists():
            with CONFIG_PATH.open("r", encoding="utf-8") as fh:
                _config = yaml.safe_load(fh) or {}
        else:
            _config = {}
    return _config


def get(path: str, default: Any = None) -> Any:
    cur: Any = _load()
    for key in path.split("."):
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur


def project_root() -> Path:
    return ROOT


def env(name: str, default: str = "") -> str:
    _load()
    return os.getenv(name, default)


def reset_cache_for_tests() -> None:
    global _config
    _config = None
