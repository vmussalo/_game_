// AgriStuntti – äänet syntetisoidaan WebAudiolla (ei äänitiedostoja): moottori, renkaiden kirskunta, kolarit.
const A = { ctx: null, on: true, master: null, eng: null, skid: null, gates: {} };

export function unlock() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  A.ctx = new C();
  A.master = A.ctx.createGain(); A.master.gain.value = A.on ? 0.55 : 0; A.master.connect(A.ctx.destination);
  // kohinapuskuri
  const len = A.ctx.sampleRate;
  A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
  const d = A.noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}
export function setOn(on) { A.on = on; if (A.master) A.master.gain.value = on ? 0.55 : 0; }
export const isOn = () => A.on;

function gate(k, t) { const n = A.ctx.currentTime; if ((A.gates[k] || 0) > n) return false; A.gates[k] = n + t; return true; }
function noise(dur, freq, q, vol, type) {
  const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = A.noise; f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  s.connect(f); f.connect(g); g.connect(A.master); s.start(); s.stop(c.currentTime + dur);
}
function tone(f0, f1, dur, vol, type) {
  const c = A.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, c.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(A.master); o.start(); o.stop(c.currentTime + dur);
}

export function event(e) {
  if (!A.ctx || !A.on) return;
  switch (e.t) {
    case 'beep': tone(e.go ? 880 : 440, e.go ? 880 : 440, e.go ? 0.5 : 0.18, 0.2, 'square'); break;
    case 'cp': if (gate('cp', 0.1)) tone(1200, 1600, 0.12, 0.08, 'sine'); break;
    case 'crash': noise(1.2, 500, 0.8, 0.9, 'lowpass'); tone(90, 30, 0.6, 0.35, 'sawtooth'); break;
    case 'hit': if (gate('hit', 0.12)) noise(0.25, 900, 1, Math.min(0.6, e.v / 20), 'lowpass'); break;
    case 'land': if (gate('land', 0.2)) { noise(0.3, 250, 1, Math.min(0.7, 0.2 + e.air * 0.2), 'lowpass'); tone(110, 50, 0.2, 0.2, 'triangle'); } break;
    case 'thump': if (gate('thump', 0.15)) noise(0.15, 300, 1, 0.25, 'lowpass'); break;
    case 'finish': tone(660, 660, 0.15, 0.15, 'square'); setTimeout(() => A.on && tone(880, 880, 0.15, 0.15, 'square'), 160); setTimeout(() => A.on && tone(1320, 1320, 0.45, 0.15, 'square'), 320); break;
    case 'respawn': tone(300, 600, 0.25, 0.1, 'sine'); break;
  }
}

// moottori: kaksi oskillaattoria + kohina, korkeus kierrosten mukaan; raskaat koneet matalammalla
export function engine(car, heavy, tracked) {
  if (!A.ctx) return;
  const c = A.ctx;
  if (!A.eng) {
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.Q.value = 2; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.master); o1.start(); o2.start();
    const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2200; sf.Q.value = 3;
    const sg = c.createGain(); sg.gain.value = 0; s.connect(sf); sf.connect(sg); sg.connect(A.master); s.start();
    A.eng = { o1, o2, f, g, sg, sf };
  }
  const E = A.eng, t = c.currentTime;
  if (!car || !A.on) { E.g.gain.setTargetAtTime(0, t, 0.05); E.sg.gain.setTargetAtTime(0, t, 0.05); return; }
  const base = heavy ? 38 : 70, span = heavy ? 70 : 150;
  const f = base + car.rpm * span;
  E.o1.frequency.setTargetAtTime(f, t, 0.04);
  E.o2.frequency.setTargetAtTime(f * (tracked ? 0.33 : 0.5), t, 0.04);
  E.f.frequency.setTargetAtTime(300 + car.rpm * 1400 + Math.abs(car.throttle) * 500, t, 0.05);
  E.g.gain.setTargetAtTime(car.crashed ? 0 : 0.05 + Math.abs(car.throttle) * 0.06, t, 0.06);
  const sk = car.crashed ? 0 : Math.min(1, Math.max(0, (car.skid - 3) / 8)) * (car.roadContacts ? 1 : 0.4);
  E.sg.gain.setTargetAtTime(sk * 0.12, t, 0.05);
}
export function stopEngine() { if (A.eng && A.ctx) { A.eng.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); A.eng.sg.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05); } }
