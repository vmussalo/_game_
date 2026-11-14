'use strict';
// Local-map renderer: camera, painter's sort, interpolation, effects, lighting, grade.
(function () {
  const U = GG.U, G = GG.G, SP = GG.SP;
  const R = GG.Render = {};
  let cv, ctx, lightCv, lctx, W = 0, H = 0;
  R.HUD_H = 150;
  R.cam = { x: 0, y: 0, tx: 0, ty: 0 };
  R.fx = [];
  R.hover = null;
  R.ground = null;
  R.t = 0;

  R.init = canvas => {
    cv = canvas; ctx = cv.getContext('2d');
    lightCv = document.createElement('canvas'); lctx = lightCv.getContext('2d');
    const rs = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lightCv.width = W; lightCv.height = H;
    };
    window.addEventListener('resize', rs); rs();
    R.ctx = ctx;
  };
  R.size = () => [W, H];
  R.viewH = () => H - R.HUD_H;

  R.onMap = () => {
    R.ground = SP.renderGround(G.geo);
    R.fx = [];
    const pc = G.S.pc;
    const [x, y] = U.px(pc.x, pc.y);
    R.cam.x = R.cam.tx = x; R.cam.y = R.cam.ty = y;
    for (const e of G.S.map.ents) e.stepP = 1;
  };

  // world px -> screen
  R.off = () => [W / 2 - R.cam.x, R.viewH() / 2 - R.cam.y];
  R.toScreen = (px, py) => { const [ox, oy] = R.off(); return [px + ox, py + oy]; };
  R.toWorld = (sx, sy) => { const [ox, oy] = R.off(); return [sx - ox, sy - oy]; };
  R.cellAtScreen = (sx, sy) => { const [wx, wy] = R.toWorld(sx, sy); return U.cellAt(wx, wy); };

  // interpolated entity position in world px
  R.entPx = e => {
    const [x1, y1] = U.px(e.x, e.y);
    if (e.stepP == null || e.stepP >= 1 || e.fx == null) return [x1, y1];
    const [x0, y0] = U.px(e.fx, e.fy);
    return [U.lerp(x0, x1, e.stepP), U.lerp(y0, y1, e.stepP)];
  };
  R.entScreen = e => { const [x, y] = R.entPx(e); return R.toScreen(x, y); };

  R.busy = () => R.fx.some(f => f.block && f.t < f.dur) || (G.S.mode === 'combat' && G.S.map.ents.some(e => e.stepP != null && e.stepP < 1 && !e.dead));

  // ------------------------------------------------------------ effects (from game events)
  R.event = (type, d) => {
    if (!G.S || !G.S.map) return;
    if (type === 'float') { const e = G.ent(d.id); if (e) { const n = R.fx.filter(f => f.kind === 'float' && f.id === d.id && f.t < 0.6).length; R.fx.push({ kind: 'float', id: d.id, text: d.text, color: d.color, t: 0, dur: 2.2, dy: n * 14 }); } }
    if (type === 'attack') {
      const a = G.ent(d.from), b = G.ent(d.to);
      if (!a) return;
      const [ax, ay] = R.entPx(a);
      const [bx, by] = b ? R.entPx(b) : U.px(d.tx, d.ty);
      const tx = d.thrown ? U.px(d.tx, d.ty) : [bx + (d.hit ? 0 : (Math.random() - 0.5) * 30), by + (d.hit ? 0 : (Math.random() - 0.5) * 16)];
      if (d.ranged) R.fx.push({ kind: d.thrown ? 'lob' : 'tracer', x1: ax + a.facing * 10, y1: ay - 26, x2: tx[0], y2: tx[1] - (d.thrown ? 0 : 20), t: 0, dur: d.thrown ? 0.45 : 0.18, block: true, w: d.w });
      else R.fx.push({ kind: 'swipe', x: bx, y: by - 20, t: 0, dur: 0.25, block: true, dir: a.facing });
      a.aimT = 0.5;
    }
    if (type === 'hit') {
      const e = G.ent(d.id);
      if (!e) return;
      const [x, y] = R.entPx(e);
      e.hitT = 0.25;
      if (d.dmg > 0) R.splat(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 6, d.dtype === 'acid' ? '120,150,40' : (e.look || GG.CREATURES[e.tpl].look || {}).kind === 'human' ? '110,15,15' : '140,40,70', 4 + Math.min(10, d.dmg / 2));
    }
    if (type === 'boom') {
      const [x, y] = U.px(d.x, d.y);
      R.fx.push({ kind: 'boom', x, y, r: (d.r + 0.5) * U.HW, t: 0, dur: 0.6, block: true, dtype: d.dtype });
      R.splat(x, y, d.dtype === 'acid' ? '110,140,40' : '30,20,10', 16 * d.r);
    }
    if (type === 'die') { const e = G.ent(d.id); if (e) { const [x, y] = R.entPx(e); R.splat(x, y, '100,15,15', 12); } }
  };
  R.splat = (x, y, col, r) => {
    if (!R.ground) return;
    const g = R.ground.getContext('2d');
    const ox = SP.PAD.x, oy = SP.PAD.y;
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(${col},${0.25 + Math.random() * 0.3})`;
      g.beginPath(); g.ellipse(ox + x + (Math.random() - 0.5) * r * 1.6, oy + y + (Math.random() - 0.5) * r * 0.6, r * (0.3 + Math.random() * 0.5), r * 0.25 * (0.4 + Math.random() * 0.6), 0, 0, 7); g.fill();
    }
  };

  // ------------------------------------------------------------ main draw
  R.draw = (dt) => {
    R.t += dt;
    const S = G.S;
    if (!S || !S.map || !G.geo) return;
    const geo = G.geo, t = R.t;
    // camera follow
    const pc = S.pc;
    const cur = S.mode === 'combat' ? GG.Combat.cur() : null;
    const focus = cur && cur !== pc && !cur.dead && R.follow ? cur : pc;
    if (R.follow || R.recentre) { const [fx, fy] = R.entPx(focus); R.cam.tx = fx; R.cam.ty = fy - 10; }
    R.cam.x += (R.cam.tx - R.cam.x) * Math.min(1, dt * 6);
    R.cam.y += (R.cam.ty - R.cam.y) * Math.min(1, dt * 6);
    const [ox, oy] = R.off();
    ctx.fillStyle = '#120c08'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(R.ground, ox - SP.PAD.x, oy - SP.PAD.y);
    // interpolate movement
    for (const e of S.map.ents) {
      if (e.stepP != null && e.stepP < 1) {
        const st = G.stepTime(e) / (S.mode === 'combat' ? 1.35 : 1);
        e.stepP = Math.min(1, e.stepP + dt / st);
        e.walkPh = (e.walkPh || 0) + dt / st * 0.5;
      } else if (!e.path) e.walkPh = 0;
      if (e.hitT > 0) e.hitT -= dt;
      if (e.aimT > 0) e.aimT -= dt;
    }
    // visible cell range
    const c0 = Math.floor((-ox) / U.HW) - 3, c1 = Math.ceil((W - ox) / U.HW) + 3;
    const r0 = Math.floor((-oy) / U.RH) - 4, r1 = Math.ceil((H - oy) / U.RH) + 12;
    // exit frontier markers
    ctx.lineWidth = 1.2;
    for (let r = Math.max(0, r0); r < Math.min(geo.h, r1); r++) for (let c = Math.max(0, c0); c < Math.min(geo.w, c1); c++) {
      if (!geo.exit[r * geo.w + c]) continue;
      if (!U.nb(c, r).some(([x, y]) => G.inb(x, y) && !geo.exit[y * geo.w + x] && !geo.wall[y * geo.w + x])) continue;
      const [px, py] = U.px(c, r);
      ctx.strokeStyle = `rgba(232,180,80,${0.18 + Math.sin(t * 2 + c) * 0.06})`;
      SP.hexPath(ctx, px + ox, py + oy, 0.8); ctx.stroke();
    }
    // hover / combat overlays on the ground
    R.drawGroundUI(ox, oy);
    // painter's list
    const list = [];
    for (let r = Math.max(0, r0); r < Math.min(geo.h, r1); r++) for (let c = Math.max(0, c0); c < Math.min(geo.w, c1); c++) {
      const w = geo.wall[r * geo.w + c];
      if (w) { const [px, py] = U.px(c, r); list.push({ k: 'w', y: py, x: px, c, r, w }); }
    }
    for (const o of S.map.objs) {
      if (o.gone) continue;
      const [px, py] = U.px(o.at[0], o.at[1]);
      if (px + ox < -260 || px + ox > W + 260 || py + oy < -60 || py + oy > H + 260) continue;
      const flat = o.type === 'bones' || o.type === 'corpse' || (o.open && (o.type === 'door'));
      list.push({ k: 'o', y: py + (flat ? -U.RH * 0.6 : 0.5), x: px, o });
    }
    for (const e of S.map.ents) {
      if (e.gone) continue;
      const [px, py] = R.entPx(e);
      list.push({ k: 'e', y: py + (e.dead ? -U.RH * 0.55 : 1), x: px, e });
    }
    list.sort((a, b) => a.y - b.y || a.x - b.x);
    const [pcx, pcy] = R.entPx(pc);
    for (const it of list) {
      if (it.k === 'w') {
        const spr = SP.wallSprite(it.w, (it.c * 7 + it.r * 3) % 4);
        // fade walls that hide the player
        const near = it.y > pcy - 4 && it.y < pcy + U.RH * 5 && Math.abs(it.x - pcx) < U.HW * 3.2 && !GG.WALL[it.w].low;
        ctx.globalAlpha = near ? 0.3 : 1;
        ctx.drawImage(spr.c, it.x + ox - spr.ax, it.y + oy - spr.ay);
        ctx.globalAlpha = 1;
      } else if (it.k === 'o') {
        const o = it.o;
        const big = ['tent', 'wagon', 'tower', 'mother'].includes(o.type);
        const near = big && it.y > pcy && it.y < pcy + U.RH * 8 && Math.abs(it.x - pcx) < U.HW * 4;
        if (near) ctx.globalAlpha = 0.45;
        SP.drawObj(ctx, o, it.x + ox, it.y + oy, t, geo);
        ctx.globalAlpha = 1;
        if (R.hover && R.hover.obj === o) R.outlineObj(o, it.x + ox, it.y + oy);
      } else {
        const e = it.e;
        const sx = it.x + ox, sy = it.y + oy;
        if (!e.dead) R.drawRing(e, sx, sy, cur);
        const flip = e.facing < 0;
        if (e.hitT > 0) { ctx.save(); ctx.translate((Math.random() - 0.5) * 3, 0); }
        SP.drawEnt(ctx, e, sx, sy, t, { flip, walk: e.walkPh || 0, aiming: e.aimT > 0, armorCol: e.equip && e.equip.armor ? GG.ITEMS[e.equip.armor].look : null });
        if (e.hitT > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); }
        if (e.sleep && !e.dead) { ctx.fillStyle = '#e8dcc0'; ctx.font = 'italic 11px Georgia'; ctx.fillText('z', sx + 8, sy - 40 - Math.sin(t * 2) * 3); ctx.fillText('z', sx + 13, sy - 48 - Math.sin(t * 2 + 1) * 3); }
      }
    }
    R.drawFx(dt, ox, oy);
    R.drawLight(ox, oy);
    R.drawGrade();
  };

  R.drawRing = (e, sx, sy, cur) => {
    const hov = R.hover && R.hover.ent === e;
    const isCur = cur === e;
    if (!hov && !isCur && !(e.party && e.id !== 'pc')) return;
    const L = e.look || GG.CREATURES[e.tpl].look || {};
    const rx = L.kind === 'human' ? 13 * (L.build || 1) : 18 * (L.scale || 1);
    const col = G.hostileToPlayer(e) ? '232,70,50' : e.party ? '120,200,110' : '232,200,90';
    ctx.strokeStyle = `rgba(${col},${isCur ? 0.6 + Math.sin(R.t * 6) * 0.3 : hov ? 0.85 : 0.4})`;
    ctx.lineWidth = isCur ? 2.4 : 1.6;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.4, 0, 0, 7); ctx.stroke();
  };
  R.outlineObj = (o, sx, sy) => {
    ctx.strokeStyle = 'rgba(240,210,120,0.75)'; ctx.lineWidth = 1.5;
    for (const [c, r] of GG.objCells(o)) { const [px, py] = R.toScreen(...U.px(c, r)); SP.hexPath(ctx, px, py, 0.9); ctx.stroke(); }
  };

  R.drawGroundUI = (ox, oy) => {
    const S = G.S, h = R.hover;
    if (!h || !h.cell) return;
    const [c, r] = h.cell;
    const [px, py] = U.px(c, r);
    ctx.lineWidth = 1.5;
    if (S.mode === 'combat' && GG.Combat.isPcTurn() && !h.ent && !h.obj) {
      const p = R.pathPreview;
      if (p && p.length) {
        for (let i = 0; i < p.length; i++) {
          const [x, y] = U.px(p[i][0], p[i][1]);
          const ok = i < S.pc.ap;
          ctx.fillStyle = ok ? 'rgba(240,210,120,0.55)' : 'rgba(200,60,50,0.5)';
          ctx.beginPath(); ctx.ellipse(x + ox, y + oy, 4, 2, 0, 0, 7); ctx.fill();
        }
        ctx.fillStyle = p.length <= S.pc.ap ? '#f0d890' : '#e86050';
        ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center';
        ctx.fillText(`${p.length} AP`, px + ox, py + oy - 12);
      }
    }
    ctx.strokeStyle = G.blockedStatic(c, r) ? 'rgba(200,80,60,0.6)' : G.isExit(c, r) ? 'rgba(240,180,80,0.9)' : 'rgba(240,220,170,0.6)';
    SP.hexPath(ctx, px + ox, py + oy, 0.95); ctx.stroke();
  };

  R.drawFx = (dt, ox, oy) => {
    for (const f of R.fx) {
      f.t += dt;
      const p = f.t / f.dur;
      if (p > 1) continue;
      if (f.kind === 'float') {
        const e = G.ent(f.id); if (!e) continue;
        const [x, y] = R.entPx(e);
        const h = SP.entHeight(e);
        ctx.globalAlpha = Math.min(1, (1 - p) * 2);
        ctx.font = f.text.length > 6 ? 'italic 13px Georgia' : 'bold 16px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,5,0.9)';
        const yy = y + oy - h - 10 - p * 22 - f.dy;
        ctx.strokeText(f.text, x + ox, yy); ctx.fillStyle = f.color || '#fff'; ctx.fillText(f.text, x + ox, yy);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'tracer') {
        const g = ctx.createLinearGradient(f.x1 + ox, f.y1 + oy, f.x2 + ox, f.y2 + oy);
        g.addColorStop(0, 'rgba(255,230,160,0)'); g.addColorStop(1, `rgba(255,230,160,${1 - p})`);
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(f.x1 + ox, f.y1 + oy); ctx.lineTo(f.x2 + ox, f.y2 + oy); ctx.stroke();
        if (p < 0.4) { ctx.fillStyle = `rgba(255,220,120,${1 - p * 2.5})`; ctx.beginPath(); ctx.arc(f.x1 + ox, f.y1 + oy, 6, 0, 7); ctx.fill(); }
      } else if (f.kind === 'lob') {
        const x = U.lerp(f.x1, f.x2, p), y = U.lerp(f.y1, f.y2, p) - Math.sin(p * Math.PI) * 50;
        ctx.fillStyle = f.w === 'dynamite' ? '#c83028' : '#8aa048'; ctx.fillRect(x + ox - 3, y + oy - 3, 6, 6);
      } else if (f.kind === 'swipe') {
        ctx.strokeStyle = `rgba(255,240,220,${1 - p})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x + ox - f.dir * 6, f.y + oy, 16, -1.2 + p, 0.4 + p); ctx.stroke();
      } else if (f.kind === 'boom') {
        const r = f.r * (0.3 + p * 0.9);
        const g = ctx.createRadialGradient(f.x + ox, f.y + oy - 10, 2, f.x + ox, f.y + oy - 10, r);
        const col = f.dtype === 'acid' ? '170,220,70' : '255,170,60';
        g.addColorStop(0, `rgba(255,250,220,${1 - p})`); g.addColorStop(0.4, `rgba(${col},${0.8 * (1 - p)})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x + ox, f.y + oy - 10, r, r * 0.7, 0, 0, 7); ctx.fill();
      }
    }
    R.fx = R.fx.filter(f => f.t < f.dur);
  };

  // darkness by hour (0 day .. 0.62 night)
  R.darkness = () => {
    const h = U.hourOf(G.S.time);
    if (h >= 7 && h < 18.5) return 0;
    if (h >= 18.5 && h < 21) return (h - 18.5) / 2.5 * 0.62;
    if (h >= 5 && h < 7) return (7 - h) / 2 * 0.62;
    return 0.62;
  };
  R.drawLight = (ox, oy) => {
    const d = R.darkness();
    // warm dusk tint
    const h = U.hourOf(G.S.time);
    if (h > 17 && h < 20.5) { ctx.fillStyle = `rgba(230,110,40,${0.10 * Math.sin((h - 17) / 3.5 * Math.PI)})`; ctx.fillRect(0, 0, W, H); }
    if (d <= 0.01) return;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = `rgba(8,10,28,${d})`; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = 'destination-out';
    const lights = [];
    for (const o of G.S.map.objs) {
      const l = (GG.OBJT[o.type] || {}).light;
      if (!l || o.gone) continue;
      const [px, py] = U.px(o.at[0], o.at[1]);
      const sx = px + ox, sy = py + oy - (o.type === 'lamp' ? (o.indoor ? 20 : 34) : 6);
      if (sx < -300 || sx > W + 300 || sy < -300 || sy > H + 300) continue;
      const r = l.r * U.HW * 0.75 * (0.96 + Math.sin(R.t * (o.type === 'campfire' ? 9 : 2) + px) * 0.04);
      lights.push([sx, sy, r, l.c]);
      const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.ellipse(sx, sy + r * 0.2, r, r * 0.7, 0, 0, 7); lctx.fill();
    }
    // the player carries a little light
    const [px, py] = R.entScreen(G.S.pc);
    const g = lctx.createRadialGradient(px, py - 20, 0, px, py - 20, 110);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.ellipse(px, py - 10, 110, 80, 0, 0, 7); lctx.fill();
    ctx.drawImage(lightCv, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy, r, c] of lights) {
      const g2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.8);
      g2.addColorStop(0, `rgba(${c},${0.22 * d / 0.62})`); g2.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(sx, sy + r * 0.15, r * 0.8, r * 0.56, 0, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  let gradeCache = null;
  R.drawGrade = () => {
    if (!gradeCache || gradeCache.w !== W || gradeCache.h !== H) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const v = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.35, W / 2, H * 0.42, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(15,6,0,0.55)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      gradeCache = { c, w: W, h: H };
    }
    ctx.fillStyle = 'rgba(120,70,20,0.07)'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(gradeCache.c, 0, 0);
    ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay';
    const n = SP.noise();
    ctx.drawImage(n, -Math.random() * 100, -Math.random() * 100, W + 200, H + 200);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
})();
