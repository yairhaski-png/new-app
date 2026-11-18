# Garvis — Personal Voice AI Assistant

Voice assistant for macOS, inspired by JARVIS. Bilingual Hebrew/English. Free-tier only.

**Status: Phase 1 — text chat working. No voice yet.**

## What's built so far

**Phase 0 (scaffolding — done)**
- Project folder, installer, LaunchAgent template, editable prompts, config.

**Phase 1 (text brain — done)**
- `./GARVIS.command` opens a terminal REPL you can type to.
- Gemini handles chat/trivia; Claude is wired in for tool-shaped requests
  and as a fallback when Gemini fails.
- Bilingual auto-detect per turn (Hebrew script → Hebrew reply).
- Cross-session memory (`data/memory.json`) — remembers your name across
  restarts.
- Rolling 5-turn conversation context.
- Graceful degradation: "I can't reach the AI service right now" instead
  of a crash when both brains fail.
- Offline test harness: `.venv/bin/python -m tests.test_phase1`.

## Quickstart for your Mac (no programming experience needed)

Open the Terminal app on your Mac (Applications → Utilities → Terminal) and paste these commands one at a time. Each command does one thing. If any step shows an error in red, stop and tell me.

**1. Make sure Homebrew and Python 3 are installed.** If you already have them, skip.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python@3.12 portaudio ffmpeg
```

**2. Get the Garvis code onto your Mac.** We're going to clone this repo and move the `garvis` folder to your Documents.

```bash
cd ~
git clone https://github.com/yairhaski-png/new-app.git garvis-source
mv garvis-source/garvis ~/Documents/garvis
cd ~/Documents/garvis
```

**3. Run the installer.**

```bash
./setup.sh
```

This creates a Python virtual environment inside the project (`.venv/`), installs all dependencies, and copies `.env.example` → `.env`.

**4. Fill in your Gemini API key.** Open `.env` in your editor and paste
your key after `GEMINI_API_KEY=`. Get one free at
`https://aistudio.google.com/apikey` if you don't have it.

```bash
open -e .env     # TextEdit opens, paste the key, save, close
```

**5. Open the chat.**

```bash
./GARVIS.command
```

You should see the REPL prompt:

```
GARVIS — Phase 1 text chat
Type 'exit', 'quit', or Ctrl+D to leave.
============================================================

you >
```

Try: `what is the capital of France?` → Gemini answers.
Try: `my name is Haski` → remembered. Restart, ask `what's my name?` → still remembers.
Try: `מה השעה באיטליה?` → answers in Hebrew.

**6. Run the test harness any time:**

```bash
.venv/bin/python -m tests.test_phase1
```

Shows 25+ `[OK]` lines and exits 0 when everything's fine.

## What's next (not built yet)

- **Phase 2:** Wake word (Porcupine), speech-to-text (faster-whisper),
  text-to-speech (Edge TTS). You say "Hey Garvis" and talk.
- **Phase 3:** HUD overlay with the status orb.
- **Phase 4:** Computer control (open apps, weather, timers, battery, YouTube).
- **Phase 5:** Plugin system + self-improvement (lessons, corrections).

## Folder layout

```
garvis/
├── GARVIS.command              Double-click launcher (Mac)
├── setup.sh                    One-shot installer
├── requirements.txt            Python packages
├── config.yaml                 Settings (voices, language, allowlist, etc.)
├── .env.example                Template for API keys (copied to .env by setup)
├── .gitignore
├── launchd/
│   └── com.garvis.listener.plist.template   LaunchAgent template
├── src/
│   ├── main.py                 Entry point (--check for boot test, default = REPL)
│   ├── cli.py                  Phase 1 text REPL
│   └── core/                   config, memory, lang, router, brains, prompts
├── tests/
│   └── test_phase1.py          25+ offline checks, +1 online smoke
├── prompts/
│   ├── system.txt              Core system prompt (editable)
│   └── personality.txt         Personality knobs (editable)
├── plugins/                    Phase 5 plugins land here
├── data/                       Runtime memory, lessons (git-ignored)
└── logs/                       Runtime logs (git-ignored)
```

## Budget

Zero dollars. Everything used here is free or a free tier:

| Component | Free? |
|-----------|-------|
| Picovoice Porcupine | Free tier (personal, non-commercial) |
| faster-whisper (local) | Free, runs on your Mac |
| Edge TTS | Free |
| Gemini API | Free tier (1500 requests/day on 2.0 Flash) |
| Claude via `claude -p` | Uses your Claude Pro/Max subscription (no extra API cost) |
| Open-Meteo (weather) | Free, no key needed |

If anything ever tries to charge money, Garvis stops and asks first. That's an Iron Rule.
