// Ratojen ja fysiikan testi ilman selainta.
//   node scripts/sim.js                 kaikki radat, kaikki koneet
//   node scripts/sim.js RATA KONE TAITO  esim. node scripts/sim.js 0 2 1
// Tulostaa ajan, kolarit ja palautukset. Jos kone ei pääse maaliin, rata tai fysiikka vaatii korjausta.
import { VEHICLES, STEP } from '../peli/js/data.js';
import { buildWorld } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';
import { createRace, stepRace } from '../peli/js/race.js';

const tracks = BUILTIN();
const ta = process.argv[2] != null && process.argv[2] !== 'all' ? [+process.argv[2]] : tracks.map((_, i) => i);
const va = process.argv[3] != null && process.argv[3] !== 'all' ? [+process.argv[3]] : VEHICLES.map((_, i) => i);
const skill = +(process.argv[4] || 1);
const verbose = !!process.env.V;
let bad = 0;
for (const ti of ta) {
  const t = tracks[ti];
  const w = buildWorld(t);
  if (!w.trace.ok) { console.log('RATA', ti, t.name, 'VIRHE:', w.trace.err, w.trace.at || '', 'loppu', JSON.stringify(t.end)); bad++; continue; }
  const L = w.samples[w.samples.length - 1].d;
  console.log('RATA', ti, t.name, 'palat', t.pieces.length, 'pituus', Math.round(L) + ' m', w.trace.circuit ? 'kierros' : 'A→B', 'kolmiot', w.nt);
  for (const vi of va) {
    const spec = VEHICLES[vi];
    const race = createRace(w, [{ spec, name: 'AI', ai: { skill }, player: true, vi }]);
    const r = race.racers[0];
    let steps = 0, maxV = 0;
    const log = [];
    while (!race.done && steps < 240 / STEP) {
      stepRace(race, STEP); steps++;
      maxV = Math.max(maxV, r.car.speed);
      for (const ev of race.events) if (ev.t === 'crash' || ev.t === 'respawn') log.push(ev.t + '@' + r.seg + '(' + (ev.why || '') + ' ' + race.t.toFixed(1) + 's ' + w.samples[r.k].kind + ')');
      race.events.length = 0;
      if (!isFinite(r.car.pos[0])) { log.push('NaN!'); break; }
      if (verbose && steps % 120 === 0) console.log('   t', race.t.toFixed(1), 'seg', r.seg, 'k', r.k, 'v', r.car.speed.toFixed(1), 'pos', r.car.pos.map(v => v.toFixed(1)).join(','), 'cont', r.car.contacts, 'up', r.car.M[4].toFixed(2));
    }
    const ok = r.finished;
    if (!ok) bad++;
    console.log('  ', (ok ? 'OK  ' : 'EI  ') + spec.id.padEnd(14), ok ? r.time.toFixed(2) + ' s' : 'seg ' + r.seg + '/' + w.trace.seq.length, 'huippu', Math.round(maxV * 3.6) + ' km/h', 'kolarit', r.crashes, 'palautukset', r.resets, log.slice(0, 6).join(' '));
  }
}
console.log(bad ? bad + ' ongelmaa' : 'Kaikki OK');
