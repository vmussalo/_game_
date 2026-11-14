/* AgriRalli – ohjaus: näppäimistö, kosketusnapit ja peliohjain.
   Yksinpelissä kaikki näppäimet ohjaavat samaa konetta. Kaksinpelissä näppäimistö jaetaan kahtia
   (pelaaja 1 vasen puolisko, pelaaja 2 nuolet ja oikea puolisko) ja peliohjaimet jaetaan pelaajille. */
(function () {
  'use strict';
  const AR = window.AR;

  const keys = new Set();
  const touch = { left: false, right: false, gas: false, brake: false, fire: false, mine: false, turbo: false, special: false };
  const I = AR.Input = { autoGas: true, touchUsed: false, onPause: null, players: 1 };

  const MAP = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], gas: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS'],
    fire: ['Space', 'ControlLeft', 'ControlRight'], mine: ['KeyZ', 'KeyC'], turbo: ['ShiftLeft', 'ShiftRight', 'KeyX'], special: ['KeyV', 'KeyE']
  };
  // kaksinpeli: koodit ovat fyysisiä paikkoja, joten ne toimivat myös suomalaisella näppäimistöllä (Slash = "-")
  const MAP2 = [
    { left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], fire: ['Space', 'ControlLeft'], mine: ['KeyQ'], turbo: ['ShiftLeft'], special: ['KeyE'] },
    { left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'], fire: ['Period', 'ControlRight', 'Numpad0'],
      mine: ['Comma', 'Numpad1'], turbo: ['Slash', 'ShiftRight', 'NumpadDecimal'], special: ['KeyM', 'Numpad2'] }
  ];
  const GAME_KEYS = new Set([].concat(...Object.values(MAP), ...MAP2.map(m => [].concat(...Object.values(m)))));

  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (I.onPause) I.onPause(); return; }
    keys.add(e.code);
    // kisan aikana selaimen omat pikanäppäimet (vieritys, pikahaku "/") pois pelinäppäimiltä
    if (I.active && GAME_KEYS.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); for (const k in touch) touch[k] = false; });

  // kosketusnapit: <button data-k="left"> … ; useampi sormi kerrallaan
  I.bindTouch = function (root) {
    const btns = root.querySelectorAll('[data-k]');
    btns.forEach(b => {
      const k = b.getAttribute('data-k');
      const on = e => { e.preventDefault(); touch[k] = true; b.classList.add('on'); I.touchUsed = true; try { b.setPointerCapture(e.pointerId); } catch (er) { /* ei kaappausta */ } };
      const off = e => { e.preventDefault(); touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('lostpointercapture', off);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  };

  I.reset = function () { keys.clear(); for (const k in touch) touch[k] = false; };

  // peliohjaimet pelaajille: yksinpelissä kaikki pelaajalle 1; kaksinpelissä 1. ohjain → P1 ja 2. → P2,
  // mutta jos ohjaimia on vain yksi, se menee pelaajalle 2 (pelaaja 1 ajaa näppäimistön vasemmalla puolella)
  function padsFor(pid) {
    const all = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(Boolean);
    if (I.players < 2) return all;
    if (all.length === 1) return pid === 1 ? all : [];
    return all[pid] ? [all[pid]] : [];
  }

  let padPause = false;
  I.state = function (pid) {
    pid = pid | 0;
    const two = I.players > 1;
    const map = two ? MAP2[pid] : MAP;
    const has = name => map[name].some(k => keys.has(k));
    const tch = two ? {} : touch; // kosketusnapit vain yksinpelissä
    let steer = 0, throttle = 0;
    if (has('left') || tch.left) steer -= 1;
    if (has('right') || tch.right) steer += 1;
    const brake = has('brake') || tch.brake;
    let gas = has('gas') || tch.gas;
    if (!two && I.touchUsed && I.autoGas && !brake) gas = true;
    throttle = (gas ? 1 : 0) - (brake ? 1 : 0);
    let fire = has('fire') || tch.fire, mine = has('mine') || tch.mine, turbo = has('turbo') || tch.turbo, special = has('special') || tch.special;
    for (const p of padsFor(pid)) {
      const ax = p.axes[0] || 0;
      if (Math.abs(ax) > 0.15) steer = Math.max(-1, Math.min(1, steer + ax));
      const b = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.3);
      const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
      if (rt > 0.1 || lt > 0.1) throttle = rt - lt;
      if (b(12)) throttle = 1;
      if (b(13)) throttle = -1;
      if (b(14)) steer = -1;
      if (b(15)) steer = 1;
      fire = fire || b(0); mine = mine || b(1); turbo = turbo || b(2) || b(5); special = special || b(3) || b(4);
    }
    return { throttle, steer, fire, mine, turbo, special };
  };

  // Start-nappi (mikä tahansa ohjain) pitää tauon / jatkaa; kutsutaan kerran ruudunpäivityksessä
  I.pollPause = function () {
    const all = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const on = all.some(p => p.buttons[9] && p.buttons[9].pressed);
    if (on && !padPause && I.onPause) I.onPause();
    padPause = on;
  };
})();
