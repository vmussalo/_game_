// Radan suunnitteluapu: node scripts/design.js I J SUUNTA "OHJELMA"
// Tulostaa mihin kilpikonna päätyy ja sulkeutuuko kierros (loppu = lähtöruutu, suunta sama, taso 0).
import { turtle } from '../peli/js/tracks.js';
import { emptyTrack, trace } from '../peli/js/track.js';

const [i, j, d] = process.argv.slice(2, 5).map(Number);
const prog = process.argv[5];
const tt = turtle(i, j, d, prog);
const t = emptyTrack('x'); t.pieces = tt.pieces;
const tr = trace(t);
const xs = tt.pieces.flatMap(p => [p.i, p.i + 1]), ys = tt.pieces.flatMap(p => [p.j, p.j + 1]);
console.log('loppu', JSON.stringify(tt.end), 'sulkeutuu:', tt.end.i === i && tt.end.j === j && tt.end.d === d && tt.end.lvl === 0,
  '| alue x', Math.min(...xs), '…', Math.max(...xs), 'y', Math.min(...ys), '…', Math.max(...ys), '|', tr.ok ? 'OK' : tr.err + ' ' + JSON.stringify(tr.at));
