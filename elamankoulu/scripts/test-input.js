// Syötetesti ilman selainta: tarkistaa, että liikesarjat ja napit tuottavat oikeat liikkeet.
// Käyttö: node scripts/test-input.js
global.window = global; global.location = { search: '' };
const path = require('path');
for (const f of ['util', 'text', 'data', 'moves', 'fighter', 'battle', 'ai']) require(path.join(__dirname, '..', 'peli', 'js', f + '.js'));

// Syöte merkkijonona: '2' '3' '6' suunnat (P1 katsoo oikealle), '+L' napit. Esim. ['2','3','6+L']
function frame(s) {
  const [d, b] = s.split('+');
  const n = +d || 5;
  const inp = { u: n >= 7, d: n <= 3, l: n % 3 === 1, r: n % 3 === 0, L: 0, M: 0, H: 0, S: 0, P: 0 };
  (b || '').split('').forEach(k => { inp[k] = 1; });
  return inp;
}
let pass = 0, fail = 0;
function check(name, seq, expect, opts) {
  opts = opts || {};
  const b = new EK.Battle({ p1: opts.p1 || 'kaisa', p2: opts.p2 || 'rami', training: true, seed: 3 });
  b.o.trainInf = !!opts.meter;
  const f = b.f[0], o = b.f[1];
  f.meter = 0;
  if (opts.close) { f.x = 700; o.x = 760; }
  if (opts.meter) f.meter = 100;
  if (opts.modern) f.modern = true;
  for (let i = 0; i < 6; i++) b.step(EK.BLANK, EK.BLANK);
  const seen = [];
  const all = seq.concat(Array(opts.tail || 30).fill('5'));
  all.forEach(s => {
    const prev = f.move;
    b.step(frame(s), opts.dummy ? opts.dummy(b) : EK.BLANK);
    if (f.state === 'move' && f.move !== prev) seen.push(f.move.id);
    if (f.state === 'dash' && seen[seen.length - 1] !== 'dash') seen.push('dash');
    if (f.state === 'parry' && seen[seen.length - 1] !== 'parry') seen.push('parry');
    if (f.state === 'rest' && seen[seen.length - 1] !== 'rest') seen.push('rest');
    if (f.state === 'jumpsq' && seen[seen.length - 1] !== 'jump') seen.push('jump');
    if (f.state === 'throwing' && seen[seen.length - 1] !== 'throwing') seen.push('throwing');
  });
  const ok = expect.every((e, i) => seen[i] === e) && (opts.exact === false || seen.length === expect.length);
  if (ok) pass++; else fail++;
  console.log((ok ? 'OK  ' : 'VIRHE ') + name.padEnd(36) + ' odotettu ' + expect.join(',') + '  saatu ' + seen.join(','));
}

check('Nopea isku', ['5+L'], ['sL']);
check('Kyykkyisku', ['2+L'], ['cL']);
check('Yläisku →+M', ['6+M'], ['fM']);
check('↓↘→ + L (Kuuma kuppi)', ['2', '3', '6+L'], ['s1L']);
check('↓↘→ nopeasti ilman ↘', ['2', '6+H'], ['s1H']);
check('→↓↘ + H (Vaahdotin)', ['6', '2', '3+H'], ['s2H']);
check('↓↙← + M (Ryntäys)', ['2', '1', '4+M'], ['s3M']);
check('Kävely eteen + ↓↘→ = kuppi', ['6', '6', '6', '5', '2', '3', '6+L'], ['s1L']);
check('Superliike ↓↘→↓↘→ + H', ['2', '3', '6', '2', '3', '6+H'], ['sup'], { meter: 1 });
check('Super ilman mittaria = kuppi', ['2', '3', '6', '2', '3', '6+H'], ['s1H']);
check('Moderni: Erikois', ['5+S'], ['s1M'], { modern: 1 });
check('Moderni: → + Erikois', ['6+S'], ['s2M'], { modern: 1 });
check('Moderni: ↓ + Erikois', ['2+S'], ['s3M'], { modern: 1 });
check('Moderni: super Erikois+Iso', ['5+SH'], ['sup'], { modern: 1, meter: 1 });
check('Heitto L+M lähellä', ['5+LM'], ['throw', 'throwing'], { close: 1 });
check('Heitto L sitten M (1 ruutu)', ['5+L', '5+LM'], ['sL', 'throw', 'throwing'], { close: 1, exact: false });
check('Syöksy →→', ['6', '5', '6'], ['dash']);
check('Hyppy', ['9'], ['jump']);
check('Hengitä', ['5+P', '5+P', '5+P'], ['parry']);
check('Lepohetki ↓+P', ['2+P', '2+P', '2+P', '2+P'], ['rest']);
check('Ketju L→M osumassa', ['5+L', '5', '5', '5+M'], ['sL', 'sM'], { close: 1 });
check('Ketju L→M ohi = ei ketjua', ['5+L', '5', '5', '5+M'], ['sL'], { exact: false });
check('Kumous cM → ↓↘→H osumassa', ['2+M', '2', '2', '2', '2', '2', '3', '6+H'], ['cM', 's1H'], { close: 1 });
check('Ilmahyökkäys', ['9', '9', '9', '5', '5', '5', '5', '5', '5', '5+H'], ['jump', 'jH'], { exact: false });
check('Puskuri: painallus hyppyä ennen laskeutumista', ['8'].concat(Array(34).fill('5'), ['5+L']), ['jump', 'jL'], { exact: false });

// Torjunta: Rami lyö, Kaisa pitää taaksepäin
(function () {
  const b = new EK.Battle({ p1: 'kaisa', p2: 'rami', training: true, seed: 3 });
  b.f[0].x = 700; b.f[1].x = 790;
  let blocked = 0, hit = 0;
  for (let i = 0; i < 80; i++) {
    if (i === 38) { b.f[0].x = 700; b.f[1].x = 790; }
    b.step(frame('4'), i === 10 ? { L: 0, M: 1 } : i === 50 ? { d: 1, M: 1 } : i > 44 && i < 60 ? { d: 1 } : EK.BLANK);
    b.events.forEach(e => { if (e.t === 'block') blocked++; if (e.t === 'hit') hit++; });
    b.events.length = 0;
  }
  const ok = blocked === 1 && hit === 1;
  ok ? pass++ : fail++;
  console.log((ok ? 'OK  ' : 'VIRHE ') + 'Seisten torjunta: keski torjuttu, matala osuu'.padEnd(36) + ' torjunnat ' + blocked + ' osumat ' + hit);
})();

console.log('\nTulokset: ' + pass + ' OK, ' + fail + ' virhettä');
process.exit(fail ? 1 : 0);
