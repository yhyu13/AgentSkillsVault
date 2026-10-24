/* deck-export.js — in-browser "Save as standalone HTML" for a OpenDeck.
 * ─────────────────────────────────────────────────────────────────────────
 * Runs entirely in the browser — no build step, no Python, no install. It
 * fetches the deck's own source file and inlines everything into ONE
 * self-contained .html that opens offline, on any machine, with no companion
 * files and no API key:
 *
 *   • every local <script src="…">   → inlined <script>…</script>
 *   • every local stylesheet <link>  → inlined <style>, with its url() fonts
 *                                       and images embedded as base64
 *   • every local <img src="…">      → embedded as a base64 data URL
 *   • the baked narration audio       → inlined (auto-detected, see below)
 *   • the Google Fonts <link>         → fetched + embedded as base64 @font-face
 *
 * USAGE (from the browser dev console, after the deck has loaded):
 *   deckExport.preview()      → builds a single self-contained file that KEEPS
 *                               the Studio (open/preview it anywhere, keep
 *                               authoring) and downloads it
 *   deckExport.publish()      → builds the final share-ready file (Studio
 *                               removed, audio baked) and downloads it
 *   deckExport.standalone()   → alias of publish() (back-compat)
 *   deckExport.build(opts)    → returns the bundled HTML string (no download);
 *                               pass { preview: true } to keep the Studio
 *
 * PREVIEW vs PUBLISH: both inline everything into ONE file. A *preview* leaves
 * the authoring Studio live, so it's the file to look at while you're still
 * tuning the deck (and the right deliverable in single-file environments like
 * the Claude web app, where the multi-file deck can't load its siblings). A
 * *publish* sets window.__DECK_EXPORTED, hiding the Studio button — and, when
 * no audio was baked, the Narrate + Auto-play buttons too — for the final
 * file you share.
 *
 * AUDIO: generate narration in the Studio (deckNarration.studio()), click
 * "Download audio" to get narration-audio.js, and drop that file next to the
 * deck. The bundler auto-detects it — present → bakes the voiceover in;
 * absent → bundles without it. You do NOT need to uncomment the audio
 * <script> tag first; the bundler activates it for you.
 *
 * NOTE: this fetches same-origin files, so the deck must be served over
 * http(s) (e.g. a local server), not opened via file://. Inside a Claude
 * design project, the project's native "Save as standalone HTML" does the
 * same job — use whichever fits where you're building.
 */
(function () {
  "use strict";

  var AUDIO_SRC = "narration-audio.js";

  function abs(u) { return new URL(u, location.href).href; }

  async function fetchText(url) {
    var r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status + " " + url);
    return r.text();
  }

  // Chunked base64 so large font blobs don't overflow the call stack.
  function bytesToB64(bytes) {
    var bin = "", chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function mimeFor(url) {
    var ext = (url.split("?")[0].split("#")[0].split(".").pop() || "").toLowerCase();
    return ({
      woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
      // <audio>/<video> reach the matcher too now; without these a narrated deck
      // embedded its voiceover under application/octet-stream and no browser
      // played it back.
      mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
      mp4: "video/mp4", webm: "video/webm"
    })[ext] || "application/octet-stream";
  }

  function isRemote(u) { return /^(https?:)?\/\//.test(u) || /^data:/i.test(u); }

  // Fetch a same-origin asset → "data:<mime>;base64,…".
  async function toDataUrl(url) {
    // Check `ok` the way fetchText does. Without it a 404 or an error page is
    // base64-encoded as `data:image/png;base64,<html…>`: nothing throws, the
    // caller's catch never fires, and the log reports the asset as embedded.
    var r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
    var buf = await r.arrayBuffer();
    return "data:" + mimeFor(url) + ";base64," + bytesToB64(new Uint8Array(buf));
  }

  // Mark the output as an exported standalone, BEFORE deck-narration.js runs.
  // deck-narration reads window.__DECK_EXPORTED to hide the authoring Studio
  // button, and (when no audio was baked) the Narrate + Auto-play controls too.
  function markExported(html) {
    var flag = "<script>window.__DECK_EXPORTED=true;<\/script>\n";
    var narrTag = "<script src=\"deck-narration.js\"></script>";
    if (html.indexOf(narrTag) !== -1) return html.split(narrTag).join(flag + narrTag);
    return html.replace(/<\/head>/i, flag + "</head>");
  }

  // 1) Activate + inline the baked-audio file if it's reachable next to the deck.
  async function bakeAudio(html, log) {
    var found = false;
    try {
      var probe = await fetch(abs(AUDIO_SRC), { cache: "no-store" });
      found = probe.ok && (await probe.text()).indexOf("__NARRATION_AUDIO") !== -1;
    } catch (e) { found = false; }

    if (!found) {
      log("• " + AUDIO_SRC + " not found → bundling without baked audio (Narrate + Auto-play hidden)");
      return html;
    }
    log("• " + AUDIO_SRC + " found → baking voiceover in");
    // Un-comment the optional include so the script-inliner picks it up.
    return html
      .split("<!-- <script src=\"" + AUDIO_SRC + "\"></script> -->")
      .join("<script src=\"" + AUDIO_SRC + "\"></script>");
  }


  // Everything the original <script> declared except `src` — `type="module"` above
  // all. The widened matcher tolerates attributes, and a hardcoded plain <script>
  // silently turned a module into a classic script: `Cannot use import statement
  // outside a module` on first open, and different scoping even without imports.
  function keepAttrs(tag) {
    // Case-INSENSITIVE, like the matcher that feeds this: on `<SCRIPT SRC=…>` a
    // case-sensitive indexOf("<script") returned -1, and -1 + 7 sliced from the
    // middle of the tag name — emitting `<script T>`, a bogus attribute wrapping
    // the inlined code.
    var m = /^<script\b/i.exec(tag);
    if (!m) return "";
    var inner = tag.slice(m[0].length, tag.indexOf(">"));
    // …and DROP defer/async: they are ignored on an INLINE classic script, so
    // carrying them through changed when the code runs (parse position instead of
    // after the document) while making the output look deferred. `type="module"`
    // stays — a module script is deferred inline too.
    var kept = inner
      .replace(/(^|\s)src\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, "$1")
      .replace(/(^|\s)(?:defer|async)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi, "$1")
      .trim();
    return kept ? " " + kept.replace(/\s+/g, " ") : "";
  }
  // 2) Inline every LOCAL <script src="…"></script> (skip absolute / CDN URLs).
  //
  // Tolerant of how the tag is SPELLED — `defer`, `type="module"`, single quotes
  // and a newline before the closing tag are all legal HTML and all missed the
  // old exact-spelling pattern, leaving a dead external <script> behind with no
  // log line to say so. Data blocks are not code and are left alone.
  async function inlineScripts(html, log) {
    // `\ssrc`, never `\bsrc`: `-` is a NON-word character, so `\b` fires inside
    // `data-src` and the lazy `[^>]*?` happily stopped there — the matcher captured
    // the decoy and the bundler inlined the wrong file, leaving the real one a dead
    // external reference in the "standalone". An attribute is always preceded by
    // whitespace inside a tag, so requiring it is both correct and portable (no
    // lookbehind, which this also has to run in a browser).
    //
    // The quotes are OPTIONAL: `<script src=deck-stage.js>` is legal HTML, and the
    // comment above claims tolerance of how the tag is spelled. Unquoted, it used to
    // miss entirely and leave a dead script that opens to a blank page with no log.
    var re = /<script\b(?![^>]*\btype\s*=\s*["\x27]?(?:application\/json|application\/ld\+json|text\/template))[^>]*?\ssrc\s*=\s*(?:["\x27]([^"\x27]+)["\x27]|([^\s>]+))[^>]*>\s*<\/script\s*>/gi, m, hits = [];
    // Skip tags inside an HTML comment: the widened matcher scans the whole
    // document, so `<!-- <script src="x.js"></script> -->` read as live and the
    // payload was pasted INSIDE the comment, where it never runs.
    var cre = /<!--[\s\S]*?-->/g, cm, comments = [];
    while ((cm = cre.exec(html)) !== null) comments.push([cm.index, cm.index + cm[0].length]);
    var inComment = function (i) { return comments.some(function (r) { return i >= r[0] && i < r[1]; }); };
    while ((m = re.exec(html)) !== null) { if (!inComment(m.index)) hits.push({ full: m[0], src: m[1] || m[2] }); }
    // Build the replacements first, then rewrite in ONE offset-aware pass.
    //
    // `html.split(tag).join(payload)` is a document-wide SUBSTRING replace, so it
    // also hit the identical occurrences this loop had just deliberately skipped —
    // the ones inside HTML comments. The kit's own sources quote live tags in their
    // headers and the bundler comments out the audio tag, so the collision is
    // routine, and when the pasted payload contains `-->` (this very file has
    // three) the comment ENDS EARLY and raw JavaScript spills into the document as
    // visible text, while the log still says "inlined". String.replace with a
    // function scans the original string, so its offsets line up with the comment
    // ranges measured above — no index drift to track.
    var payloads = new Map();
    for (var i = 0; i < hits.length; i++) {
      var src = hits[i].src;
      if (payloads.has(hits[i].full)) continue;
      if (/^(https?:)?\/\//.test(src)) continue; // leave CDN scripts as links
      try {
        var code = await fetchText(abs(src));
        // Neutralize any literal </script> inside the code (e.g. in doc-comments),
        // which would otherwise close the inline block early and corrupt the file.
        code = code.replace(/<\/script/gi, "<\\/script");
        payloads.set(hits[i].full, "<script" + keepAttrs(hits[i].full) + ">\n" + code + "\n<\/script>");
        log("  + inlined " + src);
      } catch (e) {
        log("  ! skipped " + src + " (" + e.message + ")");
      }
    }
    if (!payloads.size) return html;
    re.lastIndex = 0;
    return html.replace(re, function (full, q, bare, offset) {
      return inComment(offset) ? full : (payloads.get(full) || full);
    });
  }

  // 3) Embed the Google Fonts CSS + woff2 files as base64 (best-effort).
  async function embedFonts(html, log) {
    var linkRe = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"[^>]*>/;
    var m = html.match(linkRe);
    if (!m) return html;
    try {
      var css = await fetchText(m[1]); // a browser UA → Google serves woff2
      var urls = (css.match(/https:\/\/[^)"']+\.woff2/g) || []);
      for (var i = 0; i < urls.length; i++) {
        // response.ok. fetchText above already checks it for the CSS; this one did
        // not, so a 404 or a captive-portal page was base64'd under
        // `data:font/woff2` and logged as "fonts embedded" — the deck then ships
        // silently in a fallback face, the one failure this function exists to
        // prevent. The surrounding catch turns a throw into an honest skip line.
        var fr = await fetch(urls[i], { cache: "no-store" });
        if (!fr.ok) throw new Error(fr.status + " " + urls[i]);
        var buf = await fr.arrayBuffer();
        var b64 = bytesToB64(new Uint8Array(buf));
        css = css.split(urls[i]).join("data:font/woff2;base64," + b64);
      }
      html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, "");
      html = html.replace(linkRe, "<style>\n" + css + "\n</style>");
      log("• fonts embedded (" + urls.length + " files)");
    } catch (e) {
      log("• font embed skipped (" + e.message + ") — keeps the CDN link + system fallback");
    }
    return html;
  }

  // 4) Embed same-origin url(...) assets (fonts, images) inside a CSS string.
  async function embedCssUrls(css, baseUrl) {
    var RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
    var refs = [];
    css.replace(RE, function (_, u) { refs.push(u); return _; });
    var embedded = new Map();
    for (var i = 0; i < refs.length; i++) {
      var u = refs[i];
      if (embedded.has(u) || isRemote(u) || u.charAt(0) === "#") continue;
      try { embedded.set(u, await toDataUrl(new URL(u, baseUrl).href)); }
      catch (e) { /* leave the reference as-is */ }
    }
    if (!embedded.size) return css;
    // ONE pass over the url() TOKENS. The old form replaced every SUBSTRING
    // occurrence (`css.split(u).join(dataUrl)`), and refs are collected in source
    // order — so on the standard two-format face
    //   src: url('Inter.woff') format('woff'), url('Inter.woff2') format('woff2')
    // the shorter ref was substituted INSIDE the longer one, emitting
    // `url('data:font/woff;base64,<bytes>2')`, and the woff2 pass then found
    // nothing left to replace. The deck shipped a corrupted font URL and fell back
    // to a system face — silently, which is the one thing a standalone must not do.
    // Rewriting the matched token cannot collide, whatever the filenames are.
    return css.replace(RE, function (full, u) {
      return embedded.has(u) ? 'url("' + embedded.get(u) + '")' : full;
    });
  }

  // 5) Inline same-origin stylesheet <link>s as <style>, embedding their url()
  //    fonts/images. CDN / Google-Fonts links are left for embedFonts.
  async function inlineStylesheets(html, log) {
    // Comment-aware, and rewritten in ONE pass, for the reason inlineScripts is:
    // a document-wide substring replace also rewrites commented-out copies, and
    // replacing inside the loop shifts every later offset out of step with the
    // comment ranges. A commented-out tag is not live and must not be substituted.
    var cre = /<!--[\s\S]*?-->/g, cm, comments = [];
    while ((cm = cre.exec(html)) !== null) comments.push([cm.index, cm.index + cm[0].length]);
    var inComment = function (i) { return comments.some(function (r) { return i >= r[0] && i < r[1]; }); };
    var re = /<link\b[^>]*>/gi, m, tags = [];
    while ((m = re.exec(html)) !== null) { if (!inComment(m.index)) tags.push(m[0]); }
    var payloads = new Map();
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      if (payloads.has(tag)) continue;
      if (!/rel=["']?stylesheet/i.test(tag)) continue;
      // Single-quoted and unquoted too, like the script and media matchers. The
      // rel test already tolerated a single-quoted rel while this one demanded
      // double quotes, so a link tag spelling BOTH its rel and its href with
      // single quotes fell out at the `!hm` guard BEFORE the "skipped" log — not
      // inlined and not reported, leaving a dead relative reference in a file
      // whose entire purpose is to have none.
      // (Spelled in prose, not as a literal tag: this file is inlined into its
      //  own output, so a literal example here IS a match for anything scanning
      //  the bundle for live references — the kit's tests included.)
      var hm = tag.match(/\shref\s*=\s*(?:["\x27]([^"\x27]+)["\x27]|([^\s>]+))/i);
      if (!hm) { log("• stylesheet skipped " + tag + " (no href)"); continue; }
      var href = hm[1] || hm[2];
      if (isRemote(href)) continue;
      try {
        var css = await embedCssUrls(await fetchText(abs(href)), abs(href));
        payloads.set(tag, "<style>\n" + css + "\n</style>");
        log("• inlined stylesheet " + href);
      } catch (e) { log("• stylesheet skipped " + href + " (" + e.message + ")"); }
    }
    if (!payloads.size) return html;
    re.lastIndex = 0;
    return html.replace(re, function (full, offset) {
      return inComment(offset) ? full : (payloads.get(full) || full);
    });
  }

  // 6) Inline same-origin <img|audio|video|source src="…"> as base64 data URLs.
  //
  // img|audio|video|source, not img alone. A narrated deck's audio element
  // passed through untouched and unlogged — the baked-audio step only ever
  // handled the narration-audio.js SCRIPT form — so the export went out with a
  // dead relative reference to its own soundtrack.
  // scripts/deck-bundle.py matches the same four under one pattern; this is the
  // side that diverged. <source> is matched in its own right because <audio> and
  // <video> have children and the real src is usually on the child.
  async function inlineMedia(html, log) {
    // Single-quoted and unquoted too, like the script matcher above: both are legal
    // HTML and slipped through with no log line at all.
    var re = /<(?:img|audio|video|source)\b[^>]*?\ssrc\s*=\s*(?:["\x27]([^"\x27]+)["\x27]|([^\s>]+))[^>]*>/gi, m, srcs = [], n = 0;
    while ((m = re.exec(html)) !== null) srcs.push(m[1] || m[2]);
    var embedded = new Map();
    for (var i = 0; i < srcs.length; i++) {
      var src = srcs[i];
      if (embedded.has(src) || isRemote(src) || src.indexOf("data:") === 0) continue;
      try { embedded.set(src, await toDataUrl(abs(src))); n++; }
      catch (e) { log("• media skipped " + src + " (" + e.message + ")"); }
    }
    if (!embedded.size) return html;
    // Rewrite the matched TOKEN: a single-quoted or unquoted src would never be
    // found by a literal `src="X"` split, so it was fetched and then not
    // substituted.
    re.lastIndex = 0;
    html = html.replace(re, function (full, q, bare) {
      var url = embedded.get(q || bare);
      return url ? full.replace(/(\ssrc\s*=\s*)(?:["\x27][^"\x27]*["\x27]|[^\s>]+)/i, '$1"' + url + '"') : full;
    });
    log("• embedded " + n + " media file" + (n === 1 ? "" : "s"));
    return html;
  }

  // Embed url() assets in the deck's OWN inline <style> blocks. embedCssUrls ran
  // only over stylesheets pulled from a <link>, but CONTRACT.md mandates the
  // opposite shape — "Styles in one <style> block", "@font-face files copied into
  // deck/" — so on the canonical deck every font and background image survived
  // the export as a relative path and the "standalone" lost its typography the
  // moment it was sent. Verified against a real run: five @font-face faces.
  async function inlineStyleBlocks(html, log) {
    var blocks = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || [];
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var open = block.slice(0, block.indexOf(">") + 1);
      // toLowerCase: the block matcher is case-INSENSITIVE, so an uppercase
      // <STYLE> block reaches here and a case-sensitive search returns -1 —
      // slice(open.length, -1) then keeps "</STYLE" as CSS and the rewrite emits
      // a duplicated, malformed close tag.
      var close = block.toLowerCase().lastIndexOf("</style>");
      var css = block.slice(open.length, close);
      if (!/url\(/i.test(css)) continue;
      var embedded = await embedCssUrls(css, location.href);
      if (embedded === css) continue;
      html = html.split(block).join(open + embedded + block.slice(close));
      log("• embedded url() assets from an inline <style>");
    }
    return html;
  }

  async function build(opts) {
    opts = opts || {};
    var log = opts.quiet ? function () {} : function (s) { console.log("%c[deckExport]%c " + s, "color:#c75b39;font-weight:700", ""); };
    var html = await fetchText(location.href);   // the deck's pristine source
    html = await bakeAudio(html, log);
    if (opts.preview) log("• preview build — Studio kept (not marked as published)");
    else html = markExported(html);              // publish: hide authoring controls
    // BEFORE inlineScripts — see build-standalone.mjs: afterwards the
    // <style>…</style> matcher also scans the inlined JavaScript, where
    // deck-stage.js's doc comment leaves an unbalanced `<style …>` for it to
    // span from.
    // inlineScripts runs LAST of the document-wide passes: once code is pasted in,
    // every scanner also sees the JavaScript. inlineMedia rewrites
    // `src="X"` across the whole file, which would splice a base64 blob into any
    // source line mentioning one of the deck's own images — and the kit's own
    // sources do exactly that in doc comments.
    html = await inlineStyleBlocks(html, log);
    html = await inlineStylesheets(html, log);   // same-origin <link> + its url() assets
    html = await embedFonts(html, log);          // remote Google-Fonts <link>
    html = await inlineMedia(html, log);         // same-origin <img>/<audio>/<video>
    html = await inlineScripts(html, log);
    return html;
  }

  function outName(suffix) {
    var file = (location.pathname.split("/").pop() || "deck.html");
    return file.replace(/\.html?$/i, "") + "." + suffix + ".html";
  }

  function downloadHtml(html, name) {
    var blob = new Blob([html], { type: "text/html" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    return { name: name, bytes: blob.size };
  }

  // Final share-ready file: Studio removed, audio baked.
  async function publish() {
    var html = await build();
    var r = downloadHtml(html, outName("standalone"));
    var mb = (r.bytes / 1048576).toFixed(1);
    console.log("%c[deckExport]%c ✓ published " + r.name + " (" + mb + " MB) — ready to share", "color:#c75b39;font-weight:700", "");
    return r;
  }

  // Single self-contained file that KEEPS the Studio — for previewing while
  // you author, and the right deliverable in single-file environments.
  async function preview() {
    var html = await build({ preview: true });
    var r = downloadHtml(html, outName("preview"));
    var mb = (r.bytes / 1048576).toFixed(1);
    console.log("%c[deckExport]%c ✓ preview built " + r.name + " (" + mb + " MB) — Studio kept", "color:#c75b39;font-weight:700", "");
    return r;
  }

  // Back-compat alias — publish() is the final file.
  var standalone = publish;

  // ── .deck packaging ───────────────────────────────────────────────────────
  // A .deck is a Zip whose root holds deck.json (manifest) + index.html (the
  // standalone export above). It opens in a compatible deck player app.
  // Packaged with a tiny store-only (no-compression) Zip writer so the kit
  // stays zero-dependency — the player unzips it with fflate.

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // entries: [{ name, data: Uint8Array }] → Uint8Array of a valid .zip
  function zipStore(entries) {
    var enc = new TextEncoder();
    var body = [], central = [], offset = 0;

    entries.forEach(function (e) {
      var name = enc.encode(e.name), data = e.data, crc = crc32(data), len = data.length;

      var lh = new Uint8Array(30 + name.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);    // local file header sig
      lv.setUint16(4, 20, true);            // version needed
      lv.setUint16(8, 0, true);             // method: 0 = store
      lv.setUint16(12, 0x21, true);         // mod date = 1980-01-01
      lv.setUint32(14, crc, true);
      lv.setUint32(18, len, true);          // compressed size
      lv.setUint32(22, len, true);          // uncompressed size
      lv.setUint16(26, name.length, true);  // file name length
      lh.set(name, 30);
      body.push(lh, data);

      var ch = new Uint8Array(46 + name.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);    // central dir header sig
      cv.setUint16(4, 20, true);            // version made by
      cv.setUint16(6, 20, true);            // version needed
      cv.setUint16(14, 0x21, true);         // mod date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, len, true);
      cv.setUint32(24, len, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);       // offset of local header
      ch.set(name, 46);
      central.push(ch);

      offset += lh.length + data.length;
    });

    var centralSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);      // end of central dir sig
    ev.setUint16(8, entries.length, true);  // entries on this disk
    ev.setUint16(10, entries.length, true); // total entries
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);         // central dir offset

    var all = body.concat(central, [eocd]);
    var total = all.reduce(function (a, c) { return a + c.length; }, 0);
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  function slug(s) {
    return (s || "deck").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "deck";
  }

  function deckManifest() {
    var labelEl = document.querySelector("[data-label]");
    var title = ((document.title || "").trim())
      || (labelEl && labelEl.getAttribute("data-label"))
      || "Untitled Deck";
    var file = (location.pathname.split("/").pop() || "deck").replace(/\.(dc\.)?html?$/i, "");
    return {
      schema: 1,
      id: slug(file) || slug(title),
      title: title,
      entry: "index.html",
      orientation: "landscape",   // deck-stage renders 1920×1080
      author: "",
      version: "1.0.0"
    };
  }

  // Optional preview thumbnail, baked into the .deck and recorded as
  // manifest.thumbnail so player libraries can show a preview. Two sources,
  // checked in order:
  //   1) opts.thumbnail — a "data:" URL string, or { name, data: Uint8Array }.
  //   2) a conventional file sitting next to the deck (mirrors the audio flow):
  //      thumbnail.png / .jpg / .jpeg / .webp / .svg.
  // Absent → the .deck simply ships without one (the field is optional).
  var THUMB_CANDIDATES = ["thumbnail.png", "thumbnail.jpg", "thumbnail.jpeg", "thumbnail.webp", "thumbnail.svg"];

  function extForMime(mime) {
    if (/png/i.test(mime)) return "png";
    if (/jpe?g/i.test(mime)) return "jpg";
    if (/webp/i.test(mime)) return "webp";
    if (/svg/i.test(mime)) return "svg";
    return "png";
  }

  function dataUrlToBytes(url) {
    var comma = url.indexOf(",");
    var head = url.slice(0, comma);
    var raw = url.slice(comma + 1);
    if (/;base64/i.test(head)) {
      var bin = atob(raw);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new TextEncoder().encode(decodeURIComponent(raw));
  }

  async function collectThumbnail(opts, log) {
    var t = opts.thumbnail;
    if (typeof t === "string" && /^data:/i.test(t)) {
      var mime = t.slice(5, t.indexOf(","));
      var name = "thumbnail." + extForMime(mime);
      log("• thumbnail from opts (data URL) → " + name);
      return { name: name, data: dataUrlToBytes(t) };
    }
    if (t && t.data) {
      log("• thumbnail from opts → " + (t.name || "thumbnail.png"));
      return { name: t.name || "thumbnail.png", data: t.data };
    }
    for (var i = 0; i < THUMB_CANDIDATES.length; i++) {
      try {
        var r = await fetch(abs(THUMB_CANDIDATES[i]), { cache: "no-store" });
        if (r.ok) {
          log("• " + THUMB_CANDIDATES[i] + " found → adding to package");
          return { name: THUMB_CANDIDATES[i], data: new Uint8Array(await r.arrayBuffer()) };
        }
      } catch (e) { /* keep probing */ }
    }
    log("• no thumbnail found (drop a thumbnail.png next to the deck to add one)");
    return null;
  }

  // Build the standalone HTML, wrap it as a .deck package, and download it.
  async function deck(opts) {
    opts = opts || {};
    var log = opts.quiet ? function () {} : function (s) { console.log("%c[deckExport]%c " + s, "color:#c75b39;font-weight:700", ""); };
    var html = await build({ quiet: opts.quiet });
    var manifest = Object.assign(deckManifest(), opts.manifest || {});
    var thumb = await collectThumbnail(opts, log);
    if (thumb) manifest.thumbnail = thumb.name;
    var enc = new TextEncoder();
    var entries = [
      { name: "deck.json", data: enc.encode(JSON.stringify(manifest, null, 2)) },
      { name: "index.html", data: enc.encode(html) }
    ];
    if (thumb) entries.push({ name: thumb.name, data: thumb.data });
    var zip = zipStore(entries);
    var blob = new Blob([zip], { type: "application/x-deck" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = manifest.id + ".deck";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    var mb = (blob.size / 1048576).toFixed(1);
    log("✓ downloaded " + a.download + " (" + mb + " MB) — open it in a compatible deck player app");
    return { name: a.download, bytes: blob.size, manifest: manifest };
  }

  window.deckExport = { preview: preview, publish: publish, standalone: standalone, build: build, deck: deck };

  // Print the hint once, alongside the narration Studio hint.
  try {
    console.log("%c[deckExport]%c run %cdeckExport.preview()%c for a single file that keeps the Studio, %cdeckExport.publish()%c for the final share-ready .html, or %cdeckExport.deck()%c to package a portable .deck file",
      "color:#c75b39;font-weight:700", "", "font-weight:700", "", "font-weight:700", "", "font-weight:700", "");
  } catch (e) {}
})();
