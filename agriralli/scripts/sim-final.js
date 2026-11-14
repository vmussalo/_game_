// Finaalin vaikeus: node scripts/sim-final.js KONE TASO [kertoja] [taito]
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'track', 'race', 'career']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const vi = +process.argv[2], lv = +process.argv[3], n = +(process.argv[4] || 10), skill = +(process.argv[5] || 0.9);
const C = AR.Career, c = C.create('Botti');
c.day = 30; C.updateDrivers(c); c.points = 999; C.genOffers(c);
c.vi = vi; c.up = { engine: lv, tires: lv, armor: lv, gun: Math.max(1, lv), ram: Math.min(3, lv) }; c.ammo = 150; c.mines = 4; c.turbo = 6;
const offer = c.offers.find(o => o.final);
let wins = 0, wrecked = 0, places = [];
for (let i = 0; i < n; i++) {
  const ent = C.entrants(c, offer); const me = ent.find(e => e.isPlayer); me.skill = skill; me.aggr = 0.7;
  const race = AR.Race.create({ track: offer.track, laps: C.laps(offer), diff: 3, entrants: ent, auto: true });
  let k = 0; while (race.state !== 'done' && k < 120 * 900) { AR.Race.step(race, 1 / 120); race.fx.length = 0; k++; }
  const r = race.results.find(x => x.isPlayer); places.push(r.wrecked ? 'R' : r.place);
  if (r.place === 1 && !r.wrecked) wins++; if (r.wrecked) wrecked++;
}
console.log('kone', vi, 'taso', lv, 'voitot', wins + '/' + n, 'romutettu', wrecked, places.join(' '));
