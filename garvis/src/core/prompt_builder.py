"""Assemble the system prompt from files + memory + language hint."""

from __future__ import annotations

from . import config, lang, memory


def _read(rel: str) -> str:
    p = config.project_root() / rel
    if p.exists():
        return p.read_text(encoding="utf-8").strip()
    return ""


def build(language_code: str) -> str:
    system = _read("prompts/system.txt")
    personality = _read("prompts/personality.txt")
    mem = memory.summary_for_prompt()

    parts: list[str] = []
    if system:
        parts.append(system)
    if personality:
        parts.append("Personality notes:\n" + personality)
    if mem:
        parts.append("What you already know about the user:\n" + mem)
    parts.append(
        f"The user's current message is in {lang.name(language_code)}. "
        f"Reply in {lang.name(language_code)}, in one or two sentences, "
        "no markdown, no lists unless explicitly asked."
    )
    return "\n\n".join(parts)
