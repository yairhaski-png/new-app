"""Per-utterance language detection.

Hebrew script (U+0590..U+05FF) in the text means Hebrew. Otherwise English.
Garvis only needs these two for now.
"""

from __future__ import annotations

import re

_HEBREW = re.compile(r"[֐-׿]")


def detect(text: str) -> str:
    return "he" if _HEBREW.search(text) else "en"


def name(code: str) -> str:
    return {"he": "Hebrew", "en": "English"}.get(code, "English")
