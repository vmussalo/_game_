/* Elämänkoulu – näkymät: aloitus, hahmovalinta, vastakkainasettelu, ottelu, tulos, pelihallin loppu,
   Opetuskirja, ohjeet ja asetukset. Valikot toimivat näppäimistöllä, ohjaimella ja kosketuksella. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U, T = EK.T;
  const W = C.W, H = C.H;
  const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
  const INK = '#1b1622';

  const G = EK.Game = {
    scene: null, name: '', t: 0, hits: [],
    settings: Object.assign({ diff: 1, modern: [false, false], hitbox: false, dummy: 'stand', trainInf: true }, U.load('settings', {})),
    lessons: U.load('lessons', {}),
    unlocked: U.load('unlocked', false) || !!U.params.all,
    arcade: null
  };
  G.saveSettings = () => U.save('settings', G.settings);
  G.learn = (id, i) => { const k = id + ':' + i; if (!G.lessons[k]) { G.lessons[k] = 1; U.save('lessons', G.lessons); return true; } return false; };
  G.lessonCount = () => Object.keys(G.lessons).length;
  G.lessonTotal = () => EK.CHARS.length * 7;

  G.go = function (name, data) {
    G.name = name; G.t = 0;
    G.scene = SCENES[name];
    G.hits = [];
    if (G.scene.enter) G.scene.enter(data || {});
    document.documentElement.setAttribute('data-scene', name);
  };

  // ---------- piirtoapuja ----------
  function txt(ctx, s, x, y, size, col, align, outline) {
    ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textAlign = align || 'left';
    if (outline !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = INK; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
  }
  function para(ctx, s, x, y, w, size, col, lh, align) {
    ctx.font = size + 'px ' + FONT; ctx.fillStyle = col || '#fff'; ctx.textAlign = align || 'left';
    const lines = U.wrap(ctx, s, w);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * (lh || size * 1.35)));
    return lines.length * (lh || size * 1.35);
  }
  function panel(ctx, x, y, w, h, col, r) {
    ctx.fillStyle = col || 'rgba(20,14,30,0.82)'; EK.roundRect(ctx, x, y, w, h, r || 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  }
  function bg(ctx, t, c1, c2) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c1 || '#2a1840'); g.addColorStop(1, c2 || '#13283a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { const x = ((i * 173 + t * (0.3 + i % 3 * 0.2)) % (W + 200)) - 100; ctx.beginPath(); ctx.arc(x, (i * 97) % H, 30 + (i * 13) % 50, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function hit(x, y, w, h, fn, hover) { G.hits.push({ x, y, w, h, fn, hover }); }

  // Pystysuuntainen valikko
  function menu(ctx, items, sel, x, y, w, opts) {
    opts = opts || {};
    const ih = opts.ih || 44;
    items.forEach((it, i) => {
      const yy = y + i * ih;
      const on = i === sel;
      ctx.fillStyle = on ? (opts.hl || '#ffcf3a') : 'rgba(255,255,255,0.08)';
      EK.roundRect(ctx, x, yy, w, ih - 8, 10); ctx.fill();
      if (on) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = on ? INK : '#fff';
      ctx.fillText(it.label, x + 18, yy + ih / 2 + 3);
      if (it.value != null) { ctx.textAlign = 'right'; ctx.fillText('‹ ' + it.value + ' ›', x + w - 16, yy + ih / 2 + 3); }
      hit(x, yy, w, ih - 8, () => { if (opts.onClick) opts.onClick(i); }, () => { if (opts.onHover) opts.onHover(i); });
    });
  }
  function navList(m, sel, n) {
    if (m.up) { EK.Audio.play('blip'); return (sel + n - 1) % n; }
    if (m.down) { EK.Audio.play('blip'); return (sel + 1) % n; }
    return sel;
  }

  // Hahmon kuva (rintakuva tai koko hahmo)
  function figure(ctx, ch, x, y, s, pose, opts) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * ch.size * ((opts && opts.flip) ? -1 : 1), s * ch.size);
    EK.drawChar(ctx, ch, EK.POSES[pose || 'stance'], Object.assign({ cane: true }, opts || {}));
    ctx.restore();
  }
  G.figure = figure;

  function bust(ctx, ch, x, y, w, h, opts) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, U.shade(ch.look.top, -0.3)); g.addColorStop(1, U.shade(ch.look.top, -0.65));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (opts && opts.locked) { ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, h); }
    ctx.save();
    if (opts && opts.locked) ctx.filter = 'brightness(0)';
    const k = 1.3 * (w / 110);
    figure(ctx, ch, x + w / 2 - 4, y + 12 + 190 * ch.size * k, k / ch.size * Math.sqrt(ch.size), 'stance', { flip: opts && opts.flip });
    ctx.restore();
    ctx.restore();
    if (opts && opts.locked) txt(ctx, '?', x + w / 2, y + h / 2 + 14, 40, '#888', 'center');
  }

  const STR_C = { s1: '↓↘→ + isku', s2: '→↓↘ + isku', s3: '↓↙← + isku', sup: 'Erikois + Iso yhtä aikaa (tai ↓↘→↓↘→ + isku)' };
  const STR_M = { s1: 'Erikois', s2: '→ + Erikois', s3: '↓ + Erikois', sup: 'Erikois + Iso yhtä aikaa' };
  G.moveList = function (ch, modern) {
    const N = modern ? STR_M : STR_C;
    return [
      { name: ch.s1.name, cmd: N.s1 }, { name: ch.s2.name, cmd: N.s2 }, { name: ch.s3.name, cmd: N.s3 },
      { name: ch.sup.name + ' (OIVALLUS, vaatii täyden mittarin)', cmd: N.sup }
    ];
  };

  // ---------- ohjaajat ----------
  function dummy(b, idx, mode) {
    const me = b.f[idx];
    const ai = new EK.AI(b, idx, G.settings.diff, 77);
    return {
      input() {
        const o = b.opp(me);
        const back = { u: 0, d: 0, l: me.facing > 0 ? 1 : 0, r: me.facing < 0 ? 1 : 0, L: 0, M: 0, H: 0, S: 0, P: 0 };
        if (mode === 'cpu') return ai.input();
        if (mode === 'block') {
          const low = o.state === 'move' && o.move.hits.some(h => h.lvl === 'low');
          back.d = low ? 1 : 0;
          return back;
        }
        if (mode === 'jump') return { u: me.state === 'stand' && b.frame % 60 < 2 ? 1 : 0 };
        if (mode === 'parry') return { P: b.threatened(me) || me.state === 'parry' ? 1 : 0 };
        if (mode === 'crouch') return { d: 1 };
        return EK.BLANK;
      }
    };
  }

  // ---------- näkymät ----------
  const SCENES = {};

  SCENES.title = {
    items: ['Pelihalli', 'Kaksinpeli', 'Harjoittelu', 'Katsojatila', 'Opetuskirja', 'Ohjeet', 'Asetukset'],
    enter() { this.sel = this.sel || 0; this.pair = [U.rng(Date.now() | 0).int(7), 0]; this.pair[1] = (this.pair[0] + 3) % 7; EK.Audio.startMusic('menu'); },
    pick(i) {
      EK.Audio.play('select');
      const k = this.items[i];
      if (k === 'Pelihalli') G.go('select', { mode: 'arcade' });
      if (k === 'Kaksinpeli') G.go('select', { mode: 'versus' });
      if (k === 'Harjoittelu') G.go('select', { mode: 'training' });
      if (k === 'Katsojatila') G.go('select', { mode: 'watch' });
      if (k === 'Opetuskirja') G.go('book');
      if (k === 'Ohjeet') G.go('help');
      if (k === 'Asetukset') G.go('settings');
    },
    update(m) {
      this.sel = navList(m, this.sel, this.items.length);
      if (m.ok) this.pick(this.sel);
    },
    draw(ctx, t) {
      bg(ctx, t, '#3a1650', '#0f2a3a');
      // taustalla kaksi hahmoa
      const a = EK.CHARS[this.pair[0]], b = EK.CHARS[this.pair[1]];
      ctx.save(); ctx.globalAlpha = 0.9;
      figure(ctx, a, 150, 520, 1.6, 'stance');
      figure(ctx, b, 820, 520, 1.6, 'stance', { flip: true });
      ctx.restore();
      ctx.save(); ctx.translate(W / 2, 112); ctx.rotate(-0.03);
      txt(ctx, T.title, 0, 0, 76, '#ffcf3a', 'center');
      ctx.restore();
      txt(ctx, T.subtitle, W / 2, 150, 20, '#fff', 'center');
      menu(ctx, this.items.map(l => ({ label: l })), this.sel, W / 2 - 150, 178, 300, { onClick: i => this.pick(i), onHover: i => { this.sel = i; } });
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center';
      ctx.fillText('Opetuskirjassa ' + G.lessonCount() + ' / ' + G.lessonTotal() + ' elämänohjetta  ·  Enter = valitse  ·  Esc = takaisin', W / 2, H - 14);
    }
  };

  SCENES.select = {
    enter(d) {
      this.mode = d.mode;
      this.cur = [U.load('lastChar', 0), 1];
      this.done = [false, false];
      this.modern = G.settings.modern.slice();
      this.two = this.mode === 'versus';
      this.needP2 = this.mode !== 'arcade';
      this.step = 0; // yksinpelissä: 0 = oma hahmo, 1 = vastustaja/nukke
      EK.Input.versus = this.two;
      if (this.mode === 'watch') this.modern = [false, false];
    },
    avail(i) { return !EK.CHARS[i].boss || G.unlocked; },
    move(p, dx, dy) {
      let c = this.cur[p];
      for (let k = 0; k < 8; k++) {
        const col = c % 4, row = Math.floor(c / 4);
        c = ((row + dy + 2) % 2) * 4 + ((col + dx + 4) % 4);
        if (this.avail(c)) break;
      }
      this.cur[p] = c; EK.Audio.play('blip');
    },
    confirm(p) {
      if (!this.avail(this.cur[p])) { EK.Audio.play('deny'); return; }
      EK.Audio.play('select');
      if (this.two) { this.done[p] = true; if (this.done[0] && this.done[1]) this.start(); return; }
      if (this.step === 0) {
        this.done[0] = true;
        U.save('lastChar', this.cur[0]);
        if (!this.needP2) { this.start(); return; }
        this.step = 1; this.cur[1] = (this.cur[0] + 1) % 7;
      } else { this.done[1] = true; this.start(); }
    },
    start() {
      const p1 = EK.CHARS[this.cur[0]].id, p2 = EK.CHARS[this.cur[1]].id;
      G.settings.modern = this.modern.slice(); G.saveSettings();
      if (this.mode === 'arcade') return G.startArcade(p1, this.modern[0]);
      const ctrl = this.mode === 'versus' ? [null, null] : this.mode === 'training' ? [null, 'dummy'] : ['cpu', 'cpu'];
      G.go('vs', { p1, p2, ctrl, mode: this.mode, modern: this.modern, stage: EK.CHARS[this.cur[1]].stage });
    },
    update(m) {
      if (this.two) {
        [['p1', 0], ['p2', 1]].forEach(([k, p]) => {
          if (this.done[p]) { if (m[k + 'back']) { this.done[p] = false; EK.Audio.play('back'); } return; }
          if (m[k + 'left']) this.move(p, -1, 0); if (m[k + 'right']) this.move(p, 1, 0);
          if (m[k + 'up']) this.move(p, 0, -1); if (m[k + 'down']) this.move(p, 0, 1);
          if (m[k + 'ok']) this.confirm(p);
          if (m['mode' + (p + 1)]) { this.modern[p] = !this.modern[p]; EK.Audio.play('blip'); }
        });
        if (m.pause && !this.done[0] && !this.done[1]) { EK.Input.versus = false; G.go('title'); }
        return;
      }
      const p = this.step;
      if (m.left) this.move(p, -1, 0); if (m.right) this.move(p, 1, 0);
      if (m.up) this.move(p, 0, -1); if (m.down) this.move(p, 0, 1);
      if (m.ok) this.confirm(p);
      if ((m.mode1 || m.mode2) && this.mode !== 'watch') { this.modern[0] = !this.modern[0]; EK.Audio.play('blip'); }
      if (m.back) { EK.Audio.play('back'); if (this.step === 1) { this.step = 0; this.done[0] = false; } else G.go('title'); }
    },
    draw(ctx, t) {
      bg(ctx, t, '#22163a', '#14303a');
      const title = { arcade: 'PELIHALLI – valitse hahmo', versus: 'KAKSINPELI', training: this.step ? 'HARJOITTELU – valitse nukke' : 'HARJOITTELU – valitse hahmo', watch: this.step ? 'KATSOJATILA – hahmo 2' : 'KATSOJATILA – hahmo 1' }[this.mode];
      txt(ctx, title, W / 2, 40, 28, '#ffcf3a', 'center');
      const gx = W / 2 - 2 * 116 + 4, gy = 62;
      EK.CHARS.forEach((c, i) => {
        const x = gx + (i % 4) * 116, y = gy + Math.floor(i / 4) * 116;
        bust(ctx, c, x, y, 108, 108, { locked: !this.avail(i) });
        [0, 1].forEach(p => {
          const active = this.two || p === this.step || (p === 0 && this.step === 1);
          if (this.cur[p] === i && active && (this.two || (p === this.step))) {
            ctx.strokeStyle = p === 0 ? '#ffcf3a' : '#6fd8ff'; ctx.lineWidth = 5; ctx.strokeRect(x - 2 + p * 4, y - 2 + p * 4, 112 - p * 8, 112 - p * 8);
            txt(ctx, p === 0 ? 'P1' : (this.two ? 'P2' : (this.mode === 'training' ? 'NUKKE' : 'CPU')), x + (p ? 100 : 8), y + 20, 15, p === 0 ? '#ffcf3a' : '#6fd8ff', p ? 'right' : 'left');
          }
        });
        hit(x, y, 108, 108, () => {
          const p = this.two ? 0 : this.step;
          if (this.cur[p] === i) this.confirm(p); else { this.cur[p] = i; EK.Audio.play('blip'); }
        });
      });
      // esittelypaneelit
      const shown = this.two ? [0, 1] : [this.step === 1 ? 1 : 0];
      shown.forEach((p, k) => {
        const c = EK.CHARS[this.cur[p]];
        const left = this.two ? p === 0 : true;
        const px = left ? 20 : W - 20 - 210;
        const lock = !this.avail(this.cur[p]);
        if (!this.two) {
          // yksinpelissä valittu hahmo vasemmalle, tiedot ruudukon alle
          const c0 = EK.CHARS[this.cur[0]];
          figure(ctx, c0, 128, 500, 1.35, this.done[0] ? 'winA' : 'stance');
          if (this.step === 1) figure(ctx, c, W - 128, 500, 1.35, 'stance', { flip: true });
          else if (this.mode === 'arcade') {
            ctx.save(); ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.45; figure(ctx, EK.CHAR.hannu, W - 128, 500, 1.35, 'stance', { flip: true }); ctx.restore();
            txt(ctx, 'Loppuvastus: ???', W - 128, 120, 15, '#aaa', 'center');
          }
          info(ctx, c, gx, 302, 456, lock, this.modern[0], this.mode !== 'watch' && this.step === 0);
        } else {
          figure(ctx, c, left ? 110 : W - 110, 280, 1.0, this.done[p] ? 'winA' : 'stance', { flip: !left });
          panel(ctx, px, 292, 210, 236);
          txt(ctx, lock ? '???' : c.name, px + 105, 318, 18, p === 0 ? '#ffcf3a' : '#6fd8ff', 'center');
          ctx.font = '13px ' + FONT; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center'; ctx.fillText(lock ? '' : c.title, px + 105, 336);
          stats(ctx, c, px + 14, 352, 182);
          txt(ctx, 'Ohjaus: ' + (this.modern[p] ? 'Moderni' : 'Klassinen'), px + 105, 470, 14, '#fff', 'center');
          ctx.font = '12px ' + FONT; ctx.fillStyle = '#aaa'; ctx.fillText(p === 0 ? 'vaihda: R' : 'vaihda: U / Num4', px + 105, 488);
          if (this.done[p]) txt(ctx, 'VALMIS!', px + 105, 516, 20, '#7cf0a0', 'center');
        }
      });
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.textAlign = 'center';
      ctx.fillText(this.two ? 'P1: WASD + F valitse · P2: nuolet + J valitse · Esc takaisin' : 'Nuolet/WASD valitse · Enter/J vahvista · U vaihda ohjaustapa · Esc takaisin', W / 2, H - 10);
    }
  };

  function stats(ctx, c, x, y, w) {
    const rows = [
      ['Kesto', (c.hp - 850) / 320], ['Vauhti', (c.walk - 2.2) / 1.9], ['Voima', (c.power - 0.85) / 0.38], ['Ulottuvuus', (c.reach - 0.9) / 0.42]
    ];
    rows.forEach((r, i) => {
      ctx.font = '13px ' + FONT; ctx.fillStyle = '#ddd'; ctx.textAlign = 'left'; ctx.fillText(r[0], x, y + 14 + i * 22);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 78, y + 4 + i * 22, w - 78, 12);
      ctx.fillStyle = '#ffcf3a'; ctx.fillRect(x + 78, y + 4 + i * 22, (w - 78) * U.clamp(r[1], 0.08, 1), 12);
    });
  }
  function info(ctx, c, x, y, w, lock, modern, showMode) {
    panel(ctx, x, y, w, 186);
    txt(ctx, lock ? '???' : c.name, x + 14, y + 30, 22, '#ffcf3a');
    ctx.font = '14px ' + FONT; ctx.fillStyle = '#ccc'; ctx.textAlign = 'left'; ctx.fillText(lock ? 'Voita pelihalli avataksesi' : c.title, x + 14, y + 50);
    if (!lock) para(ctx, c.style, x + 14, y + 72, w / 2 - 20, 13, '#eee', 17);
    stats(ctx, c, x + w / 2 + 6, y + 18, w / 2 - 20);
    if (!lock) G.moveList(c, modern).slice(0, 3).forEach((mv, i) => {
      ctx.font = '12px ' + FONT; ctx.fillStyle = '#ddd'; ctx.textAlign = 'left';
      ctx.fillText(mv.name + ':', x + w / 2 + 6, y + 126 + i * 17);
      ctx.fillStyle = '#ffcf3a'; ctx.textAlign = 'right'; ctx.fillText(mv.cmd, x + w - 14, y + 126 + i * 17);
    });
    if (showMode) {
      panel(ctx, x, y + 192, w, 30);
      txt(ctx, 'Ohjaus: ' + (modern ? 'Moderni (Erikois-nappi)' : 'Klassinen (liikesarjat)') + '  – vaihda U', x + w / 2, y + 213, 14, '#fff', 'center');
    }
  }

  // Pelihalli: vastustajat järjestyksessä, viimeisenä Hannu Hustle
  G.startArcade = function (p1, modern) {
    const r = U.rng(Date.now() | 0);
    let opp = U.shuffle(EK.CHARS.filter(c => !c.boss && c.id !== p1).map(c => c.id), r);
    opp = opp.slice(0, 6);
    opp.push(p1 === 'hannu' ? EK.CHARS[r.int(7)].id : 'hannu');
    G.arcade = { p1, modern, opp, n: 0, continues: 0, learned: [] };
    G.nextArcade();
  };
  G.nextArcade = function () {
    const a = G.arcade;
    const p2 = a.opp[a.n];
    const boss = a.n === a.opp.length - 1;
    const diff = Math.min(3, G.settings.diff + (a.n >= 4 || boss ? 1 : 0) - (a.n < 2 ? 1 : 0));
    G.go('vs', { p1: a.p1, p2, ctrl: [null, 'cpu'], mode: 'arcade', modern: [a.modern, false], diff: Math.max(0, diff), stage: EK.CHAR[p2].stage, boss, n: a.n + 1, of: a.opp.length });
  };

  SCENES.vs = {
    enter(d) { this.d = d; EK.Audio.play('round'); },
    update(m) {
      if (G.t > 150 || ((m.ok || m.back) && G.t > 20)) G.go('fight', this.d);
    },
    draw(ctx, t) {
      const a = EK.CHAR[this.d.p1], b = EK.CHAR[this.d.p2];
      ctx.fillStyle = U.shade(a.look.top, -0.5); ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = U.shade(b.look.top, -0.5);
      ctx.beginPath(); ctx.moveTo(W * 0.56, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.44, H); ctx.closePath(); ctx.fill();
      const k = Math.min(1, G.t / 20);
      figure(ctx, a, 200 - (1 - k) * 300, 500, 1.7, 'stance');
      figure(ctx, b, 760 + (1 - k) * 300, 500, 1.7, 'stance', { flip: true });
      txt(ctx, 'VS', W / 2, H / 2 + 20, 90 * (0.8 + 0.2 * Math.sin(t * 0.1)), '#ffcf3a', 'center');
      txt(ctx, a.name.toUpperCase(), 40, 60, 30, '#fff');
      txt(ctx, b.name.toUpperCase(), W - 40, 60, 30, '#fff', 'right');
      ctx.font = '15px ' + FONT; ctx.fillStyle = '#ddd'; ctx.textAlign = 'left'; ctx.fillText(a.title, 40, 82); ctx.textAlign = 'right'; ctx.fillText(b.title, W - 40, 82);
      if (this.d.mode === 'arcade') txt(ctx, 'OTTELU ' + this.d.n + ' / ' + this.d.of + (this.d.boss ? ' – LOPPUVASTUS' : ''), W / 2, 120, 20, '#fff', 'center');
      if (G.t > 25) EK.Render.bubble(ctx, W - 230, 170, '"' + EK.LINES[b.id].vs + '"', 300);
      if (this.d.boss && this.d.mode === 'arcade') { panel(ctx, 140, H - 90, W - 280, 64); para(ctx, 'Hannu Hustle odottaa loftissaan. Hän ei ole nukkunut viiteen vuoteen. Joku voisi opettaa hänelle jotain.', W / 2, H - 64, W - 320, 15, '#fff', 19, 'center'); }
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'center';
      ctx.fillText('Areena: ' + EK.STAGES[this.d.stage].name, W / 2, H - 12);
    }
  };

  SCENES.fight = {
    enter(d) {
      this.d = d;
      const seed = (U.params.seed | 0) || (Date.now() & 0xffff);
      this.b = new EK.Battle({ p1: d.p1, p2: d.p2, stage: d.stage, seed, modern: d.modern, training: d.mode === 'training', trainInf: G.settings.trainInf, noIntro: !!U.params.nointro });
      const diff = d.diff != null ? d.diff : G.settings.diff;
      this.ctrl = d.ctrl.map((c, i) => c === 'cpu' ? new EK.AI(this.b, i, diff, seed + i * 17) : c === 'dummy' ? dummy(this.b, i, G.settings.dummy) : null);
      this.paused = false; this.psel = 0; this.showList = false;
      this.endT = 0;
      EK.Render.reset(); EK.Render.hitbox = G.settings.hitbox || !!U.params.hitbox;
      EK.Audio.startMusic(this.b.stage);
      const touchy = EK.Input.touchUsed || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
      EK.Input.showTouch(touchy && d.mode !== 'watch');
      EK.Render.touchHud = touchy && d.mode !== 'watch';
      const pad = EK.Input.lastDevice === 'pad';
      const keys = d.mode === 'versus' ? ['R + H', 'U + L'] : [touchy ? 'OIVALLUS-nappi' : pad ? 'A + RB' : 'U + L', null];
      EK.Render.superKeys = this.ctrl.map((c, i) => c ? null : keys[i]);
      if (touchy && !this.ctrl[0]) this.b.f[0].modern = true;
      EK.Input.versus = d.mode === 'versus';
    },
    exit() { EK.Input.showTouch(false); },
    pauseItems() {
      const it = ['Jatka', 'Liikelista'];
      if (this.d.mode === 'training') it.push('Nukke: ' + DUMMY_N[G.settings.dummy], 'Osumalaatikot: ' + (EK.Render.hitbox ? 'näkyvissä' : 'piilossa'), 'Mittarit täynnä: ' + (G.settings.trainInf ? 'kyllä' : 'ei'), 'Alkuasemiin');
      it.push(this.d.mode === 'arcade' ? 'Luovuta ottelu' : 'Lopeta');
      return it;
    },
    pausePick(i) {
      const k = this.pauseItems()[i];
      EK.Audio.play('select');
      if (k === 'Jatka') this.paused = false;
      else if (k === 'Liikelista') this.showList = true;
      else if (k.indexOf('Nukke') === 0) {
        const keys = Object.keys(DUMMY_N); G.settings.dummy = keys[(keys.indexOf(G.settings.dummy) + 1) % keys.length]; G.saveSettings();
        this.ctrl[1] = dummy(this.b, 1, G.settings.dummy);
      } else if (k.indexOf('Osumalaatikot') === 0) { EK.Render.hitbox = !EK.Render.hitbox; G.settings.hitbox = EK.Render.hitbox; G.saveSettings(); }
      else if (k.indexOf('Mittarit') === 0) { G.settings.trainInf = !G.settings.trainInf; this.b.o.trainInf = G.settings.trainInf; G.saveSettings(); }
      else if (k === 'Alkuasemiin') { this.b.round = 0; this.b.startRound(); EK.Render.reset(); this.paused = false; }
      else { this.exit(); if (this.d.mode === 'arcade') G.go('continue'); else { EK.Input.versus = false; G.go('title'); } }
    },
    update(m) {
      if (this.showList) { if (m.ok || m.back || m.pause) { this.showList = false; EK.Audio.play('back'); } return; }
      if (this.paused) {
        const n = this.pauseItems().length;
        this.psel = navList(m, this.psel, n);
        if (m.ok) this.pausePick(this.psel);
        if (m.pause || m.back) this.paused = false;
        return;
      }
      if (m.pause && this.b.phase !== 'done') { this.paused = true; this.psel = 0; EK.Audio.play('back'); return; }
      const steps = Math.max(1, +(U.params.spd || 1));
      for (let s = 0; s < steps; s++) this.step();
    },
    step() {
      const b = this.b;
      const ins = EK.Input.players();
      const inA = this.ctrl[0] ? this.ctrl[0].input() : ins[0];
      const inB = this.ctrl[1] ? this.ctrl[1].input() : (this.d.mode === 'versus' ? ins[1] : EK.BLANK);
      b.step(inA, inB);
      EK.Render.events(b, b.events);
      EK.Audio.onEvents(b.events);
      b.events.length = 0;
      if (b.phase === 'done') {
        this.endT++;
        if (this.endT > 40) { this.exit(); G.go('result', { b, d: this.d }); }
      }
    },
    draw(ctx, t) {
      EK.Render.draw(ctx, this.b, t);
      if (this.d.mode === 'watch' && G.t < 240) txt(ctx, 'Katsojatila – Esc lopettaa', W / 2, H - 70, 14, '#fff', 'center');
      if (this.paused || this.showList) {
        ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.fillRect(0, 0, W, H);
        if (this.showList) return moveListPanel(ctx, this.b);
        txt(ctx, 'TAUKO', W / 2, 110, 40, '#ffcf3a', 'center');
        menu(ctx, this.pauseItems().map(l => ({ label: l })), this.psel, W / 2 - 180, 140, 360, { onClick: i => this.pausePick(i), onHover: i => { this.psel = i; } });
      }
    }
  };
  const DUMMY_N = { stand: 'seisoo', crouch: 'kyykkii', block: 'torjuu kaiken', parry: 'Hengittää', jump: 'hyppii', cpu: 'tietokone' };

  function moveListPanel(ctx, b) {
    panel(ctx, 60, 40, W - 120, H - 80);
    b.f.forEach((f, i) => {
      const x = 90 + i * 410;
      txt(ctx, f.ch.name, x, 80, 22, i ? '#6fd8ff' : '#ffcf3a');
      ctx.font = '13px ' + FONT; ctx.fillStyle = '#ccc'; ctx.textAlign = 'left'; ctx.fillText('Ohjaus: ' + (f.modern ? 'moderni' : 'klassinen'), x, 100);
      G.moveList(f.ch, f.modern).forEach((mv, k) => {
        txt(ctx, mv.name, x, 134 + k * 44, 16, '#fff', 'left', false);
        ctx.font = '14px ' + FONT; ctx.fillStyle = '#ffcf3a'; ctx.fillText(mv.cmd, x, 152 + k * 44);
      });
      ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = '#9fe8d0';
      ctx.fillText(EK.Input.versus ? (i ? 'Napit: Nopea J · Keski K · Iso L · Erikois U · Hengitä I' : 'Napit: Nopea F · Keski G · Iso H · Erikois R · Hengitä T') : 'Napit: Nopea J · Keski K · Iso L · Erikois U · Hengitä I', x, 312);
      const base = [['Heitto', 'Nopea + Keski yhtä aikaa'], ['Yläisku', '→ + Keski'], ['Hengitä', 'Hengitä-nappi (pidä)'], ['Lepohetki', '↓ + Hengitä (pidä)'], ['Syöksy', '→→ tai ←←']];
      base.forEach((r, k) => { ctx.font = '13px ' + FONT; ctx.fillStyle = '#ddd'; ctx.fillText(r[0] + ': ' + r[1], x, 336 + k * 20); });
    });
    ctx.font = '13px ' + FONT; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center'; ctx.fillText('Enter / Esc palaa', W / 2, H - 56);
    hit(0, 0, W, H, () => { G.scene.showList = false; });
  }

  SCENES.result = {
    enter(d) {
      this.b = d.b; this.d = d.d;
      const r = this.b.result;
      this.w = r.winner;
      this.human = this.d.ctrl[0] == null;
      const wf = this.w >= 0 ? this.b.f[this.w] : null;
      if (wf) {
        const L = EK.LINES[wf.ch.id];
        if (r.opetus) { this.quote = L.opetus; this.qi = 6; }
        else { this.qi = U.rng(this.b.frame + this.b.round).int(L.win.length); this.quote = L.win[this.qi]; }
        this.newLesson = this.d.mode !== 'watch' && G.learn(wf.ch.id, this.qi);
        if (G.arcade && this.d.mode === 'arcade') G.arcade.learned.push(this.quote);
      }
      this.sel = 0;
      EK.Audio.play(r.opetus ? 'opetus' : 'select');
    },
    items() {
      if (this.d.mode === 'arcade') return this.w === 0 ? ['Jatka'] : ['Yritä uudelleen', 'Lopeta'];
      if (this.d.mode === 'versus') return ['Uusintaottelu', 'Hahmovalinta', 'Päävalikko'];
      return ['Uudelleen', 'Päävalikko'];
    },
    pick(i) {
      const k = this.items()[i];
      EK.Audio.play('select');
      if (k === 'Jatka') {
        const a = G.arcade;
        a.n++;
        if (a.n >= a.opp.length) G.go('ending');
        else G.nextArcade();
      } else if (k === 'Yritä uudelleen') { G.arcade.continues++; G.nextArcade(); }
      else if (k === 'Uusintaottelu' || k === 'Uudelleen') G.go('fight', this.d);
      else if (k === 'Hahmovalinta') G.go('select', { mode: this.d.mode });
      else { EK.Input.versus = false; G.go('title'); }
    },
    update(m) {
      const n = this.items().length;
      this.sel = navList(m, this.sel, n);
      if (m.ok && G.t > 30) this.pick(this.sel);
    },
    draw(ctx, t) {
      EK.Render.draw(ctx, this.b, t, true);
      ctx.fillStyle = 'rgba(10,6,20,0.72)'; ctx.fillRect(0, 0, W, H);
      const r = this.b.result;
      if (this.w < 0) { txt(ctx, T.draw, W / 2, 200, 60, '#fff', 'center'); }
      else {
        const wf = this.b.f[this.w];
        figure(ctx, wf.ch, 190, 470, 1.6, wf.winPose ? 'winB' : 'winA');
        const head = this.d.mode === 'arcade' ? (this.w === 0 ? T.youWin : T.youLose) : wf.ch.name.toUpperCase() + ' VOITTAA';
        txt(ctx, head, 600, 80, 44, this.d.mode === 'arcade' && this.w !== 0 ? '#9fd0ff' : '#ffcf3a', 'center');
        panel(ctx, 360, 110, 540, 210, 'rgba(255,250,235,0.96)', 16);
        txt(ctx, r.opetus ? 'OPETUS' : 'ELÄMÄNOHJE', 384, 146, 18, r.opetus ? '#d9752a' : '#7a4bd8', 'left', false);
        ctx.font = 'italic 24px Georgia, serif'; ctx.fillStyle = INK; ctx.textAlign = 'left';
        U.wrap(ctx, '"' + this.quote + '"', 490).forEach((l, i) => ctx.fillText(l, 384, 186 + i * 32));
        ctx.font = '14px ' + FONT; ctx.fillStyle = '#555'; ctx.fillText('– ' + wf.ch.name + ', ' + wf.ch.title.toLowerCase(), 384, 300);
        if (this.newLesson) txt(ctx, 'Uusi ohje Opetuskirjaan! (' + G.lessonCount() + '/' + G.lessonTotal() + ')', 630, 345, 15, '#7cf0a0', 'center');
        if (this.d.mode === 'arcade' && this.w !== 0) para(ctx, 'Tappiokin opettaa. Ohje tallentui Opetuskirjaan.', 630, 372, 500, 14, '#ccc', 18, 'center');
      }
      menu(ctx, this.items().map(l => ({ label: l })), this.sel, 420, 400, 420, { ih: 44, onClick: i => this.pick(i), onHover: i => { this.sel = i; } });
    }
  };

  SCENES.continue = {
    enter() { this.sel = 0; },
    update(m) { this.sel = navList(m, this.sel, 2); if (m.ok) this.pick(this.sel); },
    pick(i) { EK.Audio.play('select'); if (i === 0) { G.arcade.continues++; G.nextArcade(); } else G.go('title'); },
    draw(ctx, t) {
      bg(ctx, t);
      txt(ctx, 'Jatketaanko?', W / 2, 180, 50, '#ffcf3a', 'center');
      para(ctx, 'Lepo on osa harjoittelua. Halutessasi voit yrittää samaa vastustajaa uudelleen.', W / 2, 230, 600, 17, '#ddd', 22, 'center');
      menu(ctx, [{ label: 'Yritä uudelleen' }, { label: 'Päävalikko' }], this.sel, W / 2 - 160, 290, 320, { onClick: i => this.pick(i), onHover: i => { this.sel = i; } });
    }
  };

  SCENES.ending = {
    enter() {
      const a = G.arcade;
      this.c = EK.CHAR[a.p1];
      this.first = !G.unlocked;
      G.unlocked = true; U.save('unlocked', true);
      this.page = 0;
    },
    update(m) {
      if ((m.ok || m.back) && G.t > 30) { EK.Audio.play('select'); this.page++; G.t = 0; if (this.page > 2) G.go('title'); }
    },
    draw(ctx, t) {
      bg(ctx, t, '#3a2a10', '#102a3a');
      const a = G.arcade;
      if (this.page === 0) {
        txt(ctx, 'Hannu Hustle oppi jotain', W / 2, 80, 34, '#ffcf3a', 'center');
        figure(ctx, EK.CHAR.hannu, 220, 470, 1.6, 'koSit');
        panel(ctx, 400, 140, 500, 240);
        para(ctx, T.bossDefeat, 424, 180, 452, 19, '#fff', 27);
      } else if (this.page === 1) {
        txt(ctx, this.c.name + ' – loppu', W / 2, 80, 34, '#ffcf3a', 'center');
        figure(ctx, this.c, 220, 470, 1.6, 'winA');
        panel(ctx, 400, 140, 500, 240);
        para(ctx, EK.LINES[this.c.id].ending, 424, 180, 452, 19, '#fff', 27);
      } else {
        txt(ctx, 'ELÄMÄNKOULU SUORITETTU', W / 2, 80, 38, '#ffcf3a', 'center');
        para(ctx, 'Opit tällä kierroksella ' + a.learned.length + ' elämänohjetta. Opetuskirjassa on nyt ' + G.lessonCount() + ' / ' + G.lessonTotal() + '.', W / 2, 130, 700, 18, '#fff', 24, 'center');
        a.learned.slice(-6).forEach((q, i) => para(ctx, '• ' + q, 120, 190 + i * 44, 720, 16, '#eee', 20));
        if (this.first) txt(ctx, 'Hannu Hustle on nyt pelattavissa!', W / 2, H - 40, 20, '#7cf0a0', 'center');
      }
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center'; ctx.fillText('Enter jatkaa', W / 2, H - 12);
      hit(0, 0, W, H, () => { if (G.t > 30) { this.page++; G.t = 0; if (this.page > 2) G.go('title'); } });
    }
  };

  SCENES.book = {
    enter() { this.sel = 0; },
    update(m) {
      if (m.left || m.up) { this.sel = (this.sel + 7) % 8; EK.Audio.play('blip'); }
      if (m.right || m.down) { this.sel = (this.sel + 1) % 8; EK.Audio.play('blip'); }
      if (m.back || m.pause) { EK.Audio.play('back'); G.go('title'); }
    },
    draw(ctx, t) {
      bg(ctx, t, '#2a2016', '#1a2a20');
      txt(ctx, 'OPETUSKIRJA', W / 2, 46, 34, '#ffcf3a', 'center');
      ctx.font = '14px ' + FONT; ctx.fillStyle = '#ddd'; ctx.textAlign = 'center';
      ctx.fillText('Elämänohjeet kertyvät otteluista: voittaja jakaa aina yhden. OPETUS-viimeistely paljastaa erikoisohjeen.', W / 2, 72);
      EK.CHARS.forEach((c, i) => {
        const x = 30 + i * 112, y = 90;
        bust(ctx, c, x, y, 100, 80, {});
        let n = 0; for (let k = 0; k < 7; k++) if (G.lessons[c.id + ':' + k]) n++;
        txt(ctx, n + '/7', x + 50, y + 98, 14, n === 7 ? '#7cf0a0' : '#fff', 'center');
        if (i === this.sel) { ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 4; ctx.strokeRect(x - 2, y - 2, 104, 84); }
        hit(x, y, 100, 100, () => { this.sel = i; EK.Audio.play('blip'); });
      });
      const c = EK.CHARS[this.sel];
      const L = EK.LINES[c.id];
      panel(ctx, 30, 210, W - 60, 300, 'rgba(255,250,235,0.95)');
      txt(ctx, c.name, 54, 242, 20, '#7a4bd8', 'left', false);
      L.win.concat([L.opetus]).forEach((q, k) => {
        const have = G.lessons[c.id + ':' + k];
        ctx.font = (k === 6 ? 'bold ' : '') + '16px ' + FONT; ctx.fillStyle = have ? INK : '#9a9a9a'; ctx.textAlign = 'left';
        ctx.fillText((k === 6 ? 'OPETUS: ' : (k + 1) + '. ') + (have ? q : '? ? ?'), 54, 274 + k * 33);
      });
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center'; ctx.fillText('←/→ selaa · Esc takaisin', W / 2, H - 10);
    }
  };

  const HELP = [
    { t: 'Ohjaus', lines: [
      'YKSINPELI: liiku WASD tai nuolet · Nopea J · Keski K · Iso L · Erikois U · Hengitä I · OIVALLUS (superliike) U + L',
      'KAKSINPELI: P1 = WASD + F G H, Erikois R, Hengitä T  ·  P2 = nuolet + J K L, Erikois U, Hengitä I (tai numeronäppäimet 1–5)',
      'PELIOHJAIN: X Nopea · Y Keski · RB Iso · A Erikois · B Hengitä · LB heitto · Start tauko',
      'KOSKETUS: vasemmalla ohjaussauva, oikealla napit. Kosketuksella käytetään modernia ohjausta.',
      'Esc tai Start = tauko ja liikelista.'] },
    { t: 'Perusteet', lines: [
      'Torju pitämällä suuntaa poispäin vastustajasta. ↙ torjuu matalat potkut, ← torjuu yläiskut ja hyppyhyökkäykset.',
      'Heitto: Nopea + Keski yhtä aikaa lähellä. Heitto menee torjunnan läpi. Pura heitto painamalla samaa heti.',
      'Syöksy: napauta →→ tai ←←. Taaksepäin syöksyn alku väistää iskut.',
      'Ketjut: Nopea → Keski → Iso osuman aikana. Perushyökkäyksen voi perua erikoisliikkeeksi, kun se osuu tai torjutaan.',
      'Vastaisku: osuma vastustajan liikkeen alkuun tekee enemmän vahinkoa. Rankaisu: osuma ohilyönnin palautumiseen.'] },
    { t: 'Jaksaminen ja Hengitä', lines: [
      'JAKSAMINEN (6 vihreää palkkia) kuluu, kun torjut iskuja tai pidät Hengitä-nappia pohjassa.',
      'HENGITÄ torjuu minkä tahansa iskun ja ammuksen. Jos ajoitat sen juuri osuman hetkelle, tulee TÄYSI RAUHA: hyökkääjä jähmettyy.',
      'UUPUMUS: jos Jaksaminen loppuu, torjunnat sattuvat ja Hengitä ei toimi, kunnes mittari palautuu puoleen.',
      'LEPOHETKI (↓ + Hengitä, pidä) palauttaa Jaksamista nopeasti, mutta olet silloin suojaton. Heitot ja iskut sattuvat enemmän.',
      'Kuten elämässä: lepää ennen kuin on pakko.'] },
    { t: 'OIVALLUS eli superliike', lines: [
      'OIVALLUS-mittari on vaaleanpunainen palkki ruudun alareunassa. Se täyttyy, kun lyöt, torjut tai saat osuman.',
      'Kun mittari on täynnä, siinä lukee OIVALLUS VALMIS! ja vieressä napit, joilla superliike tehdään.',
      'Paina ERIKOIS + ISO yhtä aikaa:  yksinpelissä U + L  ·  kaksinpelissä P1 R + H ja P2 U + L  ·  ohjaimella A + RB  ·  kosketuksella OIVALLUS-nappi.',
      'Tämä toimii sekä klassisella että modernilla ohjauksella. Klassisen ohjauksen vaihtoehto on ↓↘→↓↘→ + mikä tahansa isku.',
      'Superliike on aluksi haavoittumaton. Jos sillä ratkaisee ottelun, tulee OPETUS ja voittaja jakaa erityisen elämänohjeen.'] },
    { t: 'Erikoisliikkeet ja OPETUS', lines: [
      'KLASSINEN ohjaus: ↓↘→ + isku, →↓↘ + isku ja ↓↙← + isku. Isku valitsee voimakkuuden (Nopea/Keski/Iso).',
      'MODERNI ohjaus: Erikois-nappi yksin, → + Erikois tai ↓ + Erikois. Vahinko on 15 % pienempi.',
      'OIVALLUS-mittari täyttyy iskuista. Täysi mittari = superliike: Erikois + Iso yhtä aikaa (yksinpelissä U + L).',
      'OPETUS: jos ratkaiset ottelun superliikkeellä, voittaja jakaa erityisen elämänohjeen.',
      'Kaikki ohjeet tallentuvat Opetuskirjaan. Kerää kaikki 56!'] }
  ];
  SCENES.help = {
    enter() { this.p = 0; },
    update(m) {
      if (m.right || m.ok) { this.p = (this.p + 1) % HELP.length; EK.Audio.play('blip'); }
      if (m.left) { this.p = (this.p + HELP.length - 1) % HELP.length; EK.Audio.play('blip'); }
      if (m.back || m.pause) { EK.Audio.play('back'); G.go('title'); }
    },
    draw(ctx, t) {
      bg(ctx, t);
      const h = HELP[this.p];
      txt(ctx, 'OHJEET ' + (this.p + 1) + '/' + HELP.length + ': ' + h.t, W / 2, 56, 30, '#ffcf3a', 'center');
      panel(ctx, 50, 80, W - 100, 400);
      let y = 118;
      h.lines.forEach(l => { y += para(ctx, l, 76, y, W - 152, 17, '#fff', 23) + 14; });
      ctx.font = '13px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'center'; ctx.fillText('←/→ sivut · Esc takaisin', W / 2, H - 14);
      hit(0, 0, W, H, () => { this.p = (this.p + 1) % HELP.length; });
    }
  };

  SCENES.settings = {
    enter() { this.sel = 0; },
    items() {
      const s = G.settings;
      return [
        { label: 'Vaikeustaso', value: EK.DIFF[s.diff].name },
        { label: 'P1 ohjaustapa', value: s.modern[0] ? 'Moderni' : 'Klassinen' },
        { label: 'P2 ohjaustapa', value: s.modern[1] ? 'Moderni' : 'Klassinen' },
        { label: 'Äänitehosteet', value: EK.Audio.sfxOn ? 'päällä' : 'pois' },
        { label: 'Musiikki', value: EK.Audio.musicOn ? 'päällä' : 'pois' },
        { label: 'Osumalaatikot', value: s.hitbox ? 'näkyvissä' : 'piilossa' },
        { label: 'Takaisin' }
      ];
    },
    change(i, d) {
      const s = G.settings;
      if (i === 0) s.diff = (s.diff + d + EK.DIFF.length) % EK.DIFF.length;
      if (i === 1) s.modern[0] = !s.modern[0];
      if (i === 2) s.modern[1] = !s.modern[1];
      if (i === 3) EK.Audio.setSfx(!EK.Audio.sfxOn);
      if (i === 4) { EK.Audio.setMusic(!EK.Audio.musicOn); }
      if (i === 5) s.hitbox = !s.hitbox;
      if (i === 6) { G.go('title'); return; }
      G.saveSettings(); EK.Audio.play('blip');
    },
    update(m) {
      this.sel = navList(m, this.sel, 7);
      if (m.left) this.change(this.sel, -1);
      if (m.right || m.ok) this.change(this.sel, 1);
      if (m.back || m.pause) { EK.Audio.play('back'); G.go('title'); }
    },
    draw(ctx, t) {
      bg(ctx, t);
      txt(ctx, 'ASETUKSET', W / 2, 60, 34, '#ffcf3a', 'center');
      menu(ctx, this.items(), this.sel, W / 2 - 230, 90, 460, { onClick: i => { this.sel = i; this.change(i, 1); }, onHover: i => { this.sel = i; } });
      const d = EK.DIFF[G.settings.diff];
      para(ctx, 'Vaikeustaso vaikuttaa tietokoneen reaktioaikaan, torjuntaan ja yhdistelmiin. Pelihallin loppupäässä taso nousee yhdellä.', W / 2, 440, 620, 14, '#ccc', 19, 'center');
      ctx.font = '13px ' + FONT; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center'; ctx.fillText('Nykyinen taso: ' + d.name, W / 2, 490);
    }
  };

  G.SCENES = SCENES;
})();
