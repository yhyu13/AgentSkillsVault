# Domain: ready-skills

**Triage signals:** "is there a ready-made skill/plugin for marketing/SEO/content/research", don't
want to assemble MCPs from scratch, 现成的营销/调研 skill.

> Ecosystem reality: marketing / SEO / content / research skills are abundant and install-and-go.
> Business-ops深度 and arbitrage/making-money are scarce, still need MCP assembly + custom logic.

| resource | type | use | get |
|---|---|---|---|
| **coreyhaines31/marketingskills** (46.9k★) | skill bundle | ~40 skills: customer-research, competitor-profiling, programmatic-seo, directory-submissions, copy, ads, email | `npx skills add coreyhaines31/marketingskills` |
| **ericosiu/ai-marketing-skills** (3.5k★) | skill bundle | finance-ops / sales-pipeline / revenue-intel / outbound / lead-dossier, fills the "business-ops scarce" gap | `git clone` + pip + cp (NOT npx) |
| **indranilbanerjee/digital-marketing-pro** (674★) | skill bundle | AEO/GEO answer-engine optimization (ChatGPT/Perplexity/Google AI Mode) | GitHub |
| **Anthropic official Marketing plugin** | official plugin | /competitive-brief, /seo-audit, /campaign-plan; connects HubSpot/Ahrefs/Klaviyo | claude.com/plugins/marketing |
| **AgricIDaniel/claude-seo** (16.3k★) | plugin | strongest SEO, 25 sub-skills + 18 agents, offline | `/plugin marketplace add AgricIDaniel/claude-seo` |
| **ishwarjha/claude-marketing-research-skill** | packaged skill | 6-stage market research workflow (competitor→product→persona→positioning) | GitHub |
| alirezarezvani/claude-skills (23.5k★) | mega bundle | 338 skills incl market-research, c-level, finance | `/plugin marketplace add alirezarezvani/claude-skills` |
| **sickn33/antigravity-awesome-skills** (40k★, active 2026-06) | catalog | broader multi-platform installable awesome-skills catalog | GitHub | **replaces ComposioHQ/awesome-claude-skills** (less-maintained); 40k★, last push 1d ago |
| **Imbad0202/academic-research-skills** (46.3k★) | skill bundle | full academic-research pipeline: planning → lit review → methodology → drafting → peer review (v3.12.1 on 2026-06-15) | `/plugin marketplace add Imbad0202/academic-research-skills` |
| **gtmagents/gtm-agents** (397★) | agents bundle | GTM agents: 67 plugins / 92 agents / 52 skills (sales pipeline, lead gen, cold-email personalization), Apache-2.0 | GitHub |
| **Eronred/aso-skills** (2082★) | skill bundle | 40+ App Store Optimization skills (keyword/metadata/competitor/paywall/preview-video), backed by appeeky.com data | GitHub |
| **DaizeDong/shopping-aggregator** ★ | packaged skill | **consumer shopping price comparison** (Amazon / eBay / Walmart / Target / Taobao / JD + Keepa / Camelcamelcamel / 慢慢买 + Capital One Shopping / Karma / 购物党); sister skill to market-intel | `/plugin install github:DaizeDong/shopping-aggregator` · [repo](https://github.com/DaizeDong/shopping-aggregator) |

**Default pick:** Marketing/competitor/content → coreyhaines31/marketingskills (装了即用). SEO →
claude-seo. Packaged market-research pipeline → ishwarjha. Academic pipeline → academic-research-skills.
GTM/sales → gtm-agents. Mobile App Store Optimization → aso-skills. Discovery →
**sickn33/antigravity-awesome-skills** (replaces less-maintained ComposioHQ catalog).
**Consumer shopping price compare → shopping-aggregator** (the consumer-side specialization;
market-intel itself handles seller-side ecommerce-arbitrage, see `ecommerce-arbitrage.md`).

**Judgment:** marketing/SEO/content/research = rich, install直用; consumer shopping was a gap
**until 2026-06** (no native SKILL.md existed; bundles all targeted seller/marketing tools),
shopping-aggregator was authored to fill exactly that gap. business-ops深度 + seller-side
arbitrage = still scarce, still assemble MCPs. Every skill's ceiling = which data MCPs you
connect, the skill is a shell; the work moved to MCP wiring + auth.

**Install guidance:** these are skills/plugins, not MCPs. A marketplace-add command
registers a catalog; it does not install or enable the plugins in that catalog. Inspect
the current manifest or marketplace listing, select verified plugin IDs, and use the
host's plugin manager to install and enable those selections. Current upstream IDs are
unverified here, so do not derive them from a repository name. Restart or reconnect only
after installation, then verify the selected skill/command surface and operation in the
active host. Keep unverified selections in setup.
