// Mistä vahinko tulee: osumat liikkeittäin hahmoa kohden (tekoäly vs tekoäly).
// Käyttö: node scripts/sim-moves.js [otteluita per pari] [taso]
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const N = +(process.argv[2] || 2), diff = +(process.argv[3] == null ? 2 : process.argv[3]);
const rec = {};
const orig = EK.Battle.prototype.applyHit;
EK.Battle.prototype.applyHit = function (a, d, h, proj) {
  const before = d.hp, st = d.state;
  orig.call(this, a, d, h, proj);
  const id = a.ch.id, mv = proj ? 'ammus' : (a.move ? a.move.id.replace(/[LMH]$/, '') : '?');
  const r = rec[id] = rec[id] || {};
  const k = mv + (d.state === 'block' ? ':torj' : '');
  r[k] = (r[k] || 0) + Math.max(0, before - d.hp);
};
const ids = EK.CHARS.map(c => c.id);
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  for (let n = 0; n < N; n++) {
    const bt = new EK.Battle({ p1: a, p2: b, seed: 500 + n, noIntro: true });
    const ai = [new EK.AI(bt, 0, diff, 9 + n), new EK.AI(bt, 1, diff, 99 + n)];
    let fr = 0;
    while (bt.phase !== 'done' && fr < 60 * 60 * 8) { bt.step(ai[0].input(), ai[1].input()); bt.events.length = 0; fr++; }
  }
}
for (const id of ids) {
  const r = rec[id], tot = Object.values(r).reduce((x, y) => x + y, 0);
  console.log(id.padEnd(7), Math.round(tot), Object.entries(r).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => k + ' ' + Math.round(100 * v / tot) + '%').join(' | '));
}
