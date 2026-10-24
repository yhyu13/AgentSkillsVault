/* =============================================================================
   STORYBOARD ENGINE — composable animator core (v0.8)
   Single source of truth for the storyboard skill's playback engine.

   v0.8 — deterministic timeline:
     - The whole visual state is ONE pure function of time: renderFrame(t).
       The live rAF loop (audio clock, or a synthetic clock without audio),
       seek(t) and renderAt(t) all go through it, so a frame looks identical
       no matter which times were rendered before (forward, backward, random).
     - Slide transitions (all types), shared-element morphs and word hits are
       keyframe functions of t — they render in offline frame export too.
     - window.SB_OFFLINE: the engine never touches the <audio> element and runs
       no clock of its own; frames change only via renderAt(t). Each offline frame
       also rebuilds the layout tree (fresh raster), so pixels depend on t alone;
       window.SB_FRESH_RASTER=false skips that (~8-14ms/frame at 1080p).
     - New API: ready(), duration(), events(), meta(), VERSION, onFrame(),
       registerTransition(); window.STORYBOARD aliases window.Storyboard.
     - Init options: root / slideSelector / slides / audio / scaleDeck, plus
       words (per-word timestamps) and captions (stored on Storyboard.words /
       Storyboard.captions for the caption + lip-sync layers).
     - window.SB_AUDIO_ENV = {fps, values[]} drives beat loops / waveform /
       lip-sync deterministically; window.SB_DURATION overrides duration().

   Frame pipeline (renderFrame(t), in order): restore transient layers ->
   slides + transition keyframes -> overlay mount pass -> park newly off-screen
   slides -> overlay neutral pass -> COMPOSITOR layers
   (entrance -> data-then steps -> data-hold -> data-loop -> word hits -> data-exit
   -> camera / parallax planes) -> composite commit (one transform / opacity /
   filter write per element) -> shared-element morphs -> post pass (cursor tours)
   -> offline: CSS-animation sync -> onFrame hooks (offline frames start by
   tearing the layout tree down: fresh raster).
   Layers per element: the ENTRANCE (data-anim) owns its styles and is re-applied
   every frame (before its start: its p=0 state, hidden — and nothing else on the
   element runs). OVERLAYS (data-then steps, word hits) run over [t, t+dur], then
   hold their end state (impulse presets — pulse, shake, wobble, squash — settle
   back); outside their window they are absent: host styles are transient (put back
   to the element's BASE inline style at the start of the next frame), whatever
   their one-time setup built (children, classes, host setup styles) is only on the
   host inside the window (OVERLAY RECORDS), and presets' neutral() hooks reset the
   child / attribute state they own. Exits, loops, holds, morphs and press feedback
   are transient too. Off-screen slides are parked in their pre-entrance state. So no
   frame inherits state from an earlier one. Layers STACK: transforms wrap (later
   layer = outer), opacities multiply, filters concatenate — see COMPOSITOR.

   What's new vs the inline v0.2 engine:
     - Named easing registry + per-element data-ease override
     - Tunable spring physics (data-spring="stiffness,damping")
     - data-stagger on a container -> auto-distribute child start times
     - Chained sequences: data-then="pulse@1.5; float"
     - Continuous ambient loops: data-loop="float|breathe|orbit|rotate|sway|beat"
     - 3D presets: flipInX, flipInY, cardFlip, tiltIn, zoomThrough
     - Data-viz: barGrow, columnRace, lineDraw, donutSweep, ringFill, comparisonBar
     - Cinematic: shared-element transitions (data-shared-id) + camera rig
     - Beat-sync via WebAudio AnalyserNode (amplitude-reactive loops)

   Usage (in an HTML deck):
     <audio id="voAudio" src="voiceover.mp3" preload="auto"></audio>
     <script src="storyboard-engine.js"></script>
     <script>
       const TIMINGS = [{time:0,slide:1}, ...];
       const SLIDE_LABELS = ['Intro', ...];
       const WORD_HITS = [];           // [{time, sel, hit}]
       const WORDS = [];               // [{text, start, end}]
       Storyboard.init({ timings:TIMINGS, labels:SLIDE_LABELS, wordHits:WORD_HITS,
                         words:WORDS, fallbackDuration:90 });
     </script>
   Offline export: set window.SB_OFFLINE=true before the engine loads, await
   Storyboard.ready(), then call Storyboard.renderAt(t) per frame.

   Markup contract (unchanged + extended):
     <section class="slide" data-slide="N" data-transition-in="dissolve" data-transition-dur="0.9">
     <h1 class="anim" data-anim="spring" data-t-rel="0.5" data-dur="1.2"
         data-ease="outBack" data-then="pulse@1.5" data-loop="breathe" data-hold="float"
         data-exit="popOut" data-exit-at="6"></h1>
     <ul class="anim-group" data-anim="slideInLeft" data-stagger="0.12" data-t-rel="1.0"><li>..</li></ul>
============================================================================= */
(function (global) {
  'use strict';

  /* ===========================================================================
     EASING REGISTRY — named curves, addressable via data-ease="<name>"
  =========================================================================== */
  const EASE = {
    linear:     p => p,
    inQuad:     p => p * p,
    outQuad:    p => 1 - (1 - p) * (1 - p),
    inOutQuad:  p => p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2,
    inCubic:    p => p * p * p,
    outCubic:   p => 1 - Math.pow(1 - p, 3),
    inOutCubic: p => p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3) / 2,
    outQuart:   p => 1 - Math.pow(1 - p, 4),
    outQuint:   p => 1 - Math.pow(1 - p, 5),
    outExpo:    p => p === 1 ? 1 : 1 - Math.pow(2, -10 * p),
    inOutExpo:  p => p === 0 ? 0 : p === 1 ? 1 : p < 0.5
                      ? Math.pow(2, 20*p - 10) / 2
                      : (2 - Math.pow(2, -20*p + 10)) / 2,
    outBack:    p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3*Math.pow(p-1,3) + c1*Math.pow(p-1,2); },
    inBack:     p => { const c1 = 1.70158, c3 = c1 + 1; return c3*p*p*p - c1*p*p; },
    outElastic: p => { const c4 = (2*Math.PI)/3; return p===0?0:p===1?1:Math.pow(2,-10*p)*Math.sin((p*10-0.75)*c4)+1; },
    outBounce:  p => {
      const n1 = 7.5625, d1 = 2.75;
      if (p < 1/d1) return n1*p*p;
      if (p < 2/d1) return n1*(p-=1.5/d1)*p + 0.75;
      if (p < 2.5/d1) return n1*(p-=2.25/d1)*p + 0.9375;
      return n1*(p-=2.625/d1)*p + 0.984375;
    },
  };
  // Short aliases
  EASE.smooth = EASE.inOutCubic;
  EASE.snap   = EASE.outQuint;
  EASE.pop    = EASE.outBack;

  /* Spring solver — analytic damped oscillator sampled over normalized [0,1].
     stiffness ~ 80..400, damping ~ 8..30. Returns a 0->1 curve that may
     overshoot (underdamped) before settling. Cached per (k,c). */
  const _springCache = {};
  function springCurve(stiffness, damping) {
    const key = stiffness + ':' + damping;
    if (_springCache[key]) return _springCache[key];
    // Build a lookup table by integrating the spring ODE (semi-implicit Euler)
    const m = 1, k = stiffness, c = damping;
    const steps = 240, dtTotal = 1.0;
    let x = 0, v = 0; const dt = dtTotal / steps;
    const table = new Float32Array(steps + 1);
    for (let i = 0; i <= steps; i++) {
      table[i] = x;
      const a = (-k * (x - 1) - c * v) / m;
      v += a * dt;
      x += v * dt;
    }
    const last = table[steps] || 1;
    // Normalize so the curve ends exactly at 1
    const fn = p => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      const f = p * steps, i = Math.floor(f), frac = f - i;
      const a = table[i], b = table[i + 1] !== undefined ? table[i + 1] : last;
      return (a + (b - a) * frac) / last;
    };
    _springCache[key] = fn;
    return fn;
  }

  function resolveEase(el) {
    if (el.dataset.spring) {
      const [k, c] = el.dataset.spring.split(',').map(parseFloat);
      return springCurve(k || 200, c || 14);
    }
    if (el.dataset.ease && EASE[el.dataset.ease]) return EASE[el.dataset.ease];
    return null; // null => use preset's internal ease
  }

  /* CSS cubic-bezier(x1,y1,x2,y2) as a p->eased function (same curve WAAPI/CSS use). */
  function cubicBezier(x1, y1, x2, y2) {
    const cx=3*x1, bx=3*(x2-x1)-cx, ax=1-cx-bx, cy=3*y1, by=3*(y2-y1)-cy, ay=1-cy-by;
    const sx=t=>((ax*t+bx)*t+cx)*t, sy=t=>((ay*t+by)*t+cy)*t, dsx=t=>(3*ax*t+2*bx)*t+cx;
    return p => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let t = p;
      for (let i = 0; i < 8; i++) {                       // Newton-Raphson
        const x = sx(t) - p; if (Math.abs(x) < 1e-7) return sy(t);
        const d = dsx(t); if (Math.abs(d) < 1e-6) break; t -= x / d;
        if (t < 0 || t > 1) break;
      }
      let lo = 0, hi = 1; t = p;                          // bisection fallback
      for (let i = 0; i < 40; i++) { const x = sx(t); if (Math.abs(x - p) < 1e-7) break; if (x < p) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  /* Piecewise-linear keyframe track: stops = [[offset, value], ...] sampled at e. */
  function kf(stops, e) {
    if (e <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i-1], b = stops[i];
      if (e <= b[0]) return b[0] > a[0] ? a[1] + (b[1]-a[1]) * (e-a[0]) / (b[0]-a[0]) : b[1];
    }
    return stops[stops.length-1][1];
  }
  /* Local progress of p inside the sub-window [a,b] (0 before, 1 after). */
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  /* Round to 4 decimals for CSS strings: exponent-free and identical for identical inputs. */
  const f4 = v => { const r = Math.round(v * 1e4) / 1e4; return r === 0 ? 0 : r; };
  /* Write text only when it changed (avoids a relayout per frame for settled text). */
  function _setText(el, s) { if (el.textContent !== s) el.textContent = s; }

  /* ===========================================================================
     PRESET LIBRARY
     Each preset: { dur, ease?, apply(el, p, ctx), reset?(el, ctx), neutral?(el, ctx) }
     where p is RAW progress 0..1. If a preset reads `ctx.ease`, the per-element
     override is applied; otherwise the preset eases internally (back-compat with
     v0.2 presets). ctx = { ease, time, start, dur, level, frame }: `time` is the
     absolute clock (seconds), `start`/`dur` the layer's window, `level` the audio
     level 0..1 at `time` (null when unknown). Presets must derive their visuals
     from (p, time) only — never from wall-clock timers — so every frame is
     reproducible, and apply() must write ALL the state it owns every call.
     One-time DOM setup (splitting text, building SVG) goes behind an init guard
     (dataset flag / expando) so it runs once; the engine runs it at init.
     Hooks:
       reset(el)    entrance not started yet: restore layout-affecting content
                    (full text, sizes) — runs after apply(el, 0) with the element
                    hidden (opacity 0).
       neutral(el)  the preset used as a data-then step or word hit, outside its
                    window: put the CHILD / text / attribute state it owns back to
                    "as if never applied" (the host's inline style is restored by
                    the engine, and children / classes its setup built or added are
                    taken off the host by the engine — see OVERLAY RECORDS). Only
                    needed for presets that write beyond the host element's own style
                    and its setup's build: styling the author's own children in place,
                    or nodes outside the host (connectorDraw's arrowheads).
     Flags: emphasis:true / fun:true classify the preset in Storyboard.events();
     impulse:true = its p=1 state is the rest state (pulse, shake...), so as a step /
     word hit it is not held after its window; prestart:false = don't run apply(el,0)
     before the entrance starts (presets with side effects outside the element).
  =========================================================================== */
  const E = EASE;
  const _nFullText = el => { if (el.dataset.fullText !== undefined) _setText(el, el.dataset.fullText); };
  const _nText0 = el => { if (el._sbText0 !== undefined) _setText(el, el._sbText0); };
  const _nTyped = el => { if (el._sbText0 === undefined) return; if ('value' in el){ if (el.value !== el._sbText0) el.value = el._sbText0; } else _setText(el, el._sbText0); };
  function _nEach(el, sel, fn){ const ns=el.querySelectorAll(sel); for (let i=0;i<ns.length;i++) fn(ns[i], i); }
  /* Remember an attribute's authored value once; restore it later (null = absent). */
  function _attr0(node, name){ const k='_sbA0_'+name; if(!(k in node)) node[k]=node.getAttribute(name); return node[k]; }
  function _attrRestore(node, name){ const k='_sbA0_'+name; if(!(k in node)) return; const v=node[k];
    if(v===null){ if(node.hasAttribute(name)) node.removeAttribute(name); } else if(node.getAttribute(name)!==v) node.setAttribute(name, v); }
  const PRESETS = {
    /* --- basics --- */
    fadeIn:  { dur: 0.8, apply: (el,p,c) => { el.style.opacity = (c.ease||E.outCubic)(p); } },
    fadeOut: { dur: 0.8, apply: (el,p,c) => { el.style.opacity = 1-(c.ease||E.outCubic)(p); } },
    fadeUp:  { dur: 1.0, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transform=`translateY(${(1-e)*40}px)`; } },
    fadeDown:{ dur: 1.0, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transform=`translateY(${(1-e)*-40}px)`; } },
    slideInLeft:  { dur: 1.0, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transform=`translateX(${(1-e)*-120}px)`; } },
    slideInRight: { dur: 1.0, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transform=`translateX(${(1-e)*120}px)`; } },
    scaleIn: { dur: 1.0, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transform=`scale(${0.85+0.15*e})`; } },
    crossfade: { dur: 1.2, apply: (el,p,c) => { el.style.opacity = el.dataset.out==='1' ? (1-p) : p; } },

    /* --- physics / 12 principles --- */
    anticipate: { dur: 1.2, apply: (el,p,c) => {
      let x; if (p<0.25){x=-8*(p/0.25);} else {const q=(p-0.25)/0.75; x=-8+(8+100)*E.outBack(q);}
      el.style.opacity=Math.min(1,p*3); el.style.transform=`translateX(${-x}px)`;
    }},
    overshoot: { dur: 1.0, apply: (el,p,c) => { el.style.opacity=(c.ease||E.outCubic)(p); el.style.transform=`translateY(${(1-E.outBack(p))*30}px)`; } },
    spring:  { dur: 1.2, apply: (el,p,c) => { el.style.opacity=Math.min(1,p*2); const s=0.7+0.3*(c.ease||E.outElastic)(p); el.style.transform=`scale(${s})`; } },
    bounce:  { dur: 1.2, apply: (el,p,c) => { el.style.opacity=Math.min(1,p*2); el.style.transform=`translateY(${(1-E.outBounce(p))*-120}px)`; } },
    wobble:  { dur: 0.9, impulse: true, apply: (el,p,c) => { el.style.opacity=1; el.style.transform=`rotate(${f4(Math.sin(p*Math.PI*4)*(1-p)*4)}deg)`; } },
    shake:   { dur: 0.5, impulse: true, apply: (el,p,c) => { el.style.opacity=1; el.style.transform=`translateX(${f4(Math.sin(p*Math.PI*10)*(1-p)*12)}px)`; } },
    squash:  { dur: 0.6, impulse: true, apply: (el,p,c) => { el.style.opacity=1; const ph=Math.sin(p*Math.PI); el.style.transform=`scale(${f4(1+ph*0.18)},${f4(1-ph*0.22)})`; } },
    pulse:   { dur: 0.9, impulse: true, apply: (el,p,c) => { el.style.opacity=1; el.style.transform=`scale(${f4(1+0.08*Math.sin(p*Math.PI))})`; } },

    /* --- 3D (NEW) --- */
    flipInX: { dur: 1.1, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transformOrigin='center'; el.style.transform=`perspective(1200px) rotateX(${(1-e)*-90}deg)`; } },
    flipInY: { dur: 1.1, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.transformOrigin='center'; el.style.transform=`perspective(1200px) rotateY(${(1-e)*90}deg)`; } },
    cardFlip:{ dur: 1.3, apply: (el,p,c) => { const e=(c.ease||E.inOutCubic)(p); el.style.opacity=Math.min(1,p*4); el.style.transform=`perspective(1400px) rotateY(${180*(1-e)}deg)`; } },
    tiltIn:  { dur: 1.1, apply: (el,p,c) => { const e=(c.ease||E.outBack)(p); el.style.opacity=Math.min(1,p*3); el.style.transform=`perspective(1200px) rotateX(${(1-e)*18}deg) rotateZ(${(1-e)*-6}deg) translateY(${(1-e)*40}px)`; } },
    zoomThrough: { dur: 1.2, apply: (el,p,c) => { const e=(c.ease||E.outExpo)(p); el.style.opacity=Math.min(1,p*2.5); el.style.transform=`perspective(1000px) translateZ(${(1-e)*-600}px)`; } },

    /* --- text --- */
    typewriter: { dur: 1.5, apply: (el,p,c) => {
      if (!el.dataset.fullText) el.dataset.fullText = el.textContent;
      const t=el.dataset.fullText, n=Math.floor(t.length*(c.ease||E.outCubic)(p));
      _setText(el, t.slice(0,n)); el.style.opacity=1;
    }, reset: _nFullText, neutral: _nFullText },
    wordReveal: { dur: 1.8, neutral: el => _nEach(el, '.wr-w', w => { w.style.opacity=1; }), apply: (el,p,c) => {
      if (!el.dataset.wrInit) {
        el.dataset.wrInit='1';
        const words = el.innerHTML.split(/(\s+)/);
        el.innerHTML = words.map(w => /\S/.test(w) ? `<span class="wr-w" style="opacity:0">${w}</span>` : w).join('');
        el.dataset.wordCount = el.querySelectorAll('.wr-w').length;
      }
      el.style.opacity=1;
      const n=parseInt(el.dataset.wordCount,10), shown=Math.floor(n*(c.ease||E.outCubic)(p));
      el.querySelectorAll('.wr-w').forEach((w,i)=>{ w.style.opacity = i<shown?1:0; });
    }},
    letterSpring: { dur: 1.6, neutral: el => _nEach(el, '.ls-c', s => { s.style.opacity=1; s.style.transform=''; }), apply: (el,p,c) => {
      if (!el.dataset.lsInit) {
        el.dataset.lsInit='1';
        // If the host carries a clipped gradient (.gradient-fill), capture the
        // resolved gradient so each per-letter span can re-clip it. Otherwise
        // the spans inherit transparent text-fill with no gradient box = invisible.
        let grad=null;
        if (el.classList.contains('gradient-fill')) {
          grad=getComputedStyle(el).backgroundImage;
          el.style.webkitTextFillColor='currentColor'; el.style.color='transparent';
        }
        const gstyle = grad ? `;background-image:${grad};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent` : '';
        // Preserve <br> line breaks: wrap chars per segment, rejoin with <br>.
        const segments = el.innerHTML.split(/<br\s*\/?>/i);
        el.innerHTML = segments.map(seg => {
          const txt = seg.replace(/<[^>]+>/g,''); // strip any stray tags within a segment
          return [...txt].map(ch=>ch===' '?' ':`<span class="ls-c" style="display:inline-block;opacity:0${gstyle}">${ch}</span>`).join('');
        }).join('<br>');
        el.dataset.charCount=el.querySelectorAll('.ls-c').length;
      }
      el.style.opacity=1;
      const cs=el.querySelectorAll('.ls-c'), n=cs.length;
      cs.forEach((s,i)=>{
        const local=Math.max(0,Math.min(1,(p*n - i*0.6)/1.2));
        const e=E.outBack(local);
        s.style.opacity=local>0?1:0;
        s.style.transform=`translateY(${(1-e)*30}px) scale(${0.6+0.4*e})`;
      });
    }},
    scramble: { dur: 1.6, apply: (el,p,c) => {
      if (!el.dataset.fullText) el.dataset.fullText = el.textContent;
      const t=el.dataset.fullText, e=(c.ease||E.outCubic)(p), n=Math.floor(t.length*e);
      const glyphs='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@';
      let out=t.slice(0,n);
      for (let i=n;i<t.length;i++) out += t[i]===' '?' ':glyphs[(i*7 + Math.floor(p*60))%glyphs.length];
      _setText(el, out); el.style.opacity=1;
    }, reset: _nFullText, neutral: _nFullText },
    tracking: { dur: 1.2, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=e; el.style.letterSpacing=`${(1-e)*0.2}em`; },
      reset: (el,c) => { el.style.letterSpacing='0.2em'; } },
    gradientSweep: { dur: 2.0, apply: (el,p,c) => {
      el.style.opacity=Math.min(1,p*3);
      const fill=el.classList.contains('gradient-fill')?el:el.querySelector('.gradient-fill');
      if (fill){ if(fill!==el && fill._sbBgPos0===undefined) fill._sbBgPos0=fill.style.backgroundPosition; fill.style.backgroundPosition=`${f4(100-p*100)}% 50%`; }
    }, neutral: el => { const fill=el.classList.contains('gradient-fill')?null:el.querySelector('.gradient-fill');
      if(fill && fill._sbBgPos0!==undefined) fill.style.backgroundPosition=fill._sbBgPos0; } },
    splitReveal: { dur: 1.2, apply: (el,p,c) => { const e=(c.ease||E.inOutCubic)(p); el.style.opacity=1; el.style.clipPath=`inset(${(1-e)*50}% 0 ${(1-e)*50}% 0)`; } },

    /* --- numbers --- */
    counter: { dur: 1.8, apply: (el,p,c) => {
      if (el._sbText0 === undefined) el._sbText0 = el.textContent;
      const to=parseFloat(el.dataset.to)||0, dec=parseInt(el.dataset.decimals||'0',10), suf=el.dataset.suffix||'', pre=el.dataset.prefix||'';
      const val=to*(c.ease||E.outQuint)(p);
      _setText(el, pre+val.toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf);
      el.style.opacity=1;
    }, reset: _nText0, neutral: _nText0 },

    /* --- camera / framing --- */
    kenburns: { dur: 10, apply: (el,p,c) => {
      const z=parseFloat(el.dataset.zoom||'0.1'), dx=parseFloat(el.dataset.dx||'2'), dy=parseFloat(el.dataset.dy||'-2');
      el.style.opacity=1; el.style.transform=`scale(${1+z*p}) translate(${p*dx}%,${p*dy}%)`;
    }},
    cameraZoom: { dur: 2.5, apply: (el,p,c) => {
      const to=parseFloat(el.dataset.scale||'1.5'), ox=parseFloat(el.dataset.ox||'50'), oy=parseFloat(el.dataset.oy||'50'), e=(c.ease||E.inOutCubic)(p);
      el.style.opacity=1; el.style.transformOrigin=`${ox}% ${oy}%`; el.style.transform=`scale(${1+(to-1)*e})`;
    }},
    cameraPan: { dur: 3.0, apply: (el,p,c) => {
      const dx=parseFloat(el.dataset.dx||'0'), dy=parseFloat(el.dataset.dy||'0'), e=(c.ease||E.inOutCubic)(p);
      el.style.opacity=1; el.style.transform=`translate(${e*dx}px,${e*dy}px)`;
    }},
    focusBlur: { dur: 1.4, apply: (el,p,c) => { const e=(c.ease||E.outCubic)(p); el.style.opacity=Math.min(1,p*3); el.style.filter=`blur(${(1-e)*14}px)`; } },
    parallax: { dur: 8, apply: (el,p,c) => { const r=parseFloat(el.dataset.range||'40'); el.style.opacity=1; el.style.transform=`translateY(${(p-0.5)*r}px)`; } },

    /* --- decoration --- */
    glow: { dur: 1.6, apply: (el,p,c) => { el.style.opacity=1; const i=0.5+0.5*Math.sin(p*Math.PI*2); el.style.boxShadow=`0 0 ${30+i*60}px var(--accent, rgba(60,168,232,1))`; } },
    flicker: { dur: 1.0, apply: (el,p,c) => { const ph=(p*6)%1, on=ph>0.15&&ph<0.5?0:1; el.style.opacity=on?Math.min(1,p*2):0.15; } },
    highlight: { dur: 0.8, apply: (el,p,c) => {
      const e=(c.ease||E.outCubic)(p); el.style.opacity=1;
      el.style.backgroundImage=`linear-gradient(90deg, var(--highlight,#FFE066) ${f4(e*100)}%, transparent ${f4(e*100)}%)`;
      el.style.backgroundRepeat='no-repeat'; el.style.backgroundSize='100% 38%'; el.style.backgroundPosition='0 88%';
    }},
    rays: { dur: 1.4, apply: (el,p,c) => { el.style.opacity=Math.sin(p*Math.PI); const e=(c.ease||E.outCubic)(p); el.style.transform=`scale(${0.4+e*1.4}) rotate(${p*30}deg)`; } },
    particles: { dur: 8, apply: (el,p,c) => {
      el.style.opacity=1;
      el.querySelectorAll('.p').forEach((node,i)=>{
        const seed=(i*9301+49297)%233280/233280, drift=Math.sin(p*Math.PI*2+seed*6.28)*40, dy=-p*200-seed*100;
        _attr0(node,'transform'); node.setAttribute('transform',`translate(${f4(drift)},${f4(dy)})`); node.style.opacity=f4(Math.sin(p*Math.PI)*0.8);
      });
    }, neutral: el => _nEach(el, '.p', n => { _attrRestore(n,'transform'); n.style.opacity=''; }) },
    confetti: { dur: 1.5, apply: (el,p,c) => {
      el.style.opacity=1; const cs=el.querySelectorAll('.c'), e=E.outCubic(p);
      cs.forEach((node,i)=>{ const a=(i/cs.length)*Math.PI*2, d=e*320+(i%3)*40, x=Math.cos(a)*d, y=Math.sin(a)*d-e*80, r=e*540*((i%2)?1:-1); _attr0(node,'transform'); node.setAttribute('transform',`translate(${f4(x)},${f4(y)}) rotate(${f4(r)})`); node.style.opacity=f4(1-p*0.4); });
    }, neutral: el => _nEach(el, '.c', n => { _attrRestore(n,'transform'); n.style.opacity=''; }) },

    /* --- reveal / mask --- */
    reveal:   { dur: 1.2, apply: (el,p,c) => { const e=(c.ease||E.inOutCubic)(p); el.style.clipPath=`inset(0 ${(1-e)*100}% 0 0)`; el.style.opacity=1; } },
    revealUp: { dur: 1.2, apply: (el,p,c) => { const e=(c.ease||E.inOutCubic)(p); el.style.clipPath=`inset(${(1-e)*100}% 0 0 0)`; el.style.opacity=1; } },
    irisIn:   { dur: 1.4, apply: (el,p,c) => { const e=(c.ease||E.inOutCubic)(p); el.style.opacity=1; el.style.clipPath=`circle(${e*100}% at 50% 50%)`; } },

    /* --- SVG / vector --- */
    pathdraw: { dur: 2.0, apply: (el,p,c) => {
      if (!el.dataset.len){ try{el.dataset.len=el.getTotalLength();}catch(e){el.dataset.len=1000;} }
      const len=parseFloat(el.dataset.len); el.style.strokeDasharray=len; el.style.strokeDashoffset=len*(1-(c.ease||E.inOutCubic)(p)); el.style.opacity=1;
    }},
    motionPath: { dur: 2.0, apply: (el,p,c) => {
      const sel=el.dataset.path, path=sel?document.querySelector(sel):null; if(!path) return;
      if (!el.dataset.pathLen){ try{el.dataset.pathLen=path.getTotalLength();}catch(e){el.dataset.pathLen=0;} }
      const len=parseFloat(el.dataset.pathLen); if(!len) return;
      const pt=path.getPointAtLength(len*(c.ease||E.inOutCubic)(p));
      if (el.tagName==='circle'||el.tagName==='ellipse'){ _attr0(el,'cx'); _attr0(el,'cy'); el.setAttribute('cx',f4(pt.x)); el.setAttribute('cy',f4(pt.y)); }
      else { _attr0(el,'transform'); el.setAttribute('transform',`translate(${f4(pt.x)},${f4(pt.y)})`); }
      el.style.opacity=1;
    }, neutral: el => { _attrRestore(el,'cx'); _attrRestore(el,'cy'); _attrRestore(el,'transform'); } },

    /* --- DATA-VIZ (NEW) --- */
    barGrow: { dur: 1.2, apply: (el,p,c) => {
      const e=(c.ease||E.outCubic)(p); el.style.opacity=1;
      const horiz = el.dataset.dir === 'h';
      el.style.transformOrigin = horiz ? 'left center' : 'bottom center';
      el.style.transform = horiz ? `scaleX(${e})` : `scaleY(${e})`;
    }},
    donutSweep: { dur: 1.6, apply: (el,p,c) => {
      // expects an SVG <circle> with a circumference; data-pct 0..100
      if (!el.dataset.circ){ try{el.dataset.circ=el.getTotalLength();}catch(e){el.dataset.circ=2*Math.PI*(parseFloat(el.getAttribute('r'))||100);} }
      const circ=parseFloat(el.dataset.circ), pct=parseFloat(el.dataset.pct||'100')/100, e=(c.ease||E.outCubic)(p);
      el.style.strokeDasharray=circ; el.style.strokeDashoffset=circ*(1 - pct*e); el.style.opacity=1;
    }},
    ringFill: { dur: 1.6, apply: (el,p,c) => { PRESETS.donutSweep.apply(el,p,c); } },
    lineDraw: { dur: 2.0, apply: (el,p,c) => { PRESETS.pathdraw.apply(el,p,c); } },
    comparisonBar: { dur: 1.3, apply: (el,p,c) => {
      const e=(c.ease||E.outCubic)(p), w=parseFloat(el.dataset.width||'100');
      el.style.opacity=1; el.style.width=`${w*e}%`;
    }, reset: el => { el.style.width='0%'; } },
  };

  /* ===========================================================================
     CONTINUOUS LOOPS — run forever after entrance settles.
     data-loop="float|breathe|orbit|rotate|sway|pulse|shimmer|beat"
     data-loop-amp, data-loop-period control magnitude / speed.
     Loops WRAP the settled entrance (+ data-then / data-hold) transform — the
     compositor keeps a rotated / scaled entrance while the loop moves it.
  =========================================================================== */

  /* ===== RAW-MOTION PACK (v0.5): kinetic type, annotations, exits, ambient ===== */
  Object.assign(PRESETS, {
    lineReveal: { dur: 1.4, neutral: el => _nEach(el, '.lr-inner', n => { n.style.transform='none'; }), apply: (el,p,c) => {
      if(!el.dataset.lrInit){
        el.dataset.lrInit='1';
        const lines = el.innerHTML.split(/<br\s*\/?>/i);
        el.innerHTML = lines.map(seg => '<span class="lr-line" style="display:block;overflow:hidden;padding-bottom:0.04em"><span class="lr-inner" style="display:inline-block;transform:translateY(110%);will-change:transform">'+seg+'</span></span>').join('');
        el.dataset.lrN = el.querySelectorAll('.lr-inner').length;
      }
      el.style.opacity=1;
      const n=parseInt(el.dataset.lrN,10), stagger=0.16, span=(1-(n-1)*stagger);
      el.querySelectorAll('.lr-inner').forEach((inner,i)=>{
        const lp=Math.max(0,Math.min(1,(p-i*stagger)/span)), e=E.outQuint(lp);
        inner.style.transform='translateY('+((1-e)*110)+'%)';
      });
    }},
    wordSwap: { dur: 3.0, neutral: el => _nEach(el, '.ws-w', (w,i) => { w.style.opacity=i?0:1; w.style.transform=i?'scale(0.8)':'scale(1)'; }), apply: (el,p,c) => {
      if(!el.dataset.wsInit){
        el.dataset.wsInit='1'; el.style.position='relative'; el.style.minHeight='1.1em';
        const words=(el.dataset.words||el.textContent).split('|').map(w=>w.trim());
        el.dataset.wsN=words.length;
        el.innerHTML=words.map((w,i)=>'<span class="ws-w" data-i="'+i+'" style="position:absolute;left:0;right:0;top:0;opacity:0;will-change:transform,opacity">'+w+'</span>').join('');
      }
      el.style.opacity=1;
      const n=parseInt(el.dataset.wsN,10), seg=1/n, active=Math.min(n-1,Math.floor(p/seg)), local=(p-active*seg)/seg;
      el.querySelectorAll('.ws-w').forEach((w,i)=>{
        if(i!==active){ w.style.opacity=0; w.style.transform='scale(0.8)'; return; }
        let o,sc;
        if(local<0.3){ const e=E.outBack(local/0.3); o=e; sc=0.7+0.3*e; }
        else if(local>0.82 && i<n-1){ const e=(local-0.82)/0.18; o=1-e; sc=1+0.15*e; }
        else { o=1; sc=1; }
        w.style.opacity=o; w.style.transform='scale('+sc+')';
      });
    }},
    underlineDraw: { dur: 0.7, apply: (el,p,c) => { _annDraw(el,'underline'); el.style.opacity=1; _annStroke(el,'underline',(c.ease||E.outCubic)(p)); }, neutral: el => _annStroke(el,'underline',0) },
    circleScribble:{ dur: 0.9, apply: (el,p,c) => { _annDraw(el,'circle');    el.style.opacity=1; _annStroke(el,'circle',(c.ease||E.outCubic)(p)); },    neutral: el => _annStroke(el,'circle',0) },
    boxDraw:       { dur: 0.8, apply: (el,p,c) => { _annDraw(el,'box');       el.style.opacity=1; _annStroke(el,'box',(c.ease||E.outCubic)(p)); },       neutral: el => _annStroke(el,'box',0) },
    strikethrough: { dur: 0.5, apply: (el,p,c) => { _annDraw(el,'strike');    el.style.opacity=1; _annStroke(el,'strike',(c.ease||E.outCubic)(p)); },    neutral: el => _annStroke(el,'strike',0) },
    aurora: { dur: 9999, apply: (el,p,c) => {
      el.style.opacity=Math.min(1,p*(c.dur||9999)/0.3); const t=c.time||0;
      const a1=(50+Math.sin(t*0.13)*30)+'% '+(40+Math.cos(t*0.11)*25)+'%';
      const a2=(50+Math.cos(t*0.09)*35)+'% '+(60+Math.sin(t*0.14)*22)+'%';
      const a3=(30+Math.sin(t*0.07)*25)+'% '+(70+Math.cos(t*0.10)*20)+'%';
      const c1=el.dataset.c1||'var(--accent,#7C5CFF)', c2=el.dataset.c2||'var(--accent2,#19E3B1)', c3=el.dataset.c3||'var(--accent3,#FF5C8A)';
      el.style.backgroundImage='radial-gradient(40% 40% at '+a1+', '+c1+', transparent 70%),radial-gradient(45% 45% at '+a2+', '+c2+', transparent 70%),radial-gradient(35% 35% at '+a3+', '+c3+', transparent 70%)';
      el.style.filter='blur(60px) saturate(1.1)';
    }},
    constellation: { dur: 9999, apply: (el,p,c) => {
      if(el.tagName!=='CANVAS') return;
      if(!el.dataset.cInit){
        el.dataset.cInit='1'; el.width=el.offsetWidth||1920; el.height=el.offsetHeight||1080;
        const N=parseInt(el.dataset.count||'60',10), W=el.width, H=el.height;
        el._pts0=Array.from({length:N},(_,i)=>{ const s1=(i*9301+49297)%233280/233280, s2=(i*4099+7919)%233280/233280; return {x:s1*W,y:s2*H,vx:(s1-0.5)*14,vy:(s2-0.5)*14}; });
      }
      el.style.opacity=Math.min(1,p*(c.dur||9999)/0.3);
      const g=el.getContext('2d'), W=el.width, H=el.height, t=c.time||0;
      // Closed-form drift with edge bounces (triangle wave) — a pure function of time.
      const lt=Math.max(0, t-(c.start||0)), tri=(u,L)=>{ const m=((u%(2*L))+2*L)%(2*L); return m<=L?m:2*L-m; };
      const col=el.dataset.color||'124,92,255', pts=el._pts0.map(q=>({x:tri(q.x+q.vx*lt,W), y:tri(q.y+q.vy*lt,H)}));
      g.clearRect(0,0,W,H);
      g.strokeStyle='rgba('+col+',0.18)'; g.lineWidth=1.5;
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){ const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy); if(d<220){ g.globalAlpha=(1-d/220)*0.6; g.beginPath(); g.moveTo(pts[i].x,pts[i].y); g.lineTo(pts[j].x,pts[j].y); g.stroke(); } }
      g.globalAlpha=1; g.fillStyle='rgba('+col+',0.9)';
      for(const pt of pts){ g.beginPath(); g.arc(pt.x,pt.y,3,0,6.283); g.fill(); }
    }},
  });

  /* Hand-drawn annotation (underline / circle / box / strike). The <svg> is built once
     (host gets position:relative); its geometry follows the host's CURRENT layout box, so
     a web font that loads after init (or text that reflows) re-measures on the next frame. */
  function _annDraw(el, kind){
    const all=el._ann||(el._ann={});
    let a=all[kind];
    if(!a){
      el.dataset.annInit='1';
      if(getComputedStyle(el).position==='static') el.style.position='relative';
      const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg'), path=document.createElementNS(NS,'path');
      svg.setAttribute('class','sb-ann sb-ann-'+kind);
      svg.style.cssText='position:absolute;left:-6%;top:-12%;width:112%;height:128%;overflow:visible;pointer-events:none;z-index:5;visibility:hidden';
      const sw=parseFloat(el.dataset.annWeight||((kind==='underline'||kind==='strike')?'5':'4'));
      path.setAttribute('fill','none'); path.setAttribute('stroke',el.dataset.annColor||'var(--accent,#7C5CFF)');
      path.setAttribute('stroke-width',sw); path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
      svg.appendChild(path); el.appendChild(svg);
      a=all[kind]={ svg, path, len:600, wh:'' };
      if(!el._annPath) el._annPath=path;                       // legacy expando (first annotation)
    }
    const w=el.offsetWidth||200, h=el.offsetHeight||60, wh=w+'x'+h;
    if(a.wh===wh) return;
    a.wh=wh;
    let d;
    if(kind==='underline'){ const y=h*0.96; d='M '+(w*0.02)+' '+y+' C '+(w*0.3)+' '+(y+4)+', '+(w*0.6)+' '+(y-5)+', '+(w*0.98)+' '+(y-1); }
    else if(kind==='strike'){ const y=h*0.52; d='M '+(w*0.02)+' '+(y+2)+' C '+(w*0.35)+' '+(y-3)+', '+(w*0.65)+' '+(y+4)+', '+(w*0.98)+' '+(y-1); }
    else if(kind==='box'){ const r=10; d='M '+r+' 2 L '+(w-r)+' 4 Q '+w+' 2 '+w+' '+r+' L '+(w-2)+' '+(h-r)+' Q '+w+' '+h+' '+(w-r)+' '+(h-2)+' L '+r+' '+(h-3)+' Q 2 '+h+' 2 '+(h-r)+' L 4 '+r+' Q 2 2 '+r+' 2 Z'; }
    else { const cx=w/2, cy=h/2, rx=w*0.56, ry=h*0.62; d='M '+(cx-rx*0.3)+' '+(cy+ry)+' C '+(cx-rx)+' '+(cy+ry)+', '+(cx-rx)+' '+(cy-ry)+', '+cx+' '+(cy-ry*0.95)+' C '+(cx+rx)+' '+(cy-ry)+', '+(cx+rx)+' '+(cy+ry)+', '+(cx-rx*0.1)+' '+(cy+ry*0.96)+' C '+(cx-rx*0.8)+' '+(cy+ry*0.8)+', '+(cx-rx*0.85)+' '+(cy-ry*0.4)+', '+(cx-rx*0.2)+' '+(cy-ry*0.7); }
    a.svg.setAttribute('viewBox','0 0 '+w+' '+h); a.path.setAttribute('d',d);
    try{ a.len=a.path.getTotalLength()||600; }catch(e){ a.len=600; }
    if(a.path===el._annPath) el._annLen=a.len;
  }
  /* Stroke progress e in [0,1]; e<=0 hides the annotation entirely (no round-cap dot). */
  function _annStroke(el, kind, e){
    const a=el._ann && el._ann[kind]; if(!a) return;
    const len=f4(a.len), vis=e>0?'':'hidden';            // '' inherits: never overrides a hidden slide
    if(a.svg.style.visibility!==vis) a.svg.style.visibility=vis;
    a.path.style.strokeDasharray=len; a.path.style.strokeDashoffset=f4(a.len*(1-e));
  }

  const EXITS = {
    fadeOut:      (el,e)=>{ el.style.opacity=1-e; },
    slideOutLeft: (el,e)=>{ el.style.opacity=1-e; el.style.transform='translateX('+(-e*140)+'px)'; },
    slideOutRight:(el,e)=>{ el.style.opacity=1-e; el.style.transform='translateX('+(e*140)+'px)'; },
    slideOutUp:   (el,e)=>{ el.style.opacity=1-e; el.style.transform='translateY('+(-e*140)+'px)'; },
    slideOutDown: (el,e)=>{ el.style.opacity=1-e; el.style.transform='translateY('+(e*140)+'px)'; },
    scaleOut:     (el,e)=>{ el.style.opacity=1-e; el.style.transform='scale('+(1-e*0.25)+')'; },
    blurOut:      (el,e)=>{ el.style.opacity=1-e; el.style.filter='blur('+(e*22)+'px)'; },
    popOut:       (el,e)=>{ // quick anticipate (swell to 1.08) then shrink away
      const s = e<0.3 ? 1+0.08*EASE.outQuad(e/0.3) : 1.08*(1-EASE.inCubic((e-0.3)/0.7));
      el.style.opacity = e<0.3 ? 1 : 1-(e-0.3)/0.7; el.style.transform='scale('+Math.max(0,s)+')'; },
  };

  /* ========================================================================
     ADVANCED PACK (v0.6): charts, diagrams, UI demo, text/code FX
  ======================================================================== */
  function _sbStyle(id, css){ if(document.getElementById(id)) return; const st=document.createElement('style'); st.id=id; st.textContent=css; document.head.appendChild(st); }

  /* cursorTour frame (runs in the post pass, after all layers + cameras): cursor glide,
     click ripples, press feedback and typing — all derived from `time`, no timers. */
  const _TOUR_RIPPLES=new Set();
  const _CURSOR_CSS='#sb-cursor{position:fixed;width:26px;height:26px;z-index:2147483646;pointer-events:none;left:0;top:0;margin:-2px 0 0 -2px;transition:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}.sb-ripple{position:fixed;z-index:2147483645;border:3px solid var(--accent,#7C5CFF);border-radius:50%;pointer-events:none}';
  const _EASE_OUT_CSS=cubicBezier(0,0,0.58,1);
  function _tourFrame(stops, time, frame){
    const cur=document.getElementById('sb-cursor'); if(!cur) return;
    const center=sel=>{ const tg=document.querySelector(sel); if(!tg) return null; const r=tg.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,tg}; };
    if(time>=stops[0].t-0.6) frame.cursorOn=true;
    let i=0; while(i<stops.length-1 && time>=stops[i+1].t) i++;
    const a=center(stops[i].sel);
    if(a){
      let pos=a;
      if(i<stops.length-1){
        const b=center(stops[i+1].sel);
        if(b){ const span=Math.max(0.001,stops[i+1].t-stops[i].t); const e=E.inOutCubic(clamp01((time-stops[i].t)/span));
          pos={x:a.x+(b.x-a.x)*e, y:a.y+(b.y-a.y)*e}; }
      }
      cur.style.left=pos.x+'px'; cur.style.top=pos.y+'px';
    }
    stops.forEach(stp=>{
      const dt=time-stp.t;
      if(stp.rip && dt>=0 && dt<0.6){                      // ripple: 0 -> 80px, fading, ease-out over 0.6s
        const ct=center(stp.sel);
        if(ct){ const e=_EASE_OUT_CSS(dt/0.6), s=(80*e).toFixed(2)+'px';
          stp.rip.style.left=ct.x+'px'; stp.rip.style.top=ct.y+'px'; stp.rip.style.width=s; stp.rip.style.height=s; stp.rip.style.opacity=(0.8*(1-e)).toFixed(4);
          frame.ripplesOn.add(stp.rip); }
      }
      if(stp.rip){                                           // press feedback on the target (composes with its transform)
        const tg=document.querySelector(stp.sel);
        if(tg){ const on=dt>=0 && dt<0.24; const v=on?String(kf([[0,1],[0.5,0.96],[1,1]], _EASE_OUT_CSS(dt/0.24))):'';
          if(on || !frame.pressed.has(tg)){ frame.pressed.set(tg, v); } }
      }
      if(stp.act.startsWith('type=')){                       // typing: one char per 55ms after the stop
        const tg=document.querySelector(stp.sel); if(!tg) return;
        const txt=stp.act.slice(5), n=Math.floor(Math.max(0,dt)/0.055);
        const v=(dt<0||n<1)?(stp.orig!==undefined?stp.orig:''):txt.slice(0,Math.min(n,txt.length));
        if('value' in tg){ if(tg.value!==v) tg.value=v; } else _setText(tg, v);
      }
    });
  }

  Object.assign(PRESETS, {
    /* ---- CHARTS ---- */
    chartArea: { dur: 1.6, apply: (el,p,c) => {       // reveal an area/line path L->R
      const e=(c.ease||E.outCubic)(p); el.style.opacity=1; el.style.clipPath=`inset(0 ${(1-e)*100}% 0 0)`;
    }},
    pieSlice: { dur: 1.4, apply: (el,p,c) => {         // SVG <circle> arc; data-pct, data-offset (0..100)
      if(!el.dataset.circ){ try{el.dataset.circ=el.getTotalLength();}catch(e){el.dataset.circ=2*Math.PI*(parseFloat(el.getAttribute('r'))||100);} }
      const circ=parseFloat(el.dataset.circ), pct=parseFloat(el.dataset.pct||'25')/100, off=parseFloat(el.dataset.offset||'0')/100, e=(c.ease||E.outCubic)(p);
      el.style.strokeDasharray=(pct*circ*e)+' '+circ; el.style.strokeDashoffset=(-off*circ); el.style.opacity=1;
    }},
    gauge: { dur: 1.4, apply: (el,p,c) => {            // rotate a needle from data-from to data-to (deg)
      const from=parseFloat(el.dataset.from||'-90'), to=parseFloat(el.dataset.to||'0'), e=(c.ease||E.outBack)(p);
      el.style.opacity=1; el.style.transform=`rotate(${from+(to-from)*e}deg)`;
    }},
    barTo: { dur: 1.2, apply: (el,p,c) => {            // morph a bar height between data-from% and data-to%
      const from=parseFloat(el.dataset.from||'0'), to=parseFloat(el.dataset.to||'100'), e=(c.ease||E.inOutCubic)(p);
      el.style.opacity=1; el.style.height=(from+(to-from)*e)+'%';
    }, reset: el => { el.style.height=parseFloat(el.dataset.from||'0')+'%'; } },

    /* ---- DIAGRAM ---- */
    connectorDraw: { dur: 1.0, neutral: el => { (el._sbArrows||[]).forEach(ln=>{ ln.style.opacity='0'; }); }, apply: (el,p,c) => {    // draw an SVG path; data-arrow="end" pops an arrowhead
      if(!el.dataset.len){ try{el.dataset.len=el.getTotalLength();}catch(e){el.dataset.len=300;} }
      const len=parseFloat(el.dataset.len), e=(c.ease||E.inOutCubic)(p);
      el.style.strokeDasharray=len; el.style.strokeDashoffset=len*(1-e); el.style.opacity=1;
      if(el.dataset.arrow){
        if(!el._sbArrows){                               // build the arrowhead once (hidden), toggle it from p
          el._sbArrows=[];
          try{
            const L=el.getTotalLength(), a=el.getPointAtLength(L), b=el.getPointAtLength(Math.max(0,L-12));
            const ang=Math.atan2(a.y-b.y,a.x-b.x), svg=el.ownerSVGElement||el.parentNode, NS='http://www.w3.org/2000/svg';
            const mk=(x2,y2)=>{ const ln=document.createElementNS(NS,'line'); ln.setAttribute('x1',a.x);ln.setAttribute('y1',a.y);ln.setAttribute('x2',x2);ln.setAttribute('y2',y2);
              ln.setAttribute('stroke',el.getAttribute('stroke')||'currentColor'); ln.setAttribute('stroke-width',el.getAttribute('stroke-width')||'3'); ln.setAttribute('stroke-linecap','round'); ln.style.opacity='0'; svg.appendChild(ln); el._sbArrows.push(ln); };
            mk(a.x-14*Math.cos(ang-0.5), a.y-14*Math.sin(ang-0.5));
            mk(a.x-14*Math.cos(ang+0.5), a.y-14*Math.sin(ang+0.5));
          }catch(e){}
        }
        const on=p>0.82?'1':'0'; el._sbArrows.forEach(ln=>{ if(ln.style.opacity!==on) ln.style.opacity=on; });
      }
    }, reset: el => { (el._sbArrows||[]).forEach(ln=>{ ln.style.opacity='0'; }); } },

    /* ---- UI DEMO SIMULATION ---- */
    cursorTour: { dur: 9999, prestart: false, apply: (el,p,c) => {
      // data-stops="#sel@2.0, #sel2@4.0:click, #field@6.0:type=Hello"
      _sbStyle('sb-cursor-css', _CURSOR_CSS);
      let cur=document.getElementById('sb-cursor');
      if(!cur){ cur=document.createElement('div'); cur.id='sb-cursor';
        cur.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2 L4 20 L9 15 L13 22 L16 21 L12 14 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.3"/></svg>';
        document.body.appendChild(cur); }
      if(!el._stops){
        el._stops=(el.dataset.stops||'').split(',').map(seg=>{
          seg=seg.trim(); const at=seg.split('@'); const sel=at[0].trim(); const rest=(at[1]||'0');
          const m=rest.match(/^([\d.]+)(?::(click|type=.*))?$/); const t=m?parseFloat(m[1]):0; const act=m&&m[2]?m[2]:'';
          return {sel,t,act,rip:null,orig:undefined};
        }).filter(x=>x.sel);
        // Per-stop resources are built once; every frame then derives their state from the clock.
        el._stops.forEach(stp=>{
          if(stp.act==='click' || stp.act.startsWith('type')){
            const rip=document.createElement('div'); rip.className='sb-ripple'; rip.style.opacity='0'; rip.style.width='0px'; rip.style.height='0px'; rip.style.transform='translate(-50%,-50%)';
            document.body.appendChild(rip); stp.rip=rip; _TOUR_RIPPLES.add(rip);
          }
          if(stp.act.startsWith('type=')){ const tg=document.querySelector(stp.sel); if(tg) stp.orig=('value' in tg)?tg.value:tg.textContent; }
        });
      }
      const stops=el._stops; if(!stops.length) return;
      const time=c.time||0;
      // Positions read the rendered layout, so resolve them after every other layer of this frame.
      if(c.frame && c.frame.post) c.frame.post.push(()=>_tourFrame(stops, time, c.frame));
    }, reset: el => { (el._stops||[]).forEach(stp=>{   // before the tour starts: typed fields show their original text
      if(!stp.act.startsWith('type=') || stp.orig===undefined) return;
      const tg=document.querySelector(stp.sel); if(!tg) return;
      if('value' in tg){ if(tg.value!==stp.orig) tg.value=stp.orig; } else _setText(tg, stp.orig); }); } },
    clickRipple: { dur: 0.6, apply: (el,p,c) => {
      _sbStyle('sb-cursor-css', _CURSOR_CSS);   // (was an empty sheet: a later cursorTour then lost its cursor CSS)
      el.style.opacity=1; const e=E.outCubic(p);
      el.style.transform=`scale(${e*1.6})`; el.style.opacity=String(1-p);
      el.style.borderRadius='50%'; if(!el.style.border) el.style.border='3px solid var(--accent,#7C5CFF)';
    }},
    typeInto: { dur: 1.6, apply: (el,p,c) => {
      if(el._sbText0===undefined) el._sbText0=('value' in el)?el.value:el.textContent;
      const txt=el.dataset.text!==undefined?el.dataset.text:(el.dataset.fullText||el.textContent);
      if(!el.dataset.fullText) el.dataset.fullText=txt;
      const n=Math.floor(el.dataset.fullText.length*(c.ease||E.linear)(p)); const v=el.dataset.fullText.slice(0,n);
      if('value' in el){ if(el.value!==v) el.value=v; } else _setText(el, v); el.style.opacity=1;
    }, reset: _nTyped, neutral: _nTyped },

    /* ---- TEXT / CODE FX ---- */
    assemble: { dur: 1.4, neutral: el => _nEach(el, '.asm-c', s => { s.style.opacity=1; s.style.transform=''; }), apply: (el,p,c) => {         // letters fly in from scatter to form the word
      if(!el.dataset.asmInit){ el.dataset.asmInit='1';
        const chars=[...el.textContent];
        el.innerHTML=chars.map((ch,i)=>{ if(ch===' ') return ' ';
          const s=(i*9301+49297)%233280/233280, s2=(i*4099+7919)%233280/233280;
          const dx=(s-0.5)*600, dy=(s2-0.5)*400, rot=(s-0.5)*120;
          return '<span class="asm-c" data-dx="'+dx.toFixed(0)+'" data-dy="'+dy.toFixed(0)+'" data-rot="'+rot.toFixed(0)+'" style="display:inline-block;opacity:0">'+ch+'</span>';
        }).join('');
        el.dataset.asmN=el.querySelectorAll('.asm-c').length;
      }
      el.style.opacity=1; const n=parseInt(el.dataset.asmN,10);
      el.querySelectorAll('.asm-c').forEach((sp,i)=>{
        const lp=Math.max(0,Math.min(1,(p*1.3 - (i/n)*0.3))); const e=E.outCubic(lp);
        // settled letters drop the transform entirely: Chromium keeps the rotated-text raster mode
        // for an in-place rotate(..)->rotate(0deg) change, so 'none' keeps settled frames order-independent.
        sp.style.opacity=e; sp.style.transform= e>=1 ? '' : 'translate('+f4((1-e)*parseFloat(sp.dataset.dx))+'px,'+f4((1-e)*parseFloat(sp.dataset.dy))+'px) rotate('+f4((1-e)*parseFloat(sp.dataset.rot))+'deg)';
      });
    }},
    rgbGlitch: { dur: 1.0, apply: (el,p,c) => {        // RGB-split jitter settling to clean
      el.style.opacity=Math.min(1,p*2.5);
      const settle=Math.max(0,1-p), jit=Math.sin(p*60)*8*settle, dx=(6+jit)*settle;
      el.style.textShadow=dx.toFixed(1)+'px 0 rgba(255,0,80,.8), '+(-dx).toFixed(1)+'px 0 rgba(0,220,255,.8)';
      el.style.transform='translateX('+(jit*0.4).toFixed(1)+'px)';
      if(p>=1) el.style.textShadow='none';
    }},
    neonOn: { dur: 1.3, apply: (el,p,c) => {           // flicker on, then steady glow
      const col=el.dataset.neon||'var(--accent,#7C5CFF)';
      if(p<0.55){ const ph=(p*9)%1; el.style.opacity=(ph>0.2&&ph<0.5)?0.2:1; el.style.textShadow='none'; }
      else { el.style.opacity=1; const g=0.6+0.4*Math.sin(p*Math.PI*3);
        el.style.textShadow='0 0 6px '+col+', 0 0 18px '+col+', 0 0 '+(28*g).toFixed(0)+'px '+col; }
    }},
    textMask: { dur: 1.8, apply: (el,p,c) => {         // gradient/image shows through text + sheen sweep
      // The clip-to-text props are (re)written every call, not once: as a data-then step / word
      // hit they are then undone outside the window instead of leaving transparent text behind.
      el.style.backgroundSize='cover'; el.style.webkitBackgroundClip='text'; el.style.backgroundClip='text'; el.style.webkitTextFillColor='transparent'; el.style.color='transparent';
      el.style.backgroundPosition='center';
      el.style.opacity=Math.min(1,p*3);
      // sheen: a bright band sweeps across via an extra layered gradient
      const x=f4(p*140-20);
      const base = el.dataset.img ? 'url('+el.dataset.img+')' : 'linear-gradient(110deg,var(--accent,#7C5CFF),var(--accent2,#19E3B1),var(--accent3,#FF5C8A))';
      el.style.backgroundImage='linear-gradient(100deg, transparent '+f4(x-12)+'%, rgba(255,255,255,.85) '+x+'%, transparent '+f4(x+12)+'%), '+base;
    }},
    codeType: { dur: 3.0, neutral: el => _nEach(el, '.ct-c', s => { s.style.opacity=1; }), apply: (el,p,c) => {         // syntax-highlighted code typing
      if(!el.dataset.ctInit){ el.dataset.ctInit='1';
        _sbStyle('sb-code-css','.tok-kw{color:#C792EA}.tok-str{color:#C3E88D}.tok-num{color:#F78C6C}.tok-com{color:#637777;font-style:italic}.tok-fn{color:#82AAFF}.tok-pun{color:#89DDFF}');
        const code=el.textContent;
        const kw=/\b(function|const|let|var|return|if|else|for|while|import|from|export|class|new|await|async|def|print|in|of|true|false|null|None|True|False)\b/;
        // tokenize line by line preserving newlines
        const out=[];
        const re=/(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|([A-Za-z_$][\w$]*)(\s*\()|([A-Za-z_$][\w$]*)|([{}()\[\];:,.=<>+\-*/!&|?]+)|(\s+)/g;
        let m;
        while((m=re.exec(code))){
          if(m[1]) out.push(['tok-com', m[0]]);
          else if(m[2]) out.push(['tok-str', m[0]]);
          else if(m[3]) out.push(['tok-num', m[0]]);
          else if(m[4]!==undefined){ out.push([kw.test(m[4])?'tok-kw':'tok-fn', m[4]]); out.push(['tok-pun', m[5]]); }
          else if(m[6]) out.push([kw.test(m[6])?'tok-kw':'', m[6]]);
          else if(m[7]) out.push(['tok-pun', m[0]]);
          else out.push(['', m[0]]);
        }
        // build char spans with classes
        let html=''; let idx=0; const charcls=[];
        out.forEach(([cls,txt])=>{ for(const ch of txt){ charcls.push(cls); } });
        const allchars=[...code];
        el.innerHTML=allchars.map((ch,i)=>{ const cl=charcls[i]||''; const safe=ch==='\n'?'\n':ch.replace(/</g,'&lt;').replace(/>/g,'&gt;');
          return '<span class="ct-c '+cl+'" style="opacity:0">'+safe+'</span>'; }).join('');
        el.dataset.ctN=allchars.length; el.style.whiteSpace='pre-wrap';
      }
      el.style.opacity=1; const n=parseInt(el.dataset.ctN,10), shown=Math.floor(n*(c.ease||E.linear)(p));
      const sp=el.querySelectorAll('.ct-c'); for(let i=0;i<sp.length;i++) sp[i].style.opacity = i<shown?1:0;
    }},
  });

  /* ===== SENIOR COMPOSITION PACK (v0.7) ===== */
  Object.assign(PRESETS, {
    rackFocus: { dur: 1.2, apply: (el,p,c) => {   // focus pull: snaps into sharp + brightens
      const e=(c.ease||E.outCubic)(p);
      el.style.opacity=Math.min(1,p*3);
      el.style.filter='blur('+((1-e)*18)+'px) brightness('+(0.55+0.45*e)+')';
      el.style.transform='scale('+(0.985+0.015*e)+')';
    }},
    defocus: { dur: 1.2, apply: (el,p,c) => {      // push OUT of focus (recede a layer)
      const e=(c.ease||E.outCubic)(p);
      el.style.opacity=1; el.style.filter='blur('+(e*16)+'px) brightness('+(1-0.35*e)+')';
    }},
    vignette: { dur: 1.6, apply: (el,p,c) => {     // edges darken in
      const e=(c.ease||E.outCubic)(p);
      el.style.opacity=1; el.style.position='absolute'; el.style.inset='0'; el.style.pointerEvents='none'; el.style.zIndex='38';
      el.style.boxShadow='inset 0 0 '+(120+e*140)+'px '+(30+e*70)+'px rgba(0,0,0,'+(0.28+e*0.34)+')';
    }},
    cinematicGrade: { dur: 9999, apply: (el,p,c) => {  // full-frame film grade (vignette + corner falloff + tint)
      el.style.opacity=1;
      if(el.dataset.cgInit) return; el.dataset.cgInit='1';
      el.style.position='absolute'; el.style.inset='0'; el.style.pointerEvents='none'; el.style.zIndex='39';
      el.style.boxShadow='inset 0 0 220px 70px rgba(0,0,0,0.5)';
      el.style.background='radial-gradient(125% 125% at 50% 32%, transparent 52%, rgba(0,0,0,0.42) 100%)';
      el.style.mixBlendMode='multiply';
    }},
    filmGrain: { dur: 9999, apply: (el,p,c) => {   // animated grain via fractal-noise SVG data-uri
      el.style.opacity = (el.dataset.grainOpacity||'0.06');
      if(!el.dataset.fgInit){ el.dataset.fgInit='1';
        el.style.position='absolute'; el.style.inset='0'; el.style.pointerEvents='none'; el.style.zIndex='41'; el.style.mixBlendMode='overlay';
        const svg="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
        el.style.backgroundImage="url(\""+svg+"\")"; el.style.backgroundSize='320px 320px';
      }
      // 6-step grain jitter, one step per 90ms of CLOCK time (was a wall-clock setInterval).
      const f=Math.floor(Math.max(0,c.time||0)/0.09)%6, pos=(f*53%320)+'px '+(f*97%320)+'px';
      if(el.style.backgroundPosition!==pos) el.style.backgroundPosition=pos;
    }},
  });

  /* ========================================================================
     FUN PACK (v0.7): owned, brand-colored, render-safe dazzle effects.
     Most are self-contained — drop <div class="anim" data-anim="confettiBurst">.
     Colors pull from --accent / --accent2 / --accent3 / --gold.
  ======================================================================== */
  const FUN = ['var(--accent,#7C5CFF)','var(--accent2,#19E3B1)','var(--accent3,#FF5C8A)','var(--gold,#FFD166)'];
  function _seed(i){ return ((i*9301+49297)%233280)/233280; }

  Object.assign(PRESETS, {
    confettiBurst: { dur: 1.8, neutral: (el,c) => { PRESETS.confettiBurst.apply(el,0,c||{}); _nEach(el,'.fb-p',s=>{ s.style.opacity='0'; }); }, apply: (el,p,c) => {
      if(!el.dataset.fb){ el.dataset.fb='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        let h=''; for(let i=0;i<54;i++){ const col=FUN[i%4], rad=(i%3)?'2px':'50%';
          h+='<span class="fb-p" style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;background:'+col+';border-radius:'+rad+'"></span>'; }
        el.innerHTML=h; }
      el.style.opacity=1; const e=E.outCubic(p), ps=el.querySelectorAll('.fb-p');
      ps.forEach((sp,i)=>{ const a=(i/ps.length)*Math.PI*2+_seed(i)*6, d=e*(260+(_seed(i)*180)), x=Math.cos(a)*d, y=Math.sin(a)*d - e*70 + e*e*200, r=e*720*((i%2)?1:-1);
        sp.style.transform='translate('+x+'px,'+y+'px) rotate('+r+'deg)'; sp.style.opacity=String(1-Math.max(0,(p-0.55)/0.45)); });
    }},
    fireworks: { dur: 2.6, neutral: (el,c) => PRESETS.fireworks.apply(el,0,c||{}), apply: (el,p,c) => {
      if(!el.dataset.fw){ el.dataset.fw='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        let h=''; for(let b=0;b<4;b++){ const cx=15+_seed(b)*70, cy=20+_seed(b+9)*40, col=FUN[b%4];
          for(let i=0;i<20;i++) h+='<span class="fw-p" data-b="'+b+'" style="position:absolute;left:'+cx+'%;top:'+cy+'%;width:8px;height:8px;margin:-4px;border-radius:50%;background:'+col+'"></span>'; }
        el.innerHTML=h; }
      el.style.opacity=1; const ps=el.querySelectorAll('.fw-p');
      ps.forEach((sp,i)=>{ const b=parseInt(sp.dataset.b,10), bs=b*0.18, lp=Math.max(0,Math.min(1,(p-bs)/0.5)), e=E.outCubic(lp);
        const a=(i%20)/20*Math.PI*2, d=e*120; sp.style.transform='translate('+Math.cos(a)*d+'px,'+(Math.sin(a)*d+e*e*60)+'px)'; sp.style.opacity=String((lp>0?1:0)*(1-lp)); });
    }},
    sparkle: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.sk){ el.dataset.sk='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        let h=''; for(let i=0;i<14;i++){ const x=_seed(i)*100, y=_seed(i+5)*100, sz=8+_seed(i+2)*16;
          h+='<svg class="sk-s" data-i="'+i+'" style="position:absolute;left:'+x+'%;top:'+y+'%;width:'+sz+'px;height:'+sz+'px;overflow:visible" viewBox="0 0 10 10"><path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="'+FUN[i%4]+'"/></svg>'; }
        el.innerHTML=h; }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.sk-s').forEach((sv,i)=>{ const ph=t*2+_seed(i)*6.28, o=0.2+0.8*Math.max(0,Math.sin(ph)); sv.style.opacity=String(o); sv.style.transform='scale('+(0.4+o*0.8)+') rotate('+(t*40+i*30)+'deg)'; });
    }},
    checkDraw: { dur: 0.9, neutral: (el,c) => PRESETS.checkDraw.apply(el,0,c||{}), apply: (el,p,c) => {
      if(!el.dataset.ck){ el.dataset.ck='1';
        el.innerHTML='<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent2,#19E3B1)" stroke-width="7" class="ck-c"/><path d="M28 52 L44 68 L74 34" fill="none" stroke="var(--accent2,#19E3B1)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" class="ck-p"/></svg>';
        const cc=el.querySelector('.ck-c'), cp=el.querySelector('.ck-p'); try{el.dataset.ccl=cc.getTotalLength(); el.dataset.cpl=cp.getTotalLength();}catch(e){el.dataset.ccl=276;el.dataset.cpl=90;} }
      el.style.opacity=1; const cc=el.querySelector('.ck-c'), cp=el.querySelector('.ck-p');
      const ccl=parseFloat(el.dataset.ccl), cpl=parseFloat(el.dataset.cpl);
      const e1=E.outCubic(Math.min(1,p/0.6)), e2=E.outBack(Math.max(0,(p-0.5)/0.5));
      cc.style.strokeDasharray=ccl; cc.style.strokeDashoffset=ccl*(1-e1);
      cp.style.strokeDasharray=cpl; cp.style.strokeDashoffset=cpl*(1-e2);
    }},
    crossDraw: { dur: 0.7, neutral: el => { const sv=el.querySelector('svg'); if(sv) sv.style.visibility='hidden'; }, apply: (el,p,c) => {
      if(!el.dataset.cx){ el.dataset.cx='1';
        el.innerHTML='<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent3,#FF5C8A)" stroke-width="7"/><path d="M34 34 L66 66 M66 34 L34 66" fill="none" stroke="var(--accent3,#FF5C8A)" stroke-width="9" stroke-linecap="round" class="cx-p"/></svg>'; }
      el.style.opacity=1; const cxs=el.querySelector('svg'); if(cxs && cxs.style.visibility) cxs.style.visibility=''; const cp=el.querySelector('.cx-p'); if(!el.dataset.cxl){try{el.dataset.cxl=cp.getTotalLength();}catch(e){el.dataset.cxl=180;}}
      const l=parseFloat(el.dataset.cxl); cp.style.strokeDasharray=l; cp.style.strokeDashoffset=l*(1-E.outCubic(p));
    }},
    spinner: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.sp){ el.dataset.sp='1';
        el.innerHTML='<svg viewBox="0 0 50 50" style="width:100%;height:100%"><circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent,#7C5CFF)" stroke-width="5" stroke-linecap="round" stroke-dasharray="90 36" class="sp-a"/></svg>'; }
      el.style.opacity=1; el.querySelector('.sp-a').style.transform='rotate('+((c.time||0)*320)+'deg)'; el.querySelector('.sp-a').style.transformOrigin='center';
    }},
    dotsLoader: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.dl){ el.dataset.dl='1'; el.style.display='inline-flex'; el.style.gap='14px';
        el.innerHTML='<span class="dl-d"></span><span class="dl-d"></span><span class="dl-d"></span>';
        el.querySelectorAll('.dl-d').forEach((d,i)=>{ d.style.cssText='width:22px;height:22px;border-radius:50%;background:'+FUN[i%3]+';display:inline-block'; }); }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.dl-d').forEach((d,i)=>{ d.style.transform='translateY('+(Math.sin(t*5-i*0.6)*-16)+'px)'; });
    }},
    heartBeat: { dur: 1.2, apply: (el,p,c) => {
      if(!el.dataset.hb){ el.dataset.hb='1'; el.style.display='inline-block';
        if(el.dataset.emoji) el.textContent=el.dataset.emoji;
        else el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%;overflow:visible"><path d="M12 20.3C5 15.5 2.5 11.8 2.5 8.4 2.5 5.7 4.6 3.7 7.2 3.7 9 3.7 10.7 4.8 12 6.6 13.3 4.8 15 3.7 16.8 3.7 19.4 3.7 21.5 5.7 21.5 8.4 21.5 11.8 19 15.5 12 20.3Z" fill="var(--accent3,#FF5C8A)"/></svg>'; }
      el.style.opacity=Math.min(1,p*3);
      const t=p*2*Math.PI*1.5, thump=1+0.18*Math.abs(Math.sin(t))*Math.max(0,1-p*0.5);
      el.style.transform='scale('+(p<0.3?E.outBack(p/0.3):thump)+')';
    }},
    starPop: { dur: 0.9, apply: (el,p,c) => {
      if(!el.dataset.stp){ el.dataset.stp='1'; el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M12 1 L15 9 L23 9 L17 14 L19 22 L12 17 L5 22 L7 14 L1 9 L9 9 Z" fill="var(--gold,#FFD166)"/></svg>'; }
      el.style.opacity=Math.min(1,p*3); const e=E.outElastic(p); el.style.transform='scale('+(0.2+0.8*e)+') rotate('+((1-e)*180)+'deg)';
    }},
    rocketLaunch: { dur: 1.6, apply: (el,p,c) => {
      if(!el.dataset.rl){ el.dataset.rl='1'; el.style.display='inline-block';
        if(el.dataset.emoji) el.textContent=el.dataset.emoji;
        else el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%;overflow:visible"><path d="M12 1.5C15.8 4.6 17 9.4 16 14.5H8C7 9.4 8.2 4.6 12 1.5Z" fill="#EAF0FF"/><circle cx="12" cy="8.5" r="2.1" fill="var(--accent,#7C5CFF)"/><path d="M8 13L4.8 18 8 16.7ZM16 13L19.2 18 16 16.7Z" fill="var(--accent3,#FF5C8A)"/><path d="M9.6 15.5C10.4 20 12 22 12 22 12 22 13.6 20 14.4 15.5 13.2 16.4 10.8 16.4 9.6 15.5Z" fill="var(--gold,#FFD166)"/></svg>'; }
      el.style.opacity=1; const e=p*p;
      el.style.transform='translateY('+(-e*680)+'px) translateX('+(Math.sin(p*14)*5)+'px) scale('+(1-p*0.25)+')';
    }},
    coinFlip: { dur: 1.2, apply: (el,p,c) => {
      if(!el.dataset.cf){ el.dataset.cf='1'; el.style.display='inline-flex'; el.style.alignItems='center'; el.style.justifyContent='center';
        el.style.width=el.style.width||'120px'; el.style.height=el.style.height||'120px'; el.style.borderRadius='50%';
        el.style.background='radial-gradient(circle at 38% 30%, #FFE39A, var(--gold,#FFD166) 60%, #C9962B)'; el.style.color='#7a5a10'; el.style.fontWeight='800'; el.style.fontSize='52px';
        if(!el.textContent.trim()) el.textContent=el.dataset.face||'$'; }
      el.style.opacity=Math.min(1,p*3); el.style.transform='perspective(600px) rotateY('+((1-E.outCubic(p))*1080)+'deg)';
    }},
    trophyShine: { dur: 1.4, apply: (el,p,c) => {
      if(!el.dataset.tr){ el.dataset.tr='1'; el.style.display='inline-block';
        if(el.dataset.emoji) el.textContent=el.dataset.emoji;
        else el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M6 3H18V8A6 6 0 0 1 6 8Z" fill="var(--gold,#FFD166)"/><path d="M6 4.5H3.5V6A3 3 0 0 0 6.4 9M18 4.5H20.5V6A3 3 0 0 1 17.6 9" fill="none" stroke="var(--gold,#FFD166)" stroke-width="1.4"/><path d="M10.5 13H13.5V16H16V19H8V16H10.5Z" fill="var(--gold,#FFD166)"/></svg>'; }
      el.style.opacity=Math.min(1,p*3); el.style.transform='scale('+(0.6+0.4*E.outBack(Math.min(1,p*1.5)))+')';
    }},
    badgeUnlock: { dur: 1.5, neutral: el => { const r=el.querySelector('.bu-ring'); if(r){ r.style.opacity='0'; r.style.transform='scale(1)'; } }, apply: (el,p,c) => {
      if(!el.dataset.bu){ el.dataset.bu='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        const ring=document.createElement('span'); ring.className='bu-ring'; ring.style.cssText='position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px;border-radius:50%;border:4px solid var(--accent,#7C5CFF);pointer-events:none'; el.appendChild(ring); }
      el.style.opacity=Math.min(1,p*3); el.style.transform='scale('+(0.3+0.7*E.outElastic(Math.min(1,p*1.3)))+')';
      const ring=el.querySelector('.bu-ring'), e=E.outCubic(p); if(ring){ ring.style.transform='scale('+(1+e*14)+')'; ring.style.opacity=String(1-e); }
    }},
    pulseRings: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.pr){ el.dataset.pr='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        el.innerHTML='<span class="pr-r"></span><span class="pr-r"></span><span class="pr-r"></span>';
        el.querySelectorAll('.pr-r').forEach(r=>r.style.cssText='position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px;border-radius:50%;border:3px solid var(--accent,#7C5CFF)'); }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.pr-r').forEach((r,i)=>{ const ph=((t*0.6+i/3)%1); r.style.transform='scale('+(0.4+ph*3)+')'; r.style.opacity=String((1-ph)*0.7); });
    }},
    waveform: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.wf){ el.dataset.wf='1'; el.style.display='inline-flex'; el.style.alignItems='center'; el.style.gap='8px'; el.style.height=el.style.height||'120px';
        const N=parseInt(el.dataset.bars||'18',10); let h=''; for(let i=0;i<N;i++) h+='<span class="wf-b" style="width:12px;border-radius:6px;background:'+FUN[i%4]+';height:20%"></span>'; el.innerHTML=h; el.dataset.wfN=N; }
      el.style.opacity=1; const t=c.time||0, bars=el.querySelectorAll('.wf-b'); let amp=0;
      const lv=_envLevelAt(t), live=(lv==null && !OFFLINE && analyser && freqData);   // envelope (deterministic) > live analyser > sine
      if(live){ analyser.getByteFrequencyData(freqData); }
      bars.forEach((b,i)=>{ let v;
        if(lv!=null){ v=Math.min(1, lv*(0.55+0.45*Math.abs(Math.sin(i*0.9+t*4)))); }
        else if(live){ v=(freqData[Math.min(freqData.length-1,i*2)]||0)/255; }
        else { v=0.5+0.5*Math.sin(t*6 + i*0.5); }
        b.style.height=(15+v*85)+'%'; });
    }},
    partyPopper: { dur: 1.6, neutral: (el,c) => { PRESETS.partyPopper.apply(el,0,c||{}); if(el._ppEm) el._ppEm.style.opacity='0'; _nEach(el,'.pp-s',s=>{ s.style.opacity='0'; }); }, apply: (el,p,c) => {
      if(!el.dataset.pp){ el.dataset.pp='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        const em=document.createElement('span'); em.style.cssText='display:inline-block;width:64px;height:64px';
        if(el.dataset.emoji) em.textContent=el.dataset.emoji;
        else em.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%;overflow:visible"><path d="M3 21L9 8 16 15Z" fill="var(--accent,#7C5CFF)"/><path d="M3 21L9 8 11.5 10.5Z" fill="var(--accent2,#19E3B1)"/></svg>';
        el.appendChild(em);
        let h=''; for(let i=0;i<30;i++) h+='<span class="pp-s" style="position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:'+((i%2)?'50%':'2px')+';background:'+FUN[i%4]+'"></span>';
        const wrap=document.createElement('span'); wrap.innerHTML=h; el.appendChild(wrap); el._ppEm=em; }
      el.style.opacity=1; if(el._ppEm){ el._ppEm.style.opacity='1'; el._ppEm.style.transform='scale('+(0.5+0.5*E.outBack(Math.min(1,p*2)))+') rotate('+(-20+p*10)+'deg)'; }
      const e=E.outCubic(p); el.querySelectorAll('.pp-s').forEach((sp,i)=>{ const a=(-Math.PI*0.75)+(i/30)*(Math.PI*0.9), d=e*(300+_seed(i)*160), x=Math.cos(a)*d, y=Math.sin(a)*d+e*e*180; sp.style.transform='translate('+x+'px,'+y+'px) rotate('+(e*540)+'deg)'; sp.style.opacity=String(1-Math.max(0,(p-0.6)/0.4)); });
    }},
    ratingStars: { dur: 1.3, neutral: (el,c) => PRESETS.ratingStars.apply(el,0,c||{}), apply: (el,p,c) => {
      if(!el.dataset.rs){ el.dataset.rs='1'; el.style.display='inline-flex'; el.style.gap='10px';
        const n=parseInt(el.dataset.count||'5',10); let h=''; for(let i=0;i<n;i++) h+='<svg class="rs-s" viewBox="0 0 24 24" style="width:60px;height:60px"><path d="M12 1 L15 9 L23 9 L17 14 L19 22 L12 17 L5 22 L7 14 L1 9 L9 9 Z" fill="var(--gold,#FFD166)"/></svg>'; el.innerHTML=h; el.dataset.rsN=n; }
      el.style.opacity=1; const n=parseInt(el.dataset.rsN,10); el.querySelectorAll('.rs-s').forEach((sv,i)=>{ const lp=Math.max(0,Math.min(1,(p*1.2 - i/n))); const e=E.outBack(lp); sv.style.transform='scale('+e+') rotate('+((1-e)*90)+'deg)'; sv.style.opacity=String(lp>0?1:0); });
    }},
    emojiPop: { dur: 0.9, apply: (el,p,c) => {
      if(!el.dataset.ep){ el.dataset.ep='1'; if(!el.textContent.trim()) el.textContent=el.dataset.emoji||'✨'; el.style.display='inline-block'; }
      el.style.opacity=Math.min(1,p*4); const e=E.outElastic(p); el.style.transform='scale('+(0.2+0.8*e)+') translateY('+((1-E.outCubic(p))*30)+'px)';
    }},
    thumbsUp: { dur: 0.9, apply: (el,p,c) => {
      if(!el.dataset.tu){ el.dataset.tu='1'; el.style.display='inline-block';
        if(el.dataset.emoji) el.textContent=el.dataset.emoji;
        else el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M3 10H6.5V21H4A1 1 0 0 1 3 20Z" fill="var(--accent,#7C5CFF)"/><path d="M7 9.5L11.5 2.4C12.7 2.4 13.6 3.5 13.3 4.7L12.4 9H18.6C19.9 9 20.9 10.2 20.6 11.5L19.2 18.6C19 19.6 18.1 20.3 17.1 20.3H7Z" fill="var(--accent2,#19E3B1)"/></svg>'; }
      el.style.opacity=Math.min(1,p*4); const e=E.outBack(Math.min(1,p*1.4)); const wob=Math.sin(p*Math.PI*4)*(1-p)*12;
      el.style.transform='scale('+e+') rotate('+wob+'deg)';
    }},
    lightbulb: { dur: 1.2, apply: (el,p,c) => {
      if(!el.dataset.lb){ el.dataset.lb='1'; el.style.display='inline-block';
        if(el.dataset.emoji) el.textContent=el.dataset.emoji;
        else el.innerHTML='<svg viewBox="0 0 24 24" style="width:100%;height:100%;overflow:visible"><path d="M9 18.5H15V20A1.5 1.5 0 0 1 13.5 21.5H10.5A1.5 1.5 0 0 1 9 20Z" fill="#9aa3c0"/><path d="M12 2.5A7 7 0 0 1 16.5 14.8C15.6 15.7 15.2 16.6 15.1 17.5H8.9C8.8 16.6 8.4 15.7 7.5 14.8A7 7 0 0 1 12 2.5Z" fill="var(--gold,#FFD166)"/></svg>'; }
      if(p<0.5){ const ph=(p*10)%1; el.style.opacity=(ph>0.3&&ph<0.6)?0.25:1; el.style.filter='none'; }
      else { el.style.opacity=1; const g=0.5+0.5*Math.sin(p*Math.PI*4); el.style.filter='drop-shadow(0 0 '+(10+g*26)+'px var(--gold,#FFD166))'; }
      el.style.transform='scale('+(0.7+0.3*E.outBack(Math.min(1,p*2)))+')';
    }},
    confettiRain: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.cr){ el.dataset.cr='1'; el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
        let h=''; for(let i=0;i<60;i++){ const x=_seed(i)*100, sz=8+_seed(i+3)*8; h+='<span class="cr-p" data-i="'+i+'" style="position:absolute;left:'+x+'%;top:-5%;width:'+sz+'px;height:'+(sz*1.4)+'px;background:'+FUN[i%4]+';border-radius:2px"></span>'; } el.innerHTML=h; }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.cr-p').forEach((sp,i)=>{ const sp1=0.3+_seed(i)*0.5, y=((t*sp1+_seed(i))%1.15)*110, sway=Math.sin(t*2+i)*20; sp.style.transform='translate('+sway+'px,'+y+'vh) rotate('+(t*180+i*40)+'deg)'; });
    }},
    shimmerSweep: { dur: 1.4, neutral: el => { const b=el.querySelector('.ss-band'); if(b) b.style.display='none'; }, apply: (el,p,c) => {
      if(getComputedStyle(el).position==='static') el.style.position='relative'; el.style.overflow='hidden'; el.style.opacity=1;
      let sh=el.querySelector('.ss-band'); if(!sh){ sh=document.createElement('span'); sh.className='ss-band'; sh.style.cssText='position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);pointer-events:none'; el.appendChild(sh); }
      if(sh.style.display) sh.style.display=''; sh.style.left=f4(-40+p*180)+'%';
    }},
    burstLines: { dur: 0.7, neutral: (el,c) => { PRESETS.burstLines.apply(el,0,c||{}); _nEach(el,'.bl-l',l=>{ l.style.opacity='0'; }); }, apply: (el,p,c) => {
      if(!el.dataset.bl){ el.dataset.bl='1'; if(getComputedStyle(el).position==='static') el.style.position='relative';
        let h='<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;width:300px;height:300px;margin:-150px;overflow:visible">'; for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; h+='<line class="bl-l" x1="'+(100+Math.cos(a)*30)+'" y1="'+(100+Math.sin(a)*30)+'" x2="'+(100+Math.cos(a)*90)+'" y2="'+(100+Math.sin(a)*90)+'" stroke="'+FUN[i%4]+'" stroke-width="6" stroke-linecap="round"/>'; } h+='</svg>'; el.innerHTML=h; }
      el.style.opacity=1; const e=E.outCubic(p); el.querySelectorAll('.bl-l').forEach(l=>{ l.style.transformOrigin='100px 100px'; l.style.transform='scale('+(0.3+e*1.1)+')'; l.style.opacity=String(1-p); });
    }},
    floatEmojis: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.fe){ el.dataset.fe='1'; el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
        const set=(el.dataset.emojis||'❤️,👍,🎉,⭐,🔥').split(','); let h='';
        for(let i=0;i<18;i++){ const x=_seed(i)*100, em=set[i%set.length], sz=30+_seed(i+2)*40; h+='<span class="fe-e" data-i="'+i+'" style="position:absolute;left:'+x+'%;bottom:-10%;font-size:'+sz+'px">'+em+'</span>'; } el.innerHTML=h; }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.fe-e').forEach((sp,i)=>{ const sp1=0.25+_seed(i)*0.4, y=((t*sp1+_seed(i))%1.2)*120, sway=Math.sin(t*1.5+i)*30; sp.style.transform='translate('+sway+'px,-'+y+'vh)'; sp.style.opacity=String(Math.max(0,1-((t*sp1+_seed(i))%1.2))); });
    }},
  });




  /* ===== LOTTIE (real) + vector float ===== */
  /* Create the lottie-web player for `el` once the library is present. Returns a promise
     that settles when the animation data is loaded (or failed) — Storyboard.ready() awaits it. */
  function _lottieInit(el){
    if(el._ltP) return el._ltP;
    if(typeof window==='undefined' || !window.lottie){
      if(!window._sbLottieWarned){ window._sbLottieWarned=1; console.warn('[storyboard] lottie-web not loaded yet (include lottie_svg.min.js)'); }
      return null; // retry next frame once the lib is present
    }
    el._ltTried=true;
    const key=el.dataset.key, src=el.dataset.src||el.dataset.lottie;
    const opts={ container: el, renderer:'svg', loop:false, autoplay:false, rendererSettings:{preserveAspectRatio:'xMidYMid meet'} };
    if(key && window.SB_LOTTIE && window.SB_LOTTIE[key]) opts.animationData=window.SB_LOTTIE[key];
    else if(src) opts.path=src;
    else { console.warn('[storyboard] lottie: needs data-key or data-src'); el._ltP=Promise.resolve(); return el._ltP; }
    el._ltP=new Promise(res=>{
      try{
        el._lt=window.lottie.loadAnimation(opts);
        el._lt.addEventListener('DOMLoaded', ()=>{ el._ltReady=true; el._ltFrames=el._lt.getDuration(true)||60; el._ltFps=el._lt.frameRate||30; res(); });
        el._lt.addEventListener('data_failed', ()=>{ console.warn('[storyboard] lottie data failed to load:', src||key); res(); });
      }catch(e){ console.warn('[storyboard] lottie load failed', e); res(); }
    });
    return el._ltP;
  }
  Object.assign(PRESETS, {
    // Play a Lottie via lottie-web, clock-synced. Source: data-src="x.json"
    // (served/HTTP decks) OR data-key="confetti" (inline window.SB_LOTTIE map,
    // works on file:// too). Scrubs by progress by default; data-lottie-loop="1"
    // free-runs from the clock. Needs lottie_svg.min.js loaded on the page.
    lottie: { dur: 3.0, apply: (el,p,c) => {
      if(!el._ltP && !_lottieInit(el)) return;
      el.style.opacity=1;
      if(el._ltReady && el._lt){
        const frames=el._ltFrames||60;
        if(el.dataset.lottieLoop==='1'){ el._lt.goToAndStop((((c.time||0)*(el._ltFps||30))%frames), true); }
        else { const e=(c.ease||E.linear)(p); el._lt.goToAndStop(Math.min(frames-1, e*(frames-1)), true); }
      }
    }},
    // Owned vector confetti/hearts/stars drifting up (no OS emoji). data-shapes="heart,star,confetti,dot"
    floatShapes: { dur: 9999, apply: (el,p,c) => {
      if(!el.dataset.fs){ el.dataset.fs='1'; el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
        const kinds=(el.dataset.shapes||'heart,star,confetti,dot').split(',');
        const mk=(k,col)=>{
          if(k==='heart') return '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 20.3C5 15.5 2.5 11.8 2.5 8.4 2.5 5.7 4.6 3.7 7.2 3.7 9 3.7 10.7 4.8 12 6.6 13.3 4.8 15 3.7 16.8 3.7 19.4 3.7 21.5 5.7 21.5 8.4 21.5 11.8 19 15.5 12 20.3Z" fill="'+col+'"/></svg>';
          if(k==='star') return '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 1L15 9 23 9 17 14 19 22 12 17 5 22 7 14 1 9 9 9Z" fill="'+col+'"/></svg>';
          if(k==='confetti') return '<div style="width:100%;height:62%;background:'+col+';border-radius:2px"></div>';
          return '<div style="width:70%;height:70%;border-radius:50%;background:'+col+';margin:15%"></div>';
        };
        let h=''; for(let i=0;i<18;i++){ const x=_seed(i)*100, sz=20+_seed(i+2)*34, col=FUN[i%4], k=kinds[i%kinds.length];
          h+='<span class="fs-e" style="position:absolute;left:'+x+'%;bottom:-12%;width:'+sz+'px;height:'+sz+'px">'+mk(k,col)+'</span>'; }
        el.innerHTML=h; }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.fs-e').forEach((sp,i)=>{ const sp1=0.25+_seed(i)*0.4, prog=((t*sp1+_seed(i))%1.25), y=prog*125, sway=Math.sin(t*1.5+i)*30;
        sp.style.transform='translate('+sway+'px,-'+y+'vh) rotate('+(t*50+i*40)+'deg)'; sp.style.opacity=String(Math.max(0,1-prog)); });
    }},
  });

  /* =====================================================================
     CHARACTER RIG (actor layer) — owned procedural mascot / guide.
       <div class="anim" data-anim="character" data-char="blob|orb|bot|cat|ghost|star|bean|person|cutout" data-accessory="glasses|hat|bowtie"
            data-skin="medium" data-hair="short" data-haircolor="dark"   (person only)
            data-mood="idle" data-talk="1" data-color="var(--accent)"
            data-look="#kpi"
            data-acts="1:wave; 2.4:look=#kpi; 3.2:point=#kpi; 4:happy; 5:say=Look!">
     Lives the whole beat (dur 9999): auto-blink + breathe + idle sway,
     gaze tracking, gestures, expressions, lip-sync (rides the audio
     analyser; sine-flap fallback when silent), and speech bubbles.
  ===================================================================== */
  const _CHAR_INK='#10131f';
  function _charBrow(x,y){ return 'M'+(x-16)+','+y+' q16,-8 32,0'; }
  function _charSmile(kind,f){ var mx=f.mx,my=f.my,w=f.mw;
    if(kind==='happy') return 'M'+Math.round(mx-w*1.05)+','+(my-2)+' Q'+mx+','+Math.round(my+w*0.95)+' '+Math.round(mx+w*1.05)+','+(my-2);
    if(kind==='sad') return 'M'+Math.round(mx-w)+','+Math.round(my+w*0.4)+' Q'+mx+','+Math.round(my-w*0.4)+' '+Math.round(mx+w)+','+Math.round(my+w*0.4);
    if(kind==='think') return 'M'+Math.round(mx-w*0.5)+','+my+' Q'+mx+','+(my-2)+' '+Math.round(mx+w*0.6)+','+(my+3);
    return 'M'+Math.round(mx-w)+','+my+' Q'+mx+','+Math.round(my+w*0.62)+' '+Math.round(mx+w)+','+my;
  }
  function _charFaceSVG(f){ var ink=_CHAR_INK;
    var es = f.outline?(' stroke="'+f.outline+'" stroke-width="'+(f.outlineW||3)+'"'):'';
    var bd = f.browDef||0, bw = f.browW||5, bc = f.browColor||ink;
    return '<path class="sbc-brL" d="'+_charBrow(f.eyeLx,f.browY)+'" fill="none" stroke="'+bc+'" stroke-width="'+bw+'" stroke-linecap="round" opacity="'+bd+'"/>'
      +'<path class="sbc-brR" d="'+_charBrow(f.eyeRx,f.browY)+'" fill="none" stroke="'+bc+'" stroke-width="'+bw+'" stroke-linecap="round" opacity="'+bd+'"/>'
      +'<g class="sbc-eyeL"><ellipse class="sbc-eyew" cx="'+f.eyeLx+'" cy="'+f.eyeY+'" rx="'+f.erx+'" ry="'+f.ery+'" fill="#fff"'+es+'/><circle class="sbc-pupil" cx="'+f.eyeLx+'" cy="'+(f.eyeY+2)+'" r="'+f.pupil+'" fill="'+ink+'"/></g>'
      +'<g class="sbc-eyeR"><ellipse class="sbc-eyew" cx="'+f.eyeRx+'" cy="'+f.eyeY+'" rx="'+f.erx+'" ry="'+f.ery+'" fill="#fff"'+es+'/><circle class="sbc-pupil" cx="'+f.eyeRx+'" cy="'+(f.eyeY+2)+'" r="'+f.pupil+'" fill="'+ink+'"/></g>'
      +'<ellipse class="sbc-cheekL" cx="'+f.cheekLx+'" cy="'+f.cheekY+'" rx="12" ry="8" fill="var(--accent3,#FF5C8A)" opacity="0"/>'
      +'<ellipse class="sbc-cheekR" cx="'+f.cheekRx+'" cy="'+f.cheekY+'" rx="12" ry="8" fill="var(--accent3,#FF5C8A)" opacity="0"/>'
      +'<path class="sbc-smile" d="'+_charSmile('idle',f)+'" fill="none" stroke="'+ink+'" stroke-width="'+(f.smileW||6)+'" stroke-linecap="round"/>'
      +'<ellipse class="sbc-open" cx="'+f.mx+'" cy="'+(f.my+4)+'" rx="14" ry="4" fill="'+ink+'" opacity="0"/>';
  }
  function _charAccessory(name,f){ var ink=_CHAR_INK;
    if(name==='glasses'){ var r=f.erx+5; return '<g fill="none" stroke="'+ink+'" stroke-width="4" opacity="0.92"><circle cx="'+f.eyeLx+'" cy="'+f.eyeY+'" r="'+r+'"/><circle cx="'+f.eyeRx+'" cy="'+f.eyeY+'" r="'+r+'"/><line x1="'+(f.eyeLx+r)+'" y1="'+f.eyeY+'" x2="'+(f.eyeRx-r)+'" y2="'+f.eyeY+'"/></g>'; }
    if(name==='hat'){ var hy=f.browY-12, w=f.eyeRx-f.eyeLx; return '<g fill="'+ink+'"><rect x="'+(f.eyeLx-6)+'" y="'+(hy-34)+'" width="'+(w+12)+'" height="36" rx="6"/><rect x="'+(f.eyeLx-24)+'" y="'+hy+'" width="'+(w+48)+'" height="9" rx="4"/></g>'; }
    if(name==='bowtie'){ var by=f.my+30, cx=f.mx; return '<g fill="var(--accent3,#FF5C8A)"><path d="M'+cx+','+by+' L'+(cx-22)+','+(by-13)+' L'+(cx-22)+','+(by+13)+' Z"/><path d="M'+cx+','+by+' L'+(cx+22)+','+(by-13)+' L'+(cx+22)+','+(by+13)+' Z"/><circle cx="'+cx+'" cy="'+by+'" r="6"/></g>'; }
    return '';
  }
  var _CHAR_SKINS={light:'#FAD7B0',medium:'#E8B68B',tan:'#C68C5E',brown:'#9C6B3F',deep:'#6E4321'};
  var _CHAR_HAIRS={dark:'#2b2b3a',brown:'#5a3a26',blonde:'#E8C66A',auburn:'#8a3f24',red:'#B5552F',gray:'#B9BCC9',white:'#E8EAF2'};
  function _charSkin(k){ return (k&&_CHAR_SKINS[k])||k||_CHAR_SKINS.medium; }
  function _charHairColor(k){ return (k&&_CHAR_HAIRS[k])||k||_CHAR_HAIRS.dark; }
  function _charHair(style,c){
    if(style==='bald') return '';
    if(style==='buzz') return '<path d="M54,98 Q120,30 186,98 Q176,66 120,58 Q64,66 54,98 Z" fill="'+c+'" opacity="0.92"/>';
    if(style==='long') return '<path d="M44,162 Q36,38 120,24 Q204,38 196,162 Q200,92 176,66 Q176,56 120,52 Q64,56 64,66 Q40,92 44,162 Z" fill="'+c+'"/>';
    if(style==='bun') return '<circle cx="120" cy="22" r="20" fill="'+c+'"/><path d="M52,104 Q48,32 120,28 Q192,32 188,104 Q176,66 120,60 Q64,66 52,104 Z" fill="'+c+'"/>';
    if(style==='curly') return '<g fill="'+c+'"><circle cx="68" cy="58" r="23"/><circle cx="100" cy="38" r="25"/><circle cx="140" cy="38" r="25"/><circle cx="172" cy="58" r="23"/><circle cx="54" cy="88" r="18"/><circle cx="186" cy="88" r="18"/></g>';
    if(style==='cap') return '<path d="M50,96 Q120,26 190,96 Z" fill="'+c+'"/><rect x="46" y="90" width="148" height="14" rx="7" fill="'+c+'"/>';
    return '<path d="M50,106 Q46,28 120,24 Q194,28 190,106 Q178,64 120,58 Q62,64 50,106 Z" fill="'+c+'"/>';
  }
  function _charHairCut(style,c,O){
    if(style==='bald') return '';
    var sw=' stroke="'+O+'" stroke-width="3"';
    if(style==='buzz') return '<path d="M52,58 L58,40 L66,56 L74,38 L82,56 L90,38 L98,56 L106,38 L114,56 L122,38 L130,56 L138,38 L146,56 L154,38 L162,56 L170,40 L176,58 Q120,46 52,58 Z" fill="'+c+'"'+sw+'/>';
    if(style==='afro') return '<g fill="'+c+'"><circle cx="120" cy="34" r="52"/><circle cx="64" cy="66" r="40"/><circle cx="176" cy="66" r="40"/><circle cx="46" cy="100" r="27"/><circle cx="194" cy="100" r="27"/></g>';
    if(style==='long') return '<path d="M40,182 Q32,40 120,28 Q208,40 200,182 Q204,92 178,64 Q178,54 120,50 Q62,54 62,64 Q36,92 40,182 Z" fill="'+c+'"'+sw+'/>';
    if(style==='hood') return '<path d="M28,182 Q22,38 120,28 Q218,38 212,182 Q212,118 170,94 Q170,68 120,64 Q70,68 70,94 Q28,118 28,182 Z" fill="'+c+'"'+sw+'/>';
    if(style==='bun') return '<circle cx="120" cy="26" r="18" fill="'+c+'"'+sw+'/><path d="M50,104 Q46,34 120,30 Q194,34 190,104 Q176,62 120,56 Q64,62 50,104 Z" fill="'+c+'"'+sw+'/>';
    if(style==='curly') return '<g fill="'+c+'"><circle cx="64" cy="56" r="24"/><circle cx="96" cy="38" r="26"/><circle cx="144" cy="38" r="26"/><circle cx="176" cy="56" r="24"/><circle cx="48" cy="86" r="19"/><circle cx="192" cy="86" r="19"/></g>';
    return '<path d="M44,108 Q40,30 120,26 Q200,30 196,108 Q182,60 120,52 Q58,60 44,108 Z" fill="'+c+'"'+sw+'/>';
  }
  const _CHAR_STYLES = {
    cutout: { vb:[240,300], shadow:[120,295,74,11], originY:286, armPivot:{Lx:61,Ly:200,Rx:179,Ry:200},
      face:{eyeLx:101,eyeRx:139,eyeY:100,erx:27,ery:33,pupil:7,mx:120,my:150,mw:11,browY:60,cheekLx:80,cheekRx:160,cheekY:138,outline:'#1c1c22',outlineW:3,browDef:1,browW:7,smileW:5},
      body:function(c,el){ var d=(el&&el.dataset)||{}; var sk=_charSkin(d.skin), hc=_charHairColor(d.haircolor), hs=d.hair||'short', pants=d.pants||'#3a4a63', O='#1c1c22';
        return '<rect x="86" y="244" width="26" height="42" rx="9" fill="'+pants+'" stroke="'+O+'" stroke-width="3"/><rect x="128" y="244" width="26" height="42" rx="9" fill="'+pants+'" stroke="'+O+'" stroke-width="3"/>'
          +'<ellipse cx="92" cy="290" rx="22" ry="10" fill="#2b2b33" stroke="'+O+'" stroke-width="3"/><ellipse cx="148" cy="290" rx="22" ry="10" fill="#2b2b33" stroke="'+O+'" stroke-width="3"/>'
          +'<g class="sbc-armL"><rect x="48" y="198" width="26" height="44" rx="12" fill="'+c+'" stroke="'+O+'" stroke-width="3"/><circle cx="61" cy="246" r="15" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/></g>'
          +'<g class="sbc-armR"><rect x="166" y="198" width="26" height="44" rx="12" fill="'+c+'" stroke="'+O+'" stroke-width="3"/><circle cx="179" cy="246" r="15" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/></g>'
          +'<path d="M66,252 L66,208 Q66,178 120,176 Q174,178 174,208 L174,252 Z" fill="'+c+'" stroke="'+O+'" stroke-width="3"/>'
          +'<rect x="108" y="158" width="24" height="26" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/>'
          +'<ellipse cx="43" cy="104" rx="10" ry="15" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/><ellipse cx="197" cy="104" rx="10" ry="15" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/>'
          +'<ellipse class="sbc-body" cx="120" cy="104" rx="80" ry="76" fill="'+sk+'" stroke="'+O+'" stroke-width="3"/>'
          +_charHairCut(hs,hc,O); } },
    person: { vb:[240,320], shadow:[120,313,72,12], originY:300, armPivot:{Lx:41,Ly:236,Rx:199,Ry:236},
      face:{eyeLx:98,eyeRx:142,eyeY:92,erx:14,ery:17,pupil:7,mx:120,my:128,mw:14,browY:70,cheekLx:84,cheekRx:156,cheekY:120},
      body:function(c,el){ var d=(el&&el.dataset)||{}; var sk=_charSkin(d.skin), hc=_charHairColor(d.haircolor), hs=d.hair||'short';
        return '<rect class="sbc-armL" x="26" y="234" width="30" height="76" rx="15" fill="'+c+'"/><rect class="sbc-armR" x="184" y="234" width="30" height="76" rx="15" fill="'+c+'"/>'
          +'<path d="M34,320 L34,258 Q34,196 120,186 Q206,196 206,258 L206,320 Z" fill="'+c+'"/>'
          +'<rect x="107" y="150" width="26" height="36" rx="10" fill="'+sk+'"/>'
          +'<ellipse cx="57" cy="100" rx="11" ry="15" fill="'+sk+'"/><ellipse cx="183" cy="100" rx="11" ry="15" fill="'+sk+'"/>'
          +'<ellipse class="sbc-body" cx="120" cy="98" rx="64" ry="72" fill="'+sk+'"/>'
          +_charHair(hs,hc); } },
    blob: { vb:[240,300], shadow:[120,288,66,12], originY:250, armPivot:{Lx:34,Ly:152,Rx:206,Ry:152},
      face:{eyeLx:92,eyeRx:148,eyeY:136,erx:25,ery:29,pupil:11,mx:120,my:180,mw:19,browY:104,cheekLx:72,cheekRx:168,cheekY:178},
      body:function(c){return '<rect class="sbc-armL" x="18" y="150" width="32" height="88" rx="16" fill="'+c+'"/><rect class="sbc-armR" x="190" y="150" width="32" height="88" rx="16" fill="'+c+'"/><rect class="sbc-body" x="44" y="58" width="152" height="192" rx="74" fill="'+c+'"/>';} },
    orb: { vb:[240,240], shadow:[120,226,58,10], originY:210,
      face:{eyeLx:96,eyeRx:144,eyeY:110,erx:22,ery:26,pupil:10,mx:120,my:148,mw:19,browY:82,cheekLx:80,cheekRx:160,cheekY:148},
      body:function(c){return '<circle class="sbc-body" cx="120" cy="118" r="92" fill="'+c+'"/>';} },
    bot: { vb:[240,300], shadow:[120,288,64,12], originY:250, armPivot:{Lx:29,Ly:152,Rx:211,Ry:152},
      face:{eyeLx:92,eyeRx:148,eyeY:140,erx:23,ery:27,pupil:11,mx:120,my:186,mw:18,browY:110,cheekLx:72,cheekRx:168,cheekY:184},
      body:function(c){return '<rect class="sbc-armL" x="14" y="152" width="30" height="84" rx="15" fill="'+c+'"/><rect class="sbc-armR" x="196" y="152" width="30" height="84" rx="15" fill="'+c+'"/><line x1="120" y1="64" x2="120" y2="34" stroke="'+c+'" stroke-width="7" stroke-linecap="round"/><circle cx="120" cy="28" r="9" fill="'+c+'"/><rect class="sbc-body" x="46" y="62" width="148" height="180" rx="34" fill="'+c+'"/><rect x="96" y="214" width="48" height="12" rx="6" fill="rgba(255,255,255,.28)"/>';} },
    cat: { vb:[240,300], shadow:[120,288,64,12], originY:250, armPivot:{Lx:33,Ly:152,Rx:207,Ry:152},
      face:{eyeLx:92,eyeRx:148,eyeY:138,erx:24,ery:28,pupil:11,mx:120,my:182,mw:17,browY:110,cheekLx:74,cheekRx:166,cheekY:180},
      body:function(c){return '<rect class="sbc-armL" x="18" y="152" width="30" height="82" rx="15" fill="'+c+'"/><rect class="sbc-armR" x="192" y="152" width="30" height="82" rx="15" fill="'+c+'"/><path d="M72,82 L60,30 L106,68 Z" fill="'+c+'"/><path d="M168,82 L180,30 L134,68 Z" fill="'+c+'"/><rect class="sbc-body" x="46" y="62" width="148" height="188" rx="72" fill="'+c+'"/><g stroke="rgba(255,255,255,.5)" stroke-width="3" stroke-linecap="round"><line x1="60" y1="178" x2="14" y2="170"/><line x1="60" y1="186" x2="14" y2="190"/><line x1="180" y1="178" x2="226" y2="170"/><line x1="180" y1="186" x2="226" y2="190"/></g>';} },
    ghost: { vb:[240,300], shadow:[120,278,54,10], originY:230,
      face:{eyeLx:96,eyeRx:144,eyeY:130,erx:21,ery:25,pupil:10,mx:120,my:168,mw:16,browY:104,cheekLx:80,cheekRx:160,cheekY:166},
      body:function(c){return '<path class="sbc-body" d="M40,160 C40,84 200,84 200,160 L200,248 q-20,20 -40,0 q-20,-20 -40,0 q-20,20 -40,0 q-20,-20 -40,0 Z" fill="'+c+'" opacity="0.93"/>';} },
    star: { vb:[240,240], shadow:[120,232,52,9], originY:200,
      face:{eyeLx:104,eyeRx:136,eyeY:118,erx:16,ery:19,pupil:8,mx:120,my:150,mw:13,browY:98,cheekLx:88,cheekRx:152,cheekY:148},
      body:function(c){return '<path class="sbc-body" d="M120,18 L150,94 L232,96 L168,146 L190,224 L120,178 L50,224 L72,146 L8,96 L90,94 Z" fill="'+c+'"/>';} },
    bean: { vb:[240,300], shadow:[120,288,52,11], originY:252, armPivot:{Lx:40,Ly:152,Rx:200,Ry:152},
      face:{eyeLx:100,eyeRx:140,eyeY:120,erx:20,ery:24,pupil:10,mx:120,my:162,mw:16,browY:92,cheekLx:84,cheekRx:156,cheekY:160},
      body:function(c){return '<rect class="sbc-armL" x="26" y="150" width="28" height="80" rx="14" fill="'+c+'"/><rect class="sbc-armR" x="186" y="150" width="28" height="80" rx="14" fill="'+c+'"/><rect class="sbc-body" x="64" y="40" width="112" height="220" rx="56" fill="'+c+'"/>';} },
  };
  /* ===== BRING-YOUR-OWN-CHARACTER ===============================================
     (A) declarative JSON definition  -> Storyboard.defineCharacter(def)  /  data-char-src
     (B) rig-your-own-SVG             -> data-char="custom" + [data-sbc] tags + data-face
     Both inherit the full acting (blink/gaze/expressions/gestures/lip-sync).
  ============================================================================= */
  function _sbNum(v){ var n=Number(v); return isFinite(n)?n:null; }
  function _sbColorOK(s){ return typeof s==='string' && !/[<>"']/.test(s) && s.length<=64; }
  function _sbPathOK(s){ return typeof s==='string' && s.length<=4000 && /^[\sMLHVCSQTAZmlhvcsqtaz0-9eE,.\- ]+$/.test(s); }
  function _sbResolve(v,tok){ if(typeof v==='string' && v.charAt(0)==='$'){ var k=v.slice(1); return (tok&&tok[k]!=null)?tok[k]:'#888'; } return v; }
  function _sbAttr(name,v){ var n=_sbNum(v); return n==null?'':(' '+name+'="'+n+'"'); }
  var _SBC_RIG={armL:'sbc-armL',armR:'sbc-armR',eyeL:'sbc-eyeL',eyeR:'sbc-eyeR',pupilL:'sbc-pupil',pupilR:'sbc-pupil',pupil:'sbc-pupil',smile:'sbc-smile',mouth:'sbc-smile',open:'sbc-open',mouthOpen:'sbc-open',brL:'sbc-brL',brR:'sbc-brR',cheekL:'sbc-cheekL',cheekR:'sbc-cheekR',body:'sbc-body'};
  function _renderParts(parts, tok){
    if(!Array.isArray(parts)) return ''; var out='';
    for(var i=0;i<parts.length;i++){ var p=parts[i]; if(!p||typeof p!=='object') continue;
      var rig=(p.rig&&_SBC_RIG[p.rig])?(' class="'+_SBC_RIG[p.rig]+'"'):'';
      if(p.shape==='g'){ out+='<g'+rig+'>'+_renderParts(p.parts,tok)+'</g>'; continue; }
      var tag={rect:'rect',circle:'circle',ellipse:'ellipse',line:'line',path:'path',polygon:'polygon'}[p.shape]; if(!tag) continue;
      var a='';
      if(tag==='rect'){ a+=_sbAttr('x',p.x)+_sbAttr('y',p.y)+_sbAttr('width',p.w)+_sbAttr('height',p.h); if(p.r!=null){a+=_sbAttr('rx',p.r)+_sbAttr('ry',p.r);} }
      else if(tag==='circle'){ a+=_sbAttr('cx',p.cx)+_sbAttr('cy',p.cy)+_sbAttr('r',p.r); }
      else if(tag==='ellipse'){ a+=_sbAttr('cx',p.cx)+_sbAttr('cy',p.cy)+_sbAttr('rx',p.rx)+_sbAttr('ry',p.ry); }
      else if(tag==='line'){ a+=_sbAttr('x1',p.x1)+_sbAttr('y1',p.y1)+_sbAttr('x2',p.x2)+_sbAttr('y2',p.y2); }
      else if(tag==='path'){ if(!_sbPathOK(p.d)) continue; a+=' d="'+p.d+'"'; }
      else if(tag==='polygon'){ if(!_sbPathOK(p.points)) continue; a+=' points="'+p.points+'"'; }
      var fl=_sbResolve(p.fill,tok); if(fl!=null) a+=' fill="'+(_sbColorOK(fl)?fl:'none')+'"';
      var st=_sbResolve(p.stroke,tok); if(st!=null&&_sbColorOK(st)) a+=' stroke="'+st+'"';
      if(p.sw!=null) a+=_sbAttr('stroke-width',p.sw);
      if(p.opacity!=null) a+=_sbAttr('opacity',p.opacity);
      if(p.lc==='round'||p.lc==='square') a+=' stroke-linecap="'+p.lc+'"';
      if(p.lj==='round') a+=' stroke-linejoin="round"';
      out+='<'+tag+a+rig+'/>';
    }
    return out;
  }
  function _charTokens(el,S){
    var d=el.dataset||{};
    var t={ color:d.color||'var(--accent,#7C5CFF)', skin:_charSkin(d.skin), hair:_charHairColor(d.haircolor),
      accent:'var(--accent,#7C5CFF)', accent2:'var(--accent2,#19E3B1)', accent3:'var(--accent3,#FF5C8A)', gold:'var(--gold,#FFD166)',
      clothing:d.color||'var(--accent,#7C5CFF)', pants:d.pants||'#3a4a63', ink:'#1c1c22', white:'#ffffff' };
    var P=(S&&S.params)||{};
    for(var k in P){ if(!Object.prototype.hasOwnProperty.call(P,k)) continue; var dv=P[k];
      if(typeof dv==='string'&&dv.charAt(0)==='$'){ var rk=dv.slice(1); dv=(t[rk]!=null)?t[rk]:dv; }
      t[k]=(d[k]!=null&&d[k]!=='')?d[k]:dv; }
    return t;
  }
  function _compileFace(F){ if(!F) return null;
    var e=F.eyes||{}, m=F.mouth||{}, b=F.brows||{}, c=F.cheeks||{};
    return { eyeLx:e.L?e.L[0]:92, eyeY:e.L?e.L[1]:136, eyeRx:e.R?e.R[0]:148, erx:e.rx||25, ery:e.ry||29, pupil:e.pupil||11,
      outline:e.outline||null, outlineW:e.outlineW||3, mx:m.x||120, my:m.y||180, mw:m.w||19, smileW:m.w?Math.max(5,Math.round(m.w*0.32)):6,
      browY:b.y||104, browDef:b['default']||0, browW:b.w||5, browColor:b.color||null,
      cheekLx:c.L?c.L[0]:72, cheekY:c.L?c.L[1]:178, cheekRx:c.R?c.R[0]:168, render:F.render!==false };
  }
  function defineCharacter(def){
    if(!def||typeof def!=='object'||!def.name||typeof def.name!=='string'){ console.warn('[storyboard] defineCharacter needs {name,...}'); return false; }
    var vb=(def.viewBox&&def.viewBox.length===2)?[_sbNum(def.viewBox[0])||240,_sbNum(def.viewBox[1])||300]:[240,300];
    var f=_compileFace(def.face)||_compileFace({eyes:{L:[92,136],R:[148,136]}});
    _CHAR_STYLES[def.name]={ vb:vb, shadow:def.shadow||[vb[0]/2,vb[1]-12,vb[0]*0.28,11], originY:(def.origin&&def.origin[1])||(vb[1]-50),
      armPivot:(def.arms&&def.arms.L&&def.arms.R)?{Lx:def.arms.L[0],Ly:def.arms.L[1],Rx:def.arms.R[0],Ry:def.arms.R[1]}:null,
      params:def.params||{}, parts:Array.isArray(def.parts)?def.parts:[], faceRender:(def.face?def.face.render!==false:true), face:f };
    return true;
  }
  function _charRegisterBundle(){ if(typeof window!=='undefined' && window.SB_CHARACTERS && !window._sbCharsReg){ window._sbCharsReg=1;
    for(var k in window.SB_CHARACTERS){ try{ var dd=window.SB_CHARACTERS[k]; if(dd&&!dd.name) dd.name=k; defineCharacter(dd); }catch(e){} } } }
  function _charSanitizeSVG(s){ return String(s).replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript:/gi,''); }
  function _charCacheParts(el, f, armPivot, vb, originY){
    var q=function(s){return el.querySelector(s);};
    var p={ bodyG:q('.sbc-bodyG'), eyeL:q('.sbc-eyeL'), eyeR:q('.sbc-eyeR'),
      pupilL:q('.sbc-eyeL .sbc-pupil')||q('.sbc-pupil'), pupilR:q('.sbc-eyeR .sbc-pupil'),
      smile:q('.sbc-smile'), open:q('.sbc-open'), cheekL:q('.sbc-cheekL'), cheekR:q('.sbc-cheekR'),
      brL:q('.sbc-brL'), brR:q('.sbc-brR'), armL:q('.sbc-armL'), armR:q('.sbc-armR'), style:el.dataset.char||'custom' };
    el._chParts=p; el._chFace=f;
    if(p.eyeL) p.eyeL.style.transformOrigin=f.eyeLx+'px '+f.eyeY+'px';
    if(p.eyeR) p.eyeR.style.transformOrigin=f.eyeRx+'px '+f.eyeY+'px';
    if(p.armL && armPivot){ p.armL.style.transformOrigin=armPivot.Lx+'px '+armPivot.Ly+'px'; if(p.armR) p.armR.style.transformOrigin=armPivot.Rx+'px '+armPivot.Ry+'px'; }
    if(p.brL) p.brL.style.transformOrigin=f.eyeLx+'px '+f.browY+'px';
    if(p.brR) p.brR.style.transformOrigin=f.eyeRx+'px '+f.browY+'px';
    if(p.bodyG) p.bodyG.style.transformOrigin=((vb?vb[0]:240)/2)+'px '+(originY||250)+'px';
  }
  function _charAdopt(el){
    // Rig-your-own-SVG. Provide a real inner <svg> (viewBox + your art). If you tag eyes
    // with data-sbc="eyeL"/"eyeR" the engine drives YOUR drawn face; otherwise it draws
    // its own animated face onto your art at the data-face descriptor. Other rig points:
    // pupilL/pupilR, mouth, open, armL/armR, brL/brR, cheekL/cheekR, body.
    var fd=null; try{ fd=el.dataset.face?JSON.parse(el.dataset.face):null; }catch(e){ fd=null; }
    var svg=el.querySelector('svg'); var artInner='', vbA=[240,300];
    if(svg){
      svg.querySelectorAll('script,foreignObject,a,image,use').forEach(function(n){ if(n.parentNode) n.parentNode.removeChild(n); });
      svg.querySelectorAll('*').forEach(function(n){ for(var i=n.attributes.length-1;i>=0;i--){ var an=n.attributes[i].name; if(/^on/i.test(an)||/href/i.test(an)) n.removeAttribute(an); } });
      artInner=svg.innerHTML;
      var va=(svg.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number); if(va.length>=4&&isFinite(va[2])&&isFinite(va[3])) vbA=[va[2],va[3]];
    } else { artInner=_charSanitizeSVG(el.innerHTML); }
    if(el.dataset.viewbox){ var dv=el.dataset.viewbox.split(/[\s,]+/).map(Number); if(dv[0]&&dv[1]) vbA=[dv[0],dv[1]]; }
    var f=(fd&&fd.eyes)?_compileFace(fd):_compileFace({eyes:{L:[vbA[0]*0.4,vbA[1]*0.42],R:[vbA[0]*0.6,vbA[1]*0.42]},mouth:{x:vbA[0]/2,y:vbA[1]*0.6,w:16}});
    var ownEyes=/data-sbc\s*=\s*["']?\s*(eyeL|eyeR)/i.test(artInner);
    var faceSVG=(!ownEyes && (!fd || fd.render!==false)) ? _charFaceSVG(f) : '';
    el.innerHTML='<svg class="sbc-svg" viewBox="0 0 '+vbA[0]+' '+vbA[1]+'" style="width:100%;height:100%;overflow:visible"><g class="sbc-bodyG">'+artInner+faceSVG+'</g></svg>';
    el.querySelectorAll('[data-sbc]').forEach(function(node){ var key=node.getAttribute('data-sbc'); if(_SBC_RIG[key]) node.classList.add(_SBC_RIG[key]); });
    var ap=(fd&&fd.arms&&fd.arms.L&&fd.arms.R)?{Lx:fd.arms.L[0],Ly:fd.arms.L[1],Rx:fd.arms.R[0],Ry:fd.arms.R[1]}:null;
    _charCacheParts(el,f,ap,vbA,(fd&&fd.origin&&fd.origin[1])||(vbA[1]-50));
  }
  function _charBuild(el){
    var style=el.dataset.char||'blob'; var S=_CHAR_STYLES[style]||_CHAR_STYLES.blob;
    var f=S.face; var vb=S.vb, sh=S.shadow;
    var acc=el.dataset.accessory?_charAccessory(el.dataset.accessory,f):'';
    var bodySVG = S.parts ? _renderParts(S.parts,_charTokens(el,S)) : S.body((el.dataset.color||'var(--accent,#7C5CFF)'),el);
    var faceSVG = (S.faceRender===false) ? '' : _charFaceSVG(f);
    el.innerHTML='<svg class="sbc-svg" viewBox="0 0 '+vb[0]+' '+vb[1]+'" style="width:100%;height:100%;overflow:visible">'
      +'<ellipse class="sbc-shadow" cx="'+sh[0]+'" cy="'+sh[1]+'" rx="'+sh[2]+'" ry="'+sh[3]+'" fill="rgba(0,0,0,.22)"/>'
      +'<g class="sbc-bodyG">'+bodySVG+faceSVG+acc+'</g></svg>';
    _charCacheParts(el,f,S.armPivot,vb,S.originY);
  }
  function _charApplyMood(el, mood){
    var p=el._chParts, ch=el._ch, f=el._chFace; if(!p) return; ch.mood=mood;
    if(p.cheekL) p.cheekL.style.opacity='0'; if(p.cheekR) p.cheekR.style.opacity='0';
    var _bd=String((f&&f.browDef)||0);
    if(p.brL){ p.brL.style.opacity=_bd; p.brL.style.transform=''; } if(p.brR){ p.brR.style.opacity=_bd; p.brR.style.transform=''; }
    ch.eyeRy=1; ch.winkR=0; ch.moodLook=[0,0]; ch.moodSurprise=0;
    var kind='idle';
    if(mood==='happy'||mood==='wink'){ kind='happy'; if(p.cheekL)p.cheekL.style.opacity='.9'; if(p.cheekR)p.cheekR.style.opacity='.9'; ch.eyeRy=0.78; }
    if(mood==='wink') ch.winkR=1;
    if(mood==='sad'){ kind='sad'; if(p.brL){p.brL.style.opacity='.9';p.brL.style.transform='rotate(14deg)';} if(p.brR){p.brR.style.opacity='.9';p.brR.style.transform='rotate(-14deg)';} ch.moodLook=[0,5]; }
    if(mood==='surprised'){ if(p.brL){p.brL.style.opacity='.9';p.brL.style.transform='translateY(-7px)';} if(p.brR){p.brR.style.opacity='.9';p.brR.style.transform='translateY(-7px)';} ch.eyeRy=1.2; ch.moodSurprise=1; }
    if(mood==='think'){ kind='think'; if(p.brR){p.brR.style.opacity='.9';p.brR.style.transform='translateY(-6px)';} ch.moodLook=[-5,-6]; }
    if(p.smile) p.smile.setAttribute('d', _charSmile(kind, f)); ch.smileD=kind;
  }
  function _charParseActs(spec){
    if(!spec) return [];
    return spec.split(';').map(s=>s.trim()).filter(Boolean).map(seg=>{
      const i=seg.indexOf(':'); if(i<0) return null;
      const t=parseFloat(seg.slice(0,i)); let cmd=seg.slice(i+1).trim(); let arg=null;
      const eq=cmd.indexOf('='); let name=cmd; if(eq>=0){ name=cmd.slice(0,eq).trim(); arg=cmd.slice(eq+1).trim(); }
      return isNaN(t)?null:{t, name, arg};
    }).filter(Boolean).map((a,i)=>(a.i=i,a)).sort((a,b)=>(a.t-b.t)||(a.i-b.i));   // stable time order
  }
  const _CHAR_MOODSET=new Set(['idle','happy','sad','surprised','think','wink']);
  const _CHAR_GESTURES={ wave:1.1, nod:0.7, jump:0.7, bounce:0.7, shrug:0.7, spin:0.9 };
  /* The character's acting state at time t: replay every act with (cue + act.t) <= t from the
     initial state. A pure function of t — rendering t=3 then t=1 gives the t=1 pose. */
  function _charState(el, t){
    const ch=el._ch, cue=_cueOf(el);
    const st={ mood:ch.mood0, gazeSel:ch.look0, pointSel:null, talk:ch.talk0, dsTalk:ch.talk0,
      say:null, sayT0:0, sayUntil:0, gestures:[] };
    for(const a of ch.acts){
      const at=cue+a.t; if(t<at) break;
      if(_CHAR_MOODSET.has(a.name)) st.mood=a.name;
      else if(a.name==='look'){ st.gazeSel=a.arg; st.pointSel=null; }
      else if(a.name==='point'){ st.pointSel=a.arg; st.gazeSel=a.arg; }
      else if(a.name==='rest'){ st.pointSel=null; }
      else if(a.name==='talk'){ st.talk=true; st.dsTalk=true; }
      else if(a.name==='quiet'){ st.talk=false; st.dsTalk=false; }
      else if(a.name==='say'){ st.say=a.arg||''; st.sayT0=at; st.talk=true; st.sayUntil=at+Math.max(1.8,(a.arg||'').length*0.07+1.4); }
      else if(_CHAR_GESTURES[a.name]) st.gestures.push({name:a.name, start:at, dur:_CHAR_GESTURES[a.name]});
    }
    return st;
  }
  function _charBubble(el){
    let bub=el._chBubble;
    if(!bub){ const b=document.createElement('div'); b.className='sbc-bubble';
      b.style.cssText='position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:18px;background:#fff;color:#10131f;font:600 24px/1.32 inherit;padding:16px 22px;border-radius:18px;max-width:360px;width:max-content;text-align:center;box-shadow:0 14px 36px rgba(0,0,0,.32);z-index:5;opacity:0';
      const span=document.createElement('span'); b.appendChild(span);
      const tail=document.createElement('div'); tail.style.cssText='position:absolute;left:50%;top:100%;transform:translateX(-50%);width:0;height:0;border:13px solid transparent;border-top-color:#fff;margin-top:-3px'; b.appendChild(tail);
      el.appendChild(b); bub=el._chBubble={b,span}; }
    return bub;
  }
  function _charScreenDir(el, sel){
    const tg=document.querySelector(sel); if(!tg) return null;
    const a=el.getBoundingClientRect(), b=tg.getBoundingClientRect(); if(!a.width||!b.width) return null;
    return { dx:(b.left+b.width/2)-(a.left+a.width/2), dy:(b.top+b.height/2)-(a.top+a.height/2) };
  }
  function _charUpdate(el, c){
    const p=el._chParts, ch=el._ch; if(!p) return; const t=c.time||0; ch._t=t;
    const st=_charState(el, t);
    if(ch.mood!==st.mood) _charApplyMood(el, st.mood);
    let bodyTy=Math.sin(t*1.7)*3, bodyR=0, bodyScale=1+0.012*Math.sin(t*1.7), bodyExtraY=0, armLr=0, armRr=0;
    for(const g of st.gestures){ if((t-g.start)/g.dur > 1) continue; const gp=Math.max(0,Math.min(1,(t-g.start)/g.dur));
      if(g.name==='wave'){ armRr=-118+Math.sin(gp*Math.PI*4)*26; }
      else if(g.name==='nod'){ bodyR+=Math.sin(gp*Math.PI*2)*7; }
      else if(g.name==='jump'){ bodyExtraY+=-Math.abs(Math.sin(gp*Math.PI))*48; }
      else if(g.name==='bounce'){ bodyExtraY+=-Math.abs(Math.sin(gp*Math.PI*2))*24; }
      else if(g.name==='shrug'){ const u=Math.sin(gp*Math.PI); armLr=22*u; armRr=-22*u; bodyExtraY+=-6*u; }
      else if(g.name==='spin'){ bodyR+=gp*360; } }
    ch.gazeSel=st.gazeSel; ch.pointSel=st.pointSel; ch.talk=st.talk; ch.dataset_talk=st.dsTalk; ch._sayUntil=st.sayUntil;   // introspection
    if(st.pointSel){ const d=_charScreenDir(el,st.pointSel); if(d){ const ang=Math.atan2(d.dy,d.dx)*180/Math.PI;
      if(d.dx>=0){ armRr=Math.max(-165,Math.min(15,ang-90)); } else { armLr=Math.max(-15,Math.min(165,ang+90)); } } }
    if(p.bodyG) p.bodyG.style.transform='translateY('+(bodyTy+bodyExtraY)+'px) rotate('+bodyR+'deg) scale('+bodyScale+')';
    if(p.armL) p.armL.style.transform='rotate('+armLr+'deg)';
    if(p.armR) p.armR.style.transform='rotate('+armRr+'deg)';
    const blinking=(((t+(ch.blinkOff||0))%3.3)<0.12);
    if(p.eyeL) p.eyeL.style.transform='scaleY('+(blinking?0.08:ch.eyeRy)+')';
    if(p.eyeR) p.eyeR.style.transform='scaleY('+((blinking||ch.winkR)?0.08:ch.eyeRy)+')';
    let gx=ch.moodLook[0], gy=ch.moodLook[1]; const gsel=st.pointSel||st.gazeSel;
    if(gsel){ const d=_charScreenDir(el,gsel); if(d){ const m=Math.hypot(d.dx,d.dy)||1, M=10; gx=Math.max(-M,Math.min(M,d.dx/m*M)); gy=Math.max(-M,Math.min(M,d.dy/m*M)); } }
    if(p.pupilL) p.pupilL.style.transform='translate('+gx+'px,'+gy+'px)'; if(p.pupilR) p.pupilR.style.transform='translate('+gx+'px,'+gy+'px)';
    const talking = st.talk && (st.dsTalk || (st.sayUntil && t<st.sayUntil));
    if(ch.moodSurprise && !talking){ if(p.smile)p.smile.style.opacity='0'; if(p.open){p.open.style.opacity='1'; p.open.setAttribute('rx','11'); p.open.setAttribute('ry','13');} }
    else if(talking){ if(p.smile)p.smile.style.opacity='0'; if(p.open){ p.open.style.opacity='1'; let amp;
      const lv=_envLevelAt(t);                                   // precomputed envelope (deterministic)
      if(lv!=null) amp=lv;
      else if(analyser && freqData && !OFFLINE){ analyser.getByteFrequencyData(freqData); let s=0; for(let i=2;i<26;i++) s+=freqData[i]; amp=Math.min(1,(s/24)/150); }
      else amp=0.42+0.42*Math.abs(Math.sin(t*9.0));
      p.open.setAttribute('rx',(12+amp*4).toFixed(1)); p.open.setAttribute('ry',(3+amp*13).toFixed(1)); } }
    else { if(p.smile)p.smile.style.opacity='1'; if(p.open)p.open.style.opacity='0'; }
    if(st.say!==null){ const bt=_charBubble(el); const n=Math.floor(Math.max(0,(t-st.sayT0))/0.045);
      _setText(bt.span, st.say.slice(0,n)); bt.b.style.opacity=(t>st.sayUntil+0.5)?'0':'1'; }
    else if(el._chBubble){ _setText(el._chBubble.span, ''); el._chBubble.b.style.opacity='0'; }
  }
  /* Resolve the character's definition. data-char-src fetches a JSON definition once; the
     returned promise settles when it is registered (Storyboard.ready() awaits it). */
  function _charSource(el){
    _charRegisterBundle();
    const style=el.dataset.char||'blob';
    const adopt=(style==='custom') || (el.dataset.charSvg!==undefined) || (!_CHAR_STYLES[style] && !el.dataset.charSrc && el.querySelector('[data-sbc]'));
    if(adopt || _CHAR_STYLES[style] || !el.dataset.charSrc) return { adopt, pending:null };
    if(!el._chFetchP){
      el._chFetchP=fetch(el.dataset.charSrc).then(function(r){return r.json();})
        .then(function(j){ if(j&&!j.name)j.name=style; defineCharacter(j); })
        .catch(function(e){ console.warn('[storyboard] char-src failed', e); });
    }
    return { adopt, pending:el._chFetchP };
  }
  function _charInit(el){
    if(el._chInit) return true;
    const src=_charSource(el); if(src.pending) return false;   // wait for the def, build on a later frame
    el._chInit=1;
    if(getComputedStyle(el).position==='static') el.style.position='relative';
    if(src.adopt) _charAdopt(el); else _charBuild(el);
    const idx=Math.max(0,[...document.querySelectorAll('[data-anim="character"]')].indexOf(el));   // stable (document order)
    el._ch={ mood:'', eyeRy:1, winkR:0, moodLook:[0,0], moodSurprise:0, smileD:'',
      mood0:el.dataset.mood||'idle', look0:el.dataset.look||null, talk0:el.dataset.talk==='1',
      gazeSel:el.dataset.look||null, pointSel:null, talk:el.dataset.talk==='1', dataset_talk:el.dataset.talk==='1',
      acts:_charParseActs(el.dataset.acts), _t:0, _sayUntil:0, blinkOff:(idx*1.13)%3.3 };
    if(el._ch.acts.some(a=>a.name==='say')) _charBubble(el);   // build the bubble now, not on the first 'say' frame
    _charApplyMood(el, el._ch.mood0);
    return true;
  }
  Object.assign(PRESETS, {
    character: { dur: 9999, apply: (el,p,c) => {
      if(!_charInit(el)) return;
      el.style.opacity=1;
      _charUpdate(el, c);
    }},
  });

  /* =====================================================================
     PROPS & DEVICE MOCKUPS — stage product demos with real objects.
       <div class="anim" data-anim="device" data-device="browser|phone|laptop|tablet"
            data-url="app.com">...screen content...</div>
       <div class="anim" data-anim="speechBubble" data-tail="down" data-t-rel data-dur>Nice!</div>
       <div class="anim" data-anim="stickyNote" data-rot="-3">remember this</div>
       <div class="anim" data-anim="pinDrop" data-color="var(--accent3)"></div>
  ===================================================================== */
  const PROPS_CSS =
    '.sb-dev{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}'
   +'.sb-dev .sb-screen{position:relative;overflow:hidden;background:#0b0e1a;width:100%;height:100%}'
   +'.sb-browser{width:100%;height:100%;border-radius:14px;overflow:hidden;background:#23283f;box-shadow:0 30px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.07)}'
   +'.sb-browser .sb-bar{height:54px;display:flex;align-items:center;padding:0 20px;background:#23283f;flex:0 0 auto}'
   +'.sb-dot{width:14px;height:14px;border-radius:50%;display:inline-block;margin-right:9px}'
   +'.sb-url{flex:1;height:34px;background:#11142a;border-radius:9px;margin-left:16px;color:#9aa3c0;font:500 19px/34px ui-monospace,monospace;padding:0 16px;overflow:hidden;white-space:nowrap}'
   +'.sb-browser .sb-screen{flex:1}'
   +'.sb-phone{height:100%;width:auto;aspect-ratio:0.49;background:#15192b;border-radius:46px;padding:16px;box-shadow:0 30px 80px rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.06);position:relative}'
   +'.sb-phone .sb-screen{border-radius:32px}'
   +'.sb-phone .sb-notch{position:absolute;top:16px;left:50%;transform:translateX(-50%);width:120px;height:28px;background:#15192b;border-radius:0 0 16px 16px;z-index:3}'
   +'.sb-laptop{width:100%;aspect-ratio:1.6;display:flex;flex-direction:column;align-items:center}'
   +'.sb-laptop .sb-lid{width:100%;flex:1;background:#15192b;border-radius:16px 16px 4px 4px;padding:15px;box-shadow:0 24px 60px rgba(0,0,0,.5)}'
   +'.sb-laptop .sb-screen{border-radius:6px}'
   +'.sb-laptop .sb-base{width:116%;height:18px;background:linear-gradient(#2a3050,#171b2c);border-radius:0 0 16px 16px;position:relative}'
   +'.sb-laptop .sb-base::after{content:"";position:absolute;left:50%;top:0;transform:translateX(-50%);width:92px;height:7px;background:#0c0e18;border-radius:0 0 8px 8px}'
   +'.sb-tablet{height:100%;width:auto;aspect-ratio:0.72;background:#15192b;border-radius:30px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.5)}'
   +'.sb-tablet .sb-screen{border-radius:14px}'
   +'.sb-speech{display:inline-block;background:#fff;color:#10131f;font-weight:600;padding:18px 26px;border-radius:20px;position:relative;box-shadow:0 14px 36px rgba(0,0,0,.3);transform-origin:center bottom;line-height:1.3}'
   +'.sb-tail{position:absolute;width:0;height:0;border:14px solid transparent}'
   +'.sb-tail-down{top:100%;left:34px;border-top-color:#fff;margin-top:-2px}'
   +'.sb-tail-up{bottom:100%;left:34px;border-bottom-color:#fff;margin-bottom:-2px}'
   +'.sb-tail-left{right:100%;top:26px;border-right-color:#fff;margin-right:-2px}'
   +'.sb-tail-right{left:100%;top:26px;border-left-color:#fff;margin-left:-2px}'
   +'.sb-sticky{display:inline-block;background:linear-gradient(180deg,#FFE89A,#FFD166);color:#5a4708;font-weight:600;padding:30px 32px;box-shadow:0 16px 30px rgba(0,0,0,.35);border-radius:4px;transform-origin:center}';
  function _devBuild(el){
    _sbStyle('sb-props-css', PROPS_CSS);
    const kind=el.dataset.device||'browser';
    const kids=[]; while(el.firstChild){ kids.push(el.firstChild); el.removeChild(el.firstChild); }
    const wrap=document.createElement('div'); wrap.className='sb-dev';
    let html;
    if(kind==='phone') html='<div class="sb-phone"><div class="sb-notch"></div><div class="sb-screen"></div></div>';
    else if(kind==='laptop') html='<div class="sb-laptop"><div class="sb-lid"><div class="sb-screen"></div></div><div class="sb-base"></div></div>';
    else if(kind==='tablet') html='<div class="sb-tablet"><div class="sb-screen"></div></div>';
    else { const url=el.dataset.url||'yourapp.com'; html='<div class="sb-browser"><div class="sb-bar"><span class="sb-dot" style="background:#FF5C6C"></span><span class="sb-dot" style="background:#FFD166"></span><span class="sb-dot" style="background:#19E3B1"></span><div class="sb-url">'+url+'</div></div><div class="sb-screen"></div></div>'; }
    wrap.innerHTML=html; el.appendChild(wrap);
    const screen=wrap.querySelector('.sb-screen'); kids.forEach(k=>screen.appendChild(k));   // preserve nodes (incl. .anim children)
  }
  Object.assign(PRESETS, {
    device: { dur: 1.0, apply: (el,p,c) => {
      if(!el._dvInit){ el._dvInit=1; _devBuild(el); }
      const e=(c.ease||E.outBack)(p); el.style.opacity=Math.min(1,p*3);
      el.style.transform='perspective(1500px) translateY('+((1-e)*42)+'px) scale('+(0.9+0.1*e)+')';
    }},
    speechBubble: { dur: 1.4, apply: (el,p,c) => {
      if(!el._sbbInit){ el._sbbInit=1; _sbStyle('sb-props-css', PROPS_CSS);
        const txt=el.dataset.text!==undefined?el.dataset.text:el.textContent; el.dataset.fullText=txt; el.textContent='';
        el.classList.add('sb-speech');
        const sp=document.createElement('span'); el.appendChild(sp); el._sbbSpan=sp;
        const tl=document.createElement('div'); tl.className='sb-tail sb-tail-'+(el.dataset.tail||'down'); el.appendChild(tl);
      }
      const e=E.outBack(Math.min(1,p*1.6)); el.style.opacity=Math.min(1,p*3); el.style.transform='scale('+(0.55+0.45*e)+')';
      const full=el.dataset.fullText||''; _setText(el._sbbSpan, full.slice(0, Math.floor(full.length*Math.min(1,(c.ease||E.linear)(p)*1.25))));
    }, reset: el => { if(el._sbbSpan) _setText(el._sbbSpan, ''); } },
    stickyNote: { dur: 0.9, apply: (el,p,c) => {
      if(!el._snInit){ el._snInit=1; _sbStyle('sb-props-css', PROPS_CSS); el.classList.add('sb-sticky'); el.style.setProperty('--rot',(el.dataset.rot||'-3')+'deg'); }
      const e=E.outBack(Math.min(1,p*1.4)); el.style.opacity=Math.min(1,p*3);
      el.style.transform='rotate(var(--rot)) scale('+(0.4+0.6*e)+')';
    }},
    pinDrop: { dur: 1.0, apply: (el,p,c) => {
      if(!el._pdInit){ el._pdInit=1; const col=el.dataset.color||'var(--accent3,#FF5C8A)';
        el.innerHTML='<svg viewBox="0 0 24 32" style="width:100%;height:100%;overflow:visible"><path d="M12 1C6.5 1 2 5.5 2 11c0 7.5 10 20 10 20s10-12.5 10-20c0-5.5-4.5-10-10-10z" fill="'+col+'"/><circle cx="12" cy="11" r="4.2" fill="#fff"/></svg>'; el.style.transformOrigin='center bottom'; }
      const e=E.outBounce(Math.min(1,p*1.3)); el.style.opacity=Math.min(1,p*4);
      el.style.transform='translateY('+((1-e)*-170)+'px)';
    }},
  });

  /* =====================================================================
     ENVIRONMENTS + PARTICLE SYSTEMS — sets & atmosphere.
       <div class="anim bleed" data-anim="emitter" data-fx="snow|rain|embers|bubbles|dust"></div>
       <div class="anim bleed" data-anim="sky" data-sky="day|dusk|night"></div>
       <div class="anim bleed" data-anim="scenery"></div>   (layered hill bands; brand color)
     All full-bleed (set on a .bleed/inset:0 layer), self-filling, loop forever.
  ===================================================================== */
  const _EM_DEF = {
    snow:   { n:60,  down:1,  speed:[0.12,0.40], size:[4,12], color:'#ffffff',              op:.85, sway:34 },
    rain:   { n:100, down:1,  speed:[0.80,1.30], size:[2,3],  color:'rgba(180,205,255,.55)',op:.6,  sway:0, streak:true },
    embers: { n:55,  down:-1, speed:[0.18,0.45], size:[4,9],  color:'var(--gold,#FFD166)',  op:.9,  sway:30, flicker:true },
    bubbles:{ n:40,  down:-1, speed:[0.12,0.35], size:[10,36],color:'rgba(124,92,255,.06)', border:'rgba(255,255,255,.35)', op:.5, sway:38 },
    dust:   { n:55,  down:-1, speed:[0.04,0.16], size:[3,7],  color:'var(--accent2,#19E3B1)',op:.4, sway:55 },
  };
  function _emBuild(el){
    el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
    const fx=el.dataset.fx||'snow'; el.dataset._fx=fx; const def=_EM_DEF[fx]||_EM_DEF.snow;
    const N=parseInt(el.dataset.count||def.n,10); let h='';
    for(let i=0;i<N;i++){ const s1=_seed(i), s2=_seed(i+11); const sz=def.size[0]+s2*(def.size[1]-def.size[0]);
      let st='position:absolute;left:'+(s1*100).toFixed(2)+'%;'+(def.down>0?'top:-6%;':'bottom:-6%;');
      if(def.streak) st+='width:'+def.size[0]+'px;height:'+(sz*9).toFixed(0)+'px;background:'+def.color+';border-radius:2px;';
      else if(fx==='bubbles') st+='width:'+sz.toFixed(0)+'px;height:'+sz.toFixed(0)+'px;border-radius:50%;border:2px solid '+def.border+';background:'+def.color+';';
      else st+='width:'+sz.toFixed(0)+'px;height:'+sz.toFixed(0)+'px;border-radius:50%;background:'+def.color+';';
      h+='<span class="em-p" style="'+st+'"></span>'; }
    el.innerHTML=h;
  }
  Object.assign(PRESETS, {
    emitter: { dur: 9999, apply: (el,p,c) => {
      if(!el._emInit){ el._emInit=1; _emBuild(el); }
      el.style.opacity=1; const t=c.time||0; const def=_EM_DEF[el.dataset._fx]||_EM_DEF.snow;
      el.querySelectorAll('.em-p').forEach((sp,i)=>{ const s1=_seed(i), s2=_seed(i+11);
        const spd=def.speed[0]+s1*(def.speed[1]-def.speed[0]); const prog=((t*spd+s2)%1.18); const travel=prog*116;
        const ty=def.down>0?travel:-travel; const sway=Math.sin(t*1.4+i*0.7)*def.sway;
        let o=def.op; if(def.flicker) o*=0.5+0.5*Math.abs(Math.sin(t*5+i)); o*=Math.min(1,(1-prog)*3);
        sp.style.transform='translate('+sway.toFixed(1)+'px,'+ty.toFixed(1)+'vh)'+(def.streak?' rotate(9deg)':''); sp.style.opacity=o.toFixed(2); });
    }},
    sky: { dur: 9999, apply: (el,p,c) => {
      if(!el._skInit){ el._skInit=1; el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
        const k=el.dataset.sky||'day'; let grad, h='', stars=false, clouds=true;
        if(k==='night'){ grad='linear-gradient(180deg,#070a1a,#131a3c)'; stars=true; clouds=false;
          h+='<div style="position:absolute;right:12%;top:14%;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 38% 34%,#fff,#cdd6f5 70%,#aab4e0);box-shadow:0 0 60px rgba(200,210,255,.5)"></div>'; }
        else if(k==='dusk'){ grad='linear-gradient(180deg,#3a2a6b,#b5547d 55%,#ffb36b)';
          h+='<div style="position:absolute;right:16%;top:42%;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,#FFE2A8,#FF9E5e);box-shadow:0 0 90px rgba(255,150,90,.6)"></div>'; }
        else { grad='linear-gradient(180deg,#2a4d8f,#5a8fd6 58%,#a9d0f5)';
          h+='<div style="position:absolute;right:13%;top:12%;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle at 40% 36%,#fff7d6,#FFD166 72%,#F2B33d);box-shadow:0 0 80px rgba(255,209,102,.7)"></div>'; }
        el.style.background=grad;
        if(stars){ for(let i=0;i<50;i++){ const x=_seed(i)*100, y=_seed(i+7)*60, s=1+_seed(i+3)*2.4; h+='<span class="sky-star" style="position:absolute;left:'+x.toFixed(1)+'%;top:'+y.toFixed(1)+'%;width:'+s.toFixed(1)+'px;height:'+s.toFixed(1)+'px;border-radius:50%;background:#fff"></span>'; } }
        if(clouds){ for(let i=0;i<4;i++){ const y=8+_seed(i)*42, w=180+_seed(i+5)*220, sc=0.7+_seed(i)*0.7; h+='<div class="sky-cloud" style="position:absolute;left:0;top:'+y.toFixed(1)+'%;width:'+w.toFixed(0)+'px;height:'+(w*0.34).toFixed(0)+'px;background:rgba(255,255,255,.85);border-radius:100px;filter:blur(6px);opacity:.85;transform:scale('+sc.toFixed(2)+')"></div>'; } }
        el.innerHTML=h; }
      el.style.opacity=1; const t=c.time||0;
      el.querySelectorAll('.sky-cloud').forEach((cl,i)=>{ const x=(((t*(7+i*4))+i*260)%1700)-260; cl.style.left=x.toFixed(0)+'px'; });
      el.querySelectorAll('.sky-star').forEach((st,i)=>{ st.style.opacity=(0.3+0.7*Math.abs(Math.sin(t*1.6+i))).toFixed(2); });
    }},
    scenery: { dur: 9999, apply: (el,p,c) => {
      if(!el._scInit){ el._scInit=1; el.style.position='absolute'; el.style.inset='0'; el.style.overflow='hidden'; el.style.pointerEvents='none';
        const col=el.dataset.color||'var(--accent,#7C5CFF)';
        el.innerHTML='<svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style="width:100%;height:100%">'
          +'<path d="M0,800 C480,720 960,880 1920,780 L1920,1080 L0,1080Z" fill="'+col+'" opacity="0.22"/>'
          +'<path d="M0,890 C520,830 1100,970 1920,880 L1920,1080 L0,1080Z" fill="'+col+'" opacity="0.42"/>'
          +'<path d="M0,975 C600,935 1200,1025 1920,965 L1920,1080 L0,1080Z" fill="'+col+'" opacity="0.78"/></svg>'; }
      el.style.opacity=1;
    }},
  });

  /* =====================================================================
     3D (real WebGL via three.js)
       <div class="anim" data-anim="scene3d" data-scene="myScene"></div>
       window.SB_SCENES = { myScene: function(api){           // api: {THREE,scene,camera,renderer,el,w,h}
         var m = new api.THREE.Mesh(geo, mat); api.scene.add(m);
         return function(t,p){ m.rotation.y = t*0.6; };        // called each frame with the audio clock
       } };
     Needs three.min.js loaded on the page. Headless renders use software GL —
     keep scenes modest (a few meshes, simple lights) and elements < ~900px.
  ===================================================================== */
  function _sb3Default(api){
    var T=api.THREE, s=api.scene, cam=api.camera;
    s.add(new T.AmbientLight(0xffffff,0.55));
    var d=new T.DirectionalLight(0xffffff,0.95); d.position.set(3,4,6); s.add(d);
    var d2=new T.DirectionalLight(0xFF5C8A,0.45); d2.position.set(-5,-2,2); s.add(d2);
    var mesh=new T.Mesh(new T.IcosahedronGeometry(1.6,0), new T.MeshStandardMaterial({color:0x7C5CFF,roughness:0.35,metalness:0.25,flatShading:true}));
    s.add(mesh); cam.position.set(0,0,5);
    return function(t,p){ mesh.rotation.x=t*0.5; mesh.rotation.y=t*0.7; };
  }
  /* Build the WebGL renderer/scene for a scene3d element once three.js is present.
     Returns true when the element is initialised (or failed permanently). */
  function _s3Init(el){
    if(el._s3!==undefined) return true;
    if(typeof window==='undefined' || !window.THREE){ if(!window._sb3warn){ window._sb3warn=1; console.warn('[storyboard] three.js not loaded — include three.min.js for data-anim="scene3d"'); } return false; }
    var w=el.clientWidth||el.offsetWidth||720, h=el.clientHeight||el.offsetHeight||540;
    // Offline (frame-by-frame export): render the internal buffer at full size * supersample for crisp,
    // antialiased output (the GPU has no real-time budget), and preserve the drawing buffer so each
    // page.screenshot() reliably reads the rendered frame. Live preview keeps data-res for perf.
    var _off=(typeof window!=='undefined' && window.SB_OFFLINE);
    var _ss=_off ? (parseFloat(window.SB_SS)||1) : 1;
    var _res=_off ? _ss : (parseFloat(el.dataset.res)||1);   // internal render scale
    try{
      var rw=Math.round(w*_res), rh=Math.round(h*_res);
      var renderer=new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:!!_off, powerPreference:'high-performance'});
      renderer.setPixelRatio(1); renderer.setSize(rw,rh,false);
      renderer.domElement.style.cssText='width:100%;height:100%;display:block';
      renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=parseFloat(el.dataset.exposure)||1.0;
      if(THREE.sRGBEncoding) renderer.outputEncoding=THREE.sRGBEncoding;
      el.appendChild(renderer.domElement);
      var scene=new THREE.Scene();
      var camera=new THREE.PerspectiveCamera(parseFloat(el.dataset.fov)||50, w/h, 0.1, 400); camera.position.set(0,0,5);
      var fn=(window.SB_SCENES && window.SB_SCENES[el.dataset.scene]) || _sb3Default;
      var upd=fn({THREE:THREE, scene:scene, camera:camera, renderer:renderer, el:el, w:w, h:h});
      // Postprocessing: data-bloom="strength,radius,threshold" (cinematic glow, needs three-bloom.js)
      // and data-dof="focusDist,aperture,maxblur" (depth-of-field bokeh, needs three-extras.js).
      var composer=null;
      var _wantBloom=el.dataset.bloom && THREE.EffectComposer && THREE.UnrealBloomPass;
      var _wantDof=el.dataset.dof && THREE.EffectComposer && THREE.BokehPass;
      if(_wantBloom || _wantDof){
        composer=new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene,camera));   // BokehPass blurs this buffer (it doesn't render the scene itself)
        if(_wantBloom){
          var bp=(el.dataset.bloom||'').split(',').map(parseFloat);
          composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(rw,rh), isFinite(bp[0])?bp[0]:0.7, isFinite(bp[1])?bp[1]:0.4, isFinite(bp[2])?bp[2]:0.85));
        }
        if(_wantDof){   // DoF last (BokehPass.needsSwap=false -> must be the final, renderToScreen pass)
          var dp=(el.dataset.dof||'').split(',').map(parseFloat);
          composer.addPass(new THREE.BokehPass(scene,camera,{ focus:isFinite(dp[0])?dp[0]:25, aperture:isFinite(dp[1])?dp[1]:0.0006, maxblur:isFinite(dp[2])?dp[2]:0.01, width:rw, height:rh }));
        }
      }
      el._s3={renderer:renderer, scene:scene, camera:camera, update:(typeof upd==='function')?upd:null, composer:composer};
    }catch(e){ console.warn('[storyboard] scene3d init failed', e); el._s3=null; }
    return true;
  }
  Object.assign(PRESETS, {
    scene3d: { dur: 9999, prestart: false, apply: (el,p,c) => {
      if(!_s3Init(el)) return;
      var s=el._s3; if(!s) return; el.style.opacity=1;
      var _sl=_slideOf(el); if(_sl && c.frame && c.frame.visible && !c.frame.visible.has(_sl)) return;  // don't burn GL on hidden slides
      if(s.update){ try{ s.update(c.time||0, p); }catch(e){} }
      if(s.composer) s.composer.render(); else s.renderer.render(s.scene, s.camera);
    }},
  });

  const LOOPS = {
    float:   (t,amp,per) => `translateY(${f4(Math.sin(t/per*Math.PI*2)*amp)}px)`,
    sway:    (t,amp,per) => `rotate(${f4(Math.sin(t/per*Math.PI*2)*amp)}deg)`,
    breathe: (t,amp,per) => `scale(${f4(1 + Math.sin(t/per*Math.PI*2)*amp/100)})`,
    rotate:  (t,amp,per) => `rotate(${f4((t/per*360)%360)}deg)`,
    orbit:   (t,amp,per) => `translate(${f4(Math.cos(t/per*Math.PI*2)*amp)}px,${f4(Math.sin(t/per*Math.PI*2)*amp)}px)`,
    pulse:   (t,amp,per) => `scale(${f4(1 + (0.5+0.5*Math.sin(t/per*Math.PI*2))*amp/100)})`,
    shimmer: null, // handled specially (background-position)
    beat:    null, // handled specially (audio amplitude)
  };
  /* data-hold: the loop system at whisper amplitude (period 6s by default). */
  const HOLD_AMP = { breathe:2.5, float:4, sway:1.2, pulse:2, orbit:3, rotate:0 };

  /* Classification used by Storyboard.events() (render_video.py places SFX from it).
     A preset can also opt in with {emphasis:true} / {fun:true} on its definition. */
  const EMPHASIS_PRESETS = new Set(['spring','bounce','anticipate','overshoot','letterSpring','popIn','scaleIn',
    'squash','wobble','pinDrop','stickyNote','speechBubble','cardFlip','tiltIn']);
  const FUN_PRESETS = new Set(['confettiBurst','fireworks','partyPopper','rocketLaunch','starPop','badgeUnlock',
    'trophyShine','coinFlip','confettiRain','sparkle','checkDraw','ratingStars','emojiPop','thumbsUp','heartBeat',
    'burstLines','confetti']);

  /* ===========================================================================
     ENGINE STATE
  =========================================================================== */
  const VERSION = '0.8.0';
  const HIT_DUR = 0.6;        // word-hit preset window (s)
  const MORPH_DUR = 0.7;      // shared-element morph window (s), independent of the transition
  const READY_CAP_MS = 15000; // Storyboard.ready() gives up (resolves + warns) after this
  let TIMINGS=[], SLIDE_LABELS=[], WORD_HITS=[], WORDS=[], CAPTIONS=null, FALLBACK_DURATION=null, INITIAL_TIMINGS_HASH='';
  let deck=null, allSlides=[], currentSlide=0, rafId=0;
  let SLIDE_SET=new Set(), SLIDE_NUM=new Map(), SLIDE_BY_NUM=new Map(), CUE_FOR={};
  let CUE_EFF=[], CUE_TR=[];  // per cue: effective slide element, incoming transition {name,dur,fromEl,toEl,pairs}
  let voAudio=null, OFFLINE=false, SCALE_DECK=true, initialized=false;
  const ANIMS=[];      // entrance layers: {el, t, dur, preset, name, ease, slideEl}
  const OVERLAYS=[];   // data-then steps + word hits: {kind:'chain'|'hit', el, t, dur, preset, name, ease, slideEl, hold, sel?}
  const LOOP_ELS=[];
  let EXIT_SCHED=[];
  const CAMERAS=[];
  let analyser=null, audioCtx=null, freqData=null;
  let lastT=0;        // time of the most recently rendered frame
  let pausedT=0;      // clock position while not playing (and the base of the synthetic clock)
  const FRAME_HOOKS=[];
  let _PARKED=new Set();  // off-screen slides already put in their canonical parked state (see _parkSlides)
  let _initResolve=null; const _initP=new Promise(r=>{ _initResolve=r; });
  const _warned=new Set();
  function _warnOnce(key, ...msg){ if(_warned.has(key)) return; _warned.add(key); console.warn('[storyboard]', ...msg); }

  /* ---- slide membership ---------------------------------------------------- */
  let _slideCache=new WeakMap();
  function _slideOf(el){                     // the slide element containing el (or null)
    if(!el) return null;
    if(_slideCache.has(el)) return _slideCache.get(el);
    let n=el; while(n && !SLIDE_SET.has(n)) n=n.parentElement;
    const s=n||null; _slideCache.set(el, s); return s;
  }
  function _slideEl(num){ return SLIDE_BY_NUM.get(num) || allSlides[num-1] || null; }
  function _numOf(slideEl){ return slideEl ? (SLIDE_NUM.get(slideEl)||0) : 0; }
  function _cueOf(el){ const n=_numOf(_slideOf(el)); return CUE_FOR[n]!==undefined ? CUE_FOR[n] : 0; }
  function _activeCue(t){ let i=0; for(let k=0;k<TIMINGS.length;k++){ if(t>=TIMINGS[k].time) i=k; else break; } return i; }

  /* ---- audio level: SB_AUDIO_ENV (deterministic) > live analyser > unknown --- */
  function _envLevelAt(t){
    const env=(typeof window!=='undefined')?window.SB_AUDIO_ENV:null;
    if(!env || !env.values || !env.values.length || !(env.fps>0)) return null;
    const f=t*env.fps; if(!(f>=0)) return 0;
    const i=Math.floor(f); if(i>=env.values.length) return 0;
    const a=+env.values[i]||0, b=(i+1<env.values.length)?(+env.values[i+1]||0):a;
    return clamp01(a+(b-a)*(f-i));
  }
  function _levelAt(t){
    const lv=_envLevelAt(t); if(lv!=null) return lv;
    if(!OFFLINE && analyser && freqData && isPlaying()){ analyser.getByteFrequencyData(freqData); let s=0; for(let i=0;i<24;i++) s+=freqData[i]; return (s/24)/255; }
    return null;
  }

  /* ===========================================================================
     CLOCK — audio clock when the <audio> is usable, synthetic clock otherwise.
     OFFLINE (window.SB_OFFLINE): no clock at all; frames change only via renderAt(t).
  =========================================================================== */
  let synthetic=false, synthReason='', synthPlaying=false, synthStartedAt=0;
  function activateSynthetic(reason){ if(synthetic||OFFLINE) return; synthetic=true; synthReason=reason; showPreviewBadge(reason); }
  function showPreviewBadge(reason){
    if (document.getElementById('sb-preview-badge')) return;
    const b=document.createElement('div'); b.id='sb-preview-badge';
    b.textContent='PREVIEW (no audio)'; b.title=reason||'';
    b.style.cssText='position:fixed;top:12px;left:12px;z-index:9999;font:600 11px/1 ui-monospace,monospace;letter-spacing:.1em;background:rgba(201,79,46,.92);color:#fff;padding:7px 12px;border-radius:6px;';
    document.body.appendChild(b);
  }
  /* Late audio: the synthetic fallback kicked in (slow load / earlier error) but the audio
     is usable now — hand the clock over cleanly instead of staying locked in preview mode. */
  function adoptAudioClock(){
    if(!synthetic || OFFLINE || !voAudio) return;
    const t=getTime(), wasPlaying=synthPlaying;
    synthetic=false; synthPlaying=false; synthReason=''; pausedT=t;
    const b=document.getElementById('sb-preview-badge'); if(b) b.remove();
    _setAudioTime(t);
    if(wasPlaying){ cancelAnimationFrame(rafId); _startAudio(); } else renderFrame(t);
  }
  /* Every engine write to audio.currentTime goes through here, so the 'seeked' listener can
     tell the engine's own seeks (frame already rendered) from a user scrubbing native controls. */
  let _ownSeekAt=-1e9;
  function _setAudioTime(t){ if(OFFLINE || !voAudio) return; _ownSeekAt=performance.now(); try{ voAudio.currentTime=t; }catch(e){} }
  function isPlaying(){ if(OFFLINE) return false; return synthetic ? synthPlaying : !!(voAudio && !voAudio.paused && !voAudio.ended); }
  function getTime(){
    if(OFFLINE || !isPlaying()) return pausedT;
    if(synthetic) return pausedT+(performance.now()-synthStartedAt)/1000;
    return voAudio.currentTime||0;
  }
  function setClock(t){
    pausedT=t;
    if(OFFLINE) return;                                   // offline: never touch the audio element
    if(synthetic){ if(synthPlaying) synthStartedAt=performance.now(); }
    else if(voAudio) _setAudioTime(t);
  }
  function duration(){
    if(voAudio && voAudio.readyState>=1 && isFinite(voAudio.duration) && voAudio.duration>0) return voAudio.duration;
    const sd=parseFloat(typeof window!=='undefined'?window.SB_DURATION:NaN); if(isFinite(sd) && sd>0) return sd;
    if(FALLBACK_DURATION) return FALLBACK_DURATION;
    return (TIMINGS.length?TIMINGS[TIMINGS.length-1].time:0)+5;
  }

  /* ===========================================================================
     TRANSIENT STYLE LAYERS
     Exits, loops/holds, data-then chain steps, word hits, shared-element morphs and
     cursor press feedback write inline styles ON TOP of the entrance pass. Every prop
     they write is recorded; at the start of the next frame it is put back to the
     element's BASE inline value, so a frame never depends on which frames were
     rendered before it. BASE = the author's inline style (snapshotted before the engine
     first touched the element) plus the one-time setup writes of its ENTRANCE preset
     (e.g. the position:relative an annotation needs) — see _primeLayer(); an overlay's
     setup writes are re-applied inside its window instead (OVERLAY RECORDS). The compositor's
     transform / opacity / filter writes (entrance included) are transient the same way.
  =========================================================================== */
  const _ORIG=new WeakMap();                // el -> Map(longhand -> [value, priority])  (BASE; ._sh: var() shorthands)
  let _dirty=new Map();                      // el -> Set(longhand) written by transient layers this frame
  /* var() in a SHORTHAND (border: 3px solid var(--accent)) leaves its longhands "pending":
     they are listed in the style but read back as ''. They can only be restored through the
     shorthand declaration, so BASE keeps those declarations too (m._sh: shorthand -> [v, prio])
     and change tracking compares them declaration by declaration. */
  function _decls(css){                      // cssText -> Map(property -> [value, priority])
    const out=new Map(); let depth=0, q='', start=0;
    const push=seg=>{ const i=seg.indexOf(':'); if(i<0) return; const p=seg.slice(0,i).trim(); if(!p) return;
      let v=seg.slice(i+1).trim(), pr=''; const m=/!\s*important\s*$/i.exec(v); if(m){ v=v.slice(0,m.index).trim(); pr='important'; }
      out.set(p, [v, pr]); };
    for(let i=0;i<css.length;i++){ const c=css[i];
      if(q){ if(c==='\\') i++; else if(c===q) q=''; continue; }
      if(c==='"' || c==="'") q=c; else if(c==='(') depth++; else if(c===')') depth=Math.max(0, depth-1);
      else if(c===';' && !depth){ push(css.slice(start, i)); start=i+1; } }
    push(css.slice(start)); return out;
  }
  const _LH=new Map(); let _lhEl=null;
  function _longhands(p){                    // the longhands a property sets ([p] for a longhand)
    let L=_LH.get(p); if(L) return L;
    L=[p];
    if(p.slice(0,2)!=='--' && typeof document!=='undefined'){
      const s=(_lhEl||(_lhEl=document.createElement('div'))).style; s.cssText='';
      try{ s.setProperty(p, 'inherit'); }catch(e){}
      if(s.length>1){ L=[]; for(let i=0;i<s.length;i++) L.push(s[i]); }
      s.cssText='';
    }
    _LH.set(p, L); return L;
  }
  function _varShorthands(css, into){        // var() shorthand declarations of a cssText -> Map
    if(css.indexOf('var(')<0) return into||null;
    _decls(css).forEach((v,p)=>{ if(v[0].indexOf('var(')>=0 && _longhands(p).length>1) (into||(into=new Map())).set(p, v); });
    return into||null;
  }
  function _snap(el){
    let m=_ORIG.get(el); if(m) return m;
    m=new Map(); const s=el.style;
    if(s){ for(let i=0;i<s.length;i++){ const k=s[i]; m.set(k,[s.getPropertyValue(k), s.getPropertyPriority(k)]); }
           const sh=_varShorthands(s.cssText, null); if(sh) m._sh=sh; }
    _ORIG.set(el,m); return m;
  }
  function _transient(el, fn){
    const s=el.style; if(!s){ fn(); return; }
    _snap(el);
    const css0=s.cssText, before=new Map(); for(let i=0;i<s.length;i++){ const k=s[i]; before.set(k, s.getPropertyValue(k)); }
    try{ fn(); }catch(e){ _warnOnce('transient:'+(e&&e.message), 'layer failed:', e); }
    const css1=s.cssText; if(css1===css0) return;
    let set=_dirty.get(el); const mark=k=>{ if(!set){ set=new Set(); _dirty.set(el,set); } set.add(k); };
    const seen=new Set();
    for(let i=0;i<s.length;i++){ const k=s[i]; seen.add(k); if(!before.has(k) || before.get(k)!==s.getPropertyValue(k)) mark(k); }
    before.forEach((v,k)=>{ if(!seen.has(k)) mark(k); });
    if(css0.indexOf('var(')>=0 || css1.indexOf('var(')>=0){                 // pending longhands read '': compare the shorthands
      const A=_varShorthands(css0, null)||new Map(), B=_varShorthands(css1, null)||new Map();
      A.forEach((v,p)=>{ const w=B.get(p); if(!w || w[0]!==v[0] || w[1]!==v[1]) _longhands(p).forEach(mark); });
      B.forEach((v,p)=>{ if(!A.has(p)) _longhands(p).forEach(mark); });
    }
  }
  function _restoreTransient(){
    const prev=_dirty; _dirty=new Map();
    prev.forEach((props, el)=>{
      const m=_snap(el), s=el.style; let pend=null;
      props.forEach(k=>{ const o=m.get(k);
        if(o && (o[0]!=='' || !m._sh)){ if(s.getPropertyValue(k)!==o[0] || s.getPropertyPriority(k)!==o[1]) s.setProperty(k, o[0], o[1]); }
        else if(o) (pend||(pend=new Set())).add(k);                    // BASE value comes from a var() shorthand
        else s.removeProperty(k); });
      if(pend) m._sh.forEach((v,p)=>{ if(_longhands(p).some(k=>pend.has(k))) s.setProperty(p, v[0], v[1]); });
    });
  }
  function _setS(el, prop, v){ if(el.style[prop]!==v) el.style[prop]=v; }

  /* ===========================================================================
     COMPOSITOR — motion layers STACK instead of overwriting each other.
     Everything that animates an element runs as a LAYER: entrance (data-anim) ->
     data-then steps -> data-hold -> data-loop -> word hits -> data-exit -> camera /
     parallax plane. What a layer writes to the three composable channels
     (transform, opacity, filter) is captured and taken back out of the style, so
     every layer starts from the element's own channel values and never sees or
     clobbers another layer's output. After all layers ran, _commitLayers() writes the
     stacked result once per element:
       transform  each later layer WRAPS the earlier ones (outer = leftmost CSS
                  function): a float on a rotated sticky note bobs in screen space, an
                  exit slides a rotated gauge needle straight out, a word hit pulses
                  whatever the element settled on, parallax wraps it all.
       opacity    product of all layers (entrance 0.8 x exit 0.5 = 0.4).
       filter     concatenated, inner layers first (entrance blur(0px) + exit blur(9px)).
     The entrance's value REPLACES the author's inline value (as it always did); when
     the entrance doesn't write a channel, the author's inline value is the innermost
     term. A channel written by a single layer is written verbatim. Every other
     property is last-writer-wins in the same layer order. Composite writes are
     transient (put back to BASE at the start of the next frame), so a frame is still a
     pure function of t. Before an element's entrance starts only the entrance's p=0
     state is shown — steps / hold / loop / hits / exits on it are skipped.
  =========================================================================== */
  const L_ENTRANCE=0, L_THEN=1, L_HOLD=2, L_LOOP=3, L_HIT=4, L_EXIT=5, L_CAMERA=6;
  const LAYER_ORDER=Object.freeze(['entrance','then','hold','loop','hit','exit','camera']);
  let _COMP=new Map();                   // el -> { base:[tf,op,fl], tf:[kind,v,...], op:[...], fl:[...] }  (this frame)
  let _ENT_AT=new Map();                 // el -> start time of its entrance
  function _preEntrance(el, t){ const s=_ENT_AT.get(el); return s!==undefined && t<s; }
  /* Run one layer's writes (fn) on el and move its transform / opacity / filter writes
     into el's composite stack for this frame; the style is put back to what it was. */
  function _layer(el, kind, fn){
    const s=el && el.style; if(!s){ fn(); return; }
    _snap(el);                                   // BASE known before the first composite write
    const t0=s.getPropertyValue('transform'), o0=s.getPropertyValue('opacity'), f0=s.getPropertyValue('filter');
    const tp=s.getPropertyPriority('transform'), op=s.getPropertyPriority('opacity'), fp=s.getPropertyPriority('filter');
    let err=null;
    try{ fn(); }catch(e){ err=e; }
    const t1=s.getPropertyValue('transform'), o1=s.getPropertyValue('opacity'), f1=s.getPropertyValue('filter');
    if(t1!==t0 || o1!==o0 || f1!==f0){
      let c=_COMP.get(el);
      if(!c){ c={ base:[t0,o0,f0], tf:[], op:[], fl:[] }; _COMP.set(el,c); }
      if(t1!==t0){ c.tf.push(kind, t1); s.setProperty('transform', t0, tp); }
      if(o1!==o0){ c.op.push(kind, o1); s.setProperty('opacity', o0, op); }
      if(f1!==f0){ c.fl.push(kind, f1); s.setProperty('filter', f0, fp); }
    }
    if(err) throw err;
  }
  const _noFn=v=>!v || v==='none';
  /* L = [kind, value, ...] innermost first. join(inner, next) builds the CSS list. */
  function _stackFns(base, L, join){
    let i=0, inner=base;
    if(L[0]===L_ENTRANCE){ if(L.length===2) return L[1]; inner=L[1]; i=2; }
    else if(L.length===2 && _noFn(base)) return L[1];
    let out=_noFn(inner) ? '' : inner;
    for(; i<L.length; i+=2){ const v=L[i+1]; if(!_noFn(v)) out=out ? join(out, v) : v; }
    return out || 'none';
  }
  const _tfJoin=(inner, outer)=>outer+' '+inner;          // CSS applies the rightmost function first
  const _flJoin=(inner, outer)=>inner+' '+outer;          // filters apply left to right
  function _opNum(v){ if(v===null || v===undefined || v==='') return null; const n=parseFloat(v); if(!isFinite(n)) return null; return /%\s*$/.test(v) ? n/100 : n; }
  function _mulOp(base, L){
    let i=0, v;
    if(L[0]===L_ENTRANCE){ if(L.length===2) return L[1]; v=_opNum(L[1]); i=2; }
    else { v=_opNum(base); if(v===null && L.length===2) return L[1]; }
    for(; i<L.length; i+=2){ const n=_opNum(L[i+1]); if(n!==null) v=(v===null ? 1 : v)*n; }
    return v===null ? '' : String(f4(clamp01(v)));
  }
  function _commitLayers(){
    if(!_COMP.size) return;
    _COMP.forEach((c, el)=>{
      const s=el.style; let set=_dirty.get(el); if(!set){ set=new Set(); _dirty.set(el,set); }
      const put=(k, v)=>{ if(s.getPropertyValue(k)!==v || s.getPropertyPriority(k)) s.setProperty(k, v); set.add(k); };
      if(c.tf.length) put('transform', _stackFns(c.base[0], c.tf, _tfJoin));
      if(c.op.length) put('opacity', _mulOp(c.base[1], c.op));
      if(c.fl.length) put('filter', _stackFns(c.base[2], c.fl, _flJoin));
    });
    _COMP=new Map();
  }

  /* ===========================================================================
     SCHEDULING — parse .anim and .anim-group into a flat ANIMS list.
     Supports data-stagger (container), data-then (chained), data-loop (ambient),
     data-hold (whisper loop), data-exit (leave).
  =========================================================================== */
  let _toPrime=[];
  function _hasPreset(n){ return !!n && Object.prototype.hasOwnProperty.call(PRESETS, n) && PRESETS[n] && typeof PRESETS[n].apply==='function'; }
  function parseChain(spec, baseStart, baseDur) {
    // "pulse@1.5; float" => [{preset, t, dur}] relative to end of entrance
    const out=[]; let cursor = baseStart + baseDur;
    spec.split(';').map(s=>s.trim()).filter(Boolean).forEach(part=>{
      let name=part, delay=0;
      const at=part.split('@');
      if (at.length===2){ name=at[0].trim(); delay=parseFloat(at[1]); }
      if(!_hasPreset(name)) return; const preset=PRESETS[name];
      const start = (at.length===2) ? baseStart + delay : cursor;
      out.push({ presetName:name, preset, t:start, dur:preset.dur });
      cursor = start + preset.dur;
    });
    return out;
  }

  function scheduleEl(el, cueTime) {
    let t;
    if (el.dataset.t !== undefined) t = parseFloat(el.dataset.t);
    else if (el.dataset.tRel !== undefined) t = cueTime + parseFloat(el.dataset.tRel);
    else t = cueTime;
    if (!isFinite(t)) t = cueTime;
    const presetName = _hasPreset(el.dataset.anim) ? el.dataset.anim : (el.dataset.anim ? (_warnOnce('preset:'+el.dataset.anim, 'unknown data-anim="'+el.dataset.anim+'" — using fadeIn'), 'fadeIn') : 'fadeIn');
    const preset = PRESETS[presetName];
    let dur = el.dataset.dur !== undefined ? parseFloat(el.dataset.dur) : preset.dur;
    if (!isFinite(dur) || dur < 0) dur = preset.dur;
    const ease = resolveEase(el), slideEl = _slideOf(el);
    _snap(el);
    const layer={ el, t, dur, preset, name:presetName, ease, slideEl };
    ANIMS.push(layer); _toPrime.push(layer);
    // Chained sequence: overlay layers on top of the entrance (see _applyOverlays)
    if (el.dataset.then) {
      parseChain(el.dataset.then, t, dur).forEach(step=>{
        const o={ kind:'chain', el, t:step.t, dur:step.dur, preset:step.preset, name:step.presetName, ease:null, slideEl, hold:!step.preset.impulse };
        OVERLAYS.push(o); _toPrime.push(o);
      });
    }
    // Continuous loop registered to start after entrance settles
    if (el.dataset.loop) {
      LOOP_ELS.push({ el, slideEl, type:el.dataset.loop, amp:parseFloat(el.dataset.loopAmp||'10'), per:parseFloat(el.dataset.loopPeriod||'3')||3, startAt:t+dur });
    }
    // Moving hold: whisper-amplitude loop after the entrance settles
    if (el.dataset.hold && typeof LOOPS[el.dataset.hold]==='function') {
      const ty=el.dataset.hold, amp=el.dataset.holdAmp!==undefined?parseFloat(el.dataset.holdAmp):(HOLD_AMP[ty]!==undefined?HOLD_AMP[ty]:2);
      LOOP_ELS.push({ el, slideEl, type:ty, amp:isFinite(amp)?amp:2, per:parseFloat(el.dataset.holdPeriod||'6')||6, startAt:t+dur, hold:true });
    }
    // Exit animation (data-exit + data-exit-at | data-exit-t). Independent of loop.
    if(el.dataset.exit && EXITS[el.dataset.exit]){
      let xt; if(el.dataset.exitT!==undefined) xt=parseFloat(el.dataset.exitT); else if(el.dataset.exitAt!==undefined) xt=cueTime+parseFloat(el.dataset.exitAt); else xt=t+dur+2;
      if(isFinite(xt)) EXIT_SCHED.push({el, slideEl, name:el.dataset.exit, t:xt, dur:el.dataset.exitDur!==undefined?(parseFloat(el.dataset.exitDur)||0):0.7, fx:EXITS[el.dataset.exit], ease:resolveEase(el)});
    }
  }

  function resolveSchedule() {
    _unmountAll();                           // author content in place before querying / priming
    _PARKED=new Set();                       // every off-screen slide is parked again under the new schedule
    ANIMS.length=0; OVERLAYS.length=0; LOOP_ELS.length=0; EXIT_SCHED.length=0; _toPrime=[];
    const seen=new Set();
    // Containers with data-stagger distribute start times to children
    document.querySelectorAll('.anim-group[data-stagger]').forEach(group=>{
      const cue=_cueOf(group);
      const stagger=parseFloat(group.dataset.stagger||'0.1');
      const baseRel=group.dataset.tRel!==undefined?parseFloat(group.dataset.tRel):0;
      const presetName=group.dataset.anim||'fadeUp';
      const dur=group.dataset.dur!==undefined?parseFloat(group.dataset.dur):(PRESETS[presetName]?.dur||1.0);
      [...group.children].forEach((child,i)=>{
        child.classList.add('anim');
        if(!child.dataset.anim) child.dataset.anim=presetName;
        child.dataset.tRel=(baseRel + i*stagger).toFixed(3);
        if(child.dataset.dur===undefined) child.dataset.dur=dur;
        if(group.dataset.ease && !child.dataset.ease) child.dataset.ease=group.dataset.ease;
        scheduleEl(child, cue); seen.add(child);
      });
    });
    // Standalone .anim elements (skip those already handled inside a stagger group)
    document.querySelectorAll('.anim').forEach(el=>{
      if (el.closest('.anim-group[data-stagger]') && el.parentElement.classList.contains('anim-group')) return;
      if (seen.has(el)) return;
      scheduleEl(el, _cueOf(el)); seen.add(el);
    });
    _prime(_toPrime); _toPrime=[];           // entrances + their chain steps, document order (they may split text / build DOM)
    const hits=_scheduleHits();              // resolved after that, against the final DOM
    _prime(hits);
    _ENT_AT=new Map();                       // compositor: before its entrance an element shows only the entrance's p=0 state
    for(const a of ANIMS){ const s=_ENT_AT.get(a.el); if(s===undefined || a.t<s) _ENT_AT.set(a.el, a.t); }
    // Overlay layers apply in time order (a later step / hit composes over an earlier one).
    OVERLAYS.forEach((o,i)=>{ o._i=i; });
    OVERLAYS.sort((a,b)=>(a.t-b.t)||(a._i-b._i));
    _buildHosts();
  }

  /* WORD HITS — {time, sel, hit[, dur]}: the hit preset runs over [time, time+dur] (0.6s)
     and then holds its end state (impulse presets such as pulse/shake settle back). */
  function _hitEl(h){
    if(h._el && h._el.isConnected) return h._el;
    let el=null; try{ el=document.querySelector(h.sel); }catch(e){ _warnOnce('hitsel:'+h.sel, 'invalid WORD_HITS selector', h.sel); }
    h._el=el; return el;
  }
  function _scheduleHits(){
    const out=[];
    WORD_HITS.forEach(h=>{
      const el=_hitEl(h);
      if(!el){ _warnOnce('hitmiss:'+h.sel, 'WORD_HITS selector matches nothing:', h.sel); return; }
      const name=_hasPreset(h.hit)?h.hit:'pulse', preset=PRESETS[name], d=parseFloat(h.dur);
      _snap(el);
      out.push({ kind:'hit', el, t:h.time, dur:(d>0)?d:HIT_DUR, preset, name, ease:null, slideEl:_slideOf(el), hold:!preset.impulse, sel:h.sel });
    });
    OVERLAYS.push(...out);
    return out;
  }

  /* Run every preset's one-time setup (DOM splitting, wrappers, players) NOW, in document
     order, instead of on whichever frame happens to reach it first — so the page layout
     never depends on render history. Entrances keep what their setup built (they are hidden
     until they start). Overlays (data-then steps, word hits) must look "as if never applied"
     until their window: what their setup built is recorded and taken back out again — see
     OVERLAY RECORDS. */
  function _prime(layers){
    for(const a of layers){
      const ctx={ ease:a.ease, time:a.t, start:a.t, dur:a.dur, level:null, frame:_primeFrame(a.t) };
      if(a.kind){ _primeOverlay(a, ctx); continue; }
      const el=a.el, k0=el.childNodes ? [...el.childNodes] : [];
      try{ _primeLayer(el, a.preset, ctx, true); }
      catch(e){ _warnOnce('prime:'+a.name, 'preset "'+a.name+'" failed to initialise:', e); }
      if(el.childNodes && !_sameKids(k0, el.childNodes)) el._sbEntDom=true;   // the entrance rewrites the element's children
      a.domTouch=el._sbEntDom===true;
    }
  }
  /* Setup vs progress: apply(el,0) runs the one-time setup AND writes progress styles. The
     host's inline style is put back and apply(el,0) runs again (setup is guarded, so this
     time only progress styles are written). Props the first call wrote that the second did
     NOT re-write are setup (e.g. position:relative for an annotation). intoBase: they become
     part of the element's BASE style (entrances); otherwise they are only returned (overlays
     re-apply them inside their window). Everything else is progress, owned by the layer. */
  function _styleMap(s){ const m=new Map(); for(let i=0;i<s.length;i++){ const k=s[i]; m.set(k,[s.getPropertyValue(k), s.getPropertyPriority(k)]); } return m; }
  function _setStyleMap(s, m){
    for(let i=s.length-1;i>=0;i--){ const k=s[i]; if(!m.has(k)) s.removeProperty(k); }
    m.forEach((v,k)=>{ if(s.getPropertyValue(k)!==v[0] || s.getPropertyPriority(k)!==v[1]) s.setProperty(k, v[0], v[1]); });
  }
  function _primeLayer(el, preset, ctx, intoBase){
    const setup=new Map();
    const s=el.style; if(!s){ preset.apply(el, 0, ctx); return setup; }
    const base=_snap(el), before=_styleMap(s);
    const same=(a,b)=>!!a && !!b && a[0]===b[0] && a[1]===b[1];
    preset.apply(el, 0, ctx);
    const first=_styleMap(s);
    _setStyleMap(s, before);
    preset.apply(el, 0, ctx);
    const second=_styleMap(s);
    _setStyleMap(s, before);
    first.forEach((v,k)=>{
      if(same(v, before.get(k))) return;                                  // untouched
      const b=before.get(k), g=second.get(k);
      if(b ? !same(g, b) : !!g) return;                                   // re-written every call: progress
      setup.set(k, v);                                                    // one-time setup
      if(intoBase){ s.setProperty(k, v[0], v[1]); base.set(k, v); }
    });
    return setup;
  }
  function _primeFrame(t){ return { t, slide:0, visible:new Set(), active:new Set(), post:[], cursorOn:false, ripplesOn:new Set(), pressed:new Map(), level:null, prime:true }; }

  /* ===========================================================================
     OVERLAY RECORDS — what a data-then step / word hit's one-time setup did to its host,
     recorded per (element, preset) at prime time and then taken back out, so the host
     shows its own content until the step / hit starts:
       setup    host style props of the setup (position:relative, display:inline-flex...):
                re-applied (transient) on every frame inside the window.
       classes  classes the setup added (sb-speech...): present only inside the window.
       mode     what the setup did to the host's children —
                'replace'  rebuilt them (innerHTML / textContent: sparkle, confettiBurst,
                           typewriter, counter, wordReveal...): `built` swaps in for the
                           author's children inside the window, the author's come back outside;
                'append'   added nodes after them (annotation <svg>, shimmer band, badge
                           ring): `own` is attached inside the window only;
                null       left them alone. (A setup that re-parents the author's children
                           into a wrapper — device — keeps its build, as before.)
     One DOM slot per host: of the host's replace/append overlays that are inside their
     window, the latest-starting one is mounted; the others are skipped. Off-screen hosts
     and hosts before their entrance have nothing mounted. Mounting follows t every frame
     (the MOUNT pass), so it is as pure in t as everything else. Presets that can only build
     later (a character whose data-char-src is still loading, lottie by data-src, three.js)
     are recorded when their build happens.
  =========================================================================== */
  const _LATE_BUILD=new Set(['character','lottie','scene3d']);
  let _HOSTS=[];                 // [{el, slideEl, ovs:[overlay, ...] latest first, recs:Set(record)}]
  function _sameKids(a, b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }
  function _setKids(el, nodes){
    if(el.replaceChildren) el.replaceChildren(...nodes);
    else { while(el.firstChild) el.removeChild(el.firstChild); for(const n of nodes) el.appendChild(n); }
  }
  function _classes(el){ const c=el.getAttribute && el.getAttribute('class'); return c ? c.split(/\s+/).filter(Boolean) : []; }
  function _hostOf(el){ return el._sbHost || (el._sbHost={ mounted:null, stash:null }); }
  function _primeOverlay(o, ctx){
    const el=o.el, recs=el._sbOv || (el._sbOv={});
    let R=recs[o.name];
    if(!R){                                       // first prime of this (element, preset): later re-primes reuse it
      R=recs[o.name]={ name:o.name, setup:new Map(), classes:[], mode:null, own:null, built:null, home0:null,
                       on:false, reparent:false, late:_LATE_BUILD.has(o.name) };
      const k0=el.childNodes ? [...el.childNodes] : [], c0=_classes(el);
      try{ R.setup=_primeLayer(el, o.preset, ctx, false); }
      catch(e){ _warnOnce('prime:'+o.name, 'preset "'+o.name+'" failed to initialise:', e); }
      _captureBuild(R, el, k0, c0);
      if(!R.mode && o.preset.neutral && el.style){   // children it styles in place: back to "as if never applied"
        const host=_styleMap(el.style);
        try{ o.preset.neutral(el, ctx); }catch(e){}
        _setStyleMap(el.style, host);
      }
    }
    o.rec=R;
  }
  /* Compare the host with its state before the setup (children k0, classes c0), record the
     difference in R and undo it (the host shows its own content again). */
  function _captureBuild(R, el, k0, c0){
    if(!el.childNodes) return;
    const kids=[...el.childNodes];
    R.home0=k0;
    if(!_sameKids(kids, k0)){
      if(k0.some(n=>n.parentNode!==el && el.contains(n))){ R.reparent=true; return; }   // re-parented: keep the build
      if(k0.length && k0.every((n,i)=>kids[i]===n)){ R.mode='append'; R.own=kids.slice(k0.length); R.own.forEach(n=>el.removeChild(n)); }
      else { R.mode='replace'; R.built=kids; _setKids(el, k0); }
    }
    if(c0){ const added=_classes(el).filter(c=>c0.indexOf(c)<0); if(added.length){ R.classes=R.classes.concat(added); added.forEach(c=>el.classList.remove(c)); } }
  }
  /* A late builder (see _LATE_BUILD) built while its overlay is on screen: record the build
     and leave it mounted. */
  function _lateMounted(R, el){
    const H=_hostOf(el); if(H.mounted || R.mode || R.reparent || !R.home0 || el._sbEntDom) return;
    const kids=[...el.childNodes], k0=R.home0; if(_sameKids(kids, k0)) return;
    if(k0.some(n=>n.parentNode!==el && el.contains(n))){ R.reparent=true; return; }
    if(k0.length && k0.every((n,i)=>kids[i]===n)){ R.mode='append'; R.own=kids.slice(k0.length); }
    else { R.mode='replace'; R.built=kids; H.stash=k0.slice(); }
    H.mounted=R;
  }
  /* Put record R's build on el (null: the author's children). */
  function _mount(el, R){
    const H=_hostOf(el); if(H.mounted===R) return;
    const M=H.mounted;
    if(M){
      if(M.mode==='append'){ for(const n of M.own) if(n.parentNode===el) el.removeChild(n); }
      else { M.built=[...el.childNodes]; _setKids(el, H.stash||[]); H.stash=null; }
      H.mounted=null;
    }
    if(R){
      if(R.mode==='append'){ for(const n of R.own) el.appendChild(n); }
      else { H.stash=[...el.childNodes]; _setKids(el, R.built||[]); }
      H.mounted=R;
    }
  }
  function _setOn(el, R, on){
    if(R.on===on) return; R.on=on;
    for(const c of R.classes){ if(on) el.classList.add(c); else el.classList.remove(c); }
  }
  function _buildHosts(){
    const m=new Map();
    for(const o of OVERLAYS){
      const R=o.rec; if(!R || !(R.mode || R.classes.length || (R.late && !R.reparent))) continue;
      let h=m.get(o.el); if(!h){ h={ el:o.el, slideEl:o.slideEl, ovs:[], recs:new Set() }; m.set(o.el, h); }
      h.ovs.push(o); h.recs.add(R);
    }
    m.forEach(h=>h.ovs.sort((a,b)=>(b.t-a.t)||(b._i-a._i)));
    _HOSTS=[...m.values()];
  }
  /* MOUNT pass (every frame, before the entrances): per host, mount the latest replace/append
     overlay that is inside its window and switch record classes on/off. */
  function _mountPass(t, frame){
    for(const h of _HOSTS){
      const el=h.el, live=(!h.slideEl || frame.active.has(h.slideEl)) && !_preEntrance(el, t);
      let dom=null; const on=new Set();
      if(live) for(const o of h.ovs){
        if(_overlayP(o, t)<0) continue;
        const R=o.rec; if(R.mode){ if(!dom){ dom=R; on.add(R); } } else on.add(R);
      }
      if(!dom && !_hostOf(el).mounted && !el._sbEntDom)                 // a late builder that built outside its window
        for(const R of h.recs) if(R.late && !R.mode && !R.reparent && R.home0 && !_sameKids(el.childNodes, R.home0)) _captureBuild(R, el, R.home0, null);
      _mount(el, dom);
      for(const R of h.recs) _setOn(el, R, on.has(R));
    }
  }
  /* Everything back to the author's children (before re-scheduling, events(), ready()). */
  function _unmountAll(){ for(const h of _HOSTS){ _mount(h.el, null); for(const R of h.recs) _setOn(h.el, R, false); } }
  /* Run fn with the author's children in place of el's mounted build (a DOM-writing entrance). */
  function _withHome(el, fn){
    const H=el._sbHost, R=H && H.mounted; if(!R) return fn();
    _mount(el, null); try{ return fn(); } finally{ _mount(el, R); }
  }
  /* Run fn with every host showing its author content, then restore the mounts. */
  function _withAllHome(fn){
    const saved=_HOSTS.map(h=>[h.el, _hostOf(h.el).mounted]);
    for(const [el] of saved) _mount(el, null);
    try{ return fn(); } finally{ for(const [el, R] of saved) if(R) _mount(el, R); }
  }

  /* ===========================================================================
     SCENE TRANSITIONS — keyframe functions of progress p in [0,1].
     Each entry: { dur (s), render(p, out, inn, ov) }. `out`/`inn` collect style
     overrides for the outgoing/incoming slide ({opacity, transform, filter, clipPath,
     zIndex}), `ov` the full-frame overlay ({opacity, background}). Pure: no DOM
     access, no timers. They run inside [cue, cue+dur]; outside that window every
     transition style is cleared, so the same t always renders the same frame.
  =========================================================================== */
  let transitionOverlay=null;
  function ensureTransitionOverlay(){
    transitionOverlay=document.getElementById('transitionOverlay');
    if(!transitionOverlay){
      transitionOverlay=document.createElement('div'); transitionOverlay.id='transitionOverlay'; transitionOverlay.className='transition-overlay';
      transitionOverlay.style.cssText='position:fixed;inset:0;z-index:9000;pointer-events:none;opacity:0';
      document.body.appendChild(transitionOverlay);
    }
  }
  /* --- Presentation mode: slides stacked in place, transitioned (not scrolled) --- */
  function setupPresentationMode(){
    if(deck && deck!==document.body && deck!==document.documentElement){
      deck.style.overflow='hidden';
      deck.style.scrollSnapType='none';
      deck.style.perspective='2000px';      // enables 3D flip transitions
      if(getComputedStyle(deck).position==='static') deck.style.position='relative';
      // scaleDeck: the engine scales the deck to the viewport, so it must keep its authored
      // size — a flex item (template .stage) would otherwise shrink below it and clip the slides.
      if(SCALE_DECK && deck.parentElement && /flex/.test(getComputedStyle(deck.parentElement).display||'')) deck.style.flexShrink='0';
    }
    allSlides.forEach(s=>{
      s.style.position='absolute'; s.style.top='0'; s.style.left='0';
      s.style.willChange=OFFLINE ? 'auto' : 'transform,opacity,filter';
      s.style.backfaceVisibility='hidden';
    });
    // Offline export: will-change layers keep their raster scale/translation from earlier
    // frames (e.g. text rastered mid-zoom stays downsampled after jumping back), which would
    // make a frame depend on render order. Disable the hints so every frame re-rasters.
    if(OFFLINE && !document.getElementById('sb-offline-css')){
      const st=document.createElement('style'); st.id='sb-offline-css';
      st.textContent='*,*::before,*::after{will-change:auto!important}';
      document.head.appendChild(st);
    }
  }
  const EZ=cubicBezier(0.7,0,0.2,1), EZ_SOFT=cubicBezier(0.22,1,0.36,1), EZ_FLIP=cubicBezier(0.6,0,0.4,1), EZ_IO=cubicBezier(0.42,0,0.58,1);
  const STEPS6=p=>p>=1?1:Math.floor(p*6)/6;      // CSS steps(6)
  function _ovFlash(ov, color, p){ ov.background=color; ov.opacity=kf([[0,0],[0.4,0.9],[1,0]], EZ_IO(p)); }
  const TRANSITIONS = {
    cut:           { dur:0,    render(){} },
    crossDissolve: { dur:0.7,  render(p,o,i){ const e=EZ_SOFT(p); o.opacity=1-e; i.opacity=e; } },
    fade:          { dur:0.9,  render(p,o,i,ov){ _ovFlash(ov,'#000',p); o.opacity=1-seg(p,0,0.5); i.opacity=seg(p,0.5,1); } },   // through black
    pushLeft:      { dur:0.75, render(p,o,i){ const e=EZ(p); o.transform='translateX('+f4(-100*e)+'%)'; i.transform='translateX('+f4(100*(1-e))+'%)'; } },
    pushRight:     { dur:0.75, render(p,o,i){ const e=EZ(p); o.transform='translateX('+f4(100*e)+'%)'; i.transform='translateX('+f4(-100*(1-e))+'%)'; } },
    pushUp:        { dur:0.75, render(p,o,i){ const e=EZ(p); o.transform='translateY('+f4(-100*e)+'%)'; i.transform='translateY('+f4(100*(1-e))+'%)'; } },
    pushDown:      { dur:0.75, render(p,o,i){ const e=EZ(p); o.transform='translateY('+f4(100*e)+'%)'; i.transform='translateY('+f4(-100*(1-e))+'%)'; } },
    coverLeft:     { dur:0.7,  render(p,o,i){ i.transform='translateX('+f4(100*(1-EZ(p)))+'%)'; } },
    revealRight:   { dur:0.7,  render(p,o,i){ o.zIndex=3; i.zIndex=2; o.transform='translateX('+f4(100*EZ(p))+'%)'; } },
    zoomIn:        { dur:0.8,  render(p,o,i){ const e=EZ_SOFT(p); o.transform='scale('+f4(1+0.18*e)+')'; o.opacity=1-e; i.transform='scale('+f4(0.6+0.4*e)+')'; i.opacity=e; } },
    zoomOut:       { dur:0.8,  render(p,o,i){ const e=EZ_SOFT(p); o.transform='scale('+f4(1-0.18*e)+')'; o.opacity=1-e; i.transform='scale('+f4(1.3-0.3*e)+')'; i.opacity=e; } },
    flip3D:        { dur:0.9,  render(p,o,i){ const e=EZ_FLIP(p);
                       o.transform='rotateY('+f4(kf([[0,0],[0.5,-90],[1,-90]],e))+'deg)'; o.opacity=kf([[0,1],[0.5,0],[1,0]],e);
                       i.transform='rotateY('+f4(kf([[0,90],[0.5,90],[1,0]],e))+'deg)';  i.opacity=kf([[0,0],[0.5,0],[1,1]],e); } },
    spinZoom:      { dur:0.85, render(p,o,i){ const e=EZ_SOFT(p);
                       o.transform='scale('+f4(1+0.2*e)+') rotate('+f4(8*e)+'deg)'; o.opacity=1-e;
                       i.transform='scale('+f4(0.7+0.3*e)+') rotate('+f4(-12*(1-e))+'deg)'; i.opacity=e; } },
    whipPan:       { dur:0.48, render(p,o,i){ const e=EZ(p);
                       o.transform='translateX('+f4(-60*e)+'%)'; o.filter='blur('+f4(20*e)+'px)'; o.opacity=1-e;
                       i.transform='translateX('+f4(60*(1-e))+'%)'; i.filter='blur('+f4(20*(1-e))+'px)'; i.opacity=e; } },
    blurThrough:   { dur:0.8,  render(p,o,i){ const e=EZ_SOFT(p); o.filter='blur('+f4(28*e)+'px)'; o.opacity=1-e; i.filter='blur('+f4(28*(1-e))+'px)'; i.opacity=e; } },
    irisOpen:      { dur:0.85, render(p,o,i){ i.clipPath='circle('+f4(75*EZ_SOFT(p))+'% at 50% 50%)'; } },
    barWipe:       { dur:0.7,  render(p,o,i){ i.clipPath='inset(0 '+f4(100*(1-EZ(p)))+'% 0 0)'; } },
    barWipeUp:     { dur:0.7,  render(p,o,i){ i.clipPath='inset('+f4(100*(1-EZ(p)))+'% 0 0 0)'; } },
    glitch:        { dur:0.52, render(p,o,i,ov){ _ovFlash(ov,'rgba(124,92,255,.5)',p); const e=STEPS6(p);
                       o.transform='translate('+f4(kf([[0,0],[0.2,-12],[0.5,10],[1,0]],e))+'px,'+f4(kf([[0,0],[0.2,4],[0.5,-6],[1,0]],e))+'px)'; o.opacity=kf([[0,1],[0.2,0.6],[0.5,0.4],[1,0]],e);
                       i.transform='translate('+f4(kf([[0,14],[0.5,-8],[1,0]],e))+'px,'+f4(kf([[0,-4],[0.5,6],[1,0]],e))+'px)'; i.opacity=kf([[0,0],[0.5,0.7],[1,1]],e); } },
    // overlay-flourish swaps (slide swap under a colored flash)
    flash:         { dur:0.42, render(p,o,i,ov){ _ovFlash(ov,'#fff',p); o.opacity=1-seg(p,0,0.4); i.opacity=seg(p,0,0.5); } },
    blocks:        { dur:0.62, render(p,o,i,ov){ _ovFlash(ov,'var(--accent,#7C5CFF)',p); o.opacity=1-seg(p,0,0.5); i.opacity=seg(p,0.5,1); } },
  };
  // back-compat aliases
  const TRANSITION_ALIASES = { dissolve:'crossDissolve', wipe:'barWipe' };
  TRANSITIONS.dissolve = TRANSITIONS.crossDissolve;
  TRANSITIONS.wipe = TRANSITIONS.barWipe;
  const DEFAULT_TRANSITION = 'crossDissolve';     // used when a slide has no data-transition-in
  function _canonTransition(name){
    if(!name) name=DEFAULT_TRANSITION;
    if(!TRANSITIONS[name]){ _warnOnce('tr:'+name, 'unknown data-transition-in="'+name+'" — using cut'); return 'cut'; }
    return TRANSITION_ALIASES[name]||name;
  }

  /* Per cue: which slide is on screen (a cue naming a missing slide keeps the previous one),
     the incoming transition and the shared-element pairs to morph. */
  function _resolveTransitions(){
    CUE_EFF=[]; CUE_TR=[];
    TIMINGS.forEach((c,i)=>{
      const toEl=_slideEl(c.slide), prev=i>0?CUE_EFF[i-1]:null;
      CUE_EFF[i]=toEl||prev||allSlides[0]||null;
      if(!toEl){ CUE_TR[i]=null; _warnOnce('cue:'+c.slide, 'TIMINGS cue for slide '+c.slide+' @'+c.time+'s has no matching slide in the deck'); return; }
      let name='cut', dur=0; const fromEl=(prev && prev!==toEl)?prev:null;
      if(fromEl){
        name=_canonTransition(toEl.dataset.transitionIn);
        dur=TRANSITIONS[name].dur||0;
        if(toEl.dataset.transitionDur!==undefined){ const d=parseFloat(toEl.dataset.transitionDur); if(isFinite(d)&&d>=0) dur=d; }
      }
      const pairs=[];
      if(fromEl) toEl.querySelectorAll('[data-shared-id]').forEach(el=>{
        const id=el.dataset.sharedId; let from=null;
        try{ from=fromEl.querySelector('[data-shared-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]'); }catch(e){}
        if(from){ _snap(el); pairs.push({ from, to:el, fromSlide:fromEl, toSlide:toEl }); }
      });
      CUE_TR[i]={ name, dur, fromEl, toEl, pairs };
    });
  }

  /* Layout box of el in its slide's untransformed coordinates (offset chain, so transitions,
     cameras and morph transforms never feed back into the measurement). */
  function _layoutBox(el, slide){
    if(typeof HTMLElement!=='undefined' && el instanceof HTMLElement){
      let x=0, y=0, n=el;
      while(n && n!==slide){ x+=n.offsetLeft||0; y+=n.offsetTop||0; n=n.offsetParent; }
      return { x, y, w:el.offsetWidth, h:el.offsetHeight };
    }
    try{ // SVG etc.: client rects relative to the slide, divided by the slide's rendered scale
      const r=el.getBoundingClientRect(), sr=slide.getBoundingClientRect(), k=(slide.offsetWidth&&sr.width)?sr.width/slide.offsetWidth:1;
      return { x:(r.left-sr.left)/k, y:(r.top-sr.top)/k, w:r.width/k, h:r.height/k };
    }catch(e){ return null; }
  }

  /* ===========================================================================
     CAMERA RIG — a .camera wrapper per slide, keyframed via data-camera
     data-camera="2.0=>scale:1.3,x:-40; 4.0=>scale:1.0" (time=>props)
     Applied each frame by interpolating between keyframes.
  =========================================================================== */
  function resolveCameras(){
    CAMERAS.length=0;
    document.querySelectorAll('.camera[data-camera]').forEach(cam=>{
      const cue=_cueOf(cam);
      const kfs=cam.dataset.camera.split(';').map(s=>s.trim()).filter(Boolean).map(seg=>{
        const [t,props]=seg.split('=>'); const o={t:cue+(parseFloat(t)||0),scale:1,x:0,y:0};
        (props||'').split(',').forEach(pr=>{ const [k,v]=pr.split(':'); if(k&&v!==undefined){ const n=parseFloat(v); if(isFinite(n)) o[k.trim()]=n; } });
        return o;
      }).sort((a,b)=>a.t-b.t);
      kfs.unshift({t:cue,scale:1,x:0,y:0});
      const planes=[...cam.querySelectorAll('[data-plane]')];
      _snap(cam); planes.forEach(_snap);           // BASE before the camera layer first writes them
      CAMERAS.push({cam, kfs, planes, slideEl:_slideOf(cam)});
    });
  }
  /* Camera + parallax planes: the outermost compositor layer of the camera element / each
     plane (an animated plane keeps its own entrance / loop inside the parallax move).
     A plane with factor f moves f x the camera's pan and zooms f x the camera's zoom:
     net scale = 1+(sc-1)*f, so its own scale is (1+(sc-1)*f)/sc (f=1 rides the camera,
     f=0 stays put, f<1 lags behind, f>1 is foreground). */
  function applyCameras(time, frame){
    for(const C of CAMERAS){
      if(frame && C.slideEl && !frame.active.has(C.slideEl)) continue;   // off-screen: pure in t, so skip
      const kfs=C.kfs; let a=kfs[0],b=kfs[0];
      for(let i=0;i<kfs.length;i++){ if(time>=kfs[i].t){a=kfs[i]; b=kfs[i+1]||kfs[i];} }
      let p = (b.t>a.t) ? (time-a.t)/(b.t-a.t) : 1; p=clamp01(p); const e=EASE.inOutCubic(p);
      const sc=a.scale+(b.scale-a.scale)*e, x=a.x+(b.x-a.x)*e, y=a.y+(b.y-a.y)*e;
      _setS(C.cam, 'transformOrigin', 'center center');
      const camTf=`scale(${f4(sc)}) translate(${f4(x)}px,${f4(y)}px)`;
      _layer(C.cam, L_CAMERA, ()=>{ C.cam.style.transform=camTf; });
      const inv=Math.abs(sc)>1e-6 ? 1/sc : 1;
      for(const pl of C.planes){
        let f=parseFloat(pl.dataset.plane||'1'); if(!isFinite(f)) f=1;
        const plTf='translate('+f4(x*(f-1))+'px,'+f4(y*(f-1))+'px) scale('+f4((1+(sc-1)*f)*inv)+')';
        _layer(pl, L_CAMERA, ()=>{ pl.style.transform=plTf; });
      }
    }
  }

  /* ===========================================================================
     THE FRAME FUNCTION — renderFrame(t) sets the complete visual state for time t.
     Used by the live rAF loop, seek() and renderAt(). Order:
       restore transient layers -> slides + transition -> overlay mount pass -> park
       newly off-screen slides -> overlay neutral pass -> compositor layers: entrances
       -> data-then steps -> holds -> loops -> word hits -> exits -> cameras + parallax
       planes -> composite commit -> shared morphs -> post pass (cursor tours) ->
       [offline: CSS-animation sync] -> onFrame hooks.
       (Steps and hits each run in time order.) Offline frames first tear the
       layout tree down (fresh raster), so the frame is laid out and rastered from scratch.
     Everything on an on-screen slide is re-derived from t; nothing is carried over.
     Off-screen slides are not animated; each one is PARKED once when it leaves the screen
     (every element in its pre-entrance state), so even the hidden DOM does not depend on
     which frames were rendered before.
  =========================================================================== */
  function renderFrame(t){
    if(!initialized) return;
    t=(isFinite(t) && t>0) ? t : 0;
    lastT=t;
    if(OFFLINE) _freshRaster();          // tear the layout tree down first: this frame's layout + raster start from scratch
    _restoreTransient();
    _COMP=new Map();                     // (a frame that threw half-way must not leak its stacks)
    const frame={ t, slide:0, cue:0, from:null, to:null, transition:null, p:1, visible:new Set(), active:new Set(),
      morph:null, post:[], cursorOn:false, ripplesOn:new Set(), pressed:new Map(), level:_levelAt(t) };
    _applySlides(t, frame);
    _mountPass(t, frame);                // overlay builds on / off their hosts
    _parkSlides(frame);                  // slides that just went off screen: canonical parked state
    _neutralOverlays(t, frame);
    // compositor layers, innermost first (see COMPOSITOR), then one write per element
    _applyAnims(t, frame);               // entrance
    _applyOverlays(t, frame, 'chain');   // data-then steps
    _applyLoops(t, frame, true);         // data-hold
    _applyLoops(t, frame, false);        // data-loop
    _applyOverlays(t, frame, 'hit');     // word hits
    _applyExits(t, frame);               // data-exit
    applyCameras(t, frame);              // camera + parallax planes
    _commitLayers();
    _applyShared(t, frame);
    _finishPost(frame);
    if(OFFLINE) _syncCssAnimations(t);   // after the fresh-raster rebuild (it restarts CSS animations)
    for(const fn of FRAME_HOOKS){ try{ fn(t, frame); }catch(e){ _warnOnce('hook:'+(e&&e.message), 'onFrame hook failed:', e); } }
    if(frame.slide && frame.slide!==currentSlide){ currentSlide=frame.slide; updateActiveMenu(currentSlide); }
    _updateProgress(t);
    return frame;
  }

  function _applySlides(t, frame){
    if(!TIMINGS.length || !allSlides.length) return;
    const i=_activeCue(t), cue=TIMINGS[i], toEl=CUE_EFF[i], tr=CUE_TR[i];
    frame.cue=i; frame.slide=_numOf(toEl)||cue.slide; frame.to=toEl;
    let fromEl=null, p=1;
    if(tr && tr.fromEl && tr.dur>0 && t>=cue.time && t<cue.time+tr.dur){ fromEl=tr.fromEl; p=(t-cue.time)/tr.dur; }
    const out={opacity:1, zIndex:2}, inn={opacity:1, zIndex:3}, ov={opacity:0, background:''};
    if(fromEl){
      frame.from=fromEl; frame.transition=tr.name; frame.p=p;
      try{ TRANSITIONS[tr.name].render(p, out, inn, ov); }catch(e){ _warnOnce('trr:'+tr.name, 'transition "'+tr.name+'" failed:', e); }
    }
    for(const s of allSlides){
      const st = (s===toEl) ? (fromEl ? inn : null) : (s===fromEl ? out : undefined);
      if(st===undefined){                                   // off screen
        _setS(s,'opacity','0'); _setS(s,'visibility','hidden'); _setS(s,'transform','none'); _setS(s,'filter','none'); _setS(s,'clipPath','none'); _setS(s,'zIndex','1');
      } else if(st===null){                                 // settled on screen
        _setS(s,'opacity','1'); _setS(s,'visibility','visible'); _setS(s,'transform','none'); _setS(s,'filter','none'); _setS(s,'clipPath','none'); _setS(s,'zIndex','2');
      } else {                                              // inside a transition window
        _setS(s,'opacity',String(f4(clamp01(st.opacity!==undefined?st.opacity:1)))); _setS(s,'visibility','visible');
        _setS(s,'transform',st.transform||'none'); _setS(s,'filter',st.filter||'none'); _setS(s,'clipPath',st.clipPath||'none'); _setS(s,'zIndex',String(st.zIndex!==undefined?st.zIndex:2));
      }
    }
    if(toEl) frame.visible.add(toEl);
    if(fromEl) frame.visible.add(fromEl);
    frame.visible.forEach(s=>frame.active.add(s));
    // shared-element morph window (its own 0.7s, also across a 'cut')
    if(tr && tr.pairs.length && t>=cue.time && t<cue.time+MORPH_DUR){ frame.morph={ pairs:tr.pairs, p:(t-cue.time)/MORPH_DUR }; frame.active.add(tr.fromEl); }
    const ol=transitionOverlay;
    if(ol){
      if(ov.opacity>0){ if(ol.style.background!==ov.background) ol.style.background=ov.background; _setS(ol,'opacity',String(f4(clamp01(ov.opacity)))); }
      else { _setS(ol,'opacity','0'); if(ol.style.background) ol.style.background=''; }
    }
  }

  /* ENTRANCES. Before its start an entrance shows its p=0 state (so its children — confetti
     pieces, split letters — are in a known place, not wherever an earlier frame left them),
     then reset() puts back layout-affecting content (full text, sizes), hidden by opacity 0. */
  function _applyAnims(t, frame){
    for(const a of ANIMS){
      if(a.slideEl && !frame.active.has(a.slideEl)) continue;       // off-screen slide: parked (see _parkSlides)
      const ctx={ ease:a.ease, time:t, start:a.t, dur:a.dur, level:frame.level, frame };
      const run=()=>_layer(a.el, L_ENTRANCE, ()=>{       // innermost compositor layer: owns its other props outright
        if(t < a.t) _preEntranceState(a, ctx);
        else {
          const p = (a.dur>0 && t<=a.t+a.dur) ? clamp01((t-a.t)/a.dur) : 1;
          a.preset.apply(a.el, p, ctx); const played=t>a.t+a.dur; if(a.el.classList.contains('anim-played')!==played) a.el.classList.toggle('anim-played', played);
        }
      });
      try{ if(a.domTouch) _withHome(a.el, run); else run(); }   // an overlay build on the host: the entrance writes the author's children
      catch(e){ _warnOnce('apply:'+a.name, 'preset "'+a.name+'" failed:', e); }
    }
  }
  function _preEntranceState(a, ctx){
    if(a.preset.prestart!==false) a.preset.apply(a.el, 0, ctx);
    if(a.preset.reset) a.preset.reset(a.el, ctx);
    a.el.style.opacity=0;
    if(a.el.classList.contains('anim-played')) a.el.classList.remove('anim-played');
  }

  /* PARKING — a slide that is off screen is not animated, so its elements would keep whatever
     the last on-screen frame left (invisible, but order-dependent DOM). When a slide leaves
     the screen it is parked ONCE: every entrance back to its pre-entrance state (at a fixed
     time: its own start, so the parked DOM never depends on when it was parked; composite
     channels stay at BASE), overlay neutral() hooks run, and the mount pass has already taken
     overlay builds off. Parked slides are not touched again until they are on screen. */
  function _parkSlides(frame){
    let todo=null;
    for(const s of allSlides){
      if(frame.active.has(s)){ _PARKED.delete(s); continue; }
      if(_PARKED.has(s)) continue;
      _PARKED.add(s); (todo||(todo=new Set())).add(s);
    }
    if(!todo) return;
    const pf=_primeFrame(0);
    for(let i=OVERLAYS.length-1;i>=0;i--){
      const o=OVERLAYS[i]; if(!todo.has(o.slideEl) || !o.preset.neutral || (o.rec && o.rec.mode)) continue;
      const s=o.el.style, host=s ? _styleMap(s) : null;
      try{ o.preset.neutral(o.el, { ease:o.ease, time:o.t, start:o.t, dur:o.dur, level:null, frame:pf }); }catch(e){}
      if(host) _setStyleMap(s, host);
    }
    for(const a of ANIMS){
      if(!todo.has(a.slideEl)) continue;
      const s=a.el.style, ch=s ? ['transform','opacity','filter'].map(k=>[k, s.getPropertyValue(k), s.getPropertyPriority(k)]) : null;
      const run=()=>_preEntranceState(a, { ease:a.ease, time:a.t, start:a.t, dur:a.dur, level:null, frame:pf });
      try{ if(a.domTouch) _withHome(a.el, run); else run(); }catch(e){ _warnOnce('park:'+a.name, 'preset "'+a.name+'" failed:', e); }
      if(ch) for(const [k, v, pr] of ch){ if(s.getPropertyValue(k)!==v || s.getPropertyPriority(k)!==pr){ if(v) s.setProperty(k, v, pr); else s.removeProperty(k); } }
    }
  }

  /* OVERLAY LAYERS — data-then steps and word hits, on top of the element's entrance.
     Window [t, t+dur]: apply(p). After it: held at p=1 (impulse presets settle back to rest).
     Before it: absent. Host styles are transient (restored next frame); the neutral pass
     puts child / text state back first, so earlier frames never leak into this one.
     Steps run as the 'then' compositor layer, hits as the 'hit' layer (after hold + loop):
     their transform wraps the layers below, opacity multiplies, filter appends. */
  function _overlayP(o, t){
    if(t < o.t) return -1;
    if(o.dur>0 && t<=o.t+o.dur) return clamp01((t-o.t)/o.dur);
    return o.hold ? 1 : -1;
  }
  function _neutralOverlays(t, frame){
    for(let i=OVERLAYS.length-1;i>=0;i--){
      const o=OVERLAYS[i]; if(!o.preset.neutral || (o.rec && o.rec.mode)) continue;   // (a build is taken off by the mount pass)
      if(o.slideEl && !frame.active.has(o.slideEl)) continue;
      const ctx={ ease:o.ease, time:t, start:o.t, dur:o.dur, level:frame.level, frame }, s=o.el.style;
      const host=s ? _styleMap(s) : null;               // neutral() owns child / text state only
      try{ o.preset.neutral(o.el, ctx); }catch(e){ _warnOnce('neutral:'+o.name, 'preset "'+o.name+'" neutral() failed:', e); }
      if(host) _setStyleMap(s, host);
    }
  }
  function _applyOverlays(t, frame, kind){
    const lk=(kind==='hit') ? L_HIT : L_THEN;
    for(const o of OVERLAYS){
      if(o.kind!==kind) continue;
      if(o.slideEl && !frame.active.has(o.slideEl)) continue;
      if(_preEntrance(o.el, t)) continue;                // before its entrance: p=0 state only
      const p=_overlayP(o, t); if(p<0) continue;
      const el=o.el, R=o.rec, ctx={ ease:o.ease, time:t, start:o.t, dur:o.dur, level:frame.level, frame };
      if(R && R.mode && _hostOf(el).mounted!==R) continue;   // its build is not the one on the host (a later one is)
      _transient(el, ()=>{
        if(R && R.setup.size) R.setup.forEach((v,k)=>{ if(el.style.getPropertyValue(k)!==v[0] || el.style.getPropertyPriority(k)!==v[1]) el.style.setProperty(k, v[0], v[1]); });
        _layer(el, lk, ()=>o.preset.apply(el, p, ctx));
      });
      if(R && R.late && !R.mode) _lateMounted(R, el);
    }
  }

  /* OFFLINE FRESH RASTER — Chromium keeps compositor / raster state between frames (partial
     re-raster after an in-place transform change can leave stale pixels, e.g. after a rotated
     entrance settles). Detaching and re-attaching the layout tree once per offline frame makes
     every exported frame rasterize from scratch, so its pixels depend on t alone. Costs a full
     layout + raster per frame (~8-14ms at 1080p). window.SB_FRESH_RASTER=false turns it off. */
  function _freshRaster(){
    if(typeof window!=='undefined' && window.SB_FRESH_RASTER===false) return;
    const b=document.body; if(!b || !b.style) return;
    const v=b.style.getPropertyValue('display'), pr=b.style.getPropertyPriority('display');
    b.style.setProperty('display','none','important');
    void b.offsetWidth;                                   // style + layout now: the layout tree is torn down
    if(v) b.style.setProperty('display', v, pr); else b.style.removeProperty('display');
  }
  /* EXITS — the outermost element layer: an exit moves / fades / blurs whatever the element
     is showing (a rotated note slides out still rotated). Transient like every layer above
     the entrance: seeking back before the exit leaves no transform / filter residue. */
  function _applyExits(t, frame){
    for(const x of EXIT_SCHED){
      if(t < x.t) continue;
      if(x.slideEl && !frame.active.has(x.slideEl)) continue;
      if(_preEntrance(x.el, t)) continue;
      const e=(x.ease||EASE.outCubic)(x.dur>0 ? clamp01((t-x.t)/x.dur) : 1);
      _transient(x.el, ()=>_layer(x.el, L_EXIT, ()=>x.fx(x.el, e)));
    }
  }
  /* LOOPS (holds=false) / HOLDS (holds=true): ambient motion wrapped around the settled
     entrance (+ its data-then steps); a hold is inside a loop on the same element. */
  function _applyLoops(t, frame, holds){
    const beat = frame.level!=null ? frame.level : 0;
    for (const L of LOOP_ELS) {
      if (!L.hold !== !holds) continue;
      if (t < L.startAt) continue;
      if (L.slideEl && !frame.active.has(L.slideEl)) continue;
      if (_preEntrance(L.el, t)) continue;
      const lt = t - L.startAt, fn = LOOPS[L.type], el=L.el;
      _transient(el, ()=>_layer(el, holds ? L_HOLD : L_LOOP, ()=>{
        if (L.type==='beat') el.style.transform = `scale(${f4(1 + beat*(L.amp/100))})`;
        else if (L.type==='shimmer') el.style.backgroundPosition = `${f4((lt/L.per*100)%100)}% 50%`;
        else if (fn) el.style.transform = fn(lt, L.amp, L.per);
      }));
    }
  }

  /* SHARED-ELEMENT MORPH — an element with data-shared-id on the incoming slide flies
     from the matching element's box on the outgoing slide to its own (FLIP), over
     [cue, cue+0.7], composed over its own transform. */
  function _applyShared(t, frame){
    const m=frame.morph; if(!m) return;
    const e=EZ_SOFT(m.p), k=1-e;
    for(const pr of m.pairs){
      const a=_layoutBox(pr.from, pr.fromSlide), b=_layoutBox(pr.to, pr.toSlide);
      if(!a || !b || !b.w || !b.h) continue;
      const dx=(a.x+a.w/2)-(b.x+b.w/2), dy=(a.y+a.h/2)-(b.y+b.h/2), sx=(a.w/b.w)||1, sy=(a.h/b.h)||1, el=pr.to;
      _transient(el, ()=>{
        el.style.transform=`translate(${f4(dx*k)}px,${f4(dy*k)}px) scale(${f4(1+(sx-1)*k)},${f4(1+(sy-1)*k)})`+((el.style.transform&&el.style.transform!=='none')?' '+el.style.transform:'');
        const bo=parseFloat(el.style.opacity); el.style.opacity=String(f4((isNaN(bo)?1:bo)*(0.85+0.15*e)));
      });
    }
  }

  /* Post pass: layers that read the rendered layout (cursor tours) run last, then the
     tour's shared resources (cursor, ripples, press feedback) are resolved for this frame. */
  function _finishPost(frame){
    for(const fn of frame.post){ try{ fn(); }catch(e){ _warnOnce('post:'+(e&&e.message), 'post-pass layer failed:', e); } }
    const cur=document.getElementById('sb-cursor');
    if(cur) _setS(cur,'opacity', frame.cursorOn?'1':'0');
    _TOUR_RIPPLES.forEach(r=>{ if(!frame.ripplesOn.has(r)) _setS(r,'opacity','0'); });
    frame.pressed.forEach((v,tg)=>{ if(v) _transient(tg, ()=>{ tg.style.scale=v; }); });
  }

  /* Offline only: author CSS @keyframes animations follow the engine clock (paused +
     seeked to t) and CSS transitions jump to their end, so no wall-clock motion leaks
     into exported frames. */
  function _syncCssAnimations(t){
    if(!document.getAnimations) return;
    let list; try{ list=document.getAnimations(); }catch(e){ return; }
    for(const a of list){
      try{
        if(typeof CSSTransition!=='undefined' && a instanceof CSSTransition){ a.finish(); continue; }
        if(typeof CSSAnimation!=='undefined' && a instanceof CSSAnimation){ if(a.playState!=='paused') a.pause(); a.currentTime=t*1000; }
      }catch(e){}
    }
  }

  function _updateProgress(t){
    if(!progress) return;
    const d=duration(), w=(d>0?Math.min(t/d*100,100):0)+'%';
    if(progress.style.width!==w) progress.style.width=w;
  }

  /* ===========================================================================
     UI — controls, jump menu, progress, calibration
  =========================================================================== */
  let playControls=null,playBtn=null,resetBtn=null,jumpBtn=null,jumpMenu=null,progress=null, _uiWired=false;
  function buildUI(){
    if(document.getElementById('playControls')){ wireUI(); return; }
    const c=document.createElement('div'); c.className='play-controls'; c.id='playControls';
    c.innerHTML='<button id="jumpBtn" title="Jump (J)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg></button>'+
      '<button id="resetBtn" title="Reset (R)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 5V2L7 6.5 12 11V8a5 5 0 11-5 5H5a7 7 0 107-7z"/></svg></button>'+
      '<button id="playBtn" title="Play/Pause (Space)"><svg class="icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4l13 8L7 20z"/></svg><svg class="icon-pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:none"><path d="M7 4h4v16H7zM13 4h4v16h-4z"/></svg></button>';
    document.body.appendChild(c);
    if(!document.getElementById('playProgress')){ const pr=document.createElement('div'); pr.className='play-progress'; pr.id='playProgress'; document.body.appendChild(pr); }
    if(!document.getElementById('jumpMenu')){ const jm=document.createElement('div'); jm.className='jump-menu'; jm.id='jumpMenu'; document.body.appendChild(jm); }
    injectControlCSS(); wireUI();
  }
  function injectControlCSS(){
    if(document.getElementById('sb-ctrl-css')) return;
    const s=document.createElement('style'); s.id='sb-ctrl-css';
    s.textContent=`.play-controls{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:9999;opacity:.42}.play-controls button{width:36px;height:36px;border-radius:50%;background:rgba(12,18,32,.62);border:1px solid rgba(255,255,255,.18);cursor:pointer;padding:0;color:#fff;display:flex;align-items:center;justify-content:center}.play-controls.is-playing .icon-play{display:none}.play-controls.is-playing .icon-pause{display:block!important}.play-progress{position:fixed;top:0;left:0;height:2px;background:var(--accent,#3CA8E8);z-index:9998;width:0;opacity:0;transition:opacity .3s}.play-progress.is-active{opacity:.75}.jump-menu{position:fixed;top:56px;right:12px;width:320px;max-height:calc(100vh - 80px);overflow-y:auto;background:rgba(12,18,32,.94);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:6px;z-index:9999;opacity:0;pointer-events:none;transform:translateY(-8px);transition:opacity .2s,transform .2s;backdrop-filter:blur(8px)}.jump-menu.is-open{opacity:1;pointer-events:auto;transform:translateY(0)}.jump-menu button{display:flex;align-items:baseline;gap:10px;width:100%;padding:7px 12px;background:transparent;border:none;border-radius:6px;color:rgba(255,255,255,.85);font:12.5px/1.35 system-ui,sans-serif;text-align:left;cursor:pointer}.jump-menu button .jm-num{font-weight:700;color:var(--accent,#3CA8E8);min-width:22px;font-size:11px}.jump-menu button.is-active{background:rgba(60,168,232,.22);color:#fff}`;
    document.head.appendChild(s);
  }
  function wireUI(){
    playControls=document.getElementById('playControls'); playBtn=document.getElementById('playBtn');
    resetBtn=document.getElementById('resetBtn'); jumpBtn=document.getElementById('jumpBtn');
    jumpMenu=document.getElementById('jumpMenu'); progress=document.getElementById('playProgress');
    buildJumpMenu();
    if(_uiWired) return; _uiWired=true;
    if(jumpBtn && jumpMenu) jumpBtn.addEventListener('click',e=>{e.stopPropagation(); jumpMenu.classList.toggle('is-open');});
    if(jumpMenu) jumpMenu.addEventListener('click',e=>{const b=e.target.closest('button[data-cue],button[data-slide]'); if(!b)return; if(b.dataset.cue!==undefined) jumpToCue(parseInt(b.dataset.cue,10)); else jumpToSlide(parseInt(b.dataset.slide,10)); jumpMenu.classList.remove('is-open');});
    document.addEventListener('click',e=>{ if(jumpMenu && !jumpMenu.contains(e.target)&&e.target!==jumpBtn) jumpMenu.classList.remove('is-open'); });
    if(playBtn) playBtn.addEventListener('click',()=>isPlaying()?pause():play());
    if(resetBtn) resetBtn.addEventListener('click',reset);
  }
  function buildJumpMenu(){
    if(!jumpMenu) return;
    jumpMenu.innerHTML='';
    const frag=document.createDocumentFragment();
    TIMINGS.forEach((cue,idx)=>{
      const btn=document.createElement('button'); btn.dataset.slide=cue.slide; btn.dataset.cue=idx;
      const mm=Math.floor(cue.time/60).toString().padStart(2,'0'), ss=Math.floor(cue.time%60).toString().padStart(2,'0');
      btn.innerHTML='<span class="jm-num">'+String(cue.slide).padStart(2,'0')+'</span><span class="jm-title" style="flex:1">'+(SLIDE_LABELS[idx]||('Slide '+cue.slide))+'</span><span class="jm-num" style="min-width:38px;text-align:right;opacity:.6">'+mm+':'+ss+'</span>';
      frag.appendChild(btn);
    });
    jumpMenu.appendChild(frag);
    updateActiveMenu(currentSlide);
  }
  function updateActiveMenu(n){ if(!jumpMenu) return; jumpMenu.querySelectorAll('button').forEach(b=>{ const on=parseInt(b.dataset.slide,10)===n; if(b.classList.contains('is-active')!==on) b.classList.toggle('is-active',on); }); }
  function _onPlayUI(){ if(playControls) playControls.classList.add('is-playing'); if(progress) progress.classList.add('is-active'); }
  function _onPauseUI(){ if(playControls) playControls.classList.remove('is-playing'); }

  /* Jump to a cue. While playing the transition into it plays out; while paused (or with
     settled=true) land just after it settles so the arriving slide is fully on screen. */
  function jumpToCue(i, settled){
    if(!(i>=0 && i<TIMINGS.length)) return;
    const tr=CUE_TR[i], settle=(isPlaying() && settled!==true) ? 0.01 : ((tr?tr.dur:0)+0.01);
    if(progress) progress.classList.add('is-active');
    seek(TIMINGS[i].time+settle);
  }
  function jumpToSlide(n, settled){ const i=TIMINGS.findIndex(t=>t.slide===n); if(i>=0) jumpToCue(i, settled); }
  /* v0.7 API: goToSlide(n, type, instant) switched slides directly. Slides now follow the
     clock, so it seeks to slide n's first cue (instant=true: past its transition). The
     transition always comes from the slide's data-transition-in; `type` is ignored. */
  function goToSlide(n, type, instant){
    if(type!==undefined && type!==null && type!=='') _warnOnce('goToSlide-type', 'goToSlide(n, "'+type+'"): slides follow the clock now — this seeks to slide '+n+"'s cue; its transition comes from data-transition-in (type ignored)");
    jumpToSlide(parseInt(n,10), instant===true);
  }

  /* ===========================================================================
     TRANSPORT
  =========================================================================== */
  function _loop(){ if(OFFLINE) return; cancelAnimationFrame(rafId); rafId=requestAnimationFrame(_tick); }
  function _tick(){
    rafId=0;
    const t=getTime();
    renderFrame(t);
    if(synthetic && synthPlaying && t>=duration()+0.5){ pausedT=t; synthPlaying=false; _onPauseUI(); return; }
    if(isPlaying()) rafId=requestAnimationFrame(_tick);
  }
  function ensureAudioGraph(){
    if(OFFLINE||synthetic||analyser||!voAudio) return;
    try{
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const src=audioCtx.createMediaElementSource(voAudio);
      analyser=audioCtx.createAnalyser(); analyser.fftSize=64; freqData=new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser); analyser.connect(audioCtx.destination);
    }catch(e){ analyser=null; }
  }
  function _startAudio(){
    try{ if(Math.abs((voAudio.currentTime||0)-pausedT)>0.05) _setAudioTime(pausedT); }catch(e){}
    const ok=()=>{ ensureAudioGraph(); if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume(); _onPlayUI(); _loop(); };
    let pr; try{ pr=voAudio.play(); }catch(e){ console.warn('Audio play failed:', e); return; }
    if(pr && pr.then) pr.then(ok).catch(err=>console.warn('Audio play blocked:',err)); else ok();
  }
  function play(){
    if(OFFLINE){ _warnOnce('offline-play', 'SB_OFFLINE: play() ignored — drive frames with renderAt(t)'); return; }
    if(!initialized || isPlaying()) return;
    if(pausedT>=duration()-0.05) pausedT=0;               // at the end: replay from the top
    if(synthetic){ synthPlaying=true; synthStartedAt=performance.now(); _onPlayUI(); _loop(); return; }
    if(voAudio) _startAudio();
  }
  function pause(){
    if(OFFLINE) return;
    if(synthetic){ if(synthPlaying){ pausedT=getTime(); synthPlaying=false; } }
    else if(voAudio){ if(!voAudio.paused) pausedT=voAudio.currentTime||0; voAudio.pause(); }
    _onPauseUI(); cancelAnimationFrame(rafId); rafId=0;
    if(initialized) renderFrame(pausedT);
  }
  function reset(){
    pause(); setClock(0);
    if(progress){ progress.style.width='0%'; progress.classList.remove('is-active'); }
    if(initialized) renderFrame(0);
  }
  function _sanT(t){ t=+t; return (isFinite(t) && t>0) ? t : 0; }
  /* seek(t): move the clock (live: the audio too) and render t immediately — the frame
     never waits for, or depends on, async audio 'seeked'/'timeupdate' events. */
  function seek(t){ t=_sanT(t); setClock(t); if(initialized) renderFrame(t); }
  /* renderAt(t): render the exact frame for time t (pure function of t). Never touches the
     audio element or the playback clock (offline it also becomes the clock position). */
  function renderAt(t){ t=_sanT(t); if(OFFLINE) pausedT=t; if(initialized) renderFrame(t); }

  /* Re-derive everything that depends on TIMINGS (after calibration / nudges). */
  function _indexCues(){
    CUE_FOR={}; TIMINGS.forEach(c=>{ if(CUE_FOR[c.slide]===undefined) CUE_FOR[c.slide]=c.time; });   // first visit of a slide
  }
  function _retime(render){
    TIMINGS.sort((a,b)=>a.time-b.time);
    _indexCues(); resolveSchedule(); resolveCameras(); _resolveTransitions(); buildJumpMenu();
    if(render!==false) renderFrame(getTime());
  }

  /* ===========================================================================
     CALIBRATION (T/M/Bksp/A/E/Esc + bracket nudge)
  =========================================================================== */
  const CALIB={
    active:false,cues:[],badge:null,
    key(){return 'storyboard-calib::'+location.pathname;},
    start(){this.active=true;this.cues=[0];this.ensureBadge();this.update();},
    exitMode(){this.active=false;if(this.badge){this.badge.remove();this.badge=null;}},
    mark(t){if(!this.active||this.cues.length>=TIMINGS.length)return; if(t<=this.cues[this.cues.length-1])t=this.cues[this.cues.length-1]+0.1; this.cues.push(parseFloat(t.toFixed(2)));this.update();},
    undo(){if(this.active&&this.cues.length>1){this.cues.pop();this.update();}},
    apply(){const n=Math.min(this.cues.length,TIMINGS.length);for(let i=0;i<n;i++)TIMINGS[i].time=this.cues[i];_retime();try{localStorage.setItem(this.key(),JSON.stringify({sourceHash:INITIAL_TIMINGS_HASH,cues:this.cues}));}catch(e){}this.flash('APPLIED · '+n+' cues');},
    exportCues(){const txt='timings: '+JSON.stringify(this.cues.map((t,i)=>({time:t,slide:i+1})));console.log(txt);if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>this.flash('COPIED'),()=>this.flash('LOGGED'));else this.flash('LOGGED');},
    loadSaved(){try{const s=localStorage.getItem(this.key());if(!s)return false;const p=JSON.parse(s);if(!p||!p.sourceHash||!Array.isArray(p.cues)){localStorage.removeItem(this.key());return false;}if(p.sourceHash!==INITIAL_TIMINGS_HASH){localStorage.removeItem(this.key());return false;}const n=Math.min(p.cues.length,TIMINGS.length);for(let i=0;i<n;i++){const v=parseFloat(p.cues[i]);if(isFinite(v))TIMINGS[i].time=v;}this.cues=p.cues;_retime(false);return true;}catch(e){return false;}},
    clearSaved(){try{localStorage.removeItem(this.key());}catch(e){}},
    ensureBadge(){if(this.badge)return;const b=document.createElement('div');b.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;font:600 12px/1.5 ui-monospace,monospace;background:rgba(60,168,232,.95);color:#fff;padding:10px 18px;border-radius:8px;text-align:center;min-width:420px';document.body.appendChild(b);this.badge=b;},
    update(){if(!this.badge)return;const n=this.cues.length,total=TIMINGS.length;const l=n>=total?'ALL CAPTURED — [A]pply · [E]xport · [Esc]':'CALIBRATION · '+n+'/'+total+' · next: slide '+(n+1);this.badge.innerHTML=l+'<br><span style="opacity:.85;font-weight:400">[M] mark · [Bksp] undo · [A]pply · [E]xport · [Esc]</span>';},
    flash(m){if(!this.badge){const t=document.createElement('div');t.textContent=m;t.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;font:600 12px/1.4 ui-monospace,monospace;background:rgba(10,132,120,.95);color:#fff;padding:10px 18px;border-radius:8px';document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}else{this.badge.innerHTML='<strong>'+m+'</strong>';setTimeout(()=>{if(this.badge)this.update();},1500);}}
  };

  let _keysBound=false;
  function bindKeys(){
    if(_keysBound) return; _keysBound=true;
    document.addEventListener('keydown',e=>{
      if(!initialized) return;
      if(e.target && e.target.matches && e.target.matches('input,textarea,[contenteditable]'))return;
      if(e.code==='KeyT'){e.preventDefault();CALIB.active?CALIB.exitMode():CALIB.start();return;}
      if(CALIB.active){
        if(e.code==='KeyM'){e.preventDefault();CALIB.mark(getTime());return;}
        if(e.code==='Backspace'){e.preventDefault();CALIB.undo();return;}
        if(e.code==='KeyA'){e.preventDefault();CALIB.apply();return;}
        if(e.code==='KeyE'){e.preventDefault();CALIB.exportCues();return;}
        if(e.code==='Escape'){e.preventDefault();CALIB.exitMode();return;}
      }
      if(e.code==='Space'){e.preventDefault();isPlaying()?pause():play();}
      else if(e.code==='KeyR'||e.code==='Home'){e.preventDefault();reset();}
      else if(e.code==='KeyJ'){e.preventDefault();if(jumpMenu)jumpMenu.classList.toggle('is-open');}
      else if(e.code==='Escape'){if(jumpMenu)jumpMenu.classList.remove('is-open');}
      else if(e.code==='ArrowRight'){e.preventDefault();const i=_activeCue(getTime());if(i+1<TIMINGS.length)jumpToCue(i+1);}
      else if(e.code==='ArrowLeft'){e.preventDefault();const now=getTime(),i=_activeCue(now),settle=TIMINGS[i].time+(CUE_TR[i]?CUE_TR[i].dur:0);jumpToCue(now-settle>0.5?i:Math.max(0,i-1));}
      else if(e.code==='BracketLeft'||e.code==='Comma'){e.preventDefault();const c=TIMINGS.find(t=>t.slide===currentSlide);if(c&&c.slide>1){c.time=Math.max(0,c.time-0.25);_retime();CALIB.flash('Slide '+c.slide+': '+c.time.toFixed(2)+'s');}}
      else if(e.code==='BracketRight'||e.code==='Period'){e.preventDefault();const c=TIMINGS.find(t=>t.slide===currentSlide);if(c&&c.slide>1){c.time+=0.25;_retime();CALIB.flash('Slide '+c.slide+': '+c.time.toFixed(2)+'s');}}
    });
  }

  /* ===========================================================================
     SCALE-TO-FIT — read .deck native size, fit into viewport
  =========================================================================== */
  function scaleToFit(){
    if(!deck || deck===document.body || deck===document.documentElement) return;
    const [dw, dh]=_deckSize();
    const s=Math.min(window.innerWidth/dw, window.innerHeight/dh);
    deck.style.transform=`translate3d(0,0,0) scale(${s})`;
  }
  /* The deck's authored frame size: the slides' layout box (the deck box itself can be
     squeezed by its container — e.g. a flex item narrower than the viewport — or collapse
     once its slides are stacked absolutely). Deck box next, then 1920x1080. */
  function _deckSize(){
    for(const s of allSlides){ const w=s.offsetWidth, h=s.offsetHeight; if(w>0 && h>0) return [w, h]; }
    const w=deck && deck.offsetWidth, h=deck && deck.offsetHeight;
    return (w>0 && h>0) ? [w, h] : [1920, 1080];
  }

  /* ===========================================================================
     READY — resolves when frames are pixel-stable (fonts, images, lottie, characters,
     three.js scenes). Never rejects; gives up after 15s with a console.warn.
  =========================================================================== */
  function _cssUrls(bg){ const out=[]; const re=/url\(\s*(['"]?)(.*?)\1\s*\)/g; let m; while((m=re.exec(bg))) if(m[2]) out.push(m[2]); return out; }
  function _imgReady(img){
    const loaded = (img.complete) ? Promise.resolve() : new Promise(r=>{ img.addEventListener('load',r,{once:true}); img.addEventListener('error',r,{once:true}); });
    return loaded.then(()=> (img.decode && img.currentSrc) ? img.decode().catch(()=>{}) : null);
  }
  function _preloadUrl(u){
    return new Promise(r=>{ const im=new Image(); im.onload=im.onerror=()=>r(im); im.src=u; })
      .then(im=> im.decode ? im.decode().catch(()=>{}) : null);
  }
  function _short(s){ s=String(s||''); return s.length>70 ? s.slice(0,40)+'…'+s.slice(-24) : s; }
  function ready(){
    return new Promise(resolve=>{
      const pending=new Map(); let done=false, timer=0, seq=0;
      const finish=()=>{
        if(done) return; done=true; clearTimeout(timer);
        if(pending.size) console.warn('[storyboard] ready(): gave up after '+(READY_CAP_MS/1000)+'s; still waiting for: '+[...pending.values()].join(', '));
        try{ if(initialized) renderFrame(lastT); }catch(e){}
        resolve();
      };
      const track=(label, p)=>{ const id=++seq; pending.set(id, label); return Promise.resolve(p).then(()=>{},()=>{}).then(()=>{ pending.delete(id); }); };
      const waitFor=(cond)=>new Promise(r=>{ const poll=()=>{ if(done) return r(); let ok=false; try{ ok=!!cond(); }catch(e){} if(ok) r(); else setTimeout(poll,50); }; poll(); });
      timer=setTimeout(finish, READY_CAP_MS);
      track('Storyboard.init()', _initP).then(()=>{
        if(done) return;
        const jobs=[];
        if(document.fonts && document.fonts.ready) jobs.push(track('fonts', document.fonts.ready));
        _withAllHome(()=>{                                  // author content in place: its images count too
          for(const img of Array.from(document.images)){
            if(img.loading==='lazy') img.loading='eager';     // off-screen slides must decode too
            jobs.push(track('img '+_short(img.currentSrc||img.src), _imgReady(img)));
          }
          const urls=new Set(), scope=(deck&&deck.querySelectorAll)?deck:document.body;
          [scope, ...scope.querySelectorAll('*')].forEach(el=>{ let bg=''; try{ bg=getComputedStyle(el).backgroundImage; }catch(e){} if(bg && bg!=='none' && bg.indexOf('url(')>=0) _cssUrls(bg).forEach(u=>urls.add(u)); });
          urls.forEach(u=>jobs.push(track('background '+_short(u), _preloadUrl(u))));
        });
        // Late builders. As an overlay the build is recorded and taken off again (see OVERLAY RECORDS).
        // (An asynchronous build — lottie by data-src — is recorded by the mount pass once it lands.)
        const late=(a, fn)=>()=>{
          const R=a.rec; if(!a.kind || !R || R.mode || R.reparent) return fn();
          const el=a.el, M=_hostOf(el).mounted; if(M) _mount(el, null);
          try{ return fn(); }
          finally{ if(!R.mode && !R.reparent && R.home0 && !el._sbEntDom) _captureBuild(R, el, R.home0, null); if(M) _mount(el, M); }
        };
        for(const a of ANIMS.concat(OVERLAYS)){
          if(a.name==='lottie') jobs.push(track('lottie '+_selOf(a.el), waitFor(()=>window.lottie).then(late(a, ()=>_lottieInit(a.el)))));
          else if(a.name==='character'){ const s=_charSource(a.el); if(s.pending) jobs.push(track('character '+a.el.dataset.charSrc, s.pending.then(late(a, ()=>{ _charInit(a.el); })))); }
          else if(a.name==='scene3d') jobs.push(track('three.js scene '+_selOf(a.el), waitFor(()=>window.THREE).then(late(a, ()=>{ _s3Init(a.el); }))));
        }
        Promise.all(jobs).then(()=>{
          if(done) return;
          try{ renderFrame(lastT); }catch(e){}                 // late inits may pull in more assets (fonts)
          return (document.fonts && document.fonts.ready) ? track('fonts', document.fonts.ready) : null;
        }).then(finish, finish);
      });
    });
  }

  /* ===========================================================================
     EVENTS / META
  =========================================================================== */
  const _selCache=new WeakMap();
  function _cssEsc(s){ return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, c=>'\\'+c); }
  function _selOf(el){
    if(!el || el.nodeType!==1) return '';
    if(_selCache.has(el)) return _selCache.get(el);
    const parts=[]; let n=el;
    while(n && n.nodeType===1 && n!==document.documentElement){
      if(n.id){ parts.unshift('#'+_cssEsc(n.id)); break; }
      if(n===document.body){ parts.unshift('body'); break; }
      const par=n.parentElement; if(!par){ parts.unshift(n.tagName.toLowerCase()); break; }
      parts.unshift(n.tagName.toLowerCase()+':nth-child('+([...par.children].indexOf(n)+1)+')');
      n=par;
    }
    const s=parts.join(' > '); _selCache.set(el,s); return s;
  }
  function _slideAt(t){ if(!TIMINGS.length) return 0; const i=_activeCue(t); return _numOf(CUE_EFF[i])||TIMINGS[i].slide; }
  /* Is slideEl on screen at t (the active cue's slide, or the outgoing one mid-transition)?
     Elements outside any slide count as always on screen. */
  function _onScreen(slideEl, t){
    if(!slideEl) return true;
    if(!TIMINGS.length) return false;
    const i=_activeCue(t); if(CUE_EFF[i]===slideEl) return true;
    const tr=CUE_TR[i];
    return !!(tr && tr.fromEl===slideEl && tr.dur>0 && t<TIMINGS[i].time+tr.dur);
  }
  /* events(): what happens when, for SFX placement. By default only events that are
     visible (their slide is on screen at t; a word hit's target exists). events({all:true})
     returns every scheduled event with visible:true|false. */
  function events(opts){
    if(!initialized) return [];
    return _withAllHome(()=>_events(opts));          // selectors / word-hit targets against the author's DOM
  }
  function _events(opts){
    const all=!!(opts && opts.all), out=[];
    const add=(e, vis)=>{ if(all){ e.visible=vis; out.push(e); } else if(vis) out.push(e); };
    TIMINGS.forEach((c,i)=>{ const tr=CUE_TR[i]; if(tr) add({ t:c.time, type:'slide', name:tr.name, slide:c.slide, dur:tr.dur }, true); });
    const layer=(a, chained)=>{
      const fun=FUN_PRESETS.has(a.name) || !!a.preset.fun;
      add({ t:a.t, type:fun?'fun':'entrance', name:a.name, slide:a.slideEl?_numOf(a.slideEl):_slideAt(a.t), sel:_selOf(a.el),
        emphasis:!fun && (EMPHASIS_PRESETS.has(a.name) || !!a.preset.emphasis), dur:a.dur, chained }, _onScreen(a.slideEl, a.t));
    };
    for(const a of ANIMS) layer(a, false);
    for(const o of OVERLAYS) if(o.kind==='chain') layer(o, true);
    for(const h of WORD_HITS){ const el=_hitEl(h), sl=el?_slideOf(el):null;
      add({ t:h.time, type:'hit', name:_hasPreset(h.hit)?h.hit:'pulse', slide:sl?_numOf(sl):_slideAt(h.time), sel:h.sel }, !!el && _onScreen(sl, h.time)); }
    for(const x of EXIT_SCHED) add({ t:x.t, type:'exit', name:x.name, slide:x.slideEl?_numOf(x.slideEl):_slideAt(x.t), sel:_selOf(x.el), dur:x.dur }, _onScreen(x.slideEl, x.t));
    const rank={slide:0, entrance:1, fun:2, hit:3, exit:4};
    return out.map((e,i)=>(e._i=i,e)).sort((a,b)=>(a.t-b.t)||(rank[a.type]-rank[b.type])||(a._i-b._i)).map(e=>{ delete e._i; return e; });
  }
  function _gcd(a,b){ a=Math.round(Math.abs(a)); b=Math.round(Math.abs(b)); while(b){ const t=a%b; a=b; b=t; } return a||1; }
  function meta(){
    const [w, h]=_deckSize(), g=_gcd(w,h);
    let audioSrc=null;
    if(voAudio){
      const srcEl=voAudio.querySelector && voAudio.querySelector('source[src]');
      const a=voAudio.getAttribute('src') || (srcEl && srcEl.getAttribute('src'));
      if(a){ try{ audioSrc=new URL(a, document.baseURI).href; }catch(e){ audioSrc=null; } }
      else if(voAudio.currentSrc) audioSrc=voAudio.currentSrc;
    }
    return { version:VERSION, width:w, height:h, audioSrc, slides:allSlides.length, aspect:_aspect(w, h, g) };
  }
  /* '16:9' etc.: snaps to a common ratio within 1% (1366x768 -> 16:9), else the exact reduced ratio. */
  const _ASPECTS=[[16,9],[9,16],[4,3],[3,4],[1,1],[4,5],[5,4],[21,9],[9,21],[3,2],[2,3],[2,1],[1,2]];
  function _aspect(w, h, g){
    if(!(w>0 && h>0)) return '16:9';
    const r=w/h; for(const [a,b] of _ASPECTS){ if(Math.abs(r/(a/b)-1)<0.01) return a+':'+b; }
    return (w/g)+':'+(h/g);
  }

  /* ===========================================================================
     PUBLIC API
  =========================================================================== */
  function _resolveEl(x){ if(!x) return null; if(typeof x==='string'){ try{ return document.querySelector(x); }catch(e){ return null; } } return (x.nodeType===1)?x:null; }
  function _isOffline(){ const v=(typeof window!=='undefined')?window.SB_OFFLINE:undefined; return v===true || v===1 || v==='1' || v==='true'; }
  function _normTimings(arr){
    const src=Array.isArray(arr)?arr:[], keep=[];
    src.forEach(c=>{
      if(!c || typeof c!=='object') return;
      const t=parseFloat(c.time), s=parseInt(c.slide,10);
      if(!isFinite(t) || !(s>=1)){ _warnOnce('badcue:'+JSON.stringify(c), 'ignoring malformed TIMINGS entry', c); return; }
      c.time=Math.max(0,t); c.slide=s; keep.push(c);
    });
    keep.sort((a,b)=>a.time-b.time);                     // stable
    if(!keep.length) keep.push({ time:0, slide:allSlides.length?(_numOf(allSlides[0])||1):1 });
    if(Array.isArray(arr)){ arr.length=0; keep.forEach(c=>arr.push(c)); return arr; }   // keep the deck's array identity
    return keep;
  }
  function _normHits(arr){
    const src=Array.isArray(arr)?arr:[], keep=src.filter(h=>h && typeof h==='object' && typeof h.sel==='string' && isFinite(parseFloat(h.time)));
    keep.forEach(h=>{ h.time=parseFloat(h.time); });
    keep.sort((a,b)=>a.time-b.time);
    if(Array.isArray(arr)){ arr.length=0; keep.forEach(h=>arr.push(h)); return arr; }
    return keep;
  }
  function _normWords(arr){
    if(!Array.isArray(arr)) return [];
    return arr.filter(w=>w && isFinite(parseFloat(w.start))).map(w=>{ const s=parseFloat(w.start), e=parseFloat(w.end); return { text:String(w.text!=null?w.text:''), start:s, end:(isFinite(e)&&e>=s)?e:s }; })
      .sort((a,b)=>a.start-b.start);
  }
  /* captions option + <body data-captions="karaoke|line|pop" data-captions-position="bottom|lower-third">:
       false / 'off' -> off (overrides the body attribute); true / {position} -> on, mode from the
       body attribute else karaoke; '<mode>' / {mode} -> that mode; not given -> the body attribute. */
  function _normCaptions(c){
    const MODES={karaoke:1,line:1,pop:1}, POS={bottom:1,'lower-third':1};
    const ds=(document.body && document.body.dataset) || {};
    const bodyMode=MODES[ds.captions] ? ds.captions : null;
    let mode=null;
    if(c===false) return null;
    if(c===true) mode=bodyMode||'karaoke';
    else if(typeof c==='string'){
      if(MODES[c]) mode=c;
      else if(/^(off|none|false|0|)$/i.test(c.trim())) return null;
      else { _warnOnce('captions:'+c, 'unknown captions mode "'+c+'" (karaoke|line|pop)'); mode=bodyMode; }
    }
    else if(c && typeof c==='object') mode=MODES[c.mode] ? c.mode : (bodyMode||'karaoke');
    else mode=bodyMode;
    if(!mode) return null;
    const position=(c && typeof c==='object' && POS[c.position]) ? c.position : (POS[ds.captionsPosition] ? ds.captionsPosition : 'bottom');
    return { mode, position };
  }
  function _resolveAudio(x){
    return _resolveEl(x) || document.getElementById('voAudio') || document.querySelector('[data-storyboard-audio]') || document.querySelector('audio');
  }
  let _resizeBound=false;
  function _bindAudio(){
    synthetic=false; synthPlaying=false;
    if(OFFLINE) return;                                   // offline: the audio element is never touched
    if(!voAudio){ activateSynthetic('no audio element'); return; }
    if(!voAudio._sbBound){
      voAudio._sbBound=true;
      voAudio.addEventListener('error',()=>{ if(!OFFLINE && voAudio.error) activateSynthetic('audio error'); });
      const late=()=>{ if(synthetic && voAudio.readyState>=1 && isFinite(voAudio.duration) && voAudio.duration>0) adoptAudioClock(); };
      voAudio.addEventListener('loadedmetadata', late); voAudio.addEventListener('canplay', late);
      voAudio.addEventListener('play', ()=>{ if(!synthetic && !OFFLINE){ _onPlayUI(); _loop(); } });
      voAudio.addEventListener('pause', ()=>{ if(!synthetic && !OFFLINE){ pausedT=voAudio.currentTime||0; _onPauseUI(); } });
      voAudio.addEventListener('ended', ()=>{ if(synthetic || OFFLINE) return; pausedT=voAudio.currentTime||duration(); _onPauseUI(); renderFrame(pausedT); if(progress) progress.style.width='100%'; });
      // Paused + the user scrubs native <audio controls>: follow it. The engine's own seeks
      // (seek/renderAt/play) already rendered their frame and are ignored here, so frame
      // content never waits for — or is overridden by — an async 'seeked' (e.g. a server
      // without Range support snapping the audio back to 0).
      voAudio.addEventListener('seeked', ()=>{
        if(synthetic || OFFLINE || !initialized || isPlaying()) return;
        if(performance.now()-_ownSeekAt < 1500) return;
        const at=voAudio.currentTime||0; if(Math.abs(at-pausedT)<0.02) return;
        pausedT=at; renderFrame(at);
      });
    }
    if(voAudio.error) activateSynthetic('audio error');
    else setTimeout(()=>{ if(!OFFLINE && voAudio.readyState===0 && !(voAudio.duration>0)) activateSynthetic('no audio source'); }, 1200);
  }

  function init(opts){
    opts=opts||{};
    OFFLINE=_isOffline();
    cancelAnimationFrame(rafId); rafId=0;
    // --- root + slides
    const sel=(typeof opts.slideSelector==='string' && opts.slideSelector) || '.slide';
    deck=_resolveEl(opts.root) || document.getElementById('deck') || document.querySelector('.deck');
    if(opts.slides && typeof opts.slides.length==='number' && typeof opts.slides!=='string') allSlides=Array.from(opts.slides).filter(n=>n && n.nodeType===1);
    else {
      try{ allSlides=deck ? [...deck.querySelectorAll(sel)] : []; if(!allSlides.length) allSlides=[...document.querySelectorAll(sel)]; }
      catch(e){ console.warn('[storyboard] bad slideSelector', sel, e); allSlides=[]; }
    }
    if(!deck) deck=(allSlides[0] && allSlides[0].parentElement) || document.body;
    SLIDE_SET=new Set(allSlides); _slideCache=new WeakMap(); SLIDE_NUM=new Map(); SLIDE_BY_NUM=new Map();
    allSlides.forEach((s,i)=>{ const n=parseInt(s.dataset && s.dataset.slide,10), num=(n>=1)?n:i+1; SLIDE_NUM.set(s,num); if(!SLIDE_BY_NUM.has(num)) SLIDE_BY_NUM.set(num,s); });
    // --- data
    TIMINGS=_normTimings(opts.timings);
    SLIDE_LABELS=Array.isArray(opts.labels)?opts.labels:[];
    WORD_HITS=_normHits(opts.wordHits);
    WORDS=_normWords(opts.words);
    CAPTIONS=_normCaptions(opts.captions);
    const fd=parseFloat(opts.fallbackDuration); FALLBACK_DURATION=(isFinite(fd) && fd>0)?fd:null;
    SCALE_DECK=opts.scaleDeck!==false;
    INITIAL_TIMINGS_HASH=TIMINGS.map(t=>t.slide+':'+t.time.toFixed(2)).join(',');
    voAudio=_resolveAudio(opts.audio);
    // --- stage
    if(SCALE_DECK){ scaleToFit(); if(!_resizeBound){ _resizeBound=true; window.addEventListener('resize',()=>{ if(SCALE_DECK) scaleToFit(); }); } }
    ensureTransitionOverlay();
    buildUI();
    setupPresentationMode();
    _indexCues(); resolveSchedule(); resolveCameras(); _resolveTransitions();
    bindKeys();
    initialized=true;
    if(CALIB.loadSaved()) buildJumpMenu();
    _bindAudio();
    pausedT=0; currentSlide=0; renderFrame(0);

    Storyboard.cues=TIMINGS; Storyboard.calib=CALIB; Storyboard.presets=Object.keys(PRESETS);
    Storyboard.words=WORDS; Storyboard.captions=CAPTIONS; Storyboard.wordHits=WORD_HITS;
    if(_initResolve){ _initResolve(); _initResolve=null; }
    return Storyboard;
  }

  const Storyboard = {
    VERSION, init, EASE, PRESETS, LOOPS, EXITS, TRANSITIONS,
    layerOrder: LAYER_ORDER,           // compositor stacking order, innermost first
    play, pause, reset, seek, renderAt, ready, duration, events, meta,
    time:()=>getTime(), isPlaying:()=>isPlaying(),
    transitions:()=>Object.keys(TRANSITIONS),
    goToSlide, jumpToSlide, jumpToCue,
    currentSlide:()=>currentSlide,
    isSynthetic:()=>synthetic,
    isOffline:()=>OFFLINE,
    audioLevel:(t)=>_levelAt(_sanT(t)),
    onFrame(fn){ if(typeof fn!=='function') return ()=>{}; FRAME_HOOKS.push(fn); return ()=>{ const i=FRAME_HOOKS.indexOf(fn); if(i>=0) FRAME_HOOKS.splice(i,1); }; },
    registerPreset(name,def){ PRESETS[name]=def; if(initialized){ resolveSchedule(); renderFrame(lastT); } },
    registerEase(name,fn){ EASE[name]=fn; },
    registerTransition(name,def){
      if(typeof def==='function') def={ dur:0.7, render:def };
      if(!name || !def || typeof def.render!=='function'){ console.warn('[storyboard] registerTransition(name, {dur, render(p,out,inn,overlay)})'); return false; }
      TRANSITIONS[name]={ dur:Math.max(0,parseFloat(def.dur)||0), render:def.render };
      if(initialized){ _resolveTransitions(); renderFrame(lastT); }
      return true;
    },
    defineCharacter,
    characters:()=>Object.keys(_CHAR_STYLES),
    cues:[], words:[], captions:null, wordHits:[],
  };

  global.Storyboard = Storyboard;
  global.STORYBOARD = Storyboard;      // back-compat alias (same object)
})(typeof window!=='undefined'?window:this);
