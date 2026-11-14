"""Elämänkoulu – käyttöliittymätesti oikeassa Chromessa (Playwright). Ei kuulu julkaistaviin tiedostoihin.

Käynnistä ensin palvelin elamankoulu-kansiossa:
    python -m http.server 8779 --bind 127.0.0.1
sitten:
    python scripts/ui_testi.py [kuvakansio]

Testaa: valikot näppäimistöllä, pelihallin ottelun reaaliajassa, liikesarjan näppäimillä (↓↘→ + isku),
tauon, harjoittelun, kaksinpelin kaksi näppäimistöpuoliskoa, hiiriklikkaukset ja kosketusohjauksen.
"""
import os, sys, time
from playwright.sync_api import sync_playwright

OSOITE = 'http://127.0.0.1:8779/peli/index.html'
KUVAT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(KUVAT, exist_ok=True)
virheita = 0


def ok(ehto, kuvaus):
    global virheita
    print(('  OK   ' if ehto else '  VIKA ') + kuvaus)
    if not ehto:
        virheita += 1


def tila(s, js):
    return s.evaluate(js)


def paina(s, k, ms=40):
    s.keyboard.down(k); s.wait_for_timeout(ms); s.keyboard.up(k); s.wait_for_timeout(30)


with sync_playwright() as p:
    selain = p.chromium.launch(channel='chrome')
    k = selain.new_context(viewport={'width': 1280, 'height': 720}, locale='fi-FI')
    s = k.new_page()
    virheet = []
    s.on('pageerror', lambda e: virheet.append(str(e)))
    s.on('console', lambda m: m.type == 'error' and virheet.append(m.text))
    s.goto(OSOITE + '?test')
    s.wait_for_timeout(600)
    ok(tila(s, 'EK.Game.name') == 'title', 'aloitusruutu avautuu')
    t0 = tila(s, 'EK.Game.t'); s.wait_for_timeout(500); t1 = tila(s, 'EK.Game.t')
    ok(20 < t1 - t0 < 55, 'pääsilmukka käy noin 60 ruutua sekunnissa (%d ruutua / noin 0,5 s)' % (t1 - t0))

    print('Pelihalli')
    paina(s, 'Enter')
    ok(tila(s, 'EK.Game.name') == 'select', 'Enter → hahmovalinta')
    paina(s, 'ArrowRight'); paina(s, 'ArrowLeft')
    paina(s, 'Enter')
    ok(tila(s, 'EK.Game.name') == 'vs', 'valinta → vastakkainasettelu')
    s.wait_for_timeout(450)
    paina(s, 'Enter')
    s.wait_for_function('EK.Game.name === "fight"', timeout=5000)
    ok(tila(s, 'EK.Game.name') == 'fight', 'ottelu alkaa (välinäytös ohitettu Enterillä)')
    s.wait_for_function('EK.Game.scene.b.phase === "fight"', timeout=8000)
    ok(True, 'erä käynnistyy (intro ja "NYT!")')
    x0 = tila(s, 'EK.Game.scene.b.f[0].x')
    s.keyboard.down('d'); s.wait_for_timeout(400); s.keyboard.up('d')
    x1 = tila(s, 'EK.Game.scene.b.f[0].x')
    ok(x1 > x0 + 40, 'D kävelee eteenpäin (%d → %d)' % (x0, x1))
    # ↓↘→ + J (Kuuma kuppi)
    s.evaluate('window.__moves = []; const b = EK.Game.scene.b; const st = b.step.bind(b); b.step = (a, c) => { st(a, c); const f = b.f[0]; if (f.state === "move" && f.mf === 1) window.__moves.push(f.move.id); };')
    s.keyboard.down('s'); s.wait_for_timeout(35)
    s.keyboard.down('d'); s.wait_for_timeout(35)
    s.keyboard.up('s'); s.wait_for_timeout(35)
    paina(s, 'j'); s.keyboard.up('d')
    s.wait_for_timeout(300)
    mv = tila(s, 'window.__moves')
    ok('s1L' in mv, '↓↘→ + J tekee Kuuman kupin (liikkeet: %s)' % mv)
    s.wait_for_timeout(800)  # kupin heiton palautuminen
    paina(s, 'k'); s.wait_for_timeout(400)
    ok('sM' in tila(s, 'window.__moves'), 'K tekee etupotkun')
    s.screenshot(path=os.path.join(KUVAT, 'ui_ottelu.png'))
    paina(s, 'Escape')
    ok(tila(s, 'EK.Game.scene.paused') is True, 'Esc pysäyttää')
    tp = tila(s, 'EK.Game.scene.b.frame'); s.wait_for_timeout(300)
    ok(tila(s, 'EK.Game.scene.b.frame') == tp, 'tauolla ottelu ei etene')
    s.screenshot(path=os.path.join(KUVAT, 'ui_tauko.png'))
    paina(s, 'ArrowDown'); paina(s, 'Enter')
    ok(tila(s, 'EK.Game.scene.showList') is True, 'liikelista aukeaa')
    s.screenshot(path=os.path.join(KUVAT, 'ui_liikelista.png'))
    paina(s, 'Enter'); paina(s, 'Escape')
    ok(tila(s, 'EK.Game.scene.paused') is False, 'jatka tauolta')
    # pelataan loppuun nopeasti: tietokone ohjaa myös pelaajaa
    s.evaluate('const sc = EK.Game.scene; sc.ctrl[0] = new EK.AI(sc.b, 0, 3, 5); sc.b.f[1].hp = 60;')
    s.wait_for_function('EK.Game.name === "result"', timeout=120000)
    ok(True, 'ottelu päättyy tulosnäkymään')
    s.wait_for_timeout(700)
    s.screenshot(path=os.path.join(KUVAT, 'ui_tulos.png'))
    q = tila(s, 'EK.Game.scene.quote')
    ok(bool(q), 'tulosnäkymässä elämänohje: ' + str(q))
    ok(tila(s, 'Object.keys(EK.Game.lessons).length') >= 1, 'ohje tallentui Opetuskirjaan')
    s.evaluate('EK.Input.versus = false; EK.Game.go("title")')

    print('Harjoittelu ja hiiri')
    s.wait_for_timeout(200)
    # klikataan valikosta "Harjoittelu" (3. rivi): loogiset koordinaatit → näytön koordinaatit
    box = s.evaluate('(() => { const r = document.getElementById("cv").getBoundingClientRect(); return [r.left, r.top, r.width / 960]; })()')
    s.mouse.click(box[0] + 480 * box[2], box[1] + (178 + 2 * 44 + 18) * box[2])
    s.wait_for_timeout(150)
    ok(tila(s, 'EK.Game.name') == 'select' and tila(s, 'EK.Game.scene.mode') == 'training', 'hiiriklikkaus avaa harjoittelun')
    paina(s, 'Enter'); paina(s, 'Enter'); paina(s, 'Enter')
    s.wait_for_function('EK.Game.name === "fight"', timeout=5000)
    ok(tila(s, 'EK.Game.scene.b.training') is True, 'harjoitteluottelu käynnissä')
    s.evaluate('EK.Game.scene.b.f[0].x = 700; EK.Game.scene.b.f[1].x = 770;')
    s.wait_for_timeout(100)
    paina(s, 'j'); s.wait_for_timeout(60); paina(s, 'k'); s.wait_for_timeout(400)
    ok(tila(s, 'EK.Game.scene.b.f[1].hp') < tila(s, 'EK.Game.scene.b.f[1].ch.hp') or tila(s, 'EK.Game.scene.b.stats[0].hits') > 0, 'isku osuu nukkeen')
    s.keyboard.down('i'); s.wait_for_timeout(200)
    ok(tila(s, 'EK.Game.scene.b.f[0].state') == 'parry', 'I = Hengitä')
    s.keyboard.up('i'); s.wait_for_timeout(300)
    s.keyboard.down('s'); s.keyboard.down('i'); s.wait_for_timeout(300)
    ok(tila(s, 'EK.Game.scene.b.f[0].state') == 'rest', 'S + I = Lepohetki')
    s.screenshot(path=os.path.join(KUVAT, 'ui_lepohetki.png'))
    s.keyboard.up('i'); s.keyboard.up('s')
    s.wait_for_timeout(400)
    s.screenshot(path=os.path.join(KUVAT, 'ui_oivallus_valmis.png'))
    s.evaluate('window.__ms = []; const b = EK.Game.scene.b; const st = b.step.bind(b); b.step = (a, c) => { st(a, c); const f = b.f[0]; if (f.state === "move" && f.mf === 1) window.__ms.push(f.move.id); };')
    s.keyboard.down('u'); s.keyboard.down('l'); s.wait_for_timeout(60); s.keyboard.up('u'); s.keyboard.up('l')
    s.wait_for_timeout(300)
    ok('sup' in tila(s, 'window.__ms'), 'U + L yhtä aikaa = OIVALLUS-superliike (%s)' % tila(s, 'window.__ms'))
    s.wait_for_timeout(200)
    s.screenshot(path=os.path.join(KUVAT, 'ui_oivallus.png'))
    s.evaluate('EK.Game.go("title")')

    print('Kaksinpeli samalla näppäimistöllä')
    s.evaluate('EK.Game.go("select", {mode: "versus"})')
    paina(s, 'd'); paina(s, 'f')          # P1 valitsee
    paina(s, 'ArrowLeft'); paina(s, 'j')  # P2 valitsee
    s.wait_for_timeout(100)
    ok(tila(s, 'EK.Game.name') == 'vs', 'molemmat valitsivat')
    s.wait_for_timeout(450)
    paina(s, 'Enter')
    s.wait_for_function('EK.Game.name === "fight" && EK.Game.scene.b.phase === "fight"', timeout=10000)
    a0 = tila(s, 'EK.Game.scene.b.f[0].x'); b0 = tila(s, 'EK.Game.scene.b.f[1].x')
    s.keyboard.down('d'); s.keyboard.down('ArrowLeft'); s.wait_for_timeout(500); s.keyboard.up('d'); s.keyboard.up('ArrowLeft')
    a1 = tila(s, 'EK.Game.scene.b.f[0].x'); b1 = tila(s, 'EK.Game.scene.b.f[1].x')
    ok(a1 > a0 + 30 and b1 < b0 - 30, 'P1 (WASD) ja P2 (nuolet) liikkuvat yhtä aikaa')
    s.evaluate('window.__m2 = []; const b = EK.Game.scene.b; const st = b.step.bind(b); b.step = (a, c) => { st(a, c); b.f.forEach(f => { if (f.state === "move" && f.mf === 1) window.__m2.push(f.idx + f.move.id); }); };')
    s.evaluate('EK.Game.scene.b.f[0].x = 500; EK.Game.scene.b.f[1].x = 900;')
    s.wait_for_timeout(50)
    paina(s, 'g'); s.wait_for_timeout(120); paina(s, 'l'); s.wait_for_timeout(400)
    m2 = tila(s, 'window.__m2')
    ok('0sM' in m2 and '1sH' in m2, 'P1 G = keski, P2 L = iso (%s)' % m2)
    s.screenshot(path=os.path.join(KUVAT, 'ui_kaksinpeli.png'))
    k.close()

    print('Kosketus')
    k2 = selain.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=2)
    m = k2.new_page()
    m.on('pageerror', lambda e: virheet.append(str(e)))
    m.goto(OSOITE + '?test')
    m.wait_for_timeout(400)
    m.evaluate('EK.Game.go("fight", {p1: "iida", p2: "jere", ctrl: [null, "dummy"], mode: "training", modern: [false, false], stage: "studio"})')
    m.wait_for_timeout(300)
    ok(m.is_visible('#touch'), 'kosketusohjaimet näkyvät')
    ok(tila(m, 'EK.Game.scene.b.f[0].modern') is True, 'kosketuksella moderni ohjaus')
    m.evaluate('window.__mt = []; const b = EK.Game.scene.b; const st = b.step.bind(b); b.step = (a, c) => { st(a, c); const f = b.f[0]; if (f.state === "move" && f.mf === 1) window.__mt.push(f.move.id); };')
    m.tap('#touch [data-b="S"]'); m.wait_for_timeout(900)
    m.tap('#touch [data-b="S+H"]'); m.wait_for_timeout(300)
    ok('sup' in tila(m, 'window.__mt'), 'OIVALLUS-kosketusnappi tekee superliikkeen')
    ok('s1M' in tila(m, 'window.__mt'), 'ERIKOIS-nappi tekee erikoisliikkeen (%s)' % tila(m, 'window.__mt'))
    m.screenshot(path=os.path.join(KUVAT, 'ui_kosketus.png'))
    k2.close()
    selain.close()

ok(not virheet, 'ei JavaScript-virheitä' + ('' if not virheet else ': ' + ' | '.join(virheet[:5])))
print('\nVirheitä: %d' % virheita)
sys.exit(1 if virheita else 0)
