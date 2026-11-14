/* FarmSim Online – maailman luonti ja ruutuapufunktiot. */
'use strict';
(function () {
  var FS = window.FS, T = FS.T, O = FS.O, N = FS.MAP;

  FS.idx = function (x, y) { return y * N + x; };
  FS.inMap = function (x, y) { return x >= 0 && y >= 0 && x < N && y < N; };
  FS.plotOf = function (x, y) { return Math.floor(y / FS.PLOT) * FS.PLOTS + Math.floor(x / FS.PLOT); };
  FS.owned = function (G, x, y) { return FS.inMap(x, y) && G.plots[FS.plotOf(x, y)].owner === 1; };

  /** Arvokohina (value noise) siemenellä, arvot 0–1. */
  function makeNoise(rng, cell) {
    var gw = Math.ceil(N / cell) + 2, grid = [];
    for (var i = 0; i < gw * gw; i++) grid.push(rng.next());
    return function (x, y) {
      var fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      var tx = fx - ix, ty = fy - iy;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
      return FS.lerp(FS.lerp(a, b, tx), FS.lerp(c, d, tx), ty);
    };
  }

  /** Luo uuden maailman. opts: {region, river, lake, seed}. Palauttaa karttaosan pelitilasta. */
  FS.generateWorld = function (opts) {
    var region = FS.REGION[opts.region] || FS.REGIONS[4];
    var rng = new FS.Rng(opts.seed);
    var terrain = new Uint8Array(N * N), obj = new Uint8Array(N * N), ref = new Int16Array(N * N), flag = new Uint8Array(N * N);
    var nForest = makeNoise(rng, 9), nRock = makeNoise(rng, 6), nFert = makeNoise(rng, 14), nDetail = makeNoise(rng, 3);

    var annualRain = region.r.reduce(function (a, b) { return a + b; }, 0);
    var avgT = region.t.reduce(function (a, b) { return a + b; }, 0) / 12;
    var wetness = FS.clamp(annualRain / 130, 0, 1);         // 0 kuiva – 1 sateinen
    var dryness = FS.clamp(1 - wetness + (avgT - 60) / 80 + (region.wind - 8) / 30, 0, 1);

    // Joki: mutkitteleva, 2–3 ruutua leveä, pohjoisesta etelään tai lännestä itään
    var hasRiver = opts.river !== undefined ? opts.river : region.river;
    var hasLake = opts.lake !== undefined ? opts.lake : region.lake;
    if (hasRiver) {
      var vertical = rng.chance(0.5);
      var pos = rng.int(14, 26) + (rng.chance(0.5) ? 50 : 0), drift = 0, width = rng.int(2, 3);
      for (var s = 0; s < N; s++) {
        drift += rng.range(-0.35, 0.35); drift = FS.clamp(drift, -0.9, 0.9);
        pos = FS.clamp(pos + drift, 4, N - 6);
        for (var wv = 0; wv < width; wv++) {
          var p = Math.round(pos) + wv;
          var x = vertical ? p : s, y = vertical ? s : p;
          terrain[FS.idx(x, y)] = T.WATER;
        }
      }
    }
    if (hasLake) {
      var lx = rng.int(14, N - 15), ly = rng.int(14, N - 15), lr = rng.range(4.5, 7.5);
      for (var yy = -10; yy <= 10; yy++) for (var xx = -10; xx <= 10; xx++) {
        var d = Math.sqrt(xx * xx + yy * yy) + nDetail(lx + xx, ly + yy) * 2.2;
        if (d < lr && FS.inMap(lx + xx, ly + yy)) terrain[FS.idx(lx + xx, ly + yy)] = T.WATER;
      }
    }

    // Puut ja kivet ilmaston mukaan
    var forestTh = 0.78 - wetness * 0.2 + (region.wind - 8) / 60;
    var rockTh = 0.86 - dryness * 0.16;
    for (var y2 = 0; y2 < N; y2++) for (var x2 = 0; x2 < N; x2++) {
      var i = FS.idx(x2, y2);
      if (terrain[i] === T.WATER) continue;
      var f = nForest(x2, y2) + nDetail(x2, y2) * 0.25 - 0.12;
      var r = nRock(x2, y2) + nDetail(x2 + 40, y2) * 0.25 - 0.12;
      if (f > forestTh) obj[i] = O.TREE;
      else if (f > forestTh - 0.06 && rng.chance(0.25)) obj[i] = O.BUSH;
      else if (r > rockTh && rng.chance(0.55)) obj[i] = O.ROCK;
      else if (dryness > 0.6 && rng.chance(0.08)) terrain[i] = T.DIRT;
    }

    // Tontit
    var plots = [];
    for (var py = 0; py < FS.PLOTS; py++) for (var px = 0; px < FS.PLOTS; px++) {
      var water = 0, rocks = 0, nearWater = 0;
      for (var ty = 0; ty < FS.PLOT; ty++) for (var tx = 0; tx < FS.PLOT; tx++) {
        var gx = px * FS.PLOT + tx, gy = py * FS.PLOT + ty, ii = FS.idx(gx, gy);
        if (terrain[ii] === T.WATER) water++;
        if (obj[ii] === O.ROCK) rocks++;
      }
      // etäisyys veteen tontin keskeltä
      var cx = px * FS.PLOT + 4, cy = py * FS.PLOT + 4, best = 99;
      for (var sy = -16; sy <= 16; sy += 2) for (var sx = -16; sx <= 16; sx += 2) {
        if (FS.inMap(cx + sx, cy + sy) && terrain[FS.idx(cx + sx, cy + sy)] === T.WATER) best = Math.min(best, Math.abs(sx) + Math.abs(sy));
      }
      nearWater = best < 99 ? FS.clamp(1 - best / 20, 0, 1) : 0;
      var fert = FS.clamp(35 + nFert(cx, cy) * 50 + wetness * 15 - dryness * 15 - rocks * 1.5, 10, 100);
      plots.push({
        owner: 0, water: water, rock: rocks / 64,
        gw: FS.clamp(Math.round(nearWater * 4 + wetness * 2 - dryness), -2, 5), // pohjaveden siirtymä
        nutr: Math.round(fert), tox: 0, weeds: Math.round(15 + nDetail(cx, cy) * 25), pests: 10, disease: 8
      });
    }

    // Kotitila: alue, jolla on vähän vettä ja kiviä, lähellä keskustaa; pelaaja omistaa OW×OH tonttia
    var OW = 3, OH = 2, home = null, bestScore = -1e9;
    for (var hy = 2; hy < FS.PLOTS - OH - 1; hy++) for (var hx = 2; hx < FS.PLOTS - OW - 1; hx++) {
      var score = 0;
      for (var qy = 0; qy < OH; qy++) for (var qx = 0; qx < OW; qx++) {
        var pl = plots[(hy + qy) * FS.PLOTS + hx + qx];
        score -= pl.water * 6 + pl.rock * 30; score += pl.nutr * 0.3 + pl.gw * 3;
      }
      score -= (Math.abs(hx - 4.5) + Math.abs(hy - 5)) * 2 + rng.next() * 6;
      if (score > bestScore) { bestScore = score; home = { x: hx, y: hy }; }
    }
    for (var oy0 = 0; oy0 < OH; oy0++) for (var ox0 = 0; ox0 < OW; ox0++) plots[(home.y + oy0) * FS.PLOTS + home.x + ox0].owner = 1;

    // Kaupunki samalla tonttirivillä 3–5 tonttia sivussa
    var cands = [];
    for (var dx = 3; dx <= 5; dx++) [home.x - dx, home.x + OW - 1 + dx].forEach(function (tx2) {
      [home.y, home.y + 1].forEach(function (ty2) {
        if (tx2 >= 1 && tx2 < FS.PLOTS - 1) cands.push({ x: tx2, y: ty2, w: plots[ty2 * FS.PLOTS + tx2].water });
      });
    });
    cands.sort(function (a, b) { return a.w - b.w || Math.abs(a.x - home.x) - Math.abs(b.x - home.x); });
    var town = cands[0];
    var townPlot = town.y * FS.PLOTS + town.x;
    plots[townPlot].owner = 2;

    var world = {
      terrain: terrain, obj: obj, ref: ref, flag: flag, plots: plots,
      homePlot: { x: home.x, y: home.y }, townOrigin: townPlot, wetness: wetness, dryness: dryness
    };

    // Kotitalo (4×4) ensimmäisen tontin nurkkaan, jotta muille tonteille mahtuu peltoja
    var hx0 = home.x * FS.PLOT + 1, hy0 = home.y * FS.PLOT + 1;
    if (town.x < home.x) hx0 = home.x * FS.PLOT + 3;
    for (var by = 0; by < 4; by++) for (var bx = 0; bx < 4; bx++) {
      var bi = FS.idx(hx0 + bx, hy0 + by);
      terrain[bi] = T.GRASS; obj[bi] = O.BUILDING; ref[bi] = 1;
    }
    world.home = { x: hx0, y: hy0 };
    // Omat tontit raivataan osittain (vesi säilyy)
    for (var oy = 0; oy < OH * FS.PLOT; oy++) for (var ox = 0; ox < OW * FS.PLOT; ox++) {
      var oi = FS.idx(home.x * FS.PLOT + ox, home.y * FS.PLOT + oy);
      if (obj[oi] === O.BUILDING) continue;
      if (obj[oi] === O.TREE && rng.chance(0.7)) obj[oi] = O.NONE;
      if (obj[oi] === O.BUSH || (obj[oi] === O.ROCK && rng.chance(0.4))) obj[oi] = O.NONE;
    }

    // Maantie kaupungista kotitilan rajalle
    buildCountyRoad(world, town, home, rng);
    return world;
  };

  function buildCountyRoad(world, town, home, rng) {
    var y = (home.y + (town.y === home.y ? 0 : 1)) * FS.PLOT + 6;
    var x0, x1;
    if (town.x < home.x) { x0 = town.x * FS.PLOT + 8; x1 = home.x * FS.PLOT - 1; }
    else { x0 = (home.x + 3) * FS.PLOT; x1 = town.x * FS.PLOT - 1; }
    for (var x = x0; x <= x1; x++) {
      var i = FS.idx(x, y);
      if (world.plots[FS.plotOf(x, y)].owner === 1) continue;
      world.obj[i] = world.terrain[i] === T.WATER ? O.BRIDGE : O.PAVED;
      if (world.terrain[i] === T.WATER) world.flag[i] |= 4; // silta veden päällä (ei oja)
    }
    world.countyRoadY = y;
  }

  /** Rakentaa kaupungin tontin sisällön (tiet ja rakennukset ruuduiksi). */
  FS.paintTownPlot = function (G, plotIdx) {
    var px = (plotIdx % FS.PLOTS) * FS.PLOT, py = Math.floor(plotIdx / FS.PLOTS) * FS.PLOT;
    for (var y = 0; y < FS.PLOT; y++) for (var x = 0; x < FS.PLOT; x++) {
      var i = FS.idx(px + x, py + y);
      if (G.terrain[i] === T.WATER) { G.obj[i] = O.NONE; continue; }
      G.terrain[i] = T.GRASS;
      G.obj[i] = O.TOWN; G.ref[i] = plotIdx;
    }
  };

  /* ---------- Vesiverkosto ---------- */

  function conducts(G, i) {
    var o = G.obj[i];
    if (o === O.DITCH) return true;
    if (o === O.VALVE) return (G.flag[i] & 1) === 1;
    if (o === O.BRIDGE) return (G.flag[i] & 4) === 0;
    return false;
  }
  FS.isDitch = function (G, i) {
    var o = G.obj[i];
    return o === O.DITCH || o === O.VALVE || (o === O.BRIDGE && (G.flag[i] & 4) === 0);
  };

  /** Laskee märät ojat lähteistä (pumput, tuulimyllyt) leveyshaulla. */
  FS.computeWater = function (G) {
    var flag = G.flag, len = N * N, i;
    for (i = 0; i < len; i++) flag[i] &= ~2;
    var queue = [], dist = new Int16Array(len).fill(-1);
    var wind = G.weather ? G.weather.wind : 10;
    Object.keys(G.buildings).forEach(function (id) {
      var b = G.buildings[id];
      var active = (b.type === 'pump' && !b.broken) || (b.type === 'windmill' && wind >= 10);
      if (!active) { b.active = false; return; }
      b.active = true;
      var range = b.type === 'pump' ? 140 : 50;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var x = b.x + d[0], y = b.y + d[1];
        if (!FS.inMap(x, y)) return;
        var j = FS.idx(x, y);
        if (conducts(G, j) && dist[j] < 0) { dist[j] = range; queue.push(j); }
      });
    });
    while (queue.length) {
      var c = queue.shift();
      flag[c] |= 2;
      if (dist[c] <= 0) continue;
      var cx = c % N, cy = (c / N) | 0;
      var nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (var k = 0; k < 4; k++) {
        var x = nb[k][0], y = nb[k][1];
        if (!FS.inMap(x, y)) continue;
        var j2 = FS.idx(x, y);
        if (dist[j2] < 0 && conducts(G, j2)) { dist[j2] = dist[c] - 1; queue.push(j2); }
      }
    }
    // Vesitornit täyttyvät märästä viereisestä ojasta
    Object.keys(G.buildings).forEach(function (id) {
      var b = G.buildings[id];
      if (b.type !== 'tower') return;
      b.fed = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) {
        var x = b.x + d[0], y = b.y + d[1];
        return FS.inMap(x, y) && (flag[FS.idx(x, y)] & 2);
      });
    });
    G.waterDirty = false;
  };

  /** Pellon ympärysruutujen ojat: märät ja kuivat (osuus 0–1 32 reunaruudusta). */
  FS.fieldDitches = function (G, f) {
    var wet = 0, dry = 0;
    function chk(x, y) {
      if (!FS.inMap(x, y)) return;
      var i = FS.idx(x, y);
      if (!FS.isDitch(G, i)) return;
      if (G.flag[i] & 2) wet++; else dry++;
    }
    for (var k = 0; k < FS.FIELD; k++) {
      chk(f.x + k, f.y - 1); chk(f.x + k, f.y + FS.FIELD);
      chk(f.x - 1, f.y + k); chk(f.x + FS.FIELD, f.y + k);
    }
    return { wet: Math.min(1, wet / 8), dry: Math.min(1, dry / 8) };
  };

  /** Tuulensuoja: vähintään 8 puuta 2 ruudun säteellä pellosta. */
  FS.fieldWindbreak = function (G, f) {
    var n = 0;
    for (var y = f.y - 2; y < f.y + FS.FIELD + 2; y++) for (var x = f.x - 2; x < f.x + FS.FIELD + 2; x++) {
      if (x >= f.x && x < f.x + FS.FIELD && y >= f.y && y < f.y + FS.FIELD) continue;
      if (FS.inMap(x, y) && G.obj[FS.idx(x, y)] === O.TREE) n++;
    }
    return n;
  };

  /** Tontin hinta: maaperä, pohjavesi, kivisyys ja myrkyllisyys. */
  FS.plotValue = function (G, p) {
    var pl = G.plots[p];
    var v = 2200 + pl.nutr * 55 + (pl.gw + 2) * 380 - pl.rock * 4000 - pl.tox * 40 - pl.water * 25;
    return Math.max(1200, Math.round(v / 50) * 50);
  };

  /** Ruudun kulkukelpoisuus eläimille. */
  FS.animalPassable = function (G, x, y) {
    if (!FS.owned(G, x, y)) return false;
    var i = FS.idx(x, y);
    if (G.terrain[i] === T.WATER) return false;
    var o = G.obj[i];
    if (o === O.FENCE || o === O.ROCK || o === O.TREE || o === O.TOWN || o === O.VALVE) return false;
    if (o === O.GATE) return (G.flag[i] & 1) === 1;
    if (o === O.BUILDING) { var b = G.buildings[G.ref[i]]; return !!(b && FS.BUILDING[b.type] && FS.BUILDING[b.type].barn); }
    return true;
  };
})();
