"""Garvis error types.

Narrow enough to let the caller decide whether to retry, fall back to the
other brain, or surface a message to the user.
"""


class BrainError(Exception):
    """Base class for brain failures."""


class BrainUnavailable(BrainError):
    """Network error, missing key, dead binary — this brain can't answer."""


class BrainTimeout(BrainError):
    """Brain took too long to answer."""


class BrainRefused(BrainError):
    """Brain answered but refused (safety, rate limit, policy)."""
