# -*- coding: utf-8 -*-
"""Sentence splitting shared by the content gate and the narration writer.

Both must agree: the gate validates what the writer will actually emit. When they
disagreed, a 38-character sentence passed the gate and produced a 3-line cue that
the subtitle gate then rejected, after the expensive TTS step.
"""
from __future__ import annotations

import re

SPLIT = re.compile(r"(?<=[。！？；!?;])")
CJK = re.compile(r"[\u4e00-\u9fff]")
MIN_FRAGMENT = 8


def cjk_len(text: str) -> int:
    return len(CJK.findall(text))


def split_sentences(text: str, min_fragment: int = MIN_FRAGMENT) -> list[str]:
    parts = [p.strip() for p in SPLIT.split(text or "") if p.strip()]
    merged: list[str] = []
    for p in parts:
        if merged and cjk_len(merged[-1]) < min_fragment:
            merged[-1] = merged[-1] + p
        else:
            merged.append(p)
    return merged
