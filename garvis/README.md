# Garvis — Personal Voice AI Assistant

Voice assistant for macOS, inspired by JARVIS. Bilingual Hebrew/English. Free-tier only.

**Status: Phase 0 — scaffolding complete. No voice yet. No AI yet. Just the skeleton.**

## What this phase gives you

- Project folder structure
- Python virtual environment installer (`setup.sh`)
- Manual launcher (`GARVIS.command`)
- LaunchAgent plist template (not registered yet — waiting for Phase 2 when the listener exists)
- Config file (`config.yaml`) with all the knobs
- Prompt files you can edit later
- Placeholder entry point that prints a boot message and exits

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

**4. Test Phase 0 — the boot message.**

```bash
./GARVIS.command
```

You should see:

```
GARVIS boot check
Python: 3.12.x
Config loaded: Garvis (wake word: Hey Garvis)
Phase 0 scaffolding OK. No voice pipeline yet.
```

If you see that, Phase 0 passes. Tell me and we'll move to Phase 1.

## What's next (not built yet)

- **Phase 1:** Text chat in terminal through Gemini + Claude
- **Phase 2:** Wake word + speech-to-text + text-to-speech
- **Phase 3:** HUD overlay
- **Phase 4:** Computer control (open apps, weather, timers, etc.)
- **Phase 5:** Plugin system + self-improvement

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
│   ├── main.py                 Entry point
│   └── core/                   (phase 1+ modules go here)
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
