// Vianetsintä: matalan iskun torjunta seisten
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const b = new EK.Battle({ p1: 'kaisa', p2: 'rami', training: true, seed: 3 });
b.f[0].x = 700; b.f[1].x = 790;
const back = { l: 1 };
for (let i = 0; i < 80; i++) {
  if (i === 38) { b.f[0].x = 700; b.f[1].x = 790; }
  b.step(back, i === 10 ? { M: 1 } : i === 40 ? { d: 1, M: 1 } : EK.BLANK);
  b.events.forEach(e => { if (e.t !== 'move') console.log(i, e.t, e.str || '', 'P1', b.f[0].state, b.f[0].dir, 'P2', b.f[1].state, b.f[1].move && b.f[1].move.id); });
  if (b.f[1].move && b.f[1].mf === 1) console.log(i, 'P2 aloitti', b.f[1].move.id);
  b.events.length = 0;
}
