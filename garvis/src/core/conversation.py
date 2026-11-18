"""Rolling conversation buffer — last N turns.

A "turn" is one user message + one assistant reply, so N turns is 2N entries
in the deque. Older messages fall off the back automatically.
"""

from __future__ import annotations

from collections import deque
from typing import Literal

Role = Literal["user", "assistant"]


class Conversation:
    def __init__(self, max_turns: int = 5) -> None:
        self._history: deque[dict] = deque(maxlen=max_turns * 2)

    def add(self, role: Role, text: str) -> None:
        self._history.append({"role": role, "content": text})

    def as_list(self) -> list[dict]:
        return list(self._history)

    def as_text(self) -> str:
        return "\n".join(
            f"{'User' if m['role'] == 'user' else 'Garvis'}: {m['content']}"
            for m in self._history
        )

    def __len__(self) -> int:
        return len(self._history)

    def clear(self) -> None:
        self._history.clear()
