#!/usr/bin/env python3
"""Fallback web search: DuckDuckGo Lite -> Bing RSS. Prints JSON to stdout.

Usage:
  python search.py "query" [-n 8] [--engine auto|ddg|bing]

Windows note: run with PYTHONIOENCODING=utf-8 to avoid GBK encode errors.
"""
import argparse, html, json, re, subprocess, sys, time, urllib.parse

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
TIMEOUT = 28


def fetch(url):
    try:
        r = subprocess.run(
            ["curl", "-sL", "--max-time", str(TIMEOUT), "-A", UA, url],
            capture_output=True, text=True, encoding="utf-8", errors="ignore",
        )
        return r.stdout or ""
    except Exception:
        return ""


def clean(t):
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def ddg_lite(q, n):
    s = fetch("https://lite.duckduckgo.com/lite/?q=" + urllib.parse.quote(q))
    if "anomaly" in s and "result-link" not in s:
        return []  # rate-limited; caller may back off
    links = re.findall(r'<a[^>]*href="([^"]+)"[^>]*class=\'result-link\'[^>]*>(.*?)</a>', s, re.S)
    snips = re.findall(r"<td class='result-snippet'>(.*?)</td>", s, re.S)
    out = []
    for i, (href, title) in enumerate(links[:n]):
        h = html.unescape(href)
        m = re.search(r"uddg=([^&]+)", h)
        if m:
            h = urllib.parse.unquote(m.group(1))
        if h.startswith("//"):
            h = "https:" + h
        out.append({"title": clean(title), "url": h,
                    "snippet": clean(snips[i])[:300] if i < len(snips) else ""})
    return out


def bing_rss(q, n):
    s = fetch("https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&format=rss&count=20")
    out = []
    for it in re.findall(r"<item>(.*?)</item>", s, re.S):
        t = re.search(r"<title>(.*?)</title>", it, re.S)
        l = re.search(r"<link>(.*?)</link>", it, re.S)
        d = re.search(r"<description>(.*?)</description>", it, re.S)
        if not l:
            continue
        out.append({"title": clean(t.group(1)) if t else "",
                    "url": html.unescape(l.group(1)),
                    "snippet": clean(d.group(1))[:300] if d else ""})
        if len(out) >= n:
            break
    return out


def run(q, n, engine):
    order = {"ddg": [ddg_lite], "bing": [bing_rss],
             "auto": [ddg_lite, bing_rss]}[engine]
    for fn in order:
        for attempt in range(2):
            res = fn(q, n)
            if res:
                return fn.__name__, res
            if attempt == 0:
                time.sleep(4 if fn is ddg_lite else 1)
    return "none", []


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("query")
    ap.add_argument("-n", type=int, default=8)
    ap.add_argument("--engine", choices=["auto", "ddg", "bing"], default="auto")
    a = ap.parse_args()
    eng, res = run(a.query, a.n, a.engine)
    out = {"query": a.query, "engine": eng, "count": len(res), "results": res}
    sys.stdout.write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    sys.exit(0 if res else 2)
