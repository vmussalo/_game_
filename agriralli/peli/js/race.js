/* AgriRalli – kisan simulaatio: fysiikka, törmäykset, aseet, poimittavat, kierrokset ja tekoälykuskit.
   Ei piirrä mitään. Tapahtumat (räjähdykset, osumat …) kerätään listaan race.fx piirtoa ja ääntä varten. */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const TR = AR.Track;

  const DT_MAX = 1 / 30;
  const PICK_TYPES = ['cash', 'cash', 'cash', 'repair', 'repair', 'ammo', 'ammo', 'turbo'];

  function makeCar(e, idx) {
    const st = AR.buildStats(e.vi, e.up, e.body);
    const hp = Math.max(1, Math.round(st.hp * (e.hpFrac == null ? 1 : e.hpFrac)));
    return {
      idx, name: e.name, color: e.color, vi: e.vi, up: e.up, st, isPlayer: !!e.isPlayer, pid: e.pid | 0, driverId: e.driverId, banner: null,
      driverVisual: e.driverVisual, beach: !!e.beach,
      x: 0, y: 0, a: 0, vx: 0, vy: 0, spin: 0, si: 0, off: 0, lap: -1, prog: 0,
      hp, ammo: e.ammo | 0, mines: e.mines | 0, turbo: +e.turbo || 0, turboOn: false,
      finished: false, finishT: 0, wrecked: false, wreckT: 0, kills: 0, cash: 0, place: 0,
      fireCd: 0, mineCd: 0, specCd: 0, swingT: 0, swingDir: 1, swingHit: false, slew: 0, bend: 0, steerV: 0,
      firingT: 0, hitT: 0, slipT: 0, skid: false, roll: 0, lastBy: null, lastByT: -99, seed: (idx + 1) * 977 + e.vi,
      ai: { skill: e.skill == null ? 0.6 : e.skill, aggr: e.aggr == null ? 0.5 : e.aggr, lane: U.rand(-0.4, 0.4), laneT: 0, stuckT: 0, revT: 0, turboT: 0, burstT: 0, restT: 0, hate: !!e.hate },
      inp: { throttle: 0, steer: 0, fire: false, mine: false, turbo: false, special: false }
    };
  }

  // cfg: { track, laps, diff, theme, entrants:[{name,color,vi,up,hpFrac,ammo,mines,turbo,isPlayer,pid,skill,aggr,hate,driverId}], auto, hooki }
  // hooki = "täysi hööki": kaasu aina pohjassa kaikilla, turbo latautuu itsestään
  function create(cfg) {
    const tr = TR.build(cfg.track);
    const race = {
      cfg, tr, laps: cfg.laps, diff: cfg.diff | 0, t: 0, state: 'count', cd: 3.2, endT: Infinity,
      cars: [], bullets: [], mines: [], fx: [], msgs: [], banner: null, finCount: 0, order: [],
      player: null, players: [], auto: !!cfg.auto, hooki: !!cfg.hooki, dmg: {}, leaderIdx: -1, lastLapShown: false, results: null
    };
    const n = cfg.entrants.length;
    cfg.entrants.forEach((e, i) => {
      const c = makeCar(e, i);
      // lähtöruudukko lähtöviivan taakse kahteen riviin
      const row = Math.floor(i / 2), col = i % 2;
      const p = TR.at(tr, tr.L - 70 - row * 62 - col * 22, (col ? 1 : -1) * tr.W * 0.22);
      c.x = p.x; c.y = p.y; c.a = p.a; c.si = p.k;
      c.prog = c.si * tr.step - tr.L;
      race.cars.push(c);
      if (c.isPlayer) race.players.push(c);
    });
    race.players.sort((a, b) => a.pid - b.pid);
    race.player = race.players[0] || null;
    race.pick = tr.slots.map(s => ({ x: s.x, y: s.y, type: U.pick(PICK_TYPES), on: true, t: 0 }));
    race.n = n;
    return race;
  }

  // big = iso teksti; car = näytetään vain sen pelaajan ruudussa (kaksinpeli)
  function say(race, text, big, car) {
    if (text) {
      race.msgs.push({ text, t: race.t });
      if (race.msgs.length > 4) race.msgs.shift();
    }
    if (big) { if (car) car.banner = { text: big, t: race.t }; else race.banner = { text: big, t: race.t }; }
  }
  // kisa loppuu, kun kaikki ihmispelaajat ovat maalissa tai romuna
  function humansDone(race, delay) {
    if (race.players.every(p => p.finished || p.wrecked)) race.endT = Math.min(race.endT, race.t + delay);
  }
  function line(race, key, a, b) {
    const T = AR.T.comment[key];
    if (!T) return;
    say(race, U.fill(U.pick(T), { a: a && a.name, b: b && b.name }));
  }

  function hurt(race, car, amt, by, kind) {
    if (car.wrecked || amt <= 0 || race.state === 'count') return;
    if (car.st && car.st.dmgResist) amt = Math.max(1, amt * (1 - car.st.dmgResist));
    race.dmg[kind || 'muu'] = (race.dmg[kind || 'muu'] || 0) + Math.min(amt, car.hp);
    car.hp -= amt;
    car.hitT = 0.15;
    if (by && by !== car) { car.lastBy = by; car.lastByT = race.t; }
    if (car.hp <= 0) wreck(race, car, by && by !== car ? by : (race.t - car.lastByT < 4 ? car.lastBy : null));
  }

  function wreck(race, car, killer) {
    car.hp = 0; car.wrecked = true; car.wreckT = race.t; car.turboOn = false;
    race.fx.push({ t: 'boom', x: car.x, y: car.y, big: true });
    if (killer && !killer.wrecked) {
      killer.kills++;
      line(race, 'kill', car, killer);
    } else line(race, 'wreck', car);
    if (car.isPlayer) {
      say(race, race.players.length > 1 ? '' : U.pick(AR.T.comment.playerWreck), AR.T.ui.wrecked, car);
      humansDone(race, 3.5);
    }
  }

  // ---------- tekoäly ----------
  function aiInput(race, car, dt) {
    const tr = race.tr, ai = car.ai, st = car.st, inp = car.inp;
    const fx = Math.cos(car.a), fy = Math.sin(car.a);
    const vf = car.vx * fx + car.vy * fy;
    const speed = Math.abs(vf);
    ai.laneT -= dt;
    if (ai.laneT <= 0) { ai.lane = U.rand(-0.5, 0.5); ai.laneT = U.rand(1.5, 4); }

    let avoid = 0, aim = false, mine = false, special = false, ram = null;
    const calm = race.state === 'run' && race.t - 3.2 > 5; // ei miinoja eikä tulitusta heti lähdössä
    for (const o of race.cars) {
      if (o === car) continue;
      const rx = o.x - car.x, ry = o.y - car.y;
      const ah = rx * fx + ry * fy, lat = -rx * fy + ry * fx;
      const d = Math.hypot(rx, ry);
      if (o.wrecked) {
        if (ah > 0 && ah < 140 && Math.abs(lat) < 40) avoid += lat > 0 ? -0.7 : 0.7;
        continue;
      }
      const target = ai.hate ? o.isPlayer : true;
      if (target && d < 440 && ah > 0) {
        const ang = Math.abs(U.angDiff(car.a, Math.atan2(ry, rx)));
        if (ang < 0.09 + (1 - ai.skill) * 0.08) aim = true;
        if (ah < 230 && Math.abs(lat) < 70 && ai.aggr > 0.55) ram = lat;
      }
      if (ah > 0 && ah < 80 && Math.abs(lat) < 28 && ram == null) avoid += lat > 0 ? -0.45 : 0.45;
      if (calm && ah < -20 && ah > -190 && Math.abs(lat) < 40 && car.mines > 0 && Math.random() < dt * 0.35 * ai.aggr) mine = true;
      if (st.kauha && d < st.len / 2 + 60 && ah > -5 && Math.abs(lat) < 55) special = true;
    }
    // tulitus sarjoina, ei jatkuvana
    ai.burstT -= dt; ai.restT -= dt;
    if (aim && ai.burstT <= 0 && ai.restT <= 0 && race.t - 3.2 > 2 && Math.random() < dt * (0.4 + 1.8 * ai.aggr)) {
      ai.burstT = U.rand(0.3, 0.9); ai.restT = ai.burstT + U.rand(1.0, 2.6) * (1.5 - ai.aggr);
    }
    const fire = aim && ai.burstT > 0;
    let lane = ai.lane + avoid;
    if (ram != null) lane += U.clamp(lat2lane(ram, tr), -0.5, 0.5);
    lane = U.clamp(lane, -0.75, 0.75);

    const look = 45 + speed * 0.42;
    const k = (car.si + Math.round(look / tr.step)) % tr.N;
    const tx = tr.px[k] + tr.nx[k] * lane * tr.W * 0.5, ty = tr.py[k] + tr.ny[k] * lane * tr.W * 0.5;
    const diff = U.angDiff(car.a, Math.atan2(ty - car.y, tx - car.x));
    let steer = U.clamp(diff * 2.8, -1, 1);

    // nopeus kaarteeseen: suurin kaarevuus edessä
    let maxC = 0;
    const span = Math.round((50 + speed * 0.95) / tr.step);
    for (let j = 2; j <= span; j += 2) { const c = Math.abs(tr.curv[(car.si + j) % tr.N]); if (c > maxC) maxC = c; }
    const turnEff = st.turn * (1 - 0.28 * Math.min(1, speed / st.spd));
    const safe = maxC > 1e-4 ? (1 / maxC) * turnEff * (0.8 + 0.3 * ai.skill) + 40 : 1e9;
    const top = st.spd * (0.78 + 0.22 * ai.skill) * (ai.boost || 1) * (car.turboOn ? 1.3 : 1);
    let throttle = 1;
    if (vf > safe * 1.18) throttle = -1;
    else if (vf > safe) throttle = 0;
    else if (vf > top) throttle = 0;
    if (Math.abs(diff) > 1.3 && speed > 140) throttle = -0.6;

    // jumissa → peruutus
    if (race.state === 'run') {
      if (ai.revT > 0) {
        ai.revT -= dt; throttle = -1; steer = -steer || 1;
      } else if (Math.abs(vf) < 22) {
        ai.stuckT += dt;
        if (ai.stuckT > 1.0) { ai.revT = U.rand(0.7, 1.1); ai.stuckT = 0; }
      } else ai.stuckT = 0;
    }
    // turbo suoralla
    ai.turboT -= dt;
    if (car.turbo > 0 && maxC < 0.0025 && vf > st.spd * 0.65 && ai.turboT <= 0 && Math.random() < dt * 0.7 * ai.skill) ai.turboT = U.rand(0.6, 1.4);

    inp.throttle = throttle; inp.steer = steer; inp.fire = fire; inp.mine = mine; inp.special = special;
    inp.turbo = ai.turboT > 0;
  }
  function lat2lane(lat, tr) { return lat / (tr.W * 0.5); }

  // ---------- fysiikka ----------
  function physics(race, car, dt) {
    const tr = race.tr, st = car.st;
    const inp = car.wrecked || race.state === 'count' ? { throttle: 0, steer: 0 } : car.inp;
    const k = car.si;
    const offroad = Math.abs(car.off) > tr.W / 2 + 4;
    for (const h of tr.hazards) {
      if ((car.x - h.x) ** 2 + (car.y - h.y) ** 2 < (h.r + 6) ** 2) {
        if (car.slipT <= 0 && car.isPlayer) race.fx.push({ t: 'slip', x: car.x, y: car.y });
        car.slipT = 0.6;
      }
    }
    car.slipT -= dt;
    const slip = car.slipT > 0 ? 0.25 : 1;

    car.turboOn = !car.wrecked && race.state === 'run' && inp.turbo && car.turbo > 0;
    if (car.turboOn) car.turbo = Math.max(0, car.turbo - dt);
    else if (race.hooki && !car.wrecked && race.state === 'run') car.turbo = Math.min(10, car.turbo + AR.HOOKI.regen * dt);
    const max = st.spd * (car.turboOn ? 1.3 : 1) * (offroad ? st.off : 1);
    const acc = st.acc * (car.turboOn ? 1.8 : 1) * (offroad ? 0.8 : 1);

    const fx = Math.cos(car.a), fy = Math.sin(car.a), rx = -fy, ry = fx;
    let vf = car.vx * fx + car.vy * fy, vr = car.vx * rx + car.vy * ry;
    let th = inp.throttle;
    // täysi hööki: kaasu aina pohjassa; jarru peruuttaa vain lähes pysähtyneenä (jumista pois)
    if (race.hooki && !car.wrecked) th = th < 0 && vf < 60 ? -1 : 1;
    if (race.state === 'count') { vf = 0; vr = 0; }
    else if (th > 0) {
      if (vf < -5) vf += st.brake * th * dt;
      else { const q = Math.max(0, vf) / max; vf += acc * th * Math.max(0, 1 - q * q) * dt; }
    } else if (th < 0) {
      if (vf > 5) vf += st.brake * th * dt;
      else vf = Math.max(-max * 0.4, vf + acc * 0.6 * th * dt);
    } else {
      vf -= Math.sign(vf) * Math.min(Math.abs(vf), (car.wrecked ? 260 : 90) * dt);
    }
    if (vf > max) vf -= (vf - max) * 2.5 * dt;
    let g = st.grip * slip * (car.wrecked ? 1.5 : 1);
    if (Math.abs(vr) > 110) g *= 0.65;
    vr *= Math.exp(-g * dt);
    car.skid = !car.wrecked && Math.abs(vr) > 70 && !offroad;

    const sp = Math.abs(vf);
    let sf = st.tracked ? Math.max(0.8, Math.min(1, sp / 90)) : Math.min(1, sp / 90);
    sf *= 1 - 0.28 * Math.min(1, sp / st.spd);
    const dir = vf < -5 ? -1 : 1;
    car.steerV += (inp.steer - car.steerV) * Math.min(1, dt * 12);
    car.a += (st.turn * car.steerV * sf * dir + car.spin) * dt;
    car.spin *= Math.exp(-3 * dt);
    car.vx = fx * vf + rx * vr;
    car.vy = fy * vf + ry * vr;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.roll += vf * dt * 0.5;
    if (st.articulated) car.bend += (car.steerV * 0.55 * Math.min(1, sp / 60 + 0.3) - car.bend) * Math.min(1, dt * 6);
    if (offroad && sp > 120 && Math.random() < dt * 20) race.fx.push({ t: 'dust', x: car.x - fx * st.len * 0.4, y: car.y - fy * st.len * 0.4 });

    // seinä
    const ok = car.si;
    car.si = TR.nearest(tr, car.x, car.y, car.si);
    const kk = car.si;
    car.off = (car.x - tr.px[kk]) * tr.nx[kk] + (car.y - tr.py[kk]) * tr.ny[kk];
    const lim = tr.lim - st.wid * 0.45;
    if (Math.abs(car.off) > lim) {
      const s = Math.sign(car.off), nX = tr.nx[kk] * s, nY = tr.ny[kk] * s;
      const pen = Math.abs(car.off) - lim;
      car.x -= nX * pen; car.y -= nY * pen; car.off = s * lim;
      const vn = car.vx * nX + car.vy * nY;
      if (vn > 0) {
        car.vx -= nX * vn * 1.35; car.vy -= nY * vn * 1.35;
        car.vx *= 0.96; car.vy *= 0.96;
        if (vn > 150) {
          hurt(race, car, (vn - 150) * 0.05 * (race.hooki ? AR.HOOKI.wallDmg : 1), null, 'seinä');
          race.fx.push({ t: 'crash', x: car.x + nX * st.wid * 0.5, y: car.y + nY * st.wid * 0.5, v: vn, player: car.isPlayer });
        }
      }
    }
    // kierrokset
    if (ok > tr.N * 0.75 && kk < tr.N * 0.25) lapCross(race, car, 1);
    else if (ok < tr.N * 0.25 && kk > tr.N * 0.75) lapCross(race, car, -1);
    car.prog = car.lap * tr.L + kk * tr.step;
    void k;
  }

  function lapCross(race, car, d) {
    car.lap += d;
    if (d < 0 || car.finished || car.wrecked) return;
    if (car.lap >= race.laps) {
      car.finished = true; car.finishT = race.t; car.place = ++race.finCount;
      if (car.isPlayer) {
        humansDone(race, 5);
        const solo = race.players.length < 2;
        say(race, car.place === 1 ? (solo ? U.pick(AR.T.comment.win) : U.fill(AR.T.ui.wins, { a: car.name })) : (solo ? AR.T.ui.finished : ''), AR.T.ui.finished, car);
        race.fx.push({ t: 'finish', x: car.x, y: car.y });
      }
    } else if (car.isPlayer) {
      if (car.lap === race.laps - 1 && race.laps > 1) say(race, race.players.length < 2 ? AR.T.ui.lastLap : '', AR.T.ui.lastLap, car);
      race.fx.push({ t: 'lap', x: car.x, y: car.y });
    }
  }

  // ---------- törmäykset koneiden välillä ----------
  function circles(c) {
    const fx = Math.cos(c.a), fy = Math.sin(c.a);
    const r = Math.max(c.st.wid * 0.5, c.st.len * 0.27), o = c.st.len * 0.25;
    return [[c.x + fx * o, c.y + fy * o, r, 1], [c.x - fx * o, c.y - fy * o, r, 0]];
  }

  function collide(race, A, B) {
    const ca = circles(A), cb = circles(B);
    let best = null;
    for (const p of ca) for (const q of cb) {
      const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), ov = p[2] + q[2] - d;
      if (ov > 0 && (!best || ov > best.ov)) best = { ov, d: d || 0.01, dx, dy, p, q };
    }
    if (!best) return;
    const nx = best.dx / best.d, ny = best.dy / best.d;
    const mA = A.st.mass * (A.wrecked ? 2.5 : 1), mB = B.st.mass * (B.wrecked ? 2.5 : 1);
    const iA = 1 / mA, iB = 1 / mB, iS = iA + iB;
    A.x -= nx * best.ov * (iA / iS); A.y -= ny * best.ov * (iA / iS);
    B.x += nx * best.ov * (iB / iS); B.y += ny * best.ov * (iB / iS);
    const vrel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (vrel >= 0) return;
    const j = -(1.35) * vrel / iS;
    A.vx -= nx * j * iA; A.vy -= ny * j * iA;
    B.vx += nx * j * iB; B.vy += ny * j * iB;
    // pyörähdys osumakohdan mukaan
    const cx = (best.p[0] + best.q[0]) / 2, cy = (best.p[1] + best.q[1]) / 2;
    const crA = (cx - A.x) * ny - (cy - A.y) * nx, crB = (cx - B.x) * ny - (cy - B.y) * nx;
    A.spin += crA * j * iA * 0.0009; B.spin -= crB * j * iB * 0.0009;
    const closing = -vrel;
    if (closing > 50 && race.state === 'run') {
      const base = (closing - 50) * 0.055;
      const fA = Math.cos(A.a) * nx + Math.sin(A.a) * ny;       // A:n keula kohti B:tä?
      const fB = -(Math.cos(B.a) * nx + Math.sin(B.a) * ny);
      const outA = fA > 0.6 ? A.st.ram : Math.abs(fA) < 0.5 ? A.st.side : 1;
      const outB = fB > 0.6 ? B.st.ram : Math.abs(fB) < 0.5 ? B.st.side : 1;
      const inA = fA > 0.6 ? 0.6 : 1, inB = fB > 0.6 ? 0.6 : 1;
      if (!B.wrecked) hurt(race, B, base * (2 * mA / (mA + mB)) * outA * inB, A.wrecked ? null : A, 'rammaus');
      if (!A.wrecked) hurt(race, A, base * (2 * mB / (mA + mB)) * outB * inA, B.wrecked ? null : B, 'rammaus');
      if (closing > 80) race.fx.push({ t: 'crash', x: cx, y: cy, v: closing, player: A.isPlayer || B.isPlayer });
    }
  }

  // ---------- aseet ----------
  function weapons(race, car, dt) {
    const st = car.st, inp = car.inp;
    car.fireCd -= dt; car.mineCd -= dt; car.specCd -= dt; car.firingT -= dt;
    if (car.wrecked || race.state !== 'run') { car.swingT = 0; car.slew *= 0.9; return; }
    const fx = Math.cos(car.a), fy = Math.sin(car.a);
    if (inp.fire && st.gun && car.ammo > 0 && car.fireCd <= 0) {
      const g = st.gun;
      car.fireCd = 1 / g.rate; car.ammo--; car.firingT = 0.06;
      const vf = car.vx * fx + car.vy * fy;
      for (let i = 0; i < g.n; i++) {
        const a = car.a + U.rand(-g.spread, g.spread);
        const sp = g.spd + Math.max(0, vf) * (0.9 + Math.random() * 0.2);
        race.bullets.push({ x: car.x + fx * (st.len / 2 + 6), y: car.y + fy * (st.len / 2 + 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, dmg: g.dmg, owner: car, col: g.col, r: g.r });
      }
      race.fx.push({ t: 'shot', x: car.x, y: car.y, lv: st.gunLv, player: car.isPlayer });
    }
    if (inp.mine && car.mines > 0 && car.mineCd <= 0) {
      car.mines--; car.mineCd = 0.6;
      race.mines.push({ x: car.x - fx * (st.len / 2 + 12), y: car.y - fy * (st.len / 2 + 12), owner: car, arm: 0.8, t: 0 });
      race.fx.push({ t: 'drop', x: car.x, y: car.y, player: car.isPlayer });
    }
    // kaivinkoneen kauha
    if (st.kauha) {
      if (inp.special && car.specCd <= 0 && car.swingT <= 0) {
        car.swingT = 0.55; car.swingHit = false; car.specCd = 1.7;
        let side = 1, bd = 1e9;
        for (const o of race.cars) {
          if (o === car || o.wrecked) continue;
          const d = Math.hypot(o.x - car.x, o.y - car.y);
          if (d < bd) { bd = d; side = (-(o.x - car.x) * fy + (o.y - car.y) * fx) >= 0 ? 1 : -1; }
        }
        car.swingDir = side;
        race.fx.push({ t: 'swing', x: car.x, y: car.y, player: car.isPlayer });
      }
      if (car.swingT > 0) {
        car.swingT -= dt;
        const p = 1 - Math.max(0, car.swingT) / 0.55;
        car.slew = Math.sin(p * Math.PI) * 0.9 * car.swingDir;
        if (!car.swingHit && p > 0.45) {
          car.swingHit = true;
          const ba = car.a + car.slew;
          const bx = car.x + Math.cos(ba) * (st.len * 0.55 + 14), by = car.y + Math.sin(ba) * (st.len * 0.55 + 14);
          for (const o of race.cars) {
            if (o === car || o.wrecked) continue;
            const d = Math.hypot(o.x - bx, o.y - by);
            if (d < 34 + o.st.wid * 0.5) {
              hurt(race, o, 24 + st.gunLv * 4, car, 'kauha');
              const rx = -Math.sin(car.a) * car.swingDir, ry = Math.cos(car.a) * car.swingDir;
              const push = 300 / Math.sqrt(o.st.mass);
              o.vx += rx * push; o.vy += ry * push; o.spin += car.swingDir * 7;
              race.fx.push({ t: 'kauha', x: o.x, y: o.y, player: o.isPlayer || car.isPlayer });
              line(race, 'kauha', o, car);
            }
          }
        }
      } else car.slew *= 0.85;
    }
  }

  function bullets(race, dt) {
    const B = race.bullets;
    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = false;
      for (const c of race.cars) {
        if (c === b.owner) continue;
        const rx = b.x - c.x, ry = b.y - c.y;
        if (rx * rx + ry * ry > 2500) continue;
        const fx = Math.cos(c.a), fy = Math.sin(c.a);
        const lx = rx * fx + ry * fy, ly = -rx * fy + ry * fx;
        if (Math.abs(lx) < c.st.len / 2 + 2 && Math.abs(ly) < c.st.wid / 2 + 2) {
          if (!c.wrecked) {
            hurt(race, c, b.dmg, b.owner, 'ase');
            c.vx += b.vx * 0.0025 * b.dmg / c.st.mass; c.vy += b.vy * 0.0025 * b.dmg / c.st.mass;
          }
          race.fx.push({ t: 'hit', x: b.x, y: b.y, player: c.isPlayer || b.owner.isPlayer, col: b.col });
          hit = true; break;
        }
      }
      if (hit || b.life <= 0) B.splice(i, 1);
    }
  }

  function mines(race, dt) {
    const M = race.mines;
    for (let i = M.length - 1; i >= 0; i--) {
      const m = M[i];
      m.arm -= dt; m.t += dt;
      let boom = m.t > 90;
      if (!boom) {
        for (const c of race.cars) {
          if (c.wrecked || (c === m.owner && m.arm > 0)) continue;
          if ((c.x - m.x) ** 2 + (c.y - m.y) ** 2 < (c.st.wid * 0.5 + 10) ** 2) {
            hurt(race, c, 15, c === m.owner ? null : m.owner, 'miina');
            const a = Math.random() * U.TAU, push = 200 / Math.sqrt(c.st.mass);
            c.vx += Math.cos(a) * push; c.vy += Math.sin(a) * push; c.spin += (Math.random() < 0.5 ? -1 : 1) * 6;
            if (c.isPlayer || m.owner.isPlayer) line(race, 'mine', c);
            boom = true; break;
          }
        }
      }
      if (boom) { race.fx.push({ t: 'mineboom', x: m.x, y: m.y }); M.splice(i, 1); }
    }
  }

  function pickups(race, dt) {
    const d = AR.DIFF[race.diff] || AR.DIFF[0];
    for (const p of race.pick) {
      if (!p.on) { p.t -= dt; if (p.t <= 0) { p.on = true; p.type = U.pick(PICK_TYPES); } continue; }
      for (const c of race.cars) {
        if (c.wrecked) continue;
        if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 > (c.st.wid * 0.5 + 15) ** 2) continue;
        p.on = false; p.t = 10;
        if (p.type === 'cash') { if (c.isPlayer) c.cash += d.cash; }
        else if (p.type === 'repair') c.hp = Math.min(c.st.hp, c.hp + c.st.hp * 0.25);
        else if (p.type === 'ammo') c.ammo = Math.min(c.st.ammoMax, c.ammo + 30);
        else if (p.type === 'turbo') c.turbo = Math.min(10, c.turbo + 1.5);
        if (c.isPlayer) race.fx.push({ t: 'pick', x: p.x, y: p.y, type: p.type, amt: p.type === 'cash' ? d.cash : 0 });
        break;
      }
    }
  }

  function standings(race) {
    const o = race.cars.slice().sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishT - b.finishT;
      if (a.wrecked !== b.wrecked) return a.wrecked ? 1 : -1;
      if (a.wrecked) return b.wreckT - a.wreckT;
      return b.prog - a.prog;
    });
    race.order = o;
    o.forEach((c, i) => { c.pos = i + 1; });
    const lead = o[0];
    if (race.state === 'run' && lead && lead.idx !== race.leaderIdx) {
      if (race.leaderIdx >= 0 && race.t > 4 && !lead.finished && race.t - (race.leadT || 0) > 4) { line(race, 'lead', lead); race.leadT = race.t; }
      race.leaderIdx = lead.idx;
    }
  }

  function step(race, dt) {
    dt = Math.min(dt, DT_MAX);
    if (race.state === 'done') return;
    race.t += dt;
    if (race.state === 'count') {
      const before = Math.ceil(race.cd);
      race.cd -= dt;
      if (Math.ceil(race.cd) !== before && race.cd > 0) race.fx.push({ t: 'beep', n: Math.ceil(race.cd) });
      if (race.cd <= 0) {
        race.state = 'run';
        race.fx.push({ t: 'go' });
        say(race, U.pick(AR.T.comment.start), AR.T.ui.go);
      }
    }
    // kuminauhan vertailukohta: pisimmällä oleva elossa oleva ihmispelaaja
    let P = null;
    for (const p of race.players) if (!p.wrecked && (!P || p.prog > P.prog)) P = p;
    for (const c of race.cars) {
      if (c.wrecked) continue;
      if (!c.isPlayer || race.auto) {
        // pieni kuminauha: kaukana jäljessä olevat kirivät, kaukana edellä olevat himmaavat
        if (P && !c.isPlayer) {
          const gap = c.prog - P.prog;
          c.ai.boost = gap < -900 ? 1.05 : gap > 1300 ? 0.97 : 1;
        }
        aiInput(race, c, dt);
      }
    }
    for (const c of race.cars) { physics(race, c, dt); weapons(race, c, dt); }
    for (let i = 0; i < race.cars.length; i++)
      for (let j = i + 1; j < race.cars.length; j++) collide(race, race.cars[i], race.cars[j]);
    bullets(race, dt);
    mines(race, dt);
    pickups(race, dt);
    standings(race);
    // savu ja tuli vaurioituneista
    for (const c of race.cars) {
      c.hitT -= dt;
      const f = c.hp / c.st.hp;
      if ((c.wrecked && Math.random() < dt * 14) || (!c.wrecked && f < 0.5 && Math.random() < dt * (f < 0.25 ? 18 : 7)))
        race.fx.push({ t: c.wrecked || f < 0.25 ? 'fire' : 'smoke', x: c.x, y: c.y });
    }
    if (race.state === 'run') {
      const alive = race.cars.filter(c => !c.finished && !c.wrecked).length;
      if (alive === 0) race.endT = Math.min(race.endT, race.t + 1.5);
      if (race.t > 900) race.endT = race.t;
      if (race.t >= race.endT) finish(race);
    }
  }

  function finish(race) {
    race.state = 'done';
    standings(race);
    race.results = race.order.map((c, i) => ({
      idx: c.idx, name: c.name, place: i + 1, kills: c.kills, cash: c.cash, wrecked: c.wrecked, finished: c.finished,
      isPlayer: c.isPlayer, pid: c.pid, driverId: c.driverId, hpFrac: Math.max(0, c.hp) / c.st.hp, ammo: c.ammo, mines: c.mines, turbo: c.turbo
    }));
  }

  // luovutus: pelaaja viimeiseksi
  function forfeit(race) {
    if (race.state === 'done') return;
    for (const P of race.players) if (!P.finished) { P.wrecked = true; P.wreckT = -1; P.forfeit = true; }
    finish(race);
  }

  AR.Race = { create, step, forfeit, hurt, aiInput };
})();
