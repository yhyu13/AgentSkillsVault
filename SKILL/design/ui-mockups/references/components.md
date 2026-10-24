# Copy-paste components

Battle-tested snippets. All inline-styled, no dependencies. Swap hexes for the brand.

## Browser window shell

```html
<div style="border-radius:12px;overflow:hidden;border:1px solid #e3e3df;box-shadow:0 1px 2px rgba(20,20,15,.04),0 12px 32px rgba(20,20,15,.05);background:#fff">
  <div style="display:flex;align-items:center;height:34px;background:#fff;border-bottom:1px solid #f0f0ec;padding:0 14px">
    <div style="display:flex;gap:5px">
      <span style="width:8px;height:8px;border-radius:50%;background:#fca5a5"></span>
      <span style="width:8px;height:8px;border-radius:50%;background:#fcd34d"></span>
      <span style="width:8px;height:8px;border-radius:50%;background:#86efac"></span>
    </div>
  </div>
  <!-- app toolbar + content go here -->
</div>
```

## App toolbar with avatar stack

```html
<div style="height:44px;background:#fff;border-bottom:1px solid #ececea;display:flex;align-items:center;justify-content:space-between;padding:0 16px">
  <div style="display:flex;align-items:center;gap:9px">
    <span style="font-size:12px;font-weight:600;letter-spacing:-.01em">workspace-name</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:500;color:#16a34a">
      <span style="width:5px;height:5px;border-radius:50%;background:#22c55e"></span>Live</span>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <div style="display:flex">
      <span style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#ff5bd6,#8b5cf6);color:#fff;font-size:8.5px;font-weight:600;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff">K</span>
      <span style="width:20px;height:20px;border-radius:50%;background:#f4f4f1;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;margin-left:-6px"><img src="https://icons.duckduckgo.com/ip3/claude.ai.ico" width="12" height="12" alt=""></span>
    </div>
    <span style="font-size:10.5px;font-weight:500;border:1px solid #dcdcd7;border-radius:999px;padding:4px 12px">Share</span>
    <span style="font-size:10.5px;font-weight:500;background:#161614;color:#fff;border-radius:999px;padding:4px 12px">Invite</span>
  </div>
</div>
```

## Dot-grid canvas region

```html
<div style="position:relative;height:540px;overflow:hidden;background:#fcfcfb;background-image:radial-gradient(#e5e5e0 1px,transparent 1px);background-size:22px 22px">
  <!-- absolutely-positioned artboards, panels, cursors -->
</div>
```

## Docked side panel

```html
<div style="position:absolute;top:44px;right:0;bottom:0;width:220px;background:#fff;border-left:1px solid #f0f0ec;padding:16px;z-index:3">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <span style="font-size:12px;font-weight:600">Tasks</span><span style="font-size:10px;color:#a3a39c">3</span>
  </div>
  <div style="display:flex;gap:9px;margin-top:16px;align-items:flex-start">
    <img src="https://icons.duckduckgo.com/ip3/claude.ai.ico" width="16" height="16" alt="">
    <div>
      <div style="font-size:11px;font-weight:600">Claude</div>
      <div style="font-size:10.5px;color:#8a8a84;line-height:1.45">Streaming the pricing grid…</div>
    </div>
  </div>
  <div style="background:#fafaf8;border:1px solid #f0f0ec;border-radius:8px;padding:10px 11px;margin-top:16px">
    <div style="font-size:10.5px;color:#3d3d38;line-height:1.5"><b>Kevin</b> · Try a darker footer</div>
    <div style="font-size:10px;color:#16a34a;margin-top:4px;font-weight:500">Picked up by Codex</div>
  </div>
</div>
```

## Named cursor (drifting)

```html
<style>@keyframes drift1{0%,100%{transform:translate(0,0)}35%{transform:translate(18px,12px)}70%{transform:translate(6px,24px)}}</style>
<div style="position:absolute;left:640px;top:300px;z-index:4;display:flex;align-items:flex-start;animation:drift1 8s ease-in-out infinite">
  <svg width="13" height="13" viewBox="0 0 24 24"><path d="M4 2l16 8-7 2-3 7z" fill="#d97757"/></svg>
  <span style="background:#d97757;color:#fff;font-size:9px;font-weight:600;border-radius:999px;padding:2px 8px;margin-left:2px;margin-top:8px">Claude</span>
</div>
```

## "Working on it" badge (above an active card)

```html
<div style="display:flex;align-items:center;gap:10px">
  <span style="font-size:10.5px;font-weight:500;color:#a3a39c">Simple pricing</span>
  <div style="display:flex;align-items:center;gap:6px;background:#d97757;border-radius:999px;padding:5px 12px 5px 9px;box-shadow:0 1px 3px rgba(217,119,87,.35)">
    <img src="https://api.iconify.design/ri/claude-fill.svg?color=%23ffffff&height=11" width="11" height="11" alt="">
    <span style="font-size:10px;font-weight:600;color:#fff">Claude is designing…</span>
  </div>
</div>
```

## Streaming reveal (the money shot)

A white cover sweeps down an active card, revealing content behind a glowing gradient line.
Put this inside a card with `position:relative;overflow:hidden`:

```html
<style>@keyframes reveal{0%,8%{top:57%}90%,100%{top:101%}}</style>
<div style="position:absolute;left:0;right:0;bottom:0;top:57%;background:#fff;animation:reveal 7s cubic-bezier(.4,0,.6,1) infinite">
  <div style="position:absolute;top:-2px;left:0;right:0;height:2px;background:linear-gradient(90deg,#ff5bd6,#8b5cf6,#38bdf8);box-shadow:0 0 10px rgba(139,92,246,.75)"></div>
</div>
```

## Sequential skeleton build + blinking caret

```html
<style>
@keyframes blink{0%,55%{opacity:1}56%,100%{opacity:0}}
@keyframes b1{0%,2%{width:0}12%{width:100%}100%{width:100%}}
@keyframes b2{0%,16%{width:0}28%{width:100%}100%{width:100%}}
</style>
<div style="height:8px;width:64%"><div style="height:8px;border-radius:3px;background:linear-gradient(90deg,#ff5bd6,#8b5cf6);animation:b1 7s linear infinite"></div></div>
<div style="height:5px;width:88%;margin-top:9px"><div style="height:5px;border-radius:3px;background:#e7e7e2;animation:b2 7s linear infinite"></div></div>
<span style="display:inline-block;width:6px;height:12px;background:#8b5cf6;animation:blink 1s steps(2,start) infinite"></span>
```

## Presence chip

```html
<div style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid #e6e6e2;border-radius:999px;padding:6px 12px;box-shadow:0 1px 3px rgba(20,20,15,.05)">
  <img src="https://icons.duckduckgo.com/ip3/claude.ai.ico" width="13" height="13" alt="">
  <span style="font-size:10.5px;font-weight:600">Claude</span>
  <span style="font-size:10.5px;color:#8a8a84">streaming the pricing grid…</span>
</div>
```

## Flexbox bar chart (no library)

```html
<div style="display:flex;align-items:flex-end;gap:3px;height:64px">
  <div style="flex:1;height:38%;background:#e4e4e0"></div>
  <div style="flex:1;height:68%;background:linear-gradient(180deg,#c084fc,#8b5cf6)"></div>
  <div style="flex:1;height:44%;background:linear-gradient(180deg,#c084fc,#8b5cf6)"></div>
  <div style="flex:1;height:26%;background:#e4e4e0"></div>
  <!-- repeat -->
</div>
```

## Inline SVG glyphs (instead of unicode)

```html
<!-- ↗ external-link arrow -->
<svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 8L8 2M3 2h5v5" stroke="#8f8f88" fill="none" stroke-width="1.3"/></svg>
<!-- ▾ dropdown caret as CSS -->
<span style="display:inline-block;width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid #71716b"></span>
```
