/* Elämänkoulu – hahmon piirto luurangosta. Sarjakuvamainen tyyli: paksut ääriviivat ja tasaiset värit.
   EK.drawChar(ctx, ch, pose, opt) piirtää hahmon niin, että jalkojen kohta on origossa (y ylöspäin negatiivinen). */
(function () {
  'use strict';
  const EK = window.EK, U = EK.U;
  const D = U.deg;
  const INK = '#1b1622';

  const limbV = a => [Math.sin(a * D), Math.cos(a * D)];     // raaja: 0 = alas
  const upV = a => [Math.sin(a * D), -Math.cos(a * D)];      // vartalo: 0 = ylös
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];

  function stroke(ctx, pts, w, col) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  function dot(ctx, p, r, col, ink) {
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    if (ink) { ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
  }

  EK.drawChar = function (ctx, ch, p, opt) {
    opt = opt || {};
    const L = ch.look, B = EK.BONES, bw = L.build || 1;
    const tint = opt.tint || null;      // 'flash' | 'burn' | null
    const col = c => {
      if (!c) return c;
      if (tint === 'flash') return U.shade(c, 0.75);
      if (tint === 'burn') { const r = U.hex2rgb(c); const g = (r[0] + r[1] + r[2]) / 3; return 'rgb(' + Math.round(r[0] * 0.45 + g * 0.45 + 10) + ',' + Math.round(r[1] * 0.45 + g * 0.45 + 12) + ',' + Math.round(r[2] * 0.45 + g * 0.5 + 25) + ')'; }
      if (tint === 'calm') return U.shade(c, 0.18);
      return c;
    };
    const far = c => c && U.shade(col(c), -0.18);
    const skin = col(L.skin), skinF = far(L.skin);
    const shirt = col(L.acc.indexOf('overalls') >= 0 ? L.top2 : L.top);
    const pants = col(L.bottom);

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // nivelet
    const H = [p.hx || 0, -p.hy];
    const tv = upV(p.t);
    const nf = [Math.cos(p.t * D), Math.sin(p.t * D)]; // vartalon etusuunta
    const N = add(H, tv, B.torso);
    const S = add(H, tv, B.torso - 7);
    const ha = p.t + p.hd;
    const hv = upV(ha);
    const Hc = add(N, hv, B.head + 3);
    const arm = (u, f) => { const E = add(S, limbV(u), B.ua); return [S, E, add(E, limbV(f), B.fa)]; };
    const leg = (u, f, dx) => { const h = [H[0] + dx, H[1]]; const K = add(h, limbV(u), B.th); return [h, K, add(K, limbV(f), B.sh)]; };
    const A1 = arm(p.a1u, p.a1f), A2 = arm(p.a2u, p.a2f);
    const L1 = leg(p.l1u, p.l1f, -3), L2 = leg(p.l2u, p.l2f, 3);
    const wUA = 11 * bw, wFA = 9.5 * bw, wTH = 15 * bw, wSH = 12 * bw;

    const sleeveCol = (fc) => L.sleeves === 'none' ? (fc ? skinF : skin) : fc ? far(L.acc.indexOf('overalls') >= 0 ? L.top2 : L.top) : shirt;
    const foreCol = (fc) => L.sleeves === 'long' ? sleeveCol(fc) : (fc ? skinF : skin);
    const thighCol = (fc) => L.legs === 'skirt' ? (fc ? far(L.bottom) : pants) : (fc ? far(L.bottom) : pants);
    const shinCol = (fc) => L.legs === 'shorts' ? (fc ? skinF : skin) : L.legs === 'skirt' ? (fc ? far('#6d5c74') : col('#6d5c74')) : (fc ? far(L.bottom) : pants);

    function drawArm(A, isFar) {
      const wmax = Math.max(wUA, wFA);
      stroke(ctx, A, wmax + 5, INK);
      stroke(ctx, [A[0], A[1]], wUA, sleeveCol(isFar));
      stroke(ctx, [A[1], A[2]], wFA, foreCol(isFar));
      if (L.sleeves === 'long') dot(ctx, add(A[1], limbV(0), 0), 0.1, foreCol(isFar));
      dot(ctx, A[2], 6.2 * bw, isFar ? skinF : skin, true);
    }
    function drawLeg(Lg, isFar, footAng) {
      stroke(ctx, Lg, Math.max(wTH, wSH) + 5, INK);
      stroke(ctx, [Lg[0], Lg[1]], wTH, thighCol(isFar));
      stroke(ctx, [Lg[1], Lg[2]], wSH, shinCol(isFar));
      // kenkä
      const fv = limbV(footAng + 90);
      const heel = add(Lg[2], fv, -5), toe = add(Lg[2], fv, 15);
      const sc = L.shoes ? (isFar ? far(L.shoes) : col(L.shoes)) : (isFar ? skinF : skin);
      stroke(ctx, [heel, toe], (L.shoes ? 10 : 8) + 5, INK);
      stroke(ctx, [heel, toe], L.shoes ? 10 : 8, sc);
    }

    // --- taakse jäävät osat ---
    if (L.acc.indexOf('backpack') >= 0) {
      const c = add(add(H, tv, 34), nf, -22 * bw);
      ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(p.t * D);
      ctx.fillStyle = col('#30c48d'); ctx.strokeStyle = INK; ctx.lineWidth = 3;
      roundRect(ctx, -17, -24, 30, 46, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col('#e9fff6'); ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RUOKA', -2, 3);
      ctx.restore();
    }
    if (L.hairStyle === 'braids' || L.hairStyle === 'ponytail') hairBack(ctx, Hc, ha, L, col);

    drawArm(A1, true);
    drawLeg(L1, true, p.l1f);

    // vartalo
    const wh = 14 * bw, wc = 17 * bw;
    const tp = new Path2D();
    const hb = add(H, nf, -wh), hf = add(H, nf, wh * 0.95);
    const cf = add(add(S, nf, wc), tv, -2), cb = add(N, nf, -wc * 0.85);
    const bulge = add(add(H, tv, B.torso * 0.55), nf, wc * 1.12);
    tp.moveTo(hb[0], hb[1]);
    tp.lineTo(hf[0], hf[1]);
    tp.quadraticCurveTo(bulge[0], bulge[1], cf[0], cf[1]);
    const top = add(N, tv, 3);
    tp.quadraticCurveTo(top[0] + nf[0] * wc * 0.4, top[1] + nf[1] * wc * 0.4, top[0], top[1]);
    tp.quadraticCurveTo(cb[0] + tv[0] * 4, cb[1] + tv[1] * 4, cb[0], cb[1]);
    const backMid = add(add(H, tv, B.torso * 0.5), nf, -wh * 1.05);
    tp.quadraticCurveTo(backMid[0], backMid[1], hb[0], hb[1]);
    tp.closePath();
    ctx.fillStyle = L.acc.indexOf('suit') >= 0 ? col(L.top) : shirt; ctx.fill(tp);
    ctx.save(); ctx.clip(tp);
    torsoDetails(ctx, L, col, H, N, tv, nf, wh, wc, bw);
    // vyötärö
    const w1 = add(H, tv, 0), w2 = add(H, tv, 13);
    if (L.legs !== 'skirt' && L.acc.indexOf('overalls') < 0) { stroke(ctx, [add(w1, nf, -40), add(w1, nf, 40)], 22, pants); stroke(ctx, [add(w2, nf, -40), add(w2, nf, 40)], 3, U.shade(pants, -0.3)); }
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(tp);

    // kaula ja pää
    stroke(ctx, [N, add(N, hv, 5)], 10 * bw + 4, INK);
    stroke(ctx, [N, add(N, hv, 5)], 10 * bw, skin);
    drawHead(ctx, Hc, ha, L, col, skin, p, opt);

    // hame ja esiliina reisien päällä
    if (L.legs === 'skirt') {
      drawLeg(L2, false, p.l2f);
      skirt(ctx, H, L1, L2, nf, tv, pants);
    } else drawLeg(L2, false, p.l2f);
    if (L.acc.indexOf('apron') >= 0) apron(ctx, H, L2, nf, tv, col(L.top2), bw);
    if (L.acc.indexOf('hammer') >= 0) {
      const hp = add(add(H, tv, 6), nf, -wh * 0.9);
      stroke(ctx, [hp, add(hp, limbV(10), 26)], 5 + 4, INK); stroke(ctx, [hp, add(hp, limbV(10), 26)], 5, col('#a8743a'));
      stroke(ctx, [add(hp, [-7, 0], 1), add(hp, [7, 0], 1)], 8 + 4, INK); stroke(ctx, [add(hp, [-7, 0], 1), add(hp, [7, 0], 1)], 8, col('#8c95a3'));
    }

    // tukikeppi tai puhelin lähemmässä kädessä
    const prop = opt.prop !== undefined ? opt.prop : L.prop;
    if (prop === 'pole') {
      const hand = A2[2];
      let end;
      if (opt.cane) end = [hand[0] + 12, 0];
      else { const v = limbV(p.a2f); end = add(hand, v, 62); }
      stroke(ctx, [add(hand, [end[0] - hand[0], end[1] - hand[1]], -0.12), end], 4 + 4, INK);
      stroke(ctx, [add(hand, [end[0] - hand[0], end[1] - hand[1]], -0.12), end], 4, col('#9aa3ad'));
      dot(ctx, end, 3, col('#333'));
    }
    drawArm(A2, false);
    if (L.acc.indexOf('phone') >= 0) {
      const h = A2[2];
      ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate((p.a2f - 90) * D);
      ctx.fillStyle = col('#1f1f2b'); ctx.strokeStyle = INK; ctx.lineWidth = 2;
      roundRect(ctx, 2, -9, 7, 14, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col('#7fd8ff'); ctx.fillRect(3.5, -7, 4, 9);
      ctx.restore();
    }
    ctx.restore();
    return { head: Hc, hand: A2[2], hand1: A1[2], hip: H, foot: L2[2] };
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  EK.roundRect = roundRect;

  function torsoDetails(ctx, L, col, H, N, tv, nf, wh, wc, bw) {
    const acc = L.acc;
    if (acc.indexOf('overalls') >= 0) {
      // haalarin lappu ja olkaimet
      const c = col(L.top);
      const a = add(add(H, tv, 36), nf, -wc), b = add(add(H, tv, 36), nf, wc * 1.3);
      ctx.beginPath(); ctx.moveTo(add(H, nf, -40)[0], add(H, nf, -40)[1]); ctx.lineTo(add(H, nf, 40)[0], add(H, nf, 40)[1]);
      ctx.lineTo(add(b, tv, 0)[0], add(b, tv, 0)[1]); ctx.lineTo(a[0], a[1]); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
      stroke(ctx, [add(add(H, tv, 36), nf, wc * 0.4), add(add(N, tv, 2), nf, -wc * 0.2)], 6, c);
      dot(ctx, add(add(H, tv, 33), nf, wc * 0.55), 2.5, col('#f2d36b'));
      ctx.strokeStyle = U.shade(c, -0.3); ctx.lineWidth = 1.5;
      ctx.strokeRect(add(add(H, tv, 22), nf, wc * 0.1)[0] - 5, add(add(H, tv, 22), nf, wc * 0.1)[1] - 5, 10, 8);
    }
    if (acc.indexOf('cardigan') >= 0) {
      const f1 = add(add(N, tv, 2), nf, wc * 0.75), f2 = add(H, nf, wh * 0.95);
      stroke(ctx, [f1, f2], 5, col(L.top2));
      for (let i = 1; i < 4; i++) dot(ctx, [U.lerp(f1[0], f2[0], i / 4) - nf[0] * 5, U.lerp(f1[1], f2[1], i / 4) - nf[1] * 5], 2, col('#f6e7b0'));
    }
    if (acc.indexOf('suit') >= 0) {
      // valkoinen paita ja solmio
      const n = add(N, tv, 2);
      ctx.beginPath(); ctx.moveTo(n[0] + nf[0] * 4, n[1] + nf[1] * 4);
      const m = add(add(H, tv, 30), nf, wc * 0.85);
      ctx.lineTo(m[0], m[1]); ctx.lineTo(add(n, nf, wc * 1.2)[0], add(n, nf, wc * 1.2)[1]); ctx.closePath();
      ctx.fillStyle = col(L.top2); ctx.fill();
      stroke(ctx, [add(n, nf, wc * 0.8), add(add(H, tv, 32), nf, wc * 0.95)], 4, col('#d63c3c'));
    }
    if (L.hairStyle !== 'none' && acc.indexOf('hood') >= 0) {
      stroke(ctx, [add(add(N, tv, -14), nf, wc * 0.9), add(add(H, tv, 20), nf, wc * 0.95)], 2, col(L.top2));
    }
    if (L.sleeves === 'none') {
      // hihaton paita: olkapää näkyy
      stroke(ctx, [add(add(N, tv, -6), nf, -wc * 0.2), add(add(N, tv, -18), nf, -wc * 0.6)], 3, U.shade(col(L.top), -0.2));
    }
    if (acc.indexOf('cardigan') < 0 && acc.indexOf('suit') < 0 && acc.indexOf('overalls') < 0 && L.top2 && acc.indexOf('apron') < 0 && acc.indexOf('headband') < 0) {
      // rintaraita
      const a = add(add(H, tv, 34), nf, -40), b = add(add(H, tv, 34), nf, 40);
      stroke(ctx, [a, b], 6, col(L.top2));
    }
  }

  function apron(ctx, H, L2, nf, tv, c, bw) {
    const a = add(add(H, tv, 30), nf, 13 * bw), b = add(H, nf, 15 * bw);
    const kneeF = add(L2[1], nf, 6);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(add(a, nf, 6)[0], add(a, nf, 6)[1]);
    ctx.lineTo(kneeF[0] + 6, kneeF[1] + 4);
    ctx.lineTo(kneeF[0] - 12, kneeF[1] + 6);
    ctx.lineTo(b[0] - nf[0] * 18, b[1] - nf[1] * 18);
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    stroke(ctx, [add(H, nf, -14), add(H, nf, 16)], 3, U.shade(c, -0.25));
  }

  function skirt(ctx, H, L1, L2, nf, tv, c) {
    const top1 = add(add(H, tv, 6), nf, -15), top2 = add(add(H, tv, 6), nf, 15);
    const k1 = L1[1], k2 = L2[1];
    ctx.beginPath();
    ctx.moveTo(top1[0], top1[1]); ctx.lineTo(top2[0], top2[1]);
    ctx.lineTo(Math.max(k1[0], k2[0]) + 12, Math.max(k1[1], k2[1]) + 8);
    ctx.lineTo(Math.min(k1[0], k2[0]) - 12, Math.max(k1[1], k2[1]) + 8);
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  }

  function hairBack(ctx, Hc, ha, L, col) {
    ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(ha * D);
    const c = col(L.hair);
    if (L.hairStyle === 'ponytail') {
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(-34, -10, -30, 22); ctx.quadraticCurveTo(-22, 6, -8, -2); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    } else {
      [-6, -12].forEach((x, i) => { stroke(ctx, [[x - 4, 0], [x - 10, 36 - i * 6]], 9, INK); stroke(ctx, [[x - 4, 0], [x - 10, 36 - i * 6]], 5.5, c); });
    }
    ctx.restore();
  }

  function drawHead(ctx, Hc, ha, L, col, skin, p, opt) {
    const R = EK.BONES.head;
    ctx.save(); ctx.translate(Hc[0], Hc[1]); ctx.rotate(ha * D);
    const hair = col(L.hair);
    // korva ja pää
    dot(ctx, [0, 0], R, skin, true);
    // nenä
    ctx.beginPath(); ctx.moveTo(13, -3); ctx.lineTo(18.5, 3); ctx.lineTo(13, 5); ctx.closePath();
    ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = skin; ctx.fillRect(11, -2, 3, 6);
    // hiukset
    const hs = L.hairStyle;
    ctx.fillStyle = hair; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    const cap = (a0, a1, r) => { ctx.beginPath(); ctx.arc(0, 0, r || R + 1.5, a0, a1); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    if (L.acc.indexOf('helmet') >= 0) {
      ctx.fillStyle = hair; cap(Math.PI * 0.75, Math.PI * 1.15);
      ctx.fillStyle = col(L.top2 || '#333');
      ctx.beginPath(); ctx.ellipse(0, -5, 19, 15, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col(L.top); [-8, 0, 8].forEach(x => ctx.fillRect(x - 2, -17, 4, 7));
      stroke(ctx, [[8, -6], [14, 10]], 2, INK);
    } else if (hs === 'cap') {
      cap(Math.PI * 0.8, Math.PI * 1.1);
      ctx.fillStyle = col('#e05a2b');
      ctx.beginPath(); ctx.ellipse(0, -6, 16.5, 12, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -7); ctx.lineTo(28, -5); ctx.lineTo(26, -1); ctx.lineTo(8, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      cap(Math.PI * 0.92, Math.PI * 1.92);
      if (hs === 'bun') dot(ctx, [-11, -12], 8, hair, true);
      if (hs === 'topknot') dot(ctx, [-3, -19], 7, hair, true);
      if (hs === 'granny') { dot(ctx, [-12, -9], 9, hair, true); dot(ctx, [-4, -15], 5, hair, false); dot(ctx, [4, -15], 5, hair, false); }
      if (hs === 'messy') { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (1.05 + i * 0.18); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a + 0.12) * 21, Math.sin(a + 0.12) * 21); ctx.lineTo(Math.cos(a + 0.28) * 13, Math.sin(a + 0.28) * 13); } ctx.fill(); ctx.stroke(); }
      if (hs === 'slick') { ctx.beginPath(); ctx.moveTo(10, -10); ctx.quadraticCurveTo(0, -24, -18, -6); ctx.lineTo(-12, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (hs === 'ponytail') dot(ctx, [-12, -8], 4.5, col('#ff6fa8'), true);
    }
    if (L.acc.indexOf('hood') >= 0) { ctx.strokeStyle = col(L.top); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-3, 2, R + 4, Math.PI * 0.55, Math.PI * 1.05); ctx.stroke(); }
    if (L.acc.indexOf('headband') >= 0) { stroke(ctx, [[-14, -6], [14, -8]], 5, col(L.top2)); }
    // kasvot
    const calm = p.calm || opt.calm, hurt = p.hurt, happy = p.happy, ko = p.ko;
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2;
    if (ko) {
      ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i * 0.9, r = i * 0.32; ctx.lineTo(7 + Math.cos(a) * r, -2 + Math.sin(a) * r); } ctx.stroke();
    } else if (calm) { ctx.beginPath(); ctx.arc(7, -2, 3, 0.1, Math.PI - 0.1); ctx.stroke(); }
    else if (hurt) { stroke(ctx, [[4, -5], [9, -2], [4, 1]], 2, INK); }
    else if (happy) { ctx.beginPath(); ctx.arc(7, -1, 3, Math.PI + 0.2, -0.2); ctx.stroke(); }
    else { dot(ctx, [7.5, -2], 2.1, col(L.eye || INK)); stroke(ctx, [[4, -7.5], [11, -7]], 2.2, hair); }
    // suu
    if (hurt) { ctx.beginPath(); ctx.ellipse(10, 8, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (happy || calm) { ctx.beginPath(); ctx.arc(9, 6, 3.5, 0.2, Math.PI - 0.6); ctx.stroke(); }
    else stroke(ctx, [[7, 8.5], [12, 8]], 2, INK);
    // parta
    if (L.acc.indexOf('beard') >= 0) {
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.quadraticCurveTo(2, 18, 13, 12); ctx.lineTo(14, 6); ctx.quadraticCurveTo(8, 10, 4, 5); ctx.closePath();
      ctx.fillStyle = hair; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (L.acc.indexOf('glasses') >= 0) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(8, -2, 4.5, 0, Math.PI * 2); ctx.stroke(); stroke(ctx, [[3.5, -2], [-6, -3]], 2, INK); }
    if (L.acc.indexOf('shades') >= 0) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(8, -2, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.fill(); stroke(ctx, [[3, -3], [-7, -4]], 2, INK); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(7, -4, 2, 1.5); }
    if (L.acc.indexOf('headset') >= 0) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, R + 3, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      dot(ctx, [-1, 1], 5, col('#30343c'), true);
      stroke(ctx, [[-1, 4], [10, 11]], 2.5, INK); dot(ctx, [11, 11], 2, col('#c8423a'));
    }
    if (L.acc.indexOf('earbuds') >= 0) dot(ctx, [-1, 1], 2.4, '#ffffff', true);
    ctx.restore();
  }
})();
