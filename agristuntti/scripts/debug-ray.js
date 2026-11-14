// Vianetsintä: säde alaspäin annetusta pisteestä: node scripts/debug-ray.js RATA X Y Z
import { buildWorld, raycast, pointPush } from '../peli/js/track.js';
import { BUILTIN } from '../peli/js/tracks.js';
const [ti, x, y, z] = process.argv.slice(2).map(Number);
const w = buildWorld(BUILTIN()[ti]);
for (let yy = y; yy > y - 2; yy -= 0.25) console.log('y', yy.toFixed(2), 'ray', JSON.stringify(raycast(w, x, yy, z, 0, -1, 0, 3)), 'push', JSON.stringify(pointPush(w, x, yy, z)));
