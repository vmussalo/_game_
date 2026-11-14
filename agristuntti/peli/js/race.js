// AgriStuntti – kisan kulku ilman piirtoa: lähtölaskenta, eteneminen reitillä (tarkistuspisteet),
// kolarit ja paluu radalle, maali sekä uusinnan tallennus. Käytössä sekä pelissä että Node-testeissä.
import { STEP, CRASH } from './data.js';
import { createCar, stepCar, placeCar } from './physics.js';
import { nearestSample } from './track.js';
import { planSpeeds, aiInput } from './ai.js';

export const COUNTDOWN = 3;
const REC_HZ = 30;

// entries: [{ spec, name, color, ai: {skill} | null, player: bool, ghost: replay | null }]
export function createRace(world, entries) {
  const S = world.samples;
  const s0 = S[0];
  const spawn = [s0.x - s0.fx * 7, s0.y, s0.z - s0.fz * 7];
  // lähtöpaikat rinnakkain: pelaaja vasemmalle, vastustaja oikealle (koneet eivät törmää toisiinsa)
  const lx = s0.uy * s0.fz - s0.uz * s0.fy, lz = s0.ux * s0.fy - s0.uy * s0.fx;
  const live = entries.filter(e => !e.ghost).length;
  let slot = 0;
  const race = { world, t: -COUNTDOWN, racers: [], done: false, events: [] };
  for (const e of entries) {
    if (e.ghost) { race.racers.push({ e, ghost: e.ghost, name: e.name, color: e.color, finished: false }); continue; }
    const off = live > 1 ? (slot++ === 0 ? 2.6 : -2.6) : 0;
    const car = createCar(e.spec, [spawn[0] + lx * off, spawn[1], spawn[2] + lz * off], [s0.fx, s0.fy, s0.fz]);
    const r = {
      e, car, name: e.name, color: e.color, player: !!e.player, ai: e.ai ? { k: 0, plan: planSpeeds(world, e.spec, e.ai.skill), skill: e.ai.skill, lostT: 0 } : null,
      k: 0, seg: 0, finished: false, time: 0, crashT: 0, crashes: 0, resets: 0, stuckT: 0,
      rec: { hz: REC_HZ, vi: e.vi, frames: [] }, recAcc: 0, inp: { throttle: 0, steer: 0 }
    };
    race.racers.push(r);
  }
  return race;
}

// paluu radalle: nykyisen osan alkuun, hyppyreille ja silmukoille vauhdinottomatkan päähän
export function respawn(race, r) {
  const S = race.world.samples;
  let k = 0;
  while (k < S.length - 1 && S[k].seg < r.seg) k++;
  const kind = S[k].kind;
  const runup = (kind === 'hyppyri' && S.slice(k, k + 14).some(s => s.air)) || kind === 'silmukka' ? 95 : 0;
  if (runup) { const d0 = S[k].d - runup; while (k > 0 && S[k].d > d0) k--; }
  k = Math.max(0, k);
  const s = S[k];
  placeCar(r.car, [s.x + s.ux * 0.3, s.y + s.uy * 0.3, s.z + s.uz * 0.3], [s.fx, s.fy, s.fz]);
  r.k = k; r.seg = Math.min(r.seg, s.seg);
  if (r.ai) { r.ai.k = k; r.ai.lostT = 0; }
  r.crashT = 0; r.stuckT = 0; r.resets++;
  race.events.push({ t: 'respawn', r });
}

export function stepRace(race, dt) {
  dt = dt || STEP;
  race.t += dt;
  const S = race.world.samples, n = S.length;
  for (const r of race.racers) {
    if (r.ghost) continue;
    const car = r.car;
    if (race.t < 0) {
      // lähtölaskenta: kone pysyy paikallaan, mutta jouset asettuvat
      const inp = { throttle: 0, steer: 0 };
      stepCar(car, race.world, inp, dt);
      car.vel[0] = 0; car.vel[2] = 0;
      record(r, dt);
      continue;
    }
    if (r.finished) {
      stepCar(car, race.world, { throttle: 0, steer: r.inp.steer * 0.3 }, dt);
      record(r, dt);
      continue;
    }
    let inp = r.inp;
    if (r.ai) { r.ai.k = r.k; inp = aiInput(car, race.world, r.ai); r.inp = inp; }
    stepCar(car, race.world, inp, dt);
    for (const ev of car.events) race.events.push(Object.assign({ r }, ev));
    car.events.length = 0;
    // eteneminen: lähin näyte ikkunan sisällä; yli kahden osan oikaisuja ei hyväksytä
    const k2 = nearestSample(race.world, car.pos[0], car.pos[1], car.pos[2], r.k + 20, 45);
    if (k2 >= 0 && S[k2].seg <= r.seg + 2 && k2 >= r.k - 25) {
      if (S[k2].seg > r.seg) race.events.push({ t: 'cp', r, seg: S[k2].seg });
      r.k = k2; r.seg = Math.max(r.seg, S[k2].seg);
    }
    // maali
    if (r.k >= n - 3) {
      const L = S[n - 1];
      if ((car.pos[0] - L.x) * L.fx + (car.pos[1] - L.y) * L.fy + (car.pos[2] - L.z) * L.fz >= 0 && !car.crashed) {
        r.finished = true; r.time = race.t;
        race.events.push({ t: 'finish', r });
      }
    }
    // kolari → hetken päästä takaisin radalle
    if (car.crashed) {
      if (r.crashT === 0) r.crashes++;
      r.crashT += dt;
      if (r.crashT > CRASH.respawnDelay) respawn(race, r);
    }
    // tekoäly: eksynyt tai jumissa
    if (r.ai && !car.crashed) {
      const s = S[r.k];
      const off = Math.hypot(car.pos[0] - s.x, car.pos[2] - s.z), offY = Math.abs(car.pos[1] - s.y);
      r.ai.lostT = (off > s.w / 2 + 9 || offY > 7) && car.contacts ? r.ai.lostT + dt : 0;
      r.stuckT = car.speed < 1 ? r.stuckT + dt : 0;
      if (r.ai.lostT > 2.5 || r.stuckT > 3) respawn(race, r);
    }
    record(r, dt);
  }
  const live = race.racers.filter(r => !r.ghost);
  if (live.every(r => r.finished || !r.player) && live.some(r => r.player) && live.filter(r => r.player).every(r => r.finished)) race.done = true;
  if (race.t > 600) race.done = true;
}

function record(r, dt) {
  r.recAcc += dt;
  if (r.recAcc < 1 / REC_HZ - 1e-6) return;
  r.recAcc -= 1 / REC_HZ;
  const c = r.car;
  r.rec.frames.push([c.pos[0], c.pos[1], c.pos[2], c.q[0], c.q[1], c.q[2], c.q[3], c.steer, c.vf, c.crashed ? 1 : 0]);
}

// uusinnan tila hetkellä t (lineaarinen interpolointi)
export function replayAt(rec, t) {
  const f = rec.frames;
  if (!f.length) return null;
  const x = (t + COUNTDOWN) * rec.hz;
  const i = Math.max(0, Math.min(f.length - 2, Math.floor(x)));
  const a = f[i], b = f[Math.min(f.length - 1, i + 1)], u = Math.max(0, Math.min(1, x - i));
  const q = [0, 1, 2, 3].map(j => a[3 + j] + (b[3 + j] - a[3 + j]) * u);
  if (a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0) for (let j = 0; j < 4; j++) q[j] = a[3 + j];
  const ql = Math.hypot(...q) || 1;
  return { pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], q: q.map(v => v / ql), steer: a[7], vf: a[8], crashed: a[9] > 0, end: x >= f.length - 1 };
}
export const replayLength = rec => rec.frames.length / rec.hz - COUNTDOWN;
