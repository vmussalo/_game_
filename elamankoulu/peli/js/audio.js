/* Elämänkoulu – äänet. Kaikki äänet syntetisoidaan Web Audiolla, joten äänitiedostoja ei tarvita. */
(function () {
  'use strict';
  const EK = window.EK, U = EK.U;

  const A = EK.Audio = {
    ac: null, master: null, sfx: null, mus: null, noise: null,
    sfxOn: U.load('sfx', true), musicOn: U.load('music', true),
    seq: null
  };

  A.init = function () {
    if (A.ac) { if (A.ac.state === 'suspended') A.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ac = new AC(); } catch (e) { return; }
    A.master = A.ac.createGain(); A.master.gain.value = 0.7; A.master.connect(A.ac.destination);
    A.sfx = A.ac.createGain(); A.sfx.gain.value = A.sfxOn ? 0.9 : 0; A.sfx.connect(A.master);
    A.mus = A.ac.createGain(); A.mus.gain.value = A.musicOn ? 0.32 : 0; A.mus.connect(A.master);
    const len = A.ac.sampleRate;
    A.noise = A.ac.createBuffer(1, len, A.ac.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  };

  A.setSfx = function (on) { A.sfxOn = on; U.save('sfx', on); if (A.sfx) A.sfx.gain.value = on ? 0.9 : 0; };
  A.setMusic = function (on) { A.musicOn = on; U.save('music', on); if (A.mus) A.mus.gain.value = on ? 0.32 : 0; };

  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(type, f0, f1, dur, vol, dest, delay) {
    if (!A.ac) return;
    const t = A.ac.currentTime + (delay || 0);
    const o = A.ac.createOscillator(), g = A.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, dur, vol);
    o.connect(g); g.connect(dest || A.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, freq, q, dest, delay, sweep) {
    if (!A.ac) return;
    const t = A.ac.currentTime + (delay || 0);
    const s = A.ac.createBufferSource(); s.buffer = A.noise;
    const f = A.ac.createBiquadFilter(); f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 1;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = A.ac.createGain(); env(g, t, 0.003, dur, vol);
    s.connect(f); f.connect(g); g.connect(dest || A.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const SFX = {
    hitL() { noise(0.07, 0.5, 'bandpass', 1800, 1.2); tone('sine', 220, 90, 0.08, 0.5); },
    hitM() { noise(0.1, 0.6, 'bandpass', 1200, 1); tone('sine', 170, 60, 0.12, 0.65); },
    hitH() { noise(0.16, 0.7, 'lowpass', 1400, 0.8); tone('sine', 130, 40, 0.2, 0.85); tone('triangle', 90, 50, 0.18, 0.3); },
    hitX() { noise(0.25, 0.8, 'lowpass', 2200, 0.7); tone('sine', 110, 35, 0.3, 0.9); tone('square', 440, 220, 0.12, 0.08); },
    block() { tone('square', 900, 500, 0.04, 0.12); noise(0.05, 0.35, 'highpass', 3000, 1); },
    whoosh(s) { noise(s === 'H' ? 0.14 : 0.08, 0.18, 'bandpass', s === 'H' ? 500 : 900, 2, null, 0, s === 'H' ? 1800 : 2500); },
    parry() { tone('sine', 880, 0, 0.5, 0.25); tone('sine', 1320, 0, 0.4, 0.15); },
    perfect() { [880, 1108, 1320, 1760].forEach((f, i) => tone('sine', f, 0, 0.5, 0.2, null, i * 0.05)); },
    proj() { tone('sine', 520, 980, 0.12, 0.2); noise(0.12, 0.12, 'bandpass', 2000, 3); },
    super() { tone('sawtooth', 110, 880, 0.5, 0.12); [523, 659, 784].forEach((f, i) => tone('triangle', f, 0, 0.6, 0.12, null, 0.1 + i * 0.03)); },
    ko() { [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, 0, 0.35, 0.25, null, i * 0.12)); noise(0.5, 0.3, 'lowpass', 800, 0.7); },
    opetus() { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, 0, 0.5, 0.25, null, i * 0.1)); tone('sine', 1046, 0, 1.2, 0.2, null, 0.4); },
    land() { tone('sine', 120, 50, 0.1, 0.35); noise(0.06, 0.15, 'lowpass', 600); },
    dash() { noise(0.12, 0.15, 'bandpass', 700, 1.5, null, 0, 300); },
    burnout() { tone('sawtooth', 300, 80, 0.6, 0.08); tone('sine', 240, 100, 0.6, 0.15); },
    rest() { tone('sine', 660, 0, 0.6, 0.12); tone('sine', 990, 0, 0.6, 0.08, null, 0.12); },
    deny() { tone('square', 160, 120, 0.12, 0.08); },
    tech() { tone('square', 700, 900, 0.06, 0.12); tone('square', 900, 700, 0.06, 0.12, null, 0.07); },
    grab() { noise(0.1, 0.3, 'bandpass', 600, 1.2); },
    round() { [523, 659].forEach((f, i) => tone('square', f, 0, 0.18, 0.08, null, i * 0.12)); },
    go() { [523, 659, 784].forEach((f, i) => tone('square', f, 0, 0.2, 0.09, null, i * 0.06)); },
    blip() { tone('square', 660, 0, 0.05, 0.07); },
    select() { tone('square', 880, 1320, 0.09, 0.09); },
    back() { tone('square', 440, 330, 0.08, 0.07); },
    tele() { tone('sine', 400, 1600, 0.15, 0.12); },
    armor() { tone('square', 200, 160, 0.1, 0.15); noise(0.08, 0.3, 'highpass', 2500); }
  };

  A.play = function (name, arg) {
    if (!A.ac || !A.sfxOn || !SFX[name]) return;
    try { SFX[name](arg); } catch (e) { /* äänivirhe ei kaada peliä */ }
  };

  A.onEvents = function (evs) {
    if (!A.ac) return;
    evs.forEach(e => {
      switch (e.t) {
        case 'hit': A.play('hit' + (e.str === 'X' ? 'X' : e.str === 'H' ? 'H' : e.str === 'M' ? 'M' : 'L')); break;
        case 'block': A.play('block'); break;
        case 'move': if (e.kind === 'normal') A.play('whoosh', e.str); break;
        case 'parry': A.play('parry'); break;
        case 'perfectParry': A.play('perfect'); break;
        case 'proj': A.play('proj'); break;
        case 'super': A.play('super'); break;
        case 'ko': A.play('ko'); break;
        case 'opetus': A.play('opetus'); break;
        case 'land': if (e.hard) A.play('land'); break;
        case 'dash': A.play('dash'); break;
        case 'burnout': A.play('burnout'); break;
        case 'rest': A.play('rest'); break;
        case 'deny': A.play('deny'); break;
        case 'tech': A.play('tech'); break;
        case 'grab': A.play('grab'); break;
        case 'round': A.play('round'); break;
        case 'go': A.play('go'); break;
        case 'tele': A.play('tele'); break;
        case 'armor': A.play('armor'); break;
        case 'clash': A.play('block'); break;
      }
    });
  };

  // ---------- musiikki: pieni askelsekvensseri ----------
  const SCALES = {
    kahvila: { root: 57, bpm: 104, scale: [0, 2, 4, 7, 9], swing: 0.12 },
    ranta: { root: 55, bpm: 88, scale: [0, 2, 4, 7, 9], swing: 0.05 },
    piha: { root: 60, bpm: 112, scale: [0, 2, 3, 5, 7, 8, 10], swing: 0.1 },
    koti: { root: 53, bpm: 96, scale: [0, 3, 5, 7, 10], swing: 0.15 },
    katu: { root: 62, bpm: 128, scale: [0, 2, 4, 5, 7, 9, 11], swing: 0 },
    tyomaa: { root: 52, bpm: 118, scale: [0, 3, 5, 6, 7, 10], swing: 0 },
    studio: { root: 61, bpm: 124, scale: [0, 2, 3, 7, 8], swing: 0 },
    loft: { root: 50, bpm: 136, scale: [0, 1, 3, 5, 7, 8, 10], swing: 0 },
    menu: { root: 57, bpm: 100, scale: [0, 2, 4, 7, 9], swing: 0.1 }
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  A.startMusic = function (id) {
    if (!A.ac) return;
    if (A.seq && A.seq.id === id) return;
    A.stopMusic();
    const S = SCALES[id] || SCALES.menu;
    const r = U.rng(id.length * 131 + id.charCodeAt(0));
    const deg = n => { const o = Math.floor(n / S.scale.length); return S.root + S.scale[((n % S.scale.length) + S.scale.length) % S.scale.length] + o * 12; };
    // 4 tahdin sointukulku ja melodia
    const prog = [0, 3, 4, 2].map(x => (x + r.int(2)) % S.scale.length);
    const mel = [];
    for (let i = 0; i < 64; i++) mel.push(r() < 0.55 ? deg(5 + r.int(7)) : null);
    const step = 60 / S.bpm / 4;
    const seq = A.seq = { id, i: 0, next: A.ac.currentTime + 0.1, timer: null };
    seq.timer = setInterval(() => {
      if (!A.ac) return;
      while (seq.next < A.ac.currentTime + 0.15) {
        const i = seq.i % 64, bar = Math.floor(i / 16), beat = i % 16;
        const t = seq.next + (beat % 2 ? S.swing * step : 0);
        const d = t - A.ac.currentTime;
        const chordRoot = prog[bar];
        if (beat % 4 === 0) tone('triangle', hz(deg(chordRoot) - 12), 0, step * 3, 0.32, A.mus, d);
        if (beat === 6 || beat === 14) tone('triangle', hz(deg(chordRoot + 2) - 12), 0, step * 1.5, 0.2, A.mus, d);
        if (beat === 0 || beat === 8) { tone('sine', 140, 45, 0.16, 0.5, A.mus, d); }
        if (beat === 4 || beat === 12) noise(0.09, 0.18, 'bandpass', 1800, 0.8, A.mus, d);
        if (beat % 2 === 1) noise(0.03, 0.06, 'highpass', 7000, 1, A.mus, d);
        if (beat % 8 === 0) [0, 2, 4].forEach(k => tone('square', hz(deg(chordRoot + k)), 0, step * 6, 0.025, A.mus, d));
        if (mel[i]) tone('square', hz(mel[i]), 0, step * 1.6, 0.045, A.mus, d);
        seq.i++; seq.next += step;
      }
    }, 30);
  };
  A.stopMusic = function () { if (A.seq) { clearInterval(A.seq.timer); A.seq = null; } };
})();
