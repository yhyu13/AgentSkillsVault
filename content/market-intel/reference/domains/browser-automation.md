# Domain: browser-automation (route ④, first-class)

**Triage signals:** any domain where the official/resale API is paid, rate-limited, field-stripped,
or login-walled, and you'd rather have a real browser act like a human. Often gives **better data**
(full rendered page, logged-in view, fields APIs don't return) at **zero API cost**.

**This is not a last resort.** Prefer this route when: (a) the API is expensive/quota-capped,
(b) you need the real logged-in/rendered view, (c) a free open-source repo already covers the target.
Trade-offs: needs a logged-in session/cookies, usually a **proxy pool at scale** (software is free,
proxies are the hidden cost), and most platform-specific scraping **violates that platform's ToS**
(ban risk, use throwaway accounts for write/scrape-heavy work). Verified stars/activity 2026-06-01.

## First check: Playwright availability
After current-session navigation and page-content verification, Playwright can navigate,
click, fill, screenshot, read rendered DOM. **Default first tool** for any bespoke "act like a
human" task before reaching for a paid API. Add specialized repos below when playwright alone is
too low-level or gets fingerprint-blocked.

| source | route | capability | verify |
|---|---|---|---|
| **Playwright MCP** | ④ | navigate, click, fill, screenshot and read the rendered DOM | requires the current-session checks above; local browser/session, no installed tool or usable login assumed |

## General AI/LLM browser frameworks
| repo | what | Claude fit | note |
|---|---|---|---|
| **browser-use/browser-use** (112.7k★) | LLM drives the browser via natural-language goals | Python lib; agent calls it | most popular; great for "log in and extract X" |
| **vercel-labs/agent-browser** (42.1k★) | native Rust CLI, token-efficient snapshot+@ref for LLM context | CLI; ships `.claude-plugin` | fast peer to playwright MCP (not MCP-native); bundled Chrome |
| **browserbase/stagehand** (23k★) | act/extract/observe primitives over Playwright | TS lib | precise, scriptable AI browser control |
| **Skyvern-AI/skyvern** (22k★) | LLM + vision runs browser workflows, beats layout changes | self-host + API | robust to UI changes via vision |
| **unclecode/crawl4ai** (81.8k★) | LLM-friendly crawler, auto anti-bot (Cloudflare/Akamai) | docker MCP / lib | zero-cost self-host crawl首选 |
| **apify/crawlee** (24k★) | Playwright/Puppeteer/Cheerio + proxy rotation framework | Node lib | base for building bespoke scrapers |
| **ScrapeGraphAI/Scrapegraph-ai** (30.6k★) | NL-defined graph extraction | Python lib | describe what to extract in words |
| **jackwener/OpenCLI** (29.1k★) | 182 prebuilt per-site adapters expose a website as a deterministic CLI, driven through your own logged-in Chrome | npm `@jackwener/opencli`; 7 bundled agent skills, no MCP | free Apache-2.0. Deterministic + zero-token where an adapter exists (twitter/reddit/hackernews/xiaohongshu/douyin/weibo/zhihu/taobao/amazon/binance…), unlike LLM-driven browser-use. **Access play, not anti-detection**, reuses a real profile, does not spoof; if fingerprint-blocked use camoufox/nodriver. 84k npm dl/mo but only 6 HN points, `reference/tools/opencli.md` |

## Anti-detection / anti-fingerprint (when plain playwright gets blocked)
| repo | what | note |
|---|---|---|
| **ultrafunkamsterdam/nodriver** (4.7k★) | undetected Chrome automation successor | evades bot detection. ⚠ **stalling**: pushed 2026-05-13 (~3.8mo) and `gh api .../releases` is empty, the only repo on this shard without a recent push, in a domain that turns over in weeks. **patchright + camoufox now carry the escalation path**; re-check before relying on it |
| **daijro/camoufox** (11.7k★) | anti-fingerprint Firefox build | strongest fingerprint spoofing |
| **steel-dev/steel-browser** (7.1k★) | open-source browser infra for AI agents, self-host | hosted-browser alternative |
| **jo-inc/camofox-browser** (9.1k★) | C++-level fingerprint spoofing on Camoufox base, REST API + plugin | free MIT (key only gates cookie-import) |
| **Kaliiiiiiiiii-Vinyzu/patchright** (4.4k★) | undetected-Playwright patch, passes Cloudflare/DataDome/Akamai/Kasada/F5 | free Apache-2.0, keeps full Playwright API; `reference/tools/patchright.md` |

**Default pick:** start with **Playwright MCP** after current-session verification.

**Conditional choices:** Not automatic alternatives; check task fit, current operation, cost and permissions.
For AI-goal-driven extraction,
add **browser-use** or **crawl4ai**; if fingerprint-blocked escalate to **camoufox/nodriver**;
for vision-robust workflows use **skyvern**. Platform-specific repos live in each domain shard.

**Install guidance:** `reference/volatile/pricing-install.md` → browser-automation.
