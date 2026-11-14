'use strict';
// Boot, main loop, mouse & keyboard.
(function () {
  const U = GG.U, G = GG.G, Rn = GG.Render, UI = GG.UI, Sc = GG.Screens, W = GG.World, WM = GG.WorldMap, SP = GG.SP;
  const cv = document.getElementById('view');
  const params = new URLSearchParams(location.search);
  let mouse = { x: 0, y: 0, in: false };
  const keys = {};

  function boot() {
    SP.loadGfx();
    Rn.init(cv);
    UI.init();
    G.busy = Rn.busy;
    document.getElementById('boot').remove();
    if (params.get('test')) testStart(); else Sc.open('title');
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      try { frame(dt); } catch (e) { console.error(e); document.body.dataset.err = String(e && e.stack || e).slice(0, 500); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // autosave every few in-game hours while exploring
    setInterval(() => { const S = G.S; if (S && S.mode === 'explore' && !S.dlg && !S.ui && !params.get('test')) Sc.save('auto'); }, 180000);
  }

  function frame(dt) {
    const S = G.S;
    GG.Audio.update(dt);
    UI.hud(dt);
    if (!S) { const c = Rn.ctx; const [w, h] = Rn.size(); c.fillStyle = '#120c08'; c.fillRect(0, 0, w, h); return; }
    if (S.mode === 'world') {
      W.update(dt);
      WM.draw(Rn.ctx, performance.now() / 1000);
      return;
    }
    const ff = +(params.get('ff') || 1);
    for (let i = 0; i < ff; i++) G.update(dt);
    panCamera(dt);
    updateHover();
    Rn.draw(dt);
  }

  // ------------------------------------------------------------ camera
  function panCamera(dt) {
    let dx = 0, dy = 0;
    const sp = 700 * dt;
    if (keys.ArrowLeft) dx -= sp; if (keys.ArrowRight) dx += sp; if (keys.ArrowUp) dy -= sp; if (keys.ArrowDown) dy += sp;
    const [w, h] = Rn.size();
    if (mouse.in && !Sc.cur && !G.S.dlg && mouse.y < h - Rn.HUD_H) {
      const m = 14;
      if (mouse.x < m) dx -= sp; if (mouse.x > w - m) dx += sp; if (mouse.y < m) dy -= sp;
    }
    if (dx || dy) { Rn.recentre = false; Rn.follow = false; Rn.cam.tx += dx; Rn.cam.ty += dy; }
    else if (G.S.pc.path) Rn.recentre = true;
    if (G.S.mode === 'combat' && !GG.Combat.isPcTurn()) Rn.follow = true;
    if (G.S.mode === 'combat' && GG.Combat.isPcTurn() && G.S.pc.path) Rn.follow = true;
  }

  // ------------------------------------------------------------ hover & picking
  function pick(sx, sy) {
    const S = G.S;
    const cell = Rn.cellAtScreen(sx, sy);
    let ent = null, best = 1e9;
    for (const e of S.map.ents) {
      if (e.gone) continue;
      const [ex, ey] = Rn.entScreen(e);
      const h = e.dead ? 26 : SP.entHeight(e);
      const wdt = e.dead ? 22 : 14;
      if (sx > ex - wdt && sx < ex + wdt && sy > ey - h && sy < ey + 6) {
        const d = Math.abs(sy - (ey - h / 2)) + Math.abs(sx - ex) + (e.dead ? 30 : 0);
        if (d < best) { best = d; ent = e; }
      }
    }
    let obj = null;
    if (!ent && cell) {
      const o = G.objAt(cell[0], cell[1]);
      if (o && (o.type !== 'bones' || o.pile) && !(o.type === 'door' && o.open && !o.locked)) obj = o;
      if (!obj) {
        // tall objects: check the cell below the cursor too
        for (let k = 1; k <= 3 && !obj; k++) { const o2 = G.objAt(cell[0], cell[1] + k); if (o2 && ['tent', 'wagon', 'tower', 'pump', 'shelf', 'lamp', 'safe', 'sign', 'mother'].includes(o2.type)) obj = o2; }
      }
    }
    if (ent && ent.id === 'pc' && !UI.mode) ent = null;
    return { cell, ent, obj };
  }
  let lastPathKey = '';
  function updateHover() {
    const S = G.S;
    if (!mouse.in || Sc.cur || S.dlg || mouse.y > Rn.size()[1] - Rn.HUD_H) { Rn.hover = null; UI.tip(null); return; }
    const h = pick(mouse.x, mouse.y);
    Rn.hover = h;
    // combat path preview
    if (S.mode === 'combat' && GG.Combat.isPcTurn() && h.cell && !h.ent && !h.obj) {
      const k = h.cell.join(',') + ':' + S.pc.x + ',' + S.pc.y;
      if (k !== lastPathKey) { lastPathKey = k; Rn.pathPreview = G.findPath(S.pc, h.cell[0], h.cell[1], { strict: true, max: 1500 }); }
    } else { Rn.pathPreview = null; lastPathKey = ''; }
    let tip = '';
    if (h.ent) {
      const e = h.ent, t = G.tplOf(e);
      tip = `<b>${UI.esc(e.name)}</b>${e.dead ? ' (dead)' : ''}`;
      if (!e.dead) {
        const hp = e.hp / G.maxHp(e);
        tip += `<br>${e.party ? `${e.hp}/${G.maxHp(e)} HP` : hp > 0.9 ? 'Unhurt' : hp > 0.6 ? 'Wounded' : hp > 0.3 ? 'Badly wounded' : 'Almost dead'}`;
        if (G.hostileToPlayer(e) || S.mode === 'combat') { const w = G.weapon(S.pc); tip += ` · <b>${GG.Combat.hitChance(S.pc, e, 'torso', w)}%</b> to hit (${GG.Combat.apCost(S.pc, w, 'torso')} AP)<br><i>Right-click to aim</i>`; }
        else if (t && t.dlg || e.dlgId) tip += ' · Click to talk';
        if (e.caged) tip += ' · Locked in a cage';
      } else if (e.inv.length) tip += '<br>Click to search';
      document.body.classList.toggle('attack', G.hostileToPlayer(e) && !e.dead);
    } else {
      document.body.classList.remove('attack');
      if (h.obj) {
        const o = h.obj;
        tip = `<b>${UI.esc(o.name || GG.OBJT[o.type].name)}</b>${o.locked ? ' (locked)' : ''}${(GG.OBJT[o.type] || {}).container || o.inv ? '<br>Click to open' : o.script ? '<br>Click to use' : ''}`;
      } else if (h.cell && G.isExit(h.cell[0], h.cell[1])) tip = '<b>Leave</b> for the world map';
    }
    if (UI.mode) tip = `<b>${GG.R.SKILL[UI.mode.slice(6)].name}</b>: choose a target` + (tip ? '<br>' + tip : '');
    UI.tip(tip || null, mouse.x, mouse.y);
  }

  // ------------------------------------------------------------ input
  cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; if (G.S && G.S.mode === 'world') { const n = WM.nodeAtScreen(e.clientX, e.clientY); WM.hover = n ? n[0] : null; cv.style.cursor = n ? 'pointer' : ''; } });
  cv.addEventListener('mouseleave', () => { mouse.in = false; UI.tip(null); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    GG.Audio.init();
    const S = G.S;
    if (!S || Sc.cur || S.dlg) return;
    UI.hideAim();
    if (S.mode === 'world') {
      if (S.world.enc) return;
      const n = WM.nodeAtScreen(e.clientX, e.clientY);
      if (n) { const here = W.here(); if (here && here[0] === n[0] && !S.world.dest) W.arrive(n[0]); else W.travelTo(n[0]); }
      else { const [x, y] = WM.toCell(e.clientX, e.clientY); W.setDest(x, y); }
      return;
    }
    if (S.mode === 'dead') return;
    const h = pick(e.clientX, e.clientY);
    if (e.button === 2) {
      if (UI.mode) { UI.mode = null; document.body.classList.remove('skillmode'); return; }
      if (h.ent && !h.ent.dead && (G.hostileToPlayer(h.ent) || S.mode === 'combat') && !h.ent.party) { UI.aimMenu(h.ent, e.clientX, e.clientY); return; }
      if (h.ent) GG.Act.look('ent', h.ent.id); else if (h.obj) GG.Act.look('obj', h.obj.id);
      else if (h.cell) G.log(`${U.cap(G.geo.ter[G.idx(...h.cell)] || 'ground')}.`);
      return;
    }
    if (UI.mode) {
      const sk = UI.mode.slice(6);
      UI.mode = null; document.body.classList.remove('skillmode');
      if (h.ent) GG.Act.useSkill(sk, 'ent', h.ent.id);
      else if (h.obj) GG.Act.useSkill(sk, 'obj', h.obj.id);
      else if (h.cell && h.cell[0] === S.pc.x && h.cell[1] === S.pc.y) GG.Act.useSkill(sk, 'self');
      else G.log('No target there.');
      return;
    }
    if (S.mode === 'combat' && !GG.Combat.isPcTurn()) return;
    Rn.recentre = true;
    if (h.ent) { G.interact('ent', h.ent.id); return; }
    if (h.obj) { G.interact('obj', h.obj.id); return; }
    if (h.cell) G.clickCell(h.cell[0], h.cell[1]);
  });

  window.addEventListener('keydown', e => {
    keys[e.key] = true;
    const S = G.S;
    if (e.key === 'Escape') {
      if (UI.mode) { UI.mode = null; document.body.classList.remove('skillmode'); return; }
      if (!document.getElementById('aim').classList.contains('hidden')) { UI.hideAim(); return; }
      if (S && S.dlg) return;
      if (Sc.cur && Sc.cur !== 'title' && Sc.cur !== 'creation' && Sc.cur !== 'death' && Sc.cur !== 'intro' && Sc.cur !== 'ending') { if (Sc.cur === 'barter') document.querySelector('[data-close]').click(); else Sc.close(); return; }
      if (S && !Sc.cur) Sc.open('menu');
      return;
    }
    if (!S) return;
    if (S.dlg) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) { GG.Dialog.choose(n - 1); }
      return;
    }
    if (Sc.cur && !['inv', 'char', 'alm', 'skills'].includes(Sc.cur)) return;
    const k = e.key.toLowerCase();
    const toggle = name => { if (Sc.cur === name) Sc.close(); else Sc.open(name); };
    if (k === 'i') toggle('inv');
    else if (k === 'c') toggle('char');
    else if (k === 'j') toggle('alm');
    else if (k === 'k') toggle('skills');
    else if (Sc.cur) return;
    else if (k === 'n') G.toggleSneak();
    else if (k === 'r' && S.mode !== 'world') { if (!G.reload(S.pc)) G.log('Cannot reload.'); }
    else if (e.key === ' ') { e.preventDefault(); UI.button('end'); }
    else if (e.key === 'Home') { Rn.recentre = true; }
    else if (e.key === 'F5') { e.preventDefault(); Sc.save('1'); }
    else if (e.key === 'F9') { e.preventDefault(); Sc.load('1'); }
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  // ------------------------------------------------------------ test entry (?test=1&preset=gunhand&map=sump&entry=front&hour=22&dlg=agnes)
  function testStart() {
    const presets = { gunhand: { name: 'Tester', stats: { grit: 6, nerve: 7, wits: 5, charm: 4, reflex: 8, gut: 5 }, knacks: ['guns', 'sneak', 'doctor'], quirks: [] }, barker: { name: 'Tester', stats: { grit: 4, nerve: 5, wits: 7, charm: 9, reflex: 5, gut: 5 }, knacks: ['gab', 'show', 'guns'], quirks: ['showboat'] } };
    G.newGame(presets[params.get('preset') || 'gunhand'], +(params.get('seed') || 5));
    G.S.flags.introDone = true;
    Sc.close();
    if (params.get('hour')) G.S.time = 8 * 60 + 30 + ((+params.get('hour') - 8.5 + 24) % 24) * 60;
    if (params.get('map')) { G.S.mode = 'world'; G.S.map = null; GG.World.reveal('sump'); G.enterMap(params.get('map'), params.get('entry') || undefined); }
    if (params.get('world')) { G.leaveMap('world'); }
    if (params.get('at')) { const [x, y] = params.get('at').split(',').map(Number); G.S.pc.x = x; G.S.pc.y = y; Rn.onMap(); }
    if (params.get('dlg')) G.talk(G.ent(params.get('dlg')));
    if (params.get('screen')) Sc.open(params.get('screen'));
    if (params.get('fight')) { const e = G.makeEnt(params.get('fight'), [G.S.pc.x + 4, G.S.pc.y + 1]); G.S.map.ents.push(e); }
    UI.clearLog(true);
  }

  window.addEventListener('load', boot);
})();
