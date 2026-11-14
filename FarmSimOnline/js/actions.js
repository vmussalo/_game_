/* FarmSim Online – pelaajan toiminnot. Jokainen palauttaa {ok, msg}. */
'use strict';
(function () {
  var FS = window.FS, O = FS.O, T = FS.T, N = FS.MAP;
  var DOZE = FS.TOOL.doze.cost;

  function fail(msg) { return { ok: false, msg: msg }; }
  function ok(msg) { return { ok: true, msg: msg || '' }; }

  /** Voiko ruudun raivata sijoittamista varten? Palauttaa raivauskustannuksen tai -1. */
  function clearCost(G, i, allowRoad) {
    if (G.terrain[i] === T.WATER) return -1;
    var o = G.obj[i];
    if (o === O.NONE) return 0;
    if (o === O.DIRT_ROAD && allowRoad) return 0;
    if ((o === O.ROCK || o === O.TREE || o === O.BUSH) && G.options.autoDoze) return DOZE;
    return -1;
  }
  function machineAt(G, x, y) {
    return G.machines.find(function (m) { return !m.shed && (m.x === x || (FS.MACHINE[m.type].size === 2 && m.x + 1 === x)) && m.y === y; });
  }
  FS.machineAt = machineAt;

  function areaCheck(G, x, y, w, h, allowRoad) {
    var cost = 0;
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var tx = x + xx, ty = y + yy;
      if (!FS.owned(G, tx, ty)) return { ok: false, msg: 'Voit rakentaa vain omalle maallesi.' };
      var c = clearCost(G, FS.idx(tx, ty), allowRoad);
      if (c < 0) return { ok: false, msg: G.options.autoDoze ? 'Paikka ei ole vapaa.' : 'Paikka ei ole vapaa (raivaa ensin tai kytke AutoRaivaus päälle).' };
      if (machineAt(G, tx, ty)) return { ok: false, msg: 'Kone on tiellä – siirrä se ensin.' };
      cost += c;
    }
    return { ok: true, cost: cost };
  }
  function clearArea(G, x, y, w, h) {
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var i = FS.idx(x + xx, y + yy);
      G.obj[i] = O.NONE; delete G.feeds[i]; delete G.troughs[i];
    }
  }

  /* ---------- Pellot ---------- */

  FS.checkField = function (G, x, y) { return areaCheck(G, x, y, FS.FIELD, FS.FIELD, true); };

  FS.placeField = function (G, x, y, cropId) {
    var c = FS.checkField(G, x, y);
    if (!c.ok) return c;
    if (c.cost) FS.spend(G, c.cost, 'misc');
    clearArea(G, x, y, FS.FIELD, FS.FIELD);
    var f = FS.newField(G, x, y, cropId);
    return { ok: true, field: f, msg: 'Pelto perustettu. Kyntö ja kylvö viikon kuluttua: ' + FS.CROP[cropId].name + '.' };
  };

  FS.setNextCrop = function (G, f, cropId) {
    f.next = cropId; f.repeat = true;
    if (f.state === 'fallow' || f.state === 'dead') {
      if (f.state === 'dead') { f.crop = null; f.prog = 0; }
      f.state = 'wait'; f.wait = 2;
    }
    if (f.state === 'queued') {
      // jonossa oleva kylvö käyttää uutta kasvia
    }
    return ok();
  };

  /** Lopettaa viljelykierron (CUT): nykyinen sato korjataan, mutta uutta ei kylvetä. */
  FS.cutField = function (G, f, now) {
    f.repeat = false;
    if (now) {
      if (f.job) return fail('Pellolla on työ kesken.');
      if (f.contract) { var pen = Math.round(f.contract.price * 0.25); FS.spend(G, pen, 'misc'); f.contract = null; FS.msg(G, 'Futuurisopimus purettiin: sakko ' + FS.money(pen) + '.', 'bad'); }
      G.jobQueue = G.jobQueue.filter(function (q) { return q.field !== f.id; });
      f.crop = null; f.prog = 0; f.state = 'fallow';
    }
    return ok();
  };

  FS.harvestNow = function (G, f) {
    if (f.state !== 'growing' && f.state !== 'ready') return fail('Pellolla ei ole korjattavaa.');
    if (f.prog < 0.25) return fail('Sato on vielä liian nuori korjattavaksi.');
    var c = FS.CROP[f.crop];
    f.state = 'ready';
    FS.queueJob(G, f, c.hand ? 'hand' : 'harvest');
    return ok('Sadonkorjuu tilattu.');
  };

  FS.orderSpray = function (G, f, s) {
    FS.queueJob(G, f, 'spray', s);
    return ok(FS.SPRAY[s].name + ': ruiskutus tilattu.');
  };

  FS.contract = function (G, f) {
    var cropId = f.crop || f.next;
    if (!cropId) return fail('Valitse ensin pellolle kasvi.');
    if (f.contract) return fail('Pellolla on jo futuurisopimus.');
    var price = Math.round(FS.cropPrice(G, cropId));
    f.contract = { crop: cropId, price: price, day: G.day };
    return ok('Seuraava sato myyty etukäteen hintaan ' + FS.money(price) + '.');
  };

  FS.dusterSpray = function (G, s) {
    var duster = G.machines.find(function (m) { return m.type === 'duster' && m.cond >= 20; });
    if (!duster) return fail('Sinulla ei ole toimivaa ruiskutuskonetta.');
    var list = Object.keys(G.fields).map(function (k) { return G.fields[k]; }).filter(function (f) { return f.state === 'growing' || f.state === 'ready'; });
    if (!list.length) return fail('Ei kasvavia peltoja.');
    var cost = list.length * 110;
    FS.spend(G, cost, 'chem');
    list.forEach(function (f) { FS.applySpray(G, f, s); });
    duster.cond = Math.max(0, duster.cond - 1.5);
    G.fx.push({ type: 'plane', day: G.day, dur: 2, fields: list.map(function (f) { return [f.x, f.y]; }) });
    return ok('Ruiskutuskone ruiskutti ' + list.length + ' peltoa (' + FS.money(cost) + ').');
  };

  /* ---------- Työkalut ---------- */

  /** Käyttää työkalua yhteen ruutuun. */
  FS.applyTool = function (G, tool, x, y) {
    if (!FS.inMap(x, y)) return fail('');
    if (!FS.owned(G, x, y)) return fail('Voit rakentaa vain omalle maallesi. Osta lisää maata kartalta.');
    var i = FS.idx(x, y), o = G.obj[i], cost = FS.TOOL[tool].cost || 0;
    var water = G.terrain[i] === T.WATER;
    function pay(c) { if (c > 0) FS.spend(G, c, 'misc'); }
    switch (tool) {
      case 'paved':
      case 'dirt':
        if (water) return fail('Tietä ei voi rakentaa veteen.');
        if (o === O.DITCH) { if (tool !== 'paved') return fail('Ojan ylitys vaatii asfalttitien (silta).'); G.obj[i] = O.BRIDGE; G.flag[i] &= ~4; pay(cost); G.waterDirty = true; G.envDirty = true; return ok(); }
        if (o === O.DIRT_ROAD && tool === 'paved') { G.obj[i] = O.PAVED; pay(cost); G.envDirty = true; return ok(); }
        if (o !== O.NONE) return fail('Ruutu ei ole vapaa.');
        G.obj[i] = tool === 'paved' ? O.PAVED : O.DIRT_ROAD; pay(cost); G.envDirty = true;
        return ok();
      case 'fence':
        if (water || o !== O.NONE) return fail('Ruutu ei ole vapaa.');
        if (G.animals.some(function (a) { return a.x === x && a.y === y; })) return fail('Eläin on tiellä.');
        G.obj[i] = O.FENCE; pay(cost); G.regionDirty = true;
        return ok();
      case 'gate':
        if (o === O.GATE) { G.flag[i] ^= 1; G.regionDirty = true; return ok((G.flag[i] & 1) ? 'Portti auki.' : 'Portti kiinni.'); }
        if (water || (o !== O.NONE && o !== O.FENCE)) return fail('Portti sijoitetaan aitaan tai vapaaseen ruutuun.');
        G.obj[i] = O.GATE; G.flag[i] &= ~1; pay(cost); G.regionDirty = true;
        return ok();
      case 'ditch':
        if (water) return fail('Ojaa ei voi kaivaa veteen.');
        if (o === O.PAVED) { G.obj[i] = O.BRIDGE; G.flag[i] &= ~4; pay(cost); G.waterDirty = true; G.envDirty = true; return ok(); }
        if (o !== O.NONE && o !== O.DIRT_ROAD) return fail('Ruutu ei ole vapaa.');
        G.obj[i] = O.DITCH; pay(cost); G.waterDirty = true; G.envDirty = true;
        return ok();
      case 'valve':
        if (o === O.VALVE) { G.flag[i] ^= 1; G.waterDirty = true; return ok((G.flag[i] & 1) ? 'Venttiili auki – vesi virtaa.' : 'Venttiili kiinni.'); }
        if (o !== O.DITCH) return fail('Venttiili sijoitetaan ojaan.');
        G.obj[i] = O.VALVE; G.flag[i] |= 1; pay(cost); G.waterDirty = true;
        return ok('Venttiili asennettu (auki). Klikkaa venttiiliä sulkeaksesi.');
      case 'feed':
        if (o === O.FEED) { if (G.feeds[i] >= 0.99) return fail('Rehua on jo täysi paali.'); G.feeds[i] = 1; FS.spend(G, FS.townHas(G, 'shops') ? 90 : cost, 'feed'); return ok('Rehua lisätty.'); }
        if (water || o !== O.NONE) return fail('Ruutu ei ole vapaa.');
        G.obj[i] = O.FEED; G.feeds[i] = 1; FS.spend(G, FS.townHas(G, 'shops') ? 90 : cost, 'feed');
        return reachMsg(G, i, 'Rehupaali');
      case 'trough':
        if (o === O.TROUGH) { G.troughs[i] = 1; pay(cost); return ok('Kaukalo täytetty.'); }
        if (water || o !== O.NONE) return fail('Ruutu ei ole vapaa.');
        G.obj[i] = O.TROUGH; G.troughs[i] = 1; pay(cost); G.regionDirty = true;
        return reachMsg(G, i, 'Vesikaukalo');
      case 'tree':
        if (water || o !== O.NONE) return fail('Ruutu ei ole vapaa.');
        G.obj[i] = O.TREE; pay(cost); G.regionDirty = true; G.envDirty = true;
        return ok();
      case 'doze':
        return FS.doze(G, x, y);
    }
    return fail('');
  };

  function reachMsg(G, i, what) {
    if (!G.animals.length) return ok(what + ' asetettu. Osta eläimet samaan aitaukseen.');
    var n = FS.animalsReaching(G, i);
    if (!n) return { ok: true, warn: true, msg: what + ' asetettu, mutta yksikään eläin ei pääse sille – se on eri aitauksessa tai portti on kiinni.' };
    return ok(what + ' asetettu: ' + n + '/' + G.animals.length + ' eläintä ylettyy siihen.');
  }

  FS.doze = function (G, x, y) {
    var i = FS.idx(x, y), o = G.obj[i];
    if (o === O.NONE) return fail('Ei raivattavaa.');
    if (o === O.FIELD) { var f = G.fields[G.ref[i]]; if (f) { FS.removeField(G, f); FS.spend(G, DOZE * 8, 'misc'); G.fx.push({ type: 'flame', x: f.x + 4, y: f.y + 4, day: G.day, dur: 1 }); } return ok('Pelto raivattu.'); }
    if (o === O.BUILDING) {
      var b = G.buildings[G.ref[i]];
      if (!b || b.type === 'home') return fail('Kotitilaa ei voi purkaa.');
      FS.removeBuilding(G, b);
      FS.spend(G, DOZE * b.w * b.h, 'misc');
      return ok('Rakennus purettu.');
    }
    if (o === O.TOWN) return fail('Kaupungin rakennuksia ei voi purkaa.');
    if (o === O.BRIDGE) {
      if (G.flag[i] & 4) return fail('Siltaa ei voi purkaa.');
      G.obj[i] = O.DITCH;
    } else {
      G.obj[i] = O.NONE;
      delete G.feeds[i]; delete G.troughs[i];
    }
    if (o === O.ROCK) G.terrain[i] = T.DIRT;
    FS.spend(G, DOZE, 'misc');
    G.regionDirty = true; G.waterDirty = true; G.envDirty = true;
    return ok();
  };

  /* ---------- Rakennukset ---------- */

  FS.checkBuilding = function (G, type, x, y) {
    var bd = FS.BUILDING[type];
    var c = areaCheck(G, x, y, bd.w, bd.h, true);
    if (!c.ok) return c;
    if (type === 'pump') {
      var nearW = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return FS.inMap(x + d[0], y + d[1]) && G.terrain[FS.idx(x + d[0], y + d[1])] === T.WATER; });
      if (!nearW) return fail('Pumppu pitää sijoittaa joen tai järven rantaan.');
    }
    return c;
  };

  FS.placeBuilding = function (G, type, x, y) {
    var bd = FS.BUILDING[type], c = FS.checkBuilding(G, type, x, y);
    if (!c.ok) return c;
    if (G.funds < bd.price + c.cost) return fail('Rahat eivät riitä.');
    FS.spend(G, bd.price, 'buildings');
    if (c.cost) FS.spend(G, c.cost, 'misc');
    clearArea(G, x, y, bd.w, bd.h);
    var id = G.nextId++;
    G.buildings[id] = { id: id, type: type, x: x, y: y, w: bd.w, h: bd.h, store: 0 };
    for (var yy = 0; yy < bd.h; yy++) for (var xx = 0; xx < bd.w; xx++) {
      var i = FS.idx(x + xx, y + yy);
      G.obj[i] = O.BUILDING; G.ref[i] = id; G.terrain[i] = T.GRASS;
    }
    G.waterDirty = true; G.regionDirty = true; G.envDirty = true;
    return { ok: true, msg: bd.name + ' rakennettu.', building: G.buildings[id] };
  };

  FS.removeBuilding = function (G, b, silent) {
    for (var yy = 0; yy < b.h; yy++) for (var xx = 0; xx < b.w; xx++) {
      var i = FS.idx(b.x + xx, b.y + yy);
      if (G.ref[i] === b.id) { G.obj[i] = O.NONE; G.ref[i] = 0; G.terrain[i] = T.DIRT; }
    }
    delete G.buildings[b.id];
    G.machines.forEach(function (m) { if (m.shed === b.id) { m.shed = 0; m.x = b.x; m.y = b.y; } });
    var cap = FS.siloCapacity(G);
    while (G.silo.length > cap) { var v = FS.sellStored(G, G.silo.length - 1); if (!silent) FS.msg(G, 'Siilon sisältö myytiin: ' + FS.money(v) + '.', 'info'); }
    G.waterDirty = true; G.regionDirty = true; G.envDirty = true;
  };

  FS.shedUse = function (G, b) { return G.machines.filter(function (m) { return m.shed === b.id; }).length; };

  /* ---------- Koneet ---------- */

  FS.checkMachine = function (G, type, x, y) {
    if (!FS.owned(G, x, y)) return fail('Sijoita kone omalle maallesi.');
    var i = FS.idx(x, y);
    if (G.obj[i] === O.BUILDING) {
      var b = G.buildings[G.ref[i]], bd = b && FS.BUILDING[b.type];
      if (bd && bd.cap) {
        if (FS.shedUse(G, b) >= bd.cap) return fail(bd.name + ' on täynnä.');
        return { ok: true, shed: b.id };
      }
      return fail('Konetta ei voi sijoittaa tähän rakennukseen.');
    }
    var size = FS.MACHINE[type].size;
    for (var k = 0; k < size; k++) {
      if (!FS.owned(G, x + k, y)) return fail('Sijoita kone omalle maallesi.');
      var j = FS.idx(x + k, y), o = G.obj[j];
      if (G.terrain[j] === T.WATER || !(o === O.NONE || o === O.PAVED || o === O.DIRT_ROAD)) return fail('Kone tarvitsee vapaan ruudun tai tien' + (size > 1 ? ' (2 ruutua).' : '.'));
      if (machineAt(G, x + k, y)) return fail('Paikalla on jo kone.');
    }
    return { ok: true, shed: 0 };
  };

  FS.buyMachine = function (G, type, x, y) {
    var md = FS.MACHINE[type];
    if (G.funds < md.price) return fail('Rahat eivät riitä.');
    if (type === 'duster') {
      if (!FS.townHas(G, 'airport')) return fail('Ruiskutuskone vaatii kaupunkiin lentokentän.');
      FS.spend(G, md.price, 'machines');
      G.machines.push({ id: G.nextId++, type: type, x: -1, y: -1, cond: 100, age: 0, busy: 0, shed: -1 });
      return ok('Ruiskutuskone odottaa kaupungin lentokentällä. Käytä sitä peltoikkunasta.');
    }
    var c = FS.checkMachine(G, type, x, y);
    if (!c.ok) return c;
    FS.spend(G, md.price, 'machines');
    G.machines.push({ id: G.nextId++, type: type, x: x, y: y, cond: 100, age: 0, busy: 0, shed: c.shed });
    return ok(md.name + (c.shed ? ' ajettiin suojaan.' : ' ostettu.'));
  };

  FS.moveMachine = function (G, m, x, y) {
    if (m.busy) return fail('Kone on töissä.');
    var c = FS.checkMachine(G, m.type, x, y);
    if (!c.ok) {
      // Siirto samaan kohtaan tai osittain itsensä päälle sallitaan
      return c;
    }
    m.x = x; m.y = y; m.shed = c.shed;
    if (c.shed) { var b = G.buildings[c.shed]; m.x = b.x; m.y = b.y; }
    return ok(c.shed ? 'Kone ajettiin suojaan.' : 'Kone siirretty.');
  };

  FS.sellMachine = function (G, m) {
    if (m.busy) return fail('Kone on töissä.');
    var v = FS.machineValue(m);
    FS.earn(G, v, 'machines');
    G.machines = G.machines.filter(function (x) { return x !== m; });
    return ok(FS.MACHINE[m.type].name + ' myyty: ' + FS.money(v) + '.');
  };

  /* ---------- Eläimet ---------- */

  FS.buyAnimal = function (G, type, fem, x, y) {
    var ad = FS.ANIMAL[type];
    if (G.funds < ad.price) return fail('Rahat eivät riitä.');
    if (!FS.animalPassable(G, x, y)) return fail('Sijoita eläin omalle maalle vapaaseen kohtaan (mieluiten aitaukseen).');
    FS.spend(G, ad.price, 'animals');
    G.regionDirty = true;
    FS.addAnimal(G, type, fem, x, y, 0.75);
    return ok(ad.name + ' (' + (fem ? 'naaras' : 'uros') + ') ostettu.');
  };

  FS.sellAnimal = function (G, a) {
    var v = FS.animalValue(a);
    FS.earn(G, v, 'animals');
    G.animals = G.animals.filter(function (x) { return x !== a; });
    return ok(FS.ANIMAL[a.type].name + ' myyty: ' + FS.money(v) + '.');
  };

  /* ---------- Tarvikkeet ---------- */

  FS.buySeeds = function (G, cropId, n) {
    var cost = FS.seedPrice(G, cropId) * n;
    if (G.funds < cost) return fail('Rahat eivät riitä.');
    FS.spend(G, cost, 'seed');
    G.seeds[cropId] = (G.seeds[cropId] || 0) + n;
    return ok(n + ' säkkiä siemeniä: ' + FS.CROP[cropId].name + ' (' + FS.money(cost) + ').');
  };
  FS.SPRAY_STOCK_PRICE = 160;
  FS.buySpray = function (G, s, n) {
    var cost = FS.SPRAY_STOCK_PRICE * n;
    if (G.funds < cost) return fail('Rahat eivät riitä.');
    FS.spend(G, cost, 'chem');
    G.sprays[s] = (G.sprays[s] || 0) + n;
    return ok(n + ' × ' + FS.SPRAY[s].name.toLowerCase() + ' varastoon.');
  };

  /* ---------- Maa ---------- */

  FS.buyPlot = function (G, p) {
    var pl = G.plots[p];
    if (pl.owner === 1) return fail('Omistat jo tämän tontin.');
    if (pl.owner === 2) return fail('Kaupungin maata ei myydä.');
    var v = FS.plotValue(G, p);
    if (G.funds < v) return fail('Rahat eivät riitä (' + FS.money(v) + ').');
    FS.spend(G, v, 'land');
    pl.owner = 1;
    G.regionDirty = true;
    return ok('Tontti ostettu: ' + FS.money(v) + '.');
  };

  function plotTiles(p, fn) {
    var px = (p % FS.PLOTS) * FS.PLOT, py = Math.floor(p / FS.PLOTS) * FS.PLOT;
    for (var y = 0; y < FS.PLOT; y++) for (var x = 0; x < FS.PLOT; x++) fn(px + x, py + y);
  }

  FS.sellPlot = function (G, p) {
    var pl = G.plots[p];
    if (pl.owner !== 1) return fail('Et omista tätä tonttia.');
    if (p === G.homePlot.y * FS.PLOTS + G.homePlot.x) return fail('Kotitilan tonttia ei voi myydä.');
    var blocked = false;
    plotTiles(p, function (x, y) {
      var o = G.obj[FS.idx(x, y)];
      if ([O.NONE, O.ROCK, O.TREE, O.BUSH].indexOf(o) < 0 && !(o === O.BRIDGE && (G.flag[FS.idx(x, y)] & 4))) blocked = true;
      if (machineAt(G, x, y) || G.animals.some(function (a) { return a.x === x && a.y === y; })) blocked = true;
    });
    if (blocked) return fail('Tontin pitää olla tyhjä: ei peltoja, rakennuksia, teitä, aitoja, ojia, koneita eikä eläimiä.');
    var v = FS.plotValue(G, p);
    FS.earn(G, v, 'land');
    pl.owner = 0;
    G.regionDirty = true;
    return ok('Tontti myyty: ' + FS.money(v) + '.');
  };

  FS.forceSellPlot = function (G, p) {
    plotTiles(p, function (x, y) {
      var i = FS.idx(x, y), o = G.obj[i];
      if (o === O.FIELD && G.fields[G.ref[i]]) FS.removeField(G, G.fields[G.ref[i]], true);
      else if (o === O.BUILDING && G.buildings[G.ref[i]] && G.ref[i] !== 1) FS.removeBuilding(G, G.buildings[G.ref[i]], true);
      else if ([O.PAVED, O.DIRT_ROAD, O.FENCE, O.GATE, O.DITCH, O.VALVE, O.FEED, O.TROUGH].indexOf(o) >= 0) { G.obj[i] = O.NONE; delete G.feeds[i]; delete G.troughs[i]; }
    });
    G.machines = G.machines.filter(function (m) { return m.shed || FS.plotOf(m.x, m.y) !== p; });
    G.animals = G.animals.filter(function (a) { return FS.plotOf(a.x, a.y) !== p; });
    var v = FS.plotValue(G, p);
    FS.earn(G, Math.round(v * 0.7), 'land');
    G.plots[p].owner = 0;
    G.regionDirty = true; G.waterDirty = true;
  };
})();
