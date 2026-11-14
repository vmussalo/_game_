// AgriStuntti – kisa käynnissä: syöte, fysiikka-askeleet, HUD, äänet, maali, ennätykset ja uusinnat.
import * as SC from './scene.js';
import * as AU from './audio.js';
import * as IN from './input.js';
import { buildWorld } from './track.js';
import { createRace, stepRace, replayAt, replayLength, respawn, COUNTDOWN } from './race.js';
import { VEHICLES, OPPONENTS, STEP } from './data.js';
import * as ST from './storage.js';

export const G = { mode: 'menu', world: null, track: null, race: null, acc: 0, paused: false, rp: null, cb: {}, msgT: 0, endT: 0 };
const $ = id => document.getElementById(id);

export function fmtTime(t) {
  if (t == null || !isFinite(t)) return '–';
  const m = Math.floor(t / 60), s = t - m * 60;
  return (m ? m + ':' + (s < 10 ? '0' : '') : '') + s.toFixed(2);
}

// rata valikoiden taustalle
export function showTrack(track) {
  if (G.track === track && G.world) return G.world;
  G.track = track;
  G.world = buildWorld(track);
  SC.clearCars();
  SC.buildScene(G.world);
  return G.world;
}

// opts: { auto (tekoäly ajaa pelaajaa), ff }
export function startRace(track, vi, oppId, opts) {
  opts = opts || {};
  const world = showTrack(track);
  if (!world.trace.ok) throw new Error(world.trace.err);
  const set = ST.settings();
  const entries = [{ spec: VEHICLES[vi], vi, name: set.name || 'Sinä', color: VEHICLES[vi].color, player: true, ai: opts.auto ? { skill: 1 } : null }];
  const key = ST.trackKey(track);
  const rec = ST.record(key);
  const opp = OPPONENTS.find(o => o.id === oppId) || OPPONENTS[0];
  if (opp.id === 'haamu' && rec && rec.ghost) entries.push({ ghost: ST.unpackReplay(rec.ghost), name: 'Haamu ' + fmtTime(rec.time), color: '#ffffff', vi: rec.ghost.vi });
  else if (opp.skill) entries.push({ spec: VEHICLES[opp.vi], vi: opp.vi, name: opp.name.replace(/ \(.*\)/, ''), color: opp.color, ai: { skill: opp.skill } });
  const race = createRace(world, entries);
  G.race = race; G.key = key; G.rec = rec; G.vi = vi; G.opp = opp.id; G.mode = 'race'; G.paused = false; G.acc = 0; G.endT = 0;
  G.lastBeep = Math.floor(race.t); G.maxAir = 0; G.crashes = 0; G.snap = true;
  SC.clearCars();
  race.racers.forEach((r, i) => SC.setCar(i, r.ghost ? r.ghost.vi : r.e.vi, r.color, !!r.ghost));
  IN.default.active = true; IN.reset();
  hud(true);
  drawMinimap(true);
  if (opts.ff) fastForward(opts.ff);
}

function fastForward(sec) {
  const n = Math.round(sec / STEP);
  for (let i = 0; i < n && !G.race.done; i++) { readInput(); stepRace(G.race, STEP); G.race.events.length = 0; }
  G.snap = true;
}

function readInput() {
  const p = G.race.racers[0];
  if (!p.ai) p.inp = IN.state();
}

// näppäimet kisan aikana
export function key(code) {
  if (G.mode === 'race') {
    if (code === 'KeyC') flash('Kamera: ' + SC.cycleCam());
    else if (code === 'KeyR' && G.race.t > 0 && !G.race.racers[0].finished) { respawn(G.race, G.race.racers[0]); flash('Takaisin radalle'); }
    else if (code === 'Escape' || code === 'KeyP') G.cb.pause && G.cb.pause();
  } else if (G.mode === 'replay') {
    if (code === 'KeyC') flash('Kamera: ' + SC.cycleCam());
    else if (code === 'Space') G.rp.play = !G.rp.play;
    else if (code === 'Escape') G.cb.endReplay && G.cb.endReplay();
  }
}

export function update(dt) {
  if (G.mode === 'race') raceFrame(dt);
  else if (G.mode === 'replay') replayFrame(dt);
}

function raceFrame(dt) {
  const race = G.race;
  if (!G.paused) {
    G.acc += Math.min(dt, 0.1);
    let n = 0;
    while (G.acc >= STEP && n < 16) { readInput(); stepRace(race, STEP); G.acc -= STEP; n++; }
    if (n >= 16) G.acc = 0;
    // lähtölaskennan piippaukset
    const tick = Math.floor(race.t);
    if (tick !== G.lastBeep && tick >= -2 && tick <= 0) { AU.event({ t: 'beep', go: tick === 0 }); G.lastBeep = tick; }
    for (const e of race.events) handleEvent(e);
    race.events.length = 0;
    const P = race.racers[0];
    AU.engine(P.car, P.e.spec.mass > 3000, P.e.spec.tracked);
    if (race.done && !G.endT) G.endT = performance.now();
    if (G.endT && performance.now() - G.endT > 2600) finishRace();
  } else AU.stopEngine();
  const states = new Map();
  race.racers.forEach((r, i) => {
    if (r.ghost) { const s = replayAt(r.ghost, race.t); if (s) states.set(i, s); }
    else states.set(i, r.car);
  });
  SC.render({ follow: 0, states, dt: G.paused ? 0 : dt, snap: G.snap });
  G.snap = false;
  hud();
}

function handleEvent(e) {
  const P = G.race.racers[0];
  if (e.r && e.r !== P) return;
  AU.event(e);
  if (e.t === 'crash') { G.crashes++; flash('💥 ' + e.why, 2.2, 'bad'); }
  else if (e.t === 'land' && e.air > 1.0) { G.maxAir = Math.max(G.maxAir, e.air); flash('Ilmalento ' + e.air.toFixed(1) + ' s!', 1.2); }
  else if (e.t === 'finish') flash('🏁 MAALI ' + fmtTime(e.r.time), 3, 'good');
}

function finishRace() {
  const race = G.race, P = race.racers[0];
  G.mode = 'post';
  AU.stopEngine();
  IN.default.active = false;
  const isRec = !P.ai && ST.submitRecord(G.key, P.time, G.vi, ST.settings().name, P.rec);
  const opp = race.racers.find((r, i) => i > 0 && !r.ghost);
  const ghost = race.racers.find(r => r.ghost);
  G.cb.results && G.cb.results({
    time: P.time, rec: isRec, best: G.rec ? G.rec.time : null, crashes: P.crashes, resets: P.resets, air: G.maxAir,
    opp: opp ? { name: opp.name, time: opp.finished ? opp.time : null } : ghost ? { name: 'Haamu', time: G.rec.time } : null
  });
}

export function forfeit() { G.mode = 'menu'; AU.stopEngine(); IN.default.active = false; hud(false, true); }
export function setPaused(p) { G.paused = p; if (p) AU.stopEngine(); else G.acc = 0; }

// ---------- uusinta ----------
export function startReplay() {
  const race = G.race;
  G.mode = 'replay';
  G.rp = { t: -COUNTDOWN, play: true, speed: 1, len: Math.max(...race.racers.map(r => replayLength(r.ghost || r.rec))) };
  SC.setCam(3); G.snap = true;
  hud(false, true);
  $('rpbar').classList.remove('hidden');
}
function replayFrame(dt) {
  const rp = G.rp;
  if (rp.play) rp.t = Math.min(rp.len, rp.t + dt * rp.speed);
  const states = new Map();
  G.race.racers.forEach((r, i) => { const s = replayAt(r.ghost || r.rec, rp.t); if (s) states.set(i, s); });
  SC.render({ follow: 0, states, dt: rp.play ? dt * rp.speed : 0, snap: G.snap });
  G.snap = false;
  $('rpTime').textContent = fmtTime(Math.max(0, rp.t)) + ' / ' + fmtTime(rp.len) + '   ' + SC.camName() + '   ' + rp.speed + '×';
  $('rpPlay').textContent = rp.play ? '⏸' : '▶';
}
export function replayCtl(a) {
  const rp = G.rp; if (!rp) return;
  if (a === 'play') { if (rp.t >= rp.len) rp.t = -COUNTDOWN; rp.play = !rp.play; }
  else if (a === 'slow') rp.speed = rp.speed <= 0.25 ? 0.25 : rp.speed / 2;
  else if (a === 'fast') rp.speed = Math.min(4, rp.speed * 2);
  else if (a === 'back') { rp.t = Math.max(-COUNTDOWN, rp.t - 5); G.snap = true; }
  else if (a === 'start') { rp.t = -COUNTDOWN; G.snap = true; }
  else if (a === 'cam') SC.cycleCam();
}

// ---------- HUD ----------
function flash(text, sec, cls) { const m = $('hudMsg'); m.textContent = text; m.className = 'hud-msg show ' + (cls || ''); G.msgT = performance.now() + (sec || 1.4) * 1000; }

export function hud(init, hide) {
  const h = $('hud');
  if (hide) { h.classList.add('hidden'); $('touch').classList.add('hidden'); return; }
  if (init) {
    h.classList.remove('hidden');
    $('rpbar').classList.add('hidden');
    $('hudBest').textContent = G.rec ? 'Ennätys ' + fmtTime(G.rec.time) : 'Ei ennätystä';
    const tv = IN.default.touchUsed || matchMedia('(pointer: coarse)').matches || /[?&]touch/.test(location.search);
    $('touch').classList.toggle('hidden', !tv);
    h.classList.toggle('touchmode', tv);
    $('hudMsg').className = 'hud-msg';
  }
  const race = G.race; if (!race) return;
  const P = race.racers[0], c = P.car;
  $('hudTime').textContent = race.t < 0 ? String(Math.ceil(-race.t)) : fmtTime(P.finished ? P.time : race.t);
  $('hudTime').classList.toggle('count', race.t < 0);
  $('hudSpeed').textContent = Math.round(Math.abs(c.vf) * 3.6);
  $('hudGear').textContent = c.gear === 0 ? 'R' : c.gear;
  const S = race.world.samples;
  $('hudProg').style.width = Math.min(100, S[P.k].d / S[S.length - 1].d * 100).toFixed(1) + '%';
  const opp = race.racers[1];
  if (opp) {
    let d = '';
    if (!opp.ghost) { const gap = Math.round(S[opp.k].d - S[P.k].d); d = opp.finished ? ' 🏁' : gap > 0 ? ' (+' + gap + ' m edellä)' : gap < 0 ? ' (' + (-gap) + ' m takana)' : ''; }
    $('hudOpp').textContent = opp.name + d;
  } else $('hudOpp').textContent = '';
  if (G.msgT && performance.now() > G.msgT) { $('hudMsg').className = 'hud-msg'; G.msgT = 0; }
  if (race.t < 0) { $('hudMsg').textContent = race.t > -0.05 ? 'AJA!' : String(Math.ceil(-race.t)); $('hudMsg').className = 'hud-msg show big'; G.msgT = 0; }
  else if (race.t < 0.8 && !G.msgT) { $('hudMsg').textContent = 'AJA!'; $('hudMsg').className = 'hud-msg show big'; G.msgT = performance.now() + 700; }
  else if ($('hudMsg').classList.contains('big') && !G.msgT) $('hudMsg').className = 'hud-msg';
  drawMinimap();
}

// minikartta: reitti kerran taustakuvaksi, koneet pisteinä
function drawMinimap(init) {
  const cv = $('hudMap'); if (!cv) return;
  const S = G.world.samples; if (!S.length) return;
  if (init || !G.mapBg) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of S) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
    const pad = 8, sc = Math.min((cv.width - pad * 2) / Math.max(1, x1 - x0), (cv.height - pad * 2) / Math.max(1, z1 - z0));
    G.map = { sc, ox: pad + ((cv.width - pad * 2) - (x1 - x0) * sc) / 2 - x0 * sc, oz: pad + ((cv.height - pad * 2) - (z1 - z0) * sc) / 2 - z0 * sc };
    const bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const b = bg.getContext('2d');
    b.lineCap = b.lineJoin = 'round';
    for (const [w, c] of [[6, 'rgba(0,0,0,0.6)'], [3.5, '#d8d4c8']]) {
      b.strokeStyle = c; b.lineWidth = w; b.beginPath();
      S.forEach((s, k) => { const x = G.map.ox + s.x * G.map.sc, y = G.map.oz + s.z * G.map.sc; if (k && Math.hypot(s.x - S[k - 1].x, s.z - S[k - 1].z) < 40) b.lineTo(x, y); else b.moveTo(x, y); });
      b.stroke();
    }
    const s0 = S[0]; b.fillStyle = '#ffd640'; b.fillRect(G.map.ox + s0.x * G.map.sc - 3, G.map.oz + s0.z * G.map.sc - 3, 6, 6);
    G.mapBg = bg;
  }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(G.mapBg, 0, 0);
  if (!G.race) return;
  G.race.racers.slice().reverse().forEach(r => {
    const p = r.ghost ? (replayAt(r.ghost, G.race.t) || {}).pos : r.car.pos;
    if (!p) return;
    ctx.fillStyle = r.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(G.map.ox + p[0] * G.map.sc, G.map.oz + p[2] * G.map.sc, r.player ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
}
