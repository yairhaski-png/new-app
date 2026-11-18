#!/bin/bash
# Garvis installer. Run once from the project root:
#   ./setup.sh
#
# What it does:
#   1. Verifies Python 3.10+ is available.
#   2. Creates a virtual environment in .venv/ (project-local, isolated).
#   3. Installs requirements.txt.
#   4. Copies .env.example -> .env if .env doesn't exist yet.
#   5. Renders the LaunchAgent plist template with your real paths
#      (it stays unregistered until you pass --autostart; Phase 0 does NOT
#       auto-register it because there's no listener to start yet).
#
# Flags:
#   --autostart   Also register the LaunchAgent via launchctl. Only use this
#                 after Phase 2 is working and you want Garvis to start on login.
#   --uninstall-autostart
#                 Unregister the LaunchAgent (safe no-op if not installed).

set -euo pipefail

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$HERE"

AUTOSTART=0
UNINSTALL_AUTOSTART=0
for arg in "$@"; do
  case "$arg" in
    --autostart) AUTOSTART=1 ;;
    --uninstall-autostart) UNINSTALL_AUTOSTART=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# -----------------------------------------------------------------------------
echo "==> Garvis setup"
echo "    Project:  $HERE"
echo "    User:     $USER"
echo "    OS:       $(uname -s) $(uname -r)"
echo

# -----------------------------------------------------------------------------
# Handle uninstall-autostart first (doesn't need Python).
LA_DIR="$HOME/Library/LaunchAgents"
LA_PLIST="$LA_DIR/com.garvis.listener.plist"
LA_LABEL="com.garvis.listener"

if [ "$UNINSTALL_AUTOSTART" -eq 1 ]; then
  if [ -f "$LA_PLIST" ]; then
    echo "==> Unregistering LaunchAgent"
    launchctl bootout "gui/$(id -u)" "$LA_PLIST" 2>/dev/null || true
    rm -f "$LA_PLIST"
    echo "    Removed $LA_PLIST"
  else
    echo "==> LaunchAgent not installed; nothing to do."
  fi
  exit 0
fi

# -----------------------------------------------------------------------------
# 1. Python version check.
PY_BIN=""
for candidate in python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PY_BIN="$candidate"
    break
  fi
done

if [ -z "$PY_BIN" ]; then
  echo "ERROR: No python3 found. Install Python 3.10+ (brew install python@3.12)." >&2
  exit 1
fi

PY_VER=$("$PY_BIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')
PY_MAJOR=${PY_VER%%.*}
PY_MINOR=${PY_VER##*.}

if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
  echo "ERROR: Python $PY_VER is too old. Need 3.10+ (brew install python@3.12)." >&2
  exit 1
fi

echo "==> Using $PY_BIN ($PY_VER)"

# -----------------------------------------------------------------------------
# 2. Virtual env.
if [ ! -d ".venv" ]; then
  echo "==> Creating virtual environment in .venv/"
  "$PY_BIN" -m venv .venv
else
  echo "==> .venv/ already exists, reusing"
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> Upgrading pip"
python -m pip install --quiet --upgrade pip wheel

# -----------------------------------------------------------------------------
# 3. Dependencies.
echo "==> Installing requirements (this can take a few minutes the first time)"
python -m pip install --quiet -r requirements.txt

# -----------------------------------------------------------------------------
# 4. .env bootstrap.
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example"
  echo "    Edit .env and fill in GEMINI_API_KEY (and PICOVOICE_ACCESS_KEY for Phase 2+)."
else
  echo "==> .env already exists, leaving it alone"
fi

# -----------------------------------------------------------------------------
# 5. Render LaunchAgent plist (stored in launchd/, NOT in ~/Library yet).
PLIST_TEMPLATE="launchd/com.garvis.listener.plist.template"
PLIST_RENDERED="launchd/com.garvis.listener.plist"

if [ -f "$PLIST_TEMPLATE" ]; then
  echo "==> Rendering LaunchAgent plist"
  sed -e "s|{{PROJECT_DIR}}|$HERE|g" \
      -e "s|{{USER_HOME}}|$HOME|g" \
      -e "s|{{LABEL}}|$LA_LABEL|g" \
      "$PLIST_TEMPLATE" > "$PLIST_RENDERED"
fi

# -----------------------------------------------------------------------------
# 6. Autostart (opt-in).
if [ "$AUTOSTART" -eq 1 ]; then
  if [ ! -f "$PLIST_RENDERED" ]; then
    echo "ERROR: $PLIST_RENDERED not found; can't register LaunchAgent." >&2
    exit 1
  fi
  mkdir -p "$LA_DIR"
  cp "$PLIST_RENDERED" "$LA_PLIST"
  # bootout any previous instance, bootstrap the new one.
  launchctl bootout "gui/$(id -u)" "$LA_PLIST" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$LA_PLIST"
  echo "==> LaunchAgent registered at $LA_PLIST"
  echo "    Garvis will start on login. To remove: ./setup.sh --uninstall-autostart"
else
  echo "==> LaunchAgent NOT registered (pass --autostart after Phase 2 to enable it)."
fi

# -----------------------------------------------------------------------------
echo
echo "==> Done."
echo "    Test with:  ./GARVIS.command"
