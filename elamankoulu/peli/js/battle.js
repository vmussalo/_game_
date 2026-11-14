/* Elämänkoulu – ottelu: kaksi taistelijaa, ammukset, osumat, heitot, superliikkeet, erät ja kamera.
   Toimii myös ilman selainta (Node-simulaatiot). Piirto ja äänet lukevat tapahtumat taulukosta battle.events. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U;
  const BLANK = () => EK.BLANK;

  class Battle {
    constructor(o) {
      this.o = o;
      this.rng = U.rng(o.seed || 1);
      const m = o.modern || [false, false];
      this.f = [new EK.Fighter(EK.CHAR[o.p1], 0, { modern: m[0] }), new EK.Fighter(EK.CHAR[o.p2], 1, { modern: m[1] })];
      this.stage = o.stage || EK.CHAR[o.p2].stage;
      this.training = !!o.training;
      this.noIntro = !!o.noIntro;
      this.wins = [0, 0];
      this.round = 0;
      this.events = [];
      this.frame = 0;
      this.cam = { x: C.STAGE_W / 2, shake: 0 };
      this.stats = [0, 1].map(() => ({ hits: 0, blocks: 0, parries: 0, perfect: 0, supers: 0, throws: 0, dmg: 0, maxCombo: 0, burnouts: 0, rests: 0, specials: 0 }));
      this.result = null;
      this.lessonsSeen = [];
      this.startRound();
    }

    ev(e) { e.f = this.frame; this.events.push(e); }
    opp(f) { return this.f[1 - f.idx]; }

    startRound() {
      this.round++;
      this.projs = [];
      this.hitstop = 0; this.flash = null; this.cine = null; this.grab = null;
      this.slow = 0;
      this.timer = C.ROUND_TIME * 60;
      this.phase = this.round === 1 && !this.training && !this.noIntro ? 'intro' : 'ready';
      this.pt = 0;
      this.koWho = -1; this.opetus = false; this.koBySuper = false;
      this.advPending = null;
      const mid = C.STAGE_W / 2;
      this.f[0].reset(mid - 150, 1);
      this.f[1].reset(mid + 150, -1);
      this.cam.x = mid;
      if (this.training) { this.phase = 'fight'; this.f.forEach(f => { f.meter = C.METER; }); }
      this.ev({ t: 'round', n: this.round });
    }

    finalRound() { return this.wins[0] === C.ROUNDS_TO_WIN - 1 && this.wins[1] === C.ROUNDS_TO_WIN - 1; }

    // ---------- pääsilmukka: yksi ruutu ----------
    step(inA, inB) {
      this.frame++;
      const F = this.f;
      let ins = [inA || EK.BLANK, inB || EK.BLANK];
      const ph = this.phase;
      this.pt++;
      if (ph === 'intro') {
        F.forEach(f => { f.state = 'intro'; f.sf = this.pt; });
        if (this.pt >= 110) { F.forEach(f => f.set('stand')); this.phase = 'ready'; this.pt = 0; }
        return;
      }
      if (ph === 'ready') {
        ins = [EK.BLANK, EK.BLANK];
        if (this.pt >= 84) { this.phase = 'fight'; this.pt = 0; this.ev({ t: 'go' }); }
      }
      if (ph === 'ko' || ph === 'timeup' || ph === 'roundOver' || ph === 'done') ins = [EK.BLANK, EK.BLANK];
      if (ph === 'done') { F.forEach(f => { f.sf++; }); return; }

      this.sim(ins);

      if (ph === 'fight' && !this.training && !this.flash && !this.cine && this.hitstop <= 0) {
        this.timer--;
        if (this.timer <= 0) this.timeUp();
      }
      if (ph === 'ko' || ph === 'timeup') this.updEnd();
      if (ph === 'roundOver' && this.pt >= 70) this.nextRound();
      if (this.training) this.updTraining();
    }

    sim(ins) {
      const F = this.f;
      if (this.flash) {
        F.forEach((f, i) => f.feed(ins[i], true));
        if (--this.flash.t <= 0) this.flash = null;
        return;
      }
      if (this.cine) { F.forEach((f, i) => f.feed(ins[i], true)); this.updCine(); this.camera(); return; }
      if (this.hitstop > 0) {
        this.hitstop--;
        F.forEach((f, i) => f.feed(ins[i], true));
        return;
      }
      if (this.slow > 0) { this.slow--; if (this.slow % 2) { F.forEach((f, i) => f.feed(ins[i], true)); return; } }
      F.forEach((f, i) => f.feed(ins[i], false));
      F[0].update(this, F[1]);
      F[1].update(this, F[0]);
      if (this.grab) this.updGrab();
      this.updProjs();
      this.push();
      this.collide();
      this.camera();
      if (this.cam.shake > 0) this.cam.shake *= 0.85;
    }

    // ---------- erän loppu ----------
    ko(d, a, bySuper) {
      if (this.phase !== 'fight') return;
      d.hp = 0;
      this.phase = 'ko'; this.pt = 0; this.koWho = d.idx;
      const both = a.hp <= 0;
      const wouldWin = !both && this.wins[a.idx] + 1 >= C.ROUNDS_TO_WIN;
      this.koBySuper = !!bySuper;
      this.opetus = !!bySuper && wouldWin;
      this.slow = 50;
      if (!d.airborne) { d.airborne = true; d.vy = 7; d.vx = a.facing * 3; d.y = 0.01; }
      d.state = 'ko'; d.sf = 0; d.move = null; d.mvx = 0;
      this.ev({ t: this.opetus ? 'opetus' : 'ko', who: d.idx, x: d.x });
    }

    timeUp() {
      if (this.phase !== 'fight') return;
      this.phase = 'timeup'; this.pt = 0;
      const r = this.f.map(f => f.hp / f.ch.hp);
      this.koWho = r[0] > r[1] ? 1 : r[1] > r[0] ? 0 : -2;
      this.ev({ t: 'timeup' });
    }

    updEnd() {
      const F = this.f;
      if (this.pt === 90 || (this.phase === 'timeup' && this.pt === 60)) {
        if (this.koWho >= 0) {
          const w = F[1 - this.koWho];
          if (w.hp > 0) { w.set('win'); w.winPose = this.rng.int(2); w.airborne = false; w.y = 0; }
          if (this.phase === 'timeup') F[this.koWho].state = 'lose';
        }
      }
      if (this.pt >= 190) {
        let w = -1;
        if (this.koWho >= 0) w = 1 - this.koWho;
        if (this.phase === 'ko' && F[0].hp <= 0 && F[1].hp <= 0) w = -1;
        if (w >= 0) this.wins[w]++;
        else if (this.koWho === -2 || w === -1) { this.wins[0]++; this.wins[1]++; }
        this.lastRoundWinner = w;
        const done = this.wins[0] >= C.ROUNDS_TO_WIN || this.wins[1] >= C.ROUNDS_TO_WIN || this.round >= 5;
        this.phase = 'roundOver'; this.pt = 0;
        if (done) {
          const winner = this.wins[0] > this.wins[1] ? 0 : this.wins[1] > this.wins[0] ? 1 : -1;
          this.result = { winner, opetus: this.opetus && winner >= 0, wins: this.wins.slice(), rounds: this.round };
          this.phase = 'done';
          this.ev({ t: 'matchEnd', winner });
        }
      }
    }

    nextRound() { this.startRound(); }

    // ---------- harjoittelu ----------
    updTraining() {
      this.f.forEach(f => {
        if (f.hp <= 0) f.hp = 1;
        if (f.state === 'stand' && f.frame - f.lastAct > 50 && f.hp < f.ch.hp) { f.hp = f.ch.hp; f.dispHp = f.hp; }
        if (this.o.trainInf) { f.meter = C.METER; if (!f.burn) f.jaks = Math.max(f.jaks, C.JAKS * 0.5); }
      });
      const p = this.advPending;
      if (p && p.a.actionable() && p.d.actionable()) {
        if (p.a.lastAct >= p.f0 && p.d.lastAct >= p.f0) {
          this.ev({ t: 'adv', v: p.d.lastAct - p.a.lastAct, who: p.a.idx, hit: p.hit });
          this.advPending = null;
        }
      }
    }

    // ---------- apuja fighter.js:lle ----------
    superFlash(a) {
      this.flash = { who: a.idx, t: 44, name: a.move.name };
      this.stats[a.idx].supers++;
      this.ev({ t: 'super', who: a.idx, name: a.move.name, x: a.x });
    }

    // Uhkaako vastustajan isku tai ammus (lähitorjunta ja tekoäly)
    threatened(f) {
      const o = this.opp(f);
      if (o.state === 'move' && o.move.hits.length && o.mf <= o.move.last && Math.abs(o.x - f.x) < 270) return true;
      return this.projs.some(p => p.owner !== f.idx && Math.abs(p.x - f.x) < 230 && Math.sign(f.x - p.x) === Math.sign(p.vx));
    }

    spawnProj(f, def) {
      if (!def.sup && this.projs.some(p => p.owner === f.idx && !p.sup)) {
        // yksi tavallinen ammus kerrallaan: liike tehdään, mutta ammusta ei synny
        this.ev({ t: 'fizzle', who: f.idx });
        return;
      }
      const p = Object.assign({}, def);
      p.owner = f.idx;
      p.x = f.x + f.facing * def.x;
      p.y = f.y + def.y;
      p.vx = def.vx * f.facing;
      p.vy = def.vy || 0;
      p.t = 0; p.cool = 0;
      p.modern = f.moveModern;
      p.facing = f.facing;
      this.projs.push(p);
      this.stats[f.idx].specials++;
      this.ev({ t: 'proj', who: f.idx, sprite: p.sprite, x: p.x, y: p.y });
    }

    teleport(f, to) {
      const o = this.opp(f);
      const side = o.x >= f.x ? 1 : -1;
      let x;
      if (to === 'back') x = f.x - side * 280;
      else if (to === 'front') x = o.x - side * 86;
      else {
        x = o.x + side * 80;
        if (x < C.EDGE + 10 || x > C.STAGE_W - C.EDGE - 10) x = o.x - side * 86;
      }
      const lim = this.camLimits();
      f.x = U.clamp(x, Math.max(C.EDGE, lim[0]), Math.min(C.STAGE_W - C.EDGE, lim[1]));
      f.facing = o.x >= f.x ? 1 : -1;
      this.ev({ t: 'teleIn', who: f.idx, x: f.x });
    }

    // ---------- heitot ----------
    throwable(d) {
      const s = d.state;
      if (d.airborne) return false;
      if (s === 'move') {
        const m = d.move;
        if (m.tinv && d.mf >= m.tinv[0] && d.mf <= m.tinv[1]) return false;
        if (m.inv && d.mf >= m.inv[0] && d.mf <= m.inv[1] && m.kind === 'super') return false;
        return true;
      }
      return ['stand', 'parry', 'rest', 'restEnd', 'land', 'dash', 'jumpsq', 'stagger'].indexOf(s) >= 0;
    }

    tryGrab(a, m) {
      if (this.grab || this.cine) return;
      const d = this.opp(a);
      if (Math.abs(a.x - d.x) > m.grab.range || !this.throwable(d)) return;
      // Molemmat heittävät yhtä aikaa → irti
      if (!m.grab.cmd && d.state === 'move' && d.move.id === 'throw' && d.mf <= d.move.grab.f1) { this.tech(a, d); return; }
      if (m.grab.cine) { this.startCine(a, d, 'grab'); return; }
      const punish = d.state === 'parry' || d.state === 'rest' || d.state === 'restEnd';
      this.grab = { a, d, t: 0, len: m.grab.cmd ? 46 : 38, dmg: Math.round(m.grab.dmg * (punish ? 1.4 : 1)), back: !m.grab.cmd && a.dir === 4, cmd: m.grab.cmd, punish };
      a.state = 'throwing'; a.sf = 0; a.mvx = 0;
      d.state = 'thrown'; d.sf = 0; d.move = null; d.mvx = 0; d.pvx = 0;
      this.stats[a.idx].throws++;
      this.ev({ t: 'grab', who: a.idx, cmd: m.grab.cmd, x: (a.x + d.x) / 2 });
    }

    tech(a, d) {
      [a, d].forEach(f => { f.set('block'); f.stun = 16; f.pvx = (f.x < this.opp(f).x ? -1 : 1) * 7; });
      this.grab = null;
      this.ev({ t: 'tech', x: (a.x + d.x) / 2 });
    }

    updGrab() {
      const g = this.grab, a = g.a, d = g.d;
      g.t++;
      // tavallisen heiton voi purkaa
      if (!g.cmd && g.t <= C.THROW_TECH && d.cmds.some(c => c.k === 'throw')) { d.cmds.length = 0; this.tech(a, d); return; }
      const hitT = g.len - 12;
      const k = Math.min(1, g.t / hitT);
      const side = g.back ? -1 : 1;
      if (g.t < hitT) {
        // nostetaan ja käännetään
        const ang = g.back ? Math.PI * k : 0;
        d.x = a.x + a.facing * (54 * Math.cos(ang));
        d.y = g.cmd ? 30 + 60 * Math.sin(Math.PI * k) : 16 + 30 * Math.sin(Math.PI * k);
        d.facing = -a.facing;
      }
      if (g.t === hitT) {
        d.x = a.x + a.facing * side * 50;
        d.y = 0.01;
        d.hp -= g.dmg;
        d.combo = 1; d.comboDmg = g.dmg;
        this.stats[a.idx].dmg += g.dmg;
        this.stats[a.idx].hits++;
        a.gainMeter(g.dmg * C.METER_GAIN.hit);
        d.gainMeter(g.dmg * C.METER_GAIN.taken);
        d.set('juggle'); d.airborne = true; d.vy = 6; d.vx = a.facing * side * 3.5; d.airReset = false; d.juggles = C.JUGGLE_MAX;
        this.hitstop = EK.STOP.H;
        this.cam.shake = 8;
        this.ev({ t: 'hit', who: a.idx, str: 'H', x: d.x, y: 40, throw: true, punish: g.punish });
        a.set('land'); a.landT = g.cmd ? 16 : 12;
        this.grab = null;
        if (d.hp <= 0) this.ko(d, a, false);
      }
    }

    // ---------- superliikkeen välikohtaus ----------
    startCine(a, d, kind) {
      const sup = a.ch.sup;
      const scale = d.combo > 0 ? Math.max(0.5, C.SCALE[Math.min(d.combo, C.SCALE.length - 1)]) : 1;
      const modern = a.moveModern ? C.MODERN_DMG : 1;
      this.cine = { a, d, t: 0, len: 96, kind, words: sup.words, total: Math.round(sup.dmg * a.ch.power * scale * modern), dealt: 0, hitsAt: [18, 36, 54, 72] };
      a.state = 'cineAtk'; a.sf = 0; a.move = null; a.mvx = 0;
      d.state = 'cine'; d.sf = 0; d.move = null; d.mvx = 0; d.pvx = 0;
      a.airborne = false; a.y = 0; d.airborne = false; d.y = 0;
      // tilaa välikohtaukselle
      const want = a.x + a.facing * 66;
      if (want < C.EDGE + 20 || want > C.STAGE_W - C.EDGE - 20) a.x = U.clamp(a.x, C.EDGE + 90, C.STAGE_W - C.EDGE - 90);
      d.x = a.x + a.facing * 66;
      d.facing = -a.facing;
      this.ev({ t: 'cine', who: a.idx, kind });
    }

    updCine() {
      const c = this.cine, a = c.a, d = c.d;
      c.t++; a.sf++; d.sf++;
      if (d.wobble > 0) d.wobble--;
      if (d.flashT > 0) d.flashT--;
      const i = c.hitsAt.indexOf(c.t);
      if (i >= 0) {
        const part = i === c.hitsAt.length - 1 ? c.total - c.dealt : Math.round(c.total / c.hitsAt.length);
        c.dealt += part;
        d.hp -= part;
        d.combo++; d.comboDmg += part;
        this.stats[a.idx].dmg += part;
        this.stats[a.idx].hits++;
        d.wobble = 8; d.flashT = 4;
        this.cam.shake = 6 + i * 2;
        this.ev({ t: 'hit', who: a.idx, str: i === c.hitsAt.length - 1 ? 'X' : 'H', x: d.x, y: 120, word: c.words[i % c.words.length], cine: true });
        if (d.hp <= 0) d.hp = 0;
      }
      if (c.t >= c.len) {
        this.cine = null;
        d.state = 'juggle'; d.sf = 0; d.airborne = true; d.y = 0.01; d.vy = 11; d.vx = a.facing * 4; d.airReset = false; d.juggles = C.JUGGLE_MAX;
        a.set('land'); a.landT = 14;
        if (d.hp <= 0) this.ko(d, a, true);
      }
    }

    // ---------- ammukset ----------
    updProjs() {
      const P = this.projs;
      P.forEach(p => {
        p.t++;
        p.x += p.vx; p.y += p.vy; p.vy -= p.g || 0;
        if (p.cool > 0) p.cool--;
        if (--p.life <= 0 || (p.g && p.y < 14) || p.x < -80 || p.x > C.STAGE_W + 80) { p.dead = true; this.ev({ t: 'puff', x: p.x, y: p.y, color: p.color }); }
      });
      // ammusten törmäys
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (!U.overlap(this.pbox(a), this.pbox(b))) continue;
        if (a.sup && !b.sup) { b.dead = true; a.hits--; }
        else if (b.sup && !a.sup) { a.dead = true; b.hits--; }
        else { a.dead = b.dead = true; }
        if (a.hits <= 0) a.dead = true;
        if (b.hits <= 0) b.dead = true;
        this.ev({ t: 'clash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      this.projs = P.filter(p => !p.dead);
    }

    pbox(p) { return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 }; }

    // ---------- törmäykset ----------
    push() {
      const a = this.f[0], b = this.f[1];
      const dx = b.x - a.x;
      const vOverlap = !(a.y > 130 * b.ch.size + b.y || b.y > 130 * a.ch.size + a.y);
      const ghost = s => s === 'thrown' || s === 'cine' || s === 'cineAtk' || s === 'throwing';
      if (vOverlap && !ghost(a.state) && !ghost(b.state) && !a.invis && !b.invis) {
        const minD = C.PUSH_W * 2;
        if (Math.abs(dx) < minD) {
          const s = dx === 0 ? (a.facing > 0 ? 1 : -1) : Math.sign(dx);
          const over = (minD - Math.abs(dx)) / 2;
          a.x -= s * over; b.x += s * over;
        }
      }
      const lo = C.EDGE, hi = C.STAGE_W - C.EDGE;
      [a, b].forEach(f => { f.x = U.clamp(f.x, lo, hi); });
      // seinällä toinen työntyy
      if (Math.abs(b.x - a.x) < C.PUSH_W * 2 && vOverlap && !ghost(a.state) && !ghost(b.state)) {
        if (a.x <= lo + 0.5) b.x = Math.max(b.x, a.x + C.PUSH_W * 2);
        if (b.x <= lo + 0.5) a.x = Math.max(a.x, b.x + C.PUSH_W * 2);
        if (a.x >= hi - 0.5) b.x = Math.min(b.x, a.x - C.PUSH_W * 2);
        if (b.x >= hi - 0.5) a.x = Math.min(a.x, b.x - C.PUSH_W * 2);
      }
      // kamera ei veny: hahmot pysyvät kuvassa
      const lim = this.camLimits();
      if (b.x - a.x > lim[1] - lim[0]) { /* ääritilanne */ }
      const span = C.W - 60;
      if (Math.abs(b.x - a.x) > span) {
        const mid = (a.x + b.x) / 2, s = Math.sign(b.x - a.x);
        a.x = mid - s * span / 2; b.x = mid + s * span / 2;
      }
    }

    camLimits() { return [this.cam.x - C.W / 2 + 30, this.cam.x + C.W / 2 - 30]; }

    camera() {
      const a = this.f[0], b = this.f[1];
      const mid = (a.x + b.x) / 2;
      this.cam.x = U.clamp(this.cam.x + (mid - this.cam.x) * 0.25, C.W / 2, C.STAGE_W - C.W / 2);
    }

    collide() {
      const F = this.f, pend = [];
      F.forEach(a => {
        if (a.state !== 'move') return;
        const m = a.move, d = this.opp(a);
        for (let k = 0; k < m.hits.length; k++) {
          const h = m.hits[k];
          if (a.mf < h.f0 || a.mf > h.f1 || a.hitDone[k]) continue;
          if (d.state === 'juggle' && !(h.juggle && d.juggles < C.JUGGLE_MAX)) continue;
          const hb = a.toWorld(h.hb, 1);
          if (d.hurtboxes().some(b => U.overlap(hb, b))) { pend.push({ a, d, h, k }); break; }
        }
      });
      pend.forEach(p => { p.a.hitDone[p.k] = true; });
      pend.forEach(p => this.applyHit(p.a, p.d, p.h, null));
      // ammukset
      this.projs.forEach(p => {
        if (p.dead || p.cool > 0) return;
        const d = this.f[1 - p.owner];
        if (d.state === 'juggle' && !(p.juggle && d.juggles < C.JUGGLE_MAX)) return;
        const pb = this.pbox(p);
        if (d.hurtboxes().some(b => U.overlap(pb, b))) {
          this.applyHit(this.f[p.owner], d, p, p);
          p.hits--; p.cool = p.every || 0;
          if (p.hits <= 0) { p.dead = true; this.ev({ t: 'puff', x: p.x, y: p.y, color: p.color }); }
        }
      });
      this.projs = this.projs.filter(p => !p.dead);
    }

    // Osuman käsittely: Hengitä, panssari, vastaiskuasento, torjunta tai osuma
    applyHit(a, d, h, proj) {
      if (this.phase !== 'fight' && this.phase !== 'ko') return;
      const srcMove = proj ? null : a.move;
      const isSuper = proj ? !!proj.sup : srcMove && srcMove.kind === 'super';
      const isSpecial = isSuper || (proj ? true : srcMove && srcMove.kind === 'special');
      const modern = proj ? proj.modern : a.moveModern;
      const dir = proj ? Math.sign(proj.vx) : a.facing;
      const cx = proj ? proj.x : (Math.max(Math.min(a.x, d.x), Math.min(Math.max(a.x, d.x), a.x + a.facing * (h.hb.x1 - 10))));
      const cy = proj ? proj.y : d.y + Math.min(150, (h.hb.y0 + h.hb.y1) / 2);
      const S = this.stats;
      if (!proj) a.contact = true;

      // Hengitä-torjunta (kaikki korkeudet)
      if (d.state === 'parry') {
        const perfect = d.frame - d.parryStart <= C.PERFECT_WIN;
        d.jaks = Math.min(C.JAKS, d.jaks + C.JAKS_PARRY_OK * (perfect ? 3 : 1));
        d.gainMeter(4);
        S[d.idx].parries++;
        this.hitstop = perfect ? 14 : 8;
        if (perfect) {
          S[d.idx].perfect++;
          if (!proj && a.state === 'move') { a.set('stagger'); a.stun = C.PERFECT_FREEZE; }
          this.slow = perfect ? 24 : 0;
        }
        if (proj) proj.hits = 1; // ammus haihtuu
        this.ev({ t: perfect ? 'perfectParry' : 'parry', who: d.idx, x: cx, y: cy });
        this.advPending = { a, d, f0: Math.max(a.frame, d.frame), hit: false };
        return;
      }
      // Vastaiskuasento
      if (d.state === 'move' && d.move.counter && d.mf >= d.move.counter.f0 && d.mf <= d.move.counter.f1) {
        if (proj) { proj.hits = 1; this.ev({ t: 'absorb', who: d.idx, x: cx, y: cy }); return; }
        const dmg = Math.round(d.move.counter.dmg * (d.moveModern ? C.MODERN_DMG : 1));
        a.hp -= dmg; a.combo = 1; a.comboDmg = dmg;
        S[d.idx].dmg += dmg; S[d.idx].hits++;
        a.set('juggle'); a.airborne = true; a.y = Math.max(a.y, 0.01); a.vy = 9; a.vx = d.facing * 4; a.airReset = false; a.juggles = C.JUGGLE_MAX;
        d.set('land'); d.landT = 26; d.counterPose = true;
        this.hitstop = 16; this.cam.shake = 9;
        this.ev({ t: 'hit', who: d.idx, str: 'H', x: cx, y: cy, counter: true, word: 'Kuuntele!' });
        if (a.hp <= 0) this.ko(a, d, false);
        return;
      }
      // Panssari
      if (d.state === 'move' && d.move.armor && !d.armorUsed && d.mf >= d.move.armor[0] && d.mf <= d.move.armor[1] && !isSuper) {
        d.armorUsed = true;
        const dmg = Math.round(h.dmg * 0.5);
        d.hp -= dmg; d.flashT = 6;
        this.hitstop = EK.STOP[h.str] || 9;
        this.ev({ t: 'armor', who: d.idx, x: cx, y: cy });
        if (d.hp <= 0) this.ko(d, a, false);
        return;
      }

      const blocked = d.canBlock() && d.holdingBack() && (h.lvl === 'mid' || (h.lvl === 'low' && d.dir === 1) || (h.lvl === 'over' && d.dir === 4)) && !h.cine;
      if (blocked) {
        d.set('block'); d.stun = h.bs; d.crouching = d.dir === 1;
        let chip = 0;
        if (d.burn) chip = h.dmg * C.CHIP_BURN;
        else if (isSpecial) chip = h.dmg * C.CHIP;
        chip = Math.round(chip);
        d.hp -= chip;
        if (d.hp <= 0 && !isSuper) d.hp = 1;
        if (!d.burn) {
          d.jaks -= h.dmg * C.JAKS_BLOCK_K;
          if (d.jaks <= 0) { d.burnout(this); S[d.idx].burnouts++; }
        }
        d.pvx = dir * ((h.push || 5) + 1.5);
        if (!proj && this.atWall(d)) a.pvx = -a.facing * (h.push || 5) * 0.9;
        a.gainMeter(h.dmg * C.METER_GAIN.block);
        d.gainMeter(h.dmg * 0.03);
        this.hitstop = Math.max(4, (EK.STOP[h.str] || 8) - 2);
        S[d.idx].blocks++;
        this.ev({ t: 'block', who: a.idx, str: h.str, x: cx, y: cy });
        this.advPending = { a, d, f0: Math.max(a.frame, d.frame), hit: false };
        if (d.hp <= 0) this.ko(d, a, isSuper);
        return;
      }

      // Osuma
      const wasAir = d.airborne;
      const freeAir = wasAir && d.state !== 'juggle';
      let counter = false, punish = false;
      if (d.state === 'move') {
        if (d.mf < d.move.first) counter = true;
        else if (d.mf > d.move.last) punish = true;
      }
      if (d.state === 'land' && d.landT > 6) punish = true;
      if (d.state === 'stagger') punish = true;
      const resting = d.state === 'rest' || d.state === 'restEnd';
      d.combo++;
      const scale = C.SCALE[Math.min(d.combo - 1, C.SCALE.length - 1)];
      let mult = counter ? C.COUNTER_DMG : punish ? 1.1 : 1;
      if (resting) mult *= C.REST_DMG;
      if (modern && isSpecial) mult *= C.MODERN_DMG;
      const dmg = Math.max(1, Math.round(h.dmg * scale * mult));
      d.hp -= dmg; d.comboDmg += dmg;
      S[a.idx].dmg += dmg; S[a.idx].hits++;
      S[a.idx].maxCombo = Math.max(S[a.idx].maxCombo, d.combo);
      d.flashT = 4;
      if (wasAir || h.kd || (h.cine && false)) {
        if (h.kd === 'trip' && !wasAir) {
          d.set('juggle'); d.airborne = true; d.y = 0.01; d.vy = 3.5; d.vx = dir * 1; d.airReset = false;
        } else {
          const L = h.launch || { vx: 3, vy: 6 };
          const prevJ = d.juggles;
          d.set('juggle'); d.airborne = true; d.y = Math.max(d.y, 0.01);
          d.vy = wasAir ? Math.max(5, L.vy * 0.8) : L.vy; d.vx = dir * L.vx;
          d.airReset = freeAir && !h.kd && !h.juggle;
          d.juggles = prevJ + 1;
        }
      } else {
        const cr = d.crouching && (d.state === 'stand' || d.state === 'hit' || d.state === 'block' || d.state === 'move' && d.move.crouch);
        d.set('hit'); d.stun = h.hs + (counter ? C.COUNTER_HS : 0);
        d.crouching = !!cr;
        d.pvx = dir * (h.push || 5);
        if (!proj && this.atWall(d)) a.pvx = -a.facing * (h.push || 5) * 0.8;
      }
      d.wobble = 8;
      a.gainMeter(h.dmg * C.METER_GAIN.hit);
      d.gainMeter(h.dmg * C.METER_GAIN.taken);
      this.hitstop = (EK.STOP[h.str] || 9) + (counter ? 3 : 0);
      if (h.str === 'H' || h.str === 'X') this.cam.shake = h.str === 'X' ? 10 : 5;
      if (!proj) { a.contactHit = true; if (h.stopOnHit) a.mvx = 0; }
      this.ev({ t: 'hit', who: a.idx, str: h.str, x: cx, y: cy, counter, punish, rest: resting, combo: d.combo });
      this.advPending = { a, d, f0: Math.max(a.frame, d.frame), hit: true };
      if (h.cine && d.hp > 0) { this.startCine(a, d, 'rush'); return; }
      if (d.hp <= 0) this.ko(d, a, isSuper);
    }

    atWall(f) { return f.x <= C.EDGE + 4 || f.x >= C.STAGE_W - C.EDGE - 4; }
  }

  EK.Battle = Battle;
})();
