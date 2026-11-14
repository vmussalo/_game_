// AgriStuntti – autopilotti: tietokonevastustaja ja ratojen automaattinen testikuski.
// Laskee jokaiselle keskilinjan näytteelle tavoitenopeuden (kaarteet, hyppyrit) ja ohjaa kohti edessä olevaa pistettä.
import { GRAV, TILE as T } from './data.js';
import { RAMP } from './pieces.js';
import { steerGain } from './physics.js';

// hyppyn tarvitsema nopeus: lennetään rakoon ja osutaan alastulorampin alamäkeen
export function jumpSpeed(gapDist) {
  const th = Math.atan(RAMP.slope), h = RAMP.h;
  const target = gapDist + 0.38 * T;
  const landY = x => { const s = (x - gapDist) / T; return s < 0 ? -1e9 : h * Math.pow(Math.max(0, 1 - s), 3); };
  const reach = v => {
    const vx = v * Math.cos(th), vy = v * Math.sin(th);
    for (let t = 0.02; t < 8; t += 0.01) {
      const x = vx * t, y = h + vy * t - GRAV * t * t / 2;
      if (x > gapDist && y <= landY(x)) return x;
      if (y < -1) return x;
    }
    return 1e9;
  };
  let lo = 4, hi = 60;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (reach(m) < target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// tavoitenopeudet: { v: Float32Array, jumps: [{k, v}] }
export function planSpeeds(world, spec, skill) {
  const S = world.samples, n = S.length, v = new Float32Array(n);
  const vcap = spec.vmax * (skill || 1);
  const mu = spec.grip * 0.82;
  for (let k = 0; k < n; k++) {
    const a = S[Math.max(0, k - 2)], b = S[Math.min(n - 1, k + 2)], s = S[k];
    const ds = Math.max(0.5, b.d - a.d);
    // sivuttainen kaarevuus: suunnan muutos vasemmalle-akselin suuntaan
    const lx = s.uy * s.fz - s.uz * s.fy, ly = s.uz * s.fx - s.ux * s.fz, lz = s.ux * s.fy - s.uy * s.fx;
    const kap = Math.abs((b.fx - a.fx) * lx + (b.fy - a.fy) * ly + (b.fz - a.fz) * lz) / ds;
    let lim = vcap;
    // silmukassa ei kaarrerajoitusta: tulon ja lähdön pieni sivusiirtymä ajetaan suoraan läpi, ja silmukka vaatii vauhtia
    if (kap > 1e-4 && s.kind !== 'silmukka') {
      // sivuttainen kallistus: tien ylösvektorin osuus vaakasuoraan vasemmalle (silmukassa ~0)
      const hl = Math.hypot(s.fz, s.fx) || 1;
      const bank = Math.asin(Math.min(1, Math.abs(s.ux * s.fz / hl - s.uz * s.fx / hl)));
      const f = bank > 0.05 ? Math.min(1.8, (Math.sin(bank) + mu * Math.cos(bank)) / Math.max(0.15, Math.cos(bank) - mu * Math.sin(bank))) : mu;
      lim = Math.min(lim, Math.sqrt(GRAV * f / kap) * (0.86 + 0.1 * (skill || 1)));
    }
    // harjanne (suunta kääntyy alaspäin): liian kova vauhti heittää pitkään lentoon
    const kv = ((b.fx - a.fx) * s.ux + (b.fy - a.fy) * s.uy + (b.fz - a.fz) * s.uz) / ds;
    if (kv < -0.008 && !s.air && s.kind !== 'hyppyri') lim = Math.min(lim, 1.2 * Math.sqrt(GRAV / -kv));
    // korkealla ilman kaiteita: varovaisemmin
    if (s.y > 3 && s.kind !== 'silmukka' && s.kind !== 'hyppyri') lim *= 0.9;
    v[k] = lim;
  }
  // hyppyrit: ponnistuksen päässä tarkka nopeus
  const jumps = [];
  for (let k = 0; k < n - 1; k++) {
    if (!S[k].air) continue;
    const nx = S[k + 1];
    const gap = Math.hypot(nx.x - S[k].x, nx.z - S[k].z);
    const vj = Math.min(vcap, jumpSpeed(gap) * 1.03);
    jumps.push({ k, v: vj });
    // ponnistusrampin alusta asti tavoitteena vj
    for (let j = k; j >= 0 && S[k].d - S[j].d < T * 1.05; j--) v[j] = Math.min(v[j], vj);
  }
  // jarrutusmatkat taaksepäin
  const dec = 5.5;
  for (let k = n - 2; k >= 0; k--) {
    const ds = S[k + 1].d - S[k].d;
    if (S[k].air) continue; // hypyn yli ei jarruteta
    v[k] = Math.min(v[k], Math.sqrt(v[k + 1] * v[k + 1] + 2 * dec * Math.max(0, ds)));
  }
  return { v, jumps };
}

// ohjaus: st = { k (näyte), plan }
export function aiInput(car, world, st) {
  const S = world.samples, n = S.length;
  const M = car.M;
  const speed = Math.max(0, car.vf);
  // Stanley-ohjain: suuntavirhe + sivupoikkeama tien omassa koordinaatistossa (toimii myös silmukassa ylösalaisin)
  const at = (k0, dist) => { let j = k0; while (j < n - 1 && S[j].d - S[k0].d < dist) j++; return j; };
  const s0 = S[st.k], kr = at(st.k, 2 + speed * 0.18), s = S[kr];
  const left = p => [p.uy * p.fz - p.uz * p.fy, p.uz * p.fx - p.ux * p.fz, p.ux * p.fy - p.uy * p.fx];
  const L0 = left(s0), L = left(s);
  const e = (car.pos[0] - s0.x) * L0[0] + (car.pos[1] - s0.y) * L0[1] + (car.pos[2] - s0.z) * L0[2];
  const azx = M[6], azy = M[7], azz = M[8];
  const psi = Math.atan2(azx * L[0] + azy * L[1] + azz * L[2], azx * s.fx + azy * s.fy + azz * s.fz);
  const a = S[Math.max(0, kr - 2)], b = S[Math.min(n - 1, kr + 2)];
  const kap = ((b.fx - a.fx) * L[0] + (b.fy - a.fy) * L[1] + (b.fz - a.fz) * L[2]) / Math.max(0.5, b.d - a.d);
  let steer;
  const spec = car.spec;
  if (spec.tracked) {
    const rd = speed * kap - 2.2 * psi - 0.3 * e;
    steer = Math.max(-1, Math.min(1, rd / (spec.steer / (1 + Math.abs(car.vf) / 14))));
  } else {
    const wb = Math.max(...spec.wheels.map(w => w.z)) - Math.min(...spec.wheels.map(w => w.z));
    const delta = -psi - Math.atan(1.4 * e / (speed + 3)) + Math.atan(wb * kap);
    const maxA = spec.steer / (1 + Math.abs(car.vf) / 16);
    steer = Math.max(-1, Math.min(1, delta / (maxA * steerGain(car))));
  }
  // tavoitenopeus: pienin lähiajan tavoitteista
  let vt = 1e9;
  for (let q = st.k; q < n && S[q].d - S[st.k].d < 4 + speed * 0.25; q++) vt = Math.min(vt, st.plan.v[q]);
  let throttle = 1;
  if (car.vf > vt + 1.5) throttle = -1;
  else if (car.vf > vt) throttle = 0;
  if (!car.contacts) steer = 0;
  return { throttle, steer };
}
