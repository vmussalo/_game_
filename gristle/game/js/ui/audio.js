'use strict';
// Procedural sound: wind, a distant out-of-tune calliope, and simple SFX. No audio files.
(function () {
  const A = GG.Audio = {};
  let ac = null, master = null, amb = null, music = null, musicT = 0, windSrc = null;
  A.vol = 0.6; A.musicOn = true;
  A.init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = A.vol; master.connect(ac.destination);
    amb = ac.createGain(); amb.gain.value = 0.18; amb.connect(master);
    music = ac.createGain(); music.gain.value = 0.07; music.connect(master);
    // wind: filtered noise
    const buf = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = last * 6; }
    windSrc = ac.createBufferSource(); windSrc.buffer = buf; windSrc.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07; const lg = ac.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    windSrc.connect(f); f.connect(amb); windSrc.start();
  };
  const noise = (dur, freq, q, gain, type = 'bandpass') => {
    if (!ac) return;
    const n = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = n;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start();
  };
  const tone = (freq, dur, type = 'sine', gain = 0.2, slide = 0, dest) => {
    if (!ac) return;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), ac.currentTime + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(dest || master); o.start(); o.stop(ac.currentTime + dur + 0.05);
  };
  A.play = s => {
    if (!ac) return;
    switch (s) {
      case 'shot': noise(0.25, 900, 0.7, 0.7); tone(140, 0.15, 'square', 0.15, 0.4); break;
      case 'shotgun': noise(0.45, 600, 0.5, 0.9); tone(90, 0.25, 'square', 0.2, 0.4); break;
      case 'rivet': noise(0.12, 2400, 2, 0.4); tone(600, 0.06, 'square', 0.1, 0.5); break;
      case 'swing': noise(0.18, 1800, 1.2, 0.25, 'highpass'); break;
      case 'bite': noise(0.15, 500, 1.5, 0.4); tone(220, 0.1, 'sawtooth', 0.08, 0.5); break;
      case 'squelch': noise(0.3, 300, 3, 0.5); tone(160, 0.25, 'sine', 0.2, 0.3); break;
      case 'hit': noise(0.12, 400, 1, 0.35); break;
      case 'boom': noise(0.9, 120, 0.4, 1.0, 'lowpass'); tone(60, 0.6, 'sine', 0.4, 0.4); break;
      case 'splat': noise(0.5, 350, 2, 0.6); break;
      case 'throw': noise(0.15, 1200, 1, 0.15, 'highpass'); break;
      case 'door': tone(110, 0.25, 'triangle', 0.12, 0.8); noise(0.2, 700, 2, 0.12); break;
      case 'clang': tone(330, 0.5, 'triangle', 0.2, 0.98); tone(497, 0.4, 'triangle', 0.12, 0.98); break;
      case 'click': tone(1800, 0.03, 'square', 0.08); break;
      case 'reload': tone(900, 0.04, 'square', 0.08); setTimeout(() => tone(700, 0.05, 'square', 0.08), 90); break;
      case 'coins': for (let i = 0; i < 3; i++) setTimeout(() => tone(1500 + Math.random() * 600, 0.08, 'triangle', 0.08), i * 60); break;
      case 'heal': tone(500, 0.25, 'sine', 0.1, 1.5); break;
      case 'eat': noise(0.2, 600, 2, 0.25); break;
      case 'drink': tone(300, 0.3, 'sine', 0.08, 0.6); break;
      case 'ui': tone(700, 0.05, 'triangle', 0.06); break;
      case 'combat': tone(98, 0.6, 'sawtooth', 0.12, 0.98); tone(147, 0.6, 'sawtooth', 0.08, 0.98); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.12), i * 110)); break;
      case 'quest': [392, 523].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.1), i * 140)); break;
      case 'honk': tone(330, 0.2, 'sawtooth', 0.15, 0.85); break;
    }
  };
  // a slightly wrong carnival waltz in the distance
  const TUNE = [[0, 2], [4, 1], [7, 1], [12, 2], [11, 1], [7, 1], [9, 2], [5, 1], [9, 1], [7, 3], [0, 2], [3, 1], [7, 1], [10, 2], [8, 1], [7, 1], [5, 2], [2, 1], [3, 1], [0, 3]];
  let ti = 0;
  A.update = dt => {
    if (!ac || !A.musicOn) return;
    musicT -= dt;
    if (musicT > 0) return;
    const [n, len] = TUNE[ti % TUNE.length];
    const base = 220 * (1 + Math.sin(Date.now() / 7000) * 0.006);
    const f = base * Math.pow(2, n / 12);
    tone(f, 0.32 * len, 'triangle', 0.5, 1, music);
    tone(f * 2.01, 0.2 * len, 'sine', 0.18, 1, music);
    if (ti % 3 === 0) tone(base / 2 * Math.pow(2, [0, 7, 5, 7][Math.floor(ti / 3) % 4] / 12), 0.3, 'sine', 0.35, 1, music);
    ti++;
    musicT = 0.34 * len;
  };
  A.setAmbient = kind => { if (amb) amb.gain.value = kind === 'sump' ? 0.12 : 0.2; };
})();
