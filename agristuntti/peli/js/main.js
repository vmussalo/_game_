// AgriStuntti – käynnistys ja pääsilmukka.
// Testiparametrit: ?track=N (valmis rata) &veh=N &opp=ei|haamu|helppo|keski|kova &auto (tekoäly ajaa) &ff=SEK (pikakelaus)
//   &cam=N &style=retro|moderni &screen=tracks|setup|editor|settings|help &replay (siirry uusintaan maalin jälkeen) &touch &mute
import * as SC from './scene.js';
import * as AU from './audio.js';
import IN, { bindTouch } from './input.js';
import * as UI from './ui.js';
import * as ST from './storage.js';
import { G, update, key, showTrack } from './game.js';
import { BUILTIN } from './tracks.js';
import { OPPONENTS } from './data.js';

const qs = new URLSearchParams(location.search);
const html = document.documentElement;

function boot() {
  const set = ST.settings();
  if (qs.get('style')) { set.style = qs.get('style'); ST.saveSettings(set); }
  if (qs.has('mute')) set.sound = false;
  AU.setOn(set.sound);
  SC.init(document.getElementById('cv'));
  SC.setStyle(set.style);
  UI.init();
  IN.onKey = code => { AU.unlock(); key(code); };
  bindTouch(document.getElementById('touch'), k => { if (k === 'cam') key('KeyC'); else if (k === 'reset') key('KeyR'); else if (k === 'pause') key('Escape'); });
  addEventListener('pointerdown', () => AU.unlock(), { passive: true });
  const builtin = BUILTIN();
  showTrack(builtin[Math.max(0, Math.min(builtin.length - 1, +qs.get('track') || 0))]);

  // testikoukut
  if (qs.has('track') && !qs.has('screen')) {
    const s = ST.settings();
    s.vi = +qs.get('veh') || 0; s.opp = Math.max(0, OPPONENTS.findIndex(o => o.id === (qs.get('opp') || 'ei')));
    ST.saveSettings(s);
    pickAndGo(builtin[+qs.get('track') || 0]);
  } else {
    const scr = qs.get('screen');
    if (scr === 'editor' && qs.has('track')) UI.editor(builtin[+qs.get('track')]);
    else if (scr && UI[scr]) UI[scr](); else UI.title();
  }
  let last = performance.now(), t0 = last;
  const loop = now => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    html.dataset.mode = G.mode;
    if (G.mode === 'race' || G.mode === 'replay' || G.mode === 'post') {
      if (G.mode === 'post') { /* tulokset näkyvät, kisa pysähtynyt taustalle */ update(0); }
      else update(dt);
      if (G.race) html.dataset.race = (G.race.done ? 'done' : 'run') + ' ' + G.race.t.toFixed(1) + ' k' + G.race.racers[0].k;
      if (qs.has('replay') && G.mode === 'post' && !G.rpAuto) { G.rpAuto = true; document.querySelector('[data-a=replay]') && document.querySelector('[data-a=replay]').click(); }
    } else if (G.mode !== 'editor') SC.orbit((now - t0) / 1000);
  };
  requestAnimationFrame(loop);

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

function pickAndGo(t) {
  // valitaan rata kuten valikosta ja käynnistetään kisa
  UI.tracks();
  const k = 'b' + BUILTIN().findIndex(b => b.id === t.id);
  const b = document.querySelector('[data-a=pick][data-k="' + k + '"]');
  if (b) b.click();
  UI.go({ auto: qs.has('auto'), ff: +qs.get('ff') || 0 });
  if (qs.has('cam')) SC.setCam(+qs.get('cam'));
}

addEventListener('error', e => { html.dataset.err = (html.dataset.err || '') + (e.message || 'virhe') + ' @ ' + (e.filename || '').split('/').pop() + ':' + (e.lineno || 0) + ' | '; });
addEventListener('unhandledrejection', e => { html.dataset.err = (html.dataset.err || '') + 'lupaus: ' + (e.reason && e.reason.message || e.reason) + ' | '; });
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
