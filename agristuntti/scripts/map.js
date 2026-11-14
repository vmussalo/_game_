// Radan ASCII-kartta suunnittelun avuksi: node scripts/map.js [RATA]
// Kirjaimet: L lähtö, F maali, = suora, c mutka, C kaarre, B kallistus, / nousu, ^ hyppyri, O silmukka, k kumpare, + risteys
// Numero palan perässä = korkeustaso (jos > 0). Maasto: . nurmi, , pelto, ~ vesi, : sora. Maisema: *
import { GRID } from '../peli/js/data.js';
import { pieceCells, trace } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';

const CH = { lahto: 'L', maali: 'F', suora: '=', mutka: 'c', kaarre: 'C', kallistus: 'B', nousu: '/', hyppyri: '^', silmukka: 'O', kumpare: 'k', risteys: '+' };
const tracks = BUILTIN();
const list = process.argv[2] != null ? [+process.argv[2]] : tracks.map((_, i) => i);
for (const ti of list) {
  const t = tracks[ti];
  const g = [];
  for (let j = 0; j < GRID; j++) { g.push([]); for (let i = 0; i < GRID; i++) g[j].push(' ' + '.,~:'[t.terrain[j * GRID + i]]); }
  for (const pr of t.props) if (g[pr.j]) g[pr.j][pr.i] = ' *';
  for (const p of t.pieces) for (const [i, j] of pieceCells(p)) {
    if (i < 0 || j < 0 || i >= GRID || j >= GRID) continue;
    g[j][i] = (CH[p.t] || '?') + (p.l ? p.l : ' ');
  }
  const tr = trace(t);
  console.log('\n' + ti + ' ' + t.name + '  loppu: ' + JSON.stringify(t.end) + '  ' + (tr.ok ? 'OK ' + (tr.circuit ? 'kierros' : 'A→B') : 'VIRHE: ' + tr.err + ' ' + JSON.stringify(tr.at)));
  console.log('    ' + Array.from({ length: GRID }, (_, i) => String(i % 10).padStart(2)).join(''));
  g.forEach((row, j) => console.log(String(j).padStart(3) + ' ' + row.join('')));
}
