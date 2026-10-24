# Tool: github-mcp-registry

- **Domain(s):** mcp-ecosystem
- **Barrier route:** 1 official surface · **Source tier:** free · **Ready MCP:** n/a (catalog, not a server)
- **Top pick for its domain:** yes (the canonical non-Anthropic MCP discovery surface)

## What it does / when to pick it
GitHub's official MCP discovery hub at **github.com/mcp** (launched 2025-09-16). It is a curated catalog page, not a repo (`gh api repos/mcp` returns 404), aggregating ~100 community MCP servers from major SaaS providers including Figma, Postman, Stripe, and Supabase. **Decision rule:** use as a **Discovery surface** during refresh-protocol sweeps for the `mcp-ecosystem` meta-domain to find new third-party servers worth evaluating. **Do not "install" it**, it is a catalog, not a runnable tool. Once you find a candidate server on the page, follow that server's own install instructions (each entry links out to its source repo).

## Install
Not installable, this is a discovery page, not an MCP server. Open https://github.com/mcp in a browser (or `gh browse mcp` does NOT work since the slug is not a repo). For a programmatic listing, try `WebFetch https://github.com/mcp` and check whether the returned content contains server names and source links. If the cards require JavaScript, use browser automation or a rendering extractor whose output has been verified.

## Auth / keys
**Free, no key.** Public discovery page, no GitHub login required to browse. (Individual servers listed there will have their own auth requirements, assess per entry.)

## Usage, call examples
- Browser: open `https://github.com/mcp`, browse the ~100 cataloged servers, click through to each server's source repo.
- Programmatic sweep (refresh-protocol): `WebFetch https://github.com/mcp` → check for actual server cards; use a verified browser/rendering extractor when absent → extract server names + repo URLs → cross-reference against the market-intel matrix to surface candidates not yet evaluated.

## General experience and gotchas (踩坑)
- **Not a repo, despite the slug.** `github.com/mcp` looks like `github.com/<owner>` but `gh api repos/mcp` is 404 and `gh repo clone mcp` fails. It's a special discovery landing page, treat URLs accordingly (no `git clone`, no PR workflow against it).
- **Catalog, not a curator.** Inclusion on the page does not mean Anthropic-vetted or even maintained, each server is community-published. Verify last-commit recency, open issues, and auth model on the linked repo before adopting.
- **Coverage is SaaS-heavy.** The page leans toward big-name SaaS providers (Figma, Postman, Stripe, Supabase). Niche/long-tail MCPs (e.g., scrapers, regional commerce, social monitoring) are under-represented, pair this with Smithery / glama / mcp.so / mcpservers.org for full mcp-ecosystem coverage.
- **JS-rendered listing.** The server cards render client-side, so plain `curl` may return a near-empty shell. WebFetch does not execute JavaScript. Check its returned content and use browser automation or a verified rendering extractor when the server cards are absent; an empty shell is not an empty catalog.
- **Snapshot rots fast.** The MCP ecosystem is churning weekly through 2025-2026, re-sweep github.com/mcp during each refresh-protocol pass rather than caching the list. The "~100 servers" figure is the 2026-06 snapshot.

## Last verified: 2026-06
