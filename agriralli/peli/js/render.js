/* AgriRalli – kisan piirto: kamera, rata, koneet, ammukset, partikkelit, HUD ja minikartta */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;

  const R = AR.Render = {
    cv: null, ctx: null, dpr: 1, W: 0, H: 0, race: null, trackCv: null, mini: null,
    cam: { x: 0, y: 0, z: 1 }, parts: [], shake: 0, skids: new Map(), vign: null, t: 0, popups: []
  };

  R.init = function (cv) {
    R.cv = cv; R.ctx = cv.getContext('2d');
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  R.resize = function () {
    if (!R.cv) return;
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    R.W = R.cv.clientWidth || window.innerWidth; R.H = R.cv.clientHeight || window.innerHeight;
    R.cv.width = Math.round(R.W * R.dpr); R.cv.height = Math.round(R.H * R.dpr);
    R.vign = null;
  };

  R.setRace = function (race) {
    R.race = race;
    R.trackCv = AR.TrackArt.render(race.tr, AR.themeId);
    R.parts = []; R.popups = []; R.skids = new Map(); R.shake = 0; R.vign = null;
    R.cams = [R.cam, { x: 0, y: 0, z: 1 }];
    const vs = views(race);
    vs.forEach((v, i) => { const P = v.car; R.cams[i].x = P.x; R.cams[i].y = P.y; R.cams[i].z = R.baseZoom(v); });
    // minikartan pohja
    const mw = 170, mh = 130;
    const mc = document.createElement('canvas');
    mc.width = mw * 2; mc.height = mh * 2;
    const mx = mc.getContext('2d');
    mx.scale(2, 2);
    R.mini = { cv: mc, w: mw, h: mh, m: AR.TrackArt.mini(mx, race.tr, 4, 4, mw - 8, mh - 8, { col: 'rgba(230,225,210,0.85)', edge: 'rgba(0,0,0,0.7)' }) };
  };

  // näkymät: yksinpelissä koko ruutu, kaksinpelissä vierekkäin (vaakanäyttö) tai päällekkäin (pystynäyttö)
  function views(race) {
    const W = R.W, H = R.H, ps = race.players || [];
    if (ps.length < 2 || R.hudOff) return [{ x: 0, y: 0, w: W, h: H, car: follow(race, race.player), split: false }];
    const side = W >= H;
    return ps.slice(0, 2).map((p, i) => {
      const v = side ? { x: i * W / 2, y: 0, w: W / 2, h: H } : { x: 0, y: i * H / 2, w: W, h: H / 2 };
      v.car = follow(race, p, ps); v.me = p; v.split = true; v.side = side;
      return v;
    });
  }
  // kenen perässä kamera on: oma kone, romutettuna toinen pelaaja tai kärkikone
  function follow(race, p, ps) {
    if (p && !p.wrecked) return p;
    const other = ps && ps.find(q => q !== p && !q.wrecked);
    return other || race.order[0] || race.cars[0];
  }
  R.baseZoom = v => U.clamp(Math.min(v ? v.w : R.W, v ? v.h : R.H) / 640, 0.7, 1.25) * (v && v.split ? 0.9 : 1);
  R.snap = function () {
    const race = R.race; if (!race) return;
    views(race).forEach((v, i) => {
      const P = v.car, cam = R.cams[i];
      cam.x = P.x + P.vx * 0.35; cam.y = P.y + P.vy * 0.35; cam.z = R.baseZoom(v);
    });
  };

  // ---------- partikkelit ----------
  function part(o) { if (R.parts.length < 900) R.parts.push(o); }

  R.consume = function (fx) {
    const th = AR.themeId;
    for (const e of fx) {
      switch (e.t) {
        case 'boom':
          part({ k: 'flash', x: e.x, y: e.y, r: 70, life: 0.25, max: 0.25 });
          part({ k: 'ring', x: e.x, y: e.y, r: 10, vr: 420, life: 0.45, max: 0.45 });
          for (let i = 0; i < 36; i++) {
            const a = Math.random() * U.TAU, s = U.rand(60, 340);
            part({ k: i % 3 ? 'fire' : 'debris', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: U.rand(4, 11), life: U.rand(0.5, 1.2), max: 1.2, rot: Math.random() * 6 });
          }
          for (let i = 0; i < 14; i++) part({ k: 'smoke', x: e.x + U.rand(-20, 20), y: e.y + U.rand(-20, 20), vx: U.rand(-30, 30), vy: U.rand(-30, 30), r: U.rand(10, 20), life: U.rand(1.2, 2.4), max: 2.4 });
          R.shake = Math.max(R.shake, 14);
          break;
        case 'mineboom':
          part({ k: 'flash', x: e.x, y: e.y, r: 45, life: 0.2, max: 0.2 });
          for (let i = 0; i < 18; i++) {
            const a = Math.random() * U.TAU, s = U.rand(50, 220);
            part({ k: th === 'kyla' ? 'mud' : 'fire', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: U.rand(3, 8), life: U.rand(0.4, 0.9), max: 0.9 });
          }
          R.shake = Math.max(R.shake, 8);
          break;
        case 'hit':
          for (let i = 0; i < 4; i++) {
            const a = Math.random() * U.TAU, s = U.rand(80, 260);
            part({ k: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.1, 0.25), max: 0.25, col: e.col });
          }
          if (e.player) R.shake = Math.max(R.shake, 2);
          break;
        case 'crash':
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * U.TAU, s = U.rand(80, 300);
            part({ k: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.15, 0.35), max: 0.35, col: '#ffe08a' });
          }
          if (e.player) R.shake = Math.max(R.shake, Math.min(10, e.v / 30));
          break;
        case 'smoke':
          part({ k: 'smoke', x: e.x + U.rand(-6, 6), y: e.y + U.rand(-6, 6), vx: U.rand(-15, 15), vy: U.rand(-15, 15), r: U.rand(5, 9), life: U.rand(0.8, 1.6), max: 1.6 });
          break;
        case 'fire':
          part({ k: 'fire', x: e.x + U.rand(-8, 8), y: e.y + U.rand(-8, 8), vx: U.rand(-20, 20), vy: U.rand(-20, 20), r: U.rand(4, 8), life: U.rand(0.3, 0.6), max: 0.6 });
          if (Math.random() < 0.5) part({ k: 'smoke', x: e.x, y: e.y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), r: U.rand(8, 14), life: U.rand(1, 2), max: 2, dark: true });
          break;
        case 'dust':
          part({ k: th === 'kyla' ? 'dust' : 'smoke', x: e.x, y: e.y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), r: U.rand(5, 10), life: U.rand(0.5, 1), max: 1, dust: true });
          break;
        case 'kauha':
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * U.TAU, s = U.rand(60, 200);
            part({ k: th === 'kyla' ? 'mud' : 'debris', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: U.rand(3, 7), life: 0.7, max: 0.7, rot: 0 });
          }
          R.shake = Math.max(R.shake, 9);
          break;
        case 'pick': {
          const T = AR.T;
          const txt = e.type === 'cash' ? '+' + e.amt + ' ' + T.cur : T.pickup[e.type];
          R.popups.push({ x: e.x, y: e.y, text: txt, life: 1.2, col: e.type === 'cash' ? '#ffe066' : '#bff' });
          break;
        }
      }
    }
  };

  function updParts(dt) {
    const P = R.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      if (p.vx) { p.x += p.vx * dt; p.y += p.vy * dt; const d = Math.exp(-2.5 * dt); p.vx *= d; p.vy *= d; }
      if (p.vr) p.r += p.vr * dt;
      if (p.k === 'smoke' || p.k === 'dust') p.r += dt * 14;
    }
    for (let i = R.popups.length - 1; i >= 0; i--) {
      const p = R.popups[i]; p.life -= dt; p.y -= 30 * dt;
      if (p.life <= 0) R.popups.splice(i, 1);
    }
  }

  function drawParts(ctx, layer) {
    for (const p of R.parts) {
      const f = p.life / p.max;
      if (layer === 0 && p.k !== 'smoke' && p.k !== 'dust') continue;
      if (layer === 1 && (p.k === 'smoke' || p.k === 'dust')) continue;
      switch (p.k) {
        case 'smoke':
          ctx.fillStyle = p.dark ? 'rgba(20,18,16,' + (0.45 * f) + ')' : 'rgba(110,105,100,' + (0.35 * f) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); break;
        case 'dust':
          ctx.fillStyle = 'rgba(190,170,120,' + (0.35 * f) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); break;
        case 'fire':
          ctx.fillStyle = f > 0.6 ? 'rgba(255,240,170,' + f + ')' : 'rgba(255,' + (100 + 120 * f | 0) + ',30,' + f + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + f * 0.6), 0, U.TAU); ctx.fill(); break;
        case 'mud':
          ctx.fillStyle = 'rgba(80,55,25,' + Math.min(1, f * 1.5) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); break;
        case 'debris':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot || 0) + (1 - f) * 8);
          ctx.fillStyle = 'rgba(30,26,22,' + Math.min(1, f * 2) + ')'; ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.66);
          ctx.restore(); break;
        case 'spark':
          ctx.strokeStyle = p.col || '#ffd27a'; ctx.globalAlpha = f; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
          ctx.globalAlpha = 1; break;
        case 'flash': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,250,220,' + f + ')'); g.addColorStop(1, 'rgba(255,160,40,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); break;
        }
        case 'ring':
          ctx.strokeStyle = 'rgba(255,230,180,' + (f * 0.7) + ')'; ctx.lineWidth = 4 * f + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.stroke(); break;
      }
    }
  }

  // renkaanjäljet piirretään pysyvästi radan kuvaan
  function skids(race) {
    const g = R.trackCv.getContext('2d');
    g.lineCap = 'round';
    for (const c of race.cars) {
      const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
      const bx = c.x - fx * c.st.len * 0.3, by = c.y - fy * c.st.len * 0.3, w = c.st.wid * 0.4;
      const cur = [bx + rx * w, by + ry * w, bx - rx * w, by - ry * w];
      const last = R.skids.get(c);
      const mark = c.skid || (c.st.tracked && !c.wrecked && Math.hypot(c.vx, c.vy) > 30);
      if (mark && last) {
        g.strokeStyle = c.skid ? (AR.themeId === 'kyla' ? 'rgba(80,60,35,0.22)' : 'rgba(10,10,10,0.25)') : 'rgba(0,0,0,0.07)';
        g.lineWidth = c.st.tracked ? 7 : 3.5;
        g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(cur[0], cur[1]); g.moveTo(last[2], last[3]); g.lineTo(cur[2], cur[3]); g.stroke();
      }
      R.skids.set(c, mark ? cur : null);
    }
  }

  function drawPickup(ctx, p, t) {
    if (!p.on) return;
    const T = AR.T, kyla = AR.themeId === 'kyla';
    const b = Math.sin(t * 4 + p.x) * 2;
    ctx.save(); ctx.translate(p.x, p.y + b);
    const col = { cash: '#e8c030', repair: '#40c060', ammo: '#d06030', turbo: kyla ? '#60a0e0' : '#e05030' }[p.type];
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(3, 4 - b, 12, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, U.TAU); ctx.stroke();
    ctx.fillStyle = col; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const glyph = { cash: T.cur, repair: '+', ammo: '≡', turbo: '»' }[p.type];
    ctx.font = p.type === 'repair' || p.type === 'turbo' ? 'bold 16px system-ui, sans-serif' : 'bold 10px system-ui, sans-serif';
    ctx.fillText(glyph, 0, 1);
    ctx.restore();
  }

  function drawMine(ctx, m, t) {
    ctx.save(); ctx.translate(m.x, m.y);
    if (AR.themeId === 'kyla') {
      ctx.fillStyle = '#5a3d1c'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#7a5428'; ctx.beginPath(); ctx.arc(-2, -2, 6, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillRect(Math.cos(a) * 13, Math.sin(a * 1.3) * 13, 2, 2); } // kärpäset
    } else {
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = (m.arm <= 0 && Math.sin(t * 10) > 0) ? '#ff3020' : '#601010';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- kehys ----------
  R.frame = function (dt) {
    const race = R.race, ctx = R.ctx;
    if (!race || !ctx) return;
    R.t += dt;
    updParts(dt);
    skids(race);
    const W = R.W, H = R.H, dpr = R.dpr;
    R.shake *= Math.exp(-dt * 8);
    const vs = views(race);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = AR.TrackArt.PAL[AR.themeId].ground;
    ctx.fillRect(0, 0, R.cv.width, R.cv.height);
    vs.forEach((v, i) => {
      const P = v.car, cam = R.cams[i];
      const sp = Math.hypot(P.vx, P.vy);
      const tz = R.baseZoom(v) * (1 - 0.18 * Math.min(1, sp / 480));
      const k = Math.min(1, dt * 5);
      cam.z += (tz - cam.z) * Math.min(1, dt * 2);
      cam.x += (P.x + P.vx * 0.35 - cam.x) * k;
      cam.y += (P.y + P.vy * 0.35 - cam.y) * k;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip();
      drawWorld(ctx, race, v, cam);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(v.x, v.y);
      overlay(ctx, v.w, v.h);
      if (!R.hudOff) hudView(ctx, race, v);
      ctx.restore();
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (vs.length > 1) {
      // jakoviiva
      ctx.fillStyle = AR.themeId === 'kyla' ? '#2a2216' : '#0c0a08';
      if (vs[0].side) ctx.fillRect(W / 2 - 2, 0, 4, H); else ctx.fillRect(0, H / 2 - 2, W, 4);
    }
    if (!R.hudOff) hudShared(ctx, race, W, H, vs);
  };

  function drawWorld(ctx, race, v, cam) {
    const dpr = R.dpr, z = cam.z;
    const sx = (Math.random() - 0.5) * R.shake, sy = (Math.random() - 0.5) * R.shake;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cx + sx) - dpr * z * cam.x, dpr * (cy + sy) - dpr * z * cam.y);
    // näkyvä osa radasta
    const vx0 = Math.max(0, Math.floor(cam.x - v.w / 2 / z - 20)), vy0 = Math.max(0, Math.floor(cam.y - v.h / 2 / z - 20));
    const vx1 = Math.min(R.trackCv.width, Math.ceil(cam.x + v.w / 2 / z + 20)), vy1 = Math.min(R.trackCv.height, Math.ceil(cam.y + v.h / 2 / z + 20));
    if (vx1 > vx0 && vy1 > vy0) ctx.drawImage(R.trackCv, vx0, vy0, vx1 - vx0, vy1 - vy0, vx0, vy0, vx1 - vx0, vy1 - vy0);

    for (const p of race.pick) drawPickup(ctx, p, R.t);
    for (const m of race.mines) drawMine(ctx, m, R.t);
    drawParts(ctx, 0);
    const cars = race.cars.slice().sort((a, b) => (b.wrecked ? 1 : 0) - (a.wrecked ? 1 : 0));
    for (const c of cars) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      AR.VehDraw.draw(ctx, {
        vi: c.vi, color: c.color, steer: c.steerV, bend: c.bend, slew: c.slew, swing: c.swingT > 0 ? Math.sin((1 - c.swingT / 0.55) * Math.PI) : 0,
        roll: c.roll, t: R.t, ramLv: c.st.ramLv, armorLv: c.st.armorLv, gunLv: c.st.gunLv, firing: c.firingT > 0,
        wrecked: c.wrecked, hpFrac: c.hp / c.st.hp, seed: c.seed, turbo: c.turboOn
      });
      if (c.hitT > 0) {
        ctx.globalAlpha = Math.min(0.6, c.hitT * 4); ctx.fillStyle = '#fff';
        U.rr(ctx, -c.st.len / 2, -c.st.wid / 2, c.st.len, c.st.wid, 5); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    // ammukset
    ctx.lineCap = 'round';
    for (const b of race.bullets) {
      ctx.strokeStyle = b.col; ctx.lineWidth = b.r;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    drawParts(ctx, 1);
    // nimilaput (ei omalle koneelle; kaksinpelissä toinen pelaaja näkyy nimellä)
    const two = race.players.length > 1;
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const c of race.cars) {
      if (c.wrecked || c === v.me || (c.isPlayer && !two)) continue;
      const y = c.y - c.st.len * 0.6 - 6;
      if (c.isPlayer) ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(c.name, c.x + 1, y + 1);
      ctx.fillStyle = c.color; ctx.fillText(c.name, c.x, y);
      if (c.isPlayer) ctx.font = '600 11px system-ui, sans-serif';
      const f = Math.max(0, c.hp / c.st.hp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(c.x - 15, y + 1, 30, 3);
      ctx.fillStyle = f > 0.5 ? '#6c6' : f > 0.25 ? '#ec4' : '#e44'; ctx.fillRect(c.x - 15, y + 1, 30 * f, 3);
    }
    ctx.font = 'bold 14px system-ui, sans-serif';
    for (const p of R.popups) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = '#000'; ctx.fillText(p.text, p.x + 1, p.y + 1);
      ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function overlay(ctx, W, H) {
    const key = Math.round(W) + 'x' + Math.round(H);
    if (!R.vign || R.vignKey !== key) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      if (AR.themeId === 'kyla') { g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(40,30,0,0.25)'); }
      else { g.addColorStop(0, 'rgba(60,30,0,0.05)'); g.addColorStop(1, 'rgba(10,5,0,0.6)'); }
      R.vign = g; R.vignKey = key;
    }
    ctx.fillStyle = R.vign; ctx.fillRect(0, 0, W, H);
  }

  function bar(ctx, x, y, w, h, f, col, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, (w - 2) * U.clamp(f, 0, 1), h - 2);
    if (label) { ctx.fillStyle = '#fff'; ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 4, y + h / 2 + 0.5); }
  }

  // näkymäkohtainen HUD: oman koneen paneeli ja iso teksti (koordinaatit näkymän sisällä)
  function hudView(ctx, race, v) {
    const T = AR.T, P = v.split ? v.me : race.player;
    const W = v.w, H = v.h;
    const small = W < 600;
    const sc = small || H < 500 ? 0.78 : 1;
    ctx.save(); ctx.scale(sc, sc);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (P && v.split && v.side && P.pid === 1) ctx.translate(W / sc - 212, 0); // pelaaja 2:n paneeli oikeaan reunaan
    if (P) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; U.rr(ctx, 8, 8, 196, 112, 8); ctx.fill();
      if (v.split) { ctx.fillStyle = P.color; ctx.fillRect(16, 8, 180, 3); }
      ctx.fillStyle = v.split ? P.color : '#ffd34d'; ctx.font = '900 34px system-ui, sans-serif';
      ctx.fillText((P.pos || race.n) + '/' + race.n, 16, 44);
      ctx.fillStyle = '#ddd'; ctx.font = '600 12px system-ui, sans-serif';
      const lap = U.clamp(P.lap + 1, 1, race.laps);
      ctx.fillText(T.ui.lap.toUpperCase() + ' ' + lap + '/' + race.laps, 100, 26);
      const spd = Math.round(Math.hypot(P.vx, P.vy) * 0.29);
      ctx.fillText(v.split ? P.name : spd + ' ' + T.ui.speedUnit, 100, 42);
      const f = Math.max(0, P.hp / P.st.hp);
      bar(ctx, 16, 54, 180, 14, f, f > 0.5 ? '#4caf50' : f > 0.25 ? '#e0b030' : '#e04030', T.ui.hp + ' ' + Math.round(f * 100) + ' %');
      bar(ctx, 16, 72, 180, 10, P.turbo / 10, P.turboOn ? '#fff' : (AR.themeId === 'kyla' ? '#6ab0f0' : '#f08030'), '');
      ctx.fillStyle = '#ddd'; ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText(T.cons.turbo[0] + ' ' + P.turbo.toFixed(1) + ' s' + (race.hooki ? ' ⟳' : ''), 16, 96);
      const gunName = T.guns[P.st.gunLv] || '';
      ctx.fillText(gunName + ': ' + P.ammo + '   ' + T.cons.mines[0] + ': ' + P.mines, 16, 112);
      if (P.st.kauha) {
        ctx.fillStyle = P.specCd <= 0 ? '#ffd34d' : '#888';
        ctx.fillText(T.special.kauha + (P.specCd <= 0 ? ' ✓' : ''), 140, 96);
      }
      if (P.cash) { ctx.fillStyle = '#ffe066'; ctx.textAlign = 'right'; ctx.fillText('+' + P.cash + ' ' + T.cur, 196, 26 + 16); }
    }
    ctx.restore();
    // iso teksti: yksinpelissä kaikki tässä; kaksinpelissä vain oman koneen ilmoitukset (maali, romu, viimeinen kierros)
    const bn = P && P.banner && race.t - P.banner.t < 1.6 ? P.banner : (!v.split && race.banner && race.t - race.banner.t < 1.6 ? race.banner : null);
    let big = null, a = 1;
    if (!v.split && race.state === 'count') big = String(Math.max(1, Math.ceil(race.cd)));
    else if (bn) { big = bn.text; a = Math.min(1, (1.6 - (race.t - bn.t)) * 2); }
    if (big) bigText(ctx, big, a, W, H);
  }

  function bigText(ctx, big, a, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.min(W / Math.max(4, big.length * 0.62), 110);
    ctx.globalAlpha = a;
    ctx.font = '900 ' + Math.round(fs) + 'px system-ui, sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(big, W / 2, H * 0.38);
    ctx.fillStyle = AR.themeId === 'kyla' ? '#fff3c0' : '#ffb030'; ctx.fillText(big, W / 2, H * 0.38);
    ctx.globalAlpha = 1;
  }

  // yhteinen HUD: minikartta, sijoituslista ja viestit (kaksinpelissä keskellä jakoviivan kohdalla)
  function hudShared(ctx, race, W, H, vs) {
    const split = vs.length > 1;
    const small = (split ? vs[0].w : W) < 600;
    const sc = small || H < 500 ? 0.78 : 1;
    ctx.save(); ctx.scale(sc, sc);
    const Wv = W / sc, Hv = H / sc;
    const ms = split ? 0.8 : 1;
    const mw = R.mini ? R.mini.w * ms : 0, mh = R.mini ? R.mini.h * ms : 0;
    // minikartta: yksinpelissä oikealla ylhäällä, vierekkäisissä näkymissä keskellä ylhäällä
    let mx = Wv - mw - 8, my0 = 8;
    if (split && vs[0].side) { mx = Wv / 2 - mw / 2; my0 = 56; } // taukonapin alle
    else if (split) my0 = Hv / 2 + 8;
    if (R.mini) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; U.rr(ctx, mx, my0, mw, mh, 8); ctx.fill();
      ctx.drawImage(R.mini.cv, mx, my0, mw, mh);
      const m = R.mini.m;
      for (const c of race.cars) {
        ctx.fillStyle = c.wrecked ? '#555' : c.color;
        ctx.beginPath(); ctx.arc(mx + (m.ox + c.x * m.sc) * ms, my0 + (m.oy + c.y * m.sc) * ms, c.isPlayer ? 4.5 : 3.2, 0, U.TAU); ctx.fill();
        if (c.isPlayer) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
    // sijoituslista: yksinpelissä paneelin alla, kaksinpelissä minikartan vieressä/alla
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let lx = 8, yy = 136;
    if (split && vs[0].side) { lx = Wv / 2 - 75; yy = my0 + mh + 18; }
    else if (split) { lx = mx - 158; yy = my0 + 14; }
    for (const c of race.order) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(lx, yy - 11, 150, 15);
      ctx.fillStyle = c.color; ctx.fillRect(lx, yy - 11, 4, 15);
      ctx.fillStyle = c.wrecked ? '#888' : c.isPlayer ? (split ? c.color : '#ffd34d') : '#eee';
      ctx.font = (c.isPlayer ? '700 ' : '500 ') + '11px system-ui, sans-serif';
      ctx.fillText(c.pos + '. ' + c.name + (c.wrecked ? ' ✗' : c.finished ? ' 🏁' : ''), lx + 8, yy);
      yy += 16;
    }
    // viestit: yksinpelissä ylhäällä, kaksinpelissä alhaalla keskellä
    ctx.textAlign = 'center';
    ctx.font = '600 13px system-ui, sans-serif';
    const msgs = race.msgs.filter(m => race.t - m.t < 5);
    let my = split ? Hv - 14 - (msgs.length - 1) * 22 : (small ? 150 : 62);
    for (const m of msgs) {
      const a = Math.min(1, (5 - (race.t - m.t)) * 1.5);
      ctx.globalAlpha = a;
      const w = ctx.measureText(m.text).width + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; U.rr(ctx, Wv / 2 - w / 2, my - 13, w, 19, 6); ctx.fill();
      ctx.fillStyle = '#f2e8d0'; ctx.fillText(m.text, Wv / 2, my + 1);
      my += 22;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // kaksinpelin lähtölaskenta ja AJA! koko ruudun keskelle
    if (split) {
      let big = null, a = 1;
      if (race.state === 'count') big = String(Math.max(1, Math.ceil(race.cd)));
      else if (race.banner && race.t - race.banner.t < 1.6) { big = race.banner.text; a = Math.min(1, (1.6 - (race.t - race.banner.t)) * 2); }
      if (big) bigText(ctx, big, a, W, H);
    }
  }

  // koneen esikatselu valikoissa
  R.preview = function (cv, o, t) {
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const V = AR.VEH[o.vi];
    const s = Math.min(w / (V.len + 24), h / (V.wid + 24)) * 0.8;
    ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.rotate(o.rot == null ? -0.35 + Math.sin(t * 0.6) * 0.2 : o.rot);
    AR.VehDraw.draw(ctx, Object.assign({ steer: Math.sin(t) * 0.6, bend: Math.sin(t) * 0.3, slew: 0, roll: t * 20, t, hpFrac: 1, theme: AR.themeId, noShadow: true }, o));
  };
})();
