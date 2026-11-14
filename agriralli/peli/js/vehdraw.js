/* AgriRalli – koneiden piirto ylhäältä. Koordinaatisto: x eteenpäin, y oikealle, origo koneen keskellä. */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const rr = U.rr;

  function wheel(ctx, x, y, l, w, ang, knobby, roll) {
    ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang);
    ctx.fillStyle = '#141414';
    rr(ctx, -l / 2, -w / 2, l, w, Math.min(3, w / 2)); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    const st = knobby ? 3 : 4;
    const o = ((roll || 0) % st + st) % st;
    ctx.beginPath();
    for (let i = -l / 2 + o; i < l / 2; i += st) { ctx.moveTo(i, -w / 2); ctx.lineTo(i, w / 2); }
    ctx.stroke();
    ctx.restore();
  }

  function head(ctx, x, y, th, col, o) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 1, y + 1, 4.5, 0, U.TAU); ctx.fill();
    const vis = (o && o.driverVisual) || {};
    const isBeach = !!(o && o.beach);
    const gender = vis.gender || (o && o.gender) || 'f';
    const skin = vis.skin ? (AR.Portraits ? AR.Portraits.SKINS[vis.skin] : '#e8c49a') : (th === 'kyla' ? '#e8c49a' : '#dfb58a');
    const hair = vis.hair ? (AR.Portraits ? AR.Portraits.HAIR_COLORS[vis.hair] : '#f7d779') : (th === 'kyla' ? '#e8a020' : '#222226');
    const isFemale = gender === 'f';

    // Olkapäät / asu ylhäältä
    ctx.fillStyle = isBeach ? skin : (isFemale ? (vis.beachSuit || col) : '#222');
    ctx.beginPath();
    ctx.ellipse(x - 2, y, 4, 7, 0, 0, U.TAU);
    ctx.fill();

    // Bikinien narut tai olkaimet jos Beach Mod
    if (isBeach && isFemale) {
      ctx.strokeStyle = vis.beachSuit || '#ff3366';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 4); ctx.lineTo(x + 2, y - 2);
      ctx.moveTo(x - 2, y + 4); ctx.lineTo(x + 2, y + 2);
      ctx.stroke();
    }

    // Pää / iho
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, y, 4, 0, U.TAU); ctx.fill();

    // Hiukset ylhäältä
    if (isFemale) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(x, y, 4.2, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();
      // Tuulessa liehuvat hiukset
      const windLen = 6 + Math.sin((o && o.t ? o.t * 22 : 0)) * 1.5;
      ctx.beginPath();
      ctx.ellipse(x - windLen * 0.7, y, windLen * 0.7, 3.2, 0, 0, U.TAU);
      ctx.fill();
      // Kiille
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 1, y, 2.5, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();

      if (isBeach) {
        ctx.fillStyle = '#ff3366';
        ctx.beginPath(); ctx.arc(x + 1, y - 2.5, 1.5, 0, U.TAU); ctx.fill();
      }
    } else {
      if (th === 'kyla') {
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - 0.5, y, 3.8, Math.PI * 0.5, Math.PI * 1.5); ctx.fill(); // lippalakki
        ctx.fillRect(x - 0.5, y - 1.5, 4, 3);
      } else {
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#8fd0c0'; ctx.fillRect(x + 1, y - 2.5, 2.2, 5); // kaasunaamarin visiiri
      }
    }
    ctx.restore();
  }

  function spikes(ctx, x, w, lv, th) {
    if (!lv) return;
    ctx.fillStyle = th === 'kyla' ? '#9a9a9a' : '#c8c0b0';
    const n = 2 + lv;
    for (let i = 0; i < n; i++) {
      const y = -w / 2 + (i + 0.5) * (w / n);
      ctx.beginPath(); ctx.moveTo(x, y - 2.5); ctx.lineTo(x + 5 + lv * 1.5, y); ctx.lineTo(x, y + 2.5); ctx.fill();
    }
  }

  function plates(ctx, x, y, w, h, lv, th) {
    if (lv < 2) return;
    ctx.fillStyle = th === 'kyla' ? 'rgba(170,175,180,0.55)' : 'rgba(60,55,50,0.6)';
    rr(ctx, x, y, w, h, 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const n = Math.min(6, lv + 1);
    for (let i = 0; i < n; i++) {
      ctx.fillRect(x + 2 + (i * (w - 4)) / n, y + 1.5, 1.5, 1.5);
      ctx.fillRect(x + 2 + (i * (w - 4)) / n, y + h - 3, 1.5, 1.5);
    }
  }

  function gun(ctx, x, lv, firing) {
    if (!lv) return;
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 6, -1.8, 10 + lv, 3.6);
    if (lv === 2) ctx.fillRect(x - 6, -3.2, 10, 1.4);
    if (firing) {
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      ctx.beginPath(); ctx.moveTo(x + 4 + lv, -3); ctx.lineTo(x + 14 + lv, 0); ctx.lineTo(x + 4 + lv, 3); ctx.fill();
    }
  }

  // o: { vi, color, steer, bend, slew, swing, roll, t, ramLv, armorLv, gunLv, firing, wrecked, hpFrac, theme, turbo }
  function draw(ctx, o) {
    const V = AR.VEH[o.vi];
    const L = V.len, W = V.wid, th = o.theme || AR.themeId;
    const c = o.color, dk = U.shade(c, -0.45), lt = U.shade(c, 0.3);
    const roll = o.roll || 0;
    // varjo
    if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; rr(ctx, -L / 2 + 2, -W / 2 + 3, L, W, 8); ctx.fill(); }

    switch (V.id) {
      case 'leikkuri': {
        // leikkuupöytä ja pyörivät terät
        ctx.fillStyle = '#555'; rr(ctx, -6, -W / 2 - 2, 14, W + 4, 4); ctx.fill();
        ctx.save(); ctx.strokeStyle = 'rgba(220,220,220,0.8)'; ctx.lineWidth = 1.5;
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(1, s * (W / 2 - 1)); ctx.rotate((o.t || 0) * 30 * s);
          ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
        wheel(ctx, -L * 0.3, -W / 2 + 2, 10, 6, 0, false, roll);
        wheel(ctx, -L * 0.3, W / 2 - 2, 10, 6, 0, false, roll);
        wheel(ctx, L * 0.32, -W / 2 + 4, 6, 4, o.steer * 0.5, false, roll);
        wheel(ctx, L * 0.32, W / 2 - 4, 6, 4, o.steer * 0.5, false, roll);
        ctx.fillStyle = c; rr(ctx, -L / 2 + 2, -W / 2 + 4, L - 4, W - 8, 5); ctx.fill();
        ctx.fillStyle = lt; rr(ctx, L * 0.05, -W / 2 + 5, L * 0.4, W - 10, 4); ctx.fill();
        ctx.fillStyle = '#1b1b1b'; rr(ctx, -L * 0.32, -5, 8, 10, 2); ctx.fill();
        plates(ctx, L * 0.08, -W / 2 + 4, L * 0.32, 3, o.armorLv, th);
        spikes(ctx, L / 2 - 2, W - 8, o.ramLv, th);
        gun(ctx, L * 0.35, o.gunLv, o.firing);
        head(ctx, -L * 0.2, 0, th, dk, o);
        break;
      }
      case 'monkija': {
        wheel(ctx, -L * 0.3, -W / 2 + 1, 9, 6, 0, true, roll);
        wheel(ctx, -L * 0.3, W / 2 - 1, 9, 6, 0, true, roll);
        wheel(ctx, L * 0.3, -W / 2 + 1, 9, 6, o.steer * 0.5, true, roll);
        wheel(ctx, L * 0.3, W / 2 - 1, 9, 6, o.steer * 0.5, true, roll);
        ctx.fillStyle = dk; rr(ctx, -L / 2 + 2, -W / 2 + 5, L - 4, W - 10, 4); ctx.fill();
        ctx.fillStyle = c; rr(ctx, -L * 0.42, -W * 0.3, L * 0.84, W * 0.6, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-L / 2 + 3 + i * 2.5, -W * 0.25); ctx.lineTo(-L / 2 + 3 + i * 2.5, W * 0.25); ctx.stroke(); }
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L * 0.12, -W * 0.45); ctx.lineTo(L * 0.16, 0); ctx.lineTo(L * 0.12, W * 0.45); ctx.stroke();
        plates(ctx, L * 0.2, -W * 0.3, L * 0.22, 3, o.armorLv, th);
        spikes(ctx, L / 2 - 2, W - 8, o.ramLv, th);
        gun(ctx, L * 0.38, o.gunLv, o.firing);
        head(ctx, -L * 0.02, 0, th, dk, o);
        break;
      }
      case 'pikkutraktori': {
        wheel(ctx, -L * 0.22, -W / 2 + 1, 15, 8, 0, true, roll);
        wheel(ctx, -L * 0.22, W / 2 - 1, 15, 8, 0, true, roll);
        wheel(ctx, L * 0.3, -W / 2 + 4, 9, 5, o.steer * 0.55, false, roll);
        wheel(ctx, L * 0.3, W / 2 - 4, 9, 5, o.steer * 0.55, false, roll);
        ctx.fillStyle = dk; rr(ctx, -L / 2 + 1, -W * 0.36, L * 0.3, W * 0.72, 3); ctx.fill();
        ctx.fillStyle = c; rr(ctx, -L * 0.05, -W * 0.22, L * 0.53, W * 0.44, 4); ctx.fill(); // konepelti
        ctx.fillStyle = lt; ctx.fillRect(L * 0.05, -W * 0.08, L * 0.36, W * 0.16);
        ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(L * 0.18, -W * 0.13, 2.4, 0, U.TAU); ctx.fill(); // pakoputki
        ctx.fillStyle = c; rr(ctx, -L * 0.36, -W / 2 + 1, L * 0.3, 5, 2); ctx.fill(); rr(ctx, -L * 0.36, W / 2 - 6, L * 0.3, 5, 2); ctx.fill(); // lokasuojat
        ctx.fillStyle = 'rgba(160,200,220,0.55)'; rr(ctx, -L * 0.36, -W * 0.3, L * 0.32, W * 0.6, 3); ctx.fill(); // ohjaamo
        ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.strokeRect(-L * 0.36, -W * 0.3, L * 0.32, W * 0.6);
        plates(ctx, -L * 0.04, -W * 0.22, L * 0.5, 3, o.armorLv, th);
        spikes(ctx, L * 0.48, W * 0.44, o.ramLv, th);
        gun(ctx, L * 0.42, o.gunLv, o.firing);
        head(ctx, -L * 0.2, 0, th, dk, o);
        break;
      }
      case 'kurottaja': {
        wheel(ctx, -L * 0.3, -W / 2 + 1, 11, 7, -o.steer * 0.3, true, roll);
        wheel(ctx, -L * 0.3, W / 2 - 1, 11, 7, -o.steer * 0.3, true, roll);
        wheel(ctx, L * 0.28, -W / 2 + 1, 11, 7, o.steer * 0.4, true, roll);
        wheel(ctx, L * 0.28, W / 2 - 1, 11, 7, o.steer * 0.4, true, roll);
        ctx.fillStyle = dk; rr(ctx, -L / 2 + 2, -W * 0.32, L - 4, W * 0.64, 4); ctx.fill();
        // piikit (haarukka)
        const fx = L / 2 - 1, fl = V.forks;
        ctx.fillStyle = '#333'; ctx.fillRect(fx - 3, -W * 0.36, 4, W * 0.72);
        ctx.fillStyle = th === 'kyla' ? '#777' : '#b9b0a0';
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(fx, s * W * 0.22 - 2); ctx.lineTo(fx + fl, s * W * 0.22 - 0.5); ctx.lineTo(fx + fl + (th === 'kyla' ? 0 : 3), s * W * 0.22);
          ctx.lineTo(fx + fl, s * W * 0.22 + 0.5); ctx.lineTo(fx, s * W * 0.22 + 2); ctx.fill();
        }
        // puomi
        ctx.fillStyle = c; rr(ctx, -L * 0.45, W * 0.02, L * 0.92, 7, 2); ctx.fill();
        ctx.fillStyle = lt; ctx.fillRect(L * 0.1, W * 0.02 + 2, L * 0.36, 3);
        // ohjaamo vasemmalla
        ctx.fillStyle = c; rr(ctx, -L * 0.25, -W * 0.42, L * 0.38, W * 0.38, 3); ctx.fill();
        ctx.fillStyle = 'rgba(160,200,220,0.6)'; rr(ctx, -L * 0.2, -W * 0.38, L * 0.28, W * 0.3, 2); ctx.fill();
        plates(ctx, -L * 0.42, W * 0.02, L * 0.5, 3, o.armorLv, th);
        spikes(ctx, fx, W * 0.3, o.ramLv, th);
        gun(ctx, L * 0.2, o.gunLv, o.firing);
        head(ctx, -L * 0.06, -W * 0.23, th, dk, o);
        break;
      }
      case 'linkku': {
        const b = (o.bend || 0);
        // takarunko
        ctx.save(); ctx.rotate(-b / 2);
        wheel(ctx, -L * 0.3, -W / 2 + 1, 17, 9, 0, true, roll);
        wheel(ctx, -L * 0.3, W / 2 - 1, 17, 9, 0, true, roll);
        ctx.fillStyle = dk; rr(ctx, -L / 2 + 1, -W * 0.3, L * 0.48, W * 0.6, 4); ctx.fill();
        ctx.fillStyle = c; rr(ctx, -L * 0.46, -W * 0.25, L * 0.4, W * 0.5, 3); ctx.fill();
        ctx.fillStyle = '#333'; ctx.fillRect(-L / 2 - 2, -3, 5, 6); // vetokoukku
        plates(ctx, -L * 0.44, -W * 0.25, L * 0.36, 3, o.armorLv, th);
        ctx.restore();
        // nivel
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, U.TAU); ctx.fill();
        // eturunko
        ctx.save(); ctx.rotate(b / 2);
        wheel(ctx, L * 0.3, -W / 2 + 1, 17, 9, 0, true, roll);
        wheel(ctx, L * 0.3, W / 2 - 1, 17, 9, 0, true, roll);
        ctx.fillStyle = dk; rr(ctx, 0, -W * 0.3, L * 0.5, W * 0.6, 4); ctx.fill();
        ctx.fillStyle = c; rr(ctx, L * 0.18, -W * 0.22, L * 0.32, W * 0.44, 4); ctx.fill(); // konepelti
        ctx.fillStyle = lt; ctx.fillRect(L * 0.24, -W * 0.06, L * 0.22, W * 0.12);
        ctx.fillStyle = 'rgba(160,200,220,0.6)'; rr(ctx, L * 0.01, -W * 0.3, L * 0.18, W * 0.6, 3); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(L * 0.01, -W * 0.3, L * 0.18, W * 0.6);
        ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(L * 0.22, W * 0.16, 2.6, 0, U.TAU); ctx.fill();
        spikes(ctx, L * 0.5, W * 0.5, o.ramLv, th);
        gun(ctx, L * 0.44, o.gunLv, o.firing);
        head(ctx, L * 0.1, 0, th, dk, o);
        ctx.restore();
        break;
      }
      case 'puimuri': {
        wheel(ctx, L * 0.12, -W * 0.36, 16, 9, 0, true, roll);
        wheel(ctx, L * 0.12, W * 0.36, 16, 9, 0, true, roll);
        wheel(ctx, -L * 0.36, -W * 0.3, 10, 6, -o.steer * 0.5, false, roll);
        wheel(ctx, -L * 0.36, W * 0.3, 10, 6, -o.steer * 0.5, false, roll);
        ctx.fillStyle = c; rr(ctx, -L / 2 + 1, -W * 0.3, L * 0.78, W * 0.6, 5); ctx.fill();
        ctx.fillStyle = lt; rr(ctx, -L * 0.35, -W * 0.2, L * 0.4, W * 0.4, 4); ctx.fill(); // vilja-säiliö
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-L * 0.3, -W * 0.15, L * 0.3, W * 0.3);
        ctx.fillStyle = dk; ctx.fillRect(-L * 0.45, -W * 0.38, L * 0.6, 3.5); // purkuputki
        ctx.fillStyle = 'rgba(160,200,220,0.6)'; rr(ctx, L * 0.1, -W * 0.18, L * 0.16, W * 0.36, 2); ctx.fill();
        ctx.strokeStyle = dk; ctx.lineWidth = 2; ctx.strokeRect(L * 0.1, -W * 0.18, L * 0.16, W * 0.36);
        // leikkuupöytä
        ctx.fillStyle = dk; ctx.fillRect(L * 0.28, -W / 2, L * 0.1, W);
        ctx.fillStyle = th === 'kyla' ? '#c8a830' : '#7a2a1a';
        ctx.fillRect(L * 0.38, -W / 2, L * 0.12, W);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
        const ph = (roll * 0.5) % 6;
        ctx.beginPath();
        for (let y = -W / 2 + ph; y < W / 2; y += 6) { ctx.moveTo(L * 0.38, y); ctx.lineTo(L * 0.5, y + 2); }
        ctx.stroke();
        ctx.fillStyle = '#ccc';
        for (let y = -W / 2 + 2; y < W / 2; y += 5) { ctx.beginPath(); ctx.moveTo(L * 0.5, y - 1.5); ctx.lineTo(L * 0.5 + 3 + (o.ramLv || 0), y); ctx.lineTo(L * 0.5, y + 1.5); ctx.fill(); }
        plates(ctx, -L * 0.48, W * 0.18, L * 0.5, 3, o.armorLv, th);
        gun(ctx, L * 0.3, o.gunLv, o.firing);
        head(ctx, L * 0.18, 0, th, dk, o);
        break;
      }
      case 'kaivinkone': {
        // telat
        for (const s of [-1, 1]) {
          ctx.fillStyle = '#1a1a1a'; rr(ctx, -L * 0.42, s * W * 0.36 - W * 0.14, L * 0.84, W * 0.28, 4); ctx.fill();
          ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.5;
          const o2 = ((roll * (s > 0 ? 1 : 1)) % 5 + 5) % 5;
          ctx.beginPath();
          for (let x = -L * 0.42 + o2; x < L * 0.42; x += 5) { ctx.moveTo(x, s * W * 0.36 - W * 0.14); ctx.lineTo(x, s * W * 0.36 + W * 0.14); }
          ctx.stroke();
        }
        // ylävaunu kääntyy (slew)
        ctx.save(); ctx.rotate(o.slew || 0);
        ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(-L * 0.06, 0, W * 0.42, 0, U.TAU); ctx.fill();
        ctx.fillStyle = c; rr(ctx, -L * 0.4, -W * 0.36, L * 0.6, W * 0.72, 5); ctx.fill();
        ctx.fillStyle = '#3a3a3a'; rr(ctx, -L * 0.46, -W * 0.3, L * 0.12, W * 0.6, 4); ctx.fill(); // vastapaino
        ctx.fillStyle = 'rgba(160,200,220,0.6)'; rr(ctx, L * 0.02, -W * 0.34, L * 0.16, W * 0.28, 2); ctx.fill();
        plates(ctx, -L * 0.32, W * 0.12, L * 0.4, 3, o.armorLv, th);
        // puomi, varsi ja kauha
        const ext = 1 + (o.swing || 0) * 0.25;
        ctx.fillStyle = lt; rr(ctx, L * 0.1, -2, L * 0.45 * ext, 8, 2); ctx.fill();
        ctx.strokeStyle = dk; ctx.lineWidth = 1; ctx.strokeRect(L * 0.1, -2, L * 0.45 * ext, 8);
        const bx = L * 0.1 + L * 0.45 * ext;
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath(); ctx.moveTo(bx - 3, -9); ctx.lineTo(bx + 8, -11); ctx.lineTo(bx + 8, 13); ctx.lineTo(bx - 3, 11); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ccc';
        for (let y = -9; y <= 11; y += 5) { ctx.beginPath(); ctx.moveTo(bx + 8, y - 1.5); ctx.lineTo(bx + 12, y + 0.5); ctx.lineTo(bx + 8, y + 2); ctx.fill(); }
        gun(ctx, L * 0.15, o.gunLv, o.firing);
        head(ctx, L * 0.1, -W * 0.2, th, dk, o);
        ctx.restore();
        spikes(ctx, L * 0.42, W * 0.9, o.ramLv, th);
        break;
      }
    }

    // Ajovalojen ja takavalojen piirto
    if (!o.noLights && !o.wrecked) {
      // Keulan ajovalot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(L / 2 - 2, -W * 0.32, 2.2, 0, U.TAU);
      ctx.arc(L / 2 - 2, W * 0.32, 2.2, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,190,0.55)';
      ctx.beginPath();
      ctx.arc(L / 2 - 2, -W * 0.32, 4, 0, U.TAU);
      ctx.arc(L / 2 - 2, W * 0.32, 4, 0, U.TAU);
      ctx.fill();

      // Takavalot
      const braking = !!o.braking;
      ctx.fillStyle = braking ? '#ff2222' : '#881111';
      ctx.fillRect(-L / 2 + 1, -W * 0.36, 2, 4);
      ctx.fillRect(-L / 2 + 1, W * 0.36 - 4, 2, 4);
      if (braking) {
        ctx.fillStyle = 'rgba(255, 30, 30, 0.6)';
        ctx.beginPath();
        ctx.arc(-L / 2, -W * 0.36 + 2, 5, 0, U.TAU);
        ctx.arc(-L / 2, W * 0.36 - 2, 5, 0, U.TAU);
        ctx.fill();
      }
    }

    // vauriot: nokitahroja
    if (o.hpFrac < 0.6 || o.wrecked) {
      const r = U.rng((o.seed || 1) * 31);
      const n = o.wrecked ? 8 : Math.round((0.6 - o.hpFrac) * 12);
      ctx.fillStyle = 'rgba(15,12,10,0.55)';
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc((r() - 0.5) * L * 0.8, (r() - 0.5) * W * 0.7, 2 + r() * 4, 0, U.TAU); ctx.fill();
      }
    }
    if (o.wrecked) {
      ctx.fillStyle = 'rgba(10,8,6,0.55)';
      rr(ctx, -L / 2, -W / 2, L, W, 6); ctx.fill();
    }
    if (o.turbo) {
      const fl = 16 + Math.random() * 14;
      ctx.fillStyle = th === 'kyla' ? 'rgba(80,180,255,0.95)' : 'rgba(255,120,30,0.95)';
      ctx.beginPath();
      ctx.moveTo(-L / 2, -W * 0.16);
      ctx.lineTo(-L / 2 - fl, 0);
      ctx.lineTo(-L / 2, W * 0.16);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-L / 2, -W * 0.08);
      ctx.lineTo(-L / 2 - fl * 0.55, 0);
      ctx.lineTo(-L / 2, W * 0.08);
      ctx.fill();
    }
  }

  AR.VehDraw = { draw };
})();
