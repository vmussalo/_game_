// Vianetsintä: tekoälyn ohjaus aikavälillä: node scripts/debug-ai.js RATA KONE T0 T1
import { VEHICLES, STEP } from '../peli/js/data.js';
import { buildWorld } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';
import { createRace, stepRace } from '../peli/js/race.js';
const [ti, vi, t0, t1] = process.argv.slice(2).map(Number);
const w = buildWorld(BUILTIN()[ti]);
const race = createRace(w, [{ spec: VEHICLES[vi], name: 'AI', ai: { skill: 1 }, player: true }]);
const r = race.racers[0];
let n = 0;
while (race.t < t1) {
  stepRace(race, STEP); race.events.length = 0;
  if (race.t >= t0 && n++ % 6 === 0) {
    const c = r.car, s = w.samples[r.k];
    console.log(race.t.toFixed(2), 'k', r.k, 'pos', c.pos.map(v => v.toFixed(1)).join(','), 'path', [s.x, s.y, s.z].map(v => v.toFixed(1)).join(','), 'inp', r.inp.steer.toFixed(2), r.inp.throttle, 'steerAng', c.steerAng.toFixed(3), 'vf', c.vf.toFixed(1), 'cont', c.contacts, 'yaw', Math.atan2(c.M[6], c.M[8]).toFixed(2));
  }
}
// sisäiset arvot viimeisellä hetkellä
{
  const S = w.samples, c = r.car, st = { k: r.k };
  const n = S.length, speed = Math.max(0, c.vf);
  const at = (k0, dist) => { let j = k0; while (j < n - 1 && S[j].d - S[k0].d < dist) j++; return j; };
  const s0 = S[st.k], kr = at(st.k, 2 + speed * 0.18), s = S[kr];
  const left = p => [p.uy * p.fz - p.uz * p.fy, p.uz * p.fx - p.ux * p.fz, p.ux * p.fy - p.uy * p.fx];
  const L0 = left(s0), L = left(s);
  console.log('s0', JSON.stringify(s0), '\nL0', L0, 'L', L, 'kr', kr);
}
