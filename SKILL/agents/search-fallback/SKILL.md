---
name: search-fallback
description: >-
  Fallback web search when the host search tool is unavailable or rate-limited
  (QUOTA_EXHAUSTED / TIMEOUT / not installed). Ladder: DuckDuckGo Lite -> Baidu
  (via browser, with dates) -> Bing RSS (last resort, often polluted). Use when
  an agent must search from a shell, needs dated Chinese news, or must
  cross-check a claim across engines. Not for logged-in pages, JS-heavy sites,
  or paywalled content.
metadata:
  category: research
---

# Search Fallback

Host search plugin failed (quota / timeout) → walk this ladder, stop at the
first engine whose top results actually match the query.

## Ladder

1. **Host search tool** — best quality; use it whenever it works.
2. **DuckDuckGo Lite** — `https://lite.duckduckgo.com/lite/?q=...`
   10 clean results, real URLs, no JS. Best for English / technical queries.
   - `HTTP 202` + page contains `anomaly` = rate-limited. In CN networks it may stay
     blocked for the whole session (observed: still 202 after 35s) → switch to Baidu.
   - Space queries 2–3s; it dies fast under bursts.
3. **Baidu via browser** (reliable for Chinese, and the only source with dates)
   - `curl` gets 百度安全验证 → must use `cindy_browser`.
   - web: `https://www.baidu.com/s?wd=<urlencoded>`
   - news + dates: append `&tn=news&rtt=1&bsst=1&cl=2`
   - payload ready to paste: `scripts/baidu_extract.json`
   - extract: `from: "#content_left .result, #content_left .result-op"`;
     `title: h3`; `snippet: ".c-abstract, .c-span-last"`;
     `url: {selector:"h3 a", type:"href"}`
   - URLs are `baijiahao` redirects → fine for reading, weak for citation.
4. **Bing RSS** — `...&format=rss` — **last resort only.**
   - Observed twice: returned completely unrelated results (brand collision on
     "one person" → shipping line ONE; a later Chinese query returned Russian
     video spam). Treat top-3 relevance as a gate: if off-topic, abandon.
5. **Two engines fail → stop and report.** Never loop more than twice.

## Script

```bash
export PYTHONIOENCODING=utf-8          # Windows console is GBK
python scripts/search.py "claude agent skills 2026" -n 8
python scripts/search.py "北京 AI 教育 指南" -n 8 --engine ddg   # 中文仍建议走百度浏览器
```

Output: `{query, engine, count, results:[{title,url,snippet}]}`.
Exit code `2` = nothing parsed (engine blocked or query too ambiguous).

## Pitfalls (all hit on Windows + git-bash)

- `UnicodeEncodeError: 'gbk' codec` → `PYTHONIOENCODING=utf-8`.
- git-bash `/tmp` ≠ Windows Python `/tmp` (that resolves to `C:\tmp`).
  Use workspace-relative paths; never hand `/tmp/x` from bash to python.
- DDG html endpoint blocks fast; **Lite** lasts longer.
- Bing RSS ignores `count=` and, in CN network, can return poisoned results.
- Baidu dates are relative (`3天前`); only `tn=news` preserves ordering.
- `cindy_browser` extract: `from` takes ONE selector (comma-join); `afterSnapshot`
  rejects `compact` (`unrecognized_keys`).
- Baidu `?wd=` needs URL-encoding for Chinese/CJK.

## Boundaries

- Login walls / infinite scroll / JS-only pages → browser `snapshot`, not this.
- Paywalled or robots-disallowed content → don't.
- Fallback for outages, not a scraping farm. Respect rate limits.
