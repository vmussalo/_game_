/* FarmSim Online – grafiikka. Kaikki kuvat piirretään koodilla 16×16-pikselin ruutuihin (ei ulkoisia kuvia).
 * FS.gfx.get(nimi) palauttaa canvas-elementin.
 * Alkuperäistyyli (FS.retro): piirrokset muunnetaan 1990-luvun VGA-pelien tapaan 16 värin paletille
 * järjestetyllä rasteroinnilla (dithering). Paletti vastaa SimFarmin DOS-version VGA-paletin värisävyjä;
 * kuvat itse ovat omia. */
'use strict';
(function () {
  var FS = window.FS, S = 16, cache = {};
  var rng = new FS.Rng(1993);

  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c: c, x: x }; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(v) { return Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); }
    return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(b)).toString(16).slice(1);
  }
  FS.shade = shade;
  function R(x, X, y, w, h, col) { x.fillStyle = col; x.fillRect(X, y, w, h); }
  function P(x, X, y, col) { x.fillStyle = col; x.fillRect(X, y, 1, 1); }
  function speckle(x, X, Y, w, h, cols, n) { for (var i = 0; i < n; i++) P(x, X + Math.floor(rng.next() * w), Y + Math.floor(rng.next() * h), cols[Math.floor(rng.next() * cols.length)]); }
  function disc(x, cx, cy, r, col) { x.fillStyle = col; for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + r * 0.6) x.fillRect(cx + xx, cy + yy, 1, 1); }
  function line(x, x0, y0, x1, y1, col) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (var i = 0; i <= n; i++) P(x, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col); }

  FS.retro = FS.storage.get('fso_retro') !== '0';
  /* 16 värin VGA-paletti (DOS-version sävyt). */
  var PAL16 = ['#000000', '#fff204', '#8dc6e2', '#c20404', '#f27569', '#0000a5', '#0000ea', '#917138',
    '#00aa04', '#007d04', '#814004', '#917138', '#c2c2c2', '#818181', '#404040', '#ffffff'];
  FS.PAL16 = PAL16;
  var PALRGB = PAL16.map(function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
  var PALCH = PALRGB.map(function (q) { return Math.max(q[0], q[1], q[2]) - Math.min(q[0], q[1], q[2]); });
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /** Muuntaa canvasin 16 värin paletille järjestetyllä rasteroinnilla. Puoliläpinäkyvät varjot rasteroidaan mustiksi pisteiksi. */
  function quantize(c) {
    var x = c.getContext('2d'), im = x.getImageData(0, 0, c.width, c.height), d = im.data, w = c.width;
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      var a = d[i + 3];
      if (!a) continue;
      var th = (BAYER[((p / w | 0) & 3) * 4 + ((p % w) & 3)] + 0.5) / 16;
      if (a < 250) {
        if (a / 255 * 1.7 > th) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; } else d[i + 3] = 0;
        continue;
      }
      var r = d[i], g = d[i + 1], b = d[i + 2], b1 = 0, b2 = 0, d1 = 1e9, d2 = 1e9;
      var chS = Math.max(r, g, b) - Math.min(r, g, b);
      for (var k = 0; k < 16; k++) {
        var q = PALRGB[k], dr = r - q[0], dg = g - q[1], db = b - q[2], dc = chS - PALCH[k];
        var dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 + dc * dc * 0.6; // värikylläisyys säilyy
        if (dist < d1) { d2 = d1; b2 = b1; d1 = dist; b1 = k; } else if (dist < d2 && PAL16[k] !== PAL16[b1]) { d2 = dist; b2 = k; }
      }
      var t = d1 === 0 ? 0 : Math.sqrt(d1) / (Math.sqrt(d1) + Math.sqrt(d2));
      var use = t > th ? PALRGB[b2] : PALRGB[b1];
      d[i] = use[0]; d[i + 1] = use[1]; d[i + 2] = use[2]; d[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }

  var C = {
    grass: '#4f9a2c', grass2: '#5aa834', grass3: '#438a26', dirt: '#9c6c3c', dirt2: '#8a5c30', dirt3: '#b07c48',
    water: '#2c5cb0', water2: '#3c74c8', water3: '#24489a', sand: '#d8c47c', road: '#5c5c64', road2: '#74747c', line: '#e8d040',
    wood: '#8a5a2a', wood2: '#6a4220', rock: '#8c8c94', rock2: '#b4b4bc', rock3: '#5c5c64', leaf: '#2e7a24', leaf2: '#3e9a30', leaf3: '#1e5a18',
    red: '#c02a24', white: '#f0f0e8', black: '#18181c', shadow: 'rgba(0,0,0,0.28)'
  };
  if (FS.retro) {
    // Alkuperäistyylinen maasto: ruskea maa vihrein täplin, kirkas sininen vesi, vaaleanharmaat tiet
    C.grass = '#917138'; C.grass2 = '#00aa04'; C.grass3 = '#007d04';
    C.dirt = '#917138'; C.dirt2 = '#814004'; C.dirt3 = '#404040';
    C.water = '#0000ea'; C.water2 = '#8dc6e2'; C.water3 = '#0000a5'; C.sand = '#814004';
    C.road = '#818181'; C.road2 = '#c2c2c2'; C.line = '#ffffff';
    C.leaf = '#007d04'; C.leaf2 = '#00aa04'; C.leaf3 = '#004d02';
    // Kasvien värit lähimmiksi palettisävyiksi: lehdet vihreitä, hedelmät kirkkaita
    FS.CROPS.forEach(function (c) {
      c.col = [c.col[0], c.col[1]];
      var f = c.col[1], n = parseInt(f.slice(1), 16), R0 = n >> 16, G0 = (n >> 8) & 255, B0 = n & 255;
      c.col[0] = (c.idx % 2) ? '#00aa04' : '#108a04';
      if (R0 > 200 && G0 > 200 && B0 > 180) c.col[1] = '#ffffff';
      else if (R0 > 200 && G0 > 170) c.col[1] = '#fff204';
      else if (R0 > 190 && G0 < 90) c.col[1] = '#f21010';
      else if (R0 > 200) c.col[1] = '#f27569';
      else if (B0 > R0) c.col[1] = '#3a10a0';
      else c.col[1] = '#a07030';
    });
  }
  FS.COL = C;

  var make = {};

  /* ---------- Maasto ---------- */
  [0, 1, 2, 3].forEach(function (v) {
    make['grass' + v] = function () { var k = cv(S, S); R(k.x, 0, 0, S, S, C.grass); speckle(k.x, 0, 0, S, S, [C.grass2, C.grass3, C.grass2], 22 + v * 3); if (v === 3) { P(k.x, 5, 6, '#e8e070'); P(k.x, 11, 11, '#f0f0f0'); } return k.c; };
    make['dirt' + v] = function () { var k = cv(S, S); R(k.x, 0, 0, S, S, C.dirt); speckle(k.x, 0, 0, S, S, [C.dirt2, C.dirt3], 26); return k.c; };
  });
  [0, 1].forEach(function (f) {
    make['water' + f] = function () {
      var k = cv(S, S); R(k.x, 0, 0, S, S, C.water);
      for (var i = 0; i < 4; i++) { var y = (i * 4 + f * 2) % S, x0 = (i * 7 + f * 3) % 12; R(k.x, x0, y, 4, 1, C.water2); }
      speckle(k.x, 0, 0, S, S, [C.water3], 6); return k.c;
    };
  });
  make.rock = function () { var k = cv(S, S); disc(k.x, 8, 10, 4, C.shadow); disc(k.x, 7, 8, 4, C.rock); disc(k.x, 6, 7, 2, C.rock2); P(k.x, 9, 10, C.rock3); P(k.x, 10, 9, C.rock3); P(k.x, 4, 11, C.rock3); return k.c; };
  [0, 1].forEach(function (v) {
    make['tree' + v] = function () {
      var k = cv(S, S); disc(k.x, 9, 11, 5, C.shadow); R(k.x, 7, 10, 2, 5, C.wood2);
      disc(k.x, 8, 7, 6, v ? C.leaf3 : C.leaf); disc(k.x, 7, 6, 4, v ? C.leaf : C.leaf2); speckle(k.x, 3, 2, 10, 9, [C.leaf3, C.leaf2], 10); P(k.x, 5, 4, '#6ab84a'); return k.c;
    };
  });
  make.bush = function () { var k = cv(S, S); disc(k.x, 8, 10, 3, C.shadow); disc(k.x, 7, 9, 3, C.leaf); disc(k.x, 6, 8, 1, C.leaf2); return k.c; };

  /* Yhdistyvät ruudut: maski bitit 1=ylä 2=oikea 4=ala 8=vasen */
  function masked(name, fn) { for (var m = 0; m < 16; m++) (function (m) { make[name + m] = function () { var k = cv(S, S); fn(k.x, m); return k.c; }; })(m); }
  masked('paved', function (x, m) {
    R(x, 4, 4, 8, 8, C.road);
    if (m & 1) R(x, 4, 0, 8, 4, C.road); if (m & 4) R(x, 4, 12, 8, 4, C.road);
    if (m & 2) R(x, 12, 4, 4, 8, C.road); if (m & 8) R(x, 0, 4, 4, 8, C.road);
    if (!m) { R(x, 1, 4, 14, 8, C.road); }
    if ((m & 5) && !(m & 10)) { R(x, 7, 1, 2, 3, C.line); R(x, 7, 9, 2, 3, C.line); }
    else if ((m & 10) && !(m & 5)) { R(x, 1, 7, 3, 2, C.line); R(x, 9, 7, 3, 2, C.line); }
    speckle(x, 4, 4, 8, 8, [C.road2], 4);
  });
  masked('dirtroad', function (x, m) {
    var c = '#b8925a', c2 = '#a07a48';
    R(x, 4, 4, 8, 8, c);
    if (m & 1) R(x, 4, 0, 8, 4, c); if (m & 4) R(x, 4, 12, 8, 4, c);
    if (m & 2) R(x, 12, 4, 4, 8, c); if (m & 8) R(x, 0, 4, 4, 8, c);
    if (!m) R(x, 1, 4, 14, 8, c);
    speckle(x, 0, 0, S, S, [c2], 6);
  });
  masked('fence', function (x, m) {
    var post = C.wood2, rail = '#b08050';
    if (m & 1) R(x, 7, 0, 2, 8, rail); if (m & 4) R(x, 7, 8, 2, 8, rail);
    if (m & 2) { R(x, 8, 5, 8, 1, rail); R(x, 8, 9, 8, 1, rail); } if (m & 8) { R(x, 0, 5, 8, 1, rail); R(x, 0, 9, 8, 1, rail); }
    if (!m) { R(x, 0, 5, 16, 1, rail); R(x, 0, 9, 16, 1, rail); }
    R(x, 6, 4, 3, 7, post); P(x, 6, 4, '#c09060');
  });
  [0, 1].forEach(function (open) {
    make['gate' + open] = function () {
      var k = cv(S, S), x = k.x; R(x, 0, 4, 2, 8, C.wood2); R(x, 14, 4, 2, 8, C.wood2);
      if (open) { R(x, 2, 5, 1, 6, '#d8b070'); R(x, 13, 5, 1, 6, '#d8b070'); }
      else { R(x, 2, 5, 12, 1, '#d8b070'); R(x, 2, 9, 12, 1, '#d8b070'); line(x, 2, 9, 13, 5, '#d8b070'); }
      return k.c;
    };
  });
  [0, 1].forEach(function (wet) {
    masked('ditch' + wet, function (x, m) {
      var e = '#6a4626', in_ = wet ? '#3c7ad0' : '#7a5632';
      function seg(X, Y, w, h) { R(x, X, Y, w, h, e); R(x, X + (w > 6 ? 0 : 1), Y + (h > 6 ? 0 : 1), w > 6 ? w : w - 2, h > 6 ? h : h - 2, in_); }
      seg(5, 5, 6, 6);
      if (m & 1) seg(5, 0, 6, 6); if (m & 4) seg(5, 10, 6, 6); if (m & 2) seg(10, 5, 6, 6); if (m & 8) seg(0, 5, 6, 6);
      if (!m) seg(2, 5, 12, 6);
      if (wet) { P(x, 7, 7, '#7ab0f0'); }
    });
  });
  [0, 1].forEach(function (open) {
    make['valve' + open] = function () { var k = cv(S, S); disc(k.x, 8, 8, 4, C.black); disc(k.x, 8, 8, 3, open ? '#30c040' : '#d03028'); R(k.x, 7, 3, 2, 10, C.black); R(k.x, 3, 7, 10, 2, C.black); P(k.x, 8, 8, '#e0e0e0'); return k.c; };
  });
  make.feed = function () { var k = cv(S, S), x = k.x; R(x, 3, 6, 10, 8, '#7a5a1a'); R(x, 3, 5, 10, 8, '#e0c050'); R(x, 3, 8, 10, 1, '#b89030'); R(x, 6, 5, 1, 8, '#b89030'); R(x, 10, 5, 1, 8, '#b89030'); speckle(x, 3, 5, 10, 8, ['#f0d870'], 6); return k.c; };
  make.feedlow = function () { var k = cv(S, S), x = k.x; R(x, 4, 10, 8, 3, '#c8a840'); speckle(x, 3, 9, 10, 5, ['#e0c050', '#a08030'], 8); return k.c; };
  [0, 1].forEach(function (full) {
    make['trough' + full] = function () { var k = cv(S, S), x = k.x; R(x, 2, 6, 12, 7, C.wood2); R(x, 3, 7, 10, 4, full ? '#3c7ad0' : '#8a8a8a'); if (full) R(x, 4, 7, 4, 1, '#7ab0f0'); return k.c; };
  });

  /* ---------- Pellot ---------- */
  FS.gfx = { S: S };
  function fieldTile(stage, crop) {
    var k = cv(S, S), x = k.x, i;
    var soil = stage === 'fallow' ? '#8c6438' : '#7a4e2a';
    R(x, 0, 0, S, S, soil);
    for (i = 0; i < 4; i++) R(x, 0, i * 4 + 2, S, 1, shade(soil, -0.25));
    if (stage === 'plowed') { for (i = 0; i < 4; i++) R(x, 0, i * 4 + 1, S, 1, shade(soil, 0.15)); return k.c; }
    if (stage === 'fallow') { speckle(x, 0, 0, S, S, ['#5a8a2a', '#6a9a30', '#4a7a24'], 18); return k.c; }
    if (stage === 'dead') { for (i = 0; i < 4; i++) for (var j = 0; j < 8; j++) P(x, j * 2 + (i & 1), i * 4 + 1, j % 3 ? '#7a6a3a' : '#5a4a2a'); return k.c; }
    var leaf = crop.col[0], fruit = crop.col[1];
    for (i = 0; i < 4; i++) {
      var y = i * 4 + 1;
      for (var xx = 0; xx < 16; xx++) {
        if (stage === 'sprout') { if (xx % 3 === 0) P(x, xx, y, shade(leaf, 0.25)); }
        else if (stage === 'young') { R(x, xx, y - 1, 1, 2, xx % 2 ? leaf : shade(leaf, 0.15)); }
        else { R(x, xx, y - 1, 1, 3, xx % 2 ? leaf : shade(leaf, -0.15)); }
      }
      if (stage === 'mature' || stage === 'ripe') {
        for (var f = 0; f < 5; f++) { var fx = (f * 3 + i * 2) % 16; P(x, fx, y, stage === 'ripe' ? fruit : shade(fruit, -0.3)); if (stage === 'ripe') P(x, (fx + 1) % 16, y - 1, shade(fruit, 0.2)); }
      }
    }
    if (crop.perennial && (stage === 'mature' || stage === 'ripe' || stage === 'young')) {
      // puut ja köynnökset: pyöreät latvat riveissä
      R(x, 0, 0, S, S, '#6a8a3a');
      for (var ty = 0; ty < 2; ty++) for (var tx = 0; tx < 2; tx++) {
        var cx = tx * 8 + 4, cy = ty * 8 + 4;
        disc(x, cx + 1, cy + 1, 3, C.shadow); disc(x, cx, cy, 3, leaf); P(x, cx - 1, cy - 1, shade(leaf, 0.3));
        if (stage !== 'young') { P(x, cx + 1, cy, fruit); P(x, cx - 1, cy + 1, fruit); if (stage === 'ripe') { P(x, cx, cy - 2, fruit); P(x, cx + 2, cy + 1, fruit); } }
      }
    }
    return k.c;
  }
  FS.CROPS.forEach(function (c) {
    ['sprout', 'young', 'mature', 'ripe'].forEach(function (st) { make['f_' + c.id + '_' + st] = function () { return fieldTile(st, c); }; });
  });
  ['plowed', 'fallow', 'dead'].forEach(function (st) { make['f_' + st] = function () { return fieldTile(st); }; });

  /* ---------- Rakennukset ---------- */
  function roofHouse(x, X, Y, w, h, wall, roof, opts) {
    opts = opts || {};
    R(x, X + 2, Y + h - 2, w, 2, C.shadow);
    var rh = Math.floor(h * 0.55);
    R(x, X, Y + rh, w, h - rh, wall);
    R(x, X, Y + rh, w, 1, shade(wall, -0.2));
    for (var i = 0; i < rh; i++) R(x, X, Y + i, w, 1, i % 3 === 2 ? shade(roof, -0.18) : roof);
    R(x, X, Y + rh - 1, w, 1, shade(roof, -0.35));
    R(x, X, Y, w, 1, shade(roof, 0.25));
    if (opts.door !== false) R(x, X + Math.floor(w / 2) - 1, Y + h - 4, 3, 4, opts.doorCol || C.wood2);
    var nwin = Math.floor(w / 6);
    for (var k = 0; k < nwin; k++) { var wx = X + 2 + k * Math.floor((w - 4) / nwin); if (Math.abs(wx - (X + w / 2)) > 3) { R(x, wx, Y + rh + 2, 3, 3, '#9ad0f0'); P(x, wx, Y + rh + 2, '#e0f4ff'); } }
    if (opts.chimney) R(x, X + w - 5, Y - 2, 2, 4, '#7a3a2a');
  }
  var HOME_STYLES = [
    function (x) { R(x, 0, 0, 64, 64, C.grass); speckle(x, 0, 0, 64, 64, [C.grass2, C.grass3], 90); roofHouse(x, 14, 18, 30, 26, '#c8b088', '#7a5a3a', { chimney: true }); R(x, 26, 44, 6, 20, '#b8925a'); },
    function (x) { R(x, 0, 0, 64, 64, C.grass); speckle(x, 0, 0, 64, 64, [C.grass2, C.grass3], 90); roofHouse(x, 8, 14, 40, 30, '#e8e0d0', '#a83a2a', { chimney: true }); R(x, 26, 44, 6, 20, '#b8925a'); R(x, 50, 30, 10, 2, C.wood); R(x, 50, 36, 10, 2, C.wood); },
    function (x) { R(x, 0, 0, 64, 64, C.grass); speckle(x, 0, 0, 64, 64, [C.grass2, C.grass3], 90); roofHouse(x, 4, 10, 44, 34, '#f0ece0', '#3a5a9a', { chimney: true }); roofHouse(x, 46, 24, 16, 20, '#f0ece0', '#3a5a9a', { door: false }); R(x, 24, 44, 6, 20, '#a0a0a0'); disc(x, 56, 52, 4, C.leaf); disc(x, 8, 54, 3, '#d04080'); },
    function (x) { R(x, 0, 0, 64, 64, '#5aa834'); for (var i = 0; i < 64; i += 4) R(x, i, 0, 2, 64, '#55a030'); roofHouse(x, 6, 6, 52, 36, '#f4f0e4', '#2a2a3a', { chimney: true }); R(x, 28, 42, 8, 22, '#c0c0c0'); disc(x, 10, 52, 5, C.leaf); disc(x, 54, 52, 5, C.leaf); R(x, 20, 50, 6, 6, '#3c7ad0'); },
    function (x) { R(x, 0, 0, 64, 64, '#5aa834'); for (var i = 0; i < 64; i += 4) R(x, i, 0, 2, 64, '#55a030'); roofHouse(x, 2, 4, 60, 38, '#fff8e8', '#6a2a2a', { chimney: true }); R(x, 26, 6, 12, 8, '#fff8e8'); R(x, 26, 2, 12, 4, '#6a2a2a'); R(x, 28, 42, 8, 22, '#d8d8d8'); disc(x, 32, 54, 5, '#3c7ad0'); disc(x, 8, 54, 5, C.leaf); disc(x, 56, 54, 5, C.leaf); }
  ];
  HOME_STYLES.forEach(function (fn, i) { make['home' + i] = function () { var k = cv(64, 64); fn(k.x); return k.c; }; });

  function silo(x, X, Y, w, h, col) {
    R(x, X + 2, Y + h - 3, w, 3, C.shadow);
    R(x, X, Y + 4, w, h - 6, col);
    for (var i = 0; i < w; i++) { var t = i / w; R(x, X + i, Y + 4, 1, h - 6, shade(col, t < 0.3 ? 0.2 : t > 0.75 ? -0.25 : 0)); }
    for (var j = Y + 8; j < Y + h - 3; j += 4) R(x, X, j, w, 1, shade(col, -0.3));
    disc(x, X + w / 2, Y + 4, w / 2, shade(col, 0.3)); R(x, X + w / 2 - 1, Y, 2, 2, '#888');
  }
  make.silo_s = function () { var k = cv(32, 32); silo(k.x, 9, 1, 14, 30, '#b8c0c8'); return k.c; };
  make.silo_l = function () { var k = cv(48, 48); silo(k.x, 6, 1, 18, 46, '#c8c8d0'); silo(k.x, 26, 6, 16, 41, '#3a6aa8'); return k.c; };
  function shed(x, w, h, wall, roof) {
    R(x, 2, h - 3, w - 2, 3, C.shadow);
    R(x, 0, 6, w - 2, h - 8, wall);
    for (var i = 0; i < w - 2; i += 3) R(x, i, 6, 1, h - 8, shade(wall, -0.15));
    R(x, 0, 0, w - 2, 7, roof); for (var j = 0; j < w - 2; j += 2) R(x, j, 0, 1, 7, shade(roof, -0.12));
    R(x, Math.floor(w / 2) - 7, h - 12, 12, 10, '#3a2a1a');
  }
  make.shed_s = function () { var k = cv(48, 32); shed(k.x, 48, 32, '#9aa0a8', '#6a7078'); return k.c; };
  make.shed_l = function () { var k = cv(64, 48); shed(k.x, 64, 48, '#9aa0a8', '#5a6068'); return k.c; };
  function barn(x, w, h) {
    R(x, 3, h - 3, w - 3, 3, C.shadow);
    var rh = Math.floor(h * 0.45);
    R(x, 0, rh, w - 2, h - rh - 2, '#b02a20');
    for (var i = 0; i < w - 2; i += 3) R(x, i, rh, 1, h - rh - 2, '#901e18');
    for (var r = 0; r < rh; r++) { var inset = Math.max(0, Math.round((rh - r) * 0.35) - 2); R(x, inset, r, w - 2 - inset * 2, 1, r % 3 ? '#5a5a62' : '#4a4a52'); }
    var dw = Math.floor(w / 3); R(x, (w - 2 - dw) / 2, h - 2 - Math.floor(h * 0.35), dw, Math.floor(h * 0.35), '#f0f0e8');
    line(x, (w - 2 - dw) / 2, h - 3 - Math.floor(h * 0.35), (w - 2 + dw) / 2 - 1, h - 3, '#b02a20'); line(x, (w - 2 + dw) / 2 - 1, h - 3 - Math.floor(h * 0.35), (w - 2 - dw) / 2, h - 3, '#b02a20');
    R(x, (w - 2) / 2 - 2, rh + 2, 4, 4, '#f0f0e8');
  }
  make.barn_s = function () { var k = cv(48, 48); barn(k.x, 48, 48); return k.c; };
  make.barn_l = function () { var k = cv(64, 64); barn(k.x, 64, 64); return k.c; };
  make.pump = function () { var k = cv(S, S), x = k.x; R(x, 2, 4, 12, 10, '#4a5a6a'); R(x, 3, 5, 10, 4, '#6a7a8a'); disc(x, 8, 10, 2, '#e0c040'); R(x, 12, 2, 2, 4, '#3a3a3a'); return k.c; };
  [0, 1].forEach(function (f) {
    make['windmill' + f] = function () {
      var k = cv(S, 32), x = k.x; R(x, 9, 26, 6, 4, C.shadow);
      line(x, 5, 30, 8, 10, '#8a8a8a'); line(x, 11, 30, 8, 10, '#8a8a8a'); line(x, 6, 22, 10, 22, '#8a8a8a');
      disc(x, 8, 9, 1, '#555');
      if (f) { line(x, 8, 9, 2, 3, '#d0d0d0'); line(x, 8, 9, 14, 15, '#d0d0d0'); line(x, 8, 9, 14, 3, '#a0a0a0'); line(x, 8, 9, 2, 15, '#a0a0a0'); }
      else { line(x, 8, 2, 8, 16, '#d0d0d0'); line(x, 1, 9, 15, 9, '#a0a0a0'); }
      R(x, 9, 6, 5, 2, C.red);
      return k.c;
    };
  });
  make.tower = function () { var k = cv(S, 32), x = k.x; R(x, 6, 28, 8, 3, C.shadow); line(x, 4, 30, 6, 12, '#7a5a3a'); line(x, 12, 30, 10, 12, '#7a5a3a'); R(x, 2, 4, 12, 9, '#7a5a3a'); R(x, 3, 5, 10, 7, '#9a7a4a'); R(x, 2, 2, 12, 2, '#5a4a3a'); return k.c; };

  /* ---------- Kaupunki ---------- */
  function townPlot(type, seed) {
    var k = cv(128, 128), x = k.x, r = new FS.Rng(seed + 11);
    R(x, 0, 0, 128, 128, '#5aa834'); speckle(x, 0, 0, 128, 128, [C.grass3, C.grass2], 200);
    // Katuverkko reunoilla
    R(x, 0, 56, 128, 16, C.road); R(x, 56, 0, 16, 128, C.road);
    for (var i = 4; i < 128; i += 12) { R(x, i, 63, 6, 2, '#d8d8d8'); R(x, 63, i, 2, 6, '#d8d8d8'); }
    R(x, 0, 54, 128, 2, '#b0b0b0'); R(x, 0, 72, 128, 2, '#b0b0b0'); R(x, 54, 0, 2, 128, '#b0b0b0'); R(x, 72, 0, 2, 128, '#b0b0b0');
    var q = [[2, 2], [76, 2], [2, 76], [76, 76]];
    var roofs = ['#a83a2a', '#3a5a9a', '#4a7a3a', '#7a5a3a', '#6a6a72', '#9a4a8a'];
    function houses(X, Y) { for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) roofHouse(x, X + a * 25 + 1, Y + b * 25 + 2, 20, 18, '#e8e0d0', roofs[r.int(0, roofs.length - 1)], { chimney: r.chance(0.5) }); }
    function shop(X, Y, col, label) { roofHouse(x, X + 2, Y + 6, 46, 36, '#f0ece0', col, {}); R(x, X + 6, Y + 32, 38, 3, col); if (label) { R(x, X + 14, Y + 26, 22, 5, '#fff'); R(x, X + 16, Y + 27, 18, 3, col); } }
    var T2 = {
      center: function () { shop(q[0][0], q[0][1], '#8a6a2a', true); // pankki
        roofHouse(x, q[1][0] + 2, q[1][1] + 6, 46, 36, '#c8a878', '#5a3a1a', { chimney: true }); // kapakka
        houses(q[2][0], q[2][1]); shop(q[3][0], q[3][1], '#2a6a3a', true); },
      homes: function () { q.forEach(function (p) { houses(p[0], p[1]); }); },
      shops: function () { q.forEach(function (p, j) { shop(p[0], p[1], roofs[j], true); }); },
      market: function () { R(x, 4, 6, 120, 44, '#d8c8a8'); for (var j = 0; j < 6; j++) R(x, 8 + j * 19, 10, 15, 36, j % 2 ? '#c03a2a' : '#f0f0e8'); houses(q[2][0], q[2][1]); houses(q[3][0], q[3][1]); },
      jobs: function () { roofHouse(x, 4, 4, 48, 46, '#d8d0c0', '#4a4a6a', {}); R(x, 14, 20, 28, 6, '#ffffff'); R(x, 16, 21, 24, 4, '#2a4a8a'); houses(q[1][0], q[1][1]); houses(q[2][0], q[2][1]); houses(q[3][0], q[3][1]); },
      school: function () { roofHouse(x, 2, 2, 120, 48, '#e8c890', '#7a3a2a', { chimney: true }); R(x, 60, 0, 8, 10, '#e8c890'); R(x, 62, 2, 4, 4, '#f0d040'); R(x, 6, 78, 46, 44, '#c89a5a'); disc(x, 100, 100, 12, C.leaf); },
      airport: function () { R(x, 0, 0, 128, 54, '#7a8a6a'); R(x, 4, 18, 120, 16, '#4a4a52'); for (var j = 8; j < 120; j += 12) R(x, j, 25, 6, 2, '#f0f0f0'); var h = cv(50, 40); shed(h.x, 50, 40, '#b0b8c0', '#707880'); x.drawImage(h.c, 4, 80); x.drawImage(get('plane'), 90, 88); },
      fair: function () { disc(x, 28, 28, 22, '#c8a870'); disc(x, 28, 28, 16, '#5aa834'); for (var j = 0; j < 3; j++) { var tx = 80 + j * 15; R(x, tx, 14, 12, 14, j % 2 ? '#e0c030' : '#c03a2a'); R(x, tx + 5, 8, 2, 6, '#c03a2a'); } houses(q[2][0], q[2][1]); houses(q[3][0], q[3][1]); },
      factory: function () { R(x, 2, 8, 120, 44, '#8a7a6a'); for (var j = 0; j < 5; j++) R(x, 6 + j * 24, 4, 18, 8, '#6a5a4a'); R(x, 100, 0, 8, 10, '#4a3a3a'); disc(x, 104, 0, 4, '#b0b0b0'); houses(q[2][0], q[2][1]); R(x, 80, 80, 44, 40, '#7a7a82'); },
      build: function () { q.forEach(function (p) { R(x, p[0] + 2, p[1] + 2, 48, 48, '#a07a48'); speckle(x, p[0] + 2, p[1] + 2, 48, 48, ['#8a6a3a', '#b88a58'], 60); }); R(x, 20, 20, 14, 2, '#e0c030'); R(x, 26, 6, 2, 30, '#e0c030'); }
    };
    (T2[type] || T2.homes)();
    return k.c;
  }

  /* ---------- Koneet ---------- */
  function wheel(x, X, Y, r) { disc(x, X, Y, r, C.black); P(x, X, Y, '#777'); }
  make.m_tractor = function () { var k = cv(S, S), x = k.x; R(x, 3, 12, 11, 2, C.shadow); R(x, 3, 6, 10, 5, '#c82a20'); R(x, 9, 2, 4, 5, '#c82a20'); R(x, 10, 3, 2, 3, '#9ad0f0'); R(x, 3, 6, 6, 1, '#e84a3a'); wheel(x, 4, 11, 2); wheel(x, 11, 11, 3); R(x, 2, 4, 1, 3, '#555'); return k.c; };
  make.m_plow = function () { var k = cv(S, S), x = k.x; R(x, 2, 6, 12, 2, '#555'); for (var i = 0; i < 4; i++) { line(x, 3 + i * 3, 8, 5 + i * 3, 12, '#c0c0c8'); } R(x, 1, 5, 2, 4, '#3a3a3a'); return k.c; };
  make.m_planter = function () { var k = cv(S, S), x = k.x; R(x, 2, 5, 12, 6, '#2a6ab0'); R(x, 3, 3, 4, 3, '#e0c040'); R(x, 9, 3, 4, 3, '#e0c040'); wheel(x, 4, 12, 2); wheel(x, 12, 12, 2); return k.c; };
  make.m_sprayer = function () { var k = cv(S, S), x = k.x; disc(x, 8, 7, 4, '#e0e0e0'); R(x, 0, 11, 16, 1, '#555'); for (var i = 1; i < 16; i += 3) P(x, i, 12, '#7ab0f0'); wheel(x, 8, 13, 2); return k.c; };
  make.m_harvester = function () { var k = cv(32, S), x = k.x; R(x, 3, 13, 27, 2, C.shadow); R(x, 8, 4, 18, 8, '#3a8a2a'); R(x, 18, 1, 7, 6, '#3a8a2a'); R(x, 19, 2, 5, 3, '#9ad0f0'); R(x, 1, 8, 7, 4, '#e0c040'); for (var i = 1; i < 8; i += 2) R(x, i, 9, 1, 2, '#8a7a2a'); R(x, 10, 1, 2, 4, '#2a6a1a'); wheel(x, 12, 12, 3); wheel(x, 24, 12, 2); return k.c; };
  make.m_trailer = function () { var k = cv(32, S), x = k.x; R(x, 3, 13, 26, 2, C.shadow); R(x, 4, 4, 24, 8, '#8a6a3a'); R(x, 5, 5, 22, 3, '#a8844a'); R(x, 0, 9, 4, 1, '#555'); wheel(x, 10, 12, 2); wheel(x, 22, 12, 2); return k.c; };
  make.m_truck = function () { var k = cv(32, S), x = k.x; R(x, 3, 13, 27, 2, C.shadow); R(x, 2, 4, 18, 8, '#d8d8d0'); R(x, 20, 6, 9, 6, '#2a5aa8'); R(x, 23, 7, 5, 2, '#9ad0f0'); wheel(x, 6, 12, 2); wheel(x, 16, 12, 2); wheel(x, 25, 12, 2); return k.c; };
  make.m_truckfull = function () { var k = cv(32, S), x = k.x; x.drawImage(get('m_truck'), 0, 0); R(x, 3, 2, 16, 3, '#e0c040'); speckle(x, 3, 2, 16, 3, ['#c8a830'], 8); return k.c; };
  make.plane = function () { var k = cv(32, 24), x = k.x; R(x, 4, 18, 22, 3, C.shadow); R(x, 6, 10, 20, 4, '#e0c030'); R(x, 12, 4, 6, 16, '#e0c030'); R(x, 4, 8, 3, 8, '#c0a020'); R(x, 25, 11, 3, 2, '#555'); R(x, 13, 5, 4, 2, '#f0e070'); return k.c; };
  make.m_duster = make.plane;

  /* ---------- Eläimet ---------- */
  function animal(x, type, f) {
    var b = FS.ANIMAL[type].col;
    var leg = f ? 1 : 0;
    R(x, 4, 12, 9, 2, C.shadow);
    if (type === 'sheep') { disc(x, 7, 8, 4, '#f4f4ec'); speckle(x, 3, 4, 8, 8, ['#d8d8d0'], 8); R(x, 11, 6, 3, 3, '#3a3a3a'); R(x, 5 + leg, 11, 1, 3, '#3a3a3a'); R(x, 9 - leg, 11, 1, 3, '#3a3a3a'); return; }
    R(x, 3, 6, 9, 5, b);
    R(x, 3 + leg, 11, 1, 3, shade(b, -0.4)); R(x, 10 - leg, 11, 1, 3, shade(b, -0.4)); R(x, 5 - leg, 11, 1, 2, shade(b, -0.4)); R(x, 8 + leg, 11, 1, 2, shade(b, -0.4));
    if (type === 'cow') { R(x, 5, 6, 3, 3, C.black); R(x, 9, 8, 2, 2, C.black); R(x, 11, 4, 4, 4, '#f4f0e8'); R(x, 13, 6, 2, 2, '#f0a8a8'); P(x, 11, 3, '#ddd'); R(x, 2, 6, 1, 4, C.black); }
    if (type === 'pig') { R(x, 11, 6, 4, 4, b); R(x, 14, 7, 1, 2, '#c87878'); P(x, 12, 5, '#c87878'); P(x, 2, 6, '#c87878'); }
    if (type === 'horse') { R(x, 11, 2, 3, 6, b); R(x, 12, 1, 4, 3, b); R(x, 10, 2, 2, 5, '#3a2a1a'); R(x, 2, 6, 1, 6, '#3a2a1a'); }
  }
  FS.ANIMALS.forEach(function (a) { [0, 1].forEach(function (f) { make['a_' + a.id + f] = function () { var k = cv(S, S); animal(k.x, a.id, f); return k.c; }; }); });

  /* ---------- Kuvakkeet ---------- */
  function icon(fn) { return function () { var k = cv(S, S); fn(k.x); return k.c; }; }
  make.i_pests = icon(function (x) { for (var i = 0; i < 5; i++) { disc(x, 3 + i * 2.5, 8, 1, '#3a2a10'); P(x, 3 + i * 2.5, 6, '#3a2a10'); P(x, 3 + i * 2.5, 10, '#3a2a10'); } R(x, 2, 7, 12, 2, '#6a4a1a'); P(x, 14, 7, '#f00'); });
  make.i_weeds = icon(function (x) { line(x, 8, 14, 8, 4, '#2a6a1a'); line(x, 8, 9, 3, 5, '#3a8a2a'); line(x, 8, 7, 13, 3, '#3a8a2a'); line(x, 8, 11, 12, 9, '#3a8a2a'); });
  make.i_disease = icon(function (x) { R(x, 6, 2, 4, 12, '#c8b040'); speckle(x, 6, 2, 4, 12, ['#5a4a1a', '#3a3a1a'], 14); R(x, 5, 4, 1, 8, '#6a8a2a'); });
  make.i_dry = icon(function (x) { R(x, 4, 4, 8, 7, '#f0f0e0'); R(x, 2, 2, 3, 2, '#f0f0e0'); R(x, 11, 2, 3, 2, '#f0f0e0'); R(x, 5, 6, 2, 2, C.black); R(x, 9, 6, 2, 2, C.black); R(x, 6, 11, 4, 3, '#e0e0d0'); });
  make.i_flood = icon(function (x) { for (var i = 0; i < 3; i++) { line(x, 1, 6 + i * 3, 4, 4 + i * 3, '#3c7ad0'); line(x, 4, 4 + i * 3, 8, 6 + i * 3, '#3c7ad0'); line(x, 8, 6 + i * 3, 11, 4 + i * 3, '#3c7ad0'); line(x, 11, 4 + i * 3, 15, 6 + i * 3, '#3c7ad0'); } });
  make.i_nutr = icon(function (x) { R(x, 4, 4, 8, 10, '#a08050'); R(x, 5, 2, 6, 3, '#a08050'); R(x, 6, 7, 4, 4, '#5a3a1a'); P(x, 6, 2, '#5a3a1a'); });
  make.i_tox = icon(function (x) { disc(x, 8, 6, 4, '#f0f0e0'); R(x, 6, 5, 1, 2, C.black); R(x, 9, 5, 1, 2, C.black); R(x, 7, 9, 2, 2, '#f0f0e0'); line(x, 2, 11, 14, 15, '#f0f0e0'); line(x, 14, 11, 2, 15, '#f0f0e0'); });

  /* Sää */
  make.w_sun = icon(function (x) { disc(x, 8, 8, 4, '#f8d020'); for (var a = 0; a < 8; a++) { var ang = a * Math.PI / 4; P(x, Math.round(8 + Math.cos(ang) * 6.5), Math.round(8 + Math.sin(ang) * 6.5), '#f8d020'); } });
  function cloud(x, X, Y, col) { disc(x, X + 3, Y + 3, 3, col); disc(x, X + 7, Y + 2, 4, col); disc(x, X + 10, Y + 4, 3, col); R(x, X + 2, Y + 4, 10, 3, col); }
  make.w_partly = icon(function (x) { disc(x, 10, 5, 4, '#f8d020'); cloud(x, 1, 6, '#e8e8f0'); });
  make.w_cloudy = icon(function (x) { cloud(x, 2, 3, '#a8a8b8'); cloud(x, 0, 7, '#d0d0dc'); });
  make.w_rain = icon(function (x) { cloud(x, 1, 1, '#8a8a9a'); for (var i = 0; i < 5; i++) line(x, 3 + i * 2.5, 10, 2 + i * 2.5, 14, '#3c7ad0'); });
  make.w_snow = icon(function (x) { cloud(x, 1, 1, '#b0b0c0'); for (var i = 0; i < 4; i++) { P(x, 3 + i * 3, 11 + (i & 1) * 2, '#fff'); P(x, 4 + i * 3, 12 + (i & 1) * 2, '#fff'); } });

  /* Työkalut */
  make.t_examine = icon(function (x) { disc(x, 6, 6, 4, '#1a1a1a'); disc(x, 6, 6, 3, '#9ad0f0'); line(x, 9, 9, 14, 14, '#6a4a2a'); line(x, 10, 9, 14, 13, '#6a4a2a'); });
  make.t_move = icon(function (x) { R(x, 4, 7, 8, 7, '#f0c8a0'); for (var i = 0; i < 4; i++) R(x, 4 + i * 2, 3 + (i === 0 ? 2 : 0), 2, 5, '#f0c8a0'); R(x, 1, 8, 3, 2, '#f0c8a0'); });
  make.t_paved = icon(function (x) { R(x, 0, 4, 16, 8, C.road); R(x, 2, 7, 3, 2, C.line); R(x, 7, 7, 3, 2, C.line); R(x, 12, 7, 3, 2, C.line); });
  make.t_dirt = icon(function (x) { R(x, 0, 4, 16, 8, '#b8925a'); speckle(x, 0, 4, 16, 8, ['#a07a48'], 10); });
  make.t_fence = icon(function (x) { R(x, 0, 6, 16, 1, '#b08050'); R(x, 0, 10, 16, 1, '#b08050'); R(x, 2, 4, 2, 9, C.wood2); R(x, 12, 4, 2, 9, C.wood2); });
  make.t_gate = function () { return get('gate0'); };
  make.t_ditch = function () { return get('ditch110'); };
  make.t_valve = function () { return get('valve1'); };
  make.t_feed = function () { return get('feed'); };
  make.t_trough = function () { return get('trough1'); };
  make.t_tree = function () { return get('tree0'); };
  make.t_doze = icon(function (x) { R(x, 2, 6, 10, 5, '#e0b020'); R(x, 7, 3, 4, 4, '#e0b020'); R(x, 8, 4, 2, 2, '#9ad0f0'); R(x, 12, 4, 2, 9, '#888'); R(x, 2, 11, 10, 3, '#333'); });
  make.t_plant = icon(function (x) { R(x, 2, 11, 12, 4, '#7a4e2a'); line(x, 8, 12, 8, 5, '#3a8a2a'); disc(x, 5, 6, 2, '#5aa83a'); disc(x, 11, 5, 2, '#5aa83a'); });
  make.t_spray = function () { return get('m_sprayer'); };
  make.t_buy = icon(function (x) { R(x, 1, 3, 14, 10, '#3a8a3a'); R(x, 2, 4, 12, 8, '#5aaa5a'); disc(x, 8, 8, 2, '#e8f0e0'); });

  /* Efektit */
  [0, 1].forEach(function (f) {
    make['fx_tornado' + f] = function () { var k = cv(S, 32), x = k.x; for (var i = 0; i < 28; i++) { var w = Math.max(1, Math.round(1 + i * 0.25)), off = Math.round(Math.sin(i * 0.5 + f * 2) * 2); R(x, 8 - w + off, i, w * 2, 1, i % 3 ? '#8a8a92' : '#6a6a72'); } return k.c; };
  });
  make.fx_flame = icon(function (x) { disc(x, 8, 10, 5, '#e04010'); disc(x, 8, 9, 3, '#f0a020'); disc(x, 8, 8, 1, '#f8f080'); });
  make.fx_boom = icon(function (x) { disc(x, 8, 8, 6, '#f0a020'); disc(x, 8, 8, 4, '#f8e060'); for (var a = 0; a < 8; a++) P(x, 8 + Math.round(Math.cos(a) * 7), 8 + Math.round(Math.sin(a) * 7), '#e04010'); });

  function get(name) {
    if (!cache[name]) {
      var c;
      if (name.indexOf('town_') === 0) { var p = name.split('_'); c = townPlot(p[1], +p[2]); }
      else if (make[name]) c = make[name]();
      else { var k = cv(S, S); R(k.x, 0, 0, S, S, '#f0f'); c = k.c; }
      cache[name] = FS.retro ? quantize(c) : c;
    }
    return cache[name];
  }
  FS.gfx.get = get;
  /** Kuva data-URL-muodossa käyttöliittymää varten, skaalattuna. */
  var urlCache = {};
  FS.gfx.url = function (name, scale) {
    var key = name + '@' + (scale || 2);
    if (urlCache[key]) return urlCache[key];
    var src = get(name), k = cv(src.width * (scale || 2), src.height * (scale || 2));
    k.x.drawImage(src, 0, 0, k.c.width, k.c.height);
    return (urlCache[key] = k.c.toDataURL());
  };
  FS.gfx.img = function (name, scale, cls) {
    return '<img class="spr ' + (cls || '') + '" src="' + FS.gfx.url(name, scale) + '" alt="">';
  };
  FS.gfx.machineSprite = function (type) { return 'm_' + type; };
  FS.gfx.buildingSprite = function (b, G, frame) {
    if (b.type === 'home') return 'home' + Math.min(4, G.homeLevel);
    if (b.type === 'windmill') return 'windmill' + (b.active ? frame & 1 : 0);
    return b.type;
  };
})();
