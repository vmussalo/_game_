// Ottelusimulaatio ilman selainta: tekoäly vastaan tekoäly kaikilla hahmopareilla.
// Käyttö: node scripts/sim.js [otteluita per pari] [vaikeustaso 0-3] [hahmo1] [hahmo2]
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));

const N = +(process.argv[2] || 4), diff = +(process.argv[3] == null ? 2 : process.argv[3]);
const ids = EK.CHARS.map(c => c.id);
const A = process.argv[4] ? [process.argv[4]] : ids, B = process.argv[5] ? [process.argv[5]] : ids;
const wins = {}; ids.forEach(i => { wins[i] = { w: 0, l: 0 }; });
const agg = { frames: 0, matches: 0, rounds: 0, timeups: 0, opetus: 0, maxCombo: 0, supers: 0, parries: 0, perfect: 0, throws: 0, burnouts: 0, hits: 0, blocks: 0 };
const evc = {};
let bad = 0, stuck = 0;
for (const a of A) for (const b of B) {
  if (a === b && A.length > 1) continue;
  for (let n = 0; n < N; n++) {
    const seed = 1000 + n * 31 + a.length * 7 + b.length;
    const bt = new EK.Battle({ p1: a, p2: b, seed, noIntro: true });
    const ai = [new EK.AI(bt, 0, diff, seed + 1), new EK.AI(bt, 1, diff, seed + 2)];
    let fr = 0;
    while (bt.phase !== 'done' && fr < 60 * 60 * 8) {
      bt.step(ai[0].input(), ai[1].input());
      bt.events.forEach(e => { evc[e.t] = (evc[e.t] || 0) + 1; });
      bt.events.length = 0;
      fr++;
      for (const f of bt.f) if (!isFinite(f.x) || !isFinite(f.y) || !isFinite(f.hp)) { bad++; console.log('NaN!', a, b, f.state); fr = 1e9; }
    }
    if (bt.phase !== 'done') { stuck++; console.log('JUMI', a, b, bt.phase, bt.f.map(f => f.state + ':' + f.sf)); continue; }
    const r = bt.result;
    agg.frames += fr; agg.matches++; agg.rounds += r.rounds; if (r.opetus) agg.opetus++;
    bt.stats.forEach(s => { agg.maxCombo = Math.max(agg.maxCombo, s.maxCombo); agg.supers += s.supers; agg.parries += s.parries; agg.perfect += s.perfect; agg.throws += s.throws; agg.burnouts += s.burnouts; agg.hits += s.hits; agg.blocks += s.blocks; });
    if (r.winner === 0) { wins[a].w++; wins[b].l++; } else if (r.winner === 1) { wins[b].w++; wins[a].l++; }
    if (process.env.V) console.log(a, 'vs', b, 'voittaja', r.winner, 'erät', r.wins.join('-'), 'aika', (fr / 60).toFixed(0) + 's', JSON.stringify(bt.stats));
  }
}
console.log('Ottelut', agg.matches, 'keskipituus', (agg.frames / agg.matches / 60).toFixed(1) + 's', 'erät/ottelu', (agg.rounds / agg.matches).toFixed(2), 'OPETUS', agg.opetus, 'NaN', bad, 'jumissa', stuck);
console.log('Per ottelu: osumat', (agg.hits / agg.matches).toFixed(1), 'torjunnat', (agg.blocks / agg.matches).toFixed(1), 'superit', (agg.supers / agg.matches).toFixed(2), 'Hengitä', (agg.parries / agg.matches).toFixed(2), 'täydelliset', (agg.perfect / agg.matches).toFixed(2), 'heitot', (agg.throws / agg.matches).toFixed(2), 'uupumukset', (agg.burnouts / agg.matches).toFixed(2), 'pisin yhdistelmä', agg.maxCombo);
console.log('Voitto-%:', ids.map(i => i + ' ' + Math.round(100 * wins[i].w / Math.max(1, wins[i].w + wins[i].l))).join(' | '));
if (process.env.EV) console.log(JSON.stringify(evc));
