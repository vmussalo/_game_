// Vianetsintä: missä tilassa ammukset osuvat (yhdistelmä vai neutraali)
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const cnt = {};
for (const att of ['jere', 'martta', 'hannu']) for (const def of ['saara', 'iida', 'rami']) for (let n = 0; n < 3; n++) {
  const bt = new EK.Battle({ p1: att, p2: def, seed: 700 + n, noIntro: true });
  const ai = [new EK.AI(bt, 0, 2, 9 + n), new EK.AI(bt, 1, 2, 99 + n)];
  const orig = bt.applyHit.bind(bt);
  bt.applyHit = function (a, d, h, proj) {
    const st = d.state + (d.state === 'move' ? ':' + d.move.kind : '');
    const hp = d.hp;
    orig(a, d, h, proj);
    if (proj && a.idx === 0) { const k = st + (d.state === 'block' ? '→torj' : d.state === 'parry' ? '→hengitä' : ''); cnt[k] = (cnt[k] || 0) + (hp - d.hp); }
  };
  let fr = 0;
  while (bt.phase !== 'done' && fr < 20000) { bt.step(ai[0].input(), ai[1].input()); bt.events.length = 0; fr++; }
}
console.log(Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round(v)).join('\n'));
