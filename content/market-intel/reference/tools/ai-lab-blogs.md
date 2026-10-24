# Tool: AI lab blogs (OpenAI / Anthropic / DeepMind / Meta AI / Mistral / Qwen / DeepSeek)

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ④ (browser / RSS, no API) · **Source tier:** L1 (the canonical primary source for a launch) · **Ready MCP:** no, drive with **playwright MCP** after current-session verification + RSS where the blog exposes a feed
- **Cost:** **free**, public blogs, no key, no quota. (No pricing page to fetch; these are open marketing/research posts.)
- **Repo / Provider:** official lab sites, https://openai.com/news · https://www.anthropic.com/news · https://deepmind.google/discover/blog · https://ai.meta.com/blog · https://mistral.ai/news · https://qwen.ai (Qwen) · https://api-docs.deepseek.com / DeepSeek blog. (Non-GitHub; these are first-party sites.)
- **Top pick for its domain:** no (it's the *authority* source for launches, but not the everyday discovery default, that's arXiv + HF Daily Papers)

## What it does / when to pick it
The official release posts where a lab *first* announces a model, benchmark, or capability. **Decision rule (shard):** when the question is about a specific **model launch / official capability claim**, the lab's own blog is the **L1 source, cite it over secondhand** roundups, X threads, or news rewrites. Use it to nail down the canonical date, the official benchmark numbers, license/availability, and exact model names. For *discovering* what's new across the field (not one known launch), start with arXiv + HF Daily Papers; for "what mattered this week" use the roundups (`ai-news-roundups`).

## Install
Nothing to install. Use the **playwright MCP** (verify the operation in the active host session) to navigate the blog and read the DOM, or subscribe to the blog's RSS feed where one exists (most labs expose `/rss` or an Atom feed). See `reference/install-guide.md` → "④ browser / act-like-human" and `reference/domains/browser-automation.md` for the general browser route. No L1 install line needed (free, no MCP package).

## Auth / keys
None, public pages, no account, no API key. (No secret-hygiene concern.)

## Usage, call examples
- playwright: `browser_navigate https://www.anthropic.com/news` → `browser_snapshot` to read the post list → open the target post and extract the official numbers/date.
- RSS: fetch the feed URL (e.g. via Tavily/Firecrawl or a plain GET) and parse `<item>` entries for new posts since a date.
- Minimal flow: navigate to the launch post → copy the exact model name, release date, headline benchmark table, and license → cite that URL as the L1 source.

## General experience & gotchas (踩坑)
- **These pages are JS-heavy SPAs and frequently bot-block plain fetchers** (403 / Cloudflare). The shard routes them through **playwright (act-like-human)** precisely for this reason, a raw `WebFetch`/`curl` often returns 403 or an empty shell. If playwright also stalls, fall back to the RSS feed or a stealth fetch (Bright Data / Firecrawl).
- **Marketing gloss ≠ verified significance.** A blog will frame its own model as SOTA. Per the shard, **verify significance independently**, Semantic Scholar citation velocity, OpenReview scores, or reproduction in the wild, not the lab's own claim or the retweet count.
- **Cite the canonical post, not the rewrite.** News sites and X threads paraphrase (and sometimes garble) the numbers; the lab post is the source of record for date, model name, and benchmarks.
- **Chinese labs (Qwen / DeepSeek)** often post the substantive details on GitHub model cards / HF + a 中文 blog, sometimes ahead of an English post, check the HF repo and GitHub release too.
- **No stable API:** layouts and feed URLs change without notice; don't hard-code selectors for a long-lived flow.

## Failure signals & fallback
Failure = 403 / Cloudflare wall, empty SPA shell, or the post not yet indexed. Fall back in order: **RSS feed** → stealth fetch (**Bright Data** ② free 5k/mo or **Firecrawl** ②) → the curated **roundups** (`ai-news-roundups`, which usually link the primary post) → **GitHub** release/model-card for the launch (often the real source for open-weight models). For significance, cross to **Semantic Scholar** / **OpenReview**, not the blog itself.

## Last verified: 2026-06
