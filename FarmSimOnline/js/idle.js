/* FarmSim Online – idle-aika eli tilanhoitaja.
 *
 * Kun pelaaja on poissa, tilanhoitaja pyörittää tilaa. Pelaaja valitsee idle-tehon (0 % = tila odottaa):
 *  - teho määrää, kuinka paljon peliaikaa kuluu poissaolotuntia kohden (100 % = FS.IDLE.daysPerHour päivää),
 *  - hoitajan viikkopalkka kasvaa teholla jyrkemmin (eksponentti FS.IDLE.wageExp), joten täysi teho ei aina kannata.
 * Tehon yläraja, laskettavan poissaolon enimmäispituus ja hoitajan taito kasvavat pelin edetessä
 * (kotitilan taso, kaupungin työnvälitys ja maatalouskoulu). */
'use strict';
(function () {
  var FS = window.FS, I = FS.IDLE;

  FS.idleLimits = function (G) {
    var jobs = FS.townHas(G, 'jobs'), school = FS.townHas(G, 'school');
    return {
      max: Math.round((I.baseMax + I.perHomeLevel * G.homeLevel + (jobs ? 0.25 : 0) + (school ? 0.15 : 0)) * 100) / 100,
      hours: I.baseHours + I.hoursPerLevel * G.homeLevel + (jobs ? 6 : 0),
      skill: Math.min(5, 1 + G.homeLevel + (school ? 1 : 0) + (jobs ? 1 : 0))
    };
  };

  FS.SKILLS = [
    'Korjaa ja kylvää aikataulun mukaan, myy sadot hyvään hintaan tai kun siilo täyttyy.',
    'Ruokkii ja juottaa eläimet, säätää kasteluventtiilejä tulvan uhatessa.',
    'Lannoittaa ja ruiskuttaa rikat, tuholaiset ja taudit.',
    'Pikakorjaa kypsyvät sadot hallan ja tornadon alta.',
    'Ostaa siemenet ja ruiskutteet ilman AutoOsto-lisähintaa.'
  ];

  FS.idleEff = function (G) { return FS.clamp(G.idle.eff, 0, FS.idleLimits(G).max); };

  FS.idleWage = function (G, eff) {
    if (eff === undefined) eff = FS.idleEff(G);
    var fields = Object.keys(G.fields).length;
    return Math.round((I.wageBase + I.wagePerField * fields + I.wagePerAnimal * G.animals.length) * Math.pow(eff, I.wageExp));
  };

  /** Ennuste UI:lle: montako peliaikapäivää ja paljonko palkkaa annetulla teholla ja poissaololla. */
  FS.idlePreview = function (G, eff, hours) {
    var L = FS.idleLimits(G);
    var h = Math.min(hours, L.hours), days = Math.floor(h * I.daysPerHour * eff);
    return { days: days, hours: h, wage: Math.round(FS.idleWage(G, eff) * days / 7) };
  };

  /** Ajaa poissaoloajan. awaySec = poissaolo sekunteina. Palauttaa yhteenvedon tai null. */
  FS.runIdle = function (G, awaySec) {
    if (G.gameOver) return null;
    var L = FS.idleLimits(G), eff = FS.idleEff(G);
    var hours = Math.min(awaySec / 3600, L.hours);
    var days = Math.floor(hours * I.daysPerHour * eff);
    if (days < 1) return eff <= 0 ? { days: 0, paused: true, hours: awaySec / 3600 } : null;
    var startFunds = G.funds, startWorth = FS.netWorth(G), startHarv = G.stats.harvests;
    G._idle = { skill: L.skill, eff: eff, log: [], earned: 0, spent: 0, wages: 0, disasters: [], years: [] };
    var t0 = Date.now();
    for (var d = 0; d < days && !G.gameOver; d++) FS.stepDay(G);
    var R = G._idle;
    delete G._idle;
    return {
      days: days, hours: hours, capped: awaySec / 3600 > L.hours, eff: eff, skill: L.skill,
      funds: G.funds - startFunds, worth: FS.netWorth(G) - startWorth, earned: R.earned, spent: R.spent, wages: R.wages,
      harvests: G.stats.harvests - startHarv, disasters: R.disasters, years: R.years,
      log: R.log.filter(function (m) { return m.type !== 'info'; }).slice(-12), ms: Date.now() - t0
    };
  };

  /* ---------- Hoitajan päivittäiset toimet ---------- */

  FS.managerDay = function (G) {
    var S = G._idle.skill;
    // Taso 1: myynnit
    for (var k = G.silo.length - 1; k >= 0; k--) {
      var s = G.silo[k], mk = G.market[s.crop];
      var avg = mk.hist.reduce(function (a, b) { return a + b; }, 0) / mk.hist.length;
      if (mk.p >= avg * 1.06 || s.q < 45) FS.sellStored(G, k);
    }
    if (G.silo.length && G.silo.length >= FS.siloCapacity(G)) FS.sellStored(G, 0);
    var fields = Object.keys(G.fields).map(function (id) { return G.fields[id]; });
    // Taso 2: eläinten ruoka ja vesi
    if (S >= 2 && G.animals.length) {
      if (G.regionDirty || !G._region) FS.computeRegions(G);
      var regions = {};
      G.animals.forEach(function (a) { var r = G._region[FS.idx(a.x, a.y)]; (regions[r] = regions[r] || []).push(a); });
      Object.keys(regions).forEach(function (r) {
        r = Number(r);
        var feed = 0, water = 0, feedTiles = [], troughTiles = [];
        Object.keys(G.feeds).forEach(function (i) { if (G._region[i] === r) { feed += G.feeds[i]; feedTiles.push(Number(i)); } });
        Object.keys(G.troughs).forEach(function (i) { if (G._region[i] === r) { water += G.troughs[i]; troughTiles.push(Number(i)); } });
        if (feed < 0.25) {
          if (feedTiles.length) { G.feeds[feedTiles[0]] = 1; FS.spend(G, FS.FEED_COST, 'feed'); }
          else placeNear(G, regions[r][0], FS.O.FEED);
        }
        if (water < 0.25) {
          if (troughTiles.length) { troughTiles.forEach(function (i) { G.troughs[i] = 1; }); FS.spend(G, 15 * troughTiles.length, 'misc'); }
          else placeNear(G, regions[r][0], FS.O.TROUGH);
        }
      });
    }
    fields.forEach(function (f) {
      var c = f.crop && FS.CROP[f.crop];
      var grow = f.state === 'growing' || f.state === 'ready';
      // Taso 3: lannoitus ja ruiskutukset
      if (S >= 3 && grow && !f.job) {
        if (f.nutr < 28 && !(c && c.ferSens && f.prog < 0.3)) FS.queueJob(G, f, 'spray', 'fert');
        if (f.weeds > 55) FS.queueJob(G, f, 'spray', 'herb');
        if (f.pests > 55) FS.queueJob(G, f, 'spray', 'pest');
        if (f.disease > 55) FS.queueJob(G, f, 'spray', 'fung');
      }
      // Taso 4: pikakorjuu hallan alta
      if (S >= 4 && f.state === 'growing' && c && c.temp.t !== 'chill' && f.prog > 0.75) {
        var cold = G.weather.queue.slice(0, 3).some(function (d) { return d.T - 9 < 26; });
        var D = G.disaster;
        if (cold || (D && D.id === 'locusts' && Math.hypot(f.x + 4 - D.x, f.y + 4 - D.y) < 16)) FS.harvestNow(G, f);
      }
    });
  };

  function placeNear(G, a, type) {
    for (var r = 1; r < 6; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var x = a.x + dx, y = a.y + dy;
      if (!FS.owned(G, x, y)) continue;
      var i = FS.idx(x, y);
      if (G.obj[i] !== FS.O.NONE || G.terrain[i] === FS.T.WATER || G._region[i] !== G._region[FS.idx(a.x, a.y)]) continue;
      G.obj[i] = type;
      if (type === FS.O.FEED) { G.feeds[i] = 1; FS.spend(G, FS.FEED_COST, 'feed'); }
      else { G.troughs[i] = 1; FS.spend(G, 15, 'misc'); }
      return;
    }
  }

  FS.managerWeek = function (G) {
    var w = FS.idleWage(G, G._idle.eff);
    FS.spend(G, w, 'wages');
    G._idle.wages += w;
  };
})();
