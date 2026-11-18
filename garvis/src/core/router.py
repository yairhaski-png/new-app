"""Brain routing — Gemini (fast) or Claude (heavy).

Phase 1 uses a keyword classifier. No LLM call just to pick an LLM.
Anything that smells like computer control, planning, or multi-step work
goes to Claude. Everything else — trivia, chat, math, weather talk — goes
to Gemini. The keyword set is deliberately conservative; false negatives
are fine (Gemini will still answer) because the safety-critical actions
require Claude anyway and Phase 1 has no actions wired up yet.
"""

from __future__ import annotations

from . import config


TOOL_KEYWORDS_EN = {
    "open ", "close ", "launch", "quit ", "kill ", "start ", "stop ",
    "remind", "reminder", "timer", "schedule", "alarm",
    "play ", "pause", "skip",
    "delete", "remove", "trash", "move file", "rename",
    "send ", "email ", "message ", "post ", "tweet",
    "screenshot", "screen shot",
    "type ", "paste",
    "install", "update ",
    "search for", "look up", "find me",
    "turn on", "turn off",
    "volume",
}

TOOL_KEYWORDS_HE = {
    "פתח", "סגור", "הפעל", "כבה", "עצור",
    "תזכיר", "טיימר", "התראה", "אזעקה",
    "נגן", "השהה", "דלג",
    "מחק", "הסר", "העבר",
    "שלח", "אימייל", "הודעה", "פרסם",
    "צילום מסך", "צלם מסך",
    "הקלד", "הדבק",
    "התקן", "עדכן",
    "חפש", "מצא לי",
    "הדלק", "כבה",
    "ווליום", "עוצמה",
}


def choose(user_text: str) -> str:
    """Return 'gemini' or 'claude'."""
    lower = user_text.lower()
    for kw in TOOL_KEYWORDS_EN:
        if kw in lower:
            return "claude"
    for kw in TOOL_KEYWORDS_HE:
        if kw in user_text:
            return "claude"
    return config.get("brains.default", "gemini")
