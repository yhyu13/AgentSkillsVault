# Domain: leadgen-crm

**Triage signals:** B2B leads, prospecting, email find/verify, company intel, CRM sync, outreach,
获客/销售情报/潜客.

| source | route | capability | detect | note |
|---|---|---|---|---|
| **Apollo.io** (native connector + CC plugin) | ① | find+enrich contacts, ICP prospecting, sequences | connected (OAuth) | ⚠ turn OFF Claude model training before connecting |
| Clay (+ MCP) | ② | waterfall enrichment, 150+ providers | connected + key | best for existing Clay teams |
| Hunter.io (official MCP) | ① | email finder + verifier + enrichment | connected + X-API-KEY | precise email work |
| ZoomInfo / Lusha | ① | enterprise database / mid-tier (free tier) | connected | ZoomInfo $15k+/yr; Lusha 40 free/mo |
| People Data Labs | ① | $0.01/record, cheapest at volume | self-wrap (no MCP) | dev API-first |
| **HubSpot / Salesforce / Attio** (official MCP) | ① | CRM read/write, log activity | connected | use whichever CRM you run |
| Smartlead MCP (LeadMagic) | ① | 113+ tools, deliverability + warmup | connected + key | **D-STALE (repo archived)**, `LeadMagic/smartlead-mcp-server` archived 2026-02-03 (read-only; last code push 2025-07); the **Smartlead product is still alive** (app.smartlead.ai) so drive its REST API directly, or use the community fork `jonathan-politzki/smartlead-mcp-server` (verify before relying) |
| **Instantly.ai MCP** (official hosted) | ① | sequence audits, deliverability checks, lead/campaign mgmt, 38 tools across 6 categories | `mcp.instantly.ai/mcp` HTTP + API key | **requires Growth plan**; product-level officialness (reference client `bcharleson/instantly-mcp` is community FastMCP) |
| ZeroBounce (official MCP) | ① | email verification, batch | connected + key | only mature verify MCP |
| Bright Data Crunchbase MCP | ② | company intel, real-time public data | connected | free 5k/mo, legally tested |
| **Outscraper Google Maps API** | ② | resale Google Maps lead-scraping, pay-as-you-go | REST key | free first 500 records, then $3/1K up to 100K, $1/1K above, **~15x cheaper than SerpApi Maps** ($25/mo for 1K) |

**Default pick:** Find+enrich → Apollo.io native MCP (turn off training first). Verify → Hunter or
ZeroBounce. Outreach → Smartlead. CRM → your CRM's official MCP. Min combo: Apollo → Hunter/ZeroBounce
→ Smartlead → CRM MCP.

## ④ Browser/OSS route (free, self-host)
| repo | route | note |
|---|---|---|
| **gosom/google-maps-scraper** (5.8k★) | ④ self-host | local B2B leads: name/phone/site/**email**, **far lower risk than LinkedIn** |
| omkarcloud/google-maps-scraper (3.6k★) | ④ | 50+ fields incl email/socials + enrichment; star count checked via GitHub API 2026-10-10 |
| joeyism/linkedin_scraper (4.2k★) | ④ | Selenium + your login session; ⚠ highest ban risk, small batch only |
| cullenwatson/StaffSpy (341★) | ④ | scrape company staff lists; ⚠ ToS/ban risk; star count checked via GitHub API 2026-10-06 |

**Default (free route):** for local-business B2B leads use **gosom/google-maps-scraper** (emails +
phones, low legal risk). Avoid LinkedIn scraping when possible, if unavoidable use a throwaway acct.

**Compliance red line:** LinkedIn cookie-scraping (PhantomBuster / joeyism) = 25 to 35% ban rate, use
Bright Data instead (採集 off your account, legally defended) or pivot to Google Maps leads. Any
personal-data workflow needs GDPR/CCPA delete-request handling.

**Avoid (dead repo, live product):** **Smartlead MCP** (`LeadMagic/smartlead-mcp-server`), repo
**archived 2026-02-03** (read-only, no maintenance; verified gh-api). The MCP wrapper may drift from
Smartlead's live API. The **product** is not dead, if you need the send/sequence layer, drive the
Smartlead REST API directly or test the community fork `jonathan-politzki/smartlead-mcp-server` first.

**Install guidance:** `reference/volatile/pricing-install.md` → leadgen-crm.
