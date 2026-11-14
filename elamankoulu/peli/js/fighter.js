/* Elämänkoulu – taistelija: syötteen tulkinta (liikesarjat, puskuri), tilakone ja fysiikka.
   Suunnat ovat numeronäppäimistön mukaisia (6 = eteen, 4 = taakse, 2 = alas, 8 = ylös) suhteessa katsesuuntaan. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U;

  const BLANK = { u: 0, d: 0, l: 0, r: 0, L: 0, M: 0, H: 0, S: 0, P: 0 };
  const BTNS = ['L', 'M', 'H', 'S', 'P'];
  const mirror = d => d - 2 * ((d - 1) % 3) + 2;

  // Liikesarjat: suuntien järjestys (vanhimmasta uusimpaan). Kirjaimet ovat sallittuja vaihtoehtoja.
  const M236 = [[2], [3], [6]], M236s = [[2], [6]];
  const M214 = [[2], [1], [4]], M214s = [[2], [4]];
  const M623 = [[6], [2, 1], [3]];
  const M236236 = [[2], [3], [6], [2], [3], [6]], M236236s = [[2], [6], [2], [6]];

  class Fighter {
    constructor(ch, idx, opts) {
      opts = opts || {};
      this.ch = ch;
      this.idx = idx;
      this.moves = EK.compileMoves(ch);
      this.modern = !!opts.modern;
      this.meter = opts.meter || 0;
      this.g = ch.jump.g || C.GRAV;
      this.reset(0, 1);
    }

    reset(x, facing) {
      this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.pvx = 0; this.mvx = 0;
      this.facing = facing;
      this.airborne = false;
      this.state = 'stand'; this.sf = 0;
      this.move = null; this.mf = 0;
      this.hp = this.ch.hp;
      this.dispHp = this.hp; // viivästetty palkki
      this.jaks = C.JAKS; this.burn = false;
      this.crouching = false; this.guarding = false;
      this.stun = 0; this.airAct = false; this.landT = 3;
      this.juggles = 0; this.combo = 0; this.comboDmg = 0; this.airReset = false;
      this.hitDone = []; this.contact = false; this.contactHit = false;
      this.hist = [{ d: 5, f: 0 }]; this.frame = 0;
      this.inp = BLANK; this.prevIn = BLANK;
      this.cmds = []; this.lastPress = { L: -99, M: -99, H: -99, S: -99, P: -99 };
      this.invis = false; this.armorUsed = false;
      this.dashDir = 0; this.dashLen = 0;
      this.moveModern = false;
      this.parryStart = 0;
      this.counterHit = false;
      this.lastAct = 0; // ruutu, jolloin hahmo viimeksi pystyi toimimaan (harjoittelun etuluku)
      this.wobble = 0;  // osuman tärinä piirtoa varten
      this.flashT = 0;  // valkoinen välähdys piirtoa varten
      this.winPose = 0;
    }

    // ---------- syöte ----------
    rel(d) { return this.facing > 0 ? d : mirror(d); }
    get dir() { return this.rel(this.hist[this.hist.length - 1].d); }

    // frozen = osumajähmetys tai superin välähdys: syöte kirjataan, mutta puskuri ei vanhene
    feed(inp, frozen) {
      if (!frozen) this.frame++;
      this.prevIn = this.inp;
      this.inp = inp || BLANK;
      const h = (this.inp.r ? 1 : 0) - (this.inp.l ? 1 : 0);
      const v = (this.inp.u ? 1 : 0) - (this.inp.d ? 1 : 0);
      const raw = 5 + h + v * 3;
      if (raw !== this.hist[this.hist.length - 1].d) {
        this.hist.push({ d: raw, f: this.frame });
        if (this.hist.length > 40) this.hist.shift();
      }
      // vanhentuneet komennot pois
      if (!frozen) for (let i = this.cmds.length - 1; i >= 0; i--) if (++this.cmds[i].age > C.BUFFER) this.cmds.splice(i, 1);
      const pr = {};
      let any = false;
      BTNS.forEach(b => { pr[b] = this.inp[b] && !this.prevIn[b]; if (pr[b]) { this.lastPress[b] = this.frame; any = true; } });
      if (any) this.makeCommands(pr);
    }

    // Etsii liikesarjan historiasta: viimeisen osan pitää olla tuore, koko sarjan ikkunan sisällä
    match(pat, win) {
      let pi = pat.length - 1;
      const now = this.frame, H = this.hist;
      for (let i = H.length - 1; i >= 0 && pi >= 0; i--) {
        const end = i === H.length - 1 ? now : H[i + 1].f - 1;
        if (now - end > win) return false;
        if (pat[pi].indexOf(this.rel(H[i].d)) >= 0) {
          if (pi === pat.length - 1 && now - end > 4) return false;
          pi--;
        }
      }
      return pi < 0;
    }

    makeCommands(pr) {
      const f = this.frame, lp = this.lastPress, W = C.MOTION_WIN;
      const atk = pr.H ? 'H' : pr.M ? 'M' : pr.L ? 'L' : null;
      const d = this.dir;
      const add = c => { c.age = 0; this.cmds.push(c); };
      // Superliike
      const supClassic = atk && (this.match(M236236, W + 14) || this.match(M236236s, W + 8));
      const supModern = (pr.S && f - lp.H <= 2) || (pr.H && f - lp.S <= 2);
      if ((supClassic || supModern) && this.meter >= C.METER) { add({ k: 'sup', modern: !supClassic }); return; }
      // Heitto: L ja M lähes yhtä aikaa
      if ((pr.L && f - lp.M <= 2) || (pr.M && f - lp.L <= 2)) { add({ k: 'throw' }); return; }
      // Klassiset erikoisliikkeet
      if (atk) {
        const m623 = this.match(M623, W);
        const m236 = this.match(M236, W) || this.match(M236s, 8);
        const m214 = this.match(M214, W) || this.match(M214s, 8);
        let slot = null;
        if (m623 && (!m236 || d === 3)) slot = 's2';
        else if (m236) slot = 's1';
        else if (m214) slot = 's3';
        if (slot) add({ k: 'sp', slot, str: atk, modern: false });
        else add({ k: 'n', btn: atk });
      }
      // Moderni Erikois-nappi
      if (pr.S) {
        const slot = d === 6 || d === 9 ? 's2' : d <= 3 ? 's3' : 's1';
        add({ k: 'sp', slot, str: 'M', modern: true });
      }
      if (pr.P) add({ k: d <= 3 ? 'rest' : 'parry' });
    }

    takeCmd(pred) {
      const order = ['sup', 'sp', 'throw', 'n', 'parry', 'rest'];
      let best = null;
      this.cmds.forEach(c => { if (pred(c) && (!best || order.indexOf(c.k) < order.indexOf(best.k))) best = c; });
      if (best) this.cmds.length = 0;
      return best;
    }

    // ---------- tilat ----------
    actionable() { return this.state === 'stand' || (this.state === 'air' && !this.airAct); }
    attacking() { return this.state === 'move'; }
    isAir() { return this.airborne; }

    set(state) {
      this.state = state; this.sf = 0;
      if (state !== 'move') { this.move = null; this.mvx = 0; }
      this.counterPose = false;
      if (state === 'stand') { this.combo = 0; this.comboDmg = 0; this.juggles = 0; this.airReset = false; this.lastAct = this.frame; }
    }

    startMove(id, battle, modern) {
      const m = this.moves[id];
      if (!m) return false;
      this.move = m; this.mf = 0; this.state = 'move'; this.sf = 0;
      this.hitDone = []; this.contact = false; this.contactHit = false; this.armorUsed = false;
      this.mvx = 0; this.moveModern = !!modern; this.counterHit = false;
      if (m.kind === 'special') this.gainMeter(C.METER_GAIN.special);
      if (m.kind === 'super') { this.meter -= C.METER; battle.superFlash(this); }
      if (m.air) this.airAct = true;
      battle.ev({ t: 'move', who: this.idx, kind: m.kind, str: m.str, id });
      this.stepMove(battle);
      return true;
    }

    gainMeter(v) { this.meter = U.clamp(this.meter + v, 0, C.METER); }

    // Valitsee perushyökkäyksen nykyisen suunnan ja tilan mukaan
    normalFor(btn) {
      if (this.airborne) return 'j' + btn;
      const d = this.dir;
      if (d <= 3) return 'c' + btn;
      if (d === 6 && btn === 'M') return 'fM';
      return 's' + btn;
    }

    update(battle, opp) {
      this.sf++;
      if (this.flashT > 0) this.flashT--;
      if (this.wobble > 0) this.wobble--;
      // Jaksamisen palautuminen
      if (this.burn) {
        this.jaks += this.state === 'rest' ? C.JAKS_REST * 1.3 : C.JAKS_BURN_REGEN;
        if (this.jaks >= C.JAKS_BURN_UNTIL) { this.burn = false; battle.ev({ t: 'unburn', who: this.idx }); }
      } else if (this.state === 'rest') this.jaks += C.JAKS_REST;
      else if (this.state !== 'parry' && this.state !== 'block') this.jaks += C.JAKS_REGEN;
      this.jaks = Math.min(C.JAKS, this.jaks);

      const s = this.state;
      if (s === 'stand') this.updStand(battle, opp);
      else if (s === 'air') this.updAir(battle);
      else if (s === 'move') this.updMove(battle);
      else if (s === 'jumpsq') { if (this.sf >= 4) this.takeoff(); }
      else if (s === 'land') { if (this.sf >= this.landT) this.set('stand'); }
      else if (s === 'dash') this.updDash();
      else if (s === 'hit' || s === 'block') { if (this.sf >= this.stun) this.set('stand'); }
      else if (s === 'stagger') { if (this.sf >= this.stun) this.set('stand'); }
      else if (s === 'down') { if (this.sf >= C.DOWN_TIME) this.set('getup'); }
      else if (s === 'getup') { if (this.sf >= C.GETUP_TIME) this.set('stand'); }
      else if (s === 'parry') {
        this.jaks -= C.JAKS_PARRY_HOLD;
        if (this.jaks <= 0) { this.jaks = 0; this.burnout(battle); this.set('stand'); }
        else if (!this.inp.P && this.sf >= 8) this.set('stand');
      } else if (s === 'rest') {
        if (!this.inp.P || this.dir > 3) this.set('restEnd');
      } else if (s === 'restEnd') { if (this.sf >= 14) this.set('stand'); }

      this.physics(battle);
    }

    updStand(battle, opp) {
      // käänny vastustajaa kohti
      if (opp && !this.airborne) {
        const want = opp.x >= this.x ? 1 : -1;
        if (want !== this.facing && Math.abs(opp.x - this.x) > 2) this.facing = want;
      }
      if (this.tryAct(battle)) return;
      const d = this.dir;
      this.crouching = d <= 3;
      this.guarding = false;
      this.mvx = 0;
      if (d >= 7) { this.set('jumpsq'); this.crouching = false; return; }
      // tuplanapautus = syöksy
      if ((d === 6 || d === 4) && this.sf > 0) {
        const H = this.hist, n = H.length;
        if (n >= 3 && this.frame - H[n - 1].f <= 0) {
          const a = this.rel(H[n - 3].d), b = this.rel(H[n - 2].d);
          if (a === d && b === 5 && this.frame - H[n - 3].f <= 14) { this.startDash(d === 6 ? 1 : -1, battle); return; }
        }
      }
      if (d === 6) this.mvx = this.ch.walk;
      else if (d === 4) {
        if (battle.threatened(this)) { this.guarding = true; this.mvx = 0; }
        else this.mvx = -this.ch.back;
      } else if (d <= 3 && (d === 1) && battle.threatened(this)) this.guarding = true;
    }

    tryAct(battle) {
      const c = this.takeCmd(c => c.k !== 'sup' || this.meter >= C.METER);
      if (!c) return false;
      if (c.k === 'sup') return this.startMove('sup', battle, c.modern);
      if (c.k === 'sp') return this.startMove(c.slot + c.str, battle, c.modern);
      if (c.k === 'throw') return this.startMove('throw', battle);
      if (c.k === 'n') return this.startMove(this.normalFor(c.btn), battle);
      if (c.k === 'parry') {
        if (this.burn || this.jaks <= 0) { battle.ev({ t: 'deny', who: this.idx }); return false; }
        this.set('parry'); this.parryStart = this.frame; this.jaks -= C.JAKS_PARRY_COST; battle.ev({ t: 'parryStart', who: this.idx }); return true;
      }
      if (c.k === 'rest') { this.set('rest'); battle.ev({ t: 'rest', who: this.idx }); return true; }
      return false;
    }

    takeoff() {
      const d = this.dir;
      const k = d === 9 ? 1 : d === 7 ? -1 : 0;
      this.airborne = true; this.airAct = false;
      this.vy = this.ch.jump.vy;
      this.vx = k * this.ch.jump.vx * this.facing;
      this.y = 0.01;
      this.set('air');
    }

    startDash(dir, battle) {
      this.set('dash');
      this.dashDir = dir;
      this.dashLen = dir > 0 ? 18 : 22;
      battle.ev({ t: 'dash', who: this.idx });
    }

    updDash() {
      const dist = this.dashDir > 0 ? this.ch.dash.f : this.ch.dash.b;
      const t = this.sf / this.dashLen;
      // nopea alku, pehmeä loppu
      this.mvx = this.dashDir * dist * 2 * (1 - t) / this.dashLen;
      if (this.sf >= this.dashLen) this.set('stand');
    }

    updAir(battle) {
      const c = this.takeCmd(c => c.k === 'n');
      if (c && !this.airAct) this.startMove('j' + c.btn, battle);
    }

    updMove(battle) {
      const m = this.move;
      // Kumoamiset: osuman tai torjunnan jälkeen perushyökkäys erikoisliikkeeksi tai ketjuksi
      if (this.contact && m.kind !== 'super') {
        const canSp = m.cancel || (m.kind === 'special' && this.contactHit);
        const c = this.takeCmd(c => (c.k === 'sup' && this.meter >= C.METER) || (canSp && m.kind === 'normal' && c.k === 'sp') ||
          (c.k === 'n' && m.chain && !this.airborne && m.chain.indexOf(this.normalFor(c.btn)) >= 0));
        if (c) {
          if (c.k === 'sup') { this.startMove('sup', battle, c.modern); return; }
          if (c.k === 'sp') { this.startMove(c.slot + c.str, battle, c.modern); return; }
          if (c.k === 'n') { this.startMove(this.normalFor(c.btn), battle); return; }
        }
      }
      // Heitto ehtii korvata juuri alkaneen L/M-iskun
      if (m.kind === 'normal' && (m.str === 'L' || m.str === 'M') && !m.air && this.mf <= 3) {
        const c = this.takeCmd(c => c.k === 'throw');
        if (c) { this.startMove('throw', battle); return; }
      }
      this.stepMove(battle);
    }

    stepMove(battle) {
      const m = this.move;
      this.mf++;
      const f = this.mf;
      if (m.vel) m.vel.forEach(v => {
        if (v[0] !== f) return;
        if (v[2] != null) {
          this.airborne = true; this.vy = v[2]; this.y = Math.max(this.y, 0.01);
          this.vx = (v[1] || 0) * this.facing; this.mvx = 0;
        } else if (v[1] != null) this.mvx = v[1];
      });
      if (m.proj && f === m.proj.f) battle.spawnProj(this, m.proj);
      if (m.tele) {
        if (f === m.tele.f0) { this.invis = true; battle.ev({ t: 'tele', who: this.idx, x: this.x }); }
        if (f === m.tele.f1) { this.invis = false; battle.teleport(this, m.tele.to); }
      }
      if (m.grab && f >= m.grab.f0 && f <= m.grab.f1) battle.tryGrab(this, m);
      if (this.state !== 'move' || this.move !== m) return; // heitto tai muu keskeytti
      if (!m.airborne && !m.air && f >= m.len) this.set('stand');
      else if (m.air && f >= m.len) { this.move = null; this.state = 'air'; this.sf = 0; }
    }

    burnout(battle) {
      if (this.burn) return;
      this.burn = true; this.jaks = 0;
      battle.ev({ t: 'burnout', who: this.idx, x: this.x });
    }

    physics(battle) {
      if (this.state === 'thrown' || this.state === 'cine' || this.state === 'cineAtk') return;
      if (this.airborne) {
        this.vy -= this.g;
        this.y += this.vy;
        this.x += this.vx;
        if (this.y <= 0 && this.vy < 0) { this.y = 0; this.vy = 0; this.vx = 0; this.airborne = false; this.land(battle); }
      } else {
        this.x += this.mvx * this.facing;
      }
      this.x += this.pvx;
      this.pvx *= this.airborne ? 0.95 : C.FRICTION;
      if (Math.abs(this.pvx) < 0.1) this.pvx = 0;
    }

    land(battle) {
      const s = this.state;
      battle.ev({ t: 'land', who: this.idx, x: this.x, hard: s === 'juggle' || s === 'ko' });
      if (s === 'air') { this.set('land'); this.landT = 3; }
      else if (s === 'move') {
        const m = this.move;
        this.landT = m.air ? 3 : (m.landRec || 4);
        this.set('land');
      } else if (s === 'juggle') {
        if (this.airReset) { this.set('land'); this.landT = 8; }
        else this.set('down');
      } else if (s === 'ko') { this.state = 'koDown'; this.sf = 0; }
      else { this.set('land'); this.landT = 3; }
    }

    // Osumalaatikot maailmakoordinaateissa. Tyhjä taulukko = haavoittumaton iskuille.
    hurtboxes() {
      const s = this.state;
      if (s === 'down' || s === 'getup' || s === 'ko' || s === 'koDown' || s === 'thrown' || s === 'cine' || s === 'cineAtk' || s === 'throwing' || this.invis) return [];
      if (s === 'dash' && this.dashDir < 0 && this.sf <= 8) return [];
      let key = 'stand';
      if (this.airborne) key = 'air';
      else if (s === 'move') key = this.move.hurt;
      else if (s === 'rest') key = 'crouch';
      else if (this.crouching && (s === 'stand' || s === 'hit' || s === 'block')) key = 'crouch';
      if (s === 'move' && this.move.inv && this.mf >= this.move.inv[0] && this.mf <= this.move.inv[1]) return [];
      const sz = this.ch.size;
      const out = EK.HURT[key].map(b => this.toWorld(b, sz));
      // Iskevä raaja on haavoittuva aktiivisten ja palautumisruutujen aikana
      if (s === 'move' && this.move.kind === 'normal' && this.mf >= this.move.st) {
        const h = this.move.hits[0];
        out.push(this.toWorld({ x0: h.hb.x0, x1: h.hb.x1 - 10, y0: h.hb.y0 + 4, y1: h.hb.y1 - 4 }, 1));
      }
      return out;
    }

    toWorld(b, sz) {
      sz = sz || 1;
      const y0 = this.y + b.y0 * sz, y1 = this.y + b.y1 * sz;
      return this.facing > 0 ? { x0: this.x + b.x0, x1: this.x + b.x1, y0, y1 } : { x0: this.x - b.x1, x1: this.x - b.x0, y0, y1 };
    }

    // Voiko torjua juuri nyt (ei hyökkäämässä, maassa)
    canBlock() {
      const s = this.state;
      return (s === 'stand' || s === 'block') && !this.airborne;
    }
    holdingBack() { const d = this.dir; return d === 4 || d === 1; }

    // Piirtoa varten: asento ja sen vaihe
    poseInfo() {
      return { state: this.state, sf: this.sf, move: this.move, mf: this.mf };
    }
  }

  EK.Fighter = Fighter;
  EK.BLANK = BLANK;
})();
