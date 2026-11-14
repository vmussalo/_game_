/* AgriRalli – apufunktiot */
(function () {
  'use strict';
  const AR = window.AR = window.AR || {};
  const U = AR.U = {};

  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.angDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.irand = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  // toistettava satunnaislukugeneraattori (radan koristeet pysyvät samoina)
  U.rng = seed => {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  U.fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  U.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.fill = (tpl, o) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));

  // värin vaalennus/tummennus (#rrggbb, k -1…1)
  U.shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  };

  // localStorage voi puuttua (yksityinen ikkuna, esto) → peli toimii silti
  U.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ei tallennusta */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ohitetaan */ } }
  };

  U.qs = new URLSearchParams(location.search);
  U.$ = id => document.getElementById(id);

  // pyöristetty suorakulmio piirtopolkuna
  U.rr = (ctx, x, y, w, h, r) => {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
})();
