# Garvis — handoff to local Claude Code

Read this first, then continue the project from where the cloud session
left off. Ignore anything stale by cross-checking with the files.

## What Garvis is

Personal voice AI assistant for macOS inspired by JARVIS. Bilingual
Hebrew/English. Budget: **$0** — free tools and free tiers only. User is
Haski (yair.haski@gmail.com). Project lives at `~/Documents/garvis`.

The full spec (iron rules, action ladder, phases 0–5) is at the top of
the original transcript; the key constraints are:

- Hard rules enforced in code, not prompts:
  1. Never send messages, email, posts without explicit verbal "yes"
  2. Never spend money
  3. No permanent deletion (trash with 90-day retention)
  4. Never use passwords/credentials without being asked
  5. Cannot modify the iron rules
  6. Closed allowlist of controllable apps
  7. Honest failure reports
- Action ladder: green (do it) / yellow (do it, announce) / red (ask
  "are you sure?") / black (refuse, explain).
- Bilingual: detect per utterance, reply in the same language. Haski is
  addressed as "אדוני" in Hebrew.
- Voices (Phase 2+): `he-IL-AvriNeural` and `en-GB-RyanNeural`.

## Status (as of 2026-11-18, cloud session)

**Phase 0 — scaffolding — DONE and tested on Haski's Mac.** Boot check
runs clean.

**Phase 1 — text brain — code complete and committed.** 25/26 offline
tests green on Haski's Mac. The 26th test (live Gemini smoke) is
**failing**:

- First failure: `gemini-2.0-flash` is retired. Fixed — `config.yaml`
  now uses `gemini-3.8-flash`.
- Current failure: `gemini-3.8-flash` call timed out after 20s. Need
  either a longer default timeout or (better) migrate off the
  deprecated `google.generativeai` SDK to `google.genai`.

**Phases 2–5 — not started.**

## Repository

- GitHub: `yairhaski-png/new-app`, branch `claude/loving-davinci-ok7iuc`
- Haski's local copy: `~/Documents/garvis` (rsync'd — **not a git
  clone**, so `git pull` won't work there without re-setup)
- The real Garvis code lives in the `garvis/` subdirectory of the repo
  (the repo root is the unrelated "Look Max" PWA)

## Immediate next tasks

1. **Unblock the Gemini smoke test.** Two options, pick one:
   - **Quick:** bump `tests/test_phase1.py` smoke-test `timeout_s` to
     60, and the `brain_gemini.ask` default too. Re-run tests.
   - **Right:** migrate `src/core/brain_gemini.py` from
     `google.generativeai` (deprecated, emits FutureWarning) to
     `google.genai`. Update `requirements.txt`. Re-run tests.
2. Walk Haski through the 8 manual acceptance tests in the spec
   (correct answers, admits ignorance, 5-turn context, language
   detect, cross-session memory, survives restart, language-tracking,
   graceful degradation). Several are automated; a couple need him
   typing in the REPL.
3. When all 8 pass, **ask Haski to confirm green-light for Phase 2.**

## Phase 2 plan (not started)

- Wake word: **Porcupine** (`pvporcupine` + `pvrecorder`), free
  personal-use tier. Requires `PICOVOICE_ACCESS_KEY` in `.env` (Haski
  needs to get one from https://console.picovoice.ai/).
- STT: **faster-whisper**, local, no network. Auto-detects Hebrew /
  English. Pick `small` or `base` model given Haski's 8GB RAM.
- TTS: **edge-tts**, free, Hebrew and English voices from `config.yaml`.
- Status indicator in terminal: `[Listening]` → `[Hearing...]` →
  `[Thinking...]` → `[Speaking...]`.
- Entry point: extend `--daemon` flag in `src/main.py`.
- LaunchAgent registration (`./setup.sh --autostart`) only after the
  daemon is verified working end-to-end.

## File map

```
garvis/
├── GARVIS.command              Manual launcher (double-click)
├── setup.sh                    Installer; --autostart / --uninstall-autostart
├── requirements.txt            Phase 1–4 deps pinned to ranges
├── config.yaml                 All tunables (voices, allowlist, routing)
├── .env                        API keys — DO NOT COMMIT. Has Gemini key now.
├── .env.example                Template (safe to commit)
├── launchd/
│   └── com.garvis.listener.plist.template
├── prompts/
│   ├── system.txt              Core behavior spec (editable)
│   └── personality.txt         Tone knobs (editable)
├── src/
│   ├── main.py                 Entry: --check | --daemon (stub) | default = REPL
│   ├── cli.py                  Phase 1 REPL
│   └── core/
│       ├── config.py           Dot-path over config.yaml + .env
│       ├── lang.py             Hebrew/English detect (U+0590..U+05FF)
│       ├── memory.py           JSON persistence, dot-path
│       ├── conversation.py     Deque, caps at 5 turns (10 entries)
│       ├── router.py           Keyword classifier -> gemini | claude
│       ├── prompt_builder.py   system.txt + personality + memory + lang hint
│       ├── brain_gemini.py     google.generativeai SDK (NEEDS MIGRATION)
│       ├── brain_claude.py     subprocess "claude -p ..."
│       └── errors.py           BrainUnavailable, BrainTimeout, BrainRefused
├── tests/
│   ├── __init__.py
│   └── test_phase1.py          25 offline checks + 1 online smoke
├── plugins/                    Phase 5 lands here
├── data/                       memory.json, stats.json, lessons.json (git-ignored)
└── logs/                       garvis.log, improvements.log (git-ignored)
```

## Known gotchas

- Haski has **no programming experience.** Write commands for him in
  single lines he can copy and paste. Never ask him to edit source
  files by hand unless there's no other way.
- He uses **zsh** (macOS default), not bash. `read -s -p` syntax is
  bash-only; in zsh use `read -s "VAR?prompt: "`.
- He typed his Gemini API key into the cloud chat twice before I could
  stop him. The key currently in his `.env` **is leaked** — he should
  rotate it when convenient. Don't block on this.
- Remote Control for cloud sessions isn't enabled on his account, so
  **this** local-Claude session is the one that can actually touch his
  files. Don't suggest that path.
- Attribution (per Anthropic policy) for commits you make from the
  local session — follow whatever rule is injected into your own
  system prompt; the cloud session used "Co-Authored-By: Claude
  Opus 4.7 <noreply@anthropic.com>" plus a Claude-Session URL. Your
  local policy may differ.

## How to continue

```bash
cd ~/Documents/garvis
.venv/bin/python -m tests.test_phase1
```

Pick up from the failing smoke test. When green, run through the 8
acceptance tests with Haski. When he's happy, start Phase 2.
