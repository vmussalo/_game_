from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 860})
    pg.on('pageerror', lambda e: print('ERR', e))
    pg.goto('http://127.0.0.1:8782/game/index.html?test=1&at=28,24'); pg.wait_for_timeout(1200)
    ev = pg.evaluate
    ev("(() => { const S = GG.G.S, pc = S.pc; const at = GG.G.freeNear(pc.x + 3, pc.y, 0); S.map.ents.push(GG.G.makeEnt('gristling', at)); })()")
    for i in range(30):
        pg.wait_for_timeout(400)
        st = ev("(() => { const S = GG.G.S; const c = GG.Combat.cur(); return [S.mode, c && c.id, S.pc.ap, S.pc.hp, GG.Render.busy(), S.combat && S.combat.wait, (GG.G.alive().find(e=>e.tpl==='gristling')||{}).hp, !!S.pc.path] })()")
        print(st)
        if st[0] == 'combat' and st[1] == 'pc' and not st[7]:
            gid = ev("GG.G.alive().find(e=>e.tpl==='gristling').id")
            ev(f"GG.G.attackCmd('{gid}', 'torso')")
    b.close()
