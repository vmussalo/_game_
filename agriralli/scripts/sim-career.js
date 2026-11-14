// Urasimulaatio ilman selainta: node scripts/sim-career.js [päiviä] [pelaajan taito 0..1] [siemen]
// Autopilotti ajaa kisat, korjaa, ostaa koneita ja virityksiä. Tulostaa etenemisen päivittäin.
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'track', 'race', 'career']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const days = +(process.argv[2] || 60), skill = +(process.argv[3] || 0.7), quiet = process.env.QUIET;
const C = AR.Career;
const c = C.create('Botti');
const avgUp = () => (c.up.engine + c.up.tires + c.up.armor + (c.up.gun - 1)) / 4;
let finalDay = 0, wonDay = 0, wrecks = 0;
for (let d = 0; d < days; d++) {
  // korjaus
  if (c.hpFrac < 1) { C.repair(c); if (c.hpFrac < 0.35) C.tape(c); }
  // kisan valinta: vaikein, jossa vastustajien kalusto ei ole selvästi parempi
  const power = c.vi + avgUp() * 0.5;
  let offer = c.offers.find(o => o.final && c.vi === 6 && avgUp() >= 3.5);
  if (!offer) {
    for (const o of c.offers.filter(o => !o.final).reverse()) {
      const opp = o.opp.map(id => c.drivers[id]);
      const op = opp.reduce((a, x) => a + x.vt + x.lv * 0.5, 0) / opp.length;
      if (op <= power + 0.6) { offer = o; break; }
    }
    offer = offer || c.offers[0];
  }
  const ent = C.entrants(c, offer);
  const me = ent.find(e => e.isPlayer); me.skill = skill; me.aggr = 0.6;
  const race = AR.Race.create({ track: offer.track, laps: C.laps(offer), diff: offer.diff, entrants: ent, auto: true });
  let n = 0;
  while (race.state !== 'done' && n < 120 * 900) { AR.Race.step(race, 1 / 120); race.fx.length = 0; n++; }
  const sum = C.applyResult(c, offer, race.results);
  if (sum.wrecked) wrecks++;
  if (offer.final && !finalDay) finalDay = c.day - 1;
  if (sum.ending) wonDay = c.day - 1;
  // ostokset
  if (c.hpFrac < 1) C.repair(c);
  const next = c.vi + 1;
  if (next < AR.VEH.length && c.cash >= C.vehCost(c, next) + 600) C.buyVehicle(c, next);
  const target = next < AR.VEH.length ? Math.min(2, 1 + c.vi * 0.25) : 5; // viritetään vähän, sitten säästetään
  for (let k = 0; k < 20; k++) {
    let best = null;
    for (const key of ['engine', 'armor', 'gun', 'tires', 'ram']) {
      const cost = C.upgradeCost(c, key);
      if (cost != null && (!best || cost < best.cost)) best = { key, cost };
    }
    if (!best || c.cash < best.cost + 400 || avgUp() >= target) break;
    C.buyUpgrade(c, best.key);
  }
  while (c.ammo < 50 && C.buyCons(c, 'ammo').ok);
  while (c.mines < 1 && c.cash > 3000 && C.buyCons(c, 'mines').ok);
  while (c.turbo < 2 && c.cash > 3000 && C.buyCons(c, 'turbo').ok);
  if (!quiet) console.log('pv', String(c.day - 1).padStart(2), AR.TEXTS.dystopia.diff[offer.diff].padEnd(14), (sum.wrecked ? 'ROMU' : sum.place + '.').padEnd(5),
    'raha', String(c.cash).padStart(6), 'kone', c.vi, 'up', JSON.stringify(c.up).replace(/"|engine|tires|armor|gun|ram|:/g, ''),
    'sija', C.rank(c), 'pist', c.points, 'pomo', c.boss.points, 'aika', race.t.toFixed(0));
  if (wonDay) break;
}
console.log('YHTEENVETO: päiviä', c.day - 1, 'voitot', c.stats.wins, '/', c.stats.races, 'romutuksia', wrecks, 'kone', c.vi, 'finaali pv', finalDay || '-', 'voitto pv', wonDay || '-');
