# -*- coding: utf-8 -*-
"""Gate the narration script before any TTS is paid for.

    python check_narration.py reel/narration.json source/transcript/transcript_clean.txt [reel/timeline.json]
    python check_narration.py --selftest

Exit codes
  0  clean
  1  content failure (the list below)
  2  wrong usage (missing arguments)
  3  the timeline argument is not the schema this gate can read
     (no segments / no tail) — fix the file, do not loosen the gate

Hard failures (exit 1)
  1. schema      voice/rate/segments, ids unique, chapter non-empty
  2. length      70..130 汉字 per segment (env NARR_MIN_CHARS / NARR_MAX_CHARS)
  2b. count      8..16 segments (env NARR_MIN_SEGMENTS / NARR_MAX_SEGMENTS)
  2c. pacing     estimated 5..30 s per segment at 4.4 字/秒 (env NARR_CPS);
                 a latin word counts as two 汉字 so "Codex" does not shrink it
  3. numbers     every quantity in the script must exist in the transcript
  4. absolutes   最好/唯一/一定/必然/保证/绝对/从不 ... need an attribution
                 marker in the same sentence (讲者/自述/他说/案例/估计/未验证)
  5. timeline    with a third argument: same ids, same order, same text, and
                 starts strictly increasing with no overlap

Known limit, deliberately stated instead of hidden: this compares the *set of
quantities*, so "90 人" in the transcript and "90%" in the script both count as
90. It catches a number that was invented or mistyped (99 for 20, 2.1 万 for
2.9 万), it does not catch a number moved onto the wrong noun. Read the sentence
back after changing one.

Why numbers and absolutes: a narrated recap is compressed, not rewritten. The
two ways that compression turns into fabrication are (a) inventing a figure and
(b) promoting a single case into a rule. Both are mechanical here.

--selftest writes one passing and one failing pair to a temp dir and asserts the
exit codes, so a reviewer can check the checker without reading it.
"""
import json
import os
import re
import sys
import tempfile

CJK = re.compile(r"[\u3400-\u9fff]")
ARABIC = re.compile(r"(\d+(?:\.\d+)?)\s*(万|千|亿)?")
NUM_TOKEN = re.compile(r"[零一二三四五六七八九十百千万亿两\d]+")
SCALE = {"万": 10000, "千": 1000, "亿": 100000000}
DIGITS = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
          "六": 6, "七": 7, "八": 8, "九": 9}
UNITS = {"十": 10, "百": 100, "千": 1000, "万": 10000, "亿": 100000000}
ABSOLUTE = ("最好", "最贵", "最省", "最快", "最稳", "唯一", "一定", "必然",
            "保证", "绝对", "从不", "全都", "毫无疑问", "证明")
ATTRIBUTION = ("讲者", "自述", "他说", "他的", "按他", "案例", "估计", "设想",
               "号召", "未验证", "原片", "这次")
PUNCT = "，。、；：？！,.;:?!「」“”‘’（）()【】《》 \n\t"


def spoken_value(token):
    """'三十' -> 30, '两' -> 2, '四百八十' -> 480, '二十一万' -> 210000.

    Section-based parser. 万/亿 multiply a whole section instead of defaulting a
    missing digit to 1: the earlier `(current or 1)` form mapped both 二十万 and
    二十一万 to 210000, so a wrong figure could pass the number gate.
    """
    if not token:
        return None
    if token.isdigit():
        return int(token)
    total, section, number, last_big = 0, 0, 0, 1
    for ch in token:
        if ch in DIGITS:
            number = DIGITS[ch]
        elif ch in ("十", "百", "千"):
            unit = UNITS[ch]
            if number == 0:
                number = 1          # 十二 / 百 的省略写法
            section += number * unit
            number = 0
        elif ch in ("万", "亿"):
            unit = UNITS[ch]
            section += number
            number = 0
            if unit == 100000000:
                total = (total + section) * unit
            else:
                total += section * unit
            section = 0
            last_big = unit
        else:
            return None
    # 口语省掉下一级：一万二 = 12000，两万九 = 29000。有「零」就不放大。
    if number and last_big >= 10000 and "零" not in token:
        return total + section + number * (last_big // 10)
    return total + section + number


def numbers_in(text):
    """Every quantity a sentence states, as an integer scaled by 100.

    Decimals and 万/千/亿 are normalised, so 2.9 万 (290 万) never equals 2.1 万.
    """
    text = re.sub(r"\[[^\]]*\]", " ", text)           # drop [mm:ss-mm:ss]
    # 人工校正稿常见 00:16.00-00:55.00 或表格式时间码：不剥掉就会被当成 16/55 两个数字
    text = re.sub(r"\d{1,2}:\d{2}(?:[.:]\d{2})?", " ", text)
    found = set()
    for number, unit in ARABIC.findall(text):
        value = float(number) * SCALE.get(unit, 1)
        found.add(int(round(value * 100)))
    for token in NUM_TOKEN.findall(text):
        if token.isdigit() or token in ("万", "亿"):   # a bare 万 is a unit, not a count
            continue
        value = spoken_value(token)
        if value is not None:
            found.add(int(round(value * 100)))
    return found


def strip_punct(text):
    return "".join(ch for ch in text if ch not in PUNCT)


def sentences(text):
    return [s for s in re.split(r"[。！？；!?;]", text) if s.strip()]


LATIN_WORD = re.compile(r"[A-Za-z][A-Za-z0-9'\-]*")
CPS = float(os.environ.get("NARR_CPS", 4.4))
MIN_SEGMENTS = int(os.environ.get("NARR_MIN_SEGMENTS", 8))
MAX_SEGMENTS = int(os.environ.get("NARR_MAX_SEGMENTS", 16))
MIN_SEC = float(os.environ.get("NARR_MIN_SEC", 5))
MAX_SEC = float(os.environ.get("NARR_MAX_SEC", 30))


def estimate_seconds(text):
    """Spoken length estimate: CJK chars count 1, a latin word counts 2."""
    cjk = len(CJK.findall(text))
    latin = len(LATIN_WORD.findall(text)) * 2
    return (cjk + latin) / CPS


# 机器输出是 [mm:ss-mm:ss]；人工校正稿常见 mm:ss.mm–mm:ss.mm 或表格式时间码，都算。
STAMP = re.compile(r"\d{1,2}:\d{2}")


def transcript_is_usable(transcript):
    """A transcript with no timestamps or almost no Chinese backs nothing.

    Before this check an empty file passed the whole gate: no numbers to find,
    nothing to contradict, so every fabricated figure looked "backed".
    """
    stamped = sum(1 for line in transcript.splitlines() if STAMP.search(line))
    chars = len(CJK.findall(transcript))
    need_stamp = int(os.environ.get("NARR_MIN_STAMPED", 3))
    need_chars = int(os.environ.get("NARR_MIN_TR_CHARS", 200))
    if stamped < need_stamp:
        return "逐字稿只有 %d 行带时间码（至少 %d 行）：先跑 asr，不要拿空文件过闸" % (stamped, need_stamp)
    if chars < need_chars:
        return "逐字稿只有 %d 个汉字（这条线的下限 %d）：短片子把 NARR_MIN_TR_CHARS 调小，并写下理由" % (chars, need_chars)
    return None


def check(spec, transcript, timeline=None, min_chars=70, max_chars=130,
          min_segments=None, max_segments=None):
    bad = []
    broken = transcript_is_usable(transcript)
    if broken:
        return [broken]
    if not isinstance(spec.get("segments"), list) or not spec["segments"]:
        return ["narration.json 没有 segments"]
    for key in ("voice", "rate"):
        if not spec.get(key):
            bad.append("narration.json 缺 %s" % key)
    n_seg = len(spec["segments"])
    lo = MIN_SEGMENTS if min_segments is None else min_segments
    hi = MAX_SEGMENTS if max_segments is None else max_segments
    if not (lo <= n_seg <= hi):
        bad.append("段数 %d 超出 %d..%d：少了讲不完，多了变成念稿" % (n_seg, lo, hi))

    backed = numbers_in(transcript)
    seen = set()
    for seg in spec["segments"]:
        sid = (seg.get("id") or "").strip()
        if not sid:
            bad.append("有一段缺 id：id 会变成文件名与时间轴主键，缺了后面必然炸")
            sid = "?"
        text = (seg.get("text") or "").strip()
        if sid in seen:
            bad.append("%s id 重复" % sid)
        seen.add(sid)
        chapter = (seg.get("chapter") or "").strip()
        if not chapter:
            bad.append("%s 缺 chapter" % sid)
        # 屏幕上出现的任何一句都按同一套口径检查：绝对化判断必须带出处
        for field in ("chapter", "metric", "title"):
            raw = str(seg.get(field) or "")
            if raw and any(w in raw for w in ABSOLUTE) and not any(w in raw for w in ATTRIBUTION):
                bad.append("%s 的 %s 有绝对化判断但没有口径：%s" % (sid, field, raw))
        for tag in seg.get("tags") or []:
            if any(w in str(tag) for w in ABSOLUTE) and not any(w in str(tag) for w in ATTRIBUTION):
                bad.append("%s 的 tags 有绝对化判断但没有口径：%s" % (sid, tag))
            for value in sorted(numbers_in(str(tag))):
                if value not in backed:
                    bad.append("%s 的 tags 里数字 %s 不在逐字稿：%s" % (sid, value / 100.0, tag))
        # chapter / metric / title 也会被画到屏幕上，数字一样要能在逐字稿里找到
        for field in ("chapter", "metric", "title"):
            raw = seg.get(field)
            if not raw:
                continue
            for value in sorted(numbers_in(str(raw))):
                if value not in backed:
                    shown = value / 100.0
                    bad.append("%s 的 %s 里数字 %s 不在逐字稿：%s"
                               % (sid, field,
                                  int(shown) if float(shown).is_integer() else shown, raw))
        n = len(CJK.findall(text))
        if not (min_chars <= n <= max_chars):
            bad.append("%s 正文 %d 字，超出 %d..%d" % (sid, n, min_chars, max_chars))
        seconds = estimate_seconds(text)
        if not (MIN_SEC <= seconds <= MAX_SEC):
            bad.append("%s 估算 %.1fs（4.4 字/秒），超出 %.0f..%.0f 秒"
                       % (sid, seconds, MIN_SEC, MAX_SEC))
        for sentence in sentences(text):
            for value in sorted(numbers_in(sentence)):
                if value not in backed:
                    shown = value / 100.0
                    bad.append("%s 数字 %s 不在逐字稿：%s"
                               % (sid, int(shown) if float(shown).is_integer() else shown,
                                  sentence.strip()))
            if any(w in sentence for w in ABSOLUTE) and not any(
                    w in sentence for w in ATTRIBUTION):
                bad.append("%s 绝对化判断没有口径：%s" % (sid, sentence.strip()))

    if timeline is not None:
        if "segments" not in timeline or "tail" not in timeline:
            raise SystemExit(3)
        timed = timeline.get("segments") or []
        spoken = [(s.get("id"), (s.get("text") or "").strip()) for s in spec["segments"]]
        rendered = [(s.get("id"), (s.get("text") or "").strip()) for s in timed]
        if len(spoken) != len(rendered):
            bad.append("段数不一致：稿 %d / 时间轴 %d" % (len(spoken), len(rendered)))
        else:
            for (a_id, a), (b_id, b) in zip(spoken, rendered):
                if a_id != b_id or a != b:
                    bad.append("时间轴与稿不一致：%s vs %s" % (a_id, b_id))
                    break
        cursor = -1.0
        for seg in timed:
            start, end = float(seg.get("start", 0)), float(seg.get("end", 0))
            if not (start >= cursor - 1e-6):
                bad.append("%s 起点 %s 早于上一段终点 %s" % (seg.get("id"), start, cursor))
            if end <= start:
                bad.append("%s 终点不晚于起点" % seg.get("id"))
            cursor = end
        total = float(timeline.get("total", 0))
        if timed and abs(total - (cursor + float(timeline.get("tail", 0)))) > 0.05:
            bad.append("total %.2f 不等于末段终点 %.2f + 收尾" % (total, cursor))
    return bad


def _selftest():
    transcript = (
        "[00:01-00:05] 这条视频是二十秒的一镜到底，白模改了五版，原片是七百二十p。\n"
        "[00:05-00:12] 他把同一个镜头拆成三次预演，每次只改一个变量，改完立刻回看。\n"
        "[00:12-00:20] 讲者说这套流程省时间的地方不在生成，而在早期的判断：什么时候该停。\n"
        "[00:20-00:28] 后面是具体的五个步骤，每一步都配一张对比图，最后一段是踩过的坑。\n"
        "[00:28-00:40] 他说预演阶段最贵的不是算力而是来回改，所以先把构图、机位和光位定死，再交给生成，"
        "这样每一步都能回退到一个确定的版本，而不是在几十个变量里猜。白模、材质、灯光、镜头和景深是五层，"
        "每二层只改一个，一次只验证一件事，否则出了问题也分不清是哪一层的问题。\n"
    )
    timeline = {"total": 6.0, "tail": 2.6, "segments": [
        {"id": "s01", "start": 1.4, "end": 3.4, "text": ""}]}
    good = {"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
        {"id": "s01", "chapter": "开场", "text": "讲者这条视频是二十秒的一镜到底，" + "白" * 68}]}
    bad_num = {"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
        {"id": "s01", "chapter": "开场", "text": "这次一镜到底长达九十九秒，" + "白" * 68}]}
    bad_abs = {"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
        {"id": "s01", "chapter": "开场", "text": "这是最省成本的方法，" + "白" * 68}]}
    bad_dec = {"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
        {"id": "s01", "chapter": "开场", "text": "这次花了 2.1 万，" + "白" * 68}]}

    tmp = tempfile.mkdtemp()
    tpath = os.path.join(tmp, "t.txt")
    with open(tpath, "w", encoding="utf-8") as f:
        f.write(transcript)

    # the samples are one-segment fixtures: relax the count gate so each case
    # tests exactly one rule
    ok_errors = check(good, transcript, None, 40, 130, 1, 1)
    num_errors = check(bad_num, transcript, None, 40, 130, 1, 1)
    abs_errors = check(bad_abs, transcript, None, 40, 130, 1, 1)
    dec_errors = check(bad_dec, transcript, None, 40, 130, 1, 1)
    # timeline with mismatched text must fail even when numbers are fine
    timeline["segments"][0]["text"] = "别的文本"
    tl_errors = check(good, transcript, timeline, 40, 130, 1, 1)

    print("good      ->", ok_errors or "PASS")
    print("bad num   ->", num_errors or "NO FAIL (broken)")
    print("bad absol ->", abs_errors or "NO FAIL (broken)")
    print("bad dec   ->", dec_errors or "NO FAIL (broken)")
    print("bad time  ->", tl_errors or "NO FAIL (broken)")

    # 数词归一：万位不能塔，一万二不能算成 10002
    parse_ok = (spoken_value("一万二") == 12000 and spoken_value("两万九") == 29000
                and spoken_value("二十一万") == 210000
                and spoken_value("二十万") == 200000
                and spoken_value("十一万") == 110000
                and spoken_value("十万") == 100000)
    print("parse     ->", "PASS" if parse_ok else "NO FAIL (broken): %s"
          % [(t, spoken_value(t)) for t in ("一万二", "二十一万", "二十万")])

    # 空逐字稿必须被拦：没有内容就没有任何数字是“有据”的
    empty_errors = check(good, "", None, 40, 130, 1, 1)
    print("bad trans ->", empty_errors or "NO FAIL (broken)")
    # 缺 id：会在 tts 阶段变成一个没有主键的文件
    noid = {"voice": "zh-CN-YunyangNeural", "rate": "+0%", "segments": [
        {"id": "", "chapter": "开场", "text": "讲者这条视频是二十秒的一镜到底，" + "白" * 68}]}
    noid_errors = check(noid, transcript, None, 40, 130, 1, 1)
    print("bad id    ->", noid_errors or "NO FAIL (broken)")

    if (ok_errors or not num_errors or not abs_errors or not dec_errors
            or not tl_errors or not empty_errors or not noid_errors or not parse_ok):
        return 1
    print("SELFTEST PASS")
    return 0


def main():
    argv = [a for a in sys.argv[1:]]
    if "--selftest" in argv:
        return _selftest()
    if len(argv) < 2:
        print(__doc__)
        return 2
    spec = json.load(open(argv[0], encoding="utf-8"))
    transcript = open(argv[1], encoding="utf-8").read()
    timeline = json.load(open(argv[2], encoding="utf-8")) if len(argv) > 2 else None
    min_chars = int(os.environ.get("NARR_MIN_CHARS", 70))
    max_chars = int(os.environ.get("NARR_MAX_CHARS", 130))
    bad = check(spec, transcript, timeline, min_chars, max_chars)
    if bad:
        print("\n".join(bad))
        return 1
    chars = sum(len(CJK.findall(s["text"])) for s in spec["segments"])
    print("OK segments=%d chars=%d 预计 %.0fs（%.1f 字/秒）"
          % (len(spec["segments"]), chars, chars / 5.0, 5.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
