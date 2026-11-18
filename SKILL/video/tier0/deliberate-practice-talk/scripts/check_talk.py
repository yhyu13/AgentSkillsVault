# -*- coding: utf-8 -*-
"""Check a deliberate-practice talk project.

Exit 0 means the required files, qualifiers, backed numbers and media
parameters are present. It does not prove the summary is faithful.
"""
import json
import os
import re
import subprocess
import sys

QUALIFIERS = ("讲者自述", "讲者观察", "讲者转述", "讲者估计", "转写不确定")
SENTENCE_QUALIFIERS = ("讲者自述", "讲者观察", "讲者转述", "讲者估计", "讲者建议", "讲者举例")
ARABIC = re.compile(r"\d+")
CHINESE = re.compile(r"(?:[零一二三四五六七八九十百千万两\d]+)(?:分之[零一二三四五六七八九十两\d]+)?")
WORDS = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
         "六": 6, "七": 7, "八": 8, "九": 9}
UNITS = {"十": 10, "百": 100, "千": 1000, "万": 10000}


def fail(message):
    print(message)
    return 1


def number(token):
    if token.isdigit():
        return int(token)
    if "分之" in token:
        denominator, numerator = token.split("分之", 1)
        return (number(denominator), number(numerator))
    total = current = 0
    for char in token:
        if char in WORDS:
            current = WORDS[char]
        elif char in UNITS:
            unit = UNITS[char]
            if unit == 10000:
                total = (total + current or 1) * unit
            else:
                total += (current or 1) * unit
            current = 0
        else:
            return None
    return total + current


def transcript_numbers(text):
    found = set(int(n) for n in ARABIC.findall(text))
    for token in CHINESE.findall(text):
        value = number(token)
        if value is not None:
            found.add(value)
    words = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "third": (3, 1), "half": (2, 1),
    }
    for word, value in words.items():
        if re.search(r"\b%s\b" % word, text, re.I):
            found.add(value)
    return found


def probe(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type,width,height,avg_frame_rate",
         "-of", "json", path],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def main():
    if len(sys.argv) != 2:
        return fail("usage: check_talk.py <project>")
    root = sys.argv[1]
    transcript = os.path.join(root, "source", "transcript", "transcript_clean.txt")
    claims = os.path.join(root, "source", "transcript", "claims.md")
    narration = os.path.join(root, "reel", "narration.json")
    timeline = os.path.join(root, "reel", "timeline.json")
    video = os.path.join(root, "reel", "out", "final.mp4")
    for path in (transcript, claims, narration, timeline, video):
        if not os.path.isfile(path):
            return fail("missing " + path)
    claim_text = open(claims, encoding="utf-8").read()
    for qualifier in QUALIFIERS:
        if qualifier not in claim_text:
            return fail("claims missing " + qualifier)
    spoken = open(transcript, encoding="utf-8").read()
    backed = transcript_numbers(spoken)
    spec = json.load(open(narration, encoding="utf-8"))
    for segment in spec["segments"]:
        for sentence in re.split(r"[。！？；]", segment["text"]):
            if not sentence.strip():
                continue
            needs_qualifier = bool(re.search(r"\d|[零一二三四五六七八九十百千万两]", sentence))
            if needs_qualifier and not any(word in sentence for word in SENTENCE_QUALIFIERS):
                return fail(segment["id"] + " sentence has no qualifier")
            for token in CHINESE.findall(sentence):
                value = number(token)
                if value is not None and value not in backed:
                    return fail(segment["id"] + " number not backed: " + token)
    timed = json.load(open(timeline, encoding="utf-8"))
    media = probe(video)
    if not media:
        return fail("ffprobe failed")
    streams = media.get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})
    if video_stream.get("width") != 1920 or video_stream.get("height") != 1080:
        return fail("video is not 1920x1080")
    if video_stream.get("avg_frame_rate") != "30/1":
        return fail("video is not 30 fps")
    if not audio_stream:
        return fail("audio missing")
    duration = float(media["format"]["duration"])
    if abs(duration - float(timed["total"])) > 1 / 30:
        return fail("duration mismatch")
    print("OK", root)
    return 0


if __name__ == "__main__":
    sys.exit(main())
