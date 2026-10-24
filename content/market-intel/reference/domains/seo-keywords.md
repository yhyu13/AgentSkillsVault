# Domain: seo-keywords

**Triage signals:** keyword volume/difficulty, backlinks, competitor SEO, SERP rank tracking,
search traffic intel, 关键词/竞品SEO/排名.

> Most "pro SEO MCPs" don't charge for the MCP, they consume your underlying subscription/API
> quota. Real cost = the plan tier, not the MCP.

| source | route | capability | detect | cost note |
|---|---|---|---|---|
| **Google Search Console MCP** | ① free | your site's real clicks/impr/CTR/position | connected + Google OAuth | free, self-hosted;접 first |
| **DataForSEO MCP** | ② | keywords/SERP/backlinks/Trends, all engines | connected + login/pwd | $1 trial + free Sandbox; ~$0.0006/SERP |
| Ahrefs MCP (official) | ① | best backlink data (95 tools) | connected + paid sub | pricey; MCP interactive-only |
| Semrush One MCP | ① | full keyword/competitor/audit | connected + Pro+ sub | entry **Pro ~$140/mo** (annual ~$117); ~$299 = Business tier; history = 5x units |
| SE Ranking MCP | ① | 160+ tools + 7 ready Claude Skills | connected + key | best pro-tier value, 14d trial 100k credits |
| SerpApi MCP | ② | multi-engine SERP, Trends | connected + key | free **250/mo** (was ~100); Starter $25/1k; pricey at scale |
| Google Ads Keyword Planner | ① free | real search volume + CPC | Google Ads dev token | free; easier via DataForSEO wrapper |
| **every-app/open-seo** (22.7k★) OSS | ①/③ self-host | keyword research/SERP/backlink/site-audit, MCP-native | connected MCP or self-host UI | free OSS; external-view pick vs paid DataForSEO/Ahrefs; GSC MCP still first for own-site |

**Default pick:** Have a site → free GSC MCP first. External keyword/SERP/backlink cheap → DataForSEO
(Sandbox first). Pro coverage + Claude-friendly → SE Ranking. Deep backlinks → Ahrefs.

## ④ Browser/OSS route (free, self-host), strong here
| repo | route | note |
|---|---|---|
| **searxng/searxng** (31k★) | ④ self-host | meta-search → JSON = private SerpApi, dozens of engines |
| **towfiqi/serpbear** (2k★) | ④ self-host | keyword rank tracker, replaces paid rank monitoring |
| deedy5/ddgs (2.7k★) | ④ | lightweight free web search lib, no key |
| **Google Suggest / Autocomplete** | ④ free | keyword-ideas / long-tail expander, `suggestqueries.google.com/complete/search` (no key); ⚠ undocumented endpoint, Google can throttle anytime |
| **respectlytics/respectaso** (514★) | ④ | ASO App-Store keyword research (iTunes Search API, 30 countries); ⚠ iOS/App Store ONLY, no Google Play; GitHub stars checked 2026-10-03 |
| flack0x/trendspyg / sdil87/trendspy | ④ | Google Trends after pytrends archived |
| playwright MCP | ④ | drive trends.google.com / SERP directly when no repo fits |

**Default (free route):** self-host **SearXNG** as a private SERP API + **serpbear** for rank
tracking, covers most paid-SERP needs at zero cost (needs proxies at high volume). Keep GSC ① for
your own site's real traffic (free, irreplaceable).

**Shaky (avoid for prod):** pytrends (archived, 429s), "free Ahrefs" scraper MCPs needing CAPTCHA
solvers. No official MCP: Moz, Majestic, Sitebulb.

**Install guidance:** `reference/volatile/pricing-install.md` → seo-keywords.

**Top-pick grandfather watch (set 2026-06-17 sweep):** DataForSEO has been the unchallenged top
pick for ≥3 consecutive sweeps. PHILOSOPHY P1 generative test: *why* is DataForSEO the default? Is
it actually the optimal point, or have we stopped questioning the framing? **Next sweep MUST**
run an explicit "could DataForSEO be replaced" angle in Discovery, not just "what's new."
