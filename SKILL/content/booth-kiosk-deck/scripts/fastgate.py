"""快闸：<30 秒断言一轮，无截图。用法：

  python fastgate.py --url file:///path/slides.html --forbidden 申沃,某客户
  python fastgate.py --url http://localhost:3000 --skip-audio

通过打印 RESULT: PASS 并退出 0；任何一项失败退出 1。
"""
import argparse
import sys

from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--url', required=True)
ap.add_argument('--wait', type=float, default=3.0, help='加载后等待秒数')
ap.add_argument('--forbidden', default='', help='逗号分隔禁词，逐个检查画面文字')
ap.add_argument('--skip-audio', action='store_true', help='无口播的 deck 跳过音频断言')
args = ap.parse_args()

fails = []


def check(name, ok, detail=''):
    print(('PASS  ' if ok else 'FAIL  ') + name + (('  ' + str(detail)) if detail else ''))
    if not ok:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    # 拦 Audio 构造器：new Audio() 不进 DOM，只能这样取真值
    pg.add_init_script(
        "window.__audios=[];const A=window.Audio;"
        "window.Audio=function(s){const x=new A(s);window.__audios.push(x);return x;};")
    errs = []
    pg.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto(args.url)
    pg.wait_for_timeout(int(args.wait * 1000))

    check('console/JS 无错误', not errs, '; '.join(errs[:3]))

    if not args.skip_audio:
        au = pg.evaluate(
            "window.__audios.length ? [window.__audios[0].volume,"
            " window.__audios[0].muted, !window.__audios[0].paused] : null")
        check('口播有声且 100% 音量', au == [1, False, True], au)

    body = pg.inner_text('body')
    bad = [w for w in args.forbidden.split(',') if w.strip() and w.strip() in body]
    check('禁词不出现在画面', not bad, bad)

    overflow = pg.evaluate("""() => {
      const bad = [];
      document.querySelectorAll('.panel,.card,.st,.eg-prob,.eg-body').forEach(el => {
        const slide = el.closest('.slide');
        if (!slide || getComputedStyle(slide).visibility === 'hidden') return;
        const r = el.getBoundingClientRect(), pr = slide.getBoundingClientRect();
        if (r.bottom > pr.bottom + 2 || r.right > pr.right + 2) bad.push(el.id || el.className);
      });
      return bad; }""")
    check('可见面板不溢出舞台', not overflow, overflow)

    b.close()

print('RESULT:', 'PASS' if not fails else 'FAIL x' + str(len(fails)))
sys.exit(1 if fails else 0)
