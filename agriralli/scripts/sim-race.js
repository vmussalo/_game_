// Kisasimulaatio ilman selainta: node scripts/sim-race.js [rata] [kone] [taso]
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'track', 'race']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const tracks = process.argv[2] != null && process.argv[2] !== 'all' ? [+process.argv[2]] : AR.TRACKS.map((_, i) => i);
const vi = +(process.argv[3] || 0), lv = +(process.argv[4] || 0);
for (const ti of tracks) {
  const tr = AR.Track.build(ti);
  const laps = Math.max(2, Math.round(+(process.env.DIST||19000) / tr.L));
  const up = { engine: lv, tires: lv, armor: lv, gun: Math.max(1, lv), ram: Math.min(3, lv >> 1) };
  const ent = [0, 1, 2, 3].map(i => ({ name: 'K' + i, color: '#888888', vi, up, ammo: +(process.env.AMMO||60), mines: +(process.env.MINES||1), turbo: process.env.HOOKI ? AR.HOOKI.turbo : 2, skill: 0.4 + i * 0.18, aggr: 0.3 + i * 0.2, isPlayer: i === 3 }));
  const race = AR.Race.create({ track: ti, laps, diff: 1, entrants: ent, auto: true, hooki: !!process.env.HOOKI });
  let steps = 0;
  while (race.state !== 'done' && steps < 120 * 600) { AR.Race.step(race, 1 / 120); race.fx.length = 0; steps++; }
  const bad = race.cars.some(c => !isFinite(c.x) || !isFinite(c.y));
  const res = race.results ? race.results.map(r => r.name + (r.finished ? '' : r.wrecked ? '✗' : '…') + ' k' + r.kills + ' hp' + Math.round(r.hpFrac * 100)).join(' | ') : 'EI VALMIS';
  const best = Math.min(...race.cars.map(c => c.finished ? c.finishT : 1e9)); console.log('rata', ti, 'voittaja', best < 1e8 ? (best - 3.2).toFixed(1) : '-', 'L', Math.round(tr.L), 'kierr', laps, 'aika', race.t.toFixed(1) + 's', bad ? 'NaN!' : '', res, JSON.stringify(Object.fromEntries(Object.entries(race.dmg).map(([k,v])=>[k,Math.round(v)]))));
}
