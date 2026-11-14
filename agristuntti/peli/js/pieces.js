// AgriStuntti – ratapalat. Jokainen pala on määritelty omassa koordinaatistossaan:
// x = leveys (0 … koko[0]·TILE), z = pituus (0 … koko[1]·TILE), y = korkeus palan perustasosta.
// Perusasennossa ajo alkaa reunalta 0 (z = 0) suuntaan +z.
// Reunat: 0 = z-min, 1 = x-max, 2 = z-max, 3 = x-min.
// path.gen() palauttaa keskilinjan kehykset [x, y, z, ylösX, ylösY, ylösZ, leveys].
import { TILE as T, LEVEL as H, ROAD_W } from './data.js';

const PI = Math.PI;
const ss = t => t * t * (3 - 2 * t);
const cl = t => Math.max(0, Math.min(1, t));
const W = ROAD_W;

function line(n, f) { const out = []; for (let k = 0; k <= n; k++) out.push(f(k / n)); return out; }
const up0 = (x, y, z, w) => [x, y, z, 0, 1, 0, w || W];

// kaari: keskipiste (cx, cz), säde R, kulma 0 … π/2; bank = kallistus (rad) kulman funktiona
function arc(n, cx, R, bankFn) {
  return line(n, t => {
    const a = t * PI / 2;
    const x = cx - R * Math.cos(a), z = R * Math.sin(a);
    const b = bankFn ? bankFn(t) : 0;
    // kallistus kohti kaaren keskipistettä (cx, 0)
    const ix = Math.cos(a), iz = -Math.sin(a);
    const y = b ? Math.sin(b) * W / 2 + 0.05 : 0;
    return [x, y, z, Math.sin(b) * ix, Math.cos(b), Math.sin(b) * iz, W];
  });
}

const RAMP_H = 5;
export const LOOP_R = 9;
const LOOP_LS = 10.5;  // silmukan sivusiirtymä, jotta tulo- ja lähtötie eivät osu toisiinsa
const LOOP_W = 9;

// Silmukka klotoidimaisena: kaarevuus kasvaa tasaisesti alussa ja pienenee lopussa (kuten oikeissa silmukoissa),
// joten kone ei "törmää" silmukan alkuun. Pystytasossa kulkukulma θ(s) = ∫ κ ds, yhteensä 2π.
export const LOOP = { len: 80, ramp: 0.34 };
function loopCurve() {
  const L = LOOP.len, a = LOOP.ramp, n = 740, ds = L / n;
  const km = 2 * PI / (L * (1 - a));
  const kap = s => { const u = s / L; return km * Math.min(1, u / a, (1 - u) / a); };
  const pts = [[0, 0, 0]]; // [z, y, θ]
  let z = 0, y = 0, th = 0;
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) * ds;
    const t2 = th + kap(s) * ds / 2;
    z += Math.cos(t2) * ds; y += Math.sin(t2) * ds; th += kap(s) * ds;
    pts.push([z, y, th]);
  }
  return { pts, kmax: km };
}
function loopGen() {
  const out = [];
  const xc = T / 2;
  const { pts } = loopCurve();
  const dz = pts[pts.length - 1][0];
  const z0 = T - dz / 2;            // silmukka keskelle 1×2-palaa
  // tulo: siirtyy sivuun ennen silmukkaa
  for (let k = 0; k <= 10; k++) {
    const z = z0 * k / 10, s = ss(cl(z / (z0 - 3)));
    out.push([xc - LOOP_LS / 2 * s, 0, z, 0, 1, 0, W + (LOOP_W - W) * s]);
  }
  for (let k = 6; k < pts.length; k += 6) {
    const [z, y, th] = pts[k], u = k / (pts.length - 1);
    out.push([xc + LOOP_LS * (ss(u) - 0.5), y, z0 + z, 0, Math.cos(th), -Math.sin(th), LOOP_W]);
  }
  const z1 = z0 + dz;
  for (let k = 1; k <= 10; k++) {
    const z = z1 + (2 * T - z1) * k / 10, s = 1 - ss(cl((z - z1 - 3) / (2 * T - z1 - 3)));
    out.push([xc + LOOP_LS / 2 * s, 0, z, 0, 1, 0, W + (LOOP_W - W) * s]);
  }
  return out;
}

const P = (cx, cz, e, dl, air) => ({ c: [cx, cz], e, dl: dl || 0, air: !!air });
const straight = () => line(4, t => up0(T / 2, 0, t * T));

export const PIECES = [
  { id: 'suora', name: 'Suora', size: [1, 1], paths: [{ a: P(0, 0, 0), b: P(0, 0, 2), gen: straight }] },
  { id: 'lahto', name: 'Lähtö', size: [1, 1], deco: 'start', paths: [{ a: P(0, 0, 0), b: P(0, 0, 2), gen: straight }] },
  { id: 'maali', name: 'Maali', size: [1, 1], deco: 'finish', paths: [{ a: P(0, 0, 0), b: P(0, 0, 2), gen: straight }] },
  { id: 'mutka', name: 'Jyrkkä mutka', size: [1, 1], paths: [{ a: P(0, 0, 0), b: P(0, 0, 1), gen: () => arc(12, T, T / 2) }] },
  { id: 'kaarre', name: 'Loiva kaarre', size: [2, 2], paths: [{ a: P(0, 0, 0), b: P(1, 1, 1), gen: () => arc(20, 2 * T, 1.5 * T) }] },
  {
    id: 'kallistus', name: 'Kallistettu kaarre', size: [2, 2], paths: [{
      a: P(0, 0, 0), b: P(1, 1, 1),
      gen: () => arc(32, 2 * T, 1.5 * T, t => 0.5 * ss(cl(t / 0.45)) * ss(cl((1 - t) / 0.45)))
    }]
  },
  { id: 'nousu', name: 'Nousu', size: [1, 1], paths: [{ a: P(0, 0, 0), b: P(0, 0, 2, 1), gen: () => line(10, t => up0(T / 2, H * ss(t), t * T)) }] },
  { id: 'hyppyri', name: 'Hyppyri', size: [1, 1], jump: true, paths: [{ a: P(0, 0, 0), b: P(0, 0, 2, 0, true), gen: () => line(12, t => up0(T / 2, RAMP_H * t * t * t, t * T)) }] },
  { id: 'silmukka', name: 'Silmukka', size: [1, 2], loop: true, paths: [{ a: P(0, 0, 0), b: P(0, 1, 2), gen: loopGen }] },
  { id: 'kumpare', name: 'Kumpare', size: [1, 1], paths: [{ a: P(0, 0, 0), b: P(0, 0, 2), gen: () => line(12, t => up0(T / 2, 1.4 * Math.pow(Math.sin(PI * t), 2), t * T)) }] },
  {
    id: 'risteys', name: 'Risteys', size: [1, 1], cross: true, paths: [
      { a: P(0, 0, 0), b: P(0, 0, 2), gen: straight },
      { a: P(0, 0, 3), b: P(0, 0, 1), gen: () => line(4, t => up0(t * T, 0.02, T / 2)) }
    ]
  }
];

export const PIECE_BY_ID = Object.fromEntries(PIECES.map((p, i) => [p.id, Object.assign(p, { idx: i })]));
export const RAMP = { h: RAMP_H, slope: 3 * RAMP_H / T };

// välimuisti: palan kehykset lasketaan kerran
const cache = new Map();
export function frames(def, pathIdx) {
  const k = def.id + ':' + pathIdx;
  if (!cache.has(k)) cache.set(k, def.paths[pathIdx].gen());
  return cache.get(k);
}
