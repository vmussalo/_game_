/* FarmSim Online – käynnistys, kirjautuminen, uuden tilan luonti, pelisilmukka ja tallennus. */
'use strict';
(function () {
  var FS = window.FS, ui = FS.ui, esc = FS.esc;
  var M = FS.main = { G: null, speed: 2, lastSpeed: 2, dirty: false, lastSave: 0, acc: 0, hiddenAt: 0 };
  var MS_PER_DAY = [0, 4000, 1800, 700, 120];
  var AUTOSAVE_MS = 60000;
  var qs = new URLSearchParams(location.search);
  function $(id) { return document.getElementById(id); }

  /* ---------- Äänet (WebAudio, ei äänitiedostoja) ---------- */
  FS.sound = {
    on: FS.storage.get('fso_sound') === '1', ctx: null,
    toggle: function () { this.on = !this.on; FS.storage.set('fso_sound', this.on ? '1' : '0'); },
    play: function (kind) {
      if (!this.on) return;
      try {
        var c = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
        var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
        var spec = { build: [220, 0.06, 'square'], doze: [90, 0.18, 'sawtooth'], cash: [880, 0.12, 'triangle'], bad: [140, 0.4, 'sawtooth'], good: [660, 0.15, 'triangle'] }[kind] || [440, 0.05, 'square'];
        o.type = spec[2]; o.frequency.setValueAtTime(spec[0], t);
        if (kind === 'cash' || kind === 'good') o.frequency.setValueAtTime(spec[0] * 1.5, t + spec[1] / 2);
        g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + spec[1]);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + spec[1]);
      } catch (e) { /* ääni ei ole saatavilla */ }
    }
  };

  /* ---------- Näkymät ---------- */

  function screen(html) { var s = $('screen'); s.innerHTML = html; s.hidden = false; $('app').hidden = true; }
  function hideScreen() { $('screen').hidden = true; $('app').hidden = false; }

  M.loginScreen = function (msg) {
    var saved = FS.storage.get('fso_login'), rec = null;
    try { rec = saved ? JSON.parse(saved) : null; } catch (e) { rec = null; }
    screen('<div class="card login">' + titleArt() +
      '<p class="sub">Maatilasimulaatio SimFarmin (Maxis 1993) hengessä – nyt verkossa.</p>' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      (FS.net.local ? '<p class="warn">Paikallinen tila: tallennus vain tähän selaimeen.</p>' : '') +
      (rec ? '<button id="bCont" class="big">Jatka tilaa: ' + esc(rec.name) + '</button><p class="or">tai</p>' : '') +
      '<label>Nimimerkki <input id="iName" maxlength="20" autocomplete="username" value="' + esc(rec ? rec.name : '') + '"></label>' +
      '<label>Salakoodi (palaaville pelaajille) <input id="iCode" maxlength="12" autocomplete="current-password" placeholder="esim. KANA-1234"></label>' +
      '<div class="btnrow"><button id="bLogin">Jatka tilaa</button><button id="bNew">Uusi pelaaja</button></div>' +
      '<p class="fine">Älä käytä nimimerkkinä oikeaa nimeäsi. Palvelimelle tallennetaan vain nimimerkki, salakoodin tiiviste ja pelitila. Nimimerkki näkyy muille Naapurit-listalla.</p></div>');
    if (rec) $('bCont').onclick = function () { doLogin(rec.name, rec.code); };
    $('bLogin').onclick = function () { doLogin($('iName').value.trim(), $('iCode').value.trim().toUpperCase()); };
    $('bNew').onclick = function () {
      var n = $('iName').value.trim();
      if (n.length < 2) return M.loginScreen('Kirjoita nimimerkki (2–20 merkkiä).');
      FS.net.create(n).then(function (j) {
        FS.storage.set('fso_login', JSON.stringify({ name: n, code: j.code }));
        M.code = j.code;
        M.newFarmScreen(j.code);
      }).catch(function (e) { M.loginScreen(e.message); });
    };
    $('iCode').onkeydown = function (e) { if (e.key === 'Enter') $('bLogin').click(); };
  };
  function titleArt() {
    return '<div class="title"><img src="' + FS.gfx.url('home2', 1.5) + '" alt=""><div><h1>FarmSim Online</h1></div><img src="' + FS.gfx.url('m_tractor', 4) + '" alt=""></div>';
  }

  function doLogin(name, code) {
    if (!name || !code) return M.loginScreen('Kirjoita nimimerkki ja salakoodi.');
    FS.net.login(name, code).then(function (j) {
      FS.storage.set('fso_login', JSON.stringify({ name: name, code: code }));
      M.code = code;
      if (!j.state) return M.newFarmScreen();
      var G;
      try { G = FS.deserialize(j.state); } catch (e) { return M.loginScreen('Tallennuksen lataus epäonnistui: ' + e.message); }
      var away = Math.max(0, (j.now || Date.now() / 1000) - (j.savedAt || j.now));
      M.start(G);
      if (away > 90) M.applyIdle(away);
    }).catch(function (e) { M.loginScreen(e.message); });
  }

  var newOpts = null;
  var FARM_NAMES = ['Peltolan tila', 'Mäkelän tila', 'Niemelän tila', 'Ojalan tila', 'Rantalan tila', 'Koivulan tila', 'Laakson tila', 'Haapalan tila', 'Kivelän tila', 'Myllylän tila'];
  M.newFarmScreen = function (code) {
    M.stop();
    newOpts = newOpts || { region: 'midwest', river: undefined, lake: undefined, seed: (Math.random() * 1e9) >>> 0, farmName: FARM_NAMES[Math.floor(Math.random() * FARM_NAMES.length)] };
    var r = FS.REGION[newOpts.region];
    var river = newOpts.river !== undefined ? newOpts.river : r.river, lake = newOpts.lake !== undefined ? newOpts.lake : r.lake;
    screen('<div class="card newfarm">' + titleArt() +
      (code ? '<div class="codebox">Salakoodisi on <b>' + esc(code) + '</b><br><small>Kirjoita se muistiin! Tarvitset koodin jatkaaksesi tilaa toisella laitteella.</small></div>' : '') +
      '<h2>Valitse alue</h2><div class="regions">' + FS.REGIONS.map(function (rg) {
        var avg = rg.t.reduce(function (a, b) { return a + b; }, 0) / 12, rain = rg.r.reduce(function (a, b) { return a + b; }, 0);
        return '<button class="reg' + (rg.id === newOpts.region ? ' on' : '') + '" data-r="' + rg.id + '"><b>' + esc(rg.name) + '</b><small>' + esc(rg.desc) + '</small>' +
          '<span class="cl"><i title="Lämpötila" style="width:' + FS.clamp((avg - 30) / 50 * 100, 5, 100) + '%" class="t"></i></span><span class="cl"><i title="Sade" style="width:' + FS.clamp(rain / 130 * 100, 5, 100) + '%" class="r"></i></span><span class="cl"><i title="Tuuli" style="width:' + FS.clamp(rg.wind / 14 * 100, 5, 100) + '%" class="w"></i></span></button>';
      }).join('') + '</div><div class="legend"><span class="t"></span>lämpö <span class="r"></span>sade <span class="w"></span>tuuli</div>' +
      '<div class="nfrow"><canvas id="preview" width="192" height="192"></canvas><div>' +
      '<label>Tilan nimi <input id="iFarm" maxlength="24" value="' + esc(newOpts.farmName) + '"></label>' +
      '<div class="chkrow"><label><input type="checkbox" id="cRiver"' + (river ? ' checked' : '') + '><span>Joki</span></label><label><input type="checkbox" id="cLake"' + (lake ? ' checked' : '') + '><span>Järvi</span></label></div>' +
      '<p class="fine">Tontin kivisyys, metsäisyys ja maaperä riippuvat ilmastosta. Vesistö auttaa kastelussa, mutta tulva-alue on riski.</p>' +
      '<div class="btnrow"><button id="bShuffle">Arvo uusi maasto</button><button id="bPlay" class="big">Aloita!</button></div>' +
      (M.G ? '<button id="bBack">Peruuta</button>' : '') + '</div></div></div>');
    var prevG = FS.newGame({ region: newOpts.region, river: river, lake: lake, seed: newOpts.seed, farmName: newOpts.farmName });
    FS.view.cx = -100; FS.view.cy = -100;
    FS.renderMinimap(prevG, $('preview'), 'property');
    document.querySelectorAll('.reg').forEach(function (b) { b.onclick = function () { newOpts.region = b.dataset.r; newOpts.river = newOpts.lake = undefined; newOpts.farmName = $('iFarm').value; M.newFarmScreen(code); }; });
    $('cRiver').onchange = function () { newOpts.river = this.checked; newOpts.farmName = $('iFarm').value; M.newFarmScreen(code); };
    $('cLake').onchange = function () { newOpts.lake = this.checked; newOpts.farmName = $('iFarm').value; M.newFarmScreen(code); };
    $('bShuffle').onclick = function () { newOpts.seed = (Math.random() * 1e9) >>> 0; newOpts.farmName = $('iFarm').value; M.newFarmScreen(code); };
    $('bPlay').onclick = function () {
      prevG.farmName = ($('iFarm').value.trim() || 'Tila').slice(0, 24);
      newOpts = null;
      M.start(prevG);
      M.save(false);
      ui.open('help');
    };
    if ($('bBack')) $('bBack').onclick = function () { M.start(M.G); };
  };

  /* ---------- Peli käyntiin ---------- */

  var built = false;
  M.start = function (G) {
    M.G = G; ui.setGame(G);
    hideScreen();
    if (!built) {
      built = true;
      ui.buildMenus(); ui.buildCtrlbar(); ui.buildToolbar(); ui.bindWindows();
      FS.initView($('cv')); ui.bindView();
      window.addEventListener('resize', function () { FS.resizeView(); });
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', function () { if (M.G) M.save(false, true); });
    }
    Object.keys(ui.wins).forEach(function (id) { ui.close(id); });
    FS.resizeView();
    FS.view.zoom = window.innerWidth < 700 ? 2 : 2;
    FS.centerOn(G.home.x + 8, G.home.y + 6);
    ui.setTool('examine');
    ui.updateCtrl();
    M.lastSave = Date.now();
    M.running = true;
    M.lastT = performance.now();
    if (!M.raf) M.raf = requestAnimationFrame(loop);
    if (G.town.vote) ui.open('vote');
  };
  M.stop = function () { M.running = false; };

  M.setSpeed = function (s) {
    if (s > 0) M.lastSpeed = s;
    M.speed = s; M.acc = 0;
    ui.updateCtrl();
  };

  var uiTick = 0, liveTick = 0;
  function loop(t) {
    M.raf = requestAnimationFrame(loop);
    var dt = Math.min(250, t - (M.lastT || t)); M.lastT = t;
    var G = M.G;
    if (!M.running || !G) return;
    var ms = MS_PER_DAY[M.speed];
    if (ms && !G.gameOver && !ui.wins.vote && !ui.wins.idle) {
      M.acc += dt;
      var steps = 0;
      while (M.acc >= ms && steps < 8) { M.acc -= ms; FS.stepDay(G); steps++; M.dirty = true; afterDay(G); }
      if (steps >= 8) M.acc = 0;
    }
    FS.render(G, ms ? M.acc / ms : 0.999, t);
    uiTick += dt; liveTick += dt;
    if (uiTick > 250) { uiTick = 0; ui.updateCtrl(); }
    if (liveTick > 1000) { liveTick = 0; ui.refreshLive(); }
    if (M.dirty && Date.now() - M.lastSave > AUTOSAVE_MS) M.save(false);
  }

  function afterDay(G) {
    if (G.evalPending) { G.evalPending = null; ui.open('eval'); FS.sound.play('good'); }
    if (G.town.vote && !ui.wins.vote) ui.open('vote');
    if (G.gameOver && !ui.wins.gameover) { ui.open('gameover'); FS.sound.play('bad'); }
  }

  /* ---------- Idle ---------- */

  M.applyIdle = function (awaySec) {
    var G = M.G;
    if (!G) return;
    var R = FS.runIdle(G, awaySec);
    if (!R) return;
    ui.idleSummary = R;
    ui.open('idle');
    ui.refreshAll();
    M.dirty = true;
    if (R.days > 0) M.save(false);
  };
  function onVisibility() {
    if (!M.G) return;
    if (document.hidden) { M.hiddenAt = Date.now(); M.save(false, true); }
    else if (M.hiddenAt) {
      var away = (Date.now() - M.hiddenAt) / 1000;
      M.hiddenAt = 0;
      M.lastT = performance.now();
      if (away > 120) M.applyIdle(away);
    }
  }

  /* ---------- Tallennus ---------- */

  M.save = function (manual, beacon) {
    var G = M.G;
    if (!G || !FS.net.name) return;
    M.lastSave = Date.now(); M.dirty = false;
    var meta = { worth: FS.netWorth(G), year: FS.dateOf(G.day).year, farm: G.farmName, region: G.region };
    FS.net.save(FS.serialize(G), meta, beacon).then(function (j) {
      if (manual) ui.toast('Tila tallennettu.', 'good');
      else if (j && !beacon) ui.status('Tallennettu ' + new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' }) + '.');
    }).catch(function (e) {
      M.dirty = true;
      ui.toast('Tallennus epäonnistui: ' + e.message, 'bad');
      if (e.code === 'token' || e.code === 'auth') M.relogin();
    });
  };
  M.relogin = function () {
    var saved = FS.storage.get('fso_login');
    try { var rec = JSON.parse(saved); FS.net.login(rec.name, rec.code).then(function () { M.save(false); }); } catch (e) { /* ei tallennettua kirjautumista */ }
  };

  M.logout = function () {
    M.save(false);
    FS.storage.del('fso_login');
    M.stop(); M.G = null; FS.net.name = null;
    M.loginScreen();
  };
  M.deleteFarm = function () {
    var code = prompt('Tilan poisto palvelimelta on lopullinen. Kirjoita salakoodisi vahvistukseksi:');
    if (!code) return;
    FS.net.remove(code.trim().toUpperCase()).then(function () {
      FS.storage.del('fso_login');
      M.stop(); M.G = null; FS.net.name = null;
      M.loginScreen('Tila ja nimimerkki poistettiin palvelimelta.');
    }).catch(function (e) { ui.toast(e.message, 'bad'); });
  };

  /* ---------- Käynnistys ---------- */

  function boot() {
    document.body.classList.toggle('retro', !!FS.retro);
    window.onerror = function (m, src, line) { var b = document.body; b.dataset.err = (b.dataset.err || '') + m + ' @' + line + '; '; };
    if (qs.has('local')) FS.net.local = true;
    if (qs.has('demo')) {
      FS.net.local = true; FS.net.name = 'demo';
      var G = FS.newGame({ region: qs.get('region') || 'midwest', seed: 4242, farmName: 'Demotila' });
      if (qs.has('setup')) demoSetup(G);
      M.start(G);
      if (qs.has('days')) { for (var d = 0; d < +qs.get('days'); d++) FS.stepDay(G); G.evalPending = null; }
      if (qs.has('idle')) M.applyIdle(+qs.get('idle') * 3600);
      if (qs.has('open')) { FS.view.selField = +Object.keys(G.fields)[0] || null; qs.get('open').split(',').forEach(function (w) { ui.open(w); }); }
      if (qs.has('zoom')) FS.view.zoom = +qs.get('zoom');
      FS.centerOn(G.home.x + 10, G.home.y + 6);
      return;
    }
    if (qs.has('newfarm')) { FS.net.local = true; FS.net.name = 'demo'; return M.newFarmScreen('KANA-1234'); }
    if (FS.net.local) return M.loginScreen();
    FS.net.check().then(function () { M.loginScreen(); }).catch(function (e) {
      FS.net.local = true;
      M.loginScreen('Palvelin ei vastaa (' + e.message + '). Pelataan paikallisesti tässä selaimessa.');
    });
  }

  /** Testinäkymä: valmiiksi rakennettu tila kuvakaappauksia varten. */
  function demoSetup(G) {
    G.day = 110; FS.initWeather(G);
    var hx = G.homePlot.x * 8, hy = G.homePlot.y * 8;
    G.funds = 60000;
    var crops = ['corn', 'wheat', 'soybeans', 'apples', 'tomatoes'], k = 0;
    [[8, 0], [16, 0], [0, 8], [8, 8], [16, 8]].forEach(function (o) {
      var r = FS.placeField(G, hx + o[0], hy + o[1], crops[k++]);
      if (r.ok) { var f = r.field; f.state = 'growing'; f.crop = f.next; f.prog = [0.95, 0.55, 0.3, 0.7, 0.1][k - 1]; f.health = 85; }
    });
    ['tractor', 'plow', 'planter', 'harvester', 'trailer', 'truck', 'sprayer'].forEach(function (t, j) { FS.buyMachine(G, t, hx + (j % 4) * 2, hy + 6 + Math.floor(j / 4)); });
    FS.placeBuilding(G, 'silo_l', hx + 5, hy + 1);
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
