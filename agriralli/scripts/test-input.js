// Ohjauksen testi ilman selainta: node scripts/test-input.js
// Tarkistaa, että kaksinpelissä näppäimistön puoliskot ohjaavat eri koneita ja yksinpelissä kaikki näppäimet samaa.
const listeners = {};
global.window = global;
global.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
global.navigator = { getGamepads: () => [] };
global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'input']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));
const I = AR.Input;
const key = (type, code) => listeners[type].forEach(f => f({ code, target: null, preventDefault() {} }));
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'VIRHE ') + msg); if (!cond) fails++; };

I.players = 1;
key('keydown', 'KeyA'); ok(I.state(0).steer === -1, 'yksinpeli: A kääntää vasemmalle');
key('keyup', 'KeyA'); key('keydown', 'ArrowRight'); ok(I.state(0).steer === 1, 'yksinpeli: nuoli oikealle kääntää');
key('keyup', 'ArrowRight');

I.players = 2; I.reset();
key('keydown', 'KeyA'); key('keydown', 'Space');
let a = I.state(0), b = I.state(1);
ok(a.steer === -1 && a.fire, 'P1: A ja välilyönti → P1 kääntyy ja ampuu');
ok(b.steer === 0 && !b.fire, 'P2 ei reagoi P1:n näppäimiin');
I.reset();
key('keydown', 'ArrowRight'); key('keydown', 'Period'); key('keydown', 'Slash'); key('keydown', 'Comma'); key('keydown', 'KeyM');
a = I.state(0); b = I.state(1);
ok(b.steer === 1 && b.fire && b.turbo && b.mine && b.special, 'P2: nuoli, piste, viiva, pilkku, M');
ok(a.steer === 0 && !a.fire && !a.turbo && !a.mine && !a.special, 'P1 ei reagoi P2:n näppäimiin');
I.reset();
key('keydown', 'ShiftLeft'); key('keydown', 'KeyQ'); key('keydown', 'KeyE'); key('keydown', 'KeyW');
a = I.state(0); b = I.state(1);
ok(a.turbo && a.mine && a.special && a.throttle === 1, 'P1: vasen Shift, Q, E, W');
ok(!b.turbo && b.throttle === 0, 'P2 ei saa P1:n turboa eikä kaasua');
console.log(fails ? fails + ' virhettä' : 'Kaikki testit OK');
process.exit(fails ? 1 : 0);
