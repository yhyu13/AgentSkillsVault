#!/usr/bin/env python3
"""content.json + measured TTS chunks -> plan.json (shots, marks, subtitles, actions, SFX cues) + assets/voice.wav.

Time has one source: the measured speech (assets/tts/manifest.json from tts.py). Each shot lasts as long as
its narration plus a lead-in and a tail. A narration chunk with "mark": "x" pins the visual beat "x" to the
moment that sentence starts, so pictures land on the words that say them.

  python3 make_timeline.py --project ./film [--content content.json] [--fps 30] [--width 1920 --height 1080]
                           [--transitions alternate|wipe|slide] [--style default|repo|hybrid] [--repo PATH]

plan.json keeps any existing top-level fields (e.g. from init_project.py) and overwrites the timeline ones.
"""
import argparse, json, re, wave
from pathlib import Path

# measured SFX landmarks (scripts/sfx_landmarks.py on assets/audio/sfx): peak for whoosh/sweep/ding/resolve/success,
# onset for clicks. A cue starts landmark-seconds early so the audible hit lands on the action.
LM = {'whoosh': .202, 'sweep': .342, 'ding-dong': .206, 'resolve': .232, 'success': .213, 'error': .2,
      'pop': .001, 'click': .001, 'click-alt': .001, 'toggle': .001, 'typing': .001}
GAIN = {'whoosh': 1.6, 'sweep': 1.4, 'ding-dong': .9, 'resolve': 1.0, 'success': 1.0, 'error': 1.0,
        'pop': 1.3, 'click': 1.6, 'click-alt': 1.6, 'toggle': 1.4, 'typing': 1.2}
# Default action beats per shot kind: (suffix, seconds-after-start | ('mark', name, offset), description, sfx).
# Mark-based beats are skipped when the shot has no such mark.
KIND_ACTIONS = {
    'intro':  [('title-lands', .9, '标题和日期落定', 'ding-dong')],
    'status': [('stat', 1.45, '关键数字滚动落定', 'click'), ('handles', 2.2, '来源账号逐字打出', 'typing')],
    'math':   [('stat', 1.45, '关键数字滚动落定', 'click'), ('aside', ('mark', 'aside', 0), '旁注卡片出现', 'pop')],
    'price':  [('hot', ('mark', 'price', 0), '高亮价格条点亮为橙色', 'toggle')],
    'rank':   [('hot', ('mark', 'bars', .24), '高亮条落定', 'click'), ('pull', ('mark', 'pull', 0), '引语出现', 'toggle')],
    'money':  [('num', .8, '金额滚动落定', 'click'), ('verified', ('mark', 'verified', 0), '核实印章落定，条款依次出现', 'success')],
    'agents': [('shop', ('mark', 'shop', 0), '最后一个标签点亮为橙色', 'click-alt'), ('card', ('mark', 'card', 0), '信息卡出现', 'toggle'),
               ('rumor', ('mark', 'rumor', 0), '印章弹出', 'pop')],
    'outro':  [('lockup', .7, '结尾落版', 'resolve')],
}
SERIAL = {'steps': ('s', '第 {} 步入场', 'typing'), 'radar': ('r', '第 {} 行的最高数据点亮', 'click-alt')}
LEAD = {'intro': 1.0}; TAIL = {'outro': 1.8}
DEFAULT_LEAD, DEFAULT_TAIL, GAP = .32, .36, .08
SHOT_KEYS = ['id', 'type', 'headlineEn', 'headline', 'description', 'claim', 'source']


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, default=Path('.'))
    ap.add_argument('--content', type=Path)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--width', type=int, default=1920)
    ap.add_argument('--height', type=int, default=1080)
    ap.add_argument('--transitions', choices=['alternate', 'wipe', 'slide'], default='alternate',
                    help='transition into each shot after the first; a shot can override with "transition"')
    ap.add_argument('--style', choices=['repo', 'default', 'hybrid'], help='plan.style (default: keep existing, else default)')
    ap.add_argument('--repo', help='plan.repo for style repo/hybrid')
    ap.add_argument('--music-gain', type=float, default=.55)
    a = ap.parse_args()
    P = a.project.resolve()
    C = json.loads((a.content or P/'content.json').read_text(encoding='utf-8'))
    man = json.loads((P/'assets/tts/manifest.json').read_text(encoding='utf-8'))
    M = man['chunks'] if isinstance(man, dict) else man
    FPS = a.fps
    snap = lambda t: round(round(t*FPS)/FPS, 4)

    shots, subs, cues, voice = [], [], [], []
    t = 0.0
    for n, s in enumerate(C['shots']):
        start = snap(t)
        chunks = [m for m in M if m['shot'] == s['id']]
        narr = s.get('narration', [])
        if len(chunks) != len(narr): raise SystemExit(f'manifest stale for {s["id"]}: rerun tts.py')
        v = start + LEAD.get(s['kind'], DEFAULT_LEAD)
        marks, rel, extra = {}, [], []
        for ch, m in zip(narr, chunks):
            if ch['tts'] != m['tts']: raise SystemExit('manifest stale: rerun tts.py')
            v = snap(v)
            if ch.get('mark'): marks[ch['mark']] = round(v - start, 3)
            if ch.get('sfx'): extra.append((ch.get('mark') or f'c{len(extra)}', v - start, ch.get('action', '画面随这句话变化'), ch['sfx']))
            voice.append((v, m['file']))
            rel.append({'at': round(v - start, 3), 'dur': m['dur']})
            subs.append({'shot': s['id'], 'start': v, 'end': v + m['dur'], 'text': ch['sub']})
            v += m['dur'] + GAP
        end = snap((v - GAP if narr else v) + TAIL.get(s['kind'], DEFAULT_TAIL))
        tr = None if n == 0 else s.get('transition') or (a.transitions if a.transitions != 'alternate' else ('wipe' if n % 2 else 'slide'))
        shot = {k: s[k] for k in SHOT_KEYS if k in s}
        shot.setdefault('claim', False); shot.setdefault('source', [])
        shot.update(start=start, end=end, kind=s['kind'], transitionIn=tr, plainExplanation=s.get('description', ''),
                    descriptionAt=.4, component='src/shots/news.jsx', marks=marks, chunks=rel,
                    data={k: x for k, x in s.items() if k not in SHOT_KEYS + ['narration', 'kind', 'transition']})
        acts = []

        def act(aid, at, desc, kind):
            at = snap(at)
            acts.append({'id': aid, 'at': at, 'action': desc, 'soundRequired': kind is not None})
            if kind:
                if kind not in LM: raise SystemExit(f'unknown sfx "{kind}" (use one of {sorted(LM)})')
                cues.append({'at': round(start + at - LM[kind], 4), 'syncOffset': LM[kind], 'actionId': aid,
                             'file': f'assets/sfx/{kind}.wav', 'gain': GAIN[kind], 'role': 'sfx', 'kind': kind})
        if n > 0:
            act(f'{s["id"]}-enter', 0.0, '转场：橙色擦除盖满画面后揭开' if tr == 'wipe' else '转场：上一屏退出，新内容上推',
                'whoosh' if tr == 'wipe' else 'sweep')
        for suf, when, desc, kind in KIND_ACTIONS.get(s['kind'], []):
            if isinstance(when, tuple):
                if when[1] not in marks: continue
                when = marks[when[1]] + when[2]
            act(f'{s["id"]}-{suf}', when, desc, kind)
        if s['kind'] in SERIAL:
            pre, desc, kind = SERIAL[s['kind']]
            for name in sorted((k for k in marks if re.fullmatch(pre + r'\d+', k)), key=lambda k: int(k[1:])):
                act(f'{s["id"]}-{name}', marks[name], desc.format(int(name[1:]) + 1), kind)
        for name, at, desc, kind in extra:  # chunk-level "sfx": extra beat on that sentence
            act(f'{s["id"]}-{name}-sfx', at, desc, kind)
        ids = [x['id'] for x in acts]
        if len(ids) != len(set(ids)): raise SystemExit(f'duplicate action ids in {s["id"]}: {ids}')
        shot['actions'] = sorted(acts, key=lambda x: x['at'])
        shots.append(shot)
        t = end
    duration = snap(t)
    for i, sb in enumerate(subs):  # hold each line until the next one (same shot) or shortly before the cut
        sh = next(x for x in shots if x['id'] == sb['shot'])
        nxt = subs[i+1]['start'] if i+1 < len(subs) and subs[i+1]['shot'] == sb['shot'] else min(sb['end'] + .3, sh['end'] - .05)
        sb['end'] = round(nxt, 3); sb['start'] = round(sb['start'], 3)

    plan_p = P/'plan.json'
    plan = json.loads(plan_p.read_text(encoding='utf-8')) if plan_p.exists() else {}
    style = a.style or plan.get('style') or 'default'
    plan.update({'demo': False, 'product': C.get('title', 'News video'), 'style': style,
                 'repo': a.repo if a.repo is not None else (plan.get('repo') if style != 'default' else None),
                 'width': a.width, 'height': a.height, 'fps': FPS, 'duration': duration, 'audioRequired': True, 'sfxRequired': True,
                 'brand': C.get('brand', {}),
                 'scope': {'content': C.get('sourceNote', ''), 'date': C.get('date', ''), 'platforms': C.get('platforms', [])},
                 'typography': C.get('typography') or {'mode': 'bilingual', 'zhFont': 'Noto Sans SC', 'enFont': 'Inter', 'monoFont': 'IBM Plex Mono', 'zhStyle': 'sans-serif'},
                 'voice': {'file': 'assets/voice.wav', 'engine': f"edge-tts {man.get('voice', '?') if isinstance(man, dict) else '?'} rate {man.get('rate', '?') if isinstance(man, dict) else '?'}"},
                 'subtitles': subs, 'shots': shots,
                 'audio': {'ducking': {'enabled': True}, 'music': {'file': 'assets/music.wav', 'gain': a.music_gain}, 'cues': cues}})
    plan_p.write_text(json.dumps(plan, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    import numpy as np
    R = 48000; N = int(round(duration*R)); buf = np.zeros(N, dtype=np.float32)
    for at, f in voice:
        with wave.open(str(P/f)) as w:
            sw = w.getsampwidth(); raw = w.readframes(w.getnframes())
        x = np.frombuffer(raw, dtype=np.int16).astype(np.float32)/32768 if sw == 2 else np.frombuffer(raw, dtype=np.float32)
        o = int(round(at*R)); x = x[:max(0, N-o)]; buf[o:o+len(x)] += x
    with wave.open(str(P/'assets/voice.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes((np.clip(buf, -1, 1)*32767).astype(np.int16).tobytes())
    print(json.dumps({'duration': duration, 'shots': [(s['id'], s['start'], s['end']) for s in shots], 'cues': len(cues)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
