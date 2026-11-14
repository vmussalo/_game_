# Screenshot + console errors from the browser game.
# Usage: py scripts/shot.py "test=1&map=sump" out.png [wait_ms] [width] [height] [js]
# Server: py -m http.server 8782 --bind 127.0.0.1   (in the gristle folder)
import sys, os
from playwright.sync_api import sync_playwright

qs = sys.argv[1] if len(sys.argv) > 1 else 'test=1'
out = sys.argv[2] if len(sys.argv) > 2 else 'scripts/out/shot.png'
wait = int(sys.argv[3]) if len(sys.argv) > 3 else 2500
W = int(sys.argv[4]) if len(sys.argv) > 4 else 1400
H = int(sys.argv[5]) if len(sys.argv) > 5 else 860
js = sys.argv[6] if len(sys.argv) > 6 else None
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H})
    errs = []
    pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
    pg.goto(f'http://127.0.0.1:8782/game/index.html?{qs}')
    pg.wait_for_timeout(wait)
    if js:
        print('JS:', pg.evaluate(js))
        pg.wait_for_timeout(1200)
    pg.screenshot(path=out)
    err = pg.evaluate("document.body.dataset.err || ''")
    if err: errs.append('[data-err] ' + err)
    print('\n'.join(errs[:30]) or 'no errors')
    b.close()
