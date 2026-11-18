"""Garvis entry point.

Default: open the Phase 1 text REPL. --check runs the Phase 0 boot report.
--daemon is reserved for the Phase 2 wake-word listener.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"
ENV_PATH = ROOT / ".env"


def _env_load() -> None:
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH)


def _phase_status() -> str:
    env_present = ENV_PATH.exists()
    picovoice = bool(os.getenv("PICOVOICE_ACCESS_KEY"))
    gemini = bool(os.getenv("GEMINI_API_KEY"))
    claude_bin = os.getenv("CLAUDE_BIN", "claude")
    return (
        f".env present: {env_present}\n"
        f"Picovoice key set: {picovoice}\n"
        f"Gemini key set: {gemini}\n"
        f"Claude binary name: {claude_bin}"
    )


def boot_check() -> int:
    if not CONFIG_PATH.exists():
        print(f"ERROR: config.yaml not found at {CONFIG_PATH}", file=sys.stderr)
        return 2
    with CONFIG_PATH.open("r", encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}
    name = cfg.get("assistant", {}).get("name", "Garvis")
    wake = cfg.get("assistant", {}).get("wake_word", "Hey Garvis")

    print("=" * 60)
    print(f"{name.upper()} boot check")
    print("=" * 60)
    print(f"Python: {sys.version.split()[0]}")
    print(f"Project root: {ROOT}")
    print(f"Config loaded: {name} (wake word: {wake})")
    print()
    print(_phase_status())
    print()
    print("Phase 1 ready. Run without --check to open the text REPL.")
    return 0


def main() -> int:
    _env_load()
    parser = argparse.ArgumentParser(
        prog="garvis", description="Garvis — personal voice AI assistant"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Run the boot report and exit (Phase 0 behavior).",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run the wake-word listener (Phase 2+; not available yet).",
    )
    args = parser.parse_args()

    if args.check:
        return boot_check()
    if args.daemon:
        print(
            "Daemon mode not available yet (Phase 2+).", file=sys.stderr
        )
        return 1

    # Default: Phase 1 text REPL.
    from src.cli import run_repl

    return run_repl()


if __name__ == "__main__":
    raise SystemExit(main())
