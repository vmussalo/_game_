// AgriStuntti – rata: palojen sijoitus ruudukkoon, reitin jäljitys, keskilinjan näytteet
// sekä geometria, jota käyttävät sekä piirto että fysiikka (sama data → pyörät eivät leiju).
//
// Rata = { name, terrain: Uint8Array(GRID²), pieces: [{t, i, j, r, l}], props: [{t, i, j, r}] }
//   t = palan tunnus, (i, j) = jalanjäljen pienin ruutu, r = kierto 0…3 (90° askelin), l = korkeustaso
import { TILE as T, LEVEL as H, GRID, ROAD_T, CURB, TERRAIN, PROPS } from './data.js';
import { PIECE_BY_ID, frames } from './pieces.js';

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // reunan suunta ruutuina
const LIFT = 0.04; // tie hieman maan yläpuolella: tie voittaa aina maan/veden samalla korkeudella
const opp = e => (e + 2) % 4;

export function emptyTrack(name) {
  return { name: name || 'Nimetön', terrain: new Uint8Array(GRID * GRID), pieces: [], props: [] };
}

// ---------- kierto ja sijoitus ----------
export function footprint(def, r) { return r % 2 ? [def.size[1], def.size[0]] : [def.size[0], def.size[1]]; }

// paikallinen (x, z) → kierretty (x, z) jalanjäljen sisällä
function rot(x, z, def, r) {
  const w = def.size[0] * T, l = def.size[1] * T;
  switch (r & 3) {
    case 0: return [x, z];
    case 1: return [l - z, x];
    case 2: return [w - x, l - z];
    default: return [z, w - x];
  }
}
function rotV(x, z, r) {
  switch (r & 3) {
    case 0: return [x, z];
    case 1: return [-z, x];
    case 2: return [-x, -z];
    default: return [z, -x];
  }
}

// palan paikallinen solu (cx, cz) kierrettynä → solu jalanjäljen sisällä
export function rotCell(def, cx, cz, r) {
  const [x, z] = rot((cx + 0.5) * T, (cz + 0.5) * T, def, r);
  return [Math.floor(x / T), Math.floor(z / T)];
}

export function pieceCells(p) {
  const def = PIECE_BY_ID[p.t], [w, l] = footprint(def, p.r), out = [];
  for (let a = 0; a < w; a++) for (let b = 0; b < l; b++) out.push([p.i + a, p.j + b]);
  return out;
}

// palan portit maailmassa: [[a, b], …] polkua kohden
export function piecePorts(p) {
  const def = PIECE_BY_ID[p.t];
  return def.paths.map(path => [path.a, path.b].map(pt => {
    const [x, z] = rot((pt.c[0] + 0.5) * T, (pt.c[1] + 0.5) * T, def, p.r);
    return { ti: p.i + Math.floor(x / T), tj: p.j + Math.floor(z / T), e: (pt.e + p.r) % 4, lv: p.l + pt.dl, air: pt.air };
  }));
}

// palan polun kehykset maailmassa: {x,y,z, ux,uy,uz, w}
export function worldFrames(p, pathIdx) {
  const def = PIECE_BY_ID[p.t];
  return frames(def, pathIdx).map(f => {
    const [x, z] = rot(f[0], f[2], def, p.r);
    const [ux, uz] = rotV(f[3], f[5], p.r);
    return { x: p.i * T + x, y: p.l * H + f[1] + LIFT, z: p.j * T + z, ux, uy: f[4], uz, w: f[6] };
  });
}

export function occupancy(track) {
  const occ = new Int32Array(GRID * GRID).fill(-1);
  track.pieces.forEach((p, k) => pieceCells(p).forEach(([i, j]) => {
    if (i >= 0 && j >= 0 && i < GRID && j < GRID) occ[j * GRID + i] = k;
  }));
  return occ;
}

// ---------- reitin jäljitys ----------
// Palauttaa { ok, err, at:[i,j], seq:[{pi, path, rev}], circuit }
export function trace(track) {
  const occ = occupancy(track);
  const at = (i, j) => (i < 0 || j < 0 || i >= GRID || j >= GRID) ? -1 : occ[j * GRID + i];
  const starts = track.pieces.map((p, k) => p.t === 'lahto' ? k : -1).filter(k => k >= 0);
  if (!starts.length) return { ok: false, err: 'Radalta puuttuu lähtöruutu.', seq: [] };
  if (starts.length > 1) return { ok: false, err: 'Radalla saa olla vain yksi lähtöruutu.', seq: [] };
  // päällekkäisyys
  const seen = new Map();
  for (let k = 0; k < track.pieces.length; k++) for (const [i, j] of pieceCells(track.pieces[k])) {
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) return { ok: false, err: 'Pala menee radan reunan yli.', at: [i, j], seq: [] };
    const key = j * GRID + i;
    if (seen.has(key)) return { ok: false, err: 'Kaksi palaa on päällekkäin.', at: [i, j], seq: [] };
    seen.set(key, k);
  }
  const ports = track.pieces.map(piecePorts);
  const start = starts[0];
  const seq = [];
  let cur = { pi: start, path: 0, entry: 0 };
  for (let guard = 0; guard < 2000; guard++) {
    seq.push({ pi: cur.pi, path: cur.path, rev: cur.entry === 1 });
    const ex = ports[cur.pi][cur.path][1 - cur.entry];
    if (track.pieces[cur.pi].t === 'maali') return { ok: true, seq, circuit: false };
    const [dx, dz] = DIRS[ex.e];
    let next = null;
    const findIn = (q, ti, tj, air) => {
      const pp = ports[q];
      for (let pa = 0; pa < pp.length; pa++) for (let en = 0; en < 2; en++) {
        const pt = pp[pa][en];
        if (pt.ti === ti && pt.tj === tj && pt.e === opp(ex.e) && pt.lv === ex.lv && !!pt.air === air) return { pi: q, path: pa, entry: en };
      }
      return null;
    };
    if (ex.air) {
      for (let k = 1; k <= 5 && !next; k++) {
        const ti = ex.ti + dx * k, tj = ex.tj + dz * k, q = at(ti, tj);
        if (q < 0) continue;
        next = findIn(q, ti, tj, true);
        if (!next) return { ok: false, err: 'Hyppyrin takana pitää olla vastakkainen hyppyri (alastulo) 1–4 ruudun päässä, samalla korkeudella.', at: [ex.ti, ex.tj], seq };
      }
      if (!next) return { ok: false, err: 'Hyppyrille ei löydy alastuloa.', at: [ex.ti, ex.tj], seq };
    } else {
      const ti = ex.ti + dx, tj = ex.tj + dz, q = at(ti, tj);
      if (q >= 0) next = findIn(q, ti, tj, false);
      if (!next) return { ok: false, err: q >= 0 ? 'Palat eivät liity toisiinsa (suunta tai korkeus ei täsmää).' : 'Rata katkeaa.', at: [ex.ti, ex.tj], seq };
    }
    if (next.pi === start) {
      if (next.entry === 0) return { ok: true, seq, circuit: true };
      return { ok: false, err: 'Rata palaa lähtöön väärästä suunnasta.', at: [ex.ti, ex.tj], seq };
    }
    cur = next;
  }
  return { ok: false, err: 'Rata on liian pitkä tai kiertää kehää.', seq };
}

// keskilinjan näytteet ajojärjestyksessä: {x,y,z, fx,fy,fz, ux,uy,uz, w, seg, kind, d}
export function samples(track, seq) {
  const out = [];
  seq.forEach((s, si) => {
    const p = track.pieces[s.pi];
    let fr = worldFrames(p, s.path);
    if (s.rev) fr = fr.slice().reverse();
    fr.forEach((f, k) => {
      if (k === 0 && out.length && Math.hypot(f.x - out[out.length - 1].x, f.y - out[out.length - 1].y, f.z - out[out.length - 1].z) < 0.5) return;
      out.push({ x: f.x, y: f.y, z: f.z, ux: f.ux, uy: f.uy, uz: f.uz, w: f.w, seg: si, kind: p.t, air: k === fr.length - 1 && PIECE_BY_ID[p.t].jump && !s.rev });
    });
  });
  // kisa alkaa lähtöviivalta (lähtöpalan keskeltä) ja päättyy maaliviivalle:
  // kiertävällä radalla takaisin lähtöviivalle, muuten maalipalan keskelle
  const mid = seg => { let a = -1, b = -1; out.forEach((s, k) => { if (s.seg === seg) { if (a < 0) a = k; b = k; } }); return Math.round((a + b) / 2); };
  const s0 = mid(0);
  const last = seq.length - 1;
  let res;
  if (track.pieces[seq[last].pi].t === 'maali') res = out.slice(s0, mid(last) + 1);
  else res = out.slice(s0).concat(out.slice(1, s0 + 1).map(s => Object.assign({}, s, { seg: seq.length })));
  out.length = 0; out.push(...res);
  let d = 0;
  for (let k = 0; k < out.length; k++) {
    const a = out[k], b = out[Math.min(out.length - 1, k + 1)], c = out[Math.max(0, k - 1)];
    let fx = b.x - c.x, fy = b.y - c.y, fz = b.z - c.z;
    const n = Math.hypot(fx, fy, fz) || 1;
    a.fx = fx / n; a.fy = fy / n; a.fz = fz / n;
    if (k > 0) d += Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z);
    a.d = d;
  }
  return out;
}

// ---------- geometria ----------
// Palauttaa { pos: [], col: [], kind: [] } (kolmio kerrallaan, ei indeksoitu).
// kind: 0 = ajopinta, 1 = reunakivi, 2 = alapinta, 3 = kylki
const C = {
  asphalt: [0.33, 0.34, 0.36], asphalt2: [0.36, 0.37, 0.39], red: [0.78, 0.16, 0.12], white: [0.92, 0.92, 0.9],
  under: [0.22, 0.21, 0.2], side: [0.6, 0.57, 0.52], side2: [0.52, 0.5, 0.46], start1: [0.95, 0.95, 0.95], start2: [0.08, 0.08, 0.08]
};

function frameBasis(f, nx) {
  // f: kehys, nx: seuraava piste (suunta). Palauttaa vasen (l) ja ylös (u) ortonormaalina.
  let fx = nx[0], fy = nx[1], fz = nx[2];
  let n = Math.hypot(fx, fy, fz) || 1; fx /= n; fy /= n; fz /= n;
  // vasen = ylös × eteen
  let lx = f.uy * fz - f.uz * fy, ly = f.uz * fx - f.ux * fz, lz = f.ux * fy - f.uy * fx;
  n = Math.hypot(lx, ly, lz) || 1; lx /= n; ly /= n; lz /= n;
  // ylös = eteen × vasen
  const ux = fy * lz - fz * ly, uy = fz * lx - fx * lz, uz = fx * ly - fy * lx;
  return { lx, ly, lz, ux, uy, uz };
}

export function pieceGeometry(p, opts) {
  opts = opts || {};
  const def = PIECE_BY_ID[p.t];
  const g = { pos: [], col: [], kind: [], pillars: [] };
  def.paths.forEach((path, pi) => {
    const fr = worldFrames(p, pi);
    const n = fr.length;
    const B = fr.map((f, k) => {
      const a = fr[Math.max(0, k - 1)], b = fr[Math.min(n - 1, k + 1)];
      return frameBasis(f, [b.x - a.x, b.y - a.y, b.z - a.z]);
    });
    const pt = (k, lat, dn) => {
      const f = fr[k], b = B[k];
      return [f.x + b.lx * lat - b.ux * dn, f.y + b.ly * lat - b.uy * dn, f.z + b.lz * lat - b.uz * dn];
    };
    const skirt = !def.loop && p.l === 0; // maavalli palan alle (ei pylväitä)
    for (let k = 0; k < n - 1; k++) {
      const w0 = fr[k].w / 2, w1 = fr[k + 1].w / 2;
      const Le0 = pt(k, w0, 0), Lc0 = pt(k, w0 - CURB, 0), Rc0 = pt(k, -w0 + CURB, 0), Re0 = pt(k, -w0, 0);
      const Le1 = pt(k + 1, w1, 0), Lc1 = pt(k + 1, w1 - CURB, 0), Rc1 = pt(k + 1, -w1 + CURB, 0), Re1 = pt(k + 1, -w1, 0);
      const stripe = (k % 2) ? C.red : C.white;
      const asph = (k % 2) ? C.asphalt : C.asphalt2;
      band(g, Re0, Re1, Rc0, Rc1, stripe, 1);
      band(g, Rc0, Rc1, Lc0, Lc1, asph, 0);
      band(g, Lc0, Lc1, Le0, Le1, stripe, 1);
      if (opts.noUnder) continue;
      // alapinta ja kyljet
      const Lb0 = pt(k, w0, ROAD_T), Rb0 = pt(k, -w0, ROAD_T), Lb1 = pt(k + 1, w1, ROAD_T), Rb1 = pt(k + 1, -w1, ROAD_T);
      if (skirt) {
        // kyljet maahan asti (penger)
        const gl0 = [Le0[0], 0, Le0[2]], gl1 = [Le1[0], 0, Le1[2]], gr0 = [Re0[0], 0, Re0[2]], gr1 = [Re1[0], 0, Re1[2]];
        if (Le0[1] > 0.05 || Le1[1] > 0.05) side(g, Le0, Le1, gl0, gl1, k % 2 ? C.side : C.side2, fr[k], B[k], 1);
        if (Re0[1] > 0.05 || Re1[1] > 0.05) side(g, Re0, Re1, gr0, gr1, k % 2 ? C.side : C.side2, fr[k], B[k], -1);
      } else {
        band(g, Lb0, Lb1, Rb0, Rb1, C.under, 2);
        side(g, Le0, Le1, Lb0, Lb1, C.side, fr[k], B[k], 1);
        side(g, Re0, Re1, Rb0, Rb1, C.side, fr[k], B[k], -1);
      }
    }
    // lähtö- ja maaliviiva: ruudukko keskelle palaa
    if (def.deco) {
      const k = Math.floor(n / 2), sq = 8, w = fr[k].w / 2;
      for (let s = 0; s < sq; s++) for (let r = 0; r < 2; r++) {
        const a = -w + (2 * w) * s / sq, b = -w + (2 * w) * (s + 1) / sq;
        const k0 = k + r - 1;
        if (k0 < 0 || k0 + 1 >= n) continue;
        const lift = 0.03;
        const P0 = pt(k0, a, -lift), P1 = pt(k0 + 1, a, -lift), Q0 = pt(k0, b, -lift), Q1 = pt(k0 + 1, b, -lift);
        // vain puolikas segmentti per rivi: ohut viiva
        const mid = (A, Bv, f) => [A[0] + (Bv[0] - A[0]) * f, A[1] + (Bv[1] - A[1]) * f, A[2] + (Bv[2] - A[2]) * f];
        band(g, P0, mid(P0, P1, 0.5), Q0, mid(Q0, Q1, 0.5), (s + r) % 2 ? C.start1 : C.start2, 4);
      }
    }
    // pylväät korkeiden kohtien alle
    if (!skirt && !def.loop) {
      let last = -99;
      for (let k = 0; k < n; k++) {
        const f = fr[k];
        if (f.y - ROAD_T < 1.5) continue;
        const dd = k ? Math.hypot(f.x - fr[k - 1].x, f.z - fr[k - 1].z) : 0;
        last += dd;
        if (last < 10 && k) continue;
        last = 0;
        g.pillars.push({ x: f.x, z: f.z, h: f.y - ROAD_T });
      }
    }
  });
  return g;
}

function push3(arr, v) { arr.push(v[0], v[1], v[2]); }
function tri(g, a, b, c, col, kind) {
  push3(g.pos, a); push3(g.pos, b); push3(g.pos, c);
  for (let i = 0; i < 3; i++) push3(g.col, col);
  g.kind.push(kind);
}
// kaista A (oikeampi) → B (vasempi), normaali ylös palan ylösvektorin suuntaan; alapinnassa toisin päin
function band(g, A0, A1, B0, B1, col, kind) {
  tri(g, A0, B1, B0, col, kind);
  tri(g, A0, A1, B1, col, kind);
}
// kylki: ulospäin osoittava normaali (s = 1 vasen, -1 oikea)
function side(g, T0, T1, B0, B1, col, f, b, s) {
  // tarkistetaan suunta ristitulolla
  const e1 = [T1[0] - T0[0], T1[1] - T0[1], T1[2] - T0[2]], e2 = [B0[0] - T0[0], B0[1] - T0[1], B0[2] - T0[2]];
  const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
  const out = (nx * b.lx + ny * b.ly + nz * b.lz) * s > 0;
  if (out) { tri(g, T0, T1, B0, col, 3); tri(g, T1, B1, B0, col, 3); }
  else { tri(g, T0, B0, T1, col, 3); tri(g, T1, B0, B1, col, 3); }
}

// ---------- törmäysmaailma ----------
const CELL = 8;
export function buildWorld(track) {
  const tr = trace(track);
  const samp = tr.ok ? samples(track, tr.seq) : [];
  const geos = track.pieces.map(p => pieceGeometry(p));
  // kolmiot: v0, e1, e2, n (12 float) + laji
  let nt = 0;
  for (const g of geos) nt += g.kind.length;
  const tris = new Float32Array(nt * 12), tkind = new Uint8Array(nt), tbox = new Float32Array(nt * 6);
  let t = 0;
  for (const g of geos) {
    for (let k = 0; k < g.kind.length; k++, t++) {
      const o = k * 9, P = g.pos;
      const ax = P[o], ay = P[o + 1], az = P[o + 2];
      const e1x = P[o + 3] - ax, e1y = P[o + 4] - ay, e1z = P[o + 5] - az;
      const e2x = P[o + 6] - ax, e2y = P[o + 7] - ay, e2z = P[o + 8] - az;
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      tris.set([ax, ay, az, e1x, e1y, e1z, e2x, e2y, e2z, nx, ny, nz], t * 12);
      tkind[t] = g.kind[k];
      tbox.set([Math.min(ax, ax + e1x, ax + e2x), Math.min(ay, ay + e1y, ay + e2y), Math.min(az, az + e1z, az + e2z),
                Math.max(ax, ax + e1x, ax + e2x), Math.max(ay, ay + e1y, ay + e2y), Math.max(az, az + e1z, az + e2z)], t * 6);
    }
  }
  // ruudukkohajautus x/z-tasossa
  const NC = Math.ceil(GRID * T / CELL);
  const cells = new Map();
  for (let k = 0; k < nt; k++) {
    if (tkind[k] === 4) continue; // lähtöviiva vain piirtoon
    const b = k * 6;
    const i0 = Math.max(0, Math.floor((tbox[b] - 0.8) / CELL)), i1 = Math.min(NC - 1, Math.floor((tbox[b + 3] + 0.8) / CELL));
    const j0 = Math.max(0, Math.floor((tbox[b + 2] - 0.8) / CELL)), j1 = Math.min(NC - 1, Math.floor((tbox[b + 5] + 0.8) / CELL));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const key = j * NC + i;
      let a = cells.get(key); if (!a) cells.set(key, a = []);
      a.push(k);
    }
  }
  // esteet: pylväät ja maisemaesineet
  const obst = [];
  geos.forEach(g => g.pillars.forEach(pl => obst.push({ shape: 'cyl', x: pl.x, z: pl.z, r: 0.9, h: pl.h, y0: 0, pillar: true })));
  for (const pr of track.props) {
    const d = PROPS.find(q => q.id === pr.t); if (!d) continue;
    const cx = (pr.i + 0.5) * T, cz = (pr.j + 0.5) * T;
    if (d.shape === 'cyl') obst.push({ shape: 'cyl', x: cx, z: cz, r: d.r, h: d.h, y0: 0, prop: pr });
    else {
      const sw = pr.r % 2 ? d.l : d.w, sl = pr.r % 2 ? d.w : d.l;
      obst.push({ shape: 'box', x0: cx - sw / 2, x1: cx + sw / 2, z0: cz - sl / 2, z1: cz + sl / 2, h: d.h, prop: pr });
    }
  }
  return { track, trace: tr, samples: samp, geos, tris, tkind, cells, NC, nt, obst, size: GRID * T };
}

export function terrainAt(world, x, z) {
  const i = Math.floor(x / T), j = Math.floor(z / T);
  if (i < 0 || j < 0 || i >= GRID || j >= GRID) return TERRAIN[0];
  return TERRAIN[world.track.terrain[j * GRID + i]] || TERRAIN[0];
}

function cellTris(world, x0, z0, x1, z1, out) {
  const NC = world.NC;
  const i0 = Math.max(0, Math.floor(Math.min(x0, x1) / CELL)), i1 = Math.min(NC - 1, Math.floor(Math.max(x0, x1) / CELL));
  const j0 = Math.max(0, Math.floor(Math.min(z0, z1) / CELL)), j1 = Math.min(NC - 1, Math.floor(Math.max(z0, z1) / CELL));
  out.length = 0;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = world.cells.get(j * NC + i);
    if (a) for (const k of a) out.push(k);
  }
  return out;
}
const tmpList = [];

// säde (o + d·t, 0 < t < max) → lähin osuma, joka on säteeseen päin: {t, nx, ny, nz, road, terrain}
export function raycast(world, ox, oy, oz, dx, dy, dz, max) {
  let best = max, hit = null;
  const list = cellTris(world, ox, oz, ox + dx * max, oz + dz * max, tmpList);
  const TR = world.tris;
  for (let q = 0; q < list.length; q++) {
    const o = list[q] * 12;
    const nx = TR[o + 9], ny = TR[o + 10], nz = TR[o + 11];
    if (nx * dx + ny * dy + nz * dz > -0.2) continue; // vain säteeseen päin olevat pinnat
    const e1x = TR[o + 3], e1y = TR[o + 4], e1z = TR[o + 5], e2x = TR[o + 6], e2y = TR[o + 7], e2z = TR[o + 8];
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-9) continue;
    const inv = 1 / det;
    const sx = ox - TR[o], sy = oy - TR[o + 1], sz = oz - TR[o + 2];
    const u = (sx * px + sy * py + sz * pz) * inv;
    if (u < -0.001 || u > 1.001) continue;
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < -0.001 || u + v > 1.002) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t > 0 && t < best) { best = t; hit = { t, nx, ny, nz, road: true, kind: world.tkind[list[q]] }; }
  }
  // maa (y = 0)
  if (dy < -1e-6) {
    const t = -oy / dy;
    if (t > 0 && t < best - 0.01) {
      const x = ox + dx * t, z = oz + dz * t;
      best = t; hit = { t, nx: 0, ny: 1, nz: 0, road: false, terrain: terrainAt(world, x, z) };
    }
  }
  return hit;
}

// piste kiinteän aineen sisällä? → työntövektori ulos {nx,ny,nz,d, what}
// Ratapinnat käsitellään ohuina laattoina (paksuus ≤ 0,8 m pinnan takana).
export function pointPush(world, x, y, z) {
  let best = null;
  const list = cellTris(world, x, z, x, z, tmpList);
  const TR = world.tris;
  for (let q = 0; q < list.length; q++) {
    const o = list[q] * 12;
    const nx = TR[o + 9], ny = TR[o + 10], nz = TR[o + 11];
    const sx = x - TR[o], sy = y - TR[o + 1], sz = z - TR[o + 2];
    const s = sx * nx + sy * ny + sz * nz;
    // ajopinta ottaa kiinni syvemmältä; alapinta ja kyljet vain ohuelta matkalta (muuten tien yläpuolella oleva piste
    // tulkittaisiin alapinnan "sisälle" ja työnnettäisiin tien läpi)
    const kind = world.tkind[list[q]];
    if (s >= 0 || s < (kind <= 1 ? -0.62 : -0.45)) continue;
    // projektio kolmion sisällä?
    const px = sx - nx * s, py = sy - ny * s, pz = sz - nz * s;
    const e1x = TR[o + 3], e1y = TR[o + 4], e1z = TR[o + 5], e2x = TR[o + 6], e2y = TR[o + 7], e2z = TR[o + 8];
    const d11 = e1x * e1x + e1y * e1y + e1z * e1z, d12 = e1x * e2x + e1y * e2y + e1z * e2z, d22 = e2x * e2x + e2y * e2y + e2z * e2z;
    const p1 = px * e1x + py * e1y + pz * e1z, p2 = px * e2x + py * e2y + pz * e2z;
    const den = d11 * d22 - d12 * d12;
    if (Math.abs(den) < 1e-9) continue;
    const u = (d22 * p1 - d12 * p2) / den, v = (d11 * p2 - d12 * p1) / den;
    if (u < -0.01 || v < -0.01 || u + v > 1.01) continue;
    const d = -s;
    if (!best || d < best.d) best = { nx, ny, nz, d, what: 'rata' };
  }
  if (y < 0) {
    const d = -y;
    if (!best || d < best.d) best = { nx: 0, ny: 1, nz: 0, d, what: terrainAt(world, x, z).water ? 'vesi' : 'maa' };
  }
  // esteet
  for (const ob of world.obst) {
    if (y > ob.h || y < (ob.y0 || 0) - 0.5) continue;
    if (ob.shape === 'cyl') {
      const dx = x - ob.x, dz = z - ob.z, r2 = dx * dx + dz * dz;
      if (r2 >= ob.r * ob.r) continue;
      const r = Math.sqrt(r2) || 1e-3, d = ob.r - r;
      const top = ob.h - y;
      if (top < d && !ob.pillar) { if (!best || top < best.d) best = { nx: 0, ny: 1, nz: 0, d: top, what: 'este' }; }
      else if (!best || d < best.d) best = { nx: dx / r, ny: 0, nz: dz / r, d, what: 'este' };
    } else {
      if (x <= ob.x0 || x >= ob.x1 || z <= ob.z0 || z >= ob.z1) continue;
      const c = [[x - ob.x0, -1, 0], [ob.x1 - x, 1, 0], [z - ob.z0, 0, -1], [ob.z1 - z, 0, 1]];
      let m = c[0];
      for (const e of c) if (e[0] < m[0]) m = e;
      const top = ob.h - y;
      if (top < m[0]) { if (!best || top < best.d) best = { nx: 0, ny: 1, nz: 0, d: top, what: 'este' }; }
      else if (!best || m[0] < best.d) best = { nx: m[1], ny: 0, nz: m[2], d: m[0], what: 'este' };
    }
  }
  // radan reunat (aita)
  const S = world.size;
  const fence = [[x, 1, 0], [S - x, -1, 0], [z, 0, 1], [S - z, 0, -1]];
  for (const f of fence) if (f[0] < 0) { const d = -f[0]; if (!best || d > best.d) best = { nx: f[1], ny: 0, nz: f[2], d, what: 'aita' }; }
  return best;
}

// mikä reitin osa (seq-indeksi) on pisteen kohdalla: lähin näyte annetun alueen sisällä
export function nearestSample(world, x, y, z, hint, span) {
  const S = world.samples;
  if (!S.length) return -1;
  let best = -1, bd = 1e18;
  const a = hint == null ? 0 : Math.max(0, hint - (span || 30)), b = hint == null ? S.length - 1 : Math.min(S.length - 1, hint + (span || 30));
  for (let k = a; k <= b; k++) {
    const s = S[k], d = (s.x - x) ** 2 + (s.y - y) ** 2 * 2 + (s.z - z) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
