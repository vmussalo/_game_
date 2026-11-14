// Fysiikan perustesti: jokainen kone kiihdyttää tasaisella ja ohjaa vasemmalle. Kääntymissuunnan pitää olla vasen.
//   node scripts/test-steer.js
import { VEHICLES, STEP } from '../peli/js/data.js';
import { buildWorld, emptyTrack } from '../peli/js/track.js';
import { createCar, stepCar } from '../peli/js/physics.js';
const w = buildWorld(emptyTrack('tasainen'));
let bad = 0;
for (const spec of VEHICLES) {
  const out = [];
  for (const v0 of [5, 15, 25]) {
    const car = createCar(spec, [300, 0, 300], [0, 0, 1]);
    for (let i = 0; i < 240; i++) stepCar(car, w, { throttle: 1, steer: 0 }, STEP);
    car.vel = [0, 0, v0];
    let yaw0 = Math.atan2(car.M[6], car.M[8]);
    for (let i = 0; i < 120; i++) stepCar(car, w, { throttle: car.vf < v0 ? 1 : 0, steer: 1 }, STEP);
    const dyaw = Math.atan2(car.M[6], car.M[8]) - yaw0;
    // vasen = +x (koska paikallinen x = vasen ja aloitussuunta +z) → yaw kasvaa
    out.push(v0 + ' m/s: ' + (dyaw > 0 ? 'vasen ' : 'OIKEA ') + dyaw.toFixed(2) + ' rad, x ' + (car.pos[0] - 300).toFixed(1));
    if (dyaw <= 0) bad++;
  }
  console.log(spec.id.padEnd(14), out.join(' | '));
}
console.log(bad ? bad + ' väärään suuntaan' : 'Kaikki kääntyvät oikein');
