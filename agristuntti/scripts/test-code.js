// Ratakoodin testi: jokainen valmis rata → koodi → takaisin radaksi, ja reitin pitää säilyä samana.
//   node scripts/test-code.js
import { BUILTIN } from '../peli/js/tracks.js';
import { toCode, fromCode } from '../peli/js/storage.js';
import { trace, samples } from '../peli/js/track.js';
let bad = 0;
for (const t of BUILTIN()) {
  const code = toCode(t);
  const u = fromCode(code);
  const a = trace(t), b = trace(u);
  const la = samples(t, a.seq).pop().d, lb = b.ok ? samples(u, b.seq).pop().d : -1;
  const ok = b.ok && Math.abs(la - lb) < 0.01 && u.props.length === t.props.length && u.terrain.every((v, i) => v === t.terrain[i]);
  if (!ok) bad++;
  console.log((ok ? 'OK   ' : 'VIRHE ') + t.name.padEnd(22), 'koodi', code.length, 'merkkiä', 'pituus', Math.round(la), '→', Math.round(lb));
}
// rikkinäinen koodi ei saa kaataa
for (const c of ['AS1:roskaa', 'hei', 'AS1:' + Buffer.from('{"v":1,"p":[[99,0,0,0,0],[0,-50,3,9,0]],"t":"x"}').toString('base64')]) {
  try { const t = fromCode(c); console.log('OK   rikkinäinen koodi siivottiin:', t.pieces.length, 'palaa'); }
  catch (e) { console.log('OK   rikkinäinen koodi hylättiin:', e.message.slice(0, 60)); }
}
console.log(bad ? bad + ' virhettä' : 'Kaikki OK');
