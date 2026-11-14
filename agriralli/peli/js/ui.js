/* AgriRalli – valikot ja ruudut (DOM). Kaikki napit käyttävät data-act-attribuuttia. */
(function () {
  'use strict';
  const AR = window.AR;
  const U = AR.U;
  const C = AR.Career;
  const esc = U.esc;

  const UI = AR.UI = { scr: null, screen: '', acts: {}, prevT: 0 };

  const money = n => U.fmt(n) + ' ' + AR.T.cur;
  const vname = vi => AR.T.veh[AR.VEH[vi].id][0];
  const btn = (act, label, cls, data) => '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' + (data ? Object.keys(data).map(k => ' data-' + k + '="' + esc(data[k]) + '"').join('') : '') + '>' + label + '</button>';

  UI.init = function () {
    UI.scr = U.$('scr');
    UI.scr.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      AR.Audio.unlock();
      const f = UI.acts[b.getAttribute('data-act')];
      if (f) f(b.dataset, b);
    });
  };

  function show(name, html, cls) {
    UI.screen = name;
    UI.scr.className = 'screen ' + (cls || '');
    UI.scr.innerHTML = html;
    UI.scr.scrollTop = 0;
    UI.scr.classList.remove('hidden');
    document.documentElement.setAttribute('data-screen', name);
    UI.drawMinis();
  }
  UI.hide = function () { UI.scr.classList.add('hidden'); UI.screen = ''; document.documentElement.setAttribute('data-screen', ''); };

  UI.toast = function (text, bad) {
    if (!text) return;
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  };

  function topbar(c) {
    const T = AR.T;
    return '<header class="topbar"><b class="pname">' + esc(c.name) + '</b>' +
      '<span>💰 ' + money(c.cash) + '</span>' +
      '<span>🏆 ' + T.ui.rank + ' ' + C.rank(c) + '/' + (c.drivers.length + 2) + '</span>' +
      '<span>📅 ' + T.ui.day + ' ' + c.day + '</span>' +
      (c.debt > 0 ? '<span class="debt">🦈 ' + money(c.debt) + ' (' + T.ui.due + ' ' + T.ui.day.toLowerCase() + ' ' + c.debtDue + ')</span>' : '') +
      '</header>';
  }

  function vprev(vi, col, up, w, h, extra) {
    return '<canvas class="vprev" width="' + (w || 300) + '" height="' + (h || 180) + '" data-vi="' + vi + '" data-col="' + col + '" data-ram="' + (up ? up.ram : 0) +
      '" data-armor="' + (up ? up.armor : 0) + '" data-gun="' + (up ? up.gun : 1) + '" data-hp="' + (extra && extra.hp != null ? extra.hp : 1) + '"></canvas>';
  }

  // minikartat ja koneiden esikatselut piirretään näkyviin tultuaan
  UI.drawMinis = function () {
    UI.scr.querySelectorAll('canvas.tmini').forEach(cv => {
      const tr = AR.Track.build(+cv.dataset.track);
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      AR.TrackArt.mini(ctx, tr, 6, 6, cv.width - 12, cv.height - 12, { col: AR.themeId === 'kyla' ? '#c9b48a' : '#8a8580', edge: 'rgba(0,0,0,0.7)' });
    });
    UI.scr.querySelectorAll('canvas[data-drvprev]').forEach(cv => drawDriverPrev(cv));
  };
  // piirtää kuskin muotokuvan canvasille (data-drvprev)
  function drawDriverPrev(cv) {
    if (!AR.Portraits) return;
    const c = AR.Main.career;
    if (!c) return;
    const body = c.body || {};
    const prof = AR.Portraits.getDriver(body.driverProfileId || 0, AR.themeId);
    AR.Portraits.draw(cv, prof, {
      beach: c.beachActive,
      outfitLv: body.outfit || 1,
      color: AR.PLAYER_COLOR
    });
  }

  UI.tick = function (dt) {
    UI.prevT += dt;
    if (!UI.screen) return;
    UI.scr.querySelectorAll('canvas.vprev').forEach(cv => {
      const d = cv.dataset;
      AR.Render.preview(cv, { vi: +d.vi, color: d.col, ramLv: +d.ram, armorLv: +d.armor, gunLv: +d.gun, hpFrac: +d.hp, seed: 5 }, UI.prevT);
    });
    UI.scr.querySelectorAll('canvas[data-drvprev]').forEach(cv => drawDriverPrev(cv));
  };

  // ---------- päävalikko ----------
  UI.title = function () {
    const T = AR.T, c = C.load();
    show('title',
      '<div class="title">' +
      '<h1 class="logo"><span class="l1">AGRI</span><span class="l2">RALLI</span></h1>' +
      '<p class="sub">' + esc(T.sub) + '</p>' +
      '<div class="menu">' +
      (c ? btn('cont', T.ui.continueCareer + '<small>' + esc(c.name) + ' · ' + T.ui.day.toLowerCase() + ' ' + c.day + ' · ' + money(c.cash) + '</small>', 'big primary') : '') +
      btn('newc', T.ui.newCareer, c ? 'big' : 'big primary') +
      '<div class="row">' + btn('quick', T.ui.quickRace, 'big') + btn('quick2', '👥 ' + T.ui.twoPlayer, 'big') + '</div>' +
      '<div class="row">' + btn('help', T.ui.help) + btn('settings', T.ui.settings) + '</div>' +
      '</div>' +
      '<div class="themes"><span>' + T.ui.themeLbl + ':</span>' +
      Object.values(AR.TEXTS).map(t => btn('theme', t.label, AR.themeId === t.id ? 'sel small' : 'small', { id: t.id })).join('') +
      '</div>' +
      '<p class="foot">AgriRalli (työnimi) · kosketus, näppäimistö tai peliohjain</p>' +
      '</div>', 'title-scr');
  };

  UI.acts.theme = d => { AR.Main.setTheme(d.id); UI.title(); };
  UI.acts.cont = () => { AR.Main.career = C.load(); UI.hub(); };
  UI.acts.newc = () => {
    if (C.load() && !confirm(AR.T.ui.deleteSave)) return;
    const T = AR.T;
    show('new', '<div class="panel narrow"><h2>' + T.ui.newCareer + '</h2><p class="intro">' + esc(T.intro) + '</p>' +
      '<label class="field">' + T.ui.yourName + '<input id="pname" maxlength="18" autocomplete="off" placeholder="' + esc(T.drivers[0].split(' ')[0]) + '…"></label>' +
      '<div class="row">' + btn('title', T.ui.back) + btn('startc', T.ui.start, 'primary') + '</div></div>');
    setTimeout(() => { const i = U.$('pname'); if (i) i.focus(); }, 50);
  };
  UI.acts.startc = () => {
    const name = (U.$('pname') || {}).value || '';
    AR.Main.career = C.create(name);
    C.save(AR.Main.career);
    UI.hub();
  };
  UI.acts.title = () => UI.title();

  // ---------- varikko (keskus) ----------
  UI.hub = function (events) {
    const c = AR.Main.career, T = AR.T;
    const st = C.stats(c);
    const hpc = c.hpFrac > 0.5 ? 'ok' : c.hpFrac > 0.25 ? 'mid' : 'bad';
    show('hub', topbar(c) +
      '<div class="hub">' +
      '<div class="card garage">' + vprev(c.vi, AR.PLAYER_COLOR, c.up, 320, 190, { hp: c.hpFrac }) +
      '<h3>' + esc(vname(c.vi)) + '</h3>' +
      '<div class="hp ' + hpc + '"><i style="width:' + Math.round(c.hpFrac * 100) + '%"></i><span>' + T.ui.hp + ' ' + Math.round(c.hpFrac * st.hp) + '/' + st.hp + '</span></div>' +
      '<p class="kit">' + esc(T.guns[c.up.gun]) + ' · ' + T.ui.ammo + ' ' + c.ammo + ' · ' + T.cons.mines[0] + ' ' + c.mines + ' · ' + T.cons.turbo[0] + ' ' + c.turbo + ' s</p>' +
      (c.hpFrac < 1 ? '<div class="row">' + btn('repair', T.cons.repair[0] + ' · ' + money(C.repairCost(c)), 'small') + (C.canTape(c) ? btn('tape', T.cons.tape[0], 'small') : '') + '</div>' : '') +
      '</div>' +
      '<div class="hubmenu">' +
      btn('races', '🏁 ' + T.ui.races + (c.offers.some(o => o.final) ? ' <em>' + T.ui.final + '!</em>' : ''), 'big primary') +
      btn('shop', '🔧 ' + T.ui.shop, 'big') +
      btn('dealer', '🚜 ' + T.ui.dealer, 'big') +
      btn('shark', '🦈 ' + esc(T.shark.name), 'big') +
      btn('standings', '🏆 ' + T.ui.standings, 'big') +
      btn('bodymod', '💃 ' + T.ui.bodymod, 'big') +
      btn('title', '⏏ ' + T.ui.menu, 'big') +
      '</div></div>');
    (events || []).forEach((e, i) => setTimeout(() => UI.toast(e.text, e.t === 'goons'), i * 400));
  };
  UI.acts.hub = () => UI.hub();
  UI.acts.repair = () => { const r = C.repair(AR.Main.career); if (!r.ok) UI.toast(r.msg, true); rerender(); };
  UI.acts.tape = () => { C.tape(AR.Main.career); rerender(); };
  function rerender() { const f = { hub: UI.hub, shop: UI.shop, dealer: UI.dealer, shark: UI.shark, races: UI.races, bodymod: UI.bodymod }[UI.screen]; if (f) f(); }

  // ---------- kuski & runkotuunaus ----------
  UI.bodymod = function () {
    const c = AR.Main.career, T = AR.T;
    const body = c.body || {};
    const P = AR.Portraits;

    // Muotokuvapaneeli (canvas piirretään drawMinis/tick kautta)
    const portrait = '<canvas class="drvprev-main" data-drvprev="1" width="200" height="240"></canvas>';

    // Runkotilastot (vaikutukset)
    const st = C.stats(c);
    const bodyEffects = '<div class="bmod-effects">' +
      '<small>🏎 Pito ×' + (st.gripMult ? st.gripMult.toFixed(2) : '1.00') +
      ' · 🌀 Käännös ×' + (st.turnMult ? st.turnMult.toFixed(2) : '1.00') +
      ' · 💰 Sponsori +' + Math.round((st.cashBonus || 0) * 100) + '%' +
      ' · 🛡 Kestävyys ' + Math.round((1 - (st.dmgResist || 0)) * 100) + '%</small></div>';

    // Body mod -rivit (bust, hips, tone, outfit)
    function bmodRow(key) {
      const def = AR.BODY_MODS[key];
      const lv = body[key] || def.base;
      const max = def.max;
      const cost = C.bodyCost(c, key);
      let pips = '';
      for (let i = 1; i <= max; i++) pips += '<i class="' + (i <= lv ? 'on' : '') + '"></i>';
      const label = T.ui[key] || key;
      const desc = T.ui[key + 'Desc'] || '';
      const canBuy = cost != null && c.cash >= cost;
      return '<div class="srow">' +
        '<div class="sinfo"><b>' + esc(label) + '</b> <span class="pips">' + pips + '</span>' +
        '<small class="desc">' + esc(desc) + '</small></div>' +
        (cost == null ? '<span class="maxed">' + T.ui.maxed + '</span>' :
          btn('bbuy', (T.ui.buy || 'Osta') + ' ' + (c.cash >= cost ? '' : '⚠ ') + U.fmt(cost) + ' ' + AR.T.cur, canBuy ? 'primary' : 'dis', { k: key })) +
        '</div>';
    }
    const bodyRows = AR.BODY_KEYS.map(bmodRow).join('');

    // Tyylirivit: hiustyyli, sukupuoli
    const styles = T.ui.hairStyle || {};
    const hstyles = ['ponytail', 'twintails', 'long', 'bob', 'bun', 'bandana', 'cap', 'short'];
    const curHstyle = body.hairStyle || 'ponytail';
    const hairBtns = hstyles.map(s =>
      btn('bstyle', esc(T.ui[s] || s), curHstyle === s ? 'sel small' : 'small', { k: 'hairStyle', v: s })
    ).join('');

    const curGender = body.gender || 'f';
    const genderBtns = btn('bstyle', '♀ ' + (T.ui.female || 'Nainen'), curGender === 'f' ? 'sel small' : 'small', { k: 'gender', v: 'f' }) +
      btn('bstyle', '♂ ' + (T.ui.male || 'Mies'), curGender === 'm' ? 'sel small' : 'small', { k: 'gender', v: 'm' });

    // OutfitNames (outfit-taso nykyinen)
    const outfitLv = body.outfit || 1;
    const outfitName = (T.ui.outfitNames || [])[outfitLv - 1] || 'taso ' + outfitLv;

    // Beach toggle
    const beachSection = c.beachUnlocked
      ? '<div class="beach-banner">🌴 ' + (T.ui.beachMod || 'Beach Mod') + ' ' + (c.beachActive ? '✓ PÄÄLLÄ' : '- POIS') + '</div>' +
        btn('btogbeach', c.beachActive ? '🌴 ' + (T.ui.beachOff || 'Beach Pois') : '🌴 ' + (T.ui.beachOn || 'Beach Päälle'), 'big ' + (c.beachActive ? 'sel' : ''))
      : '<p class="hint">🔒 ' + esc(T.ui.beachMod || 'Beach Mod') + ' avautuu ' + AR.BEACH_MOD.pointsReq + ' pisteellä tai ' + AR.BEACH_MOD.racesReq + ' kisalla.</p>';

    // Kuskin nimi + nykyinen asu
    const driverName = (P && P.getDriver) ? esc(P.getDriver(body.driverProfileId || 0, AR.themeId).name) : 'Kuski';

    show('bodymod', topbar(c) +
      '<div class="panel wide"><div class="phead"><h2>💃 ' + esc(T.ui.bodymod || 'Runkotuunaus') + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      '<p class="hint">' + esc(T.ui.bodymodSub || '') + '</p>' +
      '<div class="bodymod-grid">' +
      '<div class="bmod-left">' + portrait +
        '<p class="bmod-name"><b>' + driverName + '</b></p>' +
        '<p class="bmod-outfit">👗 ' + esc(outfitName) + (c.beachActive ? ' 🌴' : '') + '</p>' +
        bodyEffects +
        beachSection +
      '</div>' +
      '<div class="bmod-right">' +
        '<h3>' + (T.ui.outfit || 'Ajoasun niukkuus') + ' & ' + (T.ui.bodymod || 'Runko') + '</h3>' +
        bodyRows +
        '<h3>' + (T.ui.hairStyle || 'Hiustyyli') + '</h3>' +
        '<div class="row wrap">' + hairBtns + '</div>' +
        '<h3>' + (T.ui.gender || 'Hahmo') + '</h3>' +
        '<div class="row wrap">' + genderBtns + '</div>' +
      '</div>' +
      '</div></div>');
  };
  UI.acts.bodymod = () => UI.bodymod();
  UI.acts.bbuy = d => { const r = C.buyBodyMod(AR.Main.career, d.k); if (!r.ok) UI.toast(r.msg, true); C.save(AR.Main.career); UI.bodymod(); };
  UI.acts.bstyle = d => { C.setBodyStyle(AR.Main.career, d.k, d.v); C.save(AR.Main.career); UI.bodymod(); };
  UI.acts.btogbeach = () => { C.toggleBeach(AR.Main.career); C.save(AR.Main.career); UI.bodymod(); };

  // ---------- kisavalinta ----------
  UI.races = function () {
    const c = AR.Main.career, T = AR.T;
    const cards = c.offers.map((o, i) => {
      const D = AR.DIFF[o.diff];
      const laps = C.laps(o);
      const opp = o.opp.map(id => {
        if (id === 'boss') return '<li class="boss"><i style="background:' + AR.BOSS_COLOR + '"></i>' + esc(T.boss) + ' <small>' + esc(vname(6)) + ' ★★★★★</small></li>';
        const d = c.drivers[id];
        return '<li><i style="background:' + d.color + '"></i>' + esc(C.driverName(d)) + (o.sab === id ? ' 🩹' : '') +
          ' <small>' + esc(vname(d.vt)) + ' ' + T.ui.level.toLowerCase() + ' ' + d.lv + ' · ' + '★'.repeat(1 + Math.round(d.skill * 4)) + '</small></li>';
      }).join('');
      return '<div class="card offer d' + o.diff + '">' +
        '<div class="ohead"><canvas class="tmini" width="180" height="120" data-track="' + o.track + '"></canvas>' +
        '<div><h3>' + esc(T.diff[o.diff]) + '</h3><p>' + esc(T.tracks[o.track]) + '<br>' + laps + ' ' + T.ui.laps + '</p></div></div>' +
        '<p class="prizes">🥇 ' + money(D.prize[0]) + ' · 🥈 ' + money(D.prize[1]) + ' · 🥉 ' + money(D.prize[2]) + '<br>💀 ' + T.ui.bounty + ' ' + money(D.kill) + ' · ' + T.ui.points + ' ' + D.pts.slice(0, 3).join('/') + '</p>' +
        (o.final ? '<p class="bossline">' + esc(T.bossLine) + '</p>' : '') +
        '<ul class="opp">' + opp + '</ul>' +
        '<div class="row">' + btn('go', T.ui.race, 'primary', { i: i }) +
        (o.final || o.sab !== -1 ? '' : btn('sab', '🩹 ' + esc(T.sabotage[0]) + ' · ' + money(D.sabotage), 'small', { i: i })) + '</div>' +
        '</div>';
    }).join('');
    show('races', topbar(c) + '<div class="panel wide"><div class="phead"><h2>' + T.ui.races + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      (c.hpFrac < 0.15 ? '<p class="warn">' + T.ui.tooBroken + '</p>' : '') +
      '<div class="offers">' + cards + '</div><p class="hint">' + esc(T.sabotage[1]) + '</p></div>');
  };
  UI.acts.races = () => UI.races();
  UI.acts.sab = d => {
    const r = C.sabotage(AR.Main.career, +d.i);
    if (!r.ok) UI.toast(r.msg, true); else UI.toast(AR.T.sabotage[0] + ': ' + r.msg);
    UI.races();
  };
  UI.acts.go = d => {
    const c = AR.Main.career;
    if (c.hpFrac < 0.15) { UI.toast(AR.T.ui.tooBroken, true); return; }
    AR.Main.startCareerRace(c.offers[+d.i]);
  };

  // ---------- varikko: viritykset ja tarvikkeet ----------
  UI.shop = function () {
    const c = AR.Main.career, T = AR.T, st = C.stats(c);
    const rows = AR.UPG_KEYS.map(k => {
      const lv = c.up[k], max = AR.UPG[k].max, cost = C.upgradeCost(c, k);
      const label = k === 'tires' && st.tracked ? T.upg.tracks : T.upg[k];
      const extra = k === 'gun' ? ' <small>' + esc(T.guns[lv]) + (lv < max ? ' → ' + esc(T.guns[lv + 1]) : '') + '</small>' : '';
      let pips = '';
      for (let i = 1; i <= max; i++) pips += '<i class="' + (i <= lv ? 'on' : '') + '"></i>';
      return '<div class="srow"><div class="sinfo"><b>' + esc(label) + '</b>' + extra + '<span class="pips">' + pips + '</span><small class="desc">' + esc(T.upgDesc[k]) + '</small></div>' +
        (cost == null ? '<span class="maxed">' + T.ui.maxed + '</span>' : btn('upg', money(cost), c.cash >= cost ? 'primary' : 'dis', { k })) + '</div>';
    }).join('');
    const cons = ['ammo', 'mines', 'turbo'].map(k => {
      const cur = c[k], max = C.consMax(c, k), cost = C.consCost(c, k);
      return '<div class="srow"><div class="sinfo"><b>' + esc(T.cons[k][0]) + '</b> <small>' + cur + '/' + max + (k === 'turbo' ? ' s' : '') + '</small><small class="desc">' + esc(T.cons[k][1]) + '</small></div>' +
        (cur >= max ? '<span class="maxed">' + T.ui.maxed + '</span>' : btn('cons', money(cost), c.cash >= cost ? 'primary' : 'dis', { k })) + '</div>';
    }).join('');
    const rc = C.repairCost(c);
    const repair = '<div class="srow"><div class="sinfo"><b>' + esc(T.cons.repair[0]) + '</b> <small>' + T.ui.hp + ' ' + Math.round(c.hpFrac * 100) + ' %</small><small class="desc">' + esc(T.cons.repair[1]) + '</small></div>' +
      (rc <= 0 ? '<span class="maxed">✓</span>' : btn('repair', money(rc), c.cash > 0 ? 'primary' : 'dis')) + '</div>' +
      (C.canTape(c) ? '<div class="srow"><div class="sinfo"><b>' + esc(T.cons.tape[0]) + '</b><small class="desc">' + esc(T.cons.tape[1]) + '</small></div>' + btn('tape', '0 ' + T.cur, 'primary') + '</div>' : '');
    show('shop', topbar(c) + '<div class="panel wide"><div class="phead"><h2>🔧 ' + T.ui.shop + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      '<div class="shopgrid"><div class="card">' + vprev(c.vi, AR.PLAYER_COLOR, c.up, 260, 150, { hp: c.hpFrac }) + statBars(st) + '</div>' +
      '<div class="card">' + rows + '</div><div class="card">' + repair + cons + '</div></div></div>');
  };
  UI.acts.shop = () => UI.shop();
  UI.acts.upg = d => { const r = C.buyUpgrade(AR.Main.career, d.k); if (!r.ok) UI.toast(r.msg, true); UI.shop(); };
  UI.acts.cons = d => { const r = C.buyCons(AR.Main.career, d.k); if (!r.ok) UI.toast(r.msg, true); UI.shop(); };

  function statBars(st) {
    const T = AR.T;
    const rows = [
      ['Huippunopeus', st.spd / 560, Math.round(st.spd * 0.29) + ' ' + T.ui.speedUnit],
      ['Kiihtyvyys', st.acc / 600, ''],
      [T.ui.hp, st.hp / 620, st.hp],
      ['Pito', st.grip / 14, ''],
      ['Massa', st.mass / 6, ''],
      ['Rammaus', st.ram / 4, '×' + st.ram.toFixed(1)]
    ];
    return '<div class="stats">' + rows.map(r => '<div class="stat"><span>' + r[0] + '</span><i><b style="width:' + Math.round(U.clamp(r[1], 0.03, 1) * 100) + '%"></b></i><em>' + r[2] + '</em></div>').join('') + '</div>';
  }

  // ---------- konekauppa ----------
  UI.dealer = function () {
    const c = AR.Main.career, T = AR.T;
    const ti = C.tradeIn(c);
    const cards = AR.VEH.map((V, vi) => {
      const st = AR.buildStats(vi, { engine: 0, tires: 0, armor: 0, gun: 1, ram: 0 });
      const own = vi === c.vi, cost = C.vehCost(c, vi);
      return '<div class="card veh' + (own ? ' own' : '') + '">' + vprev(vi, AR.PLAYER_COLOR, null, 240, 140) +
        '<h3>' + esc(T.veh[V.id][0]) + '</h3><p class="desc">' + esc(T.veh[V.id][1]) + '</p>' + statBars(st) +
        '<p class="price">' + money(V.price) + (own ? '' : ' <small>(' + T.ui.tradeIn.toLowerCase() + ' −' + money(ti) + ')</small>') + '</p>' +
        (own ? '<span class="maxed">' + T.ui.owned + '</span>' : btn('buyveh', T.ui.buy + ' · ' + (cost >= 0 ? money(cost) : '+' + money(-cost)), c.cash >= cost ? 'primary' : 'dis', { vi })) +
        '</div>';
    }).join('');
    show('dealer', topbar(c) + '<div class="panel wide"><div class="phead"><h2>🚜 ' + T.ui.dealer + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      '<p class="hint">' + T.ui.tradeIn + ': ' + money(ti) + '. Uuden koneen viritykset alkavat alusta.</p><div class="vehs">' + cards + '</div></div>');
  };
  UI.acts.dealer = () => UI.dealer();
  UI.acts.buyveh = d => {
    const c = AR.Main.career, vi = +d.vi;
    if (!confirm(AR.T.ui.buy + ': ' + vname(vi) + '?')) return;
    const r = C.buyVehicle(c, vi);
    if (!r.ok) UI.toast(r.msg, true); else UI.toast('🚜 ' + vname(vi) + '!');
    UI.dealer();
  };

  // ---------- lainahai ----------
  UI.shark = function () {
    const c = AR.Main.career, T = AR.T, room = C.loanRoom(c);
    show('shark', topbar(c) + '<div class="panel narrow"><div class="phead"><h2>🦈 ' + esc(T.shark.name) + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      '<p class="intro">' + esc(T.shark.hello) + '</p>' +
      '<p class="big">' + (c.debt > 0 ? T.ui.debt + ': <b>' + money(c.debt) + '</b> · ' + T.ui.due + ' ' + T.ui.day.toLowerCase() + ' ' + c.debtDue + ' (' + Math.max(0, c.debtDue - c.day) + ' pv)' : esc(T.shark.noDebt)) + '</p>' +
      '<h3>' + T.ui.borrow + '</h3><div class="row">' +
      [1000, 3000, 8000].map(a => btn('borrow', '+' + money(Math.min(a, room)), room > 0 ? '' : 'dis', { a })).join('') + '</div>' +
      (c.debt > 0 ? '<h3>' + T.ui.repay + '</h3><div class="row">' + btn('repay', money(Math.min(1000, c.debt)), c.cash > 0 ? '' : 'dis', { a: 1000 }) + btn('repay', T.ui.repay + ' kaikki', c.cash > 0 ? 'primary' : 'dis', { a: c.debt }) + '</div>' : '') +
      '<p class="hint">' + T.ui.interest + ' ' + Math.round(AR.LOAN.rate * 100) + ' % / ' + T.ui.day.toLowerCase() + ', enintään ' + money(AR.LOAN.max) + '.</p></div>');
  };
  UI.acts.shark = () => UI.shark();
  UI.acts.borrow = d => { const r = C.borrow(AR.Main.career, +d.a); if (!r.ok) UI.toast(r.msg, true); UI.shark(); };
  UI.acts.repay = d => { const r = C.repay(AR.Main.career, +d.a); if (!r.ok) UI.toast(r.msg, true); UI.shark(); };

  // ---------- sarjataulukko ----------
  UI.standings = function () {
    const c = AR.Main.career, T = AR.T;
    const rows = C.standings(c).map((e, i) => '<tr class="' + (e.me ? 'me' : e.boss ? 'boss' : '') + '"><td>' + (i + 1) + '.</td><td><i class="dot" style="background:' + e.color + '"></i>' + esc(e.name) + '</td><td>' + esc(vname(e.vi)) + '</td><td>' + e.points + '</td></tr>').join('');
    show('standings', topbar(c) + '<div class="panel narrow"><div class="phead"><h2>🏆 ' + T.ui.standings + '</h2>' + btn('hub', T.ui.back, 'small') + '</div>' +
      '<table class="tbl"><thead><tr><th></th><th></th><th>' + T.ui.vehicle + '</th><th>' + T.ui.points + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="hint">' + esc(T.bossLine) + ' Sarjan kärkeen noussut pääsee finaaliin.</p>' +
      '<p class="hint">Kisoja ' + c.stats.races + ' · voittoja ' + c.stats.wins + ' · romutettuja ' + c.stats.kills + ' · ansaittu ' + money(c.stats.earned) + '</p></div>');
  };
  UI.acts.standings = () => UI.standings();

  // ---------- tulokset ----------
  function orderTable(race) {
    const T = AR.T;
    return '<table class="tbl res"><tbody>' + race.results.map(r => {
      const car = race.cars[r.idx];
      return '<tr class="' + (r.isPlayer ? 'me' : '') + '"><td>' + r.place + '.</td><td><i class="dot" style="background:' + car.color + '"></i>' + esc(r.name) + '</td><td>' + esc(vname(car.vi)) + '</td><td>' +
        (r.wrecked ? '✗ ' + (r.isPlayer && car.forfeit ? T.ui.quit.toLowerCase() : T.ui.wrecked.toLowerCase()) : r.finished ? '🏁' : '…') + '</td><td>' + (r.kills ? '💀×' + r.kills : '') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  UI.results = function (sum, race) {
    const c = AR.Main.career, T = AR.T;
    const quip = sum.wrecked ? U.pick(T.comment.playerWreck) : T.results[Math.min(3, sum.place - 1)][0];
    show('results', '<div class="panel narrow results"><h2 class="place p' + sum.place + '">' + (sum.wrecked ? T.ui.wrecked : sum.place + '.') + '</h2>' +
      '<p class="quip">' + esc(quip) + '</p>' + orderTable(race) +
      '<table class="tbl money"><tbody>' +
      '<tr><td>' + T.ui.prize + '</td><td>' + money(sum.prize) + '</td></tr>' +
      '<tr><td>' + T.ui.bounty + ' (' + sum.kills + ')</td><td>' + money(sum.bounty) + '</td></tr>' +
      '<tr><td>' + T.ui.pickups + '</td><td>' + money(sum.cash) + '</td></tr>' +
      '<tr class="sum"><td>' + T.ui.total + '</td><td>' + money(sum.total) + '</td></tr>' +
      '<tr><td>' + T.ui.points + '</td><td>+' + sum.pts + '</td></tr></tbody></table>' +
      '<div class="row">' + btn(sum.ending ? 'ending' : 'hubev', sum.ending ? '🏆 →' : T.ui.resume + ' →', 'primary big') + '</div></div>', 'dim');
    UI.pendingEvents = sum.events;
    void c;
  };
  UI.acts.hubev = () => { const ev = UI.pendingEvents; UI.pendingEvents = null; UI.hub(ev); };
  UI.acts.ending = () => UI.ending();

  UI.ending = function () {
    const c = AR.Main.career, T = AR.T;
    show('ending', '<div class="panel narrow ending"><h1 class="logo"><span class="l1">AGRI</span><span class="l2">RALLI</span></h1><h2>🏆 ' + esc(c.name) + '</h2>' +
      '<p class="intro">' + esc(T.ending) + '</p>' +
      '<p class="hint">' + T.ui.day + ' ' + c.day + ' · ' + 'kisoja ' + c.stats.races + ' · voittoja ' + c.stats.wins + ' · romutettuja ' + c.stats.kills + ' · ansaittu ' + money(c.stats.earned) + '</p>' +
      '<div class="row">' + btn('hubev', T.ui.continueCareer, 'primary') + btn('title', T.ui.menu) + '</div></div>', 'dim');
  };

  // ---------- tauko ----------
  UI.pause = function () {
    const T = AR.T;
    show('pause', '<div class="panel narrow pause"><h2>' + T.ui.paused + '</h2>' +
      '<div class="menu">' + btn('resume', T.ui.resume, 'big primary') +
      btn('sound', AR.Audio.on ? '🔊 ' + T.ui.soundOn : '🔇 ' + T.ui.soundOff, 'big') +
      btn('forfeit', T.ui.quit, 'big') + '</div><p class="hint">' + T.ui.quitWarn + '</p></div>', 'dim');
  };
  UI.acts.resume = () => AR.Main.resume();
  UI.acts.forfeit = () => AR.Main.forfeit();
  UI.acts.sound = () => { AR.Main.setSound(!AR.Audio.on); if (UI.screen === 'pause') UI.pause(); else UI.settings(); };

  // ---------- pikakisa ----------
  UI.quick = function () {
    const T = AR.T, q = AR.Main.quickCfg;
    const sel = (act, val, cur, label) => btn(act, label, (val === cur ? 'sel ' : '') + 'small', { v: val });
    const two = q.players > 1;
    show('quick', '<div class="panel wide"><div class="phead"><h2>' + T.ui.quickRace + '</h2>' + btn('title', T.ui.back, 'small') + '</div>' +
      '<h3>' + T.ui.track + '</h3><div class="tracks">' + AR.TRACKS.map((t, i) =>
        '<button class="tbtn' + (q.track === i ? ' sel' : '') + '" data-act="qt" data-v="' + i + '"><canvas class="tmini" width="120" height="80" data-track="' + i + '"></canvas><span>' + esc(T.tracks[i]) + '</span></button>').join('') + '</div>' +
      '<h3>' + T.ui.players + '</h3><div class="row wrap">' + sel('qp', 1, q.players, '👤 1') + sel('qp', 2, q.players, '👥 2') + '</div>' +
      (two ? '<p class="hint">' + esc(T.ui.keys2p) + '</p>' : '') +
      '<h3>' + T.ui.driveMode + '</h3><div class="row wrap">' + sel('qm', 0, q.hooki ? 1 : 0, T.ui.modeNormal) + sel('qm', 1, q.hooki ? 1 : 0, '🔥 ' + T.ui.modeHooki) + '</div>' +
      (q.hooki ? '<p class="hint">' + esc(T.ui.hookiDesc) + '</p>' : '') +
      '<h3>' + (two ? T.ui.p1 + ': ' + T.ui.vehicle.toLowerCase() : T.ui.vehicle) + '</h3><div class="row wrap">' + AR.VEH.map((V, i) => sel('qv', i, q.vi, esc(T.veh[V.id][0]))).join('') + '</div>' +
      (two ? '<h3>' + T.ui.vehicleP2 + '</h3><div class="row wrap">' + AR.VEH.map((V, i) => sel('qv2', i, q.vi2, esc(T.veh[V.id][0]))).join('') + '</div>' : '') +
      '<h3>' + T.ui.level + '</h3><div class="row wrap">' + [0, 1, 2, 3, 4, 5].map(l => sel('ql', l, q.lv, String(l))).join('') + '</div>' +
      '<h3>' + T.ui.opponentsN + '</h3><div class="row wrap">' + (two ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5]).map(n => sel('qn', n, q.n, String(n))).join('') + '</div>' +
      '<div class="row">' + btn('qgo', '🏁 ' + T.ui.race, 'primary big') + '</div></div>');
  };
  UI.acts.quick = () => UI.quick();
  UI.acts.qt = d => { AR.Main.quickCfg.track = +d.v; UI.quick(); };
  UI.acts.qv = d => { AR.Main.quickCfg.vi = +d.v; UI.quick(); };
  UI.acts.ql = d => { AR.Main.quickCfg.lv = +d.v; UI.quick(); };
  UI.acts.qn = d => { AR.Main.quickCfg.n = +d.v; UI.quick(); };
  UI.acts.qp = d => { const q = AR.Main.quickCfg; q.players = +d.v; if (q.players < 2 && q.n < 1) q.n = 1; UI.quick(); };
  UI.acts.qv2 = d => { AR.Main.quickCfg.vi2 = +d.v; UI.quick(); };
  UI.acts.qm = d => { AR.Main.quickCfg.hooki = d.v === '1'; UI.quick(); };
  UI.acts.quick2 = () => { AR.Main.quickCfg.players = 2; UI.quick(); };
  UI.acts.qgo = () => AR.Main.startQuick();

  UI.quickResults = function (race) {
    const T = AR.T, hs = race.results.filter(r => r.isPlayer), me = hs[0];
    let head;
    if (hs.length > 1) {
      // kaksinpeli: kumpi pelaajista pärjäsi paremmin (maaliin ehtinyt voittaa romutetun)
      const best = hs.find(r => !r.wrecked);
      head = '<h2 class="place p1" style="font-size:clamp(28px,7vw,54px)">' + (best ? esc(U.fill(T.ui.wins, { a: best.name })) : esc(T.ui.draw)) + '</h2>' +
        '<p class="quip">' + hs.map(r => esc(r.name) + ': ' + (r.wrecked ? T.ui.wrecked.toLowerCase() : r.place + '.')).join(' · ') + '</p>';
    } else head = '<h2 class="place p' + me.place + '">' + (me.wrecked ? T.ui.wrecked : me.place + '.') + '</h2>';
    show('qresults', '<div class="panel narrow results">' + head +
      orderTable(race) + '<div class="row">' + btn('qgo', '↻ ' + T.ui.race, 'primary') + btn('quick', T.ui.quickRace) + btn('title', T.ui.menu) + '</div></div>', 'dim');
  };

  // ---------- ohjeet ja asetukset ----------
  UI.help = function () {
    const T = AR.T;
    show('help', '<div class="panel narrow"><div class="phead"><h2>' + T.ui.help + '</h2>' + btn('title', T.ui.back, 'small') + '</div>' +
      T.help.map(h => '<h3>' + esc(h[0]) + '</h3><p>' + esc(h[1]) + '</p>').join('') +
      '<h3>Radalta saa</h3><p>' + esc(T.pickup.cash) + ' (' + T.cur + '), ' + esc(T.pickup.repair) + ' (+25 % kuntoa), ' + esc(T.pickup.ammo) + ', ' + esc(T.pickup.turbo) + '. ' +
      'Öljy- ja lantalätäköt ovat liukkaita, ja pientareella vauhti hidastuu.</p></div>');
  };
  UI.acts.help = () => UI.help();

  UI.settings = function () {
    const T = AR.T;
    show('settings', '<div class="panel narrow"><div class="phead"><h2>' + T.ui.settings + '</h2>' + btn('title', T.ui.back, 'small') + '</div>' +
      '<div class="menu">' + btn('sound', AR.Audio.on ? '🔊 ' + T.ui.soundOn : '🔇 ' + T.ui.soundOff, 'big') +
      btn('autogas', (AR.Input.autoGas ? '✓ ' : '✗ ') + T.ui.autoGas, 'big') + '</div>' +
      '<h3>' + T.ui.themeLbl + '</h3><div class="row">' + Object.values(AR.TEXTS).map(t => btn('theme2', t.label, AR.themeId === t.id ? 'sel' : '', { id: t.id })).join('') + '</div>' +
      '<p class="hint">Tallennus säilyy vain tässä selaimessa.</p></div>');
  };
  UI.acts.settings = () => UI.settings();
  UI.acts.autogas = () => { AR.Main.setAutoGas(!AR.Input.autoGas); UI.settings(); };
  UI.acts.theme2 = d => { AR.Main.setTheme(d.id); UI.settings(); };
})();
