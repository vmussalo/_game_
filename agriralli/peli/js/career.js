/* AgriRalli – urapeli: kuskit, kisatarjoukset, palkinnot, kauppa, lainahai ja tallennus */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const C = AR.Career = { KEY: 'agriralli.ura.v1' };

  const baseUp = () => ({ engine: 0, tires: 0, armor: 0, gun: 1, ram: 0 });

  C.create = function (name) {
    const n = AR.TEXTS.dystopia.drivers.length;
    const skills = [];
    for (let i = 0; i < n; i++) skills.push(U.clamp(0.25 + (i / (n - 1)) * 0.68 + U.rand(-0.04, 0.04), 0.2, 0.95));
    const cols = U.shuffle(AR.COLORS.slice());
    const drivers = U.shuffle(skills).map((s, i) => ({
      n: i, color: cols[i % cols.length], skill: s, aggr: U.clamp(0.25 + s * 0.6 + U.rand(-0.15, 0.15), 0.2, 0.95),
      points: Math.round(s * s * 40 + U.rand(0, 6)), vt: 0, lv: 0
    }));
    const c = {
      v: 1, name: (name || '').trim().slice(0, 18) || 'Nimetön', day: 1, cash: AR.START_CASH,
      vi: 0, up: baseUp(), spent: 0, hpFrac: 1, ammo: 60, mines: 0, turbo: 0,
      points: 0, debt: 0, debtDue: 0, drivers, boss: { points: 60 }, offers: [], won: false, finalSeen: false,
      body: { bust: 3, hips: 3, tone: 3, outfit: 1, hair: 'blonde', hairStyle: 'ponytail', gender: 'f' },
      beachUnlocked: false, beachActive: false,
      stats: { races: 0, wins: 0, kills: 0, earned: 0 }
    };
    C.updateDrivers(c);
    C.genOffers(c);
    return c;
  };

  C.load = () => {
    const c = U.store.get(C.KEY, null);
    if (!c || c.v !== 1 || !Array.isArray(c.drivers)) return null;
    if (!c.body) c.body = { bust: 3, hips: 3, tone: 3, outfit: 1, hair: 'blonde', hairStyle: 'ponytail', gender: 'f' };
    if (c.beachUnlocked === undefined) {
      c.beachUnlocked = (c.points >= AR.BEACH_MOD.pointsReq || (c.stats && c.stats.races >= AR.BEACH_MOD.racesReq));
      c.beachActive = !!c.beachUnlocked;
    }
    return c;
  };
  C.save = c => U.store.set(C.KEY, c);
  C.clear = () => U.store.del(C.KEY);

  C.driverName = d => (AR.T.drivers[d.n] || ('Kuski ' + d.n));

  C.updateDrivers = function (c) {
    for (const d of c.drivers) {
      // helppo sarja pysyy kevyillä koneilla, huippukuskit nousevat järeimpiin noin 40 päivässä
      const g = c.day / 40;
      d.vt = U.clamp(Math.round(d.skill * 3 - 0.6 + g * (d.skill - 0.2) * 4.8), 0, 6);
      d.lv = U.clamp(Math.floor(d.skill * 2.4 - 0.3 + g * d.skill * 2.6), 0, 5);
    }
  };

  // sarjataulukko: kaikki kuskit, pelaaja ja pomo
  C.standings = function (c) {
    const list = c.drivers.map((d, i) => ({ id: i, name: C.driverName(d), points: d.points, color: d.color, vi: d.vt }));
    list.push({ id: 'boss', name: AR.T.boss, points: c.boss.points, color: AR.BOSS_COLOR, vi: 6, boss: true });
    list.push({ id: 'p', name: c.name, points: c.points, color: AR.PLAYER_COLOR, vi: c.vi, me: true });
    list.sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
    return list;
  };
  C.rank = c => C.standings(c).findIndex(e => e.me) + 1;

  C.genOffers = function (c) {
    const ranked = c.drivers.map((d, i) => i).sort((a, b) => c.drivers[b].points - c.drivers[a].points);
    const tiers = [ranked.slice(10), ranked.slice(5, 10), ranked.slice(0, 5)];
    const tracks = U.shuffle(AR.TRACKS.map((t, i) => i).filter(i => i !== AR.FINAL_TRACK));
    c.offers = [0, 1, 2].map(d => ({ diff: d, track: tracks[d], opp: U.shuffle(tiers[d].slice()).slice(0, 3), sab: -1 }));
    if (C.rank(c) === 1) c.offers.push({ diff: 3, track: AR.FINAL_TRACK, opp: ['boss', ranked[0], ranked[1]], sab: -1, final: true });
  };

  C.laps = function (offer) {
    const tr = AR.Track.build(offer.track);
    return U.clamp(Math.round(AR.DIFF[offer.diff].dist / tr.L), 2, 7);
  };

  function aiEntrant(c, id, sab) {
    if (id === 'boss') {
      const bProf = (AR.Portraits && AR.Portraits.getDriver) ? AR.Portraits.getDriver('boss', AR.themeId) : null;
      return { name: AR.T.boss, color: AR.BOSS_COLOR, vi: 6, up: { engine: 4, tires: 4, armor: 5, gun: 4, ram: 3 }, hpFrac: 1,
        ammo: 250, mines: 5, turbo: 6, skill: 0.92, aggr: 0.9, hate: true, driverId: 'boss',
        driverVisual: bProf, beach: !!c.beachActive };
    }
    const d = c.drivers[id], lv = d.lv;
    const prof = (AR.Portraits && AR.Portraits.getDriver) ? AR.Portraits.getDriver(d.n, AR.themeId) : null;
    return {
      name: C.driverName(d), color: d.color, vi: d.vt,
      up: { engine: lv, tires: lv, armor: lv, gun: Math.max(1, lv), ram: Math.min(3, lv >> 1) },
      hpFrac: sab ? 0.5 : 1, ammo: 40 + lv * 25, mines: lv >= 2 ? lv - 1 : 0, turbo: lv * 0.8,
      skill: d.skill, aggr: d.aggr, driverId: id,
      driverVisual: Object.assign({}, prof, { outfit: lv >= 4 ? 3 : (lv >= 2 ? 2 : 1) }),
      beach: !!c.beachActive
    };
  }

  C.entrants = function (c, offer) {
    const list = offer.opp.map(id => aiEntrant(c, id, offer.sab === id));
    // pelaajan lähtöruutu arvotaan (finaalissa aina viimeinen)
    list.splice(offer.final ? 2 : U.irand(1, list.length), 0, {
      name: c.name, color: AR.PLAYER_COLOR, vi: c.vi, up: c.up, hpFrac: c.hpFrac,
      ammo: c.ammo, mines: c.mines, turbo: c.turbo, isPlayer: true, driverId: 'p',
      body: c.body, beach: !!c.beachActive
    });
    return list;
  };

  C.applyResult = function (c, offer, results) {
    const D = AR.DIFF[offer.diff];
    const me = results.find(r => r.isPlayer);
    const place = me.place;
    const prize = me.wrecked ? 0 : (D.prize[place - 1] || 0);
    const bounty = me.kills * D.kill;
    const pts = me.wrecked ? 0 : (D.pts[place - 1] || 0);
    const stBefore = C.stats(c);
    const cashBonus = me.wrecked ? 0 : Math.round((prize + bounty) * (stBefore.cashBonus || 0));
    const total = prize + bounty + me.cash + cashBonus;
    c.cash += total;
    c.points += pts;
    c.hpFrac = me.wrecked ? 0 : U.clamp(me.hpFrac, 0, 1);
    c.ammo = me.ammo; c.mines = me.mines; c.turbo = Math.round(me.turbo * 10) / 10;
    c.stats.races++; c.stats.kills += me.kills; c.stats.earned += total;
    if (place === 1 && !me.wrecked) c.stats.wins++;
    for (const r of results) {
      if (r.isPlayer || r.wrecked) continue;
      const p = D.pts[r.place - 1] || 0;
      if (r.driverId === 'boss') c.boss.points += p;
      else if (c.drivers[r.driverId]) c.drivers[r.driverId].points += p;
    }
    const ending = !!offer.final && place === 1 && !me.wrecked && !c.won;
    if (ending) c.won = true;
    const raced = new Set(results.map(r => r.driverId));
    const events = C.nextDay(c, raced);
    C.save(c);
    return { place, prize, bounty, cash: me.cash, cashBonus, pts, total, wrecked: me.wrecked, kills: me.kills, ending, events, forfeit: !!me.forfeit };
  };

  C.nextDay = function (c, raced) {
    const ev = [];
    c.day++;
    const st = C.standings(c).filter(e => typeof e.id === 'number');
    st.forEach((e, i) => {
      if (raced.has(e.id)) return;
      const d = c.drivers[e.id], tier = i < 5 ? 2 : i < 10 ? 1 : 0;
      if (Math.random() < 0.6) d.points += Math.round(Math.pow(d.skill, 1.5) * (1 + tier * 2) * U.rand(0.5, 1.5));
    });
    if (!raced.has('boss')) c.boss.points += U.irand(0, 3);
    if (!c.beachUnlocked && (c.points >= AR.BEACH_MOD.pointsReq || c.stats.races >= AR.BEACH_MOD.racesReq)) {
      c.beachUnlocked = true;
      c.beachActive = true;
      ev.push({ t: 'beach', text: AR.T.ui.beachUnlockedToast });
    }
    if (c.debt > 0) {
      c.debt = Math.round(c.debt * (1 + AR.LOAN.rate));
      if (c.day > c.debtDue) {
        // perijät
        c.hpFrac = Math.min(c.hpFrac, 0.4);
        const keys = AR.UPG_KEYS.filter(k => c.up[k] > (k === 'gun' ? 1 : 0));
        if (keys.length) { const k = U.pick(keys); c.up[k]--; }
        c.debt = Math.round(c.debt * 1.25);
        c.debtDue = c.day + 5;
        ev.push({ t: 'goons', text: AR.T.shark.goons });
      } else if (c.debtDue - c.day <= 2) ev.push({ t: 'shark', text: U.fill(AR.T.comment.shark, { d: c.debtDue - c.day }) });
    }
    C.updateDrivers(c);
    C.genOffers(c);
    return ev;
  };

  // ---------- kauppa ----------
  const fail = msg => ({ ok: false, msg });
  const ok = msg => ({ ok: true, msg });

  C.stats = c => AR.buildStats(c.vi, c.up, c.body);

  C.upgradeCost = (c, key) => {
    const lv = c.up[key] | 0;
    if (lv >= AR.UPG[key].max) return null;
    return AR.upgPrice(c.vi, key, lv + 1);
  };
  C.buyUpgrade = function (c, key) {
    const cost = C.upgradeCost(c, key);
    if (cost == null) return fail(AR.T.ui.maxed);
    if (c.cash < cost) return fail(AR.T.ui.notEnough);
    const before = C.stats(c).hp;
    c.cash -= cost; c.spent += cost; c.up[key]++;
    if (key === 'armor') { const after = C.stats(c).hp; c.hpFrac = U.clamp((c.hpFrac * before + (after - before)) / after, 0, 1); }
    C.save(c);
    return ok();
  };

  C.consCost = (c, key) => AR.CONS[key].price(c.vi);
  C.consMax = (c, key) => AR.CONS[key].max(c.vi);
  C.buyCons = function (c, key) {
    const K = AR.CONS[key], cur = c[key], max = K.max(c.vi);
    if (cur >= max) return fail(AR.T.ui.maxed);
    const cost = K.price(c.vi);
    if (c.cash < cost) return fail(AR.T.ui.notEnough);
    c.cash -= cost; c[key] = Math.min(max, cur + K.add);
    C.save(c);
    return ok();
  };

  C.repairCost = c => Math.ceil((1 - c.hpFrac) * C.stats(c).hp * AR.repairPerHp(c.vi));
  C.repair = function (c) {
    const cost = C.repairCost(c);
    if (cost <= 0) return fail(AR.T.ui.maxed);
    if (c.cash >= cost) { c.cash -= cost; c.hpFrac = 1; C.save(c); return ok(); }
    // osittainen korjaus sillä rahalla, mitä on
    if (c.cash <= 0) return fail(AR.T.ui.notEnough);
    c.hpFrac = Math.min(1, c.hpFrac + c.cash / (C.stats(c).hp * AR.repairPerHp(c.vi)));
    c.cash = 0; C.save(c);
    return ok();
  };
  C.canTape = c => c.hpFrac < 0.35;
  C.tape = function (c) { if (!C.canTape(c)) return fail(); c.hpFrac = 0.35; C.save(c); return ok(); };

  C.tradeIn = c => Math.round((AR.VEH[c.vi].price + c.spent) * 0.5);
  C.vehCost = (c, vi) => AR.VEH[vi].price - C.tradeIn(c);
  C.buyVehicle = function (c, vi) {
    if (vi === c.vi) return fail();
    const cost = C.vehCost(c, vi);
    if (c.cash < cost) return fail(AR.T.ui.notEnough);
    c.cash -= cost; c.vi = vi; c.up = baseUp(); c.spent = 0; c.hpFrac = 1;
    c.ammo = Math.min(c.ammo, AR.CONS.ammo.max(vi));
    C.save(c);
    return ok();
  };

  C.loanRoom = c => Math.max(0, AR.LOAN.max - c.debt);
  C.borrow = function (c, amt) {
    amt = Math.min(amt, C.loanRoom(c));
    if (amt <= 0) return fail(AR.T.shark.max);
    if (c.debt <= 0) c.debtDue = c.day + AR.LOAN.days;
    c.debt += amt; c.cash += amt;
    C.save(c);
    return ok();
  };
  C.repay = function (c, amt) {
    amt = Math.min(amt, c.debt, c.cash);
    if (amt <= 0) return fail(AR.T.ui.notEnough);
    c.debt -= amt; c.cash -= amt;
    if (c.debt <= 0) { c.debt = 0; c.debtDue = 0; }
    C.save(c);
    return ok();
  };

  C.sabotage = function (c, oi) {
    const o = c.offers[oi];
    if (!o || o.final || o.sab !== -1) return fail();
    const cost = AR.DIFF[o.diff].sabotage;
    if (c.cash < cost) return fail(AR.T.ui.notEnough);
    c.cash -= cost; o.sab = U.pick(o.opp);
    C.save(c);
    return ok(C.driverName(c.drivers[o.sab]));
  };

  // pikakisa: satunnaiset vastustajat valitun koneen tasolla
  // opts: { vi2 (toisen pelaajan kone, kaksinpeli), name2, hooki }
  C.quickEntrants = function (vi, lv, name, nOpp, opts) {
    opts = opts || {};
    const two = opts.vi2 != null;
    const up = { engine: lv, tires: lv, armor: lv, gun: Math.max(1, lv), ram: Math.min(3, lv >> 1) };
    const names = U.shuffle(AR.T.drivers.map((n, i) => i)).slice(0, nOpp);
    const cols = U.shuffle(AR.COLORS.filter(c => !two || c !== '#909090'));
    const list = names.map((n, i) => ({
      name: AR.T.drivers[n], color: cols[i], vi: U.clamp(vi + U.irand(-1, 1), 0, 6), up, hpFrac: 1,
      ammo: 60 + lv * 25, mines: 1 + (lv >> 1), turbo: opts.hooki ? AR.HOOKI.turbo : 2 + lv * 0.6, skill: U.rand(0.55, 0.95), aggr: U.rand(0.35, 0.9), driverId: 'q' + i
    }));
    const pt = opts.hooki ? AR.HOOKI.turbo : 6;
    const isBeach = !!(opts.beach || (AR.Main && AR.Main.isBeachMod && AR.Main.isBeachMod()));
    list.push({ name: name || 'Sinä', color: AR.PLAYER_COLOR, vi, up, hpFrac: 1, ammo: 120, mines: 4, turbo: pt, isPlayer: true, pid: 0, driverId: 'p', beach: isBeach });
    if (two) list.push({ name: opts.name2 || 'P2', color: AR.PLAYER2_COLOR, vi: opts.vi2, up, hpFrac: 1, ammo: 120, mines: 4, turbo: pt, isPlayer: true, pid: 1, driverId: 'p2', beach: isBeach });
    return list;
  };

  // ---------- Runkotuunaus (Body Modification) ----------
  C.bodyCost = (c, key) => {
    if (!c.body) c.body = { bust: 3, hips: 3, tone: 3, outfit: 1, hair: 'blonde', hairStyle: 'ponytail', gender: 'f' };
    const cur = (c.body[key] | 0) || 1;
    if (cur >= AR.BODY_MODS[key].max) return null;
    return AR.bodyPrice(key, cur + 1);
  };

  C.buyBodyMod = function (c, key) {
    const cost = C.bodyCost(c, key);
    if (cost == null) return fail(AR.T.ui.maxed);
    if (c.cash < cost) return fail(AR.T.ui.notEnough);
    c.cash -= cost;
    c.body[key] = ((c.body[key] | 0) || 1) + 1;
    C.save(c);
    return ok();
  };

  C.setBodyStyle = function (c, key, val) {
    if (!c.body) c.body = { bust: 3, hips: 3, tone: 3, outfit: 1, hair: 'blonde', hairStyle: 'ponytail', gender: 'f' };
    c.body[key] = val;
    C.save(c);
  };

  C.isBeachActive = () => {
    const c = AR.Main && AR.Main.career;
    if (c && c.beachActive) return true;
    return AR.Main && AR.Main.settings && AR.Main.settings.beachMod;
  };

  C.toggleBeach = (c) => {
    if (!c) return false;
    c.beachActive = !c.beachActive;
    C.save(c);
    return c.beachActive;
  };
})();
