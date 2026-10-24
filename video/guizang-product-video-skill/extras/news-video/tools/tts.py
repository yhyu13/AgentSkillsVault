#!/usr/bin/env python3
"""content.json narration -> one TTS clip per chunk (edge-tts) + assets/tts/manifest.json.

Each narration chunk is synthesised separately and trimmed of leading/trailing silence, so its measured
duration is the audible speech. Clips are cached by hash(voice + rate + text): re-running only renders
changed lines.

  python3 tts.py --project ./film [--content content.json] [--voice zh-CN-YunxiNeural] [--rate +20%]
"""
import argparse, asyncio, hashlib, json, subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, default=Path('.'), help='film project dir (from init_project.py)')
    ap.add_argument('--content', type=Path, help='content.json (default: <project>/content.json)')
    ap.add_argument('--voice', help='edge-tts voice; overrides content.voice (default zh-CN-YunxiNeural)')
    ap.add_argument('--rate', help='edge-tts rate such as +20%%; overrides content.rate (default +0%%)')
    ap.add_argument('--retries', type=int, default=4)
    a = ap.parse_args()
    try:
        import edge_tts
    except ImportError:
        ap.exit(1, 'edge-tts missing: pip install edge-tts\n')
    P = a.project.resolve()
    C = json.loads((a.content or P/'content.json').read_text(encoding='utf-8'))
    voice = a.voice or C.get('voice') or 'zh-CN-YunxiNeural'
    rate = a.rate or C.get('rate') or '+0%'
    out = P/'assets/tts'; out.mkdir(parents=True, exist_ok=True)

    async def one(text, path):
        for attempt in range(a.retries):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(str(path)); return
            except Exception as e:  # network hiccups are common; retry
                print('retry', attempt, e); await asyncio.sleep(2)
        raise SystemExit('TTS failed: ' + text)

    async def run():
        manifest = []
        for s in C['shots']:
            for i, ch in enumerate(s.get('narration', [])):
                h = hashlib.sha1((voice + rate + ch['tts']).encode()).hexdigest()[:12]
                mp3 = out/f'{s["id"]}-{i}-{h}.mp3'
                if not mp3.exists(): await one(ch['tts'], mp3)
                wav = mp3.with_suffix('.wav')
                if not wav.exists():
                    trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,' \
                           'silenceremove=start_periods=1:start_threshold=-45dB,areverse'
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-af', trim, '-ar', '48000', '-ac', '1', str(wav)], check=True)
                d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)]).strip())
                manifest.append({'shot': s['id'], 'i': i, 'file': str(wav.relative_to(P)), 'dur': round(d, 3), 'tts': ch['tts']})
        (out/'manifest.json').write_text(json.dumps({'voice': voice, 'rate': rate, 'chunks': manifest}, ensure_ascii=False, indent=1))
        print(json.dumps({'voice': voice, 'rate': rate, 'chunks': len(manifest), 'speech': round(sum(m['dur'] for m in manifest), 2)}, ensure_ascii=False))

    asyncio.run(run())


if __name__ == '__main__':
    main()
