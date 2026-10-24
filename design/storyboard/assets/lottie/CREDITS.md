# Lottie assets — credits & licenses

## Owned, bundled (MIT)
The `*.json` Lottie files in this directory are **generated** by
`skill/make_lotties.py` and are owned by this project (MIT, same as the repo).
Regenerate or extend them with:

```bash
python skill/make_lotties.py
```

Bundled set: `check`, `confetti`, `heart`, `stars`, `sparkles`, `loader`,
`fireworks`. They are also inlined into `skill/assets/lottie-bundle.js`
(`window.SB_LOTTIE`) so decks can play them via `data-key` offline and from
`file://` (no XHR). Play with the engine's `lottie` preset:

```html
<div class="anim" data-anim="lottie" data-key="confetti" data-lottie-loop="1"></div>
<div class="anim" data-anim="lottie" data-src="assets/lottie/check.json" data-dur="2"></div>
```

## Library
Playback uses **lottie-web** (Airbnb), MIT License — vendored at
`skill/assets/vendor/lottie_svg.min.js` (SVG renderer, v5.12.2).
https://github.com/airbnb/lottie-web

## Fetched-on-demand Lotties
If you fetch external Lotties with `lottie_fetch.py`, it appends the source URL
+ date here. **Always verify the source license before shipping.**
