"""Garvis entry point.

Phase 0 responsibility: prove the install works. Load config, print a status
line, exit cleanly. Later phases plug the brain, voice pipeline, and HUD into
this same entry point.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"
ENV_PATH = ROOT / ".env"


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print(f"ERROR: config.yaml not found at {CONFIG_PATH}", file=sys.stderr)
        sys.exit(2)
    with CONFIG_PATH.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def phase_status() -> str:
    env_loaded = ENV_PATH.exists()
    picovoice = bool(os.getenv("PICOVOICE_ACCESS_KEY"))
    gemini = bool(os.getenv("GEMINI_API_KEY"))
    claude_bin = os.getenv("CLAUDE_BIN", "claude")

    return (
        f".env present: {env_loaded}\n"
        f"Picovoice key set: {picovoice}\n"
        f"Gemini key set: {gemini}\n"
        f"Claude binary name: {claude_bin}"
    )


def main() -> int:
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)

    cfg = load_config()
    name = cfg.get("assistant", {}).get("name", "Garvis")
    wake = cfg.get("assistant", {}).get("wake_word", "Hey Garvis")

    print("=" * 60)
    print(f"{name.upper()} boot check")
    print("=" * 60)
    print(f"Python: {sys.version.split()[0]}")
    print(f"Project root: {ROOT}")
    print(f"Config loaded: {name} (wake word: {wake})")
    print()
    print(phase_status())
    print()
    print("Phase 0 scaffolding OK. No voice pipeline yet.")
    print("Next: Phase 1 — text-only brain.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
