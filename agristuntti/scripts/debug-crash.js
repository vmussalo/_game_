// Vianetsintä: ajaa yhden koneen yhdellä radalla ja tulostaa ensimmäisen kolarin tilanteen.
//   node scripts/debug-crash.js RATA KONE
import { VEHICLES, STEP } from '../peli/js/data.js';
import { buildWorld, pointPush } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';
import { createRace, stepRace } from '../peli/js/race.js';

const [ti, vi] = process.argv.slice(2).map(Number);
const w = buildWorld(BUILTIN()[ti]);
const race = createRace(w, [{ spec: VEHICLES[vi], name: 'AI', ai: { skill: 1 }, player: true }]);
const r = race.racers[0];
const hist = [];
for (let s = 0; s < 120 / STEP && !race.done; s++) {
  stepRace(race, STEP);
  const c = r.car;
  hist.push(`t ${race.t.toFixed(2)} k ${r.k} seg ${r.seg} ${w.samples[r.k].kind} pos ${c.pos.map(v => v.toFixed(2)).join(',')} v ${c.speed.toFixed(1)} up ${c.M[4].toFixed(2)} cont ${c.contacts}/${c.roadContacts} comp ${c.wheels.map(q => q.comp.toFixed(2)).join(' ')}`);
  const ev = race.events.find(e => e.t === 'crash' || e.t === 'respawn');
  race.events.length = 0;
  if (ev) {
    console.log(hist.slice(-(+process.env.N || 40)).filter((_, i) => i % (+process.env.E || 4) === 0).join('\n'));
    console.log('TAPAHTUMA', ev.t, ev.why || '');
    // mikä piste osuu mihin
    for (const pt of c.pts) {
      const M = c.M, p = pt.p;
      const x = c.pos[0] + M[0] * p[0] + M[3] * p[1] + M[6] * p[2], y = c.pos[1] + M[1] * p[0] + M[4] * p[1] + M[7] * p[2], z = c.pos[2] + M[2] * p[0] + M[5] * p[1] + M[8] * p[2];
      const h = pointPush(w, x, y, z);
      if (h) console.log('  piste', p.map(v => v.toFixed(2)).join(','), 'top', pt.top, '→', h.what, 'd', h.d.toFixed(2), 'n', h.nx.toFixed(2), h.ny.toFixed(2), h.nz.toFixed(2));
    }
    if (process.argv[4] !== 'all' && !(+process.env.SKIP > 0 && process.env.SKIP--)) break;
  }
}
