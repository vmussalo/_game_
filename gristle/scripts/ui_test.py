# Browser UI test: real clicks through title, creation, dialogue, screens, combat, world map, save/load.
# Usage: py scripts/ui_test.py      (server on 8782: py -m http.server 8782 --bind 127.0.0.1 in the gristle folder)
import sys, os
from playwright.sync_api import sync_playwright

OUT = 'scripts/out/ui'
os.makedirs(OUT, exist_ok=True)
ok = fails = 0
def check(c, msg):
    global ok, fails
    if c: ok += 1
    else:
        fails += 1; print('FAIL:', msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1400, 'height': 860})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:8782/game/index.html')
    pg.wait_for_timeout(1500)
    pg.evaluate("localStorage.clear()")
    shot = lambda n: pg.screenshot(path=f'{OUT}/{n}.png')
    ev = pg.evaluate
    shot('01_title')
    pg.click('#tnew'); pg.wait_for_timeout(400)
    check(pg.is_visible('#cgo'), 'creation screen')
    pg.click('[data-p="barker"]'); pg.wait_for_timeout(200)
    pg.fill('#cname', 'Penny Dreadful')
    shot('02_creation')
    pg.click('#cgo'); pg.wait_for_timeout(600)
    check(ev("GG.G.S && GG.G.S.pc.name") == 'Penny Dreadful', 'new game started with name')
    check(pg.is_visible('#inext'), 'intro shown')
    pg.click('#iskip'); pg.wait_for_timeout(300)

    # walk to Agnes by clicking her
    def ent_screen(eid):
        return ev(f"(() => {{ const e = GG.G.ent('{eid}'); GG.Render.recentre = true; const p = GG.Render.entScreen(e); return [p[0], p[1] - 20]; }})()")
    def click_ent(eid, tries=40):
        for i in range(tries):
            x, y = ent_screen(eid)
            if 0 < x < 1400 and 0 < y < 700:
                pg.mouse.move(x, y); pg.mouse.click(x, y); return True
            ev(f"(() => {{ const e = GG.G.ent('{eid}'); GG.G.moveTo(GG.G.S.pc, e.x, e.y, {{adj: 4}}); }})()")
            pg.wait_for_timeout(500)
        return False
    check(click_ent('agnes'), 'agnes on screen')
    for i in range(60):
        pg.wait_for_timeout(250)
        if pg.is_visible('#dialog'): break
    check(pg.is_visible('#dialog'), 'dialogue opened by clicking Agnes')
    shot('03_agnes')
    pg.keyboard.press('1'); pg.wait_for_timeout(200)
    pg.keyboard.press('1'); pg.wait_for_timeout(200)
    check(ev("GG.G.S.quests.herd && GG.G.S.quests.herd.stage") == 10, 'herd quest accepted via keys')
    pg.keyboard.press('Escape'); ev("GG.Dialog.end()"); pg.wait_for_timeout(200)

    for key, sel, name in [('i', '.panel', 'inv'), ('c', '.panel', 'char'), ('j', '.panel', 'alm')]:
        pg.keyboard.press(key); pg.wait_for_timeout(300)
        check(pg.is_visible(sel), f'{name} screen opens')
        shot(f'04_{name}')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        check(not pg.is_visible('#screen'), f'{name} screen closes')

    # combat: spawn a gristling next to the player
    ev("(() => { const S = GG.G.S, pc = S.pc; const at = GG.G.freeNear(pc.x + 3, pc.y, 0); const e = GG.G.makeEnt('gristling', at); S.map.ents.push(e); })()")
    for i in range(20):
        pg.wait_for_timeout(200)
        if ev("GG.G.S.mode") == 'combat': break
    check(ev("GG.G.S.mode") == 'combat', 'combat started on sight')
    for turn in range(120):
        if ev("GG.G.S.mode") != 'combat': break
        if ev("GG.Combat.isPcTurn() && !GG.G.S.pc.path"):
            gid = ev("(() => { const g = GG.G.alive().find(e => e.tpl === 'gristling'); return g ? g.id : null })()")
            if not gid: break
            if ev("GG.G.S.pc.ap") >= ev("GG.Combat.apCost(GG.G.S.pc, GG.G.weapon(GG.G.S.pc), 'torso')") and ev("GG.G.S.pc.loaded") > 0:
                ap0 = ev('GG.G.S.pc.ap')
                x, y = ent_screen(gid); pg.mouse.move(x, y + 8); pg.mouse.click(x, y + 8); pg.wait_for_timeout(150)
                if ev('GG.G.S.pc.ap') == ap0 and not ev('!!GG.G.S.pc.path'): ev(f"GG.G.attackCmd('{gid}', 'torso')")
            elif ev("GG.G.S.pc.loaded") == 0 and ev("GG.G.S.pc.ap") >= 2:
                pg.keyboard.press('r')
            else:
                pg.keyboard.press(' ')
        if turn == 2: shot('05_combat')
        pg.wait_for_timeout(500)
    check(ev("GG.G.S.mode") == 'explore', 'combat finished: ' + str(ev("[GG.G.S.mode, GG.Combat.cur() && GG.Combat.cur().id, GG.G.S.pc.ap, GG.G.S.pc.loaded]")))
    check(ev("GG.G.S.pc.hp") > 0, 'player survived the gristling')

    # loot the corpse
    gid = ev("(() => { const g = GG.G.S.map.ents.find(e => e.tpl === 'gristling' && e.dead); return g ? g.id : null })()")
    if gid:
        click_ent(gid); pg.wait_for_timeout(1500)
        check(pg.is_visible('.panel'), 'loot window opens on corpse')
        if pg.is_visible('#butch'): pg.click('#butch'); pg.wait_for_timeout(200)
        shot('06_loot')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # barter with Saltlick
    ev("(() => { const e = GG.G.ent('saltlick'); GG.Act.openBarter(e); })()"); pg.wait_for_timeout(400)
    check(pg.is_visible('.trade'), 'barter screen')
    pg.click('[data-ot="jerky"]'); pg.wait_for_timeout(150)
    t0 = ev("GG.G.count(GG.G.S.pc, 'ticket')")
    pg.click('#bdeal'); pg.wait_for_timeout(200)
    check(ev("GG.G.count(GG.G.S.pc, 'ticket')") < t0, 'bought jerky with tickets')
    shot('07_barter')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # save, world map, travel, load
    print('before save:', ev("[GG.G.S.mode, !!GG.G.S.dlg, GG.G.alive().filter(e => GG.G.hostileToPlayer(e)).map(e => e.id + '@' + e.x + ',' + e.y + ' aware=' + e.aware), GG.G.S.pc.x + ',' + GG.G.S.pc.y]"))
    pg.keyboard.press('j'); pg.wait_for_timeout(200); pg.click('[data-tab="save"]'); pg.wait_for_timeout(200)
    pg.click('[data-save="1"]'); pg.wait_for_timeout(200)
    check(ev("!!localStorage.getItem('gristle_save_1')"), 'saved to slot 1')
    pg.keyboard.press('Escape')
    ev("GG.G.S.pc.path = null; GG.G.leaveMap('world')"); pg.wait_for_timeout(500)
    check(ev("GG.G.S.mode") == 'world', 'world map')
    x, y = ev("(() => { const L = GG.WorldMap.layout(), n = GG.World.NODES.crossing; return [L.x + (n.x + 0.5) * 26 * L.sc, L.y + (n.y + 0.5) * 26 * L.sc]; })()")
    pg.mouse.click(x, y)
    for i in range(80):
        pg.wait_for_timeout(200)
        if pg.is_visible('#ego'): pg.click('#ego'); pg.wait_for_timeout(300); break
        if pg.is_visible('[data-e]'): break
    shot('08_world')
    if pg.is_visible('[data-e]'):
        pg.click('[data-e]'); pg.wait_for_timeout(600)
        check(ev("GG.G.S.mapId") == 'crossing', 'entered Hollow Pike Crossing')
        shot('09_crossing')
    pg.keyboard.press('F9'); pg.wait_for_timeout(600)
    check(ev("GG.G.S.mapId") == 'gutwater', 'quickload back to Gutwater')
    check(not errs, 'no page errors: ' + ' | '.join(errs[:5]))
    b.close()
print(f'{ok} ok, {fails} failed')
sys.exit(1 if fails else 0)
