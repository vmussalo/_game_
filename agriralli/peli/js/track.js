/* AgriRalli – radan geometria: ohjauspisteistä tasavälinen keskilinja, normaalit, kaarevuus, esteet ja poimittavat */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const STEP = 12; // keskilinjan näytteiden väli (px)
  const PAD = 330; // reunus kuvan ympärillä

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  function build(idx) {
    const def = AR.TRACKS[idx];
    const P = def.pts.map(p => [p[0] * def.scale, p[1] * def.scale]);
    const n = P.length;
    // tiheä polku
    const dx = [], dy = [];
    for (let i = 0; i < n; i++) {
      const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], d = P[(i + 2) % n];
      for (let k = 0; k < 60; k++) {
        const t = k / 60;
        dx.push(catmull(a[0], b[0], c[0], d[0], t));
        dy.push(catmull(a[1], b[1], c[1], d[1], t));
      }
    }
    // kaarenpituuden mukaan tasavälinen uudelleennäytteistys
    const m = dx.length;
    const cum = [0];
    for (let i = 1; i <= m; i++) {
      const j = i % m;
      cum.push(cum[i - 1] + Math.hypot(dx[j] - dx[i - 1], dy[j] - dy[i - 1]));
    }
    const total = cum[m];
    const N = Math.round(total / STEP);
    const step = total / N;
    const px = new Float32Array(N), py = new Float32Array(N);
    let seg = 0;
    for (let k = 0; k < N; k++) {
      const s = k * step;
      while (cum[seg + 1] < s) seg++;
      const f = (s - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg]);
      const j = (seg + 1) % m;
      px[k] = dx[seg] + (dx[j] - dx[seg]) * f;
      py[k] = dy[seg] + (dy[j] - dy[seg]) * f;
    }
    // siirto niin, että rata alkaa reunuksen päästä
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let k = 0; k < N; k++) {
      minX = Math.min(minX, px[k]); minY = Math.min(minY, py[k]);
      maxX = Math.max(maxX, px[k]); maxY = Math.max(maxY, py[k]);
    }
    for (let k = 0; k < N; k++) { px[k] += PAD - minX; py[k] += PAD - minY; }
    const tx = new Float32Array(N), ty = new Float32Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const a = (k - 1 + N) % N, b = (k + 1) % N;
      let x = px[b] - px[a], y = py[b] - py[a];
      const l = Math.hypot(x, y) || 1;
      x /= l; y /= l;
      tx[k] = x; ty[k] = y; nx[k] = -y; ny[k] = x;
    }
    // kaarevuus (1/säde, etumerkki: + = oikealle)
    const curv = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const a = (k - 2 + N) % N, b = (k + 2) % N;
      curv[k] = U.angDiff(Math.atan2(ty[a], tx[a]), Math.atan2(ty[b], tx[b])) / (4 * step);
    }
    const tr = {
      idx, def, W: def.W, M: AR.TRACK_M, WT: AR.TRACK_WT, N, step, L: total, px, py, tx, ty, nx, ny, curv,
      w: Math.ceil(maxX - minX + 2 * PAD), h: Math.ceil(maxY - minY + 2 * PAD), seed: def.seed
    };
    tr.lim = tr.W / 2 + tr.M; // seinän sisäreuna keskilinjasta
    placeItems(tr);
    return tr;
  }

  // Lähin keskilinjan näyte. hint ≥ 0 → haetaan paikallisesti (nopea ja ei hyppää radan toiseen osaan)
  function nearest(tr, x, y, hint) {
    let best = -1, bd = 1e18;
    if (hint >= 0) {
      for (let o = -12; o <= 12; o++) {
        const k = (hint + o + tr.N) % tr.N;
        const d = (tr.px[k] - x) ** 2 + (tr.py[k] - y) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
    } else {
      for (let k = 0; k < tr.N; k++) {
        const d = (tr.px[k] - x) ** 2 + (tr.py[k] - y) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
    }
    return best;
  }

  // piste keskilinjalla matkan s ja sivuttaissiirron kohdalla
  function at(tr, s, off) {
    const k = ((Math.round(s / tr.step) % tr.N) + tr.N) % tr.N;
    return { x: tr.px[k] + tr.nx[k] * off, y: tr.py[k] + tr.ny[k] * off, a: Math.atan2(tr.ty[k], tr.tx[k]), k };
  }

  // liukkaat kohdat (öljy/lanta) ja poimittavien paikat
  function placeItems(tr) {
    const r = U.rng(tr.seed * 7919);
    tr.hazards = [];
    const nh = 4 + Math.floor(r() * 3);
    for (let i = 0; i < nh; i++) {
      const s = tr.L * (0.12 + 0.8 * (i + r() * 0.6) / nh);
      const p = at(tr, s, (r() - 0.5) * tr.W * 0.6);
      tr.hazards.push({ x: p.x, y: p.y, r: 26 + r() * 18, rot: r() * 3, k: p.k });
    }
    tr.slots = [];
    const ns = 9;
    for (let i = 0; i < ns; i++) {
      const s = tr.L * (i + 0.45 + r() * 0.2) / ns;
      const p = at(tr, s, (r() - 0.5) * tr.W * 0.55);
      tr.slots.push({ x: p.x, y: p.y });
    }
  }

  // Tarkistus: radan eri osat eivät saa olla liian lähellä toisiaan (seinät menisivät päällekkäin)
  function validate(tr) {
    const need = 2 * tr.lim + 2 * tr.WT + 30;
    let minGap = 1e9, where = null, minR = 1e9;
    const far = Math.ceil((need * 2.2) / tr.step);
    for (let i = 0; i < tr.N; i += 2) {
      for (let j = i + far; j < tr.N; j += 2) {
        const ds = Math.min(j - i, tr.N - (j - i));
        if (ds < far) continue;
        const d = Math.hypot(tr.px[i] - tr.px[j], tr.py[i] - tr.py[j]);
        if (d < minGap) { minGap = d; where = [Math.round(tr.px[i]), Math.round(tr.py[i]), Math.round(tr.px[j]), Math.round(tr.py[j])]; }
      }
      minR = Math.min(minR, 1 / Math.max(1e-6, Math.abs(tr.curv[i])));
    }
    return { ok: minGap >= need, minGap: Math.round(minGap), need, minR: Math.round(minR), where, L: Math.round(tr.L), w: tr.w, h: tr.h };
  }

  AR.Track = { build, nearest, at, validate, STEP };
})();
