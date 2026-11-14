/* FarmSim Online – eläimet, katastrofit, talous ja kaupunki. */
'use strict';
(function () {
  var FS = window.FS, O = FS.O, T = FS.T, N = FS.MAP;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ---------- Eläimet ---------- */

  /** Aitausten alueet: yhtenäiset eläimille kulkukelpoiset alueet. */
  function computeRegions(G) {
    var reg = new Int16Array(N * N).fill(-1), id = 0;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var i = FS.idx(x, y);
      if (reg[i] >= 0 || !FS.animalPassable(G, x, y)) continue;
      var stack = [i]; reg[i] = id;
      while (stack.length) {
        var c = stack.pop(), cx = c % N, cy = (c / N) | 0;
        for (var k = 0; k < 4; k++) {
          var nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
          if (!FS.inMap(nx, ny)) continue;
          var j = FS.idx(nx, ny);
          if (reg[j] < 0 && FS.animalPassable(G, nx, ny)) { reg[j] = id; stack.push(j); }
        }
      }
      id++;
    }
    G._region = reg;
    G._barnRegions = {};
    Object.keys(G.buildings).forEach(function (k) {
      var b = G.buildings[k], bd = FS.BUILDING[b.type];
      if (bd && bd.barn) G._barnRegions[reg[FS.idx(b.x, b.y)]] = true;
    });
    G.regionDirty = false;
  }
  FS.computeRegions = computeRegions;

  FS.animalValue = function (a) {
    var d = FS.ANIMAL[a.type];
    var ageF = a.age > d.life * 0.7 ? FS.clamp(1 - (a.age - d.life * 0.7) / (d.life * 0.3), 0.1, 1) : 1;
    return Math.round(d.price * (0.35 + (d.max - 0.35) * a.size) * (0.4 + a.health / 166) * ageF);
  };

  FS.addAnimal = function (G, type, fem, x, y, size) {
    var a = { id: G.nextId++, type: type, fem: !!fem, age: size < 1 ? 0 : Math.round(FS.ANIMAL[type].mate * 1.1), x: x, y: y, px: x, py: y, health: 90, size: size || 0.75, preg: 0, hungry: 0, thirsty: 0 };
    G.animals.push(a);
    return a;
  };

  /** Etäisyyskenttä (askelia) annetuista kohderuuduista eläinten kulkukelpoisia ruutuja pitkin. */
  function distField(G, list) {
    var dist = new Int16Array(N * N).fill(-1), q = [];
    list.forEach(function (i) { dist[i] = 0; q.push(i); });
    for (var h = 0; h < q.length; h++) {
      var c = q[h], cx = c % N, cy = (c / N) | 0;
      for (var k = 0; k < 4; k++) {
        var nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
        if (!FS.inMap(nx, ny)) continue;
        var j = FS.idx(nx, ny);
        if (dist[j] < 0 && FS.animalPassable(G, nx, ny)) { dist[j] = dist[c] + 1; q.push(j); }
      }
    }
    return dist;
  }
  /** Lähin kohde, johon eläin ylettyy (samalla ruudulla tai viereisellä). */
  function reachable(G, list, a) {
    var best = -1;
    list.forEach(function (i) {
      var x = i % N, y = (i / N) | 0;
      if (Math.abs(x - a.x) + Math.abs(y - a.y) <= 1 && best < 0) best = i;
    });
    return best;
  }
  /** Montako eläintä ylettyy ruutuun i (sama aitaus tai viereinen ruutu). */
  FS.animalsReaching = function (G, i) {
    if (G.regionDirty || !G._region) computeRegions(G);
    var x = i % N, y = (i / N) | 0, regs = {};
    [[0, 0]].concat(DIRS).forEach(function (d) { if (FS.inMap(x + d[0], y + d[1])) { var r = G._region[FS.idx(x + d[0], y + d[1])]; if (r >= 0) regs[r] = 1; } });
    return G.animals.filter(function (a) { return regs[G._region[FS.idx(a.x, a.y)]]; }).length;
  };
  FS.animalCanReach = function (G, a, kind) {
    if (G.regionDirty || !G._region) computeRegions(G);
    var list = kind === 'feed' ? G.feeds : G.troughs, r = G._region[FS.idx(a.x, a.y)];
    return Object.keys(list).some(function (i) {
      if (!(list[i] > 0.001)) return false;
      var x = i % N, y = (i / N) | 0;
      return G._region[i] === r || DIRS.some(function (d) { return FS.inMap(x + d[0], y + d[1]) && G._region[FS.idx(x + d[0], y + d[1])] === r; });
    });
  };

  FS.animalsDay = function (G) {
    if (!G.animals.length) return;
    if (G.regionDirty || !G._region) computeRegions(G);
    // Vesitornit
    var towerWater = false;
    Object.keys(G.buildings).forEach(function (k) {
      var b = G.buildings[k];
      if (b.type !== 'tower') return;
      b.store = b.fed ? 14 : Math.max(0, (b.store || 0) - 1);
      if (b.store > 0) towerWater = true;
    });
    if (towerWater) Object.keys(G.troughs).forEach(function (i) { G.troughs[i] = 1; });

    var feedList = Object.keys(G.feeds).filter(function (i) { return G.feeds[i] > 0.001; }).map(Number);
    var troughList = Object.keys(G.troughs).filter(function (i) { return G.troughs[i] > 0.001; }).map(Number);
    var feedDist = feedList.length ? distField(G, feedList) : null, waterDist = troughList.length ? distField(G, troughList) : null;
    var born = [], dead = [];
    G.animals.forEach(function (a) {
      var d = FS.ANIMAL[a.type], region = G._region[FS.idx(a.x, a.y)];
      var barn = G._barnRegions[region];
      a.age++;
      a.px = a.x; a.py = a.y; a.trail = [[a.x, a.y]];
      var ration = d.feed / 30 * (barn ? 0.8 : 1), drink = d.feed * 0.12 * (barn ? 0.8 : 1);
      // Liikkuminen reittiä pitkin: ensin rehulle, sitten vedelle, sitten vapaasti
      var fed = false, watered = false;
      function tryEat() {
        if (!fed) { var fi = reachable(G, feedList, a); if (fi >= 0 && G.feeds[fi] >= ration) { G.feeds[fi] -= ration; fed = true; } }
        if (!watered) { var ti = reachable(G, troughList, a); if (ti >= 0 && G.troughs[ti] >= drink) { G.troughs[ti] -= drink; watered = true; } }
      }
      tryEat();
      for (var s = 0; s < 10; s++) {
        var field = !fed && feedDist ? feedDist : !watered && waterDist ? waterDist : null;
        if (!field && s >= 3) break;
        var opts = DIRS.map(function (dd) { return [a.x + dd[0], a.y + dd[1]]; }).filter(function (p) { return FS.animalPassable(G, p[0], p[1]); });
        if (!opts.length) break;
        var pick = null;
        if (field && field[FS.idx(a.x, a.y)] > 1) {
          var here = field[FS.idx(a.x, a.y)];
          opts.forEach(function (p) { var v = field[FS.idx(p[0], p[1])]; if (v >= 0 && v < here && (!pick || FS.rand(G) < 0.5)) pick = p; });
        }
        if (!pick) { if (field && field[FS.idx(a.x, a.y)] >= 0 && field[FS.idx(a.x, a.y)] <= 1) break; pick = opts[Math.floor(FS.rand(G) * opts.length)]; }
        a.x = pick[0]; a.y = pick[1]; a.trail.push([a.x, a.y]);
        tryEat();
      }
      // Pellon sato kelpaa myös ruoaksi
      var cur = FS.idx(a.x, a.y);
      if (G.obj[cur] === O.FIELD) {
        var f = G.fields[G.ref[cur]];
        if (f && (f.state === 'growing' || f.state === 'ready')) {
          f.health = Math.max(0, f.health - 1.5); fed = true;
          if (!a.cropWarn) { a.cropWarn = true; FS.msg(G, FS.ANIMAL[a.type].name + ' syö peltoasi! Rakenna aitaus.', 'warn', { x: a.x, y: a.y }); }
        }
      }
      a.hungry = fed ? 0 : a.hungry + 1;
      a.thirsty = watered ? 0 : a.thirsty + 1;
      if (fed && watered) {
        a.health = Math.min(100, a.health + 0.8 + (barn ? 0.3 : 0));
        a.size = Math.min(1, a.size + 1 / (d.mate * 1.2));
      }
      if (a.hungry > 1) a.health -= 3;   // yksi väliin jäänyt päivä ei vielä haittaa
      if (a.thirsty > 1) a.health -= 5;
      if (!barn && G.weather.T < 28) a.health -= 0.4;
      if (!barn && G.weather.T > 95) a.health -= 0.3;
      if ((a.hungry === 3 || a.thirsty === 2) && !a.needWarn) {
        a.needWarn = true;
        var food = a.hungry >= 3, can = FS.animalCanReach(G, a, food ? 'feed' : 'water');
        FS.msg(G, FS.ANIMAL[a.type].name + ' on ' + (food ? 'nälkäinen' : 'janoinen') + '. ' + (can ? (food ? 'Rehu' : 'Vesi') + ' on liian kaukana tai loppumassa.' : 'Se ei pääse ' + (food ? 'rehulle' : 'vesikaukalolle') + ' – lisää ' + (food ? 'rehupaali' : 'vesikaukalo') + ' samaan aitaukseen tai avaa portti.'), 'warn', { x: a.x, y: a.y });
      }
      if (fed && watered) a.needWarn = false;
      // Nälkäinen eläin voi rikkoa aidan
      if (a.hungry > 2 && FS.rand(G) < 0.04) {
        DIRS.some(function (dd) {
          var nx = a.x + dd[0], ny = a.y + dd[1];
          if (FS.inMap(nx, ny) && G.obj[FS.idx(nx, ny)] === O.FENCE) {
            G.obj[FS.idx(nx, ny)] = O.NONE; G.regionDirty = true;
            FS.msg(G, 'Nälkäinen eläin rikkoi aidan!', 'warn', { x: nx, y: ny });
            return true;
          }
          return false;
        });
      }
      // Lisääntyminen
      if (a.preg > 0) {
        a.preg--;
        if (a.preg === 0) born.push({ type: a.type, x: a.x, y: a.y });
      } else if (a.fem && a.age > d.mate && a.health > 60 && FS.rand(G) < 1 / 25) {
        var mate = G.animals.some(function (b) { return b !== a && !b.fem && b.type === a.type && b.age > d.mate && G._region[FS.idx(b.x, b.y)] === region; });
        if (mate) a.preg = d.gest;
      }
      a.health = FS.clamp(a.health, 0, 100);
      if (a.health <= 0 || a.age > d.life) dead.push(a);
    });
    born.forEach(function (b) {
      FS.addAnimal(G, b.type, FS.rand(G) < 0.5, b.x, b.y, 0.3);
      FS.msg(G, 'Tilalle syntyi ' + FS.ANIMAL[b.type].name.toLowerCase() + 'vauva!', 'good', { x: b.x, y: b.y });
    });
    if (dead.length) {
      G.animals = G.animals.filter(function (a) { return dead.indexOf(a) < 0; });
      dead.forEach(function (a) { FS.msg(G, FS.ANIMAL[a.type].name + ' kuoli ' + (a.age > FS.ANIMAL[a.type].life ? 'vanhuuteen.' : 'huonoon hoitoon.'), 'bad', { x: a.x, y: a.y }); });
    }
    Object.keys(G.feeds).forEach(function (i) { if (G.feeds[i] <= 0.001) { G.feeds[i] = 0; } });
  };

  /* ---------- Katastrofit ---------- */

  var WEIGHTS = {
    plains: { tornado: 3, drought: 3, windstorm: 3, flood: 1, frost: 1, locusts: 2 },
    midwest: { tornado: 3, drought: 1, windstorm: 2, flood: 2, frost: 2, locusts: 1 },
    desert: { tornado: 0.3, drought: 4, windstorm: 2, flood: 1, frost: 0.5, locusts: 2 },
    texas: { tornado: 2, drought: 3, windstorm: 2, flood: 1, frost: 0.5, locusts: 1 },
    finland: { tornado: 0.2, drought: 1, windstorm: 2, flood: 2, frost: 4, locusts: 0.2 }
  };

  FS.disasterRoll = function (G) {
    if (!G.options.disasters || (G.disaster && G.disaster.daysLeft > 0)) return;
    if (G.day < 120) return; // armonaika alussa
    if (!FS.chance(G, 0.012)) return;
    var w = WEIGHTS[G.region] || { tornado: 1, drought: 1.5, windstorm: 1.5, flood: 1.5, frost: 1.5, locusts: 1 };
    var region = FS.REGION[G.region], season = FS.dateOf(G.day).season;
    var list = Object.keys(w).map(function (k) {
      var v = w[k];
      if (k === 'flood' && !G.plots.some(function (p) { return p.water > 0; })) v = 0;
      if (k === 'frost' && season === 2) v *= 0.2;
      if (k === 'locusts' && season === 0) v = 0;
      if (k === 'drought' && region.r.reduce(function (a, b) { return a + b; }, 0) > 120) v *= 0.5;
      return [k, v];
    });
    var tot = list.reduce(function (a, b) { return a + b[1]; }, 0), r = FS.rand(G) * tot;
    for (var k = 0; k < list.length; k++) { r -= list[k][1]; if (r <= 0) { FS.triggerDisaster(G, list[k][0]); return; } }
  };

  function regenForecast(G) {
    var W = G.weather, today = W.queue[0];
    W.queue = [today];
    for (var k = 1; k < 6; k++) W.queue.push(FS._genDay ? FS._genDay(G, G.day + k) : today);
  }

  FS.triggerDisaster = function (G, id) {
    var name = FS.DISASTERS.find(function (d) { return d.id === id; }).name;
    var D = { id: id, daysLeft: 1, total: 1 };
    var ownPlots = [];
    G.plots.forEach(function (p, i) { if (p.owner === 1) ownPlots.push(i); });
    var focus = ownPlots[Math.floor(FS.rand(G) * ownPlots.length)];
    var fx = (focus % FS.PLOTS) * 8 + 4, fy = Math.floor(focus / FS.PLOTS) * 8 + 4;
    if (id === 'tornado') {
      D.daysLeft = 3;
      var ang = FS.rand(G) * Math.PI * 2, path = [];
      var sx = fx - Math.cos(ang) * 30 + FS.gauss(G) * 6, sy = fy - Math.sin(ang) * 30 + FS.gauss(G) * 6;
      for (var s = 0; s < 60; s++) {
        ang += FS.gauss(G) * 0.12;
        sx += Math.cos(ang); sy += Math.sin(ang);
        path.push([Math.round(sx), Math.round(sy)]);
      }
      G.fx.push({ type: 'tornado', path: path, day: G.day, dur: 3 });
      tornadoDamage(G, path);
    } else if (id === 'locusts') {
      D.daysLeft = D.total = 8 + Math.floor(FS.rand(G) * 8);
      D.x = fx + FS.gauss(G) * 10; D.y = fy + FS.gauss(G) * 10;
    } else if (id === 'drought') {
      D.daysLeft = D.total = 35 + Math.floor(FS.rand(G) * 40);
    } else if (id === 'flood') {
      D.daysLeft = D.total = 7 + Math.floor(FS.rand(G) * 8);
      D.near = {};
      Object.keys(G.fields).forEach(function (k) {
        var f = G.fields[k];
        if (nearWater(G, f.x + 4, f.y + 4, 9)) D.near[f.id] = true;
      });
      Object.keys(G.buildings).forEach(function (k) {
        var b = G.buildings[k];
        if (b.type !== 'pump') return;
        if (FS.chance(G, 0.3)) { FS.removeBuilding(G, b, true); FS.msg(G, 'Tulva vei vesipumpun!', 'bad', { x: b.x, y: b.y }); }
        else b.broken = true;
      });
      for (var i = 0; i < N * N; i++) {
        if (G.obj[i] === O.DITCH && nearWater(G, i % N, (i / N) | 0, 1) && FS.chance(G, 0.4)) G.obj[i] = O.NONE;
      }
      G.waterDirty = true; G.envDirty = true;
    } else if (id === 'frost') {
      D.daysLeft = D.total = 3 + Math.floor(FS.rand(G) * 4);
    } else if (id === 'windstorm') {
      D.daysLeft = D.total = 3 + Math.floor(FS.rand(G) * 4);
    }
    G.disaster = D;
    regenForecast(G);
    if (['tornado', 'drought', 'locusts', 'frost'].indexOf(id) >= 0) {
      FS.CROPS.forEach(function (c) { G.market[c.id].shock += 0.05 + FS.rand(G) * 0.12; });
    }
    FS.msg(G, 'KATASTROFI: ' + name + '! ' + ({
      tornado: 'Pyörremyrsky kulkee alueen yli.',
      locusts: 'Heinäsirkkaparvi syö satoja. Harkitse hyönteismyrkkyä tai pikakorjuuta.',
      drought: 'Sateet loppuvat viikoiksi. Kastele ja suosi vähän vettä vaativia kasveja.',
      flood: 'Joet ja järvet tulvivat. Pumput pysähtyvät.',
      frost: 'Ankara halla uhkaa satoja.',
      windstorm: 'Kova tuuli vie pintamaata suojaamattomilta pelloilta.'
    })[id], 'bad', { x: fx, y: fy });
    if (G._idle) G._idle.disasters.push(name);
  };

  function nearWater(G, x, y, r) {
    for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) {
      if (FS.inMap(x + xx, y + yy) && G.terrain[FS.idx(x + xx, y + yy)] === T.WATER) return true;
    }
    return false;
  }

  function tornadoDamage(G, path) {
    var hitFields = {}, hitBuild = {};
    path.forEach(function (p) {
      for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) {
        var x = p[0] + xx, y = p[1] + yy;
        if (!FS.inMap(x, y)) continue;
        var i = FS.idx(x, y), o = G.obj[i];
        if (o === O.TREE || o === O.BUSH || o === O.FENCE || o === O.GATE || o === O.FEED || o === O.TROUGH) {
          G.obj[i] = O.NONE; delete G.feeds[i]; delete G.troughs[i];
        }
        if (o === O.FIELD) hitFields[G.ref[i]] = true;
        if (o === O.BUILDING && G.ref[i] !== 1) hitBuild[G.ref[i]] = true;
        G.machines.forEach(function (m) { if (!m.shed && m.x === x && m.y === y) m.cond = Math.max(0, m.cond - 45); });
      }
    });
    Object.keys(hitFields).forEach(function (id) { var f = G.fields[id]; if (f) f.health = Math.max(0, f.health - 55); });
    Object.keys(hitBuild).forEach(function (id) {
      var b = G.buildings[id];
      if (b && FS.chance(G, 0.5)) { FS.removeBuilding(G, b, true); FS.msg(G, 'Tornado tuhosi rakennuksen: ' + FS.BUILDING[b.type].name + '.', 'bad', { x: b.x, y: b.y }); }
    });
    G.animals = G.animals.filter(function (a) {
      var hit = path.some(function (p) { return Math.abs(p[0] - a.x) <= 1 && Math.abs(p[1] - a.y) <= 1; });
      return !hit;
    });
    G.regionDirty = true; G.waterDirty = true; G.envDirty = true;
  }

  FS.disasterDay = function (G) {
    var D = G.disaster;
    if (!D || D.daysLeft <= 0) return;
    D.daysLeft--;
    if (D.id === 'locusts') {
      // Parvi hakeutuu pelloille
      var best = null, bd = 1e9;
      Object.keys(G.fields).forEach(function (k) {
        var f = G.fields[k];
        if (f.state !== 'growing' && f.state !== 'ready') return;
        var d = Math.hypot(f.x + 4 - D.x, f.y + 4 - D.y) + FS.rand(G) * 12;
        if (d < bd) { bd = d; best = f; }
      });
      if (best) { var dx = best.x + 4 - D.x, dy = best.y + 4 - D.y, l = Math.max(1, Math.hypot(dx, dy)); D.x += dx / l * 4; D.y += dy / l * 4; }
      else { D.x += FS.gauss(G) * 4; D.y += FS.gauss(G) * 4; }
      Object.keys(G.fields).forEach(function (k) {
        var f = G.fields[k];
        if (Math.hypot(f.x + 4 - D.x, f.y + 4 - D.y) < 9 && (f.state === 'growing' || f.state === 'ready')) {
          var protect = f.pests < 20 ? 0.4 : 1;
          f.health = Math.max(0, f.health - 7 * protect); f.pests = Math.min(100, f.pests + 8);
        }
      });
    }
    if (D.id === 'drought') {
      Object.keys(G.buildings).forEach(function (k) {
        var b = G.buildings[k];
        if (b.type === 'pump' && !b.broken && FS.chance(G, 0.01)) { b.broken = true; b.dry = true; FS.msg(G, 'Kuivuus laski vedenpintaa – pumppu ei yllä veteen.', 'warn', { x: b.x, y: b.y }); }
      });
    }
    if (D.daysLeft <= 0) {
      if (D.id === 'flood' || D.id === 'drought') Object.keys(G.buildings).forEach(function (k) { var b = G.buildings[k]; if (b.type === 'pump') { b.broken = false; b.dry = false; } });
      G.waterDirty = true;
      FS.msg(G, 'Katastrofi on ohi: ' + FS.DISASTERS.find(function (d) { return d.id === D.id; }).name.toLowerCase() + '.', 'info');
      G.disaster = null;
    }
  };

  /* ---------- Talous ---------- */

  FS.landValue = function (G) {
    var v = 0;
    G.plots.forEach(function (p, i) { if (p.owner === 1) v += FS.plotValue(G, i); });
    return v;
  };
  FS.machinesValue = function (G) { return G.machines.reduce(function (s, m) { return s + FS.machineValue(m); }, 0); };
  FS.buildingsValue = function (G) {
    return Object.keys(G.buildings).reduce(function (s, k) { var b = FS.BUILDING[G.buildings[k].type]; return s + (b ? b.price * 0.5 : 0); }, 0);
  };
  FS.animalsValue = function (G) { return G.animals.reduce(function (s, a) { return s + FS.animalValue(a); }, 0); };
  FS.siloValue = function (G) { return G.silo.reduce(function (s, h) { return s + FS.cropPrice(G, h.crop) * h.q / 100; }, 0); };
  FS.debt = function (G) { return G.loans.reduce(function (s, l) { return s + l.rem; }, 0); };
  FS.netWorth = function (G) {
    return Math.round(G.funds + FS.landValue(G) + FS.machinesValue(G) + FS.buildingsValue(G) + FS.animalsValue(G) + FS.siloValue(G) - FS.debt(G));
  };
  FS.creditLimit = function (G) {
    return Math.max(0, Math.round((0.6 * (FS.landValue(G) + FS.machinesValue(G) + FS.buildingsValue(G)) - FS.debt(G)) / 100) * 100);
  };
  FS.takeLoan = function (G, amount) {
    amount = Math.round(amount);
    if (amount <= 0 || amount > FS.creditLimit(G)) return false;
    G.loans.push({ rem: amount, rate: G.interest, q: 20, orig: amount, day: G.day });
    G.funds += amount;
    return true;
  };
  FS.quarterPayment = function (G) {
    return G.loans.reduce(function (s, l) { return s + l.rem / l.q + l.rem * l.rate / 4; }, 0);
  };
  FS.repayAll = function (G) {
    var d = FS.debt(G);
    if (d <= 0 || G.funds < d) return false;
    G.funds -= d; G.loans = [];
    return true;
  };

  FS.quarter = function (G) {
    G.loans.forEach(function (l) {
      var princ = l.rem / l.q, intr = l.rem * l.rate / 4;
      G.funds -= princ; l.rem -= princ; l.q--;
      FS.spend(G, Math.round(intr), 'interest');
    });
    G.loans = G.loans.filter(function (l) { return l.q > 0 && l.rem > 1; });
  };

  FS.yearProfit = function (Y) {
    var inc = 0, exp = 0, k;
    for (k in Y.inc) inc += Y.inc[k];
    for (k in Y.exp) exp += Y.exp[k];
    return { inc: inc, exp: exp, profit: inc - exp };
  };

  FS.taxEstimate = function (G) {
    var p = FS.yearProfit(G.year).profit;
    return Math.round(FS.landValue(G) * 0.012 + (FS.machinesValue(G) + FS.buildingsValue(G)) * 0.02 + Math.max(0, p) * 0.12);
  };

  FS.yearEnd = function (G) {
    var tax = FS.taxEstimate(G);
    FS.spend(G, tax, 'tax');
    G.town.taxes += tax;
    var P = FS.yearProfit(G.year), fields = Object.keys(G.fields).map(function (k) { return G.fields[k]; });
    var soil = fields.length ? fields.reduce(function (s, f) { return s + f.nutr; }, 0) / fields.length : 50;
    var tox = fields.length ? fields.reduce(function (s, f) { return s + f.tox; }, 0) / fields.length : 0;
    var worth = FS.netWorth(G);
    var rec = {
      year: FS.dateOf(G.day - 1).year, worth: worth, profit: P.profit, inc: P.inc, exp: P.exp, tax: tax,
      harvests: G.year.harvests, quality: G.year.harvests ? G.year.quality / G.year.harvests : 0,
      soil: soil, tox: tox, town: G.town.plots.length, fields: fields.length, detail: G.year
    };
    var prev = G.history[G.history.length - 1];
    G.history.push(rec);
    if (G.history.length > 50) G.history.shift();
    // Kotitilan laajennus
    var next = FS.HOME_LEVELS[G.homeLevel + 1];
    if (next && P.profit >= next.profit) {
      G.homeLevel++;
      FS.msg(G, 'Hyvä vuosi! Kotitila laajeni: ' + next.name + '. Tilanhoitajan idle-teho kasvoi.', 'good', { x: G.home.x + 2, y: G.home.y + 2 });
    }
    // Messualueen karjanäyttely
    if (FS.townHas(G, 'fair') && G.animals.length) {
      var best = G.animals.slice().sort(function (a, b) { return FS.animalValue(b) - FS.animalValue(a); })[0];
      if (best.health >= 80 && best.size >= 0.9) {
        var prize = 300 + Math.round(FS.rand(G) * 1200);
        FS.earn(G, prize, 'prizes');
        FS.msg(G, 'Karjanäyttely: ' + FS.ANIMAL[best.type].name.toLowerCase() + ' voitti sinisen nauhan! Palkinto ' + FS.money(prize) + '.', 'good');
      }
    }
    townGrowth(G);
    G.year = FS.emptyYear();
    G.year.startWorth = worth;
    G.evalPending = { rec: rec, prev: prev || null };
    if (G._idle) G._idle.years.push(rec);
  };

  /** Maksukyvyttömyys: automaattinen laina, sitten pakkomyynnit. */
  FS.solvency = function (G) {
    if (G.funds >= 0) return;
    var need = Math.ceil((-G.funds + 1500) / 100) * 100;
    if (FS.takeLoan(G, Math.min(need, FS.creditLimit(G))) && G.funds >= 0) {
      FS.msg(G, 'Rahat loppuivat – pankki myönsi automaattisesti lainan.', 'warn');
      return;
    }
    var sold = [];
    while (G.funds < 0 && G.silo.length) { FS.sellStored(G, 0); sold.push('sato'); }
    while (G.funds < 0 && G.animals.length) { var a = G.animals.pop(); FS.earn(G, FS.animalValue(a), 'animals'); sold.push('eläin'); }
    G.machines.sort(function (a, b) { return FS.machineValue(b) - FS.machineValue(a); });
    while (G.funds < 0 && G.machines.length) { var m = G.machines.shift(); FS.earn(G, FS.machineValue(m), 'machines'); sold.push('kone'); }
    var homeP = G.homePlot.y * FS.PLOTS + G.homePlot.x;
    for (var i = 0; i < G.plots.length && G.funds < 0; i++) {
      if (G.plots[i].owner === 1 && i !== homeP) { FS.forceSellPlot(G, i); sold.push('maa'); }
    }
    if (sold.length) FS.msg(G, 'Velkojat myivät omaisuutta: ' + sold.length + ' kohdetta.', 'bad');
    if (G.funds < 0) {
      G.gameOver = true;
      FS.msg(G, 'Verottaja ja pankki ottivat tilan haltuunsa. Peli päättyi – voit aloittaa uuden tilan.', 'bad');
    }
  };

  /* ---------- Kaupunki ---------- */

  FS.townHas = function (G, type) {
    var t = G.town.types;
    for (var k in t) if (t[k] === type) return true;
    return false;
  };

  function townGrowth(G) {
    var need = 1200 + 900 * (G.town.plots.length - 1);
    var homesBonus = Object.keys(G.town.types).filter(function (k) { return G.town.types[k] === 'homes' || G.town.types[k] === 'factory'; }).length * 300;
    if (G.town.taxes + homesBonus < need && !FS.chance(G, 0.15)) return;
    if (G.town.vote) return;
    var cands = [];
    G.town.plots.forEach(function (p) {
      var px = p % FS.PLOTS, py = Math.floor(p / FS.PLOTS);
      DIRS.forEach(function (d) {
        var nx = px + d[0], ny = py + d[1];
        if (nx < 0 || ny < 0 || nx >= FS.PLOTS || ny >= FS.PLOTS) return;
        var ni = ny * FS.PLOTS + nx;
        if (G.plots[ni].owner === 0 && G.plots[ni].water < 16 && cands.indexOf(ni) < 0) cands.push(ni);
      });
    });
    if (!cands.length) return;
    var plot = cands[Math.floor(FS.rand(G) * cands.length)];
    G.plots[plot].owner = 2;
    G.town.plots.push(plot);
    G.town.taxes = 0;
    var avail = FS.TOWN_TYPES.filter(function (t) { return t.id === 'homes' || t.id === 'shops' || !FS.townHas(G, t.id); });
    var options = [];
    while (options.length < 3 && avail.length) options.push(avail.splice(Math.floor(FS.rand(G) * avail.length), 1)[0].id);
    G.town.vote = { plot: plot, options: options };
    FS.paintTownPlot(G, plot);
    G.town.types[plot] = 'build';
    if (G._idle) {
      var pref = ['jobs', 'school', 'market', 'airport', 'shops', 'fair', 'homes', 'factory'];
      var choice = pref.find(function (p) { return options.indexOf(p) >= 0; });
      FS.voteTown(G, choice);
    } else {
      FS.msg(G, 'Kaupunki laajenee! Äänestä, mitä uudelle tontille rakennetaan.', 'good');
    }
  }

  FS.voteTown = function (G, choice) {
    var v = G.town.vote;
    if (!v) return null;
    var others = v.options.filter(function (o) { return o !== choice; });
    var result = FS.rand(G) < 0.8 || !others.length ? choice : others[Math.floor(FS.rand(G) * others.length)];
    G.town.types[v.plot] = result;
    G.town.vote = null;
    // Äänijakauma näytettäväksi: voittaja saa eniten ääniä
    var win = 40 + Math.round(FS.rand(G) * 25), rest = 100 - win, tally = [{ id: result, pct: win }];
    var losers = v.options.filter(function (o) { return o !== result; });
    losers.forEach(function (o, k) {
      var p = k === losers.length - 1 ? rest : Math.min(win - 1, Math.round(rest * (o === choice ? 0.75 : 0.4)));
      rest -= p; tally.push({ id: o, pct: p });
    });
    tally.sort(function (a, b) { return b.pct - a.pct; });
    FS.msg(G, 'Kaupunkiin rakennetaan: ' + FS.TOWN_TYPE[result].name + (result !== choice ? ' (äänesi hävisi).' : '.'), result === choice ? 'good' : 'info');
    return { choice: choice, result: result, tally: tally };
  };
})();
