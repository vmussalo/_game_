/* AgriRalli – syntetisoidut äänet (WebAudio): moottori, laukaukset, räjähdykset, törmäykset, poimittavat */
(function () {
  'use strict';
  const AR = window.AR;
  const A = AR.Audio = { on: true, ctx: null, master: null, eng: null, noiseBuf: null, last: {} };

  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = A.on ? 0.5 : 0; A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.ctx = null; }
  };

  A.setOn = function (on) {
    A.on = on;
    if (A.master) A.master.gain.value = on ? 0.5 : 0;
  };

  function noise(dur, f, q, vol, type, decay) {
    const c = A.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = f; fl.Q.value = q || 1;
    const g = c.createGain(); const t = c.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (decay || dur));
    s.connect(fl); fl.connect(g); g.connect(A.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function tone(f0, f1, dur, vol, type) {
    const c = A.ctx; if (!c) return;
    const o = c.createOscillator(); o.type = type || 'square';
    const g = c.createGain(); const t = c.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  }
  // rajoitin: sama ääni enintään n kertaa sekunnissa
  function gate(k, gap) {
    const now = A.ctx ? A.ctx.currentTime : 0;
    if (A.last[k] && now - A.last[k] < gap) return false;
    A.last[k] = now; return true;
  }

  A.fx = function (list) {
    if (!A.ctx || !A.on) return;
    for (const e of list) {
      switch (e.t) {
        case 'shot':
          if (!gate(e.player ? 'shotP' : 'shot', e.player ? 0.04 : 0.09)) break;
          if (e.lv === 2) noise(0.12, 1800, 0.8, e.player ? 0.35 : 0.12, 'lowpass');
          else if (e.lv === 5) tone(900, 200, 0.12, e.player ? 0.12 : 0.05, 'sawtooth');
          else noise(0.05, 2500 + e.lv * 400, 1.5, e.player ? 0.25 : 0.08, 'bandpass');
          break;
        case 'hit': if (gate('hit', 0.05)) noise(0.04, 3500, 3, e.player ? 0.18 : 0.06, 'bandpass'); break;
        case 'crash': if (gate('crash', 0.12)) { noise(0.25, 400, 1, Math.min(0.6, e.v / 500) * (e.player ? 1 : 0.4), 'lowpass'); tone(120, 50, 0.15, 0.15, 'triangle'); } break;
        case 'boom': noise(1.2, 300, 0.7, 0.8, 'lowpass', 1.1); tone(80, 30, 0.6, 0.4, 'sine'); break;
        case 'mineboom': noise(0.6, 600, 0.7, 0.5, 'lowpass'); break;
        case 'drop': tone(300, 120, 0.12, 0.12, 'triangle'); break;
        case 'pick': tone(660, 1320, 0.12, 0.12, 'square'); setTimeout(() => tone(990, 1600, 0.1, 0.1, 'square'), 70); break;
        case 'beep': tone(440, 440, 0.18, 0.18, 'square'); break;
        case 'go': tone(880, 880, 0.4, 0.2, 'square'); break;
        case 'lap': tone(520, 780, 0.15, 0.12, 'triangle'); break;
        case 'finish': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.18, 0.14, 'square'), i * 110)); break;
        case 'swing': noise(0.35, 500, 2, 0.25, 'bandpass'); break;
        case 'kauha': noise(0.3, 250, 1, 0.5, 'lowpass'); tone(150, 60, 0.2, 0.25, 'square'); break;
        case 'slip': noise(0.4, 1200, 1, 0.12, 'highpass'); break;
      }
    }
  };

  // pelaajan moottori: kaksi oskillaattoria ja alipäästö, korkeus nopeuden mukaan
  A.engine = function (car) {
    if (!A.ctx) return;
    const c = A.ctx;
    if (!car || !A.on) { if (A.eng) { A.eng.g.gain.setTargetAtTime(0, c.currentTime, 0.05); } return; }
    if (!A.eng) {
      const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.master);
      o1.start(); o2.start();
      A.eng = { o1, o2, f, g };
    }
    const sp = Math.hypot(car.vx, car.vy);
    const big = car.st.mass > 2.5;
    const base = big ? 32 : 48;
    const f = base + sp * (big ? 0.16 : 0.24) + (car.turboOn ? 25 : 0);
    const t = c.currentTime;
    A.eng.o1.frequency.setTargetAtTime(f, t, 0.05);
    A.eng.o2.frequency.setTargetAtTime(f * 0.5 + 3, t, 0.05);
    A.eng.f.frequency.setTargetAtTime(300 + sp * 2 + Math.abs(car.inp.throttle) * 400, t, 0.05);
    A.eng.g.gain.setTargetAtTime(car.wrecked ? 0 : 0.05 + Math.abs(car.inp.throttle) * 0.05, t, 0.08);
  };
  A.stopEngine = function () { if (A.eng && A.ctx) A.eng.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); };
})();
