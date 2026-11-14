/* Elämänkoulu – tietokonevastustaja.
   Tekoäly "painaa nappeja" samalla tavalla kuin pelaaja: se tuottaa virtuaalisen syötteen ruutu kerrallaan,
   joten myös liikesarjojen tunnistus testautuu. Vaikeustaso (EK.DIFF) säätää reaktioaikaa ja todennäköisyyksiä. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U;

  const MOTION = {
    s1: [2, 3, 6], s2: [6, 2, 3], s3: [2, 1, 4]
  };

  class AI {
    constructor(battle, idx, diff, seed) {
      this.b = battle; this.idx = idx;
      this.D = EK.DIFF[U.clamp(diff | 0, 0, EK.DIFF.length - 1)];
      this.r = U.rng(seed || (idx + 1) * 7919);
      this.q = [];            // tulevien ruutujen syötteet
      this.hold = 5;          // pidettävä suunta, kun jono on tyhjä
      this.holdT = 0;
      this.blockFor = null;   // vastustajan liike, jota vastaan torjunta on jo päätetty
      this.blockDecision = false;
      this.cool = 0;
      this.mode = 'neutral';
      this.me = battle.f[idx];
      this.ch = this.me.ch;
      // valitaan hahmon erikoisliikkeistä roolit
      const slots = ['s1', 's2', 's3'];
      this.slotOf = t => slots.filter(s => this.ch[s].type === t);
      this.projSlot = this.slotOf('proj')[0] || null;
      this.riseSlot = this.slotOf('rise')[0] || null;
      this.rushSlot = this.slotOf('rush')[0] || this.slotOf('spin')[0] || null;
      this.grabSlot = this.slotOf('grab')[0] || null;
      this.teleSlot = this.slotOf('tele')[0] || null;
      this.counterSlot = this.slotOf('counter')[0] || null;
      this.hopSlot = this.slotOf('hop')[0] || null;
      this.ender = this.rushSlot || this.projSlot || this.riseSlot;
    }

    // suunta suhteessa katseeseen → painikkeet
    toInput(fr) {
      const f = this.me.facing;
      const d = fr.d || 5;
      const h = ((d - 1) % 3) - 1;          // -1 taakse, 0, +1 eteen
      const v = d >= 7 ? 1 : d <= 3 ? -1 : 0;
      const inp = { u: v > 0, d: v < 0, l: false, r: false, L: false, M: false, H: false, S: false, P: !!fr.P };
      const fw = h * f;
      inp.r = fw > 0; inp.l = fw < 0;
      (fr.b || []).forEach(k => { inp[k] = true; });
      return inp;
    }

    push(frames) { this.q.push.apply(this.q, frames); }
    wait(n, d) { const a = []; for (let i = 0; i < n; i++) a.push({ d: d || 5 }); return a; }
    motion(slot, btn) {
      const m = MOTION[slot];
      return [{ d: m[0] }, { d: m[1] }, { d: m[2], b: [btn] }, { d: 5 }];
    }
    superMotion() { return [{ d: 2 }, { d: 3 }, { d: 6 }, { d: 2 }, { d: 3 }, { d: 6, b: ['H'] }, { d: 5 }]; }
    press(btn, d) { return [{ d: d || 5, b: [btn] }, { d: d || 5 }]; }

    input() {
      const b = this.b, me = this.me, o = b.opp(me);
      if (b.phase !== 'fight') { this.q.length = 0; return this.toInput({ d: 5 }); }
      if (this.cool > 0) this.cool--;
      // jonossa olevat ruudut ensin – paitsi jos saamme osuman: silloin jono tyhjennetään
      if (me.state === 'hit' || me.state === 'juggle' || me.state === 'thrown' || me.state === 'cine' || me.state === 'down') {
        this.q.length = 0;
        // torjunta-asento valmiiksi heti toipumisen jälkeen
        return this.toInput({ d: this.r() < this.D.block ? 4 : 5 });
      }
      if (me.state === 'block') {
        this.q.length = 0;
        const low = o.state === 'move' && o.move.hits.some(h => h.lvl === 'low');
        return this.toInput({ d: low ? 1 : 4 });
      }
      if (this.q.length) return this.toInput(this.q.shift());
      this.think(o);
      if (this.q.length) return this.toInput(this.q.shift());
      if (this.holdT > 0) { this.holdT--; return this.toInput({ d: this.hold, P: this.holdP }); }
      this.holdP = false;
      return this.toInput({ d: 5 });
    }

    // Päätöksenteko
    think(o) {
      const b = this.b, me = this.me, D = this.D, r = this.r;
      const dist = Math.abs(o.x - me.x);
      const toward = Math.sign(o.x - me.x);
      if (me.state === 'air') {
        // hyppyhyökkäys laskeutuessa
        if (!me.airAct && me.vy < 2 && dist < 120 && me.y < 120 && r() < 0.5 + D.combo * 0.4) this.push(this.press(r() < 0.7 ? 'H' : 'M'));
        return;
      }
      if (!me.actionable() && me.state !== 'stand') return;

      // 1) torjunta: vastustajan uusi liike
      if (o.state === 'move' && o.move.hits.length) {
        if (this.blockFor !== o.move || o.mf < 3) {
          if (this.blockFor !== o.move) { this.blockFor = o.move; this.blockDecision = r() < D.block; }
        }
        const reach = Math.max.apply(null, o.move.hits.map(h => h.hb.x1)) + 60 + (o.move.vel ? 120 : 0);
        if (this.blockDecision && dist < reach && o.mf <= o.move.last) {
          const low = o.move.hits.some(h => h.lvl === 'low');
          const over = o.move.hits.some(h => h.lvl === 'over');
          // joskus Hengitä-torjunta
          if (!me.burn && me.jaks > 260 && r() < 0.06 + D.block * 0.06) { this.push([{ d: 5, P: true }, { d: 5, P: true }]); this.hold = 5; this.holdT = 10; this.holdP = true; return; }
          this.hold = low ? 1 : over ? 4 : (r() < 0.5 ? 1 : 4); this.holdT = 6;
          return;
        }
      }
      // ilmasta tuleva vastustaja
      const approaching = Math.sign(o.vx || 0) === -toward || dist < 110;
      if (o.airborne && o.state !== 'juggle' && o.state !== 'ko' && dist < 230 && approaching && o.vy < 6) {
        if (r() < D.aa) {
          if (this.riseSlot) this.push(this.motion(this.riseSlot, 'H'));
          else this.push(this.press('H', 5));
          return;
        }
        if (r() < D.block) { this.hold = 4; this.holdT = 14; return; }
      }
      // ammus tulossa
      const pr = b.projs.find(p => p.owner !== me.idx && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(p.x - me.x) < 340);
      if (pr) {
        // yksi päätös ammusta kohden; ajoitus törmäykseen jäljellä olevan ajan mukaan
        const pd = Math.abs(pr.x - me.x) - 30;
        const tti = pd / Math.max(1, Math.abs(pr.vx));
        if (this.projFor !== pr) { this.projFor = pr; this.projOk = r() < D.block; this.projPlan = r(); }
        if (this.projOk) {
          const roll = this.projPlan;
          if (!pr.sup && !pr.g && roll < 0.38 && tti > 8 && tti < 22 && dist < 430) { this.push([{ d: 9 }, { d: 9 }, { d: 9 }]); this.cool = 10; return; }
          if (roll < 0.38 && tti >= 22) return; // odotetaan hyppyhetkeä
          if (roll < 0.5 && this.projSlot && tti > 16) { this.push(this.motion(this.projSlot, 'M')); this.cool = 20; return; }
          if (roll < 0.58 && this.teleSlot && tti > 12) { this.push(this.motion(this.teleSlot, 'M')); return; }
          if (roll < 0.66 && !me.burn && me.jaks > 200 && tti < 7) { this.push([{ d: 5, P: true }]); this.hold = 5; this.holdT = 14; this.holdP = true; return; }
          if (tti < 16) { this.hold = pr.lvl === 'low' ? 1 : 4; this.holdT = Math.ceil(tti) + 8; return; }
          return; // odotetaan torjuntahetkeä – ei hyökätä ammuksen eteen
        }
      }
      // vastustaja heitti juuri ammuksen: hyppy yli ja päälle
      if (o.state === 'move' && o.move.proj && !o.move.proj.sup && o.mf <= o.move.proj.f + 2 && dist > 150 && dist < 360 && r() < D.punish * 0.5) {
        this.push([{ d: 9 }, { d: 9 }, { d: 9 }]); this.cool = 10; return;
      }
      // 2) rankaisu: vastustaja palautumassa tai jähmettynyt
      const recovering = (o.state === 'move' && o.mf > o.move.last + 2 && o.move.len - o.mf > 8) || (o.state === 'land' && o.landT > 8 && o.sf < o.landT - 6) || o.state === 'stagger' || o.state === 'rest';
      if (recovering && dist < 150 && r() < D.punish) {
        this.combo(true);
        return;
      }
      // neutraali päätös vain, kun edellinen on pidetty loppuun
      if (this.cool > 0 || this.holdT > 0) return;

      // 3) neutraali peli etäisyyden mukaan
      const aggr = D.aggr;
      if (me.jaks < 200 && dist > 420 && !b.projs.length && r() < 0.5) {
        // lepohetki turvallisella etäisyydellä
        this.push([{ d: 2, P: true }]); this.hold = 2; this.holdP = true; this.holdT = 40 + r.int(30); return;
      }
      if (me.meter >= C.METER && dist < 140 && r() < 0.1 * D.combo) { this.push(this.superMotion()); this.cool = 20; return; }
      if (dist > 360) {
        const roll = r();
        if (this.projSlot && roll < 0.18 + (1 - aggr) * 0.2) { this.push(this.motion(this.projSlot, r.pick(['L', 'M', 'H']))); this.cool = 30; return; }
        if (roll < 0.4 && !b.projs.some(p => p.owner !== me.idx)) { this.push([{ d: 6 }, { d: 5 }, { d: 6 }]); this.holdT = 0; return; }
        this.hold = 6; this.holdT = 10 + r.int(20); return;
      }
      if (dist > 150) {
        const roll = r();
        if (roll < 0.12 * aggr) { this.push([{ d: 9 }, { d: 9 }, { d: 9 }, ...this.wait(20, 5)]); return; }
        if (this.rushSlot && this.ch[this.rushSlot].type === 'rush' && roll < 0.2 && dist < 260) { this.push(this.motion(this.rushSlot, dist > 200 ? 'H' : 'M')); this.cool = 16; return; }
        if (this.projSlot && roll < 0.27) { this.push(this.motion(this.projSlot, 'M')); this.cool = 30; return; }
        if (roll < 0.36) { this.push(this.press('M', 2)); return; }
        if (roll < 0.42 && this.hopSlot) { this.push(this.motion(this.hopSlot, 'M')); this.cool = 14; return; }
        if (roll < 0.5) { this.hold = 4; this.holdT = 8 + r.int(12); return; }
        this.hold = 6; this.holdT = 8 + r.int(16 * aggr + 4); return;
      }
      // lähietäisyys
      const roll = r();
      if (roll < 0.22 * aggr + 0.1) { this.combo(false); return; }
      if (roll < 0.34) {
        if (this.grabSlot) this.push(this.motion(this.grabSlot, r.pick(['L', 'M', 'H'])));
        else this.push([{ d: 6, b: ['L', 'M'] }, { d: 5 }]);
        this.cool = 10; return;
      }
      if (roll < 0.44) { this.push(this.press('L', 2)); this.push(this.wait(6, 2)); return; }
      if (roll < 0.5 && this.counterSlot && o.state === 'move') { this.push(this.motion(this.counterSlot, 'M')); return; }
      if (roll < 0.58) { this.push(this.press('M', 6)); return; }   // yläisku
      if (roll < 0.66) { this.push([{ d: 7 }, { d: 7 }]); return; }
      this.hold = r() < 0.5 ? 1 : 4; this.holdT = 10 + r.int(14);
    }

    // Yhdistelmä: ketju ja erikoisliike loppuun (taso määrää, osaako kumota)
    combo(punish) {
      const r = this.r, D = this.D, me = this.me;
      if (r() < D.mistake) { this.push(this.press('H', 5)); return; }
      const end = () => {
        if (me.meter >= C.METER && r() < (punish ? 0.6 : 0.3)) return this.superMotion();
        if (r() > D.combo) return [];
        if (this.ender) return this.motion(this.ender, 'H');
        return [];
      };
      const kind = r();
      if (kind < 0.45) {
        // Matala potku → erikoisliike
        this.push([{ d: 2, b: ['M'] }, { d: 2 }, { d: 2 }, { d: 2 }]);
        this.push(end());
      } else if (kind < 0.8) {
        // Nopea → Keskitaso → Iso → erikoisliike
        this.push([{ d: 5, b: ['L'] }, ...this.wait(5), { d: 5, b: ['M'] }, ...this.wait(7)]);
        if (r() < D.combo) this.push([{ d: 5, b: ['H'] }, ...this.wait(6)]);
        this.push(end());
      } else {
        // Iso isku ja erikoisliike suoraan
        this.push([{ d: 5, b: ['H'] }, ...this.wait(7)]);
        this.push(end());
      }
      this.cool = 12;
    }
  }

  EK.AI = AI;
})();
