"""从 tts/timings.json 导出口播文字稿：每句一行，句间空一行，按页加分隔标题。"""
import io, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
T = json.loads((HERE / "tts" / "timings.json").read_text(encoding="utf-8"))
lines = []
for i, s in enumerate(T["slides"], 1):
    lines.append(f"【第 {i} 页 · {re.sub(r'^能力[一二三四五] ?', '', s['title'])}】")
    for sent in re.findall(r"[^。！？；]+[。！？；]?", s["text"]):
        if sent.strip():
            lines.append(sent.strip())
    lines.append("")
out = "\n\n".join(lines) + "\n"
(HERE / "口播文字稿.txt").write_text(out, encoding="utf-8-sig")
print(out)
