// AgriStuntti – ajoneuvofysiikka: jäykkä kappale + säteillä mitattavat pyörät.
// Paikallinen koordinaatisto: x = vasen, y = ylös, z = eteen (massakeskipisteessä).
// Jokainen pyörä ampuu säteen koneen "alas"-suuntaan, joten silmukassa pyörät painavat rataa vasten.
import { GRAV, ROAD_GRIP, CRASH } from './data.js';
import { raycast, pointPush } from './track.js';

// ---------- pienet vektoriapurit ----------
function qToM(q, m) {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  // sarakkeet: m[0..2] = paikallinen x maailmassa, m[3..5] = y, m[6..8] = z
  m[0] = 1 - 2 * (yy + zz); m[1] = 2 * (xy + wz); m[2] = 2 * (xz - wy);
  m[3] = 2 * (xy - wz); m[4] = 1 - 2 * (xx + zz); m[5] = 2 * (yz + wx);
  m[6] = 2 * (xz + wy); m[7] = 2 * (yz - wx); m[8] = 1 - 2 * (xx + yy);
  return m;
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// nelipyöräohjauksen takapyörien osuus nopeuden mukaan (1 = täysi, 0,25 = rauhallinen)
export const rearFade = vf => Math.max(0.25, Math.min(1, 1 - (Math.abs(vf) - 6) / 14));
// ohjausvahvistus: kuinka monta "akselia" kääntää koneen (tekoälylle)
export function steerGain(car) {
  if (car.rearOnly) return 1;
  return car.spec.wheels.some(w => w.steer === -1) ? 1 + rearFade(car.vf) : 1;
}

export function yawQuat(fx, fz) {
  const yaw = Math.atan2(fx, fz);
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

// ---------- luonti ----------
export function createCar(spec, pos, fwd) {
  const m = spec.mass, [len, wid, hgt] = spec.dims;
  const n = spec.wheels.length;
  const rest = spec.susp;
  const cs = rest * 0.32;                        // staattinen painuma
  const k = m * GRAV / n / cs;
  const damp = 2 * 0.45 * Math.sqrt(k * m / n);
  const wheels = spec.wheels.map(w => ({
    x: w.x, z: w.z, r: w.r, drive: !!w.drive, steer: w.steer || 0,
    my: -spec.cg + w.r + (rest - cs),            // kiinnityspiste (paikallinen y)
    len: rest - cs, comp: cs, contact: false, spin: 0, skid: 0, surf: null, load: 0
  }));
  const bottom = -spec.cg + Math.min(...spec.wheels.map(w => w.r)) * 0.55;
  const top = bottom + hgt;
  const pts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    // keulan ja perän alakulmat ylempänä (maavaraonkulma), jotta pitkät koneet eivät raavi silmukassa
    pts.push({ p: [sx * wid / 2, bottom + Math.min(1.0, 0.16 * len), sz * len / 2], top: false });
    pts.push({ p: [sx * wid / 2 * 0.85, top, sz * len / 2 * 0.85], top: true });
  }
  pts.push({ p: [0, bottom, 0], top: false }, { p: [0, top, 0], top: true }, { p: [0, Math.max((bottom + top) / 2, bottom + Math.min(1.0, 0.16 * len)), len / 2], top: false }, { p: [0, Math.max((bottom + top) / 2, bottom + Math.min(1.0, 0.16 * len)), -len / 2], top: false });
  for (const sx of [-1, 1]) pts.push({ p: [sx * wid / 2, bottom, 0], top: false }, { p: [sx * wid / 2, top, 0], top: true });
  const car = {
    spec, m, I: [m / 12 * (hgt * hgt + len * len), m / 12 * (wid * wid + len * len), m / 12 * (wid * wid + hgt * hgt)],
    k, damp, rest, wheels, pts, rearOnly: spec.wheels.some(w => w.steer === -1) && !spec.wheels.some(w => w.steer === 1),
    pos: [pos[0], pos[1] + spec.cg + 0.05, pos[2]], vel: [0, 0, 0], q: yawQuat(fwd[0], fwd[2]), w: [0, 0, 0],
    M: new Array(9), steer: 0, steerAng: 0, speed: 0, vf: 0, contacts: 0, roadContacts: 0, air: 0, flipT: 0,
    crashed: false, crashWhy: '', events: [], throttle: 0, rpm: 0, gear: 1, skid: 0, inWater: false
  };
  qToM(car.q, car.M);
  return car;
}

export function placeCar(car, pos, fwd) {
  car.pos = [pos[0], pos[1] + car.spec.cg + 0.05, pos[2]];
  car.vel = [0, 0, 0]; car.w = [0, 0, 0]; car.q = yawQuat(fwd[0], fwd[2]);
  car.crashed = false; car.crashWhy = ''; car.flipT = 0; car.air = 0; car.steer = 0;
  qToM(car.q, car.M);
}

const toWorld = (M, p) => [M[0] * p[0] + M[3] * p[1] + M[6] * p[2], M[1] * p[0] + M[4] * p[1] + M[7] * p[2], M[2] * p[0] + M[5] * p[1] + M[8] * p[2]];
const toLocal = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];

// kulmakiihtyvyys maailmassa vääntömomentista
function angAcc(car, tq) {
  const l = toLocal(car.M, tq);
  return toWorld(car.M, [l[0] / car.I[0], l[1] / car.I[1], l[2] / car.I[2]]);
}

// impulssi pisteeseen r (suhteessa massakeskipisteeseen)
function impulse(car, r, J) {
  car.vel[0] += J[0] / car.m; car.vel[1] += J[1] / car.m; car.vel[2] += J[2] / car.m;
  const dw = angAcc(car, cross(r, J));
  car.w[0] += dw[0]; car.w[1] += dw[1]; car.w[2] += dw[2];
}
function effMass(car, r, n) {
  const rn = cross(r, n);
  const t = angAcc(car, rn);
  return 1 / car.m + dot(cross(t, r), n);
}

// ---------- askel ----------
// inp: { throttle -1…1, steer -1…1 (vasen +) }
export function stepCar(car, world, inp, dt) {
  if (car.crashed) { inp = { throttle: 0, steer: 0 }; }
  const spec = car.spec, M = qToM(car.q, car.M);
  const ax = [M[0], M[1], M[2]], ay = [M[3], M[4], M[5]], az = [M[6], M[7], M[8]];
  const F = [0, -car.m * GRAV, 0], Tq = [0, 0, 0];
  const vf = dot(car.vel, az);
  car.vf = vf;
  car.speed = Math.hypot(car.vel[0], car.vel[1], car.vel[2]);

  // ohjaus: kulma pienenee nopeuden kasvaessa
  car.steer += (inp.steer - car.steer) * Math.min(1, dt * 7);
  const maxA = spec.tracked ? 0 : spec.steer / (1 + Math.abs(vf) / 16);
  car.steerAng = car.steer * maxA;

  // kaasu / jarru / peruutus (alas-nuoli jarruttaa ja pysähdyksissä peruuttaa)
  let drive = 0, brake = 0;
  const th = inp.throttle;
  if (th > 0) { if (vf < -1) brake = th; else drive = th; }
  else if (th < 0) { if (vf > 1) brake = -th; else drive = th * 0.45; }
  car.throttle = drive;

  // pyörät
  let contacts = 0, road = 0, nDrive = 0;
  const hits = [];
  for (const w of car.wheels) {
    const mount = toWorld(M, [w.x, w.my, w.z]);
    const mx = car.pos[0] + mount[0], my = car.pos[1] + mount[1], mz = car.pos[2] + mount[2];
    const maxd = car.rest + w.r;
    const h = raycast(world, mx, my, mz, -ay[0], -ay[1], -ay[2], maxd + 0.05);
    w.contact = false; w.load = 0;
    if (!h || h.t > maxd) { w.len += (car.rest - w.len) * Math.min(1, dt * 10); hits.push(null); continue; }
    w.contact = true; contacts++;
    if (h.road) road++;
    if (w.drive) nDrive++;
    w.len = Math.max(-0.2, h.t - w.r);
    w.comp = car.rest - w.len;
    w.surf = h;
    hits.push({ w, h, mount, cx: mx - ay[0] * h.t, cy: my - ay[1] * h.t, cz: mz - ay[2] * h.t });
  }
  car.contacts = contacts; car.roadContacts = road;
  let skid = 0;
  for (const c of hits) {
    if (!c) continue;
    const { w, h } = c;
    if (!h.road && h.terrain && h.terrain.water) { crash(car, 'Molskis! Kone upposi.'); continue; }
    const r = [c.cx - car.pos[0], c.cy - car.pos[1], c.cz - car.pos[2]];
    const vc = cross(car.w, r); vc[0] += car.vel[0]; vc[1] += car.vel[1]; vc[2] += car.vel[2];
    const n = [h.nx, h.ny, h.nz];
    // jousi + vaimennus (puristumisnopeus = kiinnityspisteen nopeus alaspäin)
    const vm = cross(car.w, c.mount); vm[0] += car.vel[0]; vm[1] += car.vel[1]; vm[2] += car.vel[2];
    const cdot = -dot(vm, ay);
    let Fs = car.k * w.comp + car.damp * cdot;
    if (w.comp > car.rest * 0.92) Fs += car.k * 25 * (w.comp - car.rest * 0.92); // vasteenpysäytin
    Fs = Math.max(0, Fs);
    w.load = Fs;
    // renkaan suunnat kosketustasossa
    // takapyöräohjaus on suurella nopeudella epävakaa: ohjaus siirtyy vähitellen etupyörille (vain fysiikassa)
    let sf = w.steer;
    if (car.rearOnly) { const fb = Math.max(0, Math.min(0.85, (Math.abs(vf) - 6) / 12)); sf = w.steer === -1 ? -(1 - fb) : (w.z > 0 ? fb : 0); }
    else if (w.steer === -1) sf = -rearFade(vf); // nelipyöräohjaus: takapyörät rauhoittuvat vauhdissa
    const sa = car.steerAng * sf;
    const wf = [az[0] * Math.cos(sa) + ax[0] * Math.sin(sa), az[1] * Math.cos(sa) + ax[1] * Math.sin(sa), az[2] * Math.cos(sa) + ax[2] * Math.sin(sa)];
    const dn = dot(wf, n);
    let tf = [wf[0] - n[0] * dn, wf[1] - n[1] * dn, wf[2] - n[2] * dn];
    const tl = Math.hypot(tf[0], tf[1], tf[2]) || 1; tf = [tf[0] / tl, tf[1] / tl, tf[2] / tl];
    const ts = cross(n, tf);
    const vl = dot(vc, tf), vs = dot(vc, ts);
    const surfGrip = h.road ? ROAD_GRIP : h.terrain.grip;
    const mu = spec.grip * surfGrip;
    const mEff = Fs / GRAV;
    let Fx = 0;
    if (drive && w.drive && nDrive) {
      const q = Math.max(0, Math.abs(vf) / spec.vmax);
      const lim = drive > 0 ? Math.max(0, 1 - q * q * q * q) : Math.max(0, 1 - Math.pow(Math.abs(vf) / (spec.vmax * 0.3), 2));
      Fx += drive * car.m * spec.acc * lim / nDrive * (contacts / car.wheels.length) * 1.0;
    }
    if (brake) Fx -= Math.sign(vl) * Math.min(car.m * 9 * brake / contacts, Math.abs(vl) * mEff / dt * 0.5);
    // vierintävastus (pelto hidastaa)
    const roll = h.road ? 0.015 : h.terrain.roll;
    Fx -= Math.sign(vl) * Math.min(roll * Fs, Math.abs(vl) * mEff / dt * 0.5);
    let Fy = -vs * mEff / dt * 0.5;
    const lim = mu * Fs;
    const tot = Math.hypot(Fx, Fy);
    if (tot > lim) { Fx *= lim / tot; Fy *= lim / tot; w.skid = Math.min(1, Math.abs(vs) / 6); skid = Math.max(skid, Math.abs(vs)); } else w.skid = 0;
    // telat: sivuluisto lasketaan rungon nopeudesta, jottei sivukitka vastusta kääntymistä
    if (spec.tracked) { const vsc = dot(car.vel, ts); Fy = Math.max(-lim, Math.min(lim, -vsc * mEff / dt * 0.6)); }
    const fn = [n[0] * Fs, n[1] * Fs, n[2] * Fs];
    const ft = [tf[0] * Fx + ts[0] * Fy, tf[1] * Fx + ts[1] * Fy, tf[2] * Fx + ts[2] * Fy];
    F[0] += fn[0] + ft[0]; F[1] += fn[1] + ft[1]; F[2] += fn[2] + ft[2];
    const t = cross(r, fn); Tq[0] += t[0]; Tq[1] += t[1]; Tq[2] += t[2];
    // pelillinen vakaus: renkaan kitkavoima vaikuttaa lähempänä painopistettä (vähemmän kaatumista)
    const lift = spec.cg * 0.75;
    const rt = [r[0] + ay[0] * lift, r[1] + ay[1] * lift, r[2] + ay[2] * lift];
    if (spec.tracked) {
      // telat: sivukitka ja vetovoima eivät käännä konetta (kääntyminen tulee telojen nopeuserosta alempana);
      // voiman varsi ilman sivu- ja pituussuuntaista osaa → vain nyökkäys
      const ra = dot(rt, ax), rz = dot(rt, az);
      const rp = [rt[0] - ax[0] * ra, rt[1] - ax[1] * ra, rt[2] - ax[2] * ra];
      const fl = [tf[0] * Fx, tf[1] * Fx, tf[2] * Fx];
      const t3 = cross(rp, fl); Tq[0] += t3[0]; Tq[1] += t3[1]; Tq[2] += t3[2];
      void rz;
    } else {
      const t2 = cross(rt, ft); Tq[0] += t2[0]; Tq[1] += t2[1]; Tq[2] += t2[2];
    }
    w.spin += vl / w.r * dt;
    if (w.comp > car.rest * 0.9 && cdot > 6) car.events.push({ t: 'thump', v: cdot });
  }
  car.skid = skid;
  // ilmanvastus
  const drag = 0.00045 * car.m * car.speed;
  F[0] -= car.vel[0] * drag; F[1] -= car.vel[1] * drag; F[2] -= car.vel[2] * drag;

  // integrointi
  car.vel[0] += F[0] / car.m * dt; car.vel[1] += F[1] / car.m * dt; car.vel[2] += F[2] / car.m * dt;
  const aa = angAcc(car, Tq);
  car.w[0] += aa[0] * dt; car.w[1] += aa[1] * dt; car.w[2] += aa[2] * dt;
  // telat: telojen nopeusero määrää kääntymisnopeuden suoraan, kun telat pitävät (myös paikallaan)
  if (spec.tracked && contacts) {
    const wl = toLocal(M, car.w);
    const target = inp.steer * spec.steer / (1 + Math.abs(vf) / 14) * (vf < -0.5 ? -1 : 1);
    wl[1] += (target - wl[1]) * Math.min(1, dt * 12 * contacts / car.wheels.length);
    const ww = toWorld(M, wl); car.w[0] = ww[0]; car.w[1] = ww[1]; car.w[2] = ww[2];
  }
  const ad = Math.exp(-(contacts ? 0.8 : 0.15) * dt);
  car.w[0] *= ad; car.w[1] *= ad; car.w[2] *= ad;
  car.pos[0] += car.vel[0] * dt; car.pos[1] += car.vel[1] * dt; car.pos[2] += car.vel[2] * dt;
  const [qx, qy, qz, qw] = car.q, [wx, wy, wz] = car.w, h2 = dt / 2;
  car.q = [qx + h2 * (wx * qw + wy * qz - wz * qy), qy + h2 * (wy * qw + wz * qx - wx * qz), qz + h2 * (wz * qw + wx * qy - wy * qx), qw - h2 * (wx * qx + wy * qy + wz * qz)];
  const ql = Math.hypot(...car.q); car.q = car.q.map(v => v / ql);
  qToM(car.q, M);

  // runko vs. maailma
  let bodyHit = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const pt of car.pts) {
      const r = toWorld(M, pt.p);
      const px = car.pos[0] + r[0], py = car.pos[1] + r[1], pz = car.pos[2] + r[2];
      const c = pointPush(world, px, py, pz);
      if (!c) continue;
      bodyHit = true;
      const n = [c.nx, c.ny, c.nz];
      const corr = Math.min(c.d, 0.5) * 0.9;
      car.pos[0] += n[0] * corr; car.pos[1] += n[1] * corr; car.pos[2] += n[2] * corr;
      const vp = cross(car.w, r); vp[0] += car.vel[0]; vp[1] += car.vel[1]; vp[2] += car.vel[2];
      const vn = dot(vp, n);
      if (vn >= 0) continue;
      if (pass === 0) {
        if (c.what === 'vesi') crash(car, 'Molskis! Kone upposi.');
        else if (-vn > CRASH.impact || (pt.top && -vn > CRASH.topImpact)) crash(car, c.what === 'este' ? 'Kolari! Suoraan esteeseen.' : pt.top ? 'Katolleen!' : 'Kolari!');
        if (-vn > 3) car.events.push({ t: 'hit', v: -vn });
      }
      const j = -(1 + 0.15) * vn / effMass(car, r, n);
      impulse(car, r, [n[0] * j, n[1] * j, n[2] * j]);
      // kitka
      const vp2 = cross(car.w, r); vp2[0] += car.vel[0]; vp2[1] += car.vel[1]; vp2[2] += car.vel[2];
      const vn2 = dot(vp2, n);
      const vt = [vp2[0] - n[0] * vn2, vp2[1] - n[1] * vn2, vp2[2] - n[2] * vn2];
      const vtl = Math.hypot(vt[0], vt[1], vt[2]);
      if (vtl > 1e-4) {
        const tdir = [vt[0] / vtl, vt[1] / vtl, vt[2] / vtl];
        const jt = Math.min(vtl / effMass(car, r, tdir), (c.what === 'rata' ? 0.3 : 0.6) * j);
        impulse(car, r, [-tdir[0] * jt, -tdir[1] * jt, -tdir[2] * jt]);
      }
    }
  }
  // katolleen / jumiin
  car.scrape = bodyHit;
  car.air = contacts ? 0 : car.air + dt;
  if (!contacts && car.speed < 2.5 && (bodyHit || M[4] < 0.3)) car.flipT += dt; else if (contacts) car.flipT = 0;
  if (car.flipT > CRASH.flipTime) crash(car, M[4] < 0 ? 'Katolleen!' : 'Jumissa kyljellään.');
  if (contacts && car.air === 0 && car._wasAir > 0.4) car.events.push({ t: 'land', air: car._wasAir });
  car._wasAir = contacts ? 0 : (car._wasAir || 0) + dt;
  // moottorin kierrokset (näennäinen vaihteisto ääntä varten)
  const sp = Math.abs(vf) / spec.vmax;
  const gears = 5, g = Math.min(gears, 1 + Math.floor(sp * gears * 1.05));
  car.gear = vf < -0.5 ? 0 : g;
  car.rpm = 0.25 + 0.75 * Math.min(1, (sp * gears * 1.05 - (g - 1))) * (contacts ? 1 : 0.8) + (contacts ? 0 : 0.25 * Math.abs(drive));
}

function crash(car, why) {
  if (car.crashed) return;
  car.crashed = true; car.crashWhy = why;
  car.events.push({ t: 'crash', why });
}
