"""booth_1 构建脚本：Edge TTS 口播 → 词级时间戳 → 动作提示点 / 字幕 → HyperFrames 视频工程。

用法（在仓库根目录）：
    python assets/day1025/booth/booth_1/build.py            # 生成口播 + timings + 视频工程
    python assets/day1025/booth/booth_1/build.py --skip-tts # 只用已有 mp3/timings 重写视频工程

产物：
    tts/s1..s4.mp3           每页一段口播（edge-tts，zh-CN-XiaoxiaoNeural）
    tts/timings.json         每页时长、字幕分段、动作提示点（秒，相对本页起点）
    tts/timings.js           同上，挂到 window.BOOTH_TIMINGS，给 slides.html 在 file:// 下读
    video/index.html         由 video.src.html 填入时间生成的 HyperFrames 合成
    video/assets/*.mp3       口播拷贝，供 HyperFrames 渲染混音

时长全部用 ffprobe 实测，不估算。
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TTS_DIR = HERE / "tts"
VIDEO_DIR = HERE / "video"
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "+6%"

# 每页：口播正文 + 动作提示点（cue id → 正文里的关键词，取关键词开口那一刻）
SLIDES = [
    {
        "id": "s1",
        "title": "封面",
        "text": (
            "这是北美十四校二组，为XX客车做的全域获客模型。"
            "客户调研告诉我们：XX客车的三类客群，问的不是这条内容火不火，而是我能不能信你。"
            "这一分钟只演示最前面的两项能力：把内容做对，把问题答准。"
        ),
        "cues": {"trust": "客户调研", "cards": "两项能力", "ab1": "把内容做对", "ab2": "把问题答准"},
    },
    {
        "id": "s2",
        "title": "能力一 · 内容资产引擎",
        "text": (
            "第一项，内容资产引擎。"
            "标签字典由人工定死，AI 只做映射、不许自己造标签；"
            "近三个月八千六百条样本跑下来，"
            "哪些因子真能带动收藏、哪些只是伴随、哪些是跟风热点，三档分清。"
            "像蹭智驾热点这种，命中就拦截。"
            "接入新文案预检：爆款概率百分之六十三，带置信区间和校准误差；"
            "标签匹配度、组合建议、高风险标注，一次给全。"
            "发布后效果按三天、七天、十四天回流，分布漂移超阈值自动重训。"
        ),
        "cues": {
            "dict": "标签字典",
            "tier": "三档分清",
            "block": "拦截",
            "prob": "百分之六十三",
            "match": "标签匹配度",
            "back": "回流",
        },
    },
    {
        "id": "s3",
        "title": "能力二 · CQ 行业问题库",
        "text": (
            "第二项，CQ 行业问题库。"
            "公交运营商、海外客户、行业伙伴的十二个真实提问，"
            "我们逐条对到公开资料卡和审核意见："
            "八条有可用事实，三条要说清还没到哪一步，一条没有依据。"
            "比如这一条：有没有数据证明运营成本下降百分之三十？"
            "审核已判待补依据，拿到测算材料之前，系统禁止它进入任何对外内容。"
        ),
        "cues": {
            "seg1": "公交运营商",
            "seg2": "海外客户",
            "seg3": "行业伙伴",
            "segall": "我们逐条",
            "ev": "八条",
            "open": "比如这一条",
            "block": "禁止",
        },
    },
    {
        "id": "s4",
        "title": "收尾",
        "text": (
            "内容资产引擎决定内容长什么样，"
            "问题库决定说什么，找客户模型决定对谁说。"
            "后面的画像、触达和持续学习，都从这三步接出去。"
            "欢迎到展位亲手点一点。"
            "客户问题与事实编号来自我们的客户调研，企业数等统计为演示用模拟数据。"
        ),
        "cues": {"c1": "内容资产引擎", "c2": "问题库", "c3": "找客户模型", "rest": "后面的", "cta": "欢迎", "note": "客户问题与事实编号"},
    },
]

# 字幕：先按句末标点切，过长再按逗号切
CAPTION_MAX = 24


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return round(float(out), 3)


async def synth(slide: dict) -> list[dict]:
    import edge_tts

    comm = edge_tts.Communicate(slide["text"], VOICE, rate=RATE, boundary="WordBoundary")
    mp3 = TTS_DIR / f"{slide['id']}.mp3"
    words: list[dict] = []
    with mp3.open("wb") as fh:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                fh.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({
                    "t": round(chunk["offset"] / 1e7, 3),
                    "d": round(chunk["duration"] / 1e7, 3),
                    "w": chunk["text"],
                })
    if not words:
        raise RuntimeError(f"{slide['id']}: edge-tts 没返回词边界，无法对齐动作点")
    return words


def align(text: str, words: list[dict]) -> list[dict]:
    """把每个词边界对回正文的字符位置。对不上的词（数字读法被改写等）跳过，不推进游标。"""
    pos = 0
    for w in words:
        idx = text.find(w["w"], pos, pos + 40)
        if idx >= 0:
            w["c"] = idx
            pos = idx + len(w["w"])
        else:
            w["c"] = None
    return [w for w in words if w["c"] is not None]


def time_at_char(words: list[dict], ci: int) -> float:
    best = words[0]["t"]
    for w in words:
        if w["c"] <= ci:
            best = w["t"]
        else:
            break
    return best


def split_captions(text: str) -> list[tuple[int, str]]:
    parts: list[tuple[int, str]] = []
    for m in re.finditer(r"[^。！？；]+[。！？；]?", text):
        seg, start = m.group(0), m.start()
        if len(seg) <= CAPTION_MAX:
            parts.append((start, seg))
            continue
        buf, bstart = "", start
        for sm in re.finditer(r"[^，、]+[，、]?", seg):
            piece = sm.group(0)
            if buf and len(buf) + len(piece) > CAPTION_MAX:
                parts.append((bstart, buf))
                buf, bstart = "", start + sm.start()
            buf += piece
        if buf:
            parts.append((bstart, buf))
    return [(s, t.rstrip("，、；：")) for s, t in parts if t.strip()]


def build_timings(skip_tts: bool) -> dict:
    TTS_DIR.mkdir(exist_ok=True)
    cache = TTS_DIR / "words.json"
    words_by_slide: dict[str, list[dict]] = {}
    if skip_tts:
        words_by_slide = json.loads(cache.read_text(encoding="utf-8"))
    else:
        for s in SLIDES:
            print(f"[tts] {s['id']} {s['title']} …", flush=True)
            words_by_slide[s["id"]] = asyncio.run(synth(s))
        cache.write_text(json.dumps(words_by_slide, ensure_ascii=False, indent=1), encoding="utf-8")

    out = {"voice": VOICE, "rate": RATE, "slides": []}
    for s in SLIDES:
        words = align(s["text"], [dict(w) for w in words_by_slide[s["id"]]])
        dur = ffprobe_duration(TTS_DIR / f"{s['id']}.mp3")
        cues = {}
        for cid, kw in s["cues"].items():
            ci = s["text"].find(kw)
            if ci < 0:
                raise ValueError(f"{s['id']} cue {cid}: 关键词「{kw}」不在正文里")
            cues[cid] = time_at_char(words, ci)
        caps = []
        segs = split_captions(s["text"])
        for i, (ci, seg) in enumerate(segs):
            st = time_at_char(words, ci)
            en = time_at_char(words, segs[i + 1][0]) if i + 1 < len(segs) else dur
            caps.append({"t": st, "e": round(max(en, st + 0.4), 3), "x": seg})
        out["slides"].append({
            "id": s["id"], "title": s["title"], "text": s["text"],
            "audio": f"tts/{s['id']}.mp3", "duration": dur, "cues": cues, "captions": caps,
        })
        print(f"[ok] {s['id']} {dur:6.2f}s  cues={cues}")
    (TTS_DIR / "timings.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    (TTS_DIR / "timings.js").write_text(
        "window.BOOTH_TIMINGS = " + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
    return out


# 视频：每页口播前后各留一点气口
LEAD_IN = 0.6
TAIL = 0.9


def build_video(t: dict) -> None:
    src = (HERE / "video.src.html").read_text(encoding="utf-8")
    assets = VIDEO_DIR / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    start = 0.0
    scenes = []
    for s in t["slides"]:
        slot = round(LEAD_IN + s["duration"] + TAIL, 3)
        scenes.append({**s, "start": round(start, 3), "slot": slot, "voice_at": round(start + LEAD_IN, 3)})
        shutil.copyfile(TTS_DIR / f"{s['id']}.mp3", assets / f"{s['id']}.mp3")
        start += slot
    total = round(start, 3)
    rep = {"{{TOTAL}}": f"{total}", "/*SCENES_JSON*/null": json.dumps(scenes, ensure_ascii=False)}
    for sc in scenes:
        k = sc["id"].upper()
        rep[f"{{{{{k}_START}}}}"] = f"{sc['start']}"
        rep[f"{{{{{k}_DUR}}}}"] = f"{sc['slot']}"
        rep[f"{{{{{k}_VOICE}}}}"] = f"{sc['voice_at']}"
        rep[f"{{{{{k}_VDUR}}}}"] = f"{sc['duration']}"
    for a, b in rep.items():
        if a not in src:
            raise ValueError(f"video.src.html 缺占位符 {a}")
        src = src.replace(a, b)
    left = re.findall(r"\{\{[A-Z0-9_]+\}\}", src)
    if left:
        raise ValueError(f"还有没填的占位符：{left}")
    (VIDEO_DIR / "index.html").write_text(src, encoding="utf-8")
    print(f"[video] index.html 已生成，总长 {total}s，{len(scenes)} 场")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-tts", action="store_true", help="复用 tts/ 下已有的 mp3 与 words.json")
    args = ap.parse_args()
    t = build_timings(args.skip_tts)
    if (HERE / "video.src.html").exists():
        build_video(t)
    return 0


if __name__ == "__main__":
    sys.exit(main())
