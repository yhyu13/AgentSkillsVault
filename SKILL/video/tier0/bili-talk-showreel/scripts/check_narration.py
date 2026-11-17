# -*- coding: utf-8 -*-
"""Check that every stated quantity is backed by the transcript."""
import json
import re
import sys

ARABIC = re.compile(r"\d+")
CHINESE = re.compile(r"[零一二三四五六七八九十百千万两\d]+(?:位数|种|步|周|年|月|天|秒|个|条)?")
CLAIMS = ("讲者", "自述", "估计", "设想", "号召", "产品", "未验证")
WORDS = {
    "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9,
}
UNITS = {"十": 10, "百": 100, "千": 1000, "万": 10000}


def value(token):
    if token.isdigit():
        return int(token)
    total = 0
    current = 0
    while token and token[-1] not in WORDS and token[-1] not in UNITS and not token[-1].isdigit():
        token = token[:-1]
    if not token:
        return None
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


def transcript_values(text):
    spoken = re.sub(r"\[[^\]]+\]", " ", text)
    found = set(int(n) for n in ARABIC.findall(spoken))
    for token in CHINESE.findall(spoken):
        if "位数" in token:
            continue
        number = value(token)
        if number is not None:
            found.add(number)
    words = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
        "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
        "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
        "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
        "million": 1000000, "billion": 1000000000,
    }
    plain = re.sub(r"\s+", " ", spoken)
    for word, number in words.items():
        if re.search(r"\b%s\b" % word, plain, re.I):
            found.add(number)
    number_words = "|".join(words)
    scales = {"hundred": 100, "thousand": 1000, "million": 1000000, "billion": 1000000000}
    pattern = r"\b(%s|\d+)\s+(hundred|thousand|million|billion)s?\b" % number_words
    for count, scale in re.findall(pattern, plain, re.I):
        base = int(count) if count.isdigit() else words[count.lower()]
        found.add(base * scales[scale.lower()])
    return found


def _sensitive_quantity(sentence):
    return any(word in sentence for word in ("百万", "十秒", "十二个月", "七位"))


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    transcript = open(sys.argv[2], encoding="utf-8").read()
    backed = transcript_values(transcript)
    bad = []
    if len(sys.argv) > 3:
        timeline = json.load(open(sys.argv[3], encoding="utf-8"))
        spoken = [(seg["id"], seg["text"]) for seg in spec["segments"]]
        timed = [(seg["id"], seg["text"]) for seg in timeline["segments"]]
        if spoken != timed:
            bad.append("时间轴文本与口播稿不一致")
    for seg in spec["segments"]:
        text = seg["text"]
        for sentence in re.split(r"[。！？；]", text):
            for token in CHINESE.findall(sentence):
                if "位数" in token:
                    continue
                number = value(token)
                if number is None:
                    continue
                if number not in backed:
                    bad.append("%s 数字 %s 不在逐字稿" % (seg["id"], token))
        sensitive = ("Eden", "Eve", "百万", "七位", "十秒", "十二个月")
        for sentence in re.split(r"[。！？；]", text):
            if any(word in sentence for word in sensitive) and not any(word in sentence for word in CLAIMS):
                bad.append("%s 同句没有口径" % seg["id"])
    if bad:
        print("\n".join(bad))
        return 1
    print("narration checked", len(spec["segments"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
