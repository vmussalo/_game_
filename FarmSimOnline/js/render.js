/* FarmSim Online – kartan piirto canvasille. */
'use strict';
(function () {
  var FS = window.FS, O = FS.O, T = FS.T, N = FS.MAP, S = 16;
  var V = FS.view = { cx: 0, cy: 0, zoom: 2, w: 0, h: 0, hover: null, preview: null, time: 0, selField: null, selPlot: -1 };
  var get = FS.gfx.get;

  FS.initView = function (canvas) {
    V.cv = canvas; V.ctx = canvas.getContext('2d');
    FS.resizeView();
  };
  FS.resizeView = function () {
    var r = V.cv.parentNode.getBoundingClientRect();
    V.cv.width = Math.max(64, Math.floor(r.width)); V.cv.height = Math.max(64, Math.floor(r.height));
    V.w = V.cv.width; V.h = V.cv.height;
    V.ctx.imageSmoothingEnabled = false;
    clampCam();
  };
  function tsz() { return S * V.zoom; }
  function clampCam() {
    var vw = V.w / tsz(), vh = V.h / tsz();
    V.cx = FS.clamp(V.cx, -1, Math.max(-1, N + 1 - vw)); V.cy = FS.clamp(V.cy, -1, Math.max(-1, N + 1 - vh));
  }
  FS.clampCam = clampCam;
  FS.centerOn = function (x, y) { V.cx = x - V.w / tsz() / 2; V.cy = y - V.h / tsz() / 2; clampCam(); };
  FS.screenToTile = function (mx, my) { return { x: Math.floor(V.cx + mx / tsz()), y: Math.floor(V.cy + my / tsz()), fx: V.cx + mx / tsz(), fy: V.cy + my / tsz() }; };
  FS.setZoom = function (z, mx, my) {
    var before = FS.screenToTile(mx, my);
    V.zoom = FS.clamp(z, 1, 4);
    V.cx = before.fx - mx / tsz(); V.cy = before.fy - my / tsz();
    clampCam();
  };

  function hash(x, y) { var h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return h; }
  function isRoad(G, x, y) { if (!FS.inMap(x, y)) return false; var o = G.obj[FS.idx(x, y)]; return o === O.PAVED || o === O.DIRT_ROAD || o === O.BRIDGE; }
  function isFence(G, x, y) { if (!FS.inMap(x, y)) return false; var o = G.obj[FS.idx(x, y)]; return o === O.FENCE || o === O.GATE; }
  function isDitchLike(G, x, y) {
    if (!FS.inMap(x, y)) return false;
    var i = FS.idx(x, y);
    if (FS.isDitch(G, i)) return true;
    if (G.obj[i] === O.BUILDING) { var b = G.buildings[G.ref[i]]; return b && (b.type === 'pump' || b.type === 'windmill' || b.type === 'tower'); }
    return false;
  }
  function mask(fn, G, x, y) { return (fn(G, x, y - 1) ? 1 : 0) | (fn(G, x + 1, y) ? 2 : 0) | (fn(G, x, y + 1) ? 4 : 0) | (fn(G, x - 1, y) ? 8 : 0); }

  function fieldStage(f, tx, ty, dayFrac) {
    var crop = f.crop && FS.CROP[f.crop];
    var row = ty - f.y;
    if (f.job) {
      var p = FS.clamp(1 - (f.job.days - dayFrac) / f.job.total, 0, 1), done = p * 8;
      if (f.job.type === 'plant') return row < done ? 'plowed' : 'fallow';
      if (f.job.type === 'harvest' || f.job.type === 'hand') { if (row < done) return crop && crop.perennial ? 'young' : 'fallow'; }
    }
    if (f.state === 'dead') return 'dead';
    if (f.state === 'planting') return 'plowed';
    if (!crop || f.state === 'fallow' || f.state === 'wait' || f.state === 'queued') return 'fallow';
    if (f.state === 'ready') return 'ripe';
    if (f.prog < 0.12) return crop.perennial && f.est ? 'young' : 'sprout';
    if (f.prog < 0.5) return 'young';
    if (f.prog < 0.88) return 'mature';
    return 'ripe';
  }

  FS.fieldIssues = function (f) {
    var c = f.crop && FS.CROP[f.crop], out = [];
    if (f.tox > 60) out.push('tox');
    if (f.state === 'growing' || f.state === 'ready') {
      if (f.pests > 55) out.push('pests');
      if (f.weeds > 55) out.push('weeds');
      if (f.disease > 55) out.push('disease');
      if (c && f.moist < c.moist - 3) out.push('dry');
      if (c && f.moist > c.moist + 3) out.push('flood');
    } else if (f.moist > 10) out.push('flood');
    if (f.nutr < 25) out.push('nutr');
    return out;
  };

  /** Piirtää näkymän. dayFrac = osuus kuluvasta päivästä animaatioita varten. */
  FS.render = function (G, dayFrac, now) {
    var ctx = V.ctx, z = tsz();
    V.time = now;
    var anim = Math.floor(now / 500) & 1;
    ctx.fillStyle = FS.retro ? '#000000' : '#1a3a12'; ctx.fillRect(0, 0, V.w, V.h);
    var x0 = Math.max(0, Math.floor(V.cx)), y0 = Math.max(0, Math.floor(V.cy));
    var x1 = Math.min(N - 1, Math.ceil(V.cx + V.w / z)), y1 = Math.min(N - 1, Math.ceil(V.cy + V.h / z));
    function sx(x) { return Math.round((x - V.cx) * z); }
    function sy(y) { return Math.round((y - V.cy) * z); }
    function draw(name, x, y, w, h) { var img = get(name); ctx.drawImage(img, sx(x), sy(y), (w || img.width / S) * z, (h || img.height / S) * z); }
    var tall = [], townDrawn = {}, x, y, i;

    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      i = FS.idx(x, y);
      var t = G.terrain[i], o = G.obj[i];
      if (o === O.TOWN) { var tp = G.ref[i]; if (!townDrawn[tp]) { townDrawn[tp] = 1; var px = (tp % FS.PLOTS) * 8, py = Math.floor(tp / FS.PLOTS) * 8; ctx.drawImage(get('town_' + (G.town.types[tp] || 'homes') + '_' + tp), sx(px), sy(py), 8 * z, 8 * z); } continue; }
      if (t === T.WATER) {
        draw('water' + ((anim + x + y) & 1), x, y, 1, 1);
        var X = sx(x), Y = sy(y), e = Math.max(1, Math.round(z / 8));
        ctx.fillStyle = FS.COL.sand;
        if (y > 0 && G.terrain[i - N] !== T.WATER) ctx.fillRect(X, Y, z, e);
        if (y < N - 1 && G.terrain[i + N] !== T.WATER) ctx.fillRect(X, Y + z - e, z, e);
        if (x > 0 && G.terrain[i - 1] !== T.WATER) ctx.fillRect(X, Y, e, z);
        if (x < N - 1 && G.terrain[i + 1] !== T.WATER) ctx.fillRect(X + z - e, Y, e, z);
      } else draw((t === T.DIRT ? 'dirt' : 'grass') + (hash(x, y) & 3), x, y, 1, 1);
      switch (o) {
        case O.ROCK: draw('rock', x, y, 1, 1); break;
        case O.BUSH: draw('bush', x, y, 1, 1); break;
        case O.TREE: tall.push({ y: y + 1, n: 'tree' + (hash(x, y) >> 5 & 1), x: x, yy: y }); break;
        case O.PAVED: draw('paved' + mask(isRoad, G, x, y), x, y, 1, 1); break;
        case O.DIRT_ROAD: draw('dirtroad' + mask(isRoad, G, x, y), x, y, 1, 1); break;
        case O.FENCE: draw('fence' + mask(isFence, G, x, y), x, y, 1, 1); break;
        case O.GATE: draw('fence' + (mask(isFence, G, x, y) & 10 ? 10 : 5), x, y, 1, 1); draw('gate' + (G.flag[i] & 1), x, y, 1, 1); break;
        case O.DITCH: draw('ditch' + ((G.flag[i] & 2) ? 1 : 0) + mask(isDitchLike, G, x, y), x, y, 1, 1); break;
        case O.VALVE: draw('ditch' + ((G.flag[i] & 2) ? 1 : 0) + mask(isDitchLike, G, x, y), x, y, 1, 1); draw('valve' + (G.flag[i] & 1), x, y, 1, 1); break;
        case O.BRIDGE:
          if (!(G.flag[i] & 4)) draw('ditch' + ((G.flag[i] & 2) ? 1 : 0) + mask(isDitchLike, G, x, y), x, y, 1, 1);
          var rm = mask(isRoad, G, x, y);
          draw('paved' + (rm || 10), x, y, 1, 1);
          ctx.fillStyle = '#d0d0d0';
          if ((rm & 10) || !rm) { ctx.fillRect(sx(x), sy(y) + Math.round(z * 0.22), z, Math.max(1, z / 16)); ctx.fillRect(sx(x), sy(y) + Math.round(z * 0.75), z, Math.max(1, z / 16)); }
          else { ctx.fillRect(sx(x) + Math.round(z * 0.22), sy(y), Math.max(1, z / 16), z); ctx.fillRect(sx(x) + Math.round(z * 0.75), sy(y), Math.max(1, z / 16), z); }
          break;
        case O.FEED: draw(G.feeds[i] > 0.3 ? 'feed' : 'feedlow', x, y, 1, 1); break;
        case O.TROUGH: draw('trough' + (G.troughs[i] > 0.05 ? 1 : 0), x, y, 1, 1); break;
        case O.FIELD:
          var f = G.fields[G.ref[i]];
          if (f) { var st = fieldStage(f, x, y, dayFrac); draw(st === 'plowed' || st === 'fallow' || st === 'dead' ? 'f_' + st : 'f_' + f.crop + '_' + st, x, y, 1, 1); }
          break;
      }
    }

    // Omien tonttien raja-aita
    ctx.fillStyle = FS.retro ? '#ffffff' : '#c8a060';
    var lw = Math.max(1, Math.round(z / 10));
    for (var p = 0; p < G.plots.length; p++) {
      if (G.plots[p].owner !== 1) continue;
      var ppx = (p % FS.PLOTS), ppy = Math.floor(p / FS.PLOTS);
      var nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (var d = 0; d < 4; d++) {
        var qx = ppx + nb[d][0], qy = ppy + nb[d][1];
        var other = qx >= 0 && qy >= 0 && qx < FS.PLOTS && qy < FS.PLOTS ? G.plots[qy * FS.PLOTS + qx].owner : 0;
        if (other === 1) continue;
        var X0 = sx(ppx * 8), Y0 = sy(ppy * 8), L = 8 * z;
        for (var k = 0; k < 8; k++) {
          var seg = k * z;
          if (d === 0) { ctx.fillRect(X0 + seg, Y0, z, lw); ctx.fillRect(X0 + seg, Y0 - lw, lw * 2, lw * 3); }
          if (d === 2) { ctx.fillRect(X0 + seg, Y0 + L - lw, z, lw); ctx.fillRect(X0 + seg, Y0 + L - lw * 2, lw * 2, lw * 3); }
          if (d === 3) { ctx.fillRect(X0, Y0 + seg, lw, z); ctx.fillRect(X0 - lw, Y0 + seg, lw * 3, lw * 2); }
          if (d === 1) { ctx.fillRect(X0 + L - lw, Y0 + seg, lw, z); ctx.fillRect(X0 + L - lw * 2, Y0 + seg, lw * 3, lw * 2); }
        }
      }
    }

    // Peltojen reunat, kuvakkeet ja työkoneet
    Object.keys(G.fields).forEach(function (id) {
      var f = G.fields[id];
      if (f.x + 8 < x0 || f.x > x1 + 1 || f.y + 8 < y0 || f.y > y1 + 1) return;
      ctx.strokeStyle = V.selField === f.id ? '#f8f040' : 'rgba(40,24,8,0.7)';
      ctx.lineWidth = V.selField === f.id ? 2 : 1;
      ctx.strokeRect(sx(f.x) + 0.5, sy(f.y) + 0.5, 8 * z - 1, 8 * z - 1);
      if (f.job) {
        var spec = FS.JOBS[f.job.type], pr = FS.clamp(1 - (f.job.days - dayFrac) / f.job.total, 0, 0.999);
        var row = Math.floor(pr * 8), along = (pr * 8 - row) * 7, mxp = row & 1 ? f.x + 7 - along : f.x + along;
        var types = f.job.type === 'spray' ? ['sprayer', 'tractor'] : f.job.type === 'plant' ? ['planter', 'plow', 'tractor'] : f.job.type === 'hand' ? ['truck'] : ['harvester', 'trailer'];
        if (f.job.type === 'harvest' || f.job.type === 'hand') tall.push({ y: f.y + 9, n: 'm_truckfull', x: f.x - 2 > 0 ? f.x + 8 : f.x - 2, yy: f.y + 7 });
        types.forEach(function (tn, k) {
          var w = (FS.MACHINE[tn].size || 1);
          var ox = (row & 1 ? 1 : -1) * k * 1.1 * (w === 2 ? 1.6 : 1);
          tall.push({ y: f.y + row + 1.01, n: 'm_' + tn, x: mxp + ox - (w === 2 ? 0.5 : 0), yy: f.y + row, flip: !(row & 1) });
        });
        void spec;
      }
      var issues = FS.fieldIssues(f);
      if (issues.length && (Math.floor(now / 700) % 3 !== 2)) {
        var ic = issues[Math.floor(now / 2100) % issues.length];
        var cxp = sx(f.x + 3), cyp = sy(f.y + 3);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(cxp - 2, cyp - 2, 2 * z + 4, 2 * z + 4);
        ctx.drawImage(get('i_' + ic), cxp, cyp, 2 * z, 2 * z);
      }
    });

    // Rakennukset
    Object.keys(G.buildings).forEach(function (id) {
      var b = G.buildings[id];
      if (b.x + b.w < x0 || b.x > x1 + 1 || b.y + b.h < y0 - 2 || b.y > y1 + 1) return;
      var n = FS.gfx.buildingSprite(b, G, anim), img = get(n);
      var hh = img.height / S;
      tall.push({ y: b.y + b.h, n: n, x: b.x, yy: b.y + b.h - hh, w: img.width / S, h: hh, broken: b.broken });
    });
    // Koneet
    G.machines.forEach(function (m) {
      if (m.shed || m.busy || m.x < 0) return;
      if (m.x < x0 - 2 || m.x > x1 + 1 || m.y < y0 - 1 || m.y > y1 + 1) return;
      tall.push({ y: m.y + 1, n: 'm_' + m.type, x: m.x, yy: m.y, bad: m.cond < 20 });
    });
    // Eläimet
    var needs = [];
    G.animals.forEach(function (a) {
      var tr = a.trail && a.trail.length > 1 ? a.trail : [[a.px, a.py], [a.x, a.y]];
      var pos = FS.clamp(dayFrac, 0, 1) * (tr.length - 1), k = Math.min(tr.length - 2, Math.floor(pos)), fr = pos - k;
      var p0 = tr[k], p1 = tr[k + 1], ax = FS.lerp(p0[0], p1[0], fr), ay = FS.lerp(p0[1], p1[1], fr);
      if (ax < x0 - 1 || ax > x1 + 1 || ay < y0 - 1 || ay > y1 + 1) return;
      var sc = 0.55 + 0.45 * a.size;
      if (p1[0] !== p0[0]) a._flip = p1[0] < p0[0];
      tall.push({ y: ay + 1, n: 'a_' + a.type + ((Math.floor(now / 300) + a.id) & 1), x: ax + (1 - sc) / 2, yy: ay + (1 - sc), w: sc, h: sc, flip: !!a._flip });
      if (a.hungry > 0 || a.thirsty > 0) needs.push({ n: a.hungry > 0 ? 'feed' : 'trough1', x: ax + 0.25, y: ay - 0.55 });
    });

    tall.sort(function (a, b) { return a.y - b.y; });
    tall.forEach(function (s) {
      var img = get(s.n), w = s.w || img.width / S, h = s.h || img.height / S;
      var X = sx(s.x), Y = sy(s.yy);
      if (s.flip) { ctx.save(); ctx.translate(X + w * z, Y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w * z, h * z); ctx.restore(); }
      else ctx.drawImage(img, X, Y, w * z, h * z);
      if (s.bad || s.broken) { ctx.fillStyle = 'rgba(200,0,0,0.35)'; ctx.fillRect(X, Y, w * z, h * z); }
    });

    // Nälkäisten ja janoisten eläinten puhekuplat
    if (Math.floor(now / 600) % 3 !== 2) needs.forEach(function (n) {
      var X = sx(n.x), Y = sy(n.y), w = Math.round(z * 0.55);
      ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 1, w + 2, w + 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(X - 1.5, Y - 1.5, w + 3, w + 3);
      ctx.drawImage(get(n.n), X, Y, w, w);
    });

    // Efektit
    G.fx.forEach(function (e) {
      var age = G.day - e.day + dayFrac;
      if (e.type === 'tornado') {
        var len = e.path.length, pos = Math.min(len - 1, Math.floor(age / (e.dur || 3) * len));
        var pt = e.path[pos];
        if (pt) draw('fx_tornado' + anim, pt[0] - 0.5, pt[1] - 1.5, 1.6, 3.2);
      } else if (e.type === 'flame' && age < 1) draw('fx_flame', e.x - 2, e.y - 2, 4, 4);
      else if (e.type === 'boom' && age < 1.5) draw('fx_boom', e.x - 2, e.y - 2, 4, 4);
      else if (e.type === 'plane' && age < 2) {
        var k2 = Math.floor(age * e.fields.length / 2) % e.fields.length, fp = e.fields[k2];
        if (fp) { draw('plane', fp[0] + (age * 8 % 8), fp[1] + 2, 2, 1.5); }
      }
    });
    var D = G.disaster;
    if (D && D.id === 'locusts' && D.daysLeft > 0) {
      ctx.fillStyle = '#2a2a10';
      var r0 = new FS.Rng(Math.floor(now / 120));
      for (var s2 = 0; s2 < 160; s2++) { var ang = r0.next() * 6.283, rr = Math.sqrt(r0.next()) * 7; ctx.fillRect(sx(D.x + Math.cos(ang) * rr), sy(D.y + Math.sin(ang) * rr), Math.max(1, z / 10), Math.max(1, z / 10)); }
    }

    // Kohdistin ja sijoituksen esikatselu
    if (V.preview) {
      var pv = V.preview;
      ctx.fillStyle = pv.ok ? 'rgba(80,255,80,0.28)' : 'rgba(255,60,60,0.32)';
      ctx.fillRect(sx(pv.x), sy(pv.y), pv.w * z, pv.h * z);
      ctx.strokeStyle = pv.ok ? '#80ff80' : '#ff5050'; ctx.lineWidth = 2;
      ctx.strokeRect(sx(pv.x) + 1, sy(pv.y) + 1, pv.w * z - 2, pv.h * z - 2);
      if (pv.sprite) { ctx.globalAlpha = 0.65; var im = get(pv.sprite); ctx.drawImage(im, sx(pv.x), sy(pv.y + pv.h - im.height / S), im.width / S * z, im.height / S * z); ctx.globalAlpha = 1; }
    } else if (V.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx(V.hover.x) + 0.5, sy(V.hover.y) + 0.5, z - 1, z - 1);
    }
  };

  /* ---------- Pienoiskartta ---------- */

  FS.MAP_MODES = [
    { id: 'overview', name: 'Yleiskuva' }, { id: 'property', name: 'Tontit' }, { id: 'tox', name: 'Myrkyt' },
    { id: 'nutr', name: 'Ravinteet' }, { id: 'disease', name: 'Taudit' }, { id: 'weeds', name: 'Rikat' },
    { id: 'gw', name: 'Pohjavesi' }, { id: 'profit', name: 'Tuotto' }, { id: 'pests', name: 'Tuholaiset' }
  ];
  var MINI = {}; MINI[O.TREE] = '#2a6a1e'; MINI[O.BUSH] = '#3e8a2a'; MINI[O.ROCK] = '#8c8c94'; MINI[O.PAVED] = '#5c5c64'; MINI[O.DIRT_ROAD] = '#b8925a';
  MINI[O.FENCE] = '#8a5a2a'; MINI[O.GATE] = '#8a5a2a'; MINI[O.DITCH] = '#4a78c0'; MINI[O.VALVE] = '#4a78c0'; MINI[O.BRIDGE] = '#5c5c64'; MINI[O.BUILDING] = '#c83a2a';
  MINI[O.FEED] = '#e0c050'; MINI[O.TROUGH] = '#4a78c0'; MINI[O.TOWN] = '#b0a090';

  function heat(v) { // 0 = vihreä (hyvä) … 1 = punainen (huono)
    v = FS.clamp(v, 0, 1);
    var r = Math.round(v < 0.5 ? v * 2 * 230 : 230), g = Math.round(v < 0.5 ? 200 : 200 - (v - 0.5) * 2 * 180);
    return 'rgba(' + r + ',' + g + ',40,0.62)';
  }
  FS.plotStat = function (G, p, mode) {
    var pl = G.plots[p], fs = [];
    Object.keys(G.fields).forEach(function (k) { var f = G.fields[k]; if (FS.plotOf(f.x + 4, f.y + 4) === p) fs.push(f); });
    function avg(key) { return fs.length ? fs.reduce(function (s, f) { return s + f[key]; }, 0) / fs.length : pl[key]; }
    if (mode === 'tox') return avg('tox') / 80;
    if (mode === 'nutr') return 1 - avg('nutr') / 80;
    if (mode === 'disease') return avg('disease') / 80;
    if (mode === 'weeds') return avg('weeds') / 80;
    if (mode === 'pests') return avg('pests') / 80;
    if (mode === 'gw') return 1 - FS.groundwater(G, p) / 10;
    if (mode === 'profit') { if (!fs.length) return -1; return 1 - fs.reduce(function (s, f) { return s + f.lastValue; }, 0) / fs.length / 3500; }
    return -1;
  };

  FS.renderMinimap = function (G, canvas, mode) {
    var ctx = canvas.getContext('2d'), k = canvas.width / N;
    var img = ctx.createImageData(N, N), d = img.data;
    for (var i = 0; i < N * N; i++) {
      var o = G.obj[i], col = G.terrain[i] === T.WATER ? (FS.retro ? '#0000ea' : '#2c5cb0') : MINI[o] || (o === O.FIELD ? fieldCol(G, G.ref[i]) : G.terrain[i] === T.DIRT ? '#814004' : FS.retro ? '#917138' : '#4f9a2c');
      var n = parseInt(col.slice(1), 16);
      d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255;
    }
    var tmp = document.createElement('canvas'); tmp.width = N; tmp.height = N; tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    var cell = 8 * k;
    if (mode === 'property') {
      G.plots.forEach(function (pl, p) {
        var X = (p % FS.PLOTS) * cell, Y = Math.floor(p / FS.PLOTS) * cell;
        ctx.fillStyle = pl.owner === 1 ? 'rgba(60,220,60,0.45)' : pl.owner === 2 ? 'rgba(60,120,255,0.45)' : 'rgba(0,0,0,0)';
        ctx.fillRect(X, Y, cell, cell);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(X + 0.5, Y + 0.5, cell - 1, cell - 1);
      });
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(cell * 0.6) + 'px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('K', (G.homePlot.x + 0.5) * cell, (G.homePlot.y + 0.5) * cell);
      ctx.fillText('T', (G.townOrigin % FS.PLOTS + 0.5) * cell, (Math.floor(G.townOrigin / FS.PLOTS) + 0.5) * cell);
      if (V.selPlot >= 0) { ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.strokeRect((V.selPlot % FS.PLOTS) * cell + 1, Math.floor(V.selPlot / FS.PLOTS) * cell + 1, cell - 2, cell - 2); ctx.lineWidth = 1; }
    } else if (mode !== 'overview') {
      G.plots.forEach(function (pl, p) {
        if (pl.owner === 2) return;
        var v = FS.plotStat(G, p, mode);
        if (v < 0) return;
        ctx.fillStyle = heat(v);
        ctx.fillRect((p % FS.PLOTS) * cell, Math.floor(p / FS.PLOTS) * cell, cell, cell);
      });
    }
    // Näkymän rajaus
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(V.cx * k + 0.5, V.cy * k + 0.5, V.w / tsz() * k, V.h / tsz() * k);
  };
  function fieldCol(G, id) {
    var f = G.fields[id];
    if (!f || !f.crop || f.state === 'fallow' || f.state === 'wait') return '#7a4e2a';
    if (f.state === 'dead') return '#6a5a3a';
    return f.prog > 0.85 ? FS.CROP[f.crop].col[1] : FS.CROP[f.crop].col[0];
  }
})();
