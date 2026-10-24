import React from 'react';
import {Split, reveal} from '../kit/text.jsx';
import gsap from 'gsap';
import {shot, shots, onRender} from '../engine.js';

// ---------- shared pieces ----------
// .in = timed entrance. data-at: seconds after shot start, or data-mark: a narration mark (+data-off).
const In = ({fx = 'up', at, mark, off = 0, className = '', children, style}) =>
  <div className={'in ' + className} data-fx={fx} data-at={at} data-mark={mark} data-off={off} style={style}>{children}</div>;
const Count = ({to, dec = 0, comma = false, at = 0.9, dur = 0.6, prefix = ''}) =>
  <span className="count" data-to={to} data-dec={dec} data-comma={comma ? 1 : 0} data-at={at} data-dur={dur} data-prefix={prefix}>{prefix}{fmt(to, dec, comma)}</span>;
const fmt = (v, dec, comma) => { const s = Number(v).toFixed(dec); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s; };
const Head = ({s}) => <>
  <div className="h-en en"><Split text={s.headlineEn} by="word" lang="en" /></div>
  <div className="h-zh"><Split text={s.headline} lang="zh-CN" /></div>
</>;
const Idx = ({s}) => <div className="col-idx">
  <div className="idx en">{s.data.idx}</div>
  <div className="cat">{s.data.cat}</div><div className="cat-rule" />
</div>;
const Side = ({s, at = 0.7}) => {
  const q = s.data.quote, handles = s.data.handles || [];
  return <div className="col-side">
    {q && <In fx="left" at={at} className="quote">
      <div className="q-lab">{q.handle.includes('.com') ? '报道原文链接' : '原推摘录'}</div>
      <div className="q-meta">{q.handle} · {q.time}</div>
      <div className={'q-text' + (q.handle.includes('.com') ? ' url' : '')}>{q.text}</div>
    </In>}
    <div className="src"><b>SOURCE</b><span className="type" data-text={handles.join(' · ')} data-at={at + 1.2} data-cps="34" /><span className="caret" /></div>
  </div>;
};
const Frame = ({s, children, side = true}) => <div className="stage"><Idx s={s} /><div className="col-main"><Head s={s} />{children}</div>{side && <Side s={s} />}</div>;

// ---------- views ----------
const isLatin = t => /^[\x00-\x7F’]+$/.test(t);
export function IntroView({shot: s}) {
  const d = s.data;
  return <div className="intro">
    <div className="kick"><span className="sq" />{d.kick}</div>
    <div className="big"><span className="t-ai en">{d.titleEn || ''}</span><span className="t-zh">{d.titleZh || s.headline}</span></div>
    <div className="date"><div className="d en">{d.dateNum}</div><div className="dz">{d.dateZh}</div></div>
    <div className="en-sub en">{d.enSub || s.headlineEn}</div>
    <div className="facts">
      {d.facts.map(([n, l], i) =>
        <In key={i} fx="up" at={0.45 + i * 0.1} className="f"><div className="n en">{n}</div><div className="l">{l}</div></In>)}
    </div>
  </div>;
}
export function OutroView({shot: s}) {
  const d = s.data;
  return <div className="intro outro">
    <div className="kick"><span className="sq" />{s.data.kick}</div>
    <div className="big"><Split text={d.big || s.headline} lang="zh-CN" /></div>
    <div className="en-sub en">{d.enSub || s.headlineEn}</div>
    <div className="sweep" />
    <div className="foot">{(d.foot || []).map((f, i) => <span key={i}>{f}</span>)}</div>
  </div>;
}
const Stat = ({st}) => <In at={0.85} className="blk stat"><span className="num"><Count to={st.to} comma={!!st.comma} at={0.85} dur={0.6} /></span><span className="unit">{st.unit}</span><span className="lbl">{st.label}</span></In>;
const Ledger = ({rows, defMark, style}) => <div className="blk ledger" style={style}>{rows.map((r, i) =>
  <In key={i} fx="left" mark={r.mark || defMark} off={r.mark ? -0.05 : i * 0.12 - 0.1} className={'row' + (r.hot ? '' : ' dim')}>
    {r.hot && <span className="mark" />}<span className={'k ' + (isLatin(r.k) ? 'en' : 'zh')}>{r.k}</span><span className="v">{r.v}</span></In>)}</div>;
export function StatusView({shot: s}) {
  const d = s.data;
  return <Frame s={s}><Stat st={d.stat} /><Ledger rows={d.rows} defMark="rows" /></Frame>;
}
export function AgentsView({shot: s}) {
  const d = s.data;
  return <Frame s={s}>
    <div className="blk chips">{d.chips.map((c, i) => <In key={i} fx="pop" at={0.9 + i * 0.35} className={'chip ' + (isLatin(c) ? 'en' : 'zh')}>{c}</In>)}</div>
    <In mark="card" off={-0.1} className="blk card-ink">
      <div className="nm en">{d.card.name}</div><div className="by">{d.card.by}</div>
      <div className="facts">{d.card.facts.map((f, i) => <span key={i}>{f}</span>)}</div>
    </In>
    <In fx="stamp" mark="rumor" className="blk rumor"><span className="tag">{d.rumorTag}</span><span className="txt">{d.rumor}</span></In>
  </Frame>;
}
export function PriceView({shot: s}) {
  const d = s.data, max = Math.max(...d.prices.map(p => p.v));
  return <Frame s={s}>
    <div className="blk pbars">{d.prices.map((p, i) =>
      <div key={i} className={'pbar' + (p.hot ? ' hot' : '')} data-hot={p.hot ? 1 : 0}>
        <span className="k">{p.k}</span>
        <div className="track"><div className="fill in" data-fx="grow" data-at={0.9 + i * 0.2} style={{width: Math.max(10, (p.v / max) * 400) + 'px'}} />
          <span className="val en"><Count to={p.v} dec={2} prefix="$" at={0.9 + i * 0.2} dur={0.5} /></span></div>
      </div>)}
      <In at={1.8} className="pnote">{d.priceNote}</In>
    </div>
  </Frame>;
}
export function RankView({shot: s}) {
  const d = s.data, max = Math.max(...d.bars.map(b => b.v));
  return <Frame s={s}>
    <div className="blk rank">{d.bars.map((b, i) =>
      <In key={i} fx="left" mark="bars" off={i * 0.14} className={'rrow' + (b.hot ? ' hot' : '')}>
        <span className="k en">{b.k}</span>
        <div className="bar in" data-fx="grow" data-mark="bars" data-off={i * 0.14 + 0.1} style={{width: (b.v / max) * 330 + 'px'}} />
        <span className="v en">{b.v}</span>
      </In>)}</div>
    <In mark="pull" off={-0.05} className="blk pull sm"><span className="rule" /><div><div className="w">{d.pull.who}</div><div className="t">{d.pull.text}</div></div></In>
  </Frame>;
}
export function MathView({shot: s}) {
  const d = s.data;
  return <Frame s={s}>
    <Stat st={d.stat} />
    <div className="blk ledger" style={{marginTop: 30}}>{d.rows.map((r, i) =>
      <In key={i} fx="left" mark={i === 0 ? 'local' : 'verify'} off={-0.05} className={'row' + (r.hot ? '' : ' dim')}>
        {r.hot && <span className="mark" />}<span className="k en">{r.k}</span><span className="v">{r.v}</span></In>)}</div>
    <In fx="pop" mark="aside" className="blk aside" style={{marginTop: 28}}><span className="who">{d.aside.who}</span><span className="txt">{d.aside.text}</span><span className="tg">{d.aside.tag}</span></In>
  </Frame>;
}
export function StepsView({shot: s}) {
  const d = s.data;
  return <Frame s={s}>
    <In mark="tip" off={-0.1} className="blk tip">{d.tipTitle}</In>
    <div className="steps">{d.steps.map((t, i) =>
      <In key={i} fx="left" mark={'s' + i} off={-0.05} className="st"><span className="n en">0{i + 1}</span><span className="t">{t}</span></In>)}</div>
  </Frame>;
}
export function MoneyView({shot: s}) {
  const d = s.data;
  return <Frame s={s}>
    <div className="blk money" style={{marginTop: 48}}>
      {d.money.map((m, i) => <In key={i} at={0.8 + i * 0.5} className={'m' + (m.hot ? ' hot' : '')}><span className="num en"><Count to={m.to} prefix={m.prefix} at={0.8 + i * 0.5} dur={0.6} /></span><span className="unit">{m.unit}</span><div className="lbl">{m.label}</div></In>)}
    </div>
    <In at={1.9} className="mnote">{d.moneyNote}</In>
    <In fx="stamp" mark="verified" className="blk verified"><i />{d.verified}</In>
    <div className="terms">{d.terms.map((t, i) => <In key={i} fx="left" mark="verified" off={0.35 + i * 0.3} className="tm">{t}</In>)}</div>
  </Frame>;
}
export function RadarView({shot: s}) {
  const d = s.data;
  const cols = [['like', '赞'], ['reply', '评论'], ['bm', '收藏'], ['view', '浏览']];
  return <div className="stage">
    <div className="radar-head"><Head s={s} /></div>
    <div className="rtable">
      <In at={0.6} className="rt-row hd"><div>#</div><div>{d.tableHead}</div>{cols.map(([k, l]) => <div key={k} className="c">{l}</div>)}</In>
      {d.table.map((r, i) =>
        <In key={i} fx="left" at={0.75 + i * 0.15} className="rt-row" >
          <span className="rk en">{i + 1}</span><span className="tt">{r.t}</span>
          {cols.map(([k]) => <span key={k} className={'c en' + (r.hot === k ? ' hotc' : '')} data-hotmark={r.hot === k ? 'r' + i : undefined}>{r[k]}{r.hot === k && <span className="ul" />}</span>)}
        </In>)}
    </div>
    <In at={1.4} className="rnote"><span>{d.note}</span><span className="snap">{d.snap}</span></In>
  </div>;
}

// ---------- builders ----------
const q = (id, sel) => document.querySelector(`section[data-shot="${id}"] ${sel}`);
const qa = (id, sel) => [...document.querySelectorAll(`section[data-shot="${id}"] ${sel}`)];
const FX = {
  up: [{opacity: 0, y: 28}, {opacity: 1, y: 0, duration: .55, ease: 'expo.out'}],
  left: [{opacity: 0, x: -36}, {opacity: 1, x: 0, duration: .5, ease: 'expo.out'}],
  pop: [{opacity: 0, scale: .9}, {opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)'}],
  stamp: [{opacity: 0, scale: 1.25, rotation: -2}, {opacity: 1, scale: 1, rotation: 0, duration: .28, ease: 'power4.out'}],
  grow: [{scaleX: 0}, {scaleX: 1, duration: .6, ease: 'expo.out'}],
};
const timeOf = (s, el) => {
  const m = el.dataset.mark;
  const base = m ? s.marks[m] : Number(el.dataset.at || 0);
  if (m && base === undefined) throw new Error(`missing mark ${m} in ${s.id}`);
  return s.start + base + Number(el.dataset.off || 0);
};
export const buildShot = id => tl => {
  const s = shot(id), i = shots.indexOf(s), prev = shots[i - 1], sec = document.querySelector(`section[data-shot="${id}"]`);
  const B = s.start, L = s.end - s.start;
  // --- transition in (and the previous shot's exit) ---
  if (!prev) tl.set(sec, {opacity: 1}, 0);
  else if (s.transitionIn === 'wipe') {
    const w = document.querySelector(`.wipe[data-wipe="${id}"]`);
    gsap.set(w, {x: 0, xPercent: -101});
    tl.fromTo(w, {xPercent: -101}, {xPercent: 0, duration: .3, ease: 'power3.in', immediateRender: false}, B - .3);
    tl.fromTo(w.querySelector('.wnum'), {y: 60, opacity: 0}, {y: 0, opacity: 1, duration: .3, ease: 'expo.out', immediateRender: false}, B - .2);
    tl.to(w, {xPercent: 101, duration: .38, ease: 'power3.out'}, B + .06);
    tl.set(document.querySelector(`section[data-shot="${prev.id}"]`), {opacity: 0}, B);
    tl.set(sec, {opacity: 1}, B);
  } else {
    const pst = document.querySelector(`section[data-shot="${prev.id}"] .stage`);
    if (pst) tl.to(pst, {opacity: 0, y: -26, duration: .26, ease: 'power2.in'}, B - .26);
    tl.set(document.querySelector(`section[data-shot="${prev.id}"]`), {opacity: 0}, B);
    tl.set(sec, {opacity: 1}, B);
    const st = sec.querySelector('.stage');
    if (st) tl.fromTo(st, {y: 46, opacity: 0}, {y: 0, opacity: 1, duration: .5, ease: 'expo.out', immediateRender: false}, B);
  }
  // chrome (masthead + progress rail) visible from the first numbered item until the outro
  const firstItem = shots.find(x => x.data && x.data.idx);
  if (firstItem && id === firstItem.id) { tl.fromTo(['.chrome', '.chrome-rule'], {opacity: 0}, {opacity: 1, duration: .01}, B); tl.fromTo('.chrome-rule', {scaleX: 0}, {scaleX: 1, duration: .8, ease: 'expo.out', immediateRender: false}, B + .05); }
  if (id === 'intro') tl.set(['.chrome', '.chrome-rule'], {opacity: 0}, 0);
  if (id === 'outro') tl.set(['.chrome', '.chrome-rule'], {opacity: 0}, B);
  // --- index, category, headline ---
  const idx = sec.querySelector('.idx');
  if (idx) tl.fromTo(idx, {y: 90, opacity: 0, filter: 'blur(10px)'}, {y: 0, opacity: 1, filter: 'blur(0px)', duration: .7, ease: 'expo.out'}, B + .08);
  const cat = sec.querySelector('.cat');
  if (cat) tl.fromTo(cat, {clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0% 0 0)', duration: .45, ease: 'power2.out'}, B + .3);
  const cr = sec.querySelector('.cat-rule');
  if (cr) tl.fromTo(cr, {scaleX: 0, transformOrigin: 'left center'}, {scaleX: 1, duration: .5, ease: 'expo.out'}, B + .35);
  const en = sec.querySelector('.h-en'), zh = sec.querySelector('.h-zh');
  if (en) reveal(tl, en, B + .18, {from: {opacity: 0, y: 14}, dur: .45, stagger: .04});
  if (zh) reveal(tl, zh, B + .32, {from: {opacity: 0, y: 30, filter: 'blur(8px)'}, dur: .6, stagger: .028});
  // --- timed blocks ---
  for (const el of sec.querySelectorAll('.in')) {
    const [from, to] = FX[el.dataset.fx || 'up'];
    tl.fromTo(el, from, {...to}, timeOf(s, el));
  }
  // --- slow push: the frame keeps breathing while the narrator reads ---
  const stage = sec.querySelector('.stage');
  if (stage) { const inner = stage; tl.fromTo(inner, {scale: 1}, {scale: 1.014, duration: L, ease: 'none', immediateRender: false}, B); }
  // --- kind-specific state changes ---
  if (s.kind === 'price' && s.marks.price !== undefined) {
    for (const hot of sec.querySelectorAll('.pbar[data-hot="1"]')) {
      tl.fromTo(hot.querySelector('.fill'), {backgroundColor: '#0a0a0a'}, {backgroundColor: '#FF6B35', duration: .2, immediateRender: false}, B + s.marks.price);
      tl.fromTo(hot.querySelector('.val'), {color: '#0a0a0a'}, {color: '#FF6B35', duration: .2, immediateRender: false}, B + s.marks.price);
      tl.fromTo(hot, {x: 0}, {x: 14, duration: .12, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false}, B + s.marks.price);
    }
  }
  if (s.kind === 'agents' && s.marks.shop !== undefined) {
    const chips = sec.querySelectorAll('.chip'), last = chips[chips.length - 1];
    tl.fromTo(last, {backgroundColor: 'rgba(255,107,53,0)', color: '#0a0a0a', borderColor: '#0a0a0a'}, {backgroundColor: 'rgba(255,107,53,1)', color: '#ffffff', borderColor: '#FF6B35', duration: .2, immediateRender: false}, B + s.marks.shop);
  }
  if (s.kind === 'radar') {
    for (const c of sec.querySelectorAll('[data-hotmark]')) {
      const t = B + s.marks[c.dataset.hotmark];
      tl.fromTo(c, {color: '#0a0a0a', scale: 1}, {color: '#FF6B35', scale: 1.08, duration: .25, ease: 'back.out(3)', immediateRender: false}, t);
      tl.fromTo(c.querySelector('.ul'), {scaleX: 0}, {scaleX: 1, duration: .35, ease: 'expo.out'}, t);
    }
  }
  if (s.kind === 'intro') {
    tl.fromTo(sec.querySelector('.t-ai'), {opacity: 0, x: -40}, {opacity: 1, x: 0, duration: .6, ease: 'expo.out'}, .05);
    tl.fromTo(sec.querySelector('.t-zh'), {opacity: 0, y: 50, filter: 'blur(14px)'}, {opacity: 1, y: 0, filter: 'blur(0px)', duration: .7, ease: 'expo.out'}, .2);
    tl.fromTo(sec.querySelector('.date .d'), {opacity: 0, y: -40}, {opacity: 1, y: 0, duration: .6, ease: 'expo.out'}, .35);
    tl.fromTo(sec.querySelector('.date .dz'), {opacity: 0}, {opacity: 1, duration: .4}, .6);
    tl.fromTo(sec.querySelector('.kick'), {opacity: 0}, {opacity: 1, duration: .4}, .1);
    tl.fromTo(sec.querySelector('.en-sub'), {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: .5, ease: 'expo.out'}, .5);
    tl.fromTo(sec.querySelector('.facts'), {borderTopColor: 'rgba(10,10,10,0)'}, {borderTopColor: 'rgba(10,10,10,1)', duration: .3}, .4);
    tl.fromTo(sec.querySelector('.intro'), {scale: 1}, {scale: 1.02, duration: L, ease: 'none', transformOrigin: '20% 30%'}, 0);
    tl.fromTo('#poster', {opacity: 1}, {opacity: 0, duration: .3, ease: 'none'}, .3);
  }
  if (s.kind === 'outro') {
    reveal(tl, sec.querySelector('.big'), B + .2, {from: {opacity: 0, y: 50, filter: 'blur(14px)'}, dur: .8, stagger: .08});
    tl.fromTo(sec.querySelector('.kick'), {opacity: 0}, {opacity: 1, duration: .4}, B + .1);
    tl.fromTo(sec.querySelector('.en-sub'), {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: .5, ease: 'expo.out'}, B + .5);
    tl.fromTo(sec.querySelector('.sweep'), {scaleX: 0}, {scaleX: 1, duration: .9, ease: 'expo.inOut'}, B + .35);
    tl.fromTo(sec.querySelector('.foot'), {opacity: 0}, {opacity: 1, duration: .5}, B + .9);
    tl.fromTo(sec.querySelector('.intro'), {scale: 1}, {scale: 1.035, duration: L, ease: 'none', transformOrigin: '20% 30%', immediateRender: false}, B);
  }
  // --- per-frame text: counters + typed source handles ---
  const counters = qa(id, '.count'), typers = qa(id, '.type');
  onRender(id, local => {
    for (const c of counters) {
      const a = Number(c.dataset.at), d = Number(c.dataset.dur), to = Number(c.dataset.to);
      const p = Math.min(1, Math.max(0, (local - a) / d)), e = 1 - Math.pow(1 - p, 3);
      c.textContent = c.dataset.prefix + fmt(to * e, Number(c.dataset.dec), c.dataset.comma === '1');
    }
    for (const el of typers) {
      const a = Number(el.dataset.at), n = Math.max(0, Math.floor((local - a) * Number(el.dataset.cps)));
      el.textContent = el.dataset.text.slice(0, n);
    }
  });
};
