import React, {useSyncExternalStore} from 'react';
import {ShotContext, FilmClock} from './film-store.js';
import {shots} from './engine.js';
import {SHOT_VIEWS} from './shots/index.js';
import plan from '../plan.json';
const useT = sel => useSyncExternalStore(FilmClock.subscribe, () => sel(FilmClock.get()), () => sel(0));
// numbered items (shots whose data carries an idx) drive the progress rail
const NEWS = shots.filter(s => s.data && s.data.idx);
const BRAND = plan.brand || {};

function Rail() {
  // discrete state: index of current item + progress quantised to 1/200 so React re-renders cheaply
  if (!NEWS.length) return null;
  const key = useT(t => {
    const i = NEWS.findIndex(s => t >= s.start && t < s.end);
    const after = t >= NEWS[NEWS.length - 1].end;
    const p = i >= 0 ? Math.round(((t - NEWS[i].start) / (NEWS[i].end - NEWS[i].start)) * 200) / 200 : 0;
    return (after ? 99 : i) + ':' + p;
  });
  const [ci, p] = key.split(':').map(Number);
  return <div className="rail">{NEWS.map((s, i) => {
    const past = ci === 99 || i < ci, cur = i === ci;
    return <div key={s.id} className={'seg' + (past ? ' past' : '') + (cur ? ' cur' : '')}>
      <div className="lab">{s.data.idx}</div>
      <div className="bar"><i style={{width: (past ? 100 : cur ? p * 100 : 0) + '%'}} /></div>
    </div>;
  })}</div>;
}
function Subtitles() {
  const text = useT(t => (plan.subtitles.find(s => t >= s.start && t < s.end) || {}).text || '');
  return <div className="subs"><div className="line">{text}</div></div>;
}
export function Film() {
  return <main id="film">
    {shots.map((s, i) => {
      const View = SHOT_VIEWS[s.kind];
      if (!View) throw new Error(`No view for shot kind "${s.kind}"`);
      return <section key={s.id} data-shot={s.id} className={'shot shot-' + s.kind} style={{zIndex: i + 1}}>
        <ShotContext.Provider value={s}><View shot={s} /></ShotContext.Provider>
      </section>;
    })}
    <div className="chrome">
      <div className="mast"><span className="sq" /><span className="name">{BRAND.name || ''}</span><span className="meta">{BRAND.meta || ''}</span></div>
      <Rail />
    </div>
    <div className="chrome-rule" />
    <div className="subs-rule" />
    <Subtitles />
    {shots.filter(s => s.transitionIn === 'wipe').map(s =>
      <div key={s.id} className="wipe" data-wipe={s.id}><span className="wnum">{s.data.idx || (s.kind === 'radar' ? 'X' : '')}</span></div>)}
    <img id="poster" src="poster.png" alt="" />
  </main>;
}
