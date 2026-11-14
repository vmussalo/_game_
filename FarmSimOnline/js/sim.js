/* FarmSim Online – simulaation ydin: pelitila, sää, pellot, koneet ja työt, markkinat.
 * Simulaatio etenee päivä kerrallaan (FS.stepDay). Sama koodi ajaa sekä normaalin pelin että idle-ajan. */
'use strict';
(function () {
  var FS = window.FS, O = FS.O, T = FS.T, N = FS.MAP;

  /* ---------- Uusi peli ---------- */

  FS.newGame = function (opts) {
    var seed = opts.seed || (Math.random() * 4294967295) >>> 0;
    var w = FS.generateWorld({ region: opts.region, river: opts.river, lake: opts.lake, seed: seed });
    var G = {
      v: 1, seed: seed, region: opts.region, farmName: opts.farmName || 'Tila',
      rng: seed ^ 0x9e3779b9, day: 0, funds: FS.START_FUNDS,
      terrain: w.terrain, obj: w.obj, ref: w.ref, flag: w.flag, plots: w.plots,
      home: w.home, homePlot: w.homePlot, townOrigin: w.townOrigin,
      fields: {}, buildings: {}, machines: [], animals: [], feeds: {}, troughs: {},
      nextId: 2, seeds: {}, sprays: { fert: 0, pest: 0, herb: 0, fung: 0 }, silo: [],
      jobQueue: [], market: {}, interest: 0.08, loans: [],
      weather: null, disaster: null, fx: [],
      town: { plots: [w.townOrigin], types: {}, vote: null, taxes: 0 },
      year: FS.emptyYear(), history: [], evalPending: null,
      options: { autoBuy: true, autoLease: true, autoDoze: true, messages: true, disasters: true },
      homeLevel: 0, idle: { eff: 0.5 }, msgs: [], msgSeq: 0, gameOver: false,
      stats: { harvests: 0, best: 0, started: Date.now() }
    };
    G.buildings[1] = { id: 1, type: 'home', x: w.home.x, y: w.home.y, w: 4, h: 4 };
    G.town.types[w.townOrigin] = 'center';
    FS.paintTownPlot(G, w.townOrigin);
    var r = new FS.Rng(seed + 7);
    FS.CROPS.forEach(function (c) {
      var p = c.price * r.range(0.9, 1.1);
      G.market[c.id] = { p: p, hist: [], peak: r.int(0, 51), sat: 0, shock: 0 };
      for (var k = 0; k < 30; k++) G.market[c.id].hist.push(Math.round(p * r.range(0.93, 1.07)));
    });
    G._rng = new FS.Rng(G.rng);
    FS.initWeather(G);
    FS.prepare(G);
    FS.msg(G, 'Tervetuloa tilallesi! Aloita kylvämällä pelto: valitse KYLVÄ ja klikkaa omalle maalle.', 'good');
    return G;
  };

  FS.emptyYear = function () {
    return {
      inc: { crops: 0, futures: 0, animals: 0, machines: 0, land: 0, prizes: 0 },
      exp: { seed: 0, planting: 0, machines: 0, land: 0, buildings: 0, animals: 0, feed: 0, chem: 0, interest: 0, lease: 0, tax: 0, misc: 0, wages: 0, labor: 0 },
      harvests: 0, quality: 0, startWorth: 0
    };
  };

  /** Ajonaikaiset apurakenteet (ei tallenneta). */
  FS.prepare = function (G) {
    G._rng = new FS.Rng(G.rng);
    G.waterDirty = true;
    G.regionDirty = true;
    FS.computeWater(G);
    if (!G.year.startWorth) G.year.startWorth = FS.netWorth(G);
  };

  FS.rand = function (G) { var v = G._rng.next(); G.rng = G._rng.s; return v; };
  FS.gauss = function (G) { var v = G._rng.gauss(); G.rng = G._rng.s; return v; };
  FS.chance = function (G, p) { return FS.rand(G) < p; };

  FS.msg = function (G, text, type, at) {
    var m = { id: ++G.msgSeq, day: G.day, text: text, type: type || 'info', at: at || null };
    G.msgs.push(m);
    if (G.msgs.length > 80) G.msgs.splice(0, G.msgs.length - 80);
    if (G._idle) G._idle.log.push(m);
    if (FS.onMessage && !G._idle) FS.onMessage(m);
    return m;
  };

  FS.spend = function (G, amount, cat) {
    if (amount <= 0) return;
    G.funds -= amount;
    G.year.exp[cat] = (G.year.exp[cat] || 0) + amount;
    if (G._idle) G._idle.spent += amount;
  };
  FS.earn = function (G, amount, cat) {
    if (amount <= 0) return;
    G.funds += amount;
    G.year.inc[cat] = (G.year.inc[cat] || 0) + amount;
    if (G._idle) G._idle.earned += amount;
  };

  /* ---------- Sää ---------- */

  function normalFor(region, doy) {
    var m = doy / (364 / 12) - 0.5, i0 = (Math.floor(m) + 12) % 12, i1 = (i0 + 1) % 12, t = m - Math.floor(m);
    return { t: FS.lerp(region.t[i0], region.t[i1], t), r: FS.lerp(region.r[i0], region.r[i1], t) };
  }

  function genDay(G, day) {
    var region = FS.REGION[G.region], d = FS.dateOf(day), nm = normalFor(region, d.doy), W = G.weather;
    W.anom = W.anom * 0.82 + FS.gauss(G) * 3.4;
    var dis = G.disaster && G.disaster.daysLeft > 0 ? G.disaster.id : null;
    var T0 = nm.t + W.anom + (dis === 'drought' ? 7 : 0) + (dis === 'frost' ? -24 : 0);
    var p = nm.r / 30.3;
    if (dis === 'drought') p *= 0.08;
    if (dis === 'flood') p = Math.min(0.95, p * 2.5 + 0.3);
    var sky, rain = FS.rand(G) < p;
    if (rain) sky = T0 < 33 ? 'snow' : 'rain';
    else { var s = FS.rand(G); sky = s < 0.45 - p * 0.3 ? 'sun' : s < 0.78 ? 'partly' : 'cloudy'; }
    var wind = Math.max(0, region.wind + FS.gauss(G) * 4 + (dis === 'windstorm' ? 26 : 0) + (sky === 'rain' ? 2 : 0));
    return { day: day, T: T0, sky: sky, wind: wind };
  }

  FS._genDay = genDay;

  FS.initWeather = function (G) {
    var region = FS.REGION[G.region];
    G.weather = { anom: 0, queue: [], T: 50, sky: 'sun', wind: region.wind, table: 5, rainYear: 0, evap: 0 };
    for (var k = 0; k < 6; k++) G.weather.queue.push(genDay(G, G.day + k));
    applyToday(G);
  };

  function applyToday(G) {
    var W = G.weather, today = W.queue[0];
    W.T = today.T; W.sky = today.sky; W.wind = today.wind;
    var skyF = { sun: 1, partly: 0.8, cloudy: 0.5, rain: 0.1, snow: 0 }[W.sky];
    W.evap = skyF * (0.1 + Math.max(0, W.T - 40) * 0.009 + W.wind * 0.01);
  }

  function weatherDay(G) {
    var W = G.weather, region = FS.REGION[G.region];
    W.queue.shift();
    W.queue.push(genDay(G, G.day + 5));
    applyToday(G);
    if (W.sky === 'rain') W.rainYear += 1;
    var nm = normalFor(region, FS.dateOf(G.day).doy);
    var normal = 2 + nm.r / 18 * 6;
    W.table += (W.sky === 'rain' ? 0.12 : 0) - W.evap * 0.05 + (normal - W.table) * 0.02;
    W.table = FS.clamp(W.table, 0, 9);
  }
  FS.groundwater = function (G, plotIdx) { return FS.clamp(G.weather.table + G.plots[plotIdx].gw, 0, 9); };

  /** Onko kylvökausi sopiva: alueen normaalilämpö ei laske hallarajalle kasvun alkupuoliskolla. */
  FS.seasonOk = function (G, cropId, day) {
    var c = FS.CROP[cropId];
    if (c.temp.t === 'chill') return true;
    var region = FS.REGION[G.region], d0 = (day === undefined ? G.day : day);
    var span = Math.min(c.days, 70);
    for (var k = 0; k <= span; k += 7) {
      var nm = normalFor(region, FS.dateOf(d0 + k).doy);
      if (nm.t < 40) return false;
    }
    return true;
  };

  /* ---------- Pellot ---------- */

  FS.newField = function (G, x, y, cropId) {
    var id = G.nextId++, p = G.plots[FS.plotOf(x + 4, y + 4)];
    var f = {
      id: id, x: x, y: y, crop: null, next: cropId, repeat: true, state: 'wait', wait: 7, prog: 0, health: 100,
      moist: FS.groundwater(G, FS.plotOf(x + 4, y + 4)), nutr: p.nutr, tox: p.tox, weeds: p.weeds, pests: p.pests, disease: p.disease,
      chill: 0, est: false, job: null, contract: null, harvests: 0, lastValue: 0, wb: 0, dw: 0, dd: 0, planted: -1
    };
    G.fields[id] = f;
    for (var yy = 0; yy < FS.FIELD; yy++) for (var xx = 0; xx < FS.FIELD; xx++) {
      var i = FS.idx(x + xx, y + yy);
      G.obj[i] = O.FIELD; G.ref[i] = id; G.terrain[i] = T.GRASS;
    }
    FS.updateFieldEnv(G, f);
    G.regionDirty = true;
    return f;
  };

  FS.updateFieldEnv = function (G, f) {
    f.wb = FS.fieldWindbreak(G, f);
    var d = FS.fieldDitches(G, f);
    f.dw = d.wet; f.dd = d.dry;
    f.road = false;
    for (var k = -1; k <= FS.FIELD && !f.road; k++) {
      [[f.x + k, f.y - 1], [f.x + k, f.y + FS.FIELD], [f.x - 1, f.y + k], [f.x + FS.FIELD, f.y + k]].forEach(function (c) {
        if (!FS.inMap(c[0], c[1])) return;
        var o = G.obj[FS.idx(c[0], c[1])];
        if (o === O.PAVED || o === O.DIRT_ROAD || o === O.BRIDGE) f.road = true;
      });
    }
  };

  FS.removeField = function (G, f, toPlot) {
    if (f.job) releaseMachines(G, f.job);
    G.jobQueue = G.jobQueue.filter(function (q) { return q.field !== f.id; });
    if (f.contract) {
      var pen = Math.round(f.contract.price * 0.25);
      FS.spend(G, pen, 'misc');
      FS.msg(G, 'Futuurisopimus purettiin: sopimussakko ' + FS.money(pen) + '.', 'bad');
    }
    if (toPlot !== false) {
      var p = G.plots[FS.plotOf(f.x + 4, f.y + 4)];
      p.nutr = Math.round((p.nutr + f.nutr) / 2); p.tox = Math.round((p.tox + f.tox) / 2);
      p.weeds = Math.round((p.weeds + f.weeds) / 2); p.pests = Math.round((p.pests + f.pests) / 2); p.disease = Math.round((p.disease + f.disease) / 2);
    }
    for (var yy = 0; yy < FS.FIELD; yy++) for (var xx = 0; xx < FS.FIELD; xx++) {
      var i = FS.idx(f.x + xx, f.y + yy);
      if (G.ref[i] === f.id && G.obj[i] === O.FIELD) { G.obj[i] = O.NONE; G.ref[i] = 0; G.terrain[i] = T.DIRT; }
    }
    delete G.fields[f.id];
    G.regionDirty = true;
  };

  function managerSkill(G) { return G._idle ? G._idle.skill : 0; }

  function fieldDay(G, f) {
    var W = G.weather, plot = FS.plotOf(f.x + 4, f.y + 4);
    var crop = f.crop ? FS.CROP[f.crop] : null;
    var growing = f.state === 'growing' || f.state === 'ready';
    // Kosteus
    var m = f.moist;
    if (W.sky === 'rain') m += 0.8; else if (W.sky === 'snow') m += 0.25;
    m -= W.evap;
    m += (FS.groundwater(G, plot) - m) * 0.06;
    var irr = f.dw;
    if (irr > 0 && G._idle && managerSkill(G) >= 2 && crop && m > crop.moist + 1.5) irr = 0; // hoitaja sulkee venttiilit
    m += irr * 0.9 * (1 - m / 12.5);
    if (f.dd > 0 && m > 5) m -= f.dd * 0.6;
    if (m > 8.5) m -= (m - 8.5) * 0.2; // luontainen valunta
    if (G.disaster && G.disaster.id === 'flood' && G.disaster.daysLeft > 0 && G.disaster.near && G.disaster.near[f.id]) m = 11;
    f.moist = FS.clamp(m, 0, 11);

    // Tuuli vie pintamaata, jos tuulensuoja puuttuu
    if (W.wind > 17 && f.wb < 8) f.nutr -= (W.wind - 17) * 0.06;
    f.tox = Math.max(0, f.tox - 0.07);

    if (f.state === 'dead') {
      f.deadDays = (f.deadDays || 0) + 1;
      if (f.deadDays >= 14) {
        f.crop = null; f.prog = 0; f.deadDays = 0;
        if (f.repeat && f.next && !FS.CROP[f.next].perennial) { f.state = 'wait'; f.wait = 1; f.auto = true; } else f.state = 'fallow';
      }
    }
    if (!growing || !crop) {
      f.weeds = Math.min(100, f.weeds + 0.25);
      f.nutr = Math.min(100, f.nutr + 0.07);
      f.pests = Math.max(0, f.pests - 0.2);
      f.disease = Math.max(0, f.disease - 0.2);
      f.nutr = FS.clamp(f.nutr, 0, 100);
      return;
    }

    var stress = 0, Tm = W.T;
    // Kasvunopeus lämpötilan mukaan
    var tf;
    if (crop.temp.t === 'dd') tf = FS.clamp(0.3 + 0.7 * (Tm - 40) / Math.max(5, crop.idealT - 40), 0.15, 1.3);
    else if (crop.temp.t === 'nofreeze') tf = FS.clamp((Tm - 34) / 28, 0.2, 1.15);
    else tf = 1;
    if (Tm > crop.idealT + 24) stress += 0.4;
    if (crop.temp.t === 'chill' && Tm < 50) f.chill += 50 - Tm;
    // Halla
    var tmin = Tm - 9;
    if (crop.temp.t !== 'chill' && tmin < 30 && f.state === 'growing') {
      var dmg = (30 - tmin) * (crop.temp.t === 'nofreeze' ? 2.2 : 1.4);
      stress += dmg;
      if (dmg > 12 && FS.chance(G, 0.3)) FS.msg(G, 'Halla vaurioittaa peltoa (' + crop.name + ').', 'bad', { x: f.x + 4, y: f.y + 4 });
    }
    // Vesi
    var dev = Math.abs(f.moist - crop.moist);
    if (dev > 2.5) stress += Math.min(2, (dev - 2.5) * 0.3);
    // Ravinteet
    f.nutr += crop.nutr / (crop.perennial && f.est ? crop.regrowDays : crop.days);
    if (f.nutr < 30) stress += (30 - f.nutr) * 0.03;
    // Rikat, tuholaiset, taudit
    var res = crop.res;
    f.weeds = Math.min(100, f.weeds + 0.22 * (res[1] ? 1 : 2));
    f.pests = FS.clamp(f.pests + Math.max(-0.2, (Tm - 52) * 0.006) * (res[0] ? 1 : 2), 0, 100);
    if (f.moist > 7 && Tm > 55) f.disease = Math.min(100, f.disease + 0.35 * (res[2] ? 1 : 2));
    else f.disease = Math.max(0, f.disease - 0.1);
    if (f.weeds > 40) stress += (f.weeds - 40) * 0.012;
    if (f.pests > 40) stress += (f.pests - 40) * 0.015;
    if (f.disease > 40) stress += (f.disease - 40) * 0.015;
    if (f.tox > 50) stress += (f.tox - 50) * 0.02;
    f.nutr = FS.clamp(f.nutr, 0, 100);

    if (crop.perennial && f.est) stress *= 0.6; // vakiintuneilla puilla on syvät juuret
    f.health += 0.2 - stress; // hyvissä oloissa sato elpyy hitaasti
    if (f.state === 'ready') f.health -= 0.6; // korjaamaton sato pilaantuu
    f.health = FS.clamp(f.health, 0, 100);

    if (f.state === 'growing') {
      var total = crop.perennial && f.est ? crop.regrowDays : crop.days;
      f.prog += tf / total;
      if (f.health <= 0) {
        f.state = 'dead';
        FS.msg(G, 'Pellon sato (' + crop.name + ') tuhoutui.', 'bad', { x: f.x + 4, y: f.y + 4 });
        if (f.contract) { FS.msg(G, 'Futuurisopimus raukesi – ei maksua.', 'bad'); f.contract = null; }
        return;
      }
      if (f.prog >= 1) {
        f.prog = 1; f.state = 'ready';
        queueJob(G, f, crop.hand ? 'hand' : 'harvest');
      }
    }
  }

  /** Sadon laatukerroin (0–1) huomioiden kylmävaatimus. */
  FS.cropQuality = function (f) {
    var crop = FS.CROP[f.crop], q = f.health / 100;
    if (crop && crop.temp.t === 'chill') {
      var need = crop.temp.v[0];
      if (f.chill < need) q *= 0.4 + 0.6 * f.chill / need;
    }
    return FS.clamp(q * Math.min(1, f.prog * 1.05), 0, 1);
  };

  FS.cropPrice = function (G, cropId) {
    var p = G.market[cropId].p;
    if (FS.townHas(G, 'market')) p *= 1.05;
    return p;
  };
  FS.seedPrice = function (G, cropId) {
    var c = FS.CROP[cropId], k = G.market[cropId].p / c.price;
    var p = c.seed * (0.7 + 0.3 * k);
    if (FS.townHas(G, 'shops')) p *= 0.9;
    return Math.round(p);
  };

  /* ---------- Työt ja koneet ---------- */

  function queueJob(G, f, type, spray) {
    if (G.jobQueue.some(function (q) { return q.field === f.id && q.type === type && q.spray === spray; })) return;
    if (f.job && f.job.type === type && f.job.spray === spray) return;
    G.jobQueue.push({ field: f.id, type: type, spray: spray || null, warned: false });
  }
  FS.queueJob = queueJob;

  FS.machineUsable = function (m) { return m.cond >= 20 && !m.busy; };

  function pathRoadShare(G, x0, y0, x1, y1) {
    var len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    if (len === 0) return { len: 0, road: 1 };
    var roads = 0, n = 0, x = x0, y = y0, sx = x1 > x0 ? 1 : -1, sy = y1 > y0 ? 1 : -1;
    while (x !== x1) { x += sx; n++; var o = G.obj[FS.idx(x, y)]; if (o === O.PAVED || o === O.BRIDGE) roads++; else if (o === O.DIRT_ROAD) roads += 0.8; }
    while (y !== y1) { y += sy; n++; var o2 = G.obj[FS.idx(x, y)]; if (o2 === O.PAVED || o2 === O.BRIDGE) roads++; else if (o2 === O.DIRT_ROAD) roads += 0.8; }
    return { len: len, road: roads / n };
  }

  function findMachine(G, type, f) {
    var best = null, bd = 1e9;
    G.machines.forEach(function (m) {
      if (m.type !== type || !FS.machineUsable(m)) return;
      var d = Math.abs(m.x - f.x) + Math.abs(m.y - f.y);
      if (d < bd) { bd = d; best = m; }
    });
    return best;
  }

  function releaseMachines(G, job) {
    (job.mach || []).forEach(function (id) {
      var m = G.machines.find(function (mm) { return mm.id === id; });
      if (m) m.busy = 0;
    });
  }

  /** Yrittää aloittaa jonossa olevan työn. Palauttaa true, jos työ alkoi tai poistui jonosta. */
  function tryStartJob(G, q) {
    var f = G.fields[q.field];
    if (!f) return true;
    if (f.job) return false;
    var spec = FS.JOBS[q.type];
    // Tarvikkeet
    if (q.type === 'plant') {
      var cropId = f.next;
      if (!cropId) return true;
      if (!(G.seeds[cropId] > 0) && !G.options.autoBuy) {
        if (!q.warned) { FS.msg(G, 'Siemeniä (' + FS.CROP[cropId].name + ') ei ole. Osta siemeniä tai kytke AutoOsto päälle.', 'warn', { x: f.x + 4, y: f.y + 4 }); q.warned = true; }
        return false;
      }
    }
    if (q.type === 'spray' && !(G.sprays[q.spray] > 0) && !G.options.autoBuy) {
      if (!q.warned) { FS.msg(G, 'Ruiskutusainetta ei ole varastossa.', 'warn'); q.warned = true; }
      return false;
    }
    var picked = [], lease = 0;
    for (var k = 0; k < spec.needs.length; k++) {
      var m = findMachine(G, spec.needs[k], f);
      if (m) picked.push(m);
      else if (G.options.autoLease) lease += FS.MACHINE[spec.needs[k]].price * FS.LEASE_RATE * (f.road ? 1 : 1.25);
      else {
        if (!q.warned) { FS.msg(G, 'Puuttuu kone: ' + FS.MACHINE[spec.needs[k]].name + ' (' + spec.name.toLowerCase() + '). Osta kone tai kytke AutoVuokraus päälle.', 'warn', { x: f.x + 4, y: f.y + 4 }); q.warned = true; }
        return false;
      }
    }
    // Maksut
    if (q.type === 'plant') {
      var c = FS.CROP[f.next];
      if (G.seeds[f.next] > 0) G.seeds[f.next]--;
      else FS.spend(G, Math.round(FS.seedPrice(G, f.next) * (G._idle && G._idle.skill >= 5 ? 1 : FS.AUTOBUY_MARKUP)), 'seed');
      FS.spend(G, FS.PLANT_COST, 'planting');
      f.crop = c.id; f.state = 'planting';
    }
    if (q.type === 'spray') {
      if (G.sprays[q.spray] > 0) G.sprays[q.spray]--;
      else FS.spend(G, G._idle && G._idle.skill >= 5 ? FS.SPRAY_STOCK_PRICE : FS.SPRAY_COST, 'chem');
    }
    if (q.type === 'hand') FS.spend(G, spec.labor, 'labor');
    if (lease > 0) FS.spend(G, Math.round(lease), 'lease');
    picked.forEach(function (m) {
      m.busy = f.id;
      var pr = pathRoadShare(G, m.x, m.y, f.x, f.y);
      m.cond = Math.max(0, m.cond - (1.2 + pr.len / 45 * (1 - pr.road * 0.75)));
      m.uses = (m.uses || 0) + 1;
    });
    f.job = { type: q.type, spray: q.spray, days: spec.days, total: spec.days, mach: picked.map(function (m) { return m.id; }), leased: lease > 0 };
    return true;
  }

  function finishJob(G, f) {
    var job = f.job;
    releaseMachines(G, job);
    f.job = null;
    if (job.type === 'plant') {
      f.state = 'growing'; f.prog = 0; f.chill = 0; f.est = false; f.planted = G.day;
      var p = G.plots[FS.plotOf(f.x + 4, f.y + 4)];
      f.health = FS.clamp(70 + (f.nutr - 30) * 0.5 - f.tox * 0.2, 40, 100);
      f.weeds *= 0.3; // kyntö kääntää rikat
      void p;
    } else if (job.type === 'spray') {
      applySpray(G, f, job.spray);
    } else {
      harvestField(G, f);
    }
  }

  function applySpray(G, f, s) {
    if (s === 'fert') {
      f.nutr = Math.min(100, f.nutr + 35);
      var c = f.crop && FS.CROP[f.crop];
      if (c && c.ferSens && f.state === 'growing' && f.prog < 0.3) {
        f.health = Math.max(0, f.health - 20);
        FS.msg(G, c.name + ' ei siedä lannoitusta alkuvaiheessa – taimet vaurioituivat.', 'warn', { x: f.x + 4, y: f.y + 4 });
      }
    } else {
      if (s === 'pest') f.pests *= 0.15;
      if (s === 'herb') f.weeds *= 0.15;
      if (s === 'fung') f.disease *= 0.15;
      f.tox = Math.min(100, f.tox + 10);
    }
  }
  FS.applySpray = applySpray;

  FS.siloCapacity = function (G) {
    var cap = 0;
    Object.keys(G.buildings).forEach(function (id) { var b = FS.BUILDING[G.buildings[id].type]; if (b && b.silo) cap += b.silo; });
    return cap;
  };

  function harvestField(G, f) {
    var crop = FS.CROP[f.crop], q = FS.cropQuality(f), price = FS.cropPrice(G, crop.id);
    var where = { x: f.x + 4, y: f.y + 4 };
    f.harvests++; G.stats.harvests++;
    G.year.harvests++; G.year.quality += q;
    if (f.contract) {
      var pay = Math.round(f.contract.price * q);
      FS.earn(G, pay, 'futures');
      FS.msg(G, crop.name + ': sato toimitettiin futuurisopimuksella, ' + FS.money(pay) + ' (laatu ' + FS.grade(q * 100).name.toLowerCase() + ').', 'good', where);
      f.contract = null; f.lastValue = pay;
    } else if (G.silo.length < FS.siloCapacity(G)) {
      G.silo.push({ crop: crop.id, q: q * 100, day: G.day });
      f.lastValue = Math.round(price * q);
      FS.msg(G, crop.name + ': sato siiloon (arvo nyt ' + FS.money(price * q) + ').', 'good', where);
    } else {
      var v = Math.round(price * q);
      FS.earn(G, v, 'crops');
      G.market[crop.id].sat += 0.03;
      f.lastValue = v;
      FS.msg(G, crop.name + ': sato myytiin heti, ' + FS.money(v) + ' (laatu ' + FS.grade(q * 100).name.toLowerCase() + ').', 'good', where);
    }
    G.stats.best = Math.max(G.stats.best, f.lastValue);
    // Seuraava kierros
    if (crop.perennial) {
      f.est = true; f.prog = 0; f.state = 'growing'; f.chill = 0;
      f.health = Math.min(100, f.health + 25);
      if (f.next && f.next !== crop.id) { f.state = 'fallow'; f.crop = null; if (f.repeat) { f.state = 'wait'; f.wait = 3; f.auto = true; } }
    } else {
      f.crop = null; f.prog = 0;
      if (f.repeat && f.next) { f.state = 'wait'; f.wait = 2; f.auto = true; }
      else f.state = 'fallow';
    }
  }

  function jobsDay(G) {
    Object.keys(G.fields).forEach(function (id) {
      var f = G.fields[id];
      if (f.job) { f.job.days--; if (f.job.days <= 0) finishJob(G, f); }
      if (f.state === 'wait') {
        f.wait--;
        if (f.wait <= 0) {
          if (f.auto && f.next && !FS.seasonOk(G, f.next)) { f.wait = 7; f.deferred = true; }
          else { f.state = 'queued'; f.deferred = false; queueJob(G, f, 'plant'); }
        }
      }
    });
    var rest = [];
    G.jobQueue.forEach(function (q) { if (!tryStartJob(G, q)) rest.push(q); });
    G.jobQueue = rest;
  }

  /** Myy siilossa olevan sadon. */
  FS.sellStored = function (G, idx) {
    var s = G.silo[idx];
    if (!s) return 0;
    var v = Math.round(FS.cropPrice(G, s.crop) * s.q / 100);
    FS.earn(G, v, 'crops');
    G.market[s.crop].sat += 0.03;
    G.silo.splice(idx, 1);
    return v;
  };

  function machinesWeek(G) {
    G.machines.forEach(function (m) {
      m.age += 7;
      var life = FS.MACHINE[m.type].life * 7;
      m.cond -= (m.shed ? 0.05 : 0.22) + (m.age > life ? 1.5 : 0);
      m.cond = Math.max(0, m.cond);
      if (m.cond < 20 && !m.warned) { m.warned = true; FS.msg(G, FS.MACHINE[m.type].name + ' on käyttökelvoton. Myy se ja osta uusi.', 'warn', { x: m.x, y: m.y }); }
    });
  }
  FS.machineValue = function (m) { return Math.round(FS.MACHINE[m.type].price * Math.max(0.02, m.cond / 100) * 0.8); };

  /* ---------- Markkinat ---------- */

  function marketWeek(G) {
    var week = FS.dateOf(G.day).week;
    FS.CROPS.forEach(function (c) {
      var mk = G.market[c.id];
      var season = 1 + 0.12 * Math.cos(2 * Math.PI * (week - mk.peak) / 52);
      var target = c.price * season * (1 + mk.shock) * (1 - Math.min(0.4, mk.sat));
      var lp = Math.log(mk.p) + (Math.log(target) - Math.log(mk.p)) * 0.25 + FS.gauss(G) * 0.045;
      mk.p = FS.clamp(Math.exp(lp), c.price * 0.45, c.price * 1.9);
      mk.sat *= 0.85; mk.shock *= 0.8;
      mk.hist.push(Math.round(mk.p));
      if (mk.hist.length > 30) mk.hist.shift();
    });
    G.interest = FS.clamp(G.interest + FS.gauss(G) * 0.003, 0.05, 0.15);
  }

  function siloWeek(G) {
    var T0 = G.weather.T, lost = [];
    G.silo.forEach(function (s) {
      var c = FS.CROP[s.crop], d = T0 < c.store[0] ? c.store[0] - T0 : T0 > c.store[1] ? T0 - c.store[1] : 0;
      if (d > 0) s.q = Math.max(0, s.q - (1 + d * 0.12));
      else s.q = Math.max(0, s.q - 0.15);
    });
    // Silon räjähdys: viljat kuumalla säällä
    if (G.silo.length && T0 > 86 && FS.chance(G, 0.01)) {
      var grains = G.silo.filter(function (s) { return ['barley', 'oats', 'wheat', 'corn', 'sorghum'].indexOf(s.crop) >= 0; });
      if (grains.length) {
        var silos = Object.keys(G.buildings).map(function (k) { return G.buildings[k]; }).filter(function (b) { return FS.BUILDING[b.type] && FS.BUILDING[b.type].silo; });
        var b = silos[Math.floor(FS.rand(G) * silos.length)];
        var cap = FS.BUILDING[b.type].silo, removed = 0;
        G.silo = G.silo.filter(function (s) { if (removed < cap && grains.indexOf(s) >= 0) { removed++; lost.push(s); return false; } return true; });
        FS.removeBuilding(G, b, true);
        G.fx.push({ type: 'boom', x: b.x + b.w / 2, y: b.y + b.h / 2, day: G.day });
        FS.msg(G, 'Pölyräjähdys! Siilo tuhoutui ja ' + removed + ' satoa menetettiin.', 'bad', { x: b.x, y: b.y });
      }
    }
    return lost;
  }

  /* ---------- Päivän askel ---------- */

  FS.stepDay = function (G) {
    if (G.gameOver) return;
    G.day++;
    weatherDay(G);
    FS.computeWater(G);
    var ids = Object.keys(G.fields);
    if (G.day % 7 === 0 || G.envDirty) { ids.forEach(function (id) { FS.updateFieldEnv(G, G.fields[id]); }); G.envDirty = false; }
    else ids.forEach(function (id) { var f = G.fields[id], d = FS.fieldDitches(G, f); f.dw = d.wet; f.dd = d.dry; });
    ids.forEach(function (id) { fieldDay(G, G.fields[id]); });
    jobsDay(G);
    FS.animalsDay(G);
    FS.disasterDay(G);
    if (G._idle) FS.managerDay(G);
    var d = FS.dateOf(G.day);
    if (G.day % 7 === 0) {
      marketWeek(G); siloWeek(G); machinesWeek(G); FS.disasterRoll(G);
      if (G._idle) FS.managerWeek(G);
    }
    if (d.doy % 91 === 0) FS.quarter(G);
    if (d.doy === 0) FS.yearEnd(G);
    FS.solvency(G);
    if (G.fx.length) G.fx = G.fx.filter(function (e) { return G.day - e.day < (e.dur || 4); });
  };
})();
