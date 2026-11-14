/* AgriRalli – käynnistys, pääsilmukka, tilat (valikko / kisa / tauko) ja testikoukut.
   Testiparametrit: ?theme=kyla  ?quick=RATA&veh=KONE&lv=TASO  ?auto (autopilotti)  ?ff=SEKUNTIA (pikakelaus)
                    ?players=2&veh2=KONE (kaksinpeli)  ?hooki (täysi hööki)
                    ?career=new&screen=shop|dealer|races|standings|shark|hub  ?nodemo (ei taustakisaa) */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const SKEY = 'agriralli.asetukset';
  const STEP = 1 / 120;

  const M = AR.Main = {
    mode: 'menu', race: null, offer: null, career: null, paused: false, acc: 0, last: 0,
    quickCfg: { track: 0, vi: 0, lv: 0, n: 3, players: 1, vi2: 0, hooki: false }, demo: null
  };

  const settings = Object.assign({ theme: 'dystopia', sound: true, autoGas: true }, U.store.get(SKEY, {}));
  const saveSettings = () => U.store.set(SKEY, settings);

  M.setTheme = id => { settings.theme = id; saveSettings(); AR.setTheme(id); if (M.mode === 'menu') startDemo(); };
  M.setSound = on => { settings.sound = on; saveSettings(); AR.Audio.setOn(on); if (!on) AR.Audio.stopEngine(); };
  M.setAutoGas = on => { settings.autoGas = on; saveSettings(); AR.Input.autoGas = on; };

  const html = document.documentElement;
  const touchEl = () => U.$('touch');
  const isTouch = () => AR.Input.touchUsed || U.qs.has('touch') || (window.matchMedia && matchMedia('(pointer: coarse)').matches);

  // taustakisa valikoiden alla
  function startDemo() {
    if (U.qs.has('nodemo')) { M.demo = null; return; }
    const track = U.irand(0, AR.TRACKS.length - 1);
    const vi = U.irand(0, 6);
    const ent = AR.Career.quickEntrants(vi, U.irand(0, 4), '', 4).filter(e => !e.isPlayer);
    const race = AR.Race.create({ track, laps: 99, diff: 1, entrants: ent });
    race.state = 'run'; race.t = 3.2;
    M.demo = race;
    AR.Render.setRace(race);
    AR.Render.hudOff = true;
  }

  function enterRace(cfg) {
    const race = AR.Race.create(cfg);
    M.race = race; M.mode = 'race'; M.paused = false; M.acc = 0;
    AR.Input.players = race.players.length || 1;
    AR.Render.hudOff = false;
    AR.Render.setRace(race);
    AR.Input.reset();
    AR.Input.active = true;
    AR.UI.hide();
    touchEl().classList.toggle('hidden', !isTouch() || race.players.length > 1);
    U.$('pauseBtn').classList.remove('hidden');
    const P = race.player;
    U.$('specBtn').classList.toggle('hidden', !(P && P.st.kauha));
    html.setAttribute('data-mode', 'race');
    const ff = +U.qs.get('ff') || 0;
    if (ff > 0) fastForward(ff);
  }

  M.startCareerRace = function (offer) {
    const c = M.career;
    M.offer = offer;
    enterRace({ track: offer.track, laps: AR.Career.laps(offer), diff: offer.diff, entrants: AR.Career.entrants(c, offer), auto: U.qs.has('auto') });
  };

  M.startQuick = function () {
    const q = M.quickCfg;
    M.offer = null;
    const tr = AR.Track.build(q.track);
    const two = q.players > 1, T = AR.T;
    const ent = AR.Career.quickEntrants(q.vi, q.lv, two ? T.ui.p1 : (M.career ? M.career.name : 'Pelaaja'), q.n, { vi2: two ? q.vi2 : null, name2: T.ui.p2, hooki: q.hooki });
    enterRace({ track: q.track, laps: U.clamp(Math.round(18000 / tr.L), 2, 6), diff: 1, entrants: ent, auto: U.qs.has('auto'), hooki: q.hooki });
  };

  function leaveRace() {
    const race = M.race;
    AR.Input.active = false;
    AR.Audio.stopEngine();
    touchEl().classList.add('hidden');
    U.$('pauseBtn').classList.add('hidden');
    html.setAttribute('data-mode', 'menu');
    M.mode = 'menu';
    if (M.offer && M.career) {
      const sum = AR.Career.applyResult(M.career, M.offer, race.results);
      html.setAttribute('data-result', JSON.stringify({ place: sum.place, total: sum.total, wrecked: sum.wrecked, day: M.career.day }));
      AR.UI.results(sum, race);
    } else {
      AR.UI.quickResults(race);
    }
    // tulokset jäävät kisanäkymän päälle; taustalla ei ajeta uutta kisaa ennen kuin palataan valikkoon
    M.demo = null;
  }

  M.pause = function () {
    if (M.mode !== 'race' || M.race.state === 'done') return;
    if (M.paused) { M.resume(); return; }
    M.paused = true;
    AR.Audio.stopEngine();
    AR.UI.pause();
  };
  M.resume = function () { M.paused = false; AR.UI.hide(); AR.Input.reset(); M.last = performance.now(); };
  M.forfeit = function () { AR.Race.forfeit(M.race); M.paused = false; leaveRace(); };
  AR.Input.onPause = M.pause;

  // jokainen ihmispelaaja lukee oman ohjauksensa
  function readInput(race) {
    if (race.auto) return;
    for (const p of race.players) p.inp = AR.Input.state(p.pid);
  }

  function fastForward(sec) {
    const race = M.race;
    const n = Math.round(sec / STEP);
    for (let i = 0; i < n && race.state !== 'done'; i++) {
      readInput(race);
      AR.Race.step(race, STEP);
      if (race.fx.length > 200) race.fx.splice(0, race.fx.length - 200);
    }
    AR.Render.consume(race.fx); race.fx.length = 0;
    AR.Render.snap();
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, Math.max(0, (ts - (M.last || ts)) / 1000));
    M.last = ts;
    if (M.mode === 'race' && M.race) {
      const race = M.race;
      AR.Input.pollPause();
      if (!M.paused) {
        M.acc += dt;
        let n = 0;
        while (M.acc >= STEP && n < 12) {
          readInput(race);
          AR.Race.step(race, STEP);
          M.acc -= STEP; n++;
        }
        if (n >= 12) M.acc = 0;
        AR.Render.consume(race.fx);
        AR.Audio.fx(race.fx);
        race.fx.length = 0;
        AR.Audio.engine(race.player);
      }
      AR.Render.frame(M.paused ? 0 : dt);
      html.setAttribute('data-race', race.state + ' ' + race.t.toFixed(1));
      if (race.state === 'done' && M.mode === 'race') leaveRace();
    } else {
      if (!M.demo && !AR.UI.screen.match(/results|ending/) && !U.qs.has('nodemo')) startDemo();
      if (M.demo) {
        const race = M.demo;
        M.acc += dt;
        let n = 0;
        while (M.acc >= STEP && n < 12) { AR.Race.step(race, STEP); M.acc -= STEP; n++; }
        if (n >= 12) M.acc = 0;
        AR.Render.consume(race.fx); race.fx.length = 0;
        AR.Render.frame(dt);
        if (race.cars.filter(c => !c.wrecked).length < 2 || race.t > 240) startDemo();
      } else if (M.race && AR.UI.screen.match(/results|ending/)) {
        AR.Render.frame(dt); // pysähtynyt kisa tulosten takana
      }
      AR.UI.tick(dt);
    }
  }

  function boot() {
    AR.setTheme(U.qs.get('theme') || settings.theme);
    if (U.qs.get('theme')) settings.theme = AR.themeId;
    AR.Audio.setOn(settings.sound && !U.qs.has('mute'));
    AR.Input.autoGas = settings.autoGas;
    AR.Render.init(U.$('cv'));
    AR.Input.bindTouch(touchEl());
    AR.UI.init();
    U.$('pauseBtn').addEventListener('click', () => M.pause());
    const unlock = () => AR.Audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    html.setAttribute('data-mode', 'menu');

    // testikoukut
    const q = U.qs;
    if (q.get('career') === 'new') { M.career = AR.Career.create(q.get('name') || 'Testi'); if (q.get('cash')) M.career.cash = +q.get('cash'); }
    else M.career = AR.Career.load();
    if (+q.get('players') === 2) M.quickCfg.players = 2;
    if (q.has('hooki')) M.quickCfg.hooki = true;
    if (q.has('quick')) {
      M.quickCfg = { track: +q.get('quick') || 0, vi: +q.get('veh') || 0, lv: +q.get('lv') || 0, n: q.has('n') ? +q.get('n') : 3, players: +q.get('players') === 2 ? 2 : 1, vi2: +q.get('veh2') || 0, hooki: q.has('hooki') };
      M.startQuick();
    } else if (q.get('career') && M.career) {
      const s = q.get('screen') || 'hub';
      if (s === 'race') M.startCareerRace(M.career.offers[+q.get('offer') || 0]);
      else (AR.UI[s] || AR.UI.hub)();
    } else AR.UI.title();
    requestAnimationFrame(loop);

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ei offline-tilaa */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
