/* AgriRalli – radan esipiirto teemoittain yhdeksi isoksi kuvaksi (piirretään kerran kisan alussa) */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;

  const PAL = {
    dystopia: {
      ground: '#3a332c', specks: ['#2c2722', '#4a4038', '#51463a', '#2f2a26', '#5a4c3a'],
      rough: '#4d4237', roughSpecks: ['#3a3029', '#62533f', '#2c2620', '#6d5d48'],
      wall: '#1d1b1a', wallTop: '#77716a', stripe: '#d9a21b',
      road: '#4c4b4a', roadSpecks: ['#3e3d3c', '#5a5958', '#434241', '#555'], edge: 'rgba(220,210,190,0.35)'
    },
    kyla: {
      ground: '#5f8a3a', specks: ['#557d33', '#6b9643', '#4f7330', '#76a04c', '#5a8436'],
      rough: '#8a7a55', roughSpecks: ['#7a6b48', '#9a8a62', '#6c5f40', '#a89a72'],
      wall: '#6a665e', wallTop: '#8d8a82', stripe: '#a7a39a',
      road: '#b9a47a', roadSpecks: ['#a8936b', '#c8b48a', '#9c8862', '#d1bf96'], edge: 'rgba(0,0,0,0)'
    }
  };

  function linePath(ctx, tr, off, skipTight) {
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= tr.N; i++) {
      const k = i % tr.N;
      // sisäkaarteessa siirretty viiva kiertäisi silmukalle → hypätään yli
      if (skipTight && tr.curv[k] * off < -0.8) { pen = false; continue; }
      const x = tr.px[k] + tr.nx[k] * off, y = tr.py[k] + tr.ny[k] * off;
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    }
  }

  function centerPath(ctx, tr) {
    ctx.beginPath();
    for (let k = 0; k < tr.N; k++) {
      if (k === 0) ctx.moveTo(tr.px[k], tr.py[k]); else ctx.lineTo(tr.px[k], tr.py[k]);
    }
    ctx.closePath();
  }

  // pienin etäisyys keskilinjaan (karkea, joka 3. näyte)
  function distToTrack(tr, x, y) {
    let bd = 1e18;
    for (let k = 0; k < tr.N; k += 3) {
      const d = (tr.px[k] - x) ** 2 + (tr.py[k] - y) ** 2;
      if (d < bd) bd = d;
    }
    return Math.sqrt(bd);
  }

  function specks(ctx, r, n, x0, y0, w, h, cols, smin, smax, alpha) {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[(r() * cols.length) | 0];
      const s = smin + r() * (smax - smin);
      ctx.fillRect(x0 + r() * w, y0 + r() * h, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- maapohjat ----------
  function groundDystopia(ctx, tr, r) {
    const P = PAL.dystopia;
    ctx.fillStyle = P.ground; ctx.fillRect(0, 0, tr.w, tr.h);
    // isot tahrat
    for (let i = 0; i < 40; i++) {
      const x = r() * tr.w, y = r() * tr.h, rad = 80 + r() * 260;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const c = r() < 0.5 ? '20,16,12' : '90,70,45';
      g.addColorStop(0, 'rgba(' + c + ',0.35)'); g.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    specks(ctx, r, (tr.w * tr.h) / 900, 0, 0, tr.w, tr.h, P.specks, 2, 6, 0.7);
    // halkeamat
    ctx.strokeStyle = 'rgba(15,12,10,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      let x = r() * tr.w, y = r() * tr.h, a = r() * U.TAU;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) { a += (r() - 0.5) * 1.4; x += Math.cos(a) * 18; y += Math.sin(a) * 18; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // kraatterit
    for (let i = 0; i < 18; i++) {
      const x = r() * tr.w, y = r() * tr.h, rad = 25 + r() * 45;
      if (distToTrack(tr, x, y) < tr.lim + rad + 30) continue;
      ctx.fillStyle = 'rgba(15,12,10,0.5)'; ctx.beginPath(); ctx.arc(x, y, rad, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(110,95,75,0.6)'; ctx.lineWidth = 6; ctx.stroke();
    }
  }

  function groundKyla(ctx, tr, r) {
    const P = PAL.kyla;
    ctx.fillStyle = P.ground; ctx.fillRect(0, 0, tr.w, tr.h);
    // pellot: kierrettyjä lohkoja, joissa kylvörivit
    const fields = ['#c8b25a', '#d6c46c', '#7fa046', '#6d4f33', '#9bb553', '#b9a24a'];
    for (let i = 0; i < 16; i++) {
      const x = r() * tr.w, y = r() * tr.h, w = 380 + r() * 600, h = 260 + r() * 420, a = (r() - 0.5) * 0.5;
      const col = fields[(r() * fields.length) | 0];
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 3;
      for (let yy = -h / 2 + 8; yy < h / 2; yy += 14) { ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(60,90,30,0.6)'; ctx.lineWidth = 8; ctx.strokeRect(-w / 2, -h / 2, w, h); // pientareet
      ctx.restore();
    }
    // järvi
    const lx = r() * tr.w, ly = r() * tr.h;
    if (distToTrack(tr, lx, ly) > tr.lim + 260) {
      ctx.fillStyle = '#3d6f8f';
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * U.TAU, rad = 170 + r() * 60;
        const x = lx + Math.cos(a) * rad * 1.4, y = ly + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9c08a'; ctx.lineWidth = 10; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 12; i++) ctx.fillRect(lx + (r() - 0.5) * 300, ly + (r() - 0.5) * 200, 30, 2);
      tr.lake = { x: lx, y: ly };
    }
    specks(ctx, r, (tr.w * tr.h) / 1100, 0, 0, tr.w, tr.h, P.specks, 2, 5, 0.45);
  }

  // ---------- rata ----------
  function body(ctx, tr, r, th) {
    const P = PAL[th];
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // seinä (paksu reunus)
    centerPath(ctx, tr);
    ctx.strokeStyle = P.wall; ctx.lineWidth = 2 * (tr.lim + tr.WT); ctx.stroke();
    // seinän yksityiskohdat
    for (const sgn of [-1, 1]) {
      const off = sgn * (tr.lim + tr.WT / 2);
      if (th === 'dystopia') {
        linePath(ctx, tr, off, true);
        ctx.strokeStyle = P.wallTop; ctx.lineWidth = tr.WT * 0.8; ctx.setLineDash([]); ctx.stroke();
        ctx.strokeStyle = P.stripe; ctx.lineWidth = tr.WT * 0.5; ctx.setLineDash([14, 14]); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // kiviaita: kiviä seinän linjalla
        for (let k = 0; k < tr.N; k++) {
          if (tr.curv[k] * off < -0.8) continue;
          for (let j = 0; j < 2; j++) {
            const o = off + (r() - 0.5) * tr.WT * 0.9;
            const x = tr.px[k] + tr.nx[k] * o + (r() - 0.5) * 6, y = tr.py[k] + tr.ny[k] * o + (r() - 0.5) * 6;
            const g = 110 + r() * 70;
            ctx.fillStyle = 'rgb(' + (g | 0) + ',' + ((g - 4) | 0) + ',' + ((g - 12) | 0) + ')';
            ctx.beginPath(); ctx.arc(x, y, 4 + r() * 5, 0, U.TAU); ctx.fill();
          }
        }
      }
    }
    // piennar
    centerPath(ctx, tr);
    ctx.strokeStyle = P.rough; ctx.lineWidth = 2 * tr.lim; ctx.stroke();
    for (let i = 0; i < tr.N * 10; i++) {
      const k = (r() * tr.N) | 0, o = (tr.W / 2 + r() * tr.M) * (r() < 0.5 ? -1 : 1);
      ctx.fillStyle = P.roughSpecks[(r() * P.roughSpecks.length) | 0];
      const s = 2 + r() * 5;
      ctx.fillRect(tr.px[k] + tr.nx[k] * o, tr.py[k] + tr.ny[k] * o, s, s);
    }
    if (th === 'kyla') {
      // heinätupsut pientareella
      ctx.strokeStyle = 'rgba(70,110,40,0.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < tr.N * 2; i++) {
        const k = (r() * tr.N) | 0, o = (tr.W / 2 + 10 + r() * (tr.M - 15)) * (r() < 0.5 ? -1 : 1);
        const x = tr.px[k] + tr.nx[k] * o, y = tr.py[k] + tr.ny[k] * o;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 7); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 7); ctx.stroke();
      }
    }
    // tie
    centerPath(ctx, tr);
    ctx.strokeStyle = P.road; ctx.lineWidth = tr.W; ctx.stroke();
    for (let i = 0; i < tr.N * 16; i++) {
      const k = (r() * tr.N) | 0, o = (r() - 0.5) * tr.W;
      ctx.fillStyle = P.roadSpecks[(r() * P.roadSpecks.length) | 0];
      ctx.globalAlpha = 0.7;
      const s = 1.5 + r() * 3;
      ctx.fillRect(tr.px[k] + tr.nx[k] * o, tr.py[k] + tr.ny[k] * o, s, s);
    }
    ctx.globalAlpha = 1;
    if (th === 'dystopia') {
      // reunaviivat, haalistunut keskiviiva, paikkaukset ja halkeamat
      for (const sgn of [-1, 1]) {
        linePath(ctx, tr, sgn * (tr.W / 2 - 7), true);
        ctx.strokeStyle = P.edge; ctx.lineWidth = 3; ctx.stroke();
      }
      linePath(ctx, tr, 0, false);
      ctx.strokeStyle = 'rgba(230,200,120,0.18)'; ctx.lineWidth = 3; ctx.setLineDash([26, 30]); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < tr.N / 8; i++) {
        const k = (r() * tr.N) | 0, o = (r() - 0.5) * tr.W * 0.7;
        const x = tr.px[k] + tr.nx[k] * o, y = tr.py[k] + tr.ny[k] * o;
        if (r() < 0.4) {
          ctx.fillStyle = 'rgba(35,35,35,0.55)';
          ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 3); ctx.fillRect(-15 - r() * 15, -10, 30 + r() * 25, 20 + r() * 10); ctx.restore();
        } else {
          ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 1.2;
          let xx = x, yy = y, a = r() * U.TAU;
          ctx.beginPath(); ctx.moveTo(xx, yy);
          for (let j = 0; j < 5; j++) { a += (r() - 0.5) * 1.6; xx += Math.cos(a) * 9; yy += Math.sin(a) * 9; ctx.lineTo(xx, yy); }
          ctx.stroke();
        }
      }
    } else {
      // pyöränurat ja keskikaistan heinä
      for (const sgn of [-1, 1]) {
        linePath(ctx, tr, sgn * tr.W * 0.22, true);
        ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.lineWidth = 16; ctx.stroke();
      }
      linePath(ctx, tr, 0, false);
      ctx.strokeStyle = 'rgba(110,140,60,0.35)'; ctx.lineWidth = 7; ctx.stroke();
    }
    // lähtö/maaliviiva (ruudukko)
    const k0 = 0, sq = 12;
    ctx.save();
    ctx.translate(tr.px[k0], tr.py[k0]);
    ctx.rotate(Math.atan2(tr.ty[k0], tr.tx[k0]));
    const cols = Math.ceil(tr.W / sq);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#111' : '#eee';
        ctx.fillRect(-sq + j * sq, -tr.W / 2 + i * sq, sq, Math.min(sq, tr.W / 2 - (-tr.W / 2 + i * sq)));
      }
    }
    ctx.restore();
  }

  function hazards(ctx, tr, r, th) {
    for (const h of tr.hazards) {
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
      if (th === 'dystopia') {
        ctx.fillStyle = 'rgba(8,8,10,0.85)';
        ctx.beginPath(); ctx.ellipse(0, 0, h.r * 1.2, h.r * 0.8, 0, 0, U.TAU); ctx.fill();
        const g = ctx.createLinearGradient(-h.r, -h.r, h.r, h.r);
        g.addColorStop(0, 'rgba(120,60,200,0.25)'); g.addColorStop(0.5, 'rgba(40,180,160,0.22)'); g.addColorStop(1, 'rgba(200,170,40,0.2)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(-h.r * 0.2, -h.r * 0.1, h.r * 0.7, h.r * 0.4, 0.4, 0, U.TAU); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(90,62,30,0.9)';
        ctx.beginPath(); ctx.ellipse(0, 0, h.r * 1.2, h.r * 0.85, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(60,40,18,0.9)';
        for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * h.r * 1.4, (r() - 0.5) * h.r, 3 + r() * 5, 0, U.TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.ellipse(-h.r * 0.3, -h.r * 0.3, h.r * 0.4, h.r * 0.15, 0.3, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- rekvisiitta ----------
  const PROPS = {
    dystopia: [['ruin', 3, 80], ['barrel', 4, 12], ['tires', 3, 16], ['wreck', 2, 26], ['pylon', 1, 30], ['chimney', 1, 34], ['deadtree', 2, 26]],
    kyla: [['barn', 2, 80], ['house', 2, 60], ['birch', 5, 22], ['spruce', 5, 22], ['bale', 3, 14], ['rock', 2, 16], ['sauna', 1, 30], ['seivas', 2, 30]]
  };

  function drawProp(ctx, type, r) {
    switch (type) {
      case 'ruin': {
        const w = 70 + r() * 90, h = 50 + r() * 70;
        ctx.fillStyle = '#26221f'; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = '#57504a'; ctx.lineWidth = 6; ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2, -h / 2); ctx.lineTo(w * (0.1 + r() * 0.3), -h / 2);
        ctx.moveTo(w / 2, -h / 4); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w * 0.2, h / 2); ctx.stroke();
        ctx.fillStyle = '#4a433c';
        for (let i = 0; i < 10; i++) ctx.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 4 + r() * 10, 4 + r() * 8);
        return;
      }
      case 'barrel': {
        const n = 1 + ((r() * 3) | 0);
        for (let i = 0; i < n; i++) {
          const x = (r() - 0.5) * 26, y = (r() - 0.5) * 26;
          ctx.fillStyle = r() < 0.5 ? '#8a4a1e' : '#5c6b2e';
          ctx.beginPath(); ctx.arc(x, y, 9, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 5, 0, U.TAU); ctx.stroke();
        }
        return;
      }
      case 'tires': {
        for (let i = 0; i < 3; i++) {
          const x = (r() - 0.5) * 20, y = (r() - 0.5) * 20;
          ctx.fillStyle = '#151515'; ctx.beginPath(); ctx.arc(x, y, 11, 0, U.TAU); ctx.fill();
          ctx.fillStyle = '#3a332c'; ctx.beginPath(); ctx.arc(x, y, 5, 0, U.TAU); ctx.fill();
        }
        return;
      }
      case 'wreck': {
        ctx.rotate(r() * 3);
        ctx.fillStyle = '#2b2622'; U.rr(ctx, -22, -11, 44, 22, 5); ctx.fill();
        ctx.fillStyle = '#5e3a22'; U.rr(ctx, -10, -9, 20, 18, 3); ctx.fill();
        ctx.fillStyle = '#111'; ctx.fillRect(-18, -13, 8, 4); ctx.fillRect(10, 9, 8, 4);
        return;
      }
      case 'pylon': {
        ctx.strokeStyle = '#5b5650'; ctx.lineWidth = 3;
        ctx.strokeRect(-22, -22, 44, 44);
        ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke();
        return;
      }
      case 'chimney': {
        const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
        g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(-60, -60, 120, 120);
        ctx.fillStyle = '#6a5040'; ctx.beginPath(); ctx.arc(0, 0, 28, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#0d0b0a'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, U.TAU); ctx.fill();
        return;
      }
      case 'deadtree': {
        ctx.strokeStyle = '#2a2018'; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = r() * U.TAU, l = 12 + r() * 16;
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
        }
        ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, U.TAU); ctx.fill();
        return;
      }
      case 'barn': {
        const w = 90 + r() * 60, h = 55 + r() * 25;
        ctx.rotate((r() - 0.5) * 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2 + 8, -h / 2 + 8, w, h);
        ctx.fillStyle = '#9b2d20'; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
        ctx.fillStyle = '#7f2219'; ctx.fillRect(-w / 2, 0, w, h / 2);
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = '#5a1810'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
        return;
      }
      case 'house': {
        const w = 60 + r() * 30, h = 45 + r() * 15;
        ctx.rotate((r() - 0.5) * 0.6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w, h);
        const c = r() < 0.5 ? ['#d9c25a', '#c2ab45'] : ['#a33a2a', '#8a2e20'];
        ctx.fillStyle = '#3d3d42'; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
        ctx.fillStyle = '#2f2f33'; ctx.fillRect(-w / 2, 0, w, h / 2);
        ctx.strokeStyle = c[0]; ctx.lineWidth = 4; ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = '#7a3a2a'; ctx.fillRect(w / 4, -h / 2 + 4, 8, 8); // savupiippu
        return;
      }
      case 'birch': {
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(5, 5, 20, 0, U.TAU); ctx.fill();
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#7fb24a' : '#93c25a';
          ctx.beginPath(); ctx.arc((r() - 0.5) * 18, (r() - 0.5) * 18, 9 + r() * 6, 0, U.TAU); ctx.fill();
        }
        ctx.fillStyle = '#f2f0e8'; ctx.fillRect(-2, -2, 4, 4);
        return;
      }
      case 'spruce': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(5, 5, 19, 0, U.TAU); ctx.fill();
        for (let lay = 0; lay < 3; lay++) {
          const R = 20 - lay * 6;
          ctx.fillStyle = ['#244a26', '#2e5a2f', '#3a6d38'][lay];
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * U.TAU, rr = i % 2 ? R : R * 0.6;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath(); ctx.fill();
        }
        return;
      }
      case 'bale': {
        const n = 1 + ((r() * 4) | 0);
        for (let i = 0; i < n; i++) {
          const x = i * 22 - n * 11, y = (r() - 0.5) * 8;
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(x + 3, y + 3, 11, 0, U.TAU); ctx.fill();
          ctx.fillStyle = r() < 0.6 ? '#ecebe4' : '#d8c27a';
          ctx.beginPath(); ctx.arc(x, y, 11, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, U.TAU); ctx.stroke();
        }
        return;
      }
      case 'rock': {
        ctx.fillStyle = '#7d7a72';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU, rr = 10 + r() * 8;
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(-3, -4, 5, 0, U.TAU); ctx.fill();
        return;
      }
      case 'sauna': {
        ctx.rotate((r() - 0.5) * 0.8);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-14, -11, 34, 26);
        ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-18, -14, 34, 26);
        ctx.strokeStyle = '#3a2814'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, -1); ctx.lineTo(16, -1); ctx.stroke();
        ctx.fillStyle = '#444'; ctx.fillRect(4, -10, 6, 6);
        ctx.fillStyle = 'rgba(220,220,220,0.35)'; ctx.beginPath(); ctx.arc(10, -18, 6, 0, U.TAU); ctx.arc(16, -26, 8, 0, U.TAU); ctx.fill();
        return;
      }
      case 'seivas': {
        ctx.rotate(r() * 3);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(i * 12 - 24 + 2, 2, 6, 9, 0, 0, U.TAU); ctx.fill();
          ctx.fillStyle = '#c9b25a'; ctx.beginPath(); ctx.ellipse(i * 12 - 24, 0, 6, 9, 0, 0, U.TAU); ctx.fill();
        }
        return;
      }
    }
  }

  function props(ctx, tr, r, th) {
    const list = PROPS[th];
    const weights = list.reduce((a, p) => a + p[1], 0);
    let n = Math.round((tr.w * tr.h) / 45000);
    const tries = n * 3;
    for (let i = 0; i < tries && n > 0; i++) {
      let w = r() * weights, it = list[0];
      for (const p of list) { w -= p[1]; if (w <= 0) { it = p; break; } }
      const x = 20 + r() * (tr.w - 40), y = 20 + r() * (tr.h - 40);
      if (distToTrack(tr, x, y) < tr.lim + tr.WT + it[2] + 12) continue;
      if (tr.lake && Math.hypot(x - tr.lake.x, y - tr.lake.y) < 320) continue;
      ctx.save(); ctx.translate(x, y);
      drawProp(ctx, it[0], r);
      ctx.restore();
      n--;
    }
  }

  function render(tr, th) {
    th = PAL[th] ? th : 'dystopia';
    const cv = document.createElement('canvas');
    cv.width = tr.w; cv.height = tr.h;
    const ctx = cv.getContext('2d');
    const r = U.rng(tr.seed * 104729 + (th === 'kyla' ? 7 : 0));
    if (th === 'dystopia') groundDystopia(ctx, tr, r); else groundKyla(ctx, tr, r);
    props(ctx, tr, r, th);
    body(ctx, tr, r, th);
    hazards(ctx, tr, r, th);
    return cv;
  }

  // pieni karttakuva (kisavalinta, minikartta)
  function mini(ctx, tr, x, y, w, h, opts) {
    opts = opts || {};
    const sc = Math.min(w / tr.w, h / tr.h);
    const ox = x + (w - tr.w * sc) / 2, oy = y + (h - tr.h * sc) / 2;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k < tr.N; k += 2) {
      const X = ox + tr.px[k] * sc, Y = oy + tr.py[k] * sc;
      if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.closePath();
    ctx.strokeStyle = opts.edge || 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(3, tr.W * sc + 2); ctx.stroke();
    ctx.strokeStyle = opts.col || '#ddd'; ctx.lineWidth = Math.max(2, tr.W * sc - 1); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(ox + tr.px[0] * sc - 2, oy + tr.py[0] * sc - 2, 4, 4);
    ctx.restore();
    return { sc, ox, oy };
  }

  AR.TrackArt = { render, mini, PAL };
})();
