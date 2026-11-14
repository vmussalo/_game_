/* Elämänkoulu – yleiset apufunktiot. Kaikki pelin osat kuuluvat nimiavaruuteen EK. */
(function () {
  'use strict';
  const EK = window.EK = window.EK || {};

  const U = EK.U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sign = v => v < 0 ? -1 : 1;
  U.ease = t => t * t * (3 - 2 * t);
  U.easeOut = t => 1 - (1 - t) * (1 - t);
  U.deg = Math.PI / 180;

  // Toistettava satunnaislukugeneraattori (mulberry32), jotta simulaatiot ovat toistettavia
  U.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = n => Math.floor(f() * n);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  };

  U.shuffle = function (arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  // Laatikoiden päällekkäisyys: {x0,x1,y0,y1}
  U.overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

  // URL-parametrit (testit ja pikakelaus)
  U.params = (function () {
    const out = {};
    try {
      const s = (typeof location !== 'undefined' && location.search) || '';
      new URLSearchParams(s).forEach((v, k) => { out[k] = v === '' ? true : v; });
    } catch (e) { /* ei selainta */ }
    return out;
  })();

  // Tallennus: selaimen localStorage voi puuttua tai heittää virheen (yksityinen ikkuna)
  U.load = function (key, def) {
    try { const v = localStorage.getItem('elamankoulu.' + key); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  U.save = function (key, val) {
    try { localStorage.setItem('elamankoulu.' + key, JSON.stringify(val)); } catch (e) { /* ei tallennusta */ }
  };

  // Tekstin rivitys kankaalle
  U.wrap = function (ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach(par => {
      const words = par.split(' ');
      let line = '';
      words.forEach(w => {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      out.push(line);
    });
    return out;
  };

  U.hex2rgb = function (h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.shade = function (h, k) { // k < 0 tummentaa, k > 0 vaalentaa
    const c = U.hex2rgb(h).map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
    return '#' + c.map(v => ('0' + U.clamp(v, 0, 255).toString(16)).slice(-2)).join('');
  };
})();
