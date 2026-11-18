#!/bin/bash
# GARVIS manual launcher. Double-click this file in Finder, or run from Terminal:
#   ./GARVIS.command
#
# It activates the project's Python venv and runs src/main.py. No system
# Python needed — setup.sh built the venv already.

set -e

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$HERE"

if [ ! -d ".venv" ]; then
  echo "ERROR: .venv not found. Run ./setup.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate

exec python -u src/main.py "$@"
