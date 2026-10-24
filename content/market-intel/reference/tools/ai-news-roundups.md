# Tool: AINews (smol.ai) / The Batch / Import AI

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ④ (RSS / browser, no API) · **Source tier:** L2 (curated secondary) · **Ready MCP:** no, RSS feed or **playwright MCP**
- **Cost:** **free**, public newsletters/feeds, no key. (No pricing page; these are free-to-read curations.)
- **Repo / Provider:** https://news.smol.ai (AINews, daily) · https://www.deeplearning.ai/the-batch (The Batch, weekly) · https://importai.substack.com (Import AI, weekly). (Non-GitHub; first-party newsletter sites.)
- **Top pick for its domain:** no (curation layer, not a primary source)

## What it does / when to pick it
Human/LLM-curated daily and weekly digests of what happened in AI, model launches, notable papers, debates, tooling. **Decision rule (shard):** reach for these when the question is **"what mattered this week / recently"** and you want a fast, pre-filtered overview rather than raw search. They're excellent for *orientation and lead-generation* (which launches/papers to then verify), but they are **L2 curation**, treat the items as leads and follow each through to its **L1 primary source** (the lab blog or arXiv paper) before citing. For exhaustive recent-paper discovery use arXiv + HF Daily Papers instead.

## Install
Nothing to install. Read the RSS/Atom feed (AINews and Substack-based ones expose feeds) via a fetcher, or drive the site with the **playwright MCP** (available only after current-session operation verification). See `reference/install-guide.md` → "④ browser / act-like-human". No L1 install line (free, no MCP package).

## Auth / keys
None for reading, public web/RSS. (Some newsletters offer an email subscription, but the archive/feed is readable without a key. No secret-hygiene concern.)

## Usage, call examples
- RSS: fetch `https://news.smol.ai/rss.xml` (or the Substack `/feed`) and parse recent `<item>`s for the date window you care about.
- playwright: `browser_navigate https://news.smol.ai` → `browser_snapshot` → read the day's top items and their source links.
- Minimal flow: pull the last N days of AINews → extract the launches/papers mentioned → for each, open the linked **primary source** and verify before using it as evidence.

## General experience & gotchas (踩坑)
- **L2, not evidence.** The shard's central lesson applies: roundups *summarize*, they can compress or mis-frame. Use them to find *what* to check, then verify significance via Semantic Scholar / Papers-with-Code-equivalent signals, and verify launch facts via the lab blog (`ai-lab-blogs`).
- **AINews is AI-generated/curated and high-volume**, great recall, but it will surface minor items alongside major ones; don't infer importance from mere inclusion. The Batch / Import AI are more editorially filtered (lower recall, higher signal).
- **Recency skew + feed lag:** weekly digests lag breaking news by days; for same-day launches go straight to the lab blog or X. Daily AINews is fresher but noisier.
- **Substack/SPA pages can bot-block** plain fetchers, prefer the RSS feed; if blocked, route through playwright or a stealth fetch (Bright Data / Firecrawl).
- **Always follow the link.** A roundup's one-line take is not a citation; the underlying paper/blog is.

## Failure signals & fallback
Failure = feed 404/stale, paywalled archive, or the digest hasn't covered your window yet. Fall back to: arXiv + **HF Daily Papers** ① for raw recent papers, **GitHub trending** for adoption, and **AI lab blogs** (`ai-lab-blogs`) for the primary launch post. For broad open-web "what's happening" beyond these curations, use **Tavily/Exa** ② web search (`web-scraping` domain).

## Last verified: 2026-06
