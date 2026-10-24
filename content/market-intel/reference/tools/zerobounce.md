# Tool: ZeroBounce (official MCP)

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① official API · **Source tier:** L2 · **Ready MCP:** yes (official MCP, key)
- **Cost:** 100 free verifications/mo (with a business-domain signup); paid = pay-as-you-go credits + ZeroBounce ONE subs (basic ~$99/mo). Exact per-credit price unverified 2026-06, confirm at https://www.zerobounce.net/email-validation-pricing
- **Repo / Provider:** https://www.zerobounce.net (official, OAuth/API key, no GitHub repo)
- **Top pick for its domain:** no (it's the *verify* slot; Apollo is the default entry)

## What it does / when to pick it
Bulk **email verification**: checks deliverability (valid / invalid / catch-all / abuse / disposable)
in single or batch mode, plus scoring and an email finder. **Decision rule:** pick ZeroBounce as the
*verify* hop right before you send, the shard calls it "the only mature verify MCP." Use Hunter ① if
you also need to *find/discover* emails (finder + verifier in one); use ZeroBounce when you already
have a list and want the strongest, MCP-native batch verification before outreach. Verify hop in the
combo: **Apollo → Hunter/ZeroBounce → Smartlead → CRM**.

## Install
Official MCP, add per provider with your ZeroBounce API key. Prefer HTTP transport on Windows.
Volatile line: `reference/volatile/pricing-install.md` → leadgen-crm. L0 mechanics:
`reference/install-guide.md`. MCP takes effect only after session restart / `/mcp` reconnect.

## Auth / keys
ZeroBounce API key from your dashboard. 100 free verifications/mo if you sign up with a business/
premium domain. **Key-bearing → secret hygiene:** user supplies via `-e KEY=$VAR`; never echo it,
never `browser_snapshot` the key page, edit `~/.claude.json` from clipboard, not `claude mcp add`
(it echoes the key). See `reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
MCP tools: validate a single email, batch-validate a list, check remaining credits, scoring, email
finder. Minimal: batch-validate an enriched list, then keep only `valid` (drop `invalid` /
`abuse` / `do_not_mail`) before handing the list to Smartlead.

## General experience & gotchas (踩坑)
- **Each verification spends a credit**, the 100/mo free tier vanishes on one small list; batch
  deliberately and treat credits as the real budget (cost trap).
- **`catch-all` results are ambiguous**, the domain accepts everything, so "valid" ≠ deliverable.
  Don't treat catch-alls as clean sends; segment or risk-rate them separately.
- It **verifies, it does not find**, for discovering an unknown contact's email use Hunter ① first,
  then verify here (or use Hunter's own verifier). Its email-finder consumes ~20 credits/query.
- Verify *before* Smartlead, always, sending to an unverified list is the #1 way to wreck sender
  reputation (the whole reason this hop exists).
- Business-domain requirement for the free tier: a free-mail signup may not get the 100/mo.
- **Signup is captcha-gated + email-verify-link required**, `zerobounce.net/members/signup` typical email+password flow has a captcha; account activates only after clicking the verification link (sent to signup mailbox, out of agent reach if the Gmail MCP isn't on that account). User-only signup. API key lives at Dashboard → API after activation.

## Failure signals & fallback
Failure looks like: 401/invalid-key, `! Needs authentication`, or out-of-credits at call time
(verifications start returning errors). **Fallbacks:** **Hunter.io** ① is the sibling verifier (and
adds finding); for finding/enriching upstream, **Apollo.io** ①. There's no strong free OSS verifier in
the matrix, conserve credits rather than expecting a free swap.

## Last verified: 2026-06
