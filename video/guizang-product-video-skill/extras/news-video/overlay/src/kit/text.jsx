import React from 'react';
// Split text into spans so GSAP can stagger it. Choose the unit that fits the film's voice:
// 'ch' (per CJK character; Latin words and numbers stay whole), 'word', or 'line'. '\n' forces a line break.
const TOKENS = /[A-Za-z0-9.$,%'’+\-\/]+|\s+|./gu;
export function Split({text, by = 'ch', className = '', lang}) {
  if (by !== 'line' && text.includes('\n')) return <span className={'split ' + className} lang={lang}>
    {text.split('\n').map((ln, j) => <span key={j} className="ln" style={{display: 'block'}}><Split text={ln} by={by} /></span>)}</span>;
  const parts = by === 'line' ? text.split('\n') : by === 'word' ? text.split(/(\s+)/) : (text.match(TOKENS) || []);
  return <span className={'split ' + className} lang={lang}>
    {parts.map((p, i) => /^\s+$/.test(p) ? <span key={i} className="sp"> </span> : <span key={i} className={'u u-' + by}>{p}</span>)}
  </span>;
}
/** Stagger the split units of `root` from `from` to rest. The from-state is the film's decision. */
export function reveal(tl, root, at, {from = {opacity: 0, y: 24, filter: 'blur(12px)'}, dur = 0.7, stagger = 0.035, ease = 'expo.out'} = {}) {
  const units = root.querySelectorAll('.u');
  const to = Object.fromEntries(Object.keys(from).map(k => [k, k === 'filter' ? 'blur(0px)' : k === 'opacity' || k === 'scale' ? 1 : 0]));
  tl.fromTo(units, from, {...to, duration: dur, ease, stagger}, at);
}
