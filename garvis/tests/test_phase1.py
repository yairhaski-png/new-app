"""Phase 1 acceptance tests.

Covers the parts that don't need a network: language detection, router,
memory persistence, conversation buffer, prompt assembly, and the CLI's
name-extraction heuristic. If GEMINI_API_KEY is set, the last section
also hits the real Gemini brain for a one-shot smoke test.

Run from the project root:

    .venv/bin/python -m tests.test_phase1

Exits 0 on all-pass, 1 on any failure. Prints a clear OK / FAIL per test.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path


# -- make `src` and `tests` importable when invoked as a script --------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


results: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    results.append((name, cond, detail))
    tag = "OK  " if cond else "FAIL"
    line = f"  [{tag}] {name}"
    if detail and not cond:
        line += f"  --  {detail}"
    print(line)


# ---------------------------------------------------------------------------
print("=" * 60)
print("Phase 1 acceptance tests")
print("=" * 60)

# 1. Language detection -----------------------------------------------------
print("\n[A] Language detection")
from src.core import lang  # noqa: E402

check("English detected", lang.detect("What time is it?") == "en")
check("Hebrew detected", lang.detect("מה השעה?") == "he")
check("Mixed-script -> Hebrew", lang.detect("Hello אדוני") == "he")
check("Numbers -> English default", lang.detect("12345") == "en")

# 2. Router ------------------------------------------------------------------
print("\n[B] Brain routing")
from src.core import router  # noqa: E402

check("Trivia -> gemini", router.choose("capital of France") == "gemini")
check("Open app -> claude", router.choose("open Safari") == "claude")
check("Timer -> claude", router.choose("set a timer for 5 minutes") == "claude")
check("Hebrew 'פתח' -> claude", router.choose("פתח את ספארי") == "claude")
check("Hebrew casual -> gemini", router.choose("מה שלומך היום?") == "gemini")

# 3. Conversation buffer -----------------------------------------------------
print("\n[C] Conversation buffer")
from src.core.conversation import Conversation  # noqa: E402

c = Conversation(max_turns=5)
for i in range(7):
    c.add("user", f"u{i}")
    c.add("assistant", f"a{i}")
check("Caps at 5 turns (10 entries)", len(c) == 10,
      detail=f"got {len(c)}")
msgs = c.as_list()
check("Oldest turn evicted", msgs[0]["content"] == "u2",
      detail=f"got {msgs[0]!r}")

# 4. Memory round-trip -------------------------------------------------------
print("\n[D] Memory (cross-session)")
from src.core import config as cfg  # noqa: E402
from src.core import memory  # noqa: E402

# Point memory at a tempfile so we don't touch real data/memory.json.
tmp = tempfile.NamedTemporaryFile(
    mode="w", suffix=".json", delete=False, encoding="utf-8"
)
tmp.close()
# Patch the config dot-path lookup.
cfg._config = {"paths": {"memory": tmp.name}}
cfg.project_root = lambda: Path("/")  # type: ignore[assignment]
# After patching, force memory to re-resolve its path and start empty.
memory.reset_cache_for_tests()
Path(tmp.name).unlink(missing_ok=True)

memory.set("user.name", "Haski")
memory.set("user.language_preference", "he")
check("set() wrote name", memory.get("user.name") == "Haski")
check("set() wrote lang pref",
      memory.get("user.language_preference") == "he")

# Simulate restart: wipe cache, reload from disk.
memory.reset_cache_for_tests()
check("Name persisted across reload", memory.get("user.name") == "Haski")
check("Lang pref persisted", memory.get("user.language_preference") == "he")

disk = json.loads(Path(tmp.name).read_text(encoding="utf-8"))
check("JSON on disk has user.name", disk.get("user", {}).get("name") == "Haski")
check("JSON on disk has last_updated", "last_updated" in disk)

# 5. Prompt builder ----------------------------------------------------------
print("\n[E] Prompt builder")
# Restore real config so prompt builder can find prompts/
cfg._config = None
cfg.project_root = lambda: ROOT  # type: ignore[assignment]
memory.reset_cache_for_tests()
from src.core import prompt_builder  # noqa: E402

p_en = prompt_builder.build("en")
p_he = prompt_builder.build("he")
check("English prompt mentions English",
      "English" in p_en, detail=f"got: {p_en[:120]!r}")
check("Hebrew prompt mentions Hebrew", "Hebrew" in p_he)
check("Prompt includes system.txt", "Garvis" in p_en)

# 6. CLI name extraction (unit test on the regex) ----------------------------
print("\n[F] Memory extraction")
from src.cli import _maybe_remember, _NAME_EN, _NAME_HE  # noqa: E402

m = _NAME_EN.search("hey, my name is Haski")
check("English 'my name is X' matches", bool(m))
check("English capture is 'Haski'", m and m.group(1) == "Haski")

m2 = _NAME_HE.search("שלום, קוראים לי יאיר")
check("Hebrew 'קוראים לי' matches", bool(m2))
check("Hebrew capture is 'יאיר'", m2 and m2.group(1) == "יאיר")

m3 = _NAME_EN.search("I am hungry")
# "hungry" isn't in the sentinel list for the regex itself (it only captures
# capitalized tokens), so this won't even match. Good.
check("English 'I am hungry' does NOT match", not m3)

# 7. Optional online smoke test ----------------------------------------------
print("\n[G] Online smoke test (Gemini)")
if os.getenv("GEMINI_API_KEY"):
    from src.core import brain_gemini  # noqa: E402
    try:
        reply = brain_gemini.ask(
            "You are a concise assistant. Reply in one short sentence.",
            "",
            "What is the capital of France?",
            timeout_s=20.0,
        )
        check("Gemini returned non-empty text", bool(reply.strip()),
              detail=reply[:120])
        check("Reply mentions Paris", "paris" in reply.lower(),
              detail=reply[:200])
    except Exception as e:
        check("Gemini brain call", False, detail=str(e))
else:
    print("  [SKIP] GEMINI_API_KEY not set; skipping Gemini smoke test.")
    print("         Fill it in .env and re-run to cover tests #1 and #2.")

# ---------------------------------------------------------------------------
print()
print("=" * 60)
failed = [r for r in results if not r[1]]
total = len(results)
if failed:
    print(f"FAIL: {len(failed)}/{total} checks failed.")
    for name, _, detail in failed:
        print(f"  - {name}" + (f"  --  {detail}" if detail else ""))
    sys.exit(1)
print(f"OK: all {total} checks passed.")
sys.exit(0)
