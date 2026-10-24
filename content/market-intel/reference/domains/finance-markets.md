# Domain: finance-markets

**Triage signals:** stocks, options, fundamentals, earnings, SEC filings, macro/economic data,
unusual options flow, 股票/期权/基本面. (Tools only, not investment advice.)

| source | route | capability | detect | note |
|---|---|---|---|---|
| **SEC EDGAR MCP** (stefanoamorelli) | ① free | 13M+ filings, 10-K/Q, XBRL, insider | connected, no key (User-Agent only) | zero cost, institutional-grade |
| **FRED MCP** | ① free | 800k+ macro series (GDP/CPI/rates) | connected + free FRED key | zero cost |
| **massive-com/mcp_massive** v0.10.0 (ex-Polygon) | ① | realtime + 20yr history + WebSocket, 3 composable tools / 11 params | connected + key | **REBRAND** polygon-io/mcp_polygon → massive-com/mcp_massive (v0.10.0 on 2026-05-05, ~90% context-overhead reduction); free 5/min, $29/$79/$199 tiers |
| **OpenBB-finance/OpenBB** MCP (69k★) | ① free OSS | aggregates ~100 data providers (FMP, FRED, BLS, IMF, Polygon, yfinance, SEC, Intrinio, etc.) behind one MCP endpoint | `pip install openbb-mcp-server` self-host | pushed 2026-06; collapses 4-5 separate finance MCPs into one connect-once interface |
| **Alex2Yang97/yahoo-finance-mcp** (306★) | ④ | free no-key price/fundamentals/options/news | `uvx` self-host | the only **free, no-key** route here; ⚠ yfinance scrapes Yahoo, not for prod/algo, IP-ban prone |
| Finnhub / Twelve Data | ① | fundamentals + alt-data / multi-asset realtime | connected + key | best free tiers (60/min, 800/day) |
| Financial Modeling Prep | ① | financials/valuation | key | free 250/day |
| Unusual Whales MCP | ① | options flow, dark pool, congress trades | connected + paid token | differentiated arb signals; community wrapper **erikmaday/unusual-whales-mcp** (73★) lowers client-integration friction over rolling your own, same paid data source underneath |
| Alpaca / Tradier MCP | ① official | trade execution (paper first!) | connected | put risk guardrails in front |

**Default pick:** Free start → SEC EDGAR MCP (stefanoamorelli) + FRED MCP.

**Conditional choices:** Require task fit and current operation, cost and permission checks.
Free-start extension → Finnhub free tier. OpenBB MCP can consolidate
supported providers such as SEC and FRED; keep the dedicated Finnhub route when its data is needed,
because OpenBB does not bundle Finnhub. Pro → Massive (ex-Polygon). Execution
→ Alpaca (paper trading first, MCP holds key + enforces risk policy).

**Dead/avoid:** **IEX Cloud**, officially retired **2024-08-31** (announced 2024-05-31; <2% of IEX
revenue, loss-making); migrate to Intrinio (their referral), SEC EDGAR, Finnhub, or Massive. Alpha
Vantage free = 25/day (worst free tier in class). "Free realtime" is usually 15-min delayed.
Auto-trading MUST have guardrails + small test sizing.

**Install guidance:** `reference/volatile/pricing-install.md` → finance-markets.
