# Domain: frontier-research

**Triage signals:** AI/ML papers, arXiv, frontier research, SOTA, new models/benchmarks,
conference (NeurIPS/ICLR/ICML/ACL), citations, 论文/前沿研究/学术.

> **Real-run lesson: for AI-frontier scouting the L1/L2 floor is arXiv + HF Daily Papers +
> official lab blogs + GitHub trending.** X/social adds breaking buzz but is L4, treat as a lead,
> not evidence, and cross-check. Verify a paper's significance via Semantic Scholar citation
> velocity (Papers-with-Code SOTA standing is **gone**, API sunset by Meta, D-404; see table below),
> not retweet count or thread hype.

| source | route | capability | detect | note/risk |
|---|---|---|---|---|
| **arXiv API** (+ arxiv-mcp-server, blazickjp) | ① free | search + recent by category (cs.AI/cs.LG/cs.CL/cs.CV/stat.ML) | probe the selected arXiv operation in the active host session; otherwise REST, no key | no key; rate-limit ~1 req/3s, be polite |
| **Hugging Face, Daily Papers + Hub API** (official HF MCP) | ① free | curated daily papers, trending models/datasets | connected, or REST | no key for read; HF token only for write/private |
| **Semantic Scholar Graph API** (+ semantic-scholar MCP) | ① free | citations, influentialCitationCount, references/citations graph | REST or MCP | free key (raises rate limit); unauth is throttled |
| ~~Papers with Code API~~ | ① | SOTA leaderboards | REST → **302 to huggingface.co/papers** | **D-404, Meta sunset the API 2025-07-24/25** (verified 2026-06; domain now redirects to HF Trending Papers); the SOTA-leaderboard signal is LOST, HF Papers trending = weak proxy |
| **LMArena** (arena.ai/leaderboard) | ① free | live human-eval Elo leaderboard for LLMs via pairwise blind voting; **partial** D-404 fill for Papers-with-Code | REST + web UI, no key | rebrand: lmarena.ai → arena.ai (Jan 2026, Series A $1.7B); **chat/agent rankings only, does NOT replace paper-task SOTA** |
| **openags/paper-search-mcp** (2.6k★) | ① free | one MCP fans out arXiv + PubMed + bioRxiv/medRxiv+ | `uvx` self-host | covers biomed venues the arXiv-only pick misses |
| **Future-House/paper-qa** (8.7k★) | ④ | grounded deep-research over full-text PDFs w/ citations | self-host | strongest free agentic paper-QA; a layer above raw search |
| **OpenReview API** | ① free | ICLR/NeurIPS/etc. submissions + reviews + scores | REST (api2.openreview.net) | reviewer scores = early significance signal pre-publication |
| **GitHub trending + GitHub API/MCP** | ① free | frontier repos/releases, star velocity | github MCP connected, or REST | star velocity = adoption proxy; watch for launch-day inflation |
| **AI lab blogs** (OpenAI/Anthropic/DeepMind/Meta AI/Mistral/Qwen/DeepSeek) | ④ browser/RSS | official release posts, often the L1 source for a launch | playwright MCP + RSS | the canonical source for a model launch; cite over secondhand |
| **AINews (smol.ai) / The Batch / Import AI** | ④ RSS | curated daily/weekly roundups | RSS reader / playwright | L2 curation; good for "what mattered this week" |
| **alphaXiv / arxiv-sanity-lite** | ③/④ | community comments + recommender over arXiv | self-host (arxiv-sanity-lite) or browser (alphaXiv) | community signal (L4); ⚠ arxiv-sanity-lite **D-STALE** (last push 2023) but still self-hosts free |
| **Connected Papers / ResearchRabbit** | ④ browser | citation-graph exploration around a seed paper | playwright MCP | UI-driven, no official API; for visual neighborhood mapping |
| **→ `research-lit` skill** | (delegate) | deep multi-paper synthesis / lit-review | discover in the active host's skill catalog and read its installed instructions | optional sibling; if absent, report the missing workflow and use a verified alternative or prepare installation |

**Default pick:** Recent papers → arXiv API + HF Daily Papers (free). Significance/citation signal →
Semantic Scholar (+ paper-search-mcp for biomed/multi-venue). **SOTA leaderboards partial-recovery
via LMArena (arena.ai) for chat/agent rankings; paper-task SOTA still a GAP** since Papers-with-Code
API was sunset by Meta (D-404). HF Papers trending is a weak proxy. Launches →
official lab blog (L1) + GitHub trending. Breaking buzz → X (see `x-twitter.md`) but treat as L4 and
cross-check. Full-text deep-research → Future-House/paper-qa; deep synthesis → `research-lit`.

**④ Browser/OSS route:** Lab blogs and Connected Papers / ResearchRabbit have no clean official
API, drive them with the playwright MCP (act-like-human) or RSS where available; alphaXiv is
browser-only and arxiv-sanity-lite self-hosts free. See `browser-automation.md` for the general
browser route.

**Notes:** Most sources here are **free / no-key** (arXiv, HF read, Papers with Code, OpenReview);
Semantic Scholar's free key only lifts rate limits. For deep multi-paper synthesis don't re-build a
lit-review here. Discover `research-lit` and read its installed instructions before delegating;
if absent, follow the setup/verified-alternative guidance in [its card](../tools/research-lit-skill.md).

**Install guidance:** `reference/volatile/pricing-install.md` → frontier-research (most are
free/no-key).
