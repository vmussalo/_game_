'use strict';
// Shared helpers: seeded RNG, hex math (odd-r offset grid), projection, A*.
var GG = globalThis.GG || (globalThis.GG = {});
(function () {
  const U = GG.U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;

  // ---- seeded game RNG (mulberry32). State U.rs is saved with the game.
  U.rs = 1234567;
  U.seed = n => { U.rs = (n >>> 0) || 1; };
  U.r = () => {
    let t = (U.rs = (U.rs + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  U.ri = (a, b) => a + Math.floor(U.r() * (b - a + 1));
  U.pick = arr => arr[Math.floor(U.r() * arr.length)];
  U.roll = pct => U.r() * 100 < pct;
  U.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(U.r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // ---- visual hash noise (never touches the game RNG)
  U.hash = (x, y, s = 0) => {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.vnoise = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = U.hash(xi, yi, s), b = U.hash(xi + 1, yi, s), c = U.hash(xi, yi + 1, s), d = U.hash(xi + 1, yi + 1, s);
    return U.lerp(U.lerp(a, b, sx), U.lerp(c, d, sx), sy);
  };
  U.fbm = (x, y, s = 0) => U.vnoise(x, y, s) * 0.55 + U.vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + U.vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;

  // ---- hex grid: odd-r offset coordinates (col c, row r); odd rows are shifted half a hex right
  U.K = (c, r) => r * 1024 + c;
  U.unK = k => [k & 1023, k >> 10];
  U.axial = (c, r) => [c - ((r - (r & 1)) >> 1), r];
  U.fromAxial = (q, r) => [q + ((r - (r & 1)) >> 1), r];
  U.dist = (c1, r1, c2, r2) => {
    const a = U.axial(c1, r1), b = U.axial(c2, r2);
    const dq = a[0] - b[0], dr = a[1] - b[1];
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  };
  U.de = (a, b) => U.dist(a.x, a.y, b.x, b.y);
  const DE = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  const DO = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
  U.nb = (c, r) => (r & 1 ? DO : DE).map(d => [c + d[0], r + d[1]]);
  U.ring = (c, r, rad) => {
    const out = [];
    for (let y = r - rad; y <= r + rad; y++) for (let x = c - rad - 1; x <= c + rad + 1; x++) if (U.dist(c, r, x, y) === rad) out.push([x, y]);
    return out;
  };
  U.area = (c, r, rad) => {
    const out = [];
    for (let y = r - rad; y <= r + rad; y++) for (let x = c - rad - 1; x <= c + rad + 1; x++) if (U.dist(c, r, x, y) <= rad) out.push([x, y]);
    return out;
  };
  function cubeRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  }
  // hexes on the line from a to b (inclusive)
  U.line = (c1, r1, c2, r2) => {
    const n = U.dist(c1, r1, c2, r2);
    const a = U.axial(c1, r1), b = U.axial(c2, r2);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      const [q, r] = cubeRound(U.lerp(a[0] + 1e-6, b[0] + 1e-6, t), U.lerp(a[1] + 2e-6, b[1] + 2e-6, t));
      out.push(U.fromAxial(q, r));
    }
    return out;
  };

  // ---- projection (oblique: hexes squashed vertically)
  U.HW = 44;  // hex width in px
  U.RH = 20;  // row step in px
  U.SQ = (U.RH / U.HW) / 0.8660254; // vertical squash vs. a true pointy hex
  U.px = (c, r) => [c * U.HW + (r & 1) * U.HW / 2, r * U.RH];
  U.cellAt = (x, y) => {
    const r0 = Math.round(y / U.RH);
    let best = null, bd = 1e9;
    for (let r = r0 - 2; r <= r0 + 2; r++) {
      const c0 = Math.round((x - (r & 1) * U.HW / 2) / U.HW);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const [px, py] = U.px(c, r);
        const dx = x - px, dy = (y - py) / U.SQ;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = [c, r]; }
      }
    }
    return best;
  };
  // hex corner offsets (pointy top), already squashed
  U.corners = (scale = 1) => {
    const s = U.HW / 1.7320508 * scale, out = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i + 30);
      out.push([Math.cos(a) * s, Math.sin(a) * s * U.SQ]);
    }
    return out; // order: 30°(lower right), 90°(bottom), 150°, 210°, 270°(top), 330°
  };

  // ---- A* on the hex grid. cost(c,r) returns step cost or Infinity. goal(c,r) -> bool
  U.astar = (w, h, sc, sr, goal, cost, hfn, maxN = 6000) => {
    const start = U.K(sc, sr);
    const open = [[hfn(sc, sr), 0, start]];
    const g = new Map([[start, 0]]), from = new Map();
    let n = 0;
    const push = it => { open.push(it); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const pop = () => {
      const top = open[0], last = open.pop();
      if (open.length) { open[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } }
      return top;
    };
    while (open.length && n++ < maxN) {
      const [, gc, k] = pop();
      if (gc > g.get(k)) continue;
      const [c, r] = U.unK(k);
      if (goal(c, r)) {
        const path = [];
        let cur = k;
        while (cur !== start) { path.push(U.unK(cur)); cur = from.get(cur); }
        return path.reverse();
      }
      for (const [nc, nr] of U.nb(c, r)) {
        if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
        const sc2 = cost(nc, nr);
        if (sc2 === Infinity) continue;
        const nk = U.K(nc, nr), ng = gc + sc2;
        if (ng < (g.has(nk) ? g.get(nk) : Infinity)) { g.set(nk, ng); from.set(nk, k); push([ng + hfn(nc, nr), ng, nk]); }
      }
    }
    return null;
  };

  U.fmtTime = min => {
    const d = Math.floor(min / 1440) + 1, h = Math.floor(min / 60) % 24, m = Math.floor(min) % 60;
    return `Day ${d}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  U.hourOf = min => (min / 60) % 24;
  U.isNight = min => { const h = U.hourOf(min); return h < 5.5 || h >= 20.5; };
  U.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
})();
