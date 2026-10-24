#!/usr/bin/env python3
"""Turn a fresh skill workspace (scripts/init_project.py) into a narrated news-brief film project.

Copies overlay/ (news shot views, frame CSS, subtitles + progress rail, voiceMix-aware render.mjs, poster.mjs)
over the project, copies the skill's built-in SFX into assets/sfx, fetches the OFL fonts the frame CSS uses
into public/fonts, and optionally seeds content.json. Only the target project is written; the skill bundle
is never modified.

  python3 apply_overlay.py --project ./film [--content my-content.json | --example] [--fonts-dir DIR] [--no-fonts]
"""
import argparse, shutil, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]          # extras/news-video
SKILL = HERE.parents[1]                             # skill root
FONTS = {  # Google Fonts repo, SIL Open Font License
    'Inter-VF.ttf': 'ofl/inter/Inter%5Bopsz,wght%5D.ttf',
    'NotoSansSC-VF.ttf': 'ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf',
    'IBMPlexMono-Regular.ttf': 'ofl/ibmplexmono/IBMPlexMono-Regular.ttf',
    'IBMPlexMono-Medium.ttf': 'ofl/ibmplexmono/IBMPlexMono-Medium.ttf',
    'IBMPlexMono-SemiBold.ttf': 'ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf',
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--project', type=Path, required=True)
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--content', type=Path, help='copy this content.json into the project')
    g.add_argument('--example', action='store_true', help='seed content.json from content.example.json')
    ap.add_argument('--fonts-dir', type=Path, help='take fonts from this folder instead of downloading')
    ap.add_argument('--no-fonts', action='store_true')
    a = ap.parse_args()
    P = a.project.resolve()
    if not (P/'src/engine.js').is_file() or not (P/'render.mjs').is_file():
        ap.error('not a skill workspace; run scripts/init_project.py --output <dir> --style default first')
    if P == SKILL or SKILL in P.parents:
        ap.error('project must be outside the skill bundle')
    for f in sorted((HERE/'overlay').rglob('*')):
        if f.is_file():
            dst = P/f.relative_to(HERE/'overlay'); dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(f, dst)
            print('overlay', dst.relative_to(P))
    sfx = P/'assets/sfx'; sfx.mkdir(parents=True, exist_ok=True)
    for w in (SKILL/'assets/audio/sfx').glob('*.wav'): shutil.copy2(w, sfx/w.name)
    for name in ['evidence', 'renders', 'public']: (P/name).mkdir(exist_ok=True)
    if a.content: shutil.copy2(a.content, P/'content.json')
    if a.example: shutil.copy2(HERE/'content.example.json', P/'content.json')
    if not a.no_fonts:
        fd = P/'public/fonts'; fd.mkdir(parents=True, exist_ok=True)
        for name, rel in FONTS.items():
            dst = fd/name
            if dst.exists(): continue
            if a.fonts_dir and (a.fonts_dir/name).exists(): shutil.copy2(a.fonts_dir/name, dst); continue
            url = 'https://github.com/google/fonts/raw/main/' + rel
            try:
                with urllib.request.urlopen(url, timeout=120) as r: dst.write_bytes(r.read())
                print('font', name)
            except Exception as e:
                sys.exit(f'font download failed ({name}: {e}); put the file in public/fonts or pass --fonts-dir')
    if not (P/'public/poster.png').exists():  # placeholder until `node poster.mjs` captures the real poster
        import base64
        (P/'public/poster.png').write_bytes(base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAwAI/AL+hc2rNAAAAABJRU5ErkJggg=='))
    print('ready:', P)


if __name__ == '__main__':
    main()
