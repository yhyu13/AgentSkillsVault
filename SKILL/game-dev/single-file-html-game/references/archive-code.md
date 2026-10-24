# Portable Archive Code

A tamper-checked string that encodes a save profile so a player can copy
it to another device. Used by every A-tier game with meaningful state
(`CHESS2`, `FORGE2`, `CITY2`, `SNAKE2`, `HORDE2`, `LETTER2`, `LOCK2`,
`CROSS2`, …). The format is identical between games — only the prefix
and the schema change.

## Format

```
<PREFIX>.<version>.<base64url-payload>.<checksum>
```

| Segment | Meaning |
| --- | --- |
| `<PREFIX>` | Game-specific 2–8 char tag, uppercase. Examples: `CHESS2`, `FORGE2`, `CITY2`, `SNAKE2`, `HORDE2`, `LETTER2`, `LOCK2`, `CROSS2`, `TRUSS2`, `GLYPH2`, `PRESS2`, `WAVE2`, `CHROMA2`, `WAPP`. Must be unique per game. |
| `<version>` | Integer string. Starts at `"1"` for new games. Bump only on a breaking schema change. |
| `<base64url-payload>` | `btoa(JSON.stringify(state))` with `+→-`, `/→_`, padding stripped. UTF-8 safe via `TextEncoder`/`TextDecoder`. |
| `<checksum>` | First 8 hex chars of FNV-1a-32 over `<version>.<payload>`. |

FNV-1a-32 (no salt) is the project standard because it is ~10 lines of
JS, deterministic across runtimes, and detects accidental corruption.
**It is not authentication** — anyone can recompute the checksum. Tamper
tests rely on the loader rejecting unexpected fields after sanitization.

## Reference encoder / decoder

Drop-in reference (lifted from
`promo-video/scripts/check-portable-archive-code.mjs`). Adapt the
prefix and the `normalizeState` schema.

```js
const PREFIX = "WAPP";                       // change per game
const CURRENT_VERSION = "1";
const MAX_CODE_LENGTH = 12_000;

function utf8ToBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToUtf8(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("payload not base64url");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
    + "=".repeat((4 - value.length % 4) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeArchive(rawState) {
  const payload = utf8ToBase64Url(JSON.stringify(normalizeState(rawState)));
  const signed = `${CURRENT_VERSION}.${payload}`;
  return `${PREFIX}.${signed}.${fnv1a(signed)}`;
}

function decodeArchive(code) {
  if (typeof code !== "string" || !code || code.length > MAX_CODE_LENGTH) {
    throw new Error("archive length invalid");
  }
  const parts = code.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error("prefix invalid");
  const [, version, payload, checksum] = parts;
  if (fnv1a(`${version}.${payload}`) !== checksum) throw new Error("checksum mismatch");
  const parsed = JSON.parse(base64UrlToUtf8(payload));
  const reader = versionReaders[version];
  if (!reader) throw new Error(`unsupported version: ${version}`);
  return reader(parsed);
}

function decodeArchiveOrThrow(code) {            // surface user-friendly error
  try { return decodeArchive(code); }
  catch (e) { throw new Error("存档码无效或被篡改：" + e.message); }
}
```

`versionReaders` maps each version to its normalizer. When you bump
versions, add a new reader; never delete the old one.

## Normalization = tamper defence

`normalizeState` is the only thing the player ever sees. It must:

- Coerce every field to a known type (no raw user input survives).
- Clamp numeric ranges (e.g. `fontScale` → `[0.8, 1.6]`).
- Whitelist enum strings (e.g. `theme ∈ {"light","dark","system"}`).
- Deduplicate and cap arrays (e.g. panels `≤ 4`).
- Strip unknown keys (`{token: "must-not-survive"}` is dropped).

The tampered-code test in the check script flips one byte in the
payload and asserts the loader throws — the checksum catches that, and
`normalizeState` would catch any field that survived the checksum.

## Version migration

When the schema changes:

1. Bump `CURRENT_VERSION`. Keep the old `versionReaders["0"]` /
   `["1"]` mapping the old schema to the new fields.
2. Do not silently re-save old versions — when an old code is loaded,
   keep the bumped version in memory until the player performs a
   save-eligible action.
3. The `versionReaders` map must remain exhaustive for every version
   that has ever shipped.

## Integration checklist

- [ ] `encodeArchive` / `decodeArchive` (and `decodeArchiveOrThrow`) are
  bound on `window.__<name>Test` so the check script can drive them.
- [ ] The UI exposes **Import** / **Export** buttons that round-trip a
  profile end-to-end.
- [ ] On import, run `decodeArchive` inside `try { … } catch (e) { showToast("存档码无效或被篡改"); }`.
- [ ] `MAX_CODE_LENGTH` is honored — refuse oversized codes before
  parsing JSON.
- [ ] Tests: at least 100 random round-trips + 100 tampered-payload
  rejections + one legacy version migration.

## Anti-patterns

- Storing the checksum only on the client. The whole point is that the
  loader detects tampering on import.
- Writing `JSON.parse(code)` directly. Always go through the four-part
  split and the checksum.
- Treating "valid checksum" as "trusted content". Normalize after
  parsing.
- Hard-coding the version. Read it from the code, look it up in
  `versionReaders`.
- Saving passwords, tokens, or any field that should not survive a
  reload. They belong on the server or not at all.