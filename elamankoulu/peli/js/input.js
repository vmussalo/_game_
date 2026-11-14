/* Elämänkoulu – ohjaus: näppäimistö, peliohjaimet ja kosketusnäyttö.
   Jokainen pelaaja saa ruudussa virtuaalisen syötteen {u,d,l,r,L,M,H,S,P}.
   L/M/H = nopea, keskitaso, iso isku. S = Erikois (moderni ohjaus). P = Hengitä. */
(function () {
  'use strict';
  const EK = window.EK;

  const I = EK.Input = {
    keys: new Set(),
    tapped: new Set(),      // ruudun aikana painetut (myös jo vapautetut) näppäimet
    touchLatch: {},         // samoin kosketusnapeille
    versus: false,
    touch: { u: 0, d: 0, l: 0, r: 0, L: 0, M: 0, H: 0, S: 0, P: 0 },
    touchUsed: false,
    prevMenu: {},
    menu: {},
    padPrev: [],
    lastDevice: 'kb'
  };

  // Näppäinasettelut
  const SOLO = {
    u: ['KeyW', 'ArrowUp'], d: ['KeyS', 'ArrowDown'], l: ['KeyA', 'ArrowLeft'], r: ['KeyD', 'ArrowRight'],
    L: ['KeyJ', 'Numpad1', 'KeyZ'], M: ['KeyK', 'Numpad2', 'KeyX'], H: ['KeyL', 'Numpad3', 'KeyC'],
    S: ['KeyU', 'Numpad4', 'KeyV', 'Space'], P: ['KeyI', 'Numpad5', 'KeyB']
  };
  const VS1 = {
    u: ['KeyW'], d: ['KeyS'], l: ['KeyA'], r: ['KeyD'],
    L: ['KeyF'], M: ['KeyG'], H: ['KeyH'], S: ['KeyR'], P: ['KeyT']
  };
  const VS2 = {
    u: ['ArrowUp'], d: ['ArrowDown'], l: ['ArrowLeft'], r: ['ArrowRight'],
    L: ['KeyJ', 'Numpad1'], M: ['KeyK', 'Numpad2'], H: ['KeyL', 'Numpad3'], S: ['KeyU', 'Numpad4'], P: ['KeyI', 'Numpad5']
  };
  I.LAYOUTS = { SOLO, VS1, VS2 };
  const GAME_KEYS = new Set([].concat(...Object.values(SOLO), ...Object.values(VS1), ...Object.values(VS2), ['Enter', 'Escape', 'Backspace', 'Tab', 'F2']));

  I.init = function (onAnyInput) {
    window.addEventListener('keydown', e => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) { I.keys.add(e.code); I.tapped.add(e.code); }
      I.lastDevice = 'kb';
      if (onAnyInput) onAnyInput();
    });
    window.addEventListener('keyup', e => { I.keys.delete(e.code); });
    window.addEventListener('blur', () => { I.keys.clear(); });
    initTouch();
  };

  function fromKeys(map) {
    const o = {};
    Object.keys(map).forEach(k => { o[k] = map[k].some(c => I.keys.has(c) || I.tapped.has(c)) ? 1 : 0; });
    return o;
  }
  function pads() {
    const out = [];
    try {
      const ps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < ps.length; i++) if (ps[i] && ps[i].connected) out.push(ps[i]);
    } catch (e) { /* ei ohjaimia */ }
    return out;
  }
  function fromPad(p) {
    const b = i => (p.buttons[i] && p.buttons[i].pressed) ? 1 : 0;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const o = {
      u: b(12) || ay < -0.5 ? 1 : 0, d: b(13) || ay > 0.5 ? 1 : 0, l: b(14) || ax < -0.5 ? 1 : 0, r: b(15) || ax > 0.5 ? 1 : 0,
      L: b(2) || b(4), M: b(3) || b(4), H: b(5) || b(7), S: b(0), P: b(1) || b(6), start: b(9), back: b(8)
    };
    if (o.u || o.d || o.l || o.r || o.L || o.M || o.H || o.S || o.P || o.start) I.lastDevice = 'pad';
    return o;
  }
  function merge(a, b) { const o = Object.assign({}, a); Object.keys(b).forEach(k => { o[k] = (o[k] || 0) | (b[k] || 0); }); return o; }

  // Pelaajien syötteet tälle ruudulle
  I.players = function () {
    const P = pads().map(fromPad);
    let p1, p2;
    if (!I.versus) {
      p1 = fromKeys(SOLO);
      P.forEach(p => { p1 = merge(p1, p); });
      p1 = merge(merge(p1, I.touch), I.touchLatch);
      p2 = fromKeys({});
    } else {
      p1 = fromKeys(VS1); p2 = fromKeys(VS2);
      if (P.length >= 2) { p1 = merge(p1, P[0]); p2 = merge(p2, P[1]); }
      else if (P.length === 1) p2 = merge(p2, P[0]);
      p1 = merge(merge(p1, I.touch), I.touchLatch);
    }

    // vastakkaiset suunnat kumoavat toisensa
    [p1, p2].forEach(p => { if (p.l && p.r) { p.l = p.r = 0; } if (p.u && p.d) { p.u = 0; } });
    return [p1, p2];
  };

  // Valikkojen painallukset (reunat): up/down/left/right/ok/back/pause + kumpi pelaaja painoi
  // Kutsutaan pääsilmukasta jokaisen ruudun lopuksi
  I.endFrame = function () { I.tapped.clear(); I.touchLatch = {}; };

  I.pollMenu = function () {
    const k = { has: c => I.keys.has(c) || I.tapped.has(c) };
    const cur = {
      up: k.has('ArrowUp') || k.has('KeyW'), down: k.has('ArrowDown') || k.has('KeyS'),
      left: k.has('ArrowLeft') || k.has('KeyA'), right: k.has('ArrowRight') || k.has('KeyD'),
      ok: k.has('Enter') || k.has('Space') || k.has('KeyJ') || k.has('KeyF') || k.has('NumpadEnter') || k.has('Numpad1'),
      back: k.has('Escape') || k.has('Backspace') || k.has('KeyK') || k.has('KeyG'),
      pause: k.has('Escape') || k.has('Tab'),
      p2up: k.has('ArrowUp'), p2down: k.has('ArrowDown'), p2left: k.has('ArrowLeft'), p2right: k.has('ArrowRight'),
      p2ok: k.has('KeyJ') || k.has('Numpad1') || k.has('Enter'), p2back: k.has('KeyK') || k.has('Numpad2'),
      p1up: k.has('KeyW'), p1down: k.has('KeyS'), p1left: k.has('KeyA'), p1right: k.has('KeyD'), p1ok: k.has('KeyF') || k.has('Space'), p1back: k.has('KeyG') || k.has('Escape'),
      mode1: k.has('KeyU') || k.has('KeyR'), mode2: k.has('KeyU') || k.has('Numpad4')
    };
    const P = pads().map(fromPad);
    P.forEach((p, i) => {
      cur.up = cur.up || p.u; cur.down = cur.down || p.d; cur.left = cur.left || p.l; cur.right = cur.right || p.r;
      cur.ok = cur.ok || p.S || p.L; cur.back = cur.back || p.P; cur.pause = cur.pause || p.start;
      const pre = (P.length >= 2 ? i === 0 : false) ? 'p1' : 'p2';
      cur[pre + 'up'] = cur[pre + 'up'] || p.u; cur[pre + 'down'] = cur[pre + 'down'] || p.d;
      cur[pre + 'left'] = cur[pre + 'left'] || p.l; cur[pre + 'right'] = cur[pre + 'right'] || p.r;
      cur[pre + 'ok'] = cur[pre + 'ok'] || p.S || p.L; cur[pre + 'back'] = cur[pre + 'back'] || p.P;
      cur[pre === 'p1' ? 'mode1' : 'mode2'] = cur[pre === 'p1' ? 'mode1' : 'mode2'] || p.M;
    });
    const out = {};
    Object.keys(cur).forEach(n => { out[n] = !!cur[n] && !I.prevMenu[n]; });
    I.prevMenu = cur;
    I.menu = out;
    return out;
  };

  // ---------- kosketusohjaus ----------
  function initTouch() {
    const el = document.getElementById('touch');
    if (!el) return;
    const stick = el.querySelector('.stick'), knob = el.querySelector('.knob');
    let stickId = null, cx = 0, cy = 0;
    const setDir = (dx, dy) => {
      const dead = 18;
      I.touch.l = dx < -dead ? 1 : 0; I.touch.r = dx > dead ? 1 : 0;
      I.touch.u = dy < -dead * 1.4 ? 1 : 0; I.touch.d = dy > dead ? 1 : 0;
      const m = Math.min(1, 46 / Math.max(1, Math.hypot(dx, dy)));
      knob.style.transform = 'translate(' + (dx * m) + 'px,' + (dy * m) + 'px)';
    };
    stick.addEventListener('pointerdown', e => {
      e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId);
      const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      setDir(e.clientX - cx, e.clientY - cy); I.touchUsed = true;
    });
    stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) setDir(e.clientX - cx, e.clientY - cy); });
    const end = e => { if (e.pointerId === stickId) { stickId = null; setDir(0, 0); } };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    el.querySelectorAll('[data-b]').forEach(b => {
      const k = b.getAttribute('data-b');
      const on = e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); k.split('+').forEach(x => { I.touch[x] = 1; I.touchLatch[x] = 1; }); b.classList.add('on'); I.touchUsed = true; };
      const off = e => { e.preventDefault(); k.split('+').forEach(x => { I.touch[x] = 0; }); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
  }
  I.showTouch = function (on) {
    const el = document.getElementById('touch');
    if (el) el.classList.toggle('hidden', !on);
  };
})();
