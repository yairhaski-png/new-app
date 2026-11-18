"""Phase 1 text REPL.

Reads one line at a time, runs language detect + memory extract + brain
pick + reply, prints the reply tagged with which brain answered. Falls
back to the other brain on an error, prints a honest degradation message
if both are down.
"""

from __future__ import annotations

import re
import sys

from .core import brain_claude, brain_gemini, lang, memory, prompt_builder, router
from .core.conversation import Conversation
from .core.errors import BrainError, BrainTimeout, BrainUnavailable


# Very narrow pattern. Must appear at start-of-chunk, must capture a
# plausible name token. Won't fire on "I am hungry" because "hungry" is
# lowercase and we insist on a capitalized token for English names.
_NAME_EN = re.compile(
    r"\b(?:my name is|i am|i'm|call me)\s+([A-Z][a-zA-Z\-']{1,30})\b"
)
# Hebrew doesn't have case; require length and no trailing punctuation.
_NAME_HE = re.compile(r"(?:קוראים לי|אני)\s+([^\s,.?!]{2,30})")

_SENTINEL_WORDS = {
    "not", "no", "sure", "hungry", "tired", "done", "here",
    "sorry", "home", "ready", "late", "early", "fine",
    "אוכל", "עייף", "רעב", "פה", "כאן",
}


def _maybe_remember(user_text: str) -> None:
    m = _NAME_EN.search(user_text)
    if m:
        candidate = m.group(1).strip()
        if candidate.lower() not in _SENTINEL_WORDS:
            memory.set("user.name", candidate.title())
            return
    m = _NAME_HE.search(user_text)
    if m:
        candidate = m.group(1).strip()
        if candidate not in _SENTINEL_WORDS and len(candidate) >= 2:
            memory.set("user.name", candidate)


def _ask_with_fallback(
    system: str, history: str, user_text: str
) -> tuple[str, str]:
    primary = router.choose(user_text)
    fallback = "gemini" if primary == "claude" else "claude"
    errors: list[str] = []
    for brain_name in (primary, fallback):
        try:
            if brain_name == "gemini":
                return brain_gemini.ask(system, history, user_text), "gemini"
            return brain_claude.ask(system, history, user_text), "claude"
        except BrainTimeout as e:
            errors.append(f"{brain_name}: timeout ({e})")
        except BrainError as e:
            errors.append(f"{brain_name}: {e}")
    raise BrainUnavailable("All brains failed: " + " | ".join(errors))


def _degraded_message(language_code: str) -> str:
    if language_code == "he":
        return "לא מצליח להגיע לשירות ה-AI כרגע, אדוני."
    return "I can't reach the AI service right now, sir."


def run_repl() -> int:
    memory.load()
    convo = Conversation(max_turns=5)
    print("=" * 60)
    print("GARVIS — Phase 1 text chat")
    print("Type 'exit', 'quit', or Ctrl+D to leave.")
    print("=" * 60)
    print()
    while True:
        try:
            user_text = input("you > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not user_text:
            continue
        if user_text.lower() in {"exit", "quit", "bye", "יציאה"}:
            break

        language_code = lang.detect(user_text)
        _maybe_remember(user_text)
        system = prompt_builder.build(language_code)
        history = convo.as_text()

        try:
            reply, brain = _ask_with_fallback(system, history, user_text)
        except BrainUnavailable as e:
            print(f"garvis > {_degraded_message(language_code)}")
            print(f"  (detail: {e})", file=sys.stderr)
            continue

        convo.add("user", user_text)
        convo.add("assistant", reply)
        print(f"garvis [{brain}] > {reply}")

    return 0
