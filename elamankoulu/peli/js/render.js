/* Elämänkoulu – ottelun piirto: areena, hahmot, ammukset, efektit ja tilapalkit. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U, T = EK.T;
  const W = C.W, H = C.H, G = C.GROUND;
  const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

  const R = EK.Render = {
    parts: [],
    hype: 0,
    shakeX: 0, shakeY: 0,
    combo: [null, null],
    adv: null,
    hitbox: false,
    screenFlash: 0, screenFlashCol: '#fff'
  };

  const sx = (b, x) => x - b.cam.x + W / 2 + R.shakeX;
  const sy = y => G - y + R.shakeY;

  // ---------- efektit ----------
  function part(o) { R.parts.push(Object.assign({ t: 0, life: 30, vx: 0, vy: 0, g: 0, size: 4, color: '#fff' }, o)); }
  function burst(x, y, n, col, spd, type) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.5 + Math.random());
      part({ type: type || 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14 + Math.random() * 10, color: col, size: 3 + Math.random() * 3, a });
    }
  }
  function text(x, y, s, col, size, life, vy) { part({ type: 'text', x, y, text: s, color: col, size: size || 22, life: life || 50, vy: vy == null ? 0.8 : vy }); }

  // Taistelun tapahtumista efektit
  R.events = function (b, evs) {
    evs.forEach(e => {
      const who = e.who != null ? b.f[e.who] : null;
      switch (e.t) {
        case 'hit': {
          const big = e.str === 'H' || e.str === 'X';
          burst(e.x, e.y, big ? 14 : 8, big ? '#ffe46b' : '#ffffff', big ? 7 : 5);
          part({ type: 'ring', x: e.x, y: e.y, life: 14, size: big ? 60 : 36, color: '#fff' });
          if (big) for (let i = 0; i < 4; i++) part({ type: 'star', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: 3 + Math.random() * 4, g: 0.25, life: 36, color: '#ffe46b', size: 7 });
          if (e.counter) text(who.x, 220, T.counter, '#ffcf3a', 26, 50);
          if (e.punish) text(who.x, 220, T.punish, '#ff8a4a', 26, 50);
          if (e.rest) text(e.x, e.y + 40, 'Lepo keskeytyi!', '#ff9a9a', 18, 45);
          if (e.word) { text(e.x + (Math.random() - 0.5) * 60, e.y + 50, e.word, e.cine ? '#ffffff' : '#ffe46b', e.cine ? 38 : 26, 46, 1.1); R.screenFlash = e.str === 'X' ? 6 : 0; }
          R.hype = Math.min(1, R.hype + (big ? 0.25 : 0.1));
          if (big) R.shake(5);
          break;
        }
        case 'block':
          burst(e.x, e.y, 5, '#9fd0ff', 4);
          part({ type: 'shield', x: e.x, y: e.y, life: 12, size: 34, color: '#9fd0ff' });
          break;
        case 'parry': case 'perfectParry': {
          const pf = e.t === 'perfectParry';
          part({ type: 'ring', x: e.x, y: e.y, life: pf ? 30 : 18, size: pf ? 140 : 70, color: '#8fe3d4' });
          text(who.x, 230, pf ? T.perfectParry : T.parry, '#8fe3d4', pf ? 30 : 22, 55);
          if (pf) { R.screenFlash = 10; R.screenFlashCol = '#bff5ea'; }
          break;
        }
        case 'parryStart': part({ type: 'ring', x: who.x, y: who.y + 100, life: 12, size: 50, color: 'rgba(143,227,212,0.8)' }); break;
        case 'burnout':
          text(who.x, 230, T.burnout, '#a9b4c8', 28, 70);
          for (let i = 0; i < 8; i++) part({ type: 'steam', x: who.x + (Math.random() - 0.5) * 40, y: who.y + 170, vy: 1 + Math.random(), life: 50, size: 10, color: 'rgba(220,220,230,0.7)' });
          break;
        case 'rest': text(who.x, 200, T.rest, '#9be29b', 20, 50); break;
        case 'tech': text(e.x, 220, T.tech, '#ffffff', 26, 40); burst(e.x, 120, 8, '#ffffff', 5); break;
        case 'armor': burst(e.x, e.y, 6, '#f2a23a', 5); text(who.x, 230, 'KOVA PÄÄ', '#f2a23a', 20, 40); break;
        case 'absorb': part({ type: 'ring', x: e.x, y: e.y, life: 20, size: 60, color: '#8fe3d4' }); break;
        case 'clash': burst(e.x, e.y, 10, '#ffffff', 6); part({ type: 'ring', x: e.x, y: e.y, life: 16, size: 50, color: '#fff' }); break;
        case 'puff': burst(e.x, e.y, 5, e.color || '#fff', 2, 'dust'); break;
        case 'land': if (e.hard) { burst(e.x, 6, 8, 'rgba(200,190,170,0.8)', 3, 'dust'); R.shake(4); } break;
        case 'dash': part({ type: 'dust', x: who.x - who.facing * 20, y: 6, vx: -who.facing * 2, life: 18, size: 8, color: 'rgba(200,190,170,0.8)' }); break;
        case 'tele': case 'teleIn': burst(e.x, 100, 12, (who && who.ch[who.ch.s2.type === 'tele' ? 's2' : 's3'].fx) || '#fff', 4); break;
        case 'grab': part({ type: 'ring', x: e.x, y: 110, life: 12, size: 40, color: '#fff' }); break;
        case 'super':
          R.superBanner = { who: e.who, name: e.name, t: 0 };
          R.hype = 1;
          break;
        case 'ko': case 'opetus': R.shake(12); R.screenFlash = 12; R.screenFlashCol = '#ffffff'; break;
        case 'adv': R.adv = { v: e.v, t: 120, hit: e.hit }; break;
      }
      if (e.t === 'hit' && who) {
        const d = b.f[1 - e.who];
        R.combo[e.who] = { n: d.combo, dmg: d.comboDmg, t: 90 };
      }
    });
  };

  R.shake = function (k) { R.shakeAmt = Math.max(R.shakeAmt || 0, k); };

  function updParts() {
    R.parts.forEach(p => { p.t++; p.x += p.vx; p.y += p.vy; p.vy -= p.g; if (p.type === 'spark' || p.type === 'dust') { p.vx *= 0.88; p.vy *= 0.88; } });
    R.parts = R.parts.filter(p => p.t < p.life);
  }

  function drawParts(ctx, b) {
    R.parts.forEach(p => {
      const k = 1 - p.t / p.life;
      const x = sx(b, p.x), y = sy(p.y);
      ctx.globalAlpha = Math.min(1, k * 1.5);
      switch (p.type) {
        case 'spark':
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size * k + 1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 3, y + p.vy * 3); ctx.stroke(); break;
        case 'dust': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.size * (1.5 - k), 0, 7); ctx.fill(); break;
        case 'steam': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x + Math.sin(p.t * 0.2) * 4, y, p.size * (1.4 - k), 0, 7); ctx.fill(); break;
        case 'ring': ctx.strokeStyle = p.color; ctx.lineWidth = 4 * k + 1; ctx.beginPath(); ctx.arc(x, y, p.size * (1 - k * 0.7), 0, 7); ctx.stroke(); break;
        case 'shield': {
          ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; ctx.lineTo(x + Math.cos(a) * p.size * (1.1 - k * 0.3), y + Math.sin(a) * p.size * (1.1 - k * 0.3)); }
          ctx.closePath(); ctx.stroke(); break;
        }
        case 'star': drawStar(ctx, x, y, p.size, p.color, p.t * 0.2); break;
        case 'heart': ctx.fillStyle = p.color; ctx.font = p.size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', x, y); break;
        case 'text': {
          ctx.font = 'bold ' + p.size + 'px ' + FONT; ctx.textAlign = 'center';
          const sc = p.t < 6 ? 0.6 + p.t / 15 : 1;
          ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
          ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,14,30,0.85)'; ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0); ctx.restore();
          break;
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawStar(ctx, x, y, r, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#1b1622'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  R.drawStar = drawStar;

  // ---------- ammukset ----------
  function drawProj(ctx, b, p, time) {
    const x = sx(b, p.x), y = sy(p.y);
    const f = p.vx >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ink = '#1b1622';
    switch (p.sprite) {
      case 'cup': {
        ctx.rotate(Math.sin(p.t * 0.3) * 0.15 * f);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(12, -10); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(14 * f, 0, 6, -1.4, 1.4, f < 0); ctx.stroke();
        ctx.fillStyle = '#7a4520'; ctx.fillRect(-10, -9, 20, 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 6, -14); ctx.quadraticCurveTo(-10 + i * 6 + Math.sin(p.t * 0.3 + i) * 4, -22, -6 + i * 6, -30); ctx.stroke(); }
        trail(ctx, f, '#c98a4b');
        break;
      }
      case 'ring': {
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = 'rgba(143,227,212,' + (0.9 - i * 0.25) + ')'; ctx.lineWidth = 5 - i;
          ctx.beginPath(); ctx.ellipse(-i * 12 * f, 0, 10 + i * 2, 22 + i * 4 + Math.sin(p.t * 0.2) * 3, 0, 0, 7); ctx.stroke();
        }
        break;
      }
      case 'sock': {
        ctx.rotate(p.t * 0.25 * f);
        ctx.fillStyle = '#d95f5f'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(6, -16); ctx.lineTo(6, 4); ctx.lineTo(16, 8); ctx.quadraticCurveTo(18, 16, 8, 16); ctx.lineTo(-6, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f5efe0'; ctx.fillRect(-6, -16, 12, 5); ctx.fillRect(-6, -4, 12, 3);
        break;
      }
      case 'invite': {
        ctx.rotate(Math.sin(p.t * 0.15) * 0.1);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        EK.roundRect(ctx, -18, -15, 36, 30, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6fa8ff'; ctx.fillRect(-16.5, -13.5, 33, 8);
        ctx.fillStyle = '#1b1622'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('KOKOUS', 0, 6);
        ctx.fillStyle = '#d63c3c'; ctx.fillText('9.00!', 0, 13);
        trail(ctx, f, '#6fa8ff');
        break;
      }
      case 'flash': {
        const s = 1 + Math.sin(p.t * 0.8) * 0.15;
        ctx.fillStyle = 'rgba(255,247,168,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 30 * s, 0, 7); ctx.fill();
        drawStar(ctx, 0, 0, 22 * s, '#fffbe0', p.t * 0.3);
        break;
      }
      case 'chart': {
        ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-16 * f, 10); ctx.lineTo(-4 * f, -2); ctx.lineTo(4 * f, 6); ctx.lineTo(14 * f, -8); ctx.lineTo(8 * f, -10); ctx.lineTo(20 * f, -16); ctx.lineTo(18 * f, -2); ctx.lineTo(14 * f, -6); ctx.lineTo(4 * f, 12); ctx.lineTo(-4 * f, 4); ctx.lineTo(-14 * f, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
        trail(ctx, f, '#ffcf3a');
        break;
      }
      case 'beam': {
        const pulse = 1 + Math.sin(time * 0.5) * 0.06;
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-20 * f, 0, 80 * pulse, 58 * pulse, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center';
        const w = b.f[p.owner].ch.sup.words;
        ctx.fillText(w[Math.floor(p.t / 12) % w.length], 0, 5);
        break;
      }
    }
    ctx.restore();
  }
  function trail(ctx, f, col) {
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22 * f, -8 + i * 8); ctx.lineTo(-40 * f - i * 6 * f, -8 + i * 8); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ---------- hahmo ----------
  function drawFighter(ctx, b, f, time) {
    const x = sx(b, f.x) + (f.wobble ? Math.sin(f.wobble * 2.5) * 3 : 0), y = sy(f.y);
    const sz = f.ch.size;
    // varjo
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(sx(b, f.x), G + 2, 42 * sz * Math.max(0.4, 1 - f.y / 300), 8, 0, 0, 7); ctx.fill();
    const p = EK.poseFor(f, b, time);
    let alpha = 1;
    if (f.invis) alpha = 0.12;
    if (f.state === 'move' && f.move.tele) { const m = f.move.tele; if (f.mf >= m.f0 - 4 && f.mf < m.f0) alpha = 1 - (f.mf - m.f0 + 4) / 4; if (f.mf >= m.f1 && f.mf < m.f1 + 4) alpha = (f.mf - m.f1) / 4; }
    // auroja
    if (f.state === 'parry') aura(ctx, x, y - 95 * sz, 70 * sz, 'rgba(143,227,212,0.25)', 'rgba(143,227,212,0.7)', time);
    if (f.state === 'rest') {
      aura(ctx, x, y - 40, 56, 'rgba(155,226,155,0.2)', 'rgba(155,226,155,0.6)', time);
      if (time % 24 === 0) part({ type: 'text', x: f.x + 20 * f.facing, y: f.y + 90, text: 'z', color: '#d6f5d6', size: 18, life: 40, vy: 1.2 });
    }
    if (f.burn && time % 14 === 0) part({ type: 'steam', x: f.x + (Math.random() - 0.5) * 30, y: f.y + 175 * sz, vy: 1.2, life: 40, size: 7, color: 'rgba(210,210,225,0.55)' });
    const m = f.move;
    if (f.state === 'move' && m && (m.kind === 'special' || m.kind === 'super') && m.fx) {
      const active = m.hits.some(h => f.mf >= h.f0 && f.mf <= h.f1) || (m.counter && f.mf >= m.counter.f0 && f.mf <= m.counter.f1);
      if (active) moveFx(ctx, x, y, f, m, sz, time);
    }
    if (f.state === 'move' && m && m.kind === 'super' && f.mf < 20) aura(ctx, x, y - 95 * sz, 90, 'rgba(255,255,255,0.15)', m.fx, time);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(f.facing * sz, sz);
    const tint = f.flashT > 0 ? 'flash' : f.burn ? 'burn' : null;
    const cane = f.ch.look.prop === 'pole' && ((f.state === 'stand' && !f.crouching && !f.guarding) || f.state === 'intro' || f.state === 'win' || f.state === 'lose' || f.state === 'dash');
    EK.drawChar(ctx, f.ch, p, { tint, cane, calm: f.state === 'parry' || f.state === 'rest' });
    ctx.restore();
    // tyrmätyn tähdet
    if (f.state === 'koDown' && f.sf > 50) {
      for (let i = 0; i < 3; i++) { const a = time * 0.08 + i * 2.1; drawStar(ctx, x + Math.cos(a) * 22 - f.facing * 6, y - 78 + Math.sin(a) * 6, 6, '#ffe46b', a); }
    }
    if (f.state === 'stagger') for (let i = 0; i < 3; i++) { const a = time * 0.15 + i * 2.1; drawStar(ctx, x + Math.cos(a) * 20, y - 200 * sz + Math.sin(a) * 6, 5, '#bff5ea', a); }
  }

  function aura(ctx, x, y, r, fill, stroke, time) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r + Math.sin(time * 0.15) * 4, 0, 7); ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 6 + Math.sin(time * 0.15 + 1) * 4, 0, 7); ctx.stroke();
  }

  function moveFx(ctx, x, y, f, m, sz, time) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = m.fx; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const fc = f.facing;
    if (m.type === 'rise' || m.type === 'risec') {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + fc * 10, y - 110 * sz, 40 + i * 12, time * 0.3 + i, time * 0.3 + i + 2.2); ctx.stroke(); }
      if (f.ch.id === 'iida' && time % 4 === 0) part({ type: 'heart', x: f.x + (Math.random() - 0.5) * 50, y: f.y + 150, vy: 2, life: 30, size: 18, color: '#ff6fa8' });
    } else if (m.type === 'rush' || m.type === 'rushc' || m.type === 'spin') {
      for (let i = 0; i < 4; i++) { const yy = y - (40 + i * 30) * sz; ctx.beginPath(); ctx.moveTo(x - fc * 30, yy); ctx.lineTo(x - fc * (80 + i * 14), yy); ctx.stroke(); }
    } else if (m.type === 'counter') {
      ctx.beginPath(); ctx.arc(x, y - 110 * sz, 60, 0, 7); ctx.stroke();
    } else if (m.type === 'hop') {
      ctx.beginPath(); ctx.arc(x + fc * 30, y - 60, 40, -1, 1.5); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- tilapalkit ----------
  function hud(ctx, b, time) {
    const pad = 22, bw = 372, bh = 22, top = 18;
    b.f.forEach((f, i) => {
      const left = i === 0;
      const x0 = left ? pad : W - pad - bw;
      // viivästetty palkki
      f.dispHp += (f.hp - f.dispHp) * (f.state === 'hit' || f.state === 'juggle' || f.state === 'cine' ? 0.0 : 0.06);
      if (f.dispHp < f.hp) f.dispHp = f.hp;
      const frac = U.clamp(f.hp / f.ch.hp, 0, 1), dfrac = U.clamp(f.dispHp / f.ch.hp, 0, 1);
      ctx.fillStyle = 'rgba(20,14,30,0.75)'; EK.roundRect(ctx, x0 - 4, top - 4, bw + 8, bh + 8, 8); ctx.fill();
      ctx.fillStyle = '#3a2d44'; ctx.fillRect(x0, top, bw, bh);
      const dx = left ? x0 : x0 + bw * (1 - dfrac);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(dx, top, bw * dfrac, bh);
      const hx = left ? x0 : x0 + bw * (1 - frac);
      const g = ctx.createLinearGradient(0, top, 0, top + bh);
      const low = frac < 0.25 && time % 30 < 15;
      g.addColorStop(0, low ? '#ffb36b' : '#ffe58a'); g.addColorStop(1, low ? '#ff7a4a' : '#f2b33d');
      ctx.fillStyle = g; ctx.fillRect(hx, top, bw * frac, bh);
      ctx.strokeStyle = '#1b1622'; ctx.lineWidth = 2; ctx.strokeRect(x0, top, bw, bh);
      // nimi ja erävoitot
      ctx.font = 'bold 17px ' + FONT; ctx.textAlign = left ? 'left' : 'right';
      ctx.lineWidth = 4; ctx.strokeStyle = '#1b1622';
      const nm = f.ch.name.toUpperCase();
      ctx.strokeText(nm, left ? x0 : x0 + bw, top + bh + 20); ctx.fillStyle = '#fff'; ctx.fillText(nm, left ? x0 : x0 + bw, top + bh + 20);
      for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
        const cx = left ? x0 + bw - 10 - k * 22 : x0 + 10 + k * 22;
        ctx.beginPath(); ctx.arc(cx, top + bh + 14, 7, 0, 7);
        ctx.fillStyle = b.wins[i] > k ? '#ffcf3a' : 'rgba(255,255,255,0.15)'; ctx.fill(); ctx.strokeStyle = '#1b1622'; ctx.lineWidth = 2; ctx.stroke();
      }
      // alapalkit: jaksaminen ja oivallus
      const by = R.touchHud ? 104 : H - 44, mw = R.touchHud ? 200 : 250;
      const mx = left ? pad : W - pad - mw;
      ctx.fillStyle = 'rgba(20,14,30,0.7)'; EK.roundRect(ctx, mx - 6, by - 26, mw + 12, 56, 8); ctx.fill();
      // jaksaminen 6 palkkia
      const seg = 6, sw = (mw - (seg - 1) * 4) / seg;
      for (let s = 0; s < seg; s++) {
        const v = U.clamp((f.jaks - s * 100) / 100, 0, 1);
        const xx = left ? mx + s * (sw + 4) : mx + mw - (s + 1) * sw - s * 4;
        ctx.fillStyle = '#26303a'; ctx.fillRect(xx, by - 20, sw, 9);
        ctx.fillStyle = f.burn ? (time % 20 < 10 ? '#8a94a8' : '#5a6478') : v >= 1 ? '#5fe0b6' : '#3a9a7e';
        const ww = sw * v;
        ctx.fillRect(left ? xx : xx + sw - ww, by - 20, ww, 9);
      }
      ctx.font = 'bold 10px ' + FONT; ctx.fillStyle = f.burn ? '#c8cfe0' : '#9fe8d0'; ctx.textAlign = left ? 'left' : 'right';
      ctx.fillText(f.burn ? T.burnout : T.jaks, left ? mx : mx + mw, by - 4);
      // oivallus
      const mv = f.meter / C.METER;
      ctx.fillStyle = '#2a2236'; ctx.fillRect(mx, by + 2, mw, 16);
      const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      mg.addColorStop(0, '#7a4bd8'); mg.addColorStop(1, '#ff6fa8');
      ctx.fillStyle = mv >= 1 ? (time % 16 < 8 ? '#ffe46b' : '#ff6fa8') : mg;
      ctx.fillRect(left ? mx : mx + mw * (1 - mv), by + 2, mw * mv, 16);
      ctx.strokeStyle = '#1b1622'; ctx.lineWidth = 2; ctx.strokeRect(mx, by + 2, mw, 16);
      ctx.font = 'bold 12px ' + FONT; ctx.fillStyle = '#fff'; ctx.textAlign = left ? 'left' : 'right';
      const hint = R.superKeys && R.superKeys[i] ? '  →  ' + R.superKeys[i] : '';
      ctx.fillText(mv >= 1 ? T.meter + ' VALMIS!' + hint : T.meter, left ? mx + 6 : mx + mw - 6, by + 15);
      // yhdistelmälaskuri
      const cb = R.combo[i];
      if (cb && cb.t > 0 && cb.n >= 2) {
        cb.t--;
        const cx = left ? 30 : W - 30;
        ctx.textAlign = left ? 'left' : 'right';
        ctx.font = 'bold 34px ' + FONT; ctx.lineWidth = 5; ctx.strokeStyle = '#1b1622';
        ctx.globalAlpha = Math.min(1, cb.t / 20);
        const cy = R.touchHud ? 190 : 150;
        ctx.strokeText(cb.n + ' OSUMAA', cx, cy); ctx.fillStyle = '#ffe46b'; ctx.fillText(cb.n + ' OSUMAA', cx, cy);
        ctx.font = 'bold 16px ' + FONT; ctx.strokeText(cb.dmg + ' vahinkoa', cx, cy + 22); ctx.fillStyle = '#fff'; ctx.fillText(cb.dmg + ' vahinkoa', cx, cy + 22);
        ctx.globalAlpha = 1;
      }
    });
    // ajastin
    ctx.fillStyle = 'rgba(20,14,30,0.85)'; EK.roundRect(ctx, W / 2 - 34, 8, 68, 50, 10); ctx.fill();
    ctx.font = 'bold 34px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = b.timer < 600 && time % 30 < 15 ? '#ff8a6a' : '#fff';
    ctx.fillText(b.training ? '∞' : String(Math.ceil(b.timer / 60)), W / 2, 46);
    if (b.training && R.adv && R.adv.t > 0) {
      R.adv.t--;
      ctx.font = 'bold 16px ' + FONT; ctx.fillStyle = R.adv.v > 0 ? '#7cf0a0' : R.adv.v < 0 ? '#ff9a7a' : '#fff';
      ctx.fillText((R.adv.hit ? 'Osuma ' : 'Torjunta ') + (R.adv.v > 0 ? '+' : '') + R.adv.v, W / 2, 80);
    }
  }

  function bigText(ctx, s, size, col, y, k) {
    ctx.save();
    ctx.translate(W / 2, y || H * 0.42);
    const sc = k == null ? 1 : k;
    ctx.scale(sc, sc);
    ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textAlign = 'center';
    ctx.lineWidth = 10; ctx.strokeStyle = '#1b1622'; ctx.lineJoin = 'round'; ctx.strokeText(s, 0, 0);
    ctx.fillStyle = col; ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  R.bigText = bigText;

  function bubble(ctx, x, y, s, w) {
    ctx.font = '15px ' + FONT;
    const lines = U.wrap(ctx, s, w || 220);
    const bw = Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 24, bh = lines.length * 19 + 16;
    const bx = U.clamp(x - bw / 2, 8, W - bw - 8), by = y - bh;
    ctx.fillStyle = '#fff'; EK.roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = '#1b1622'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, by + bh); ctx.lineTo(x, by + bh + 12); ctx.lineTo(x + 8, by + bh); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#1b1622'; ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 22 + i * 19));
  }
  R.bubble = bubble;

  function phaseText(ctx, b, time) {
    const ph = b.phase, pt = b.pt;
    if (ph === 'intro') {
      const f = b.f[pt < 55 ? 0 : 1];
      const line = EK.LINES[f.ch.id].vs;
      bubble(ctx, sx(b, f.x), sy(f.y + 210 * f.ch.size), line, 240);
    }
    if (ph === 'ready') {
      if (pt < 56) bigText(ctx, b.finalRound() ? T.finalRound : T.round(b.round), 64, '#ffe46b', null, Math.min(1, pt / 8));
      else bigText(ctx, T.go, 90, '#ffffff', null, 1 + (pt - 56) / 40);
    }
    if (ph === 'fight' && pt < 20 && b.round >= 1 && !b.training) bigText(ctx, T.go, 90, '#ffffff', null, 1.6 + pt / 20);
    if (ph === 'ko') {
      const k = Math.min(1, pt / 10);
      if (b.opetus) { bigText(ctx, T.opetus, 96, '#ffcf3a', null, k); if (pt > 30) bigText(ctx, 'Pointti meni perille', 26, '#fff', H * 0.42 + 46, 1); }
      else { bigText(ctx, T.ko, 84, '#ffe46b', null, k); if (pt > 30) bigText(ctx, T.koSub, 24, '#fff', H * 0.42 + 42, 1); }
    }
    if (ph === 'timeup') bigText(ctx, T.timeUp, 64, '#ffe46b');
    if (ph === 'roundOver' || ph === 'done') {
      const w = b.lastRoundWinner;
      if (w >= 0) bigText(ctx, b.f[w].ch.name.split(' ')[0].toUpperCase() + ' VOITTAA ERÄN', 40, '#fff', H * 0.3);
      else bigText(ctx, T.draw, 50, '#fff', H * 0.3);
    }
  }

  function superBanner(ctx, b) {
    const s = R.superBanner;
    if (!s) return;
    s.t++;
    if (s.t > 60) { R.superBanner = null; return; }
    const f = b.f[s.who];
    const k = s.t < 8 ? s.t / 8 : s.t > 50 ? (60 - s.t) / 10 : 1;
    ctx.save();
    ctx.globalAlpha = k;
    const y = 150;
    ctx.fillStyle = f.ch.sup.fx; ctx.fillRect(0, y - 30, W, 60);
    ctx.fillStyle = 'rgba(20,14,30,0.85)'; ctx.fillRect(0, y - 24, W, 48);
    ctx.font = 'bold 34px ' + FONT; ctx.textAlign = s.who === 0 ? 'left' : 'right';
    ctx.fillStyle = f.ch.sup.fx;
    const tx = s.who === 0 ? 40 + (1 - k) * -200 : W - 40 + (1 - k) * 200;
    ctx.fillText(s.name.toUpperCase(), tx, y + 12);
    ctx.font = 'bold 14px ' + FONT; ctx.fillStyle = '#fff';
    ctx.fillText(f.ch.name, tx, y - 30 + 14 - 20);
    ctx.restore();
  }

  // ---------- pääpiirto ----------
  R.draw = function (ctx, b, time, bare) {
    if (R.shakeAmt > 0.3) { R.shakeX = (Math.random() - 0.5) * R.shakeAmt; R.shakeY = (Math.random() - 0.5) * R.shakeAmt * 0.6; R.shakeAmt *= 0.85; }
    else { R.shakeX = R.shakeY = 0; R.shakeAmt = 0; }
    R.hype *= 0.995;
    ctx.save();
    ctx.translate(R.shakeX * 0.5, R.shakeY * 0.5);
    EK.drawStage(ctx, b.stage, b.cam.x, time, R.hype);
    ctx.restore();
    if (b.flash || b.cine) {
      ctx.fillStyle = 'rgba(10,6,20,0.55)'; ctx.fillRect(0, 0, W, H);
      const who = b.flash ? b.f[b.flash.who] : b.cine.a;
      const cx = sx(b, who.x), cy = sy(100);
      ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = who.ch.sup.fx; ctx.lineWidth = 3;
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + time * 0.02; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); ctx.lineTo(cx + Math.cos(a) * 700, cy + Math.sin(a) * 700); ctx.stroke(); }
      ctx.restore();
    }
    // viimeksi hyökännyt päällimmäiseksi
    const order = b.f.slice().sort((a, c) => (a.state === 'move' || a.state === 'cineAtk' || a.state === 'throwing' ? 1 : 0) - (c.state === 'move' || c.state === 'cineAtk' || c.state === 'throwing' ? 1 : 0));
    order.forEach(f => drawFighter(ctx, b, f, time));
    b.projs.forEach(p => drawProj(ctx, b, p, time));
    if (R.hitbox) drawBoxes(ctx, b);
    updParts();
    drawParts(ctx, b);
    if (R.screenFlash > 0) { ctx.globalAlpha = R.screenFlash / 14; ctx.fillStyle = R.screenFlashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; R.screenFlash--; }
    if (bare) return;
    superBanner(ctx, b);
    hud(ctx, b, time);
    phaseText(ctx, b, time);
  };

  function drawBoxes(ctx, b) {
    const bx = (bb, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(sx(b, bb.x0), sy(bb.y1), bb.x1 - bb.x0, bb.y1 - bb.y0); };
    b.f.forEach(f => {
      f.hurtboxes().forEach(h => bx(h, 'rgba(80,160,255,0.9)'));
      if (f.state === 'move') f.move.hits.forEach(h => { if (f.mf >= h.f0 && f.mf <= h.f1) bx(f.toWorld(h.hb, 1), 'rgba(255,60,60,0.95)'); });
      ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(f.state + (f.move ? ':' + f.move.id + ' ' + f.mf : '') + ' ' + f.sf, sx(b, f.x), sy(f.y) + 16);
    });
    b.projs.forEach(p => bx(b.pbox(p), 'rgba(255,160,60,0.95)'));
  }

  R.reset = function () { R.parts = []; R.combo = [null, null]; R.hype = 0; R.superBanner = null; R.adv = null; R.screenFlash = 0; };
})();
