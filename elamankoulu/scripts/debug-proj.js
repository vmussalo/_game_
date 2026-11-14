// Vianetsintä: miksi tekoäly ei torju ammuksia
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const bt = new EK.Battle({ p1: 'jere', p2: 'saara', seed: 501, noIntro: true });
const ai = [new EK.AI(bt, 0, 2, 9), new EK.AI(bt, 1, 2, 99)];
const orig = bt.applyHit.bind(bt);
let n = 0;
bt.applyHit = function (a, d, h, proj) {
  const st = d.state, mv = d.move && d.move.id, dir = d.dir;
  orig(a, d, h, proj);
  if (proj && n++ < 12) console.log('ammus osui', d.ch.id, 'tila', st, mv || '', 'suunta', dir, 'hold', ai[d.idx].hold, ai[d.idx].holdT, 'jono', ai[d.idx].q.length, '→', d.state);
};
let fr = 0;
while (bt.phase !== 'done' && fr < 20000) { bt.step(ai[0].input(), ai[1].input()); bt.events.length = 0; fr++; }
