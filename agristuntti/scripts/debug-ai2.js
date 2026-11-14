// Vianetsintä: Stanley-ohjaimen sisäiset arvot: node scripts/debug-ai2.js RATA KONE T0 T1
import { VEHICLES, STEP } from '../peli/js/data.js';
import { buildWorld } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';
import { createRace, stepRace } from '../peli/js/race.js';
const [ti, vi, t0, t1] = process.argv.slice(2).map(Number);
const w = buildWorld(BUILTIN()[ti]);
const race = createRace(w, [{ spec: VEHICLES[vi], name: 'AI', ai: { skill: 1 }, player: true }]);
const r = race.racers[0], S = w.samples, n = S.length;
let cnt = 0;
while (race.t < t1) {
  stepRace(race, STEP); race.events.length = 0;
  if (race.t < t0 || cnt++ % 6) continue;
  const c = r.car, M = c.M, speed = Math.max(0, c.vf);
  const at = (k0, dist) => { let j = k0; while (j < n - 1 && S[j].d - S[k0].d < dist) j++; return j; };
  const s0 = S[r.k], kr = at(r.k, 2 + speed * 0.18), s = S[kr];
  const left = p => [p.uy * p.fz - p.uz * p.fy, p.uz * p.fx - p.ux * p.fz, p.ux * p.fy - p.uy * p.fx];
  const L0 = left(s0), L = left(s);
  const e = (c.pos[0] - s0.x) * L0[0] + (c.pos[1] - s0.y) * L0[1] + (c.pos[2] - s0.z) * L0[2];
  const psi = Math.atan2(M[6] * L[0] + M[7] * L[1] + M[8] * L[2], M[6] * s.fx + M[7] * s.fy + M[8] * s.fz);
  const upDot = M[3] * s.ux + M[4] * s.uy + M[5] * s.uz;
  console.log(race.t.toFixed(2), 'k', r.k, 'e', e.toFixed(2), 'psi', psi.toFixed(2), 'auto·tieylös', upDot.toFixed(2), 'steer', r.inp.steer.toFixed(2), 'cont', c.contacts, 'raapii', c.scrape, 'wl', [c.w[0]*M[3]+c.w[1]*M[4]+c.w[2]*M[5]].map(v=>v.toFixed(2)).join());
}
