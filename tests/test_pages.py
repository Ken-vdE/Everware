"""Tests for the translation source and the startup-rendered pages."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COPY = json.loads((ROOT / "content" / "copy.json").read_text())


def shape(node):
    """Recursive structure fingerprint: same keys, same list lengths, same leaf types."""
    if isinstance(node, dict):
        return {k: shape(v) for k, v in node.items()}
    if isinstance(node, list):
        return [shape(v) for v in node]
    return type(node).__name__


def test_copy_has_exactly_two_languages():
    assert set(COPY) == {"nl", "en"}


def test_nl_en_have_identical_structure():
    # A key added to one language can't silently miss the other.
    assert shape(COPY["nl"]) == shape(COPY["en"])


def test_nav_aria_key_present():
    assert COPY["nl"]["navAria"] == "Hoofdnavigatie"
    assert COPY["en"]["navAria"] == "Main navigation"
