/* FarmSim Online – käyttöliittymä: valikot, työkalupalkki, ikkunat ja hiiren käsittely. */
'use strict';
(function () {
  var FS = window.FS, O = FS.O, V = FS.view;
  var esc = FS.esc, money = FS.money, img = FS.gfx.img;
  var ui = FS.ui = { tool: 'examine', place: null, spray: null, wins: {}, z: 10, buyTab: 'machines', sellTab: 'crops', expertTab: 'crops', expertItem: 'corn', marketCrop: 'corn', mapMode: 'overview', fem: true };
  var G = null;
  function $(id) { return document.getElementById(id); }

  ui.setGame = function (g) { G = g; };

  /* ---------- Ilmoitukset ---------- */

  ui.toast = function (text, type) {
    var box = $('toasts'), el = document.createElement('div');
    el.className = 'toast t-' + (type || 'info');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); }, type === 'bad' ? 7000 : 4500);
  };
  ui.status = function (text) { $('statusText').textContent = text || ''; };
  FS.onMessage = function (m) {
    if (!G) return;
    if (!G.options.messages && m.type === 'info') return;
    ui.toast(m.text, m.type);
    if (m.type === 'bad' && m.at && ui.autoGoto) FS.centerOn(m.at.x, m.at.y);
    if (ui.wins.log) ui.refresh('log');
  };
  function result(r) {
    if (!r) return;
    if (r.msg) { ui.status(r.msg); if (!r.ok || r.warn) ui.toast(r.msg, 'warn'); }
    ui.refreshAll();
  }

  /* ---------- Valikot ja palkit ---------- */

  var MENUS = [
    { id: 'game', name: 'Peli', items: [['save', 'Tallenna nyt'], ['newfarm', 'Uusi tila…'], ['logout', 'Kirjaudu ulos'], ['delete', 'Poista tilani palvelimelta…']] },
    { id: 'speed', name: 'Nopeus', items: [['sp0', 'Tauko'], ['sp1', 'Hidas'], ['sp2', 'Normaali'], ['sp3', 'Nopea'], ['sp4', 'Ultra']] },
    { id: 'win', name: 'Ikkunat', items: [['w:buy', 'Osta'], ['w:sell', 'Myy'], ['w:map', 'Kartta'], ['w:weather', 'Sää'], ['w:balance', 'Tase'], ['w:bank', 'Pankki'], ['w:market', 'Markkinat'], ['w:expert', 'Asiantuntija'], ['w:eval', 'Arviointi'], ['w:manager', 'Tilanhoitaja (idle)'], ['w:neighbors', 'Naapurit'], ['w:log', 'Viestit']] },
    { id: 'dis', name: 'Katastrofit', items: [['d:tornado', 'Tornado'], ['d:locusts', 'Heinäsirkat'], ['d:drought', 'Kuivuus'], ['d:flood', 'Tulva'], ['d:frost', 'Halla'], ['d:windstorm', 'Myrsky'], ['d:toggle', 'Satunnaiset katastrofit']] },
    { id: 'opt', name: 'Asetukset', items: [['o:retro', 'Alkuperäistyylinen grafiikka (16 väriä)'], ['o:autoBuy', 'AutoOsto (siemenet ja ruiskutteet)'], ['o:autoLease', 'AutoVuokraus (koneet)'], ['o:autoDoze', 'AutoRaivaus'], ['o:messages', 'Kaikki viestit'], ['o:autoGoto', 'Siirry katastrofiin'], ['o:sound', 'Äänet']] },
    { id: 'help', name: 'Ohje', items: [['w:help', 'Pikaohje'], ['w:expert', 'Asiantuntija Joe'], ['about', 'Tietoja pelistä']] }
  ];
  ui.buildMenus = function () {
    $('menubar').innerHTML = '<span class="logo">FarmSim Online</span>' + MENUS.map(function (m) {
      return '<div class="menu" data-menu="' + m.id + '"><button class="mtop">' + m.name + '</button><div class="drop">' +
        m.items.map(function (it) { return '<button data-mi="' + it[0] + '"><span class="chk"></span>' + esc(it[1]) + '</button>'; }).join('') + '</div></div>';
    }).join('') + '<span id="farmTitle"></span>';
    $('menubar').addEventListener('click', function (e) {
      var top = e.target.closest('.mtop');
      if (top) { var m = top.parentNode, open = m.classList.contains('open'); closeMenus(); if (!open) { m.classList.add('open'); updateChecks(); } e.stopPropagation(); return; }
      var mi = e.target.closest('[data-mi]');
      if (mi) { closeMenus(); menuAction(mi.dataset.mi); }
    });
    $('menubar').addEventListener('mouseover', function (e) {
      var m = e.target.closest('.menu');
      if (m && document.querySelector('.menu.open') && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); updateChecks(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.menu')) closeMenus(); });
  };
  function closeMenus() { document.querySelectorAll('.menu.open').forEach(function (m) { m.classList.remove('open'); }); }
  function updateChecks() {
    document.querySelectorAll('[data-mi]').forEach(function (b) {
      var k = b.dataset.mi, on = false;
      if (k.indexOf('o:') === 0) { var o = k.slice(2); on = o === 'autoGoto' ? !!ui.autoGoto : o === 'sound' ? !!FS.sound.on : o === 'retro' ? FS.retro : !!G.options[o]; }
      if (k.indexOf('sp') === 0) on = FS.main.speed === +k.slice(2);
      if (k === 'd:toggle') on = G.options.disasters;
      b.querySelector('.chk').textContent = on ? '✓' : '';
    });
  }
  function menuAction(k) {
    if (k.indexOf('w:') === 0) return ui.open(k.slice(2));
    if (k.indexOf('sp') === 0) { FS.main.setSpeed(+k.slice(2)); return; }
    if (k.indexOf('o:') === 0) {
      var o = k.slice(2);
      if (o === 'retro') { FS.storage.set('fso_retro', FS.retro ? '0' : '1'); FS.main.save(false); ui.toast('Grafiikka vaihtuu – sivu ladataan uudelleen…', 'info'); setTimeout(function () { location.reload(); }, 900); return; }
      if (o === 'autoGoto') ui.autoGoto = !ui.autoGoto;
      else if (o === 'sound') FS.sound.toggle();
      else G.options[o] = !G.options[o];
      ui.status('Asetus päivitetty.');
      return;
    }
    if (k === 'd:toggle') { G.options.disasters = !G.options.disasters; ui.toast('Satunnaiset katastrofit ' + (G.options.disasters ? 'päällä.' : 'pois päältä.'), 'info'); return; }
    if (k.indexOf('d:') === 0) {
      if (G.disaster && G.disaster.daysLeft > 0) return ui.toast('Edellinen katastrofi on vielä käynnissä.', 'warn');
      if (confirm('Käynnistetäänkö katastrofi: ' + FS.DISASTERS.find(function (d) { return d.id === k.slice(2); }).name + '?')) { FS.triggerDisaster(G, k.slice(2)); ui.refreshAll(); }
      return;
    }
    if (k === 'save') return FS.main.save(true);
    if (k === 'newfarm') { if (confirm('Aloitetaanko uusi tila? Nykyinen tila korvataan.')) FS.main.newFarmScreen(); return; }
    if (k === 'logout') return FS.main.logout();
    if (k === 'delete') return FS.main.deleteFarm();
    if (k === 'about') return ui.open('about');
  }

  ui.buildCtrlbar = function () {
    var btns = [['buy', 't_buy', 'Osta'], ['sell', 'm_truckfull', 'Myy'], ['map', 'i_flood', 'Kartta'], ['weather', 'w_partly', 'Sää'], ['balance', 'i_nutr', 'Tase'], ['bank', 'feed', 'Pankki'], ['market', 'w_sun', 'Markkinat'], ['eval', 'home1', 'Arviointi'], ['manager', 'a_horse0', 'Hoitaja'], ['neighbors', 'home2', 'Naapurit']];
    $('ctrlbar').innerHTML = '<div class="cbtns">' + btns.map(function (b) {
      return '<button class="cb" data-open="' + b[0] + '" title="' + b[2] + '">' + img(b[1], b[1].indexOf('home') === 0 ? 0.4 : 1.5) + '<span>' + b[2] + '</span></button>';
    }).join('') + '</div><div class="cinfo"><div id="cDate"></div><div id="cFore"></div><div id="cSpeed"></div><div id="cFunds"></div></div>';
    $('ctrlbar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-open]');
      if (b) ui.toggle(b.dataset.open);
      var s = e.target.closest('[data-speed]');
      if (s) FS.main.setSpeed(+s.dataset.speed);
    });
  };
  var SPEEDS = ['Tauko', 'Hidas', 'Normaali', 'Nopea', 'Ultra'];
  ui.updateCtrl = function () {
    if (!G) return;
    var d = FS.dateOf(G.day);
    $('cDate').innerHTML = '<b>' + d.dom + '. ' + FS.MONTHS_SHORT[d.month] + 'kuuta</b><br>Vuosi ' + d.year + ', vk ' + d.week;
    $('cFore').innerHTML = G.weather.queue.slice(0, 3).map(function (w, k) {
      return '<span class="fc" title="' + (k ? '+' + k + ' pv' : 'Tänään') + '">' + img('w_' + w.sky, 1.5) + '<small>' + FS.tempStr(w.T) + '</small></span>';
    }).join('');
    $('cSpeed').innerHTML = SPEEDS.map(function (s, k) { return '<button data-speed="' + k + '" class="' + (FS.main.speed === k ? 'on' : '') + '" title="' + s + '">' + ['❚❚', '▶', '▶▶', '▶▶▶', '»»'][k] + '</button>'; }).join('');
    $('cFunds').innerHTML = '<span class="' + (G.funds < 0 ? 'neg' : '') + '">' + money(G.funds) + '</span>';
    $('farmTitle').textContent = G.farmName + ' – ' + FS.REGION[G.region].name + (FS.net.local ? ' (paikallinen)' : '');
  };

  /* ---------- Työkalupalkki ---------- */

  ui.buildToolbar = function () {
    var h = '<div id="toolSel" class="toolsel"></div>' + FS.TOOLS.map(function (t) {
      return '<button class="tool" data-tool="' + t.id + '" title="' + esc(t.name + (t.cost ? ' (' + t.cost + ' $)' : '') + ' – ' + t.desc) + ' [' + t.key + ']">' + img('t_' + t.id, 2) + '<span>' + esc(t.short || t.name) + '</span></button>';
    }).join('');
    h += '<button class="tool big" data-tool="plant" title="KYLVÄ: valitse kasvi ja perusta 8×8-pelto">' + img('t_plant', 2) + '<span>KYLVÄ</span></button>';
    h += '<button class="tool big" data-tool="spray" title="RUISKUTA: valitse aine ja klikkaa peltoa">' + img('t_spray', 2) + '<span>RUISKUTA</span></button>';
    h += '<div id="pop" class="pop" hidden></div>';
    $('toolbar').innerHTML = h;
    $('toolbar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]');
      if (b) {
        var t = b.dataset.tool;
        if (t === 'plant') return showPop('plant', b);
        if (t === 'spray') return showPop('spray', b);
        ui.setTool(t);
      }
      var c = e.target.closest('[data-crop]');
      if (c) { hidePop(); ui.startPlace({ kind: 'field', crop: c.dataset.crop }); }
      var s = e.target.closest('[data-sprayp]');
      if (s) { hidePop(); ui.setTool('spray'); ui.spray = s.dataset.sprayp; showSel('Ruiskuta: ' + FS.SPRAY[ui.spray].name); ui.status('Klikkaa peltoa, jolle ruiskutetaan: ' + FS.SPRAY[ui.spray].name.toLowerCase() + '.'); }
    });
    ui.setTool('examine');
  };
  function showPop(kind, anchor) {
    var p = $('pop');
    if (!p.hidden && p.dataset.kind === kind) return hidePop();
    p.dataset.kind = kind;
    if (kind === 'plant') {
      p.innerHTML = '<div class="poph">Valitse kasvi</div><div class="cropgrid">' + FS.CROPS.map(function (c) {
        var okS = FS.seasonOk(G, c.id);
        return '<button data-crop="' + c.id + '" class="' + (okS ? '' : 'risky') + '" title="' + esc(c.name + ' – kasvuaika ' + c.w + ' vk' + (okS ? '' : ' – kylmä kausi, hallariski!') + '. Siemen ' + FS.seedPrice(G, c.id) + ' $') + '">' + img('f_' + c.id + '_ripe', 1.5) + '<span>' + esc(c.name) + '</span></button>';
      }).join('') + '</div><div class="pophint">Punainen = hallariski nyt alueellasi.</div>';
    } else {
      p.innerHTML = '<div class="poph">Ruiskuta</div>' + FS.SPRAYS.map(function (s) {
        return '<button class="wide" data-sprayp="' + s.id + '">' + esc(s.name) + ' <small>(' + (G.sprays[s.id] || 0) + ' varastossa)</small></button>';
      }).join('');
    }
    p.hidden = false;
    var r = anchor.getBoundingClientRect(), tb = $('toolbar').getBoundingClientRect();
    p.style.top = Math.max(0, Math.min(r.top - tb.top, window.innerHeight - tb.top - p.offsetHeight - 8)) + 'px';
  }
  function hidePop() { $('pop').hidden = true; }

  function showSel(text) { var el = $('toolSel'); if (el) el.innerHTML = '<small>Valittu</small><b>' + esc(text) + '</b>'; }

  ui.setTool = function (t) {
    ui.tool = t; ui.place = null; V.preview = null;
    if (t !== 'spray') ui.spray = null;
    document.querySelectorAll('.tool').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === t); });
    var td = FS.TOOL[t];
    ui.status(td ? td.name + (td.cost ? ' (' + td.cost + ' $/ruutu)' : '') + ': ' + td.desc : '');
    showSel(td ? td.name : t === 'spray' ? 'Ruiskuta' : '');
    V.cv && (V.cv.style.cursor = t === 'examine' ? 'help' : t === 'move' ? 'grab' : 'crosshair');
  };

  ui.startPlace = function (p) {
    ui.tool = 'place'; ui.place = p;
    document.querySelectorAll('.tool').forEach(function (b) { b.classList.toggle('on', p.kind === 'field' && b.dataset.tool === 'plant'); });
    var what = p.kind === 'field' ? 'pelto: ' + FS.CROP[p.crop].name : p.kind === 'building' ? FS.BUILDING[p.type].name : p.kind === 'machine' ? FS.MACHINE[p.type].name : FS.ANIMAL[p.type].name;
    showSel('Sijoita ' + what);
    ui.status('Sijoita ' + what + ' klikkaamalla karttaa. Peruuta: Esc tai hiiren oikea.');
    V.cv.style.cursor = 'copy';
  };

  /* ---------- Hiiri ja näppäimistö ---------- */

  var drag = null;
  ui.bindView = function () {
    var cv = V.cv;
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, t = FS.screenToTile(mx, my);
      if (e.button === 2 || e.button === 1) {
        if (ui.place && e.button === 2) { ui.setTool('examine'); return; }
        if (e.button === 2 && toggleAt(t)) return;
        drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: V.cx, cy: V.cy }; return;
      }
      if (e.pointerType === 'touch' && (ui.tool === 'examine')) { drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: V.cx, cy: V.cy, tap: t }; return; }
      drag = { pan: false, last: null, start: t, moved: false };
      applyAt(t, true);
    });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, t = FS.screenToTile(mx, my);
      V.hover = FS.inMap(t.x, t.y) ? t : null;
      updatePreview(t);
      if (!drag) return;
      if (drag.pan) {
        var z = 16 * V.zoom;
        V.cx = drag.cx - (e.clientX - drag.sx) / z; V.cy = drag.cy - (e.clientY - drag.sy) / z;
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 6) drag.tap = null;
        FS.clampCam(); return;
      }
      var td = FS.TOOL[ui.tool];
      if (td && td.drag && (!drag.last || drag.last.x !== t.x || drag.last.y !== t.y)) dragLine(drag.last || drag.start, t);
    });
    cv.addEventListener('pointerup', function (e) {
      if (drag && drag.pan && drag.tap) applyAt(drag.tap, true);
      drag = null;
    });
    cv.addEventListener('pointerleave', function () { V.hover = null; if (!ui.place) V.preview = null; });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = cv.getBoundingClientRect();
      FS.setZoom(V.zoom + (e.deltaY < 0 ? 1 : -1), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (e.target.closest('input,textarea,select')) return;
      var step = 3;
      if (e.key === 'ArrowLeft') V.cx -= step; else if (e.key === 'ArrowRight') V.cx += step;
      else if (e.key === 'ArrowUp') V.cy -= step; else if (e.key === 'ArrowDown') V.cy += step;
      else if (e.key === 'Escape') { ui.setTool('examine'); hidePop(); }
      else if (e.key === ' ') { FS.main.setSpeed(FS.main.speed ? 0 : (FS.main.lastSpeed || 2)); e.preventDefault(); }
      else if (e.key === '+') FS.setZoom(V.zoom + 1, V.w / 2, V.h / 2);
      else if (e.key === '-') FS.setZoom(V.zoom - 1, V.w / 2, V.h / 2);
      else {
        var t = FS.TOOLS.find(function (tt) { return tt.key.toLowerCase() === e.key.toLowerCase(); });
        if (t) ui.setTool(t.id);
        return;
      }
      FS.clampCam();
    });
  };

  function dragLine(a, b) {
    var x = a.x, y = a.y;
    while (x !== b.x || y !== b.y) {
      if (Math.abs(b.x - x) >= Math.abs(b.y - y)) x += b.x > x ? 1 : -1; else y += b.y > y ? 1 : -1;
      applyAt({ x: x, y: y }, false);
    }
    drag.last = { x: b.x, y: b.y };
  }

  function placeRect(t) {
    var p = ui.place;
    if (!p) return null;
    if (p.kind === 'field') return { x: t.x - 3, y: t.y - 3, w: 8, h: 8 };
    if (p.kind === 'building') { var bd = FS.BUILDING[p.type]; return { x: t.x - Math.floor((bd.w - 1) / 2), y: t.y - Math.floor((bd.h - 1) / 2), w: bd.w, h: bd.h }; }
    if (p.kind === 'machine') return { x: t.x, y: t.y, w: FS.MACHINE[p.type].size || 1, h: 1 };
    return { x: t.x, y: t.y, w: 1, h: 1 };
  }
  function updatePreview(t) {
    if (!ui.place || !G) { V.preview = null; return; }
    var r = placeRect(t), p = ui.place, ok;
    if (p.kind === 'field') ok = FS.checkField(G, r.x, r.y).ok;
    else if (p.kind === 'building') ok = FS.checkBuilding(G, p.type, r.x, r.y).ok;
    else if (p.kind === 'machine') ok = FS.checkMachine(G, p.type, r.x, r.y).ok;
    else ok = FS.animalPassable(G, r.x, r.y);
    r.ok = ok;
    r.sprite = p.kind === 'building' ? p.type : p.kind === 'machine' ? 'm_' + p.type : p.kind === 'animal' ? 'a_' + p.type + '0' : null;
    V.preview = r;
  }

  function applyAt(t, first) {
    if (!G || !FS.inMap(t.x, t.y)) return;
    var i = FS.idx(t.x, t.y), o = G.obj[i], r;
    if (ui.place) {
      var p = ui.place, rc = placeRect(t);
      if (p.kind === 'field') r = FS.placeField(G, rc.x, rc.y, p.crop);
      else if (p.kind === 'building') r = FS.placeBuilding(G, p.type, rc.x, rc.y);
      else if (p.kind === 'machine') r = FS.buyMachine(G, p.type, rc.x, rc.y);
      else r = FS.buyAnimal(G, p.type, p.fem, rc.x, rc.y);
      if (r.ok) { FS.sound.play('build'); if (p.kind === 'field' || p.kind === 'building') ui.setTool('examine'); if (r.field) { V.selField = r.field.id; ui.open('field'); } }
      return result(r);
    }
    if (ui.tool === 'examine') return examine(t);
    if (ui.tool === 'move') return moveAt(t);
    if (ui.tool === 'spray') {
      if (o !== O.FIELD || !ui.spray) return result({ ok: false, msg: ui.spray ? 'Klikkaa peltoa.' : 'Valitse ensin ruiskutusaine.' });
      return result(FS.orderSpray(G, G.fields[G.ref[i]], ui.spray));
    }
    if (FS.TOOL[ui.tool]) {
      if (ui.tool === 'doze' && first) {
        if (o === O.FIELD && !confirm('Raivataanko koko pelto?')) return;
        if (o === O.BUILDING && G.ref[i] !== 1 && !confirm('Puretaanko rakennus?')) return;
      }
      if (ui.tool === 'doze' && !first && (o === O.FIELD || o === O.BUILDING)) return;
      r = FS.applyTool(G, ui.tool, t.x, t.y);
      if (r.ok) { FS.sound.play(ui.tool === 'doze' ? 'doze' : 'build'); if (r.msg) ui.status(r.msg); if (r.warn) ui.toast(r.msg, 'warn'); }
      else if (first) result(r);
      ui.refreshSoon();
    }
  }

  var moving = null;
  function moveAt(t) {
    if (moving) {
      var r;
      if (moving.kind === 'machine') r = FS.moveMachine(G, moving.m, t.x, t.y);
      else if (moving.kind === 'tile') {
        var dst = FS.idx(t.x, t.y);
        if (!FS.owned(G, t.x, t.y) || G.obj[dst] !== O.NONE) r = { ok: false, msg: 'Kohderuudun pitää olla vapaa.' };
        else {
          G.obj[dst] = G.obj[moving.i]; G.obj[moving.i] = O.NONE;
          if (G.obj[dst] === O.FEED) { G.feeds[dst] = G.feeds[moving.i]; delete G.feeds[moving.i]; } else { G.troughs[dst] = G.troughs[moving.i]; delete G.troughs[moving.i]; }
          G.regionDirty = true; r = { ok: true, msg: 'Siirretty.' };
        }
      }
      moving = null; V.cv.style.cursor = 'grab';
      return result(r);
    }
    var m = FS.machineAt(G, t.x, t.y);
    if (m) { moving = { kind: 'machine', m: m }; V.cv.style.cursor = 'grabbing'; return ui.status('Valitse kohde: ' + FS.MACHINE[m.type].name + ' (vapaa ruutu, tie tai vaja).'); }
    var i = FS.idx(t.x, t.y);
    if (G.obj[i] === O.BUILDING) {
      var shedM = G.machines.filter(function (mm) { return mm.shed === G.ref[i]; });
      if (shedM.length) { moving = { kind: 'machine', m: shedM[0] }; return ui.status('Valitse kohde: ' + FS.MACHINE[shedM[0].type].name + ' (vajasta ulos).'); }
    }
    if (G.obj[i] === O.FEED || G.obj[i] === O.TROUGH) { moving = { kind: 'tile', i: i }; return ui.status('Valitse uusi paikka.'); }
    // Eläinten paimentaminen: hätistä eläimet pois kohdasta
    var near = G.animals.filter(function (a) { return Math.abs(a.x - t.x) <= 1 && Math.abs(a.y - t.y) <= 1; });
    if (near.length) {
      near.forEach(function (a) {
        var dx = Math.sign(a.x - t.x) || 1, dy = Math.sign(a.y - t.y);
        if (FS.animalPassable(G, a.x + dx, a.y + dy)) { a.px = a.x; a.py = a.y; a.x += dx; a.y += dy; }
      });
      return ui.status('Hätistit eläimiä.');
    }
    ui.status('Valitse siirrettävä kone, rehu tai vesikaukalo.');
  }

  /** Avaa tai sulkee portin/venttiilin. Palauttaa true, jos ruudussa oli sellainen. */
  function toggleAt(t) {
    if (!G || !FS.inMap(t.x, t.y)) return false;
    var o = G.obj[FS.idx(t.x, t.y)];
    if (o !== O.GATE && o !== O.VALVE) return false;
    var r = FS.applyTool(G, o === O.GATE ? 'gate' : 'valve', t.x, t.y);
    FS.sound.play('build');
    ui.status((r.msg || '') + ' (Vihje: hiiren oikea tai Tutki-työkalu avaa ja sulkee millä työkalulla tahansa.)');
    ui.refreshSoon();
    return true;
  }

  function examine(t) {
    if (toggleAt(t)) return;
    var i = FS.idx(t.x, t.y), o = G.obj[i], txt = '';
    var m = FS.machineAt(G, t.x, t.y);
    var a = G.animals.find(function (aa) { return aa.x === t.x && aa.y === t.y; });
    if (a) {
      var ad = FS.ANIMAL[a.type];
      txt = ad.name + ' (' + (a.fem ? 'naaras' : 'uros') + '), ikä ' + (a.age / 364).toFixed(1) + ' v, kunto ' + FS.grade(a.health).name.toLowerCase() + ', arvo ' + money(FS.animalValue(a)) + (a.preg ? ', tiineenä' : '') + (a.hungry ? ', nälkäinen' : '') + (a.thirsty ? ', janoinen' : '');
    } else if (m) {
      txt = FS.MACHINE[m.type].name + ': kunto ' + FS.grade(m.cond).name.toLowerCase() + ' (' + Math.round(m.cond) + ' %), ikä ' + (m.age / 364).toFixed(1) + ' v, arvo ' + money(FS.machineValue(m)) + (m.cond < 20 ? ' – KÄYTTÖKELVOTON' : '');
    } else if (o === O.FIELD) {
      V.selField = G.ref[i]; ui.open('field'); return;
    } else if (o === O.BUILDING) {
      var b = G.buildings[G.ref[i]];
      if (b.type === 'home') { txt = 'Kotitila: ' + FS.HOME_LEVELS[G.homeLevel].name + '. Hyvä vuositulos laajentaa taloa ja parantaa tilanhoitajaa.'; }
      else {
        var bd = FS.BUILDING[b.type];
        txt = bd.name + '. ' + bd.desc;
        if (bd.cap) txt += ' Käytössä ' + FS.shedUse(G, b) + '/' + bd.cap + '.';
        if (bd.silo) txt += ' Siilot yhteensä: ' + G.silo.length + '/' + FS.siloCapacity(G) + ' satoa.';
        if (b.type === 'pump') txt += b.broken ? ' EI TOIMI (tulva/kuivuus).' : b.active ? ' Pumppaa.' : ' Ei ojaa vieressä.';
        if (b.type === 'windmill') txt += b.active ? ' Pyörii.' : ' Tuuli liian heikko.';
        if (b.type === 'tower') txt += b.fed ? ' Täyttyy ojasta.' : ' Ei vettä viereisessä ojassa.' + (b.store ? ' Varastossa ' + b.store + ' pv.' : '');
      }
    } else if (o === O.TOWN) {
      var tt = G.town.types[G.ref[i]];
      if (tt === 'center') { txt = 'Kaupungin keskusta: pankki, kauppa ja Joen kapakka.'; ui.open('bank'); }
      else txt = tt === 'build' ? 'Rakennustyömaa – äänestä kaupungin laajennuksesta.' : FS.TOWN_TYPE[tt].name + ': ' + FS.TOWN_TYPE[tt].desc;
    } else {
      var names = {}; names[O.NONE] = G.terrain[i] === FS.T.WATER ? 'Vesi' : 'Maa'; names[O.ROCK] = 'Kivi'; names[O.TREE] = 'Puu'; names[O.BUSH] = 'Pensas'; names[O.PAVED] = 'Asfalttitie'; names[O.DIRT_ROAD] = 'Hiekkatie';
      names[O.FENCE] = 'Aita'; names[O.GATE] = 'Portti (' + ((G.flag[i] & 1) ? 'auki' : 'kiinni') + ')'; names[O.DITCH] = 'Oja (' + ((G.flag[i] & 2) ? 'vettä' : 'kuiva') + ')';
      names[O.VALVE] = 'Venttiili (' + ((G.flag[i] & 1) ? 'auki' : 'kiinni') + ')'; names[O.BRIDGE] = 'Silta'; names[O.FEED] = 'Rehu: ' + Math.round((G.feeds[i] || 0) * 100) + ' %'; names[O.TROUGH] = 'Vesikaukalo: ' + Math.round((G.troughs[i] || 0) * 100) + ' %';
      var pl = FS.plotOf(t.x, t.y), plot = G.plots[pl];
      txt = (names[o] || '') + ' – tontti ' + (plot.owner === 1 ? 'oma' : plot.owner === 2 ? 'kaupungin' : 'myytävänä ' + money(FS.plotValue(G, pl))) + ', pohjavesi ' + FS.groundwater(G, pl).toFixed(1) + '/11, ravinteet ' + Math.round(plot.nutr);
    }
    ui.status(txt);
  }

  /* ---------- Ikkunat ---------- */

  var W = {};   // ikkunamääritykset: {title, w, render(), after(el)}
  ui.open = function (id) {
    if (!W[id]) return;
    var el = ui.wins[id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'win'; el.dataset.win = id;
      el.innerHTML = '<div class="wt"><button class="wx" data-act="close" title="Sulje">✕</button><span></span></div><div class="wc"></div>';
      $('windows').appendChild(el);
      ui.wins[id] = el;
      var w = W[id].w || 360, pos = W[id].pos || cascade(w);
      el.style.width = Math.min(w, window.innerWidth - 16) + 'px';
      el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
      dragWin(el);
    }
    el.style.zIndex = ++ui.z;
    ui.refresh(id);
    keepInside(el);
    document.querySelectorAll('[data-open="' + id + '"]').forEach(function (b) { b.classList.add('on'); });
  };
  var casc = 0;
  /** Etsii uudelle ikkunalle paikan, joka peittää mahdollisimman vähän muita ikkunoita. */
  function cascade(w) {
    var vw = window.innerWidth, vh = window.innerHeight, top = 74;
    var rects = Object.keys(ui.wins).map(function (k) { return ui.wins[k].getBoundingClientRect(); });
    var cands = [];
    for (var x = vw - w - 10; x >= 70; x -= Math.max(60, Math.floor(w / 2))) for (var y = top; y < vh - 220; y += 60) cands.push({ x: x, y: y });
    cands.push({ x: 72, y: top });
    var best = null, bestCost = 1e12;
    cands.forEach(function (c) {
      var cost = 0;
      rects.forEach(function (r) {
        var ox = Math.max(0, Math.min(c.x + w, r.right) - Math.max(c.x, r.left)), oy = Math.max(0, Math.min(c.y + 420, r.bottom) - Math.max(c.y, r.top));
        cost += ox * oy;
      });
      cost += c.y * 2 + (vw - c.x - w) * 0.5;
      if (cost < bestCost) { bestCost = cost; best = c; }
    });
    if (!best || bestCost > 60000 + top * 2) { casc = (casc + 1) % 6; return { x: Math.max(70, vw - w - 30 - casc * 26), y: top + casc * 24 }; }
    return best;
  }
  function keepInside(el) {
    var r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight) el.style.top = Math.max(74, window.innerHeight - r.height - 4) + 'px';
    if (r.right > window.innerWidth) el.style.left = Math.max(4, window.innerWidth - r.width - 4) + 'px';
  }
  ui.close = function (id) {
    var el = ui.wins[id];
    if (el) { el.parentNode.removeChild(el); delete ui.wins[id]; }
    document.querySelectorAll('[data-open="' + id + '"]').forEach(function (b) { b.classList.remove('on'); });
    if (id === 'field') V.selField = null;
    if (W[id] && W[id].onClose) W[id].onClose();
  };
  ui.toggle = function (id) { if (ui.wins[id]) ui.close(id); else ui.open(id); };
  ui.refresh = function (id) {
    var el = ui.wins[id];
    if (!el || !G) return;
    var def = W[id];
    var c = el.querySelector('.wc'), st = c.scrollTop;
    var active = document.activeElement && el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' ? document.activeElement : null;
    if (active && active.type !== 'range') return; // ei häiritä kirjoittamista
    el.querySelector('.wt span').textContent = typeof def.title === 'function' ? def.title() : def.title;
    c.innerHTML = def.render();
    c.scrollTop = st;
    if (def.after) def.after(c);
  };
  ui.refreshAll = function () { Object.keys(ui.wins).forEach(function (id) { if (!W[id].manual) ui.refresh(id); }); ui.updateCtrl(); };
  var soonT = null;
  ui.refreshSoon = function () { if (soonT) return; soonT = setTimeout(function () { soonT = null; ui.refreshAll(); }, 150); };
  ui.refreshLive = function () { Object.keys(ui.wins).forEach(function (id) { if (W[id].live) ui.refresh(id); }); };

  function dragWin(el) {
    var t = el.querySelector('.wt'), d = null;
    t.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      d = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop }; t.setPointerCapture(e.pointerId);
    });
    t.addEventListener('pointermove', function (e) {
      if (!d) return;
      el.style.left = FS.clamp(d.l + e.clientX - d.x, -el.offsetWidth + 60, window.innerWidth - 60) + 'px';
      el.style.top = FS.clamp(d.t + e.clientY - d.y, 0, window.innerHeight - 30) + 'px';
    });
    t.addEventListener('pointerup', function () { d = null; });
    el.addEventListener('pointerdown', function () { el.style.zIndex = ++ui.z; });
  }

  ui.bindWindows = function () {
    $('windows').addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var win = a.closest('.win'), id = win && win.dataset.win;
      if (a.dataset.act === 'close') return ui.close(id);
      act(a.dataset.act, a.dataset, id, a);
    });
    $('windows').addEventListener('input', function (e) {
      if (e.target.id === 'idleSlider') { G.idle.eff = +e.target.value / 100; updateIdleInfo(e.target.closest('.wc')); }
    });
    $('windows').addEventListener('change', function (e) {
      if (e.target.id === 'idleSlider') { ui.refresh('manager'); FS.main.dirty = true; }
      if (e.target.dataset.act === 'repeat') { var f = G.fields[V.selField]; if (f) { f.repeat = e.target.checked; ui.refresh('field'); } }
    });
  };

  function act(name, d, win, el) {
    var f = V.selField ? G.fields[V.selField] : null, r = null;
    switch (name) {
      case 'tab': ui[d.key] = d.val; ui.refresh(win); return;
      case 'buyM': ui.startPlace({ kind: 'machine', type: d.id }); if (d.id === 'duster') { result(FS.buyMachine(G, 'duster')); ui.setTool('examine'); } return;
      case 'buyB': ui.startPlace({ kind: 'building', type: d.id }); return;
      case 'buyA': ui.startPlace({ kind: 'animal', type: d.id, fem: d.fem === '1' }); return;
      case 'buySeed': r = FS.buySeeds(G, d.id, +d.n); break;
      case 'buySpray': r = FS.buySpray(G, d.id, +d.n); break;
      case 'sellCrop': r = { ok: true, msg: 'Sato myyty: ' + money(FS.sellStored(G, +d.i)) + '.' }; FS.sound.play('cash'); break;
      case 'sellAllCrops': var tot = 0; while (G.silo.length) tot += FS.sellStored(G, 0); r = { ok: true, msg: 'Kaikki sadot myyty: ' + money(tot) + '.' }; FS.sound.play('cash'); break;
      case 'sellM': r = FS.sellMachine(G, G.machines.find(function (m) { return m.id === +d.id; })); break;
      case 'sellA': r = FS.sellAnimal(G, G.animals.find(function (a) { return a.id === +d.id; })); break;
      case 'goto': FS.centerOn(+d.x, +d.y); return;
      case 'nextCrop': if (f) r = FS.setNextCrop(G, f, d.id); break;
      case 'harvestNow': if (f) r = FS.harvestNow(G, f); break;
      case 'cutNow': if (f && confirm('Lopetetaanko kasvusto nyt? Sato menetetään.')) r = FS.cutField(G, f, true); break;
      case 'spray': if (f) r = FS.orderSpray(G, f, d.id); break;
      case 'duster': r = FS.dusterSpray(G, d.id); break;
      case 'contract': if (f && confirm('Myydäänkö pellon seuraava sato etukäteen nykyhintaan? Maksu tulee sadonkorjuussa laadun mukaan.')) r = FS.contract(G, f); break;
      case 'dozeField': if (f && confirm('Raivataanko pelto?')) { r = FS.doze(G, f.x, f.y); ui.close('field'); } break;
      case 'mapMode': ui.mapMode = d.id; ui.refresh('map'); return;
      case 'buyPlot': r = FS.buyPlot(G, V.selPlot); break;
      case 'sellPlot': if (confirm('Myydäänkö tontti?')) r = FS.sellPlot(G, V.selPlot); break;
      case 'loan': var amt = +(document.getElementById('loanAmt') || {}).value || 0; r = FS.takeLoan(G, amt) ? { ok: true, msg: 'Laina myönnetty: ' + money(amt) + '.' } : { ok: false, msg: 'Laina ylittää luottorajan tai summa on virheellinen.' }; ui.refresh('bank'); break;
      case 'repay': r = FS.repayAll(G) ? { ok: true, msg: 'Lainat maksettu.' } : { ok: false, msg: 'Rahat eivät riitä lainojen maksuun.' }; ui.refresh('bank'); break;
      case 'market': ui.marketCrop = d.id; ui.refresh('market'); return;
      case 'expert': ui.expertItem = d.id; ui.refresh('expert'); return;
      case 'vote': ui.voteResult = FS.voteTown(G, d.id); ui.close('vote'); ui.open('voteResult'); ui.refreshAll(); return;
      case 'idlePreset': G.idle.eff = Math.min(FS.idleLimits(G).max, +d.v); FS.main.dirty = true; ui.refresh('manager'); return;
      case 'reloadTop': ui.loadTop(); return;
      case 'closeIdle': ui.close('idle'); return;
      case 'newFarm': FS.main.newFarmScreen(); return;
    }
    result(r);
  }

  /* ---------- Ikkunoiden sisällöt ---------- */

  function tabs(key, list) {
    return '<div class="tabs">' + list.map(function (t) { return '<button data-act="tab" data-key="' + key + '" data-val="' + t[0] + '" class="' + (ui[key] === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  function bar(v, cls, label) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + FS.clamp(v, 0, 100) + '%"></i>' + (label ? '<b>' + label + '</b>' : '') + '</div>'; }
  var BADZ = [[0, 0.4, '#00aa04'], [0.4, 0.6, '#fff204'], [0.6, 1, '#c20404']];
  var GOODZ = [[0, 0.25, '#c20404'], [0.25, 0.4, '#fff204'], [0.4, 1, '#00aa04']];
  /** Puoliympyrän muotoinen osoitinmittari (kuten 90-luvun peleissä). pos 0–1, zones = [[alku, loppu, väri]]. */
  function dial(name, pos, zones) {
    function pt(t, r) { var a = Math.PI * (1 - FS.clamp(t, 0, 1)); return (32 + Math.cos(a) * r).toFixed(1) + ',' + (34 - Math.sin(a) * r).toFixed(1); }
    var arcs = zones.map(function (z) {
      var a0 = FS.clamp(z[0], 0, 1), a1 = FS.clamp(z[1], 0, 1);
      if (a1 <= a0) return '';
      return '<path d="M' + pt(a0, 27) + ' A27,27 0 0 1 ' + pt(a1, 27) + ' L' + pt(a1, 15) + ' A15,15 0 0 0 ' + pt(a0, 15) + 'Z" fill="' + z[2] + '"/>';
    }).join('');
    return '<div class="dial"><svg viewBox="0 0 64 38"><path d="M3,34 A29,29 0 0 1 61,34 Z" fill="#c2c2c2" stroke="#404040" stroke-width="2"/>' + arcs +
      '<line x1="32" y1="34" x2="' + pt(pos, 25).split(',')[0] + '" y2="' + pt(pos, 25).split(',')[1] + '" stroke="#000" stroke-width="2.5"/><circle cx="32" cy="34" r="3" fill="#000"/></svg><span>' + name + '</span></div>';
  }
  function gauge(name, v, bad) { // v 0..100, bad = suunta (true: korkea huono)
    var q = bad ? v : 100 - v, cls = q > 60 ? 'red' : q > 35 ? 'yellow' : 'green';
    return '<div class="gauge"><span>' + name + '</span>' + bar(v, cls) + '</div>';
  }
  function owned(type) { return G.machines.filter(function (m) { return m.type === type; }).length; }

  W.buy = {
    title: 'Osta', w: 460,
    render: function () {
      var h = tabs('buyTab', [['machines', 'Koneet'], ['seeds', 'Siemenet'], ['animals', 'Eläimet'], ['buildings', 'Rakennukset'], ['sprays', 'Ruiskutteet']]) + '<div class="items">';
      if (ui.buyTab === 'machines') h += FS.MACHINES.map(function (m) {
        var dis = m.needs && !FS.townHas(G, m.needs);
        return item('m_' + m.id, m.name, m.price, m.desc + (dis ? ' (Vaatii lentokentän.)' : ''), 'Omistat: ' + owned(m.id), '<button data-act="buyM" data-id="' + m.id + '"' + (dis ? ' disabled' : '') + '>Osta</button>');
      }).join('');
      if (ui.buyTab === 'buildings') h += FS.BUILDINGS.map(function (b) {
        var n = Object.keys(G.buildings).filter(function (k) { return G.buildings[k].type === b.id; }).length;
        return item(b.id, b.name + ' (' + b.w + '×' + b.h + ')', b.price, b.desc, 'Omistat: ' + n, '<button data-act="buyB" data-id="' + b.id + '">Osta</button>');
      }).join('');
      if (ui.buyTab === 'animals') h += FS.ANIMALS.map(function (a) {
        var n = G.animals.filter(function (x) { return x.type === a.id; }).length;
        return item('a_' + a.id + '0', a.name, a.price, 'Elää ' + Math.round(a.life / 364) + ' v, syö ' + a.feed + ' paalia/kk, sukukypsä ' + (a.mate >= 364 ? Math.round(a.mate / 364) + ' v' : Math.round(a.mate / 30) + ' kk') + ', tiineys ' + Math.round(a.gest / 30) + ' kk. Aitaa ensin!', 'Omistat: ' + n,
          '<button data-act="buyA" data-id="' + a.id + '" data-fem="1">Naaras</button><button data-act="buyA" data-id="' + a.id + '" data-fem="0">Uros</button>');
      }).join('');
      if (ui.buyTab === 'seeds') h += '<p class="hint">Etukäteen ostetut siemenet ovat halvempia kuin AutoOsto (+25 %). Hinta seuraa sadon markkina-arvoa.</p>' + FS.CROPS.map(function (c) {
        var p = FS.seedPrice(G, c.id);
        return item('f_' + c.id + '_ripe', c.name, p, (FS.seasonOk(G, c.id) ? 'Sopii kylvettäväksi nyt.' : 'Kylmä kausi – hallariski.') + ' Kasvuaika ' + c.w + ' vk.', 'Varastossa: ' + (G.seeds[c.id] || 0),
          '<button data-act="buySeed" data-id="' + c.id + '" data-n="1">+1</button><button data-act="buySeed" data-id="' + c.id + '" data-n="5">+5</button>', true);
      }).join('');
      if (ui.buyTab === 'sprays') h += FS.SPRAYS.map(function (s) {
        return item('t_spray', s.name, FS.SPRAY_STOCK_PRICE, s.desc + ' AutoOstolla ' + FS.SPRAY_COST + ' $.', 'Varastossa: ' + (G.sprays[s.id] || 0),
          '<button data-act="buySpray" data-id="' + s.id + '" data-n="1">+1</button><button data-act="buySpray" data-id="' + s.id + '" data-n="5">+5</button>');
      }).join('');
      return h + '</div>';
    }
  };
  function item(spr, name, price, desc, own, btns, small) {
    return '<div class="item' + (small ? ' small' : '') + '"><div class="pic">' + img(spr, small ? 2 : FS.gfx.get(spr).width > 32 ? 1 : 2) + '</div><div class="txt"><b>' + esc(name) + '</b> <span class="price">' + money(price) + '</span><br><small>' + esc(desc) + '</small><br><small class="own">' + own + '</small></div><div class="btns">' + btns + '</div></div>';
  }

  W.sell = {
    title: 'Myy', w: 440, live: true,
    render: function () {
      var h = tabs('sellTab', [['crops', 'Sadot'], ['machines', 'Koneet'], ['animals', 'Eläimet']]) + '<div class="list">';
      if (ui.sellTab === 'crops') {
        h += '<p class="hint">Siilot: ' + G.silo.length + '/' + FS.siloCapacity(G) + '. Ilman siiloa sato myydään heti korjuun jälkeen.</p>';
        if (!G.silo.length) h += '<p>Ei myytävää.</p>';
        G.silo.forEach(function (s, k) {
          var c = FS.CROP[s.crop], v = FS.cropPrice(G, s.crop) * s.q / 100, gr = FS.grade(s.q);
          h += '<div class="row">' + img('f_' + c.id + '_ripe', 1.5) + '<span class="grow">' + esc(c.name) + ' <small class="' + gr.cls + '">' + gr.name + '</small></span><b>' + money(v) + '</b><button data-act="sellCrop" data-i="' + k + '">Myy</button></div>';
        });
        if (G.silo.length > 1) h += '<button data-act="sellAllCrops" class="wide">Myy kaikki</button>';
      }
      if (ui.sellTab === 'machines') {
        if (!G.machines.length) h += '<p>Ei koneita.</p>';
        G.machines.forEach(function (m) {
          var gr = FS.grade(m.cond);
          h += '<div class="row">' + img('m_' + m.type, 1) + '<span class="grow">' + FS.MACHINE[m.type].name + ' <small class="' + gr.cls + '">' + gr.name + (m.cond < 20 ? ' (rikki)' : '') + '</small>' + (m.shed ? ' <small>vajassa</small>' : '') + '</span><b>' + money(FS.machineValue(m)) + '</b><button data-act="sellM" data-id="' + m.id + '"' + (m.busy ? ' disabled' : '') + '>Myy</button></div>';
        });
      }
      if (ui.sellTab === 'animals') {
        if (!G.animals.length) h += '<p>Ei eläimiä.</p>';
        G.animals.forEach(function (a) {
          var gr = FS.grade(a.health);
          h += '<div class="row">' + img('a_' + a.type + '0', 1.5) + '<span class="grow">' + FS.ANIMAL[a.type].name + ' ' + (a.fem ? '♀' : '♂') + ' ' + (a.age / 364).toFixed(1) + ' v <small class="' + gr.cls + '">' + gr.name + '</small>' + (a.preg ? ' <small>tiineenä</small>' : '') + '</span><b>' + money(FS.animalValue(a)) + '</b><button data-act="sellA" data-id="' + a.id + '">Myy</button></div>';
        });
      }
      return h + '</div>';
    }
  };

  var STATE_TXT = { wait: 'Odottaa kyntöä ja kylvöä', queued: 'Jonossa: kyntö ja kylvö', planting: 'Kyntö ja kylvö käynnissä', growing: 'Kasvaa', ready: 'Valmis korjattavaksi', fallow: 'Kesannolla', dead: 'Sato tuhoutunut' };
  W.field = {
    title: function () { var f = G.fields[V.selField]; return f ? 'Pelto – ' + (f.crop ? FS.CROP[f.crop].name : f.next ? FS.CROP[f.next].name + ' (tulossa)' : 'kesanto') : 'Pelto'; },
    w: 470, live: true,
    render: function () {
      var f = G.fields[V.selField];
      if (!f) return '<p>Valitse pelto Tutki-työkalulla.</p>';
      var c = f.crop && FS.CROP[f.crop], st = STATE_TXT[f.state] || f.state;
      if (f.state === 'wait') st += f.deferred ? ' – odottaa sopivaa kylvökautta' : ' (' + f.wait + ' pv)';
      if (f.job) st = FS.JOBS[f.job.type].name + ' käynnissä (' + f.job.days + ' pv)' + (f.job.leased ? ' – vuokrakoneilla' : '');
      var q = G.jobQueue.find(function (x) { return x.field === f.id; });
      if (q && !f.job) st += ' – jonossa: ' + FS.JOBS[q.type].name.toLowerCase() + (q.warned ? ' (koneita tai tarvikkeita puuttuu)' : '');
      var h = '<div class="fhead"><div class="big">' + img(c ? 'f_' + c.id + '_' + (f.prog > 0.88 ? 'ripe' : f.prog > 0.5 ? 'mature' : 'young') : 'f_fallow', 3) + '</div><div><b>' + esc(st) + '</b>';
      if (c && (f.state === 'growing' || f.state === 'ready')) {
        var qv = FS.cropQuality(f), gr = FS.grade(f.health), total = c.perennial && f.est ? c.regrowDays : c.days;
        h += '<div class="lbl">Kypsyys</div>' + bar(f.prog * 100, 'green', Math.round(f.prog * 100) + ' %');
        h += '<div>Laatu: <b class="' + gr.cls + '">' + gr.name + '</b> (' + Math.round(f.health) + ')</div>';
        h += '<div>Arvo nyt: <b>' + money(FS.cropPrice(G, c.id) * qv) + '</b>, täysi sato ' + money(FS.cropPrice(G, c.id)) + '</div>';
        if (f.state === 'growing') h += '<div>Arvioitu korjuu: ~' + Math.max(1, Math.round((1 - f.prog) * total / 7 / 0.9)) + ' vk</div>';
        if (c.temp.t === 'chill') h += '<div>Kylmäkertymä: ' + Math.round(f.chill) + ' / ' + c.temp.v[0] + '</div>';
      }
      if (f.contract) h += '<div class="contract">Futuurisopimus: ' + FS.CROP[f.contract.crop].name + ' ' + money(f.contract.price) + '</div>';
      h += '<div><small>Satoja: ' + f.harvests + (f.lastValue ? ', viimeisin ' + money(f.lastValue) : '') + '</small></div></div></div>';
      var ideal = c ? c.moist : 5.5;
      var wz = [[0, (ideal - 4.5) / 11, '#c20404'], [(ideal - 4.5) / 11, (ideal - 2.5) / 11, '#fff204'], [(ideal - 2.5) / 11, (ideal + 2.5) / 11, '#00aa04'], [(ideal + 2.5) / 11, (ideal + 4.5) / 11, '#fff204'], [(ideal + 4.5) / 11, 1, '#0000ea']];
      h += '<div class="dials">' + dial('Taudit', f.disease / 100, BADZ) + dial('Tuholaiset', f.pests / 100, BADZ) + dial('Rikat', f.weeds / 100, BADZ) +
        dial('Vesi', f.moist / 11, wz) + dial('Ravinteet', f.nutr / 100, GOODZ) + dial('Myrkyt', f.tox / 100, BADZ) + '</div>';
      if (c) h += '<div class="hint" style="text-align:center">Vesi: ' + (f.moist < c.moist - 2.5 ? 'liian kuiva' : f.moist > c.moist + 2.5 ? 'liian märkä' : 'sopiva') + '</div>';
      h += '<div class="env">Tuulensuoja: ' + (f.wb >= 8 ? '✓' : '✗') + ' (' + f.wb + '/8 puuta) · Kastelu: ' + (f.dw > 0 ? Math.round(f.dw * 100) + ' %' : '–') + ' · Salaoja: ' + (f.dd > 0 ? Math.round(f.dd * 100) + ' %' : '–') + ' · Tie: ' + (f.road ? '✓' : '✗') + '</div>';
      h += '<div class="lbl">Seuraava kylvö: ' + (f.next ? esc(FS.CROP[f.next].name) : '–') + ' <label class="rep"><input type="checkbox" data-act="repeat"' + (f.repeat ? ' checked' : '') + '> toista kierto</label></div><div class="cropgrid sm">' + FS.CROPS.map(function (cc) {
        var okS = FS.seasonOk(G, cc.id);
        return '<button data-act="nextCrop" data-id="' + cc.id + '" class="' + (f.next === cc.id ? 'on ' : '') + (okS ? '' : 'risky') + '" title="' + esc(cc.name + ', ' + cc.w + ' vk' + (okS ? '' : ' – hallariski nyt')) + '">' + img('f_' + cc.id + '_ripe', 1) + '</button>';
      }).join('') + '</div>';
      h += '<div class="btnrow"><button data-act="harvestNow"' + (c && f.state === 'growing' ? '' : ' disabled') + '>Korjaa nyt</button><button data-act="cutNow"' + (c ? '' : ' disabled') + '>Lopeta kasvusto</button><button data-act="contract"' + (f.contract || !(f.crop || f.next) ? ' disabled' : '') + ' title="Myy seuraava sato nykyhintaan">Futuuri ' + ((f.crop || f.next) ? money(FS.cropPrice(G, f.crop || f.next)) : '') + '</button><button data-act="dozeField">Raivaa</button></div>';
      h += '<div class="btnrow">' + FS.SPRAYS.map(function (s) { return '<button data-act="spray" data-id="' + s.id + '" title="' + esc(s.desc) + '">' + esc(s.name) + ' <small>(' + (G.sprays[s.id] || 0) + ')</small></button>'; }).join('') + '</div>';
      if (owned('duster')) h += '<div class="btnrow"><b>Ruiskutuskone (kaikki pellot):</b> ' + FS.SPRAYS.map(function (s) { return '<button data-act="duster" data-id="' + s.id + '">' + esc(s.name) + '</button>'; }).join('') + '</div>';
      return h;
    }
  };

  W.map = {
    title: 'Kartta', w: 330, live: true,
    render: function () {
      var h = '<div class="mapmodes">' + FS.MAP_MODES.map(function (m) { return '<button data-act="mapMode" data-id="' + m.id + '" class="' + (ui.mapMode === m.id ? 'on' : '') + '">' + m.name + '</button>'; }).join('') + '</div>';
      h += '<canvas id="mini" width="288" height="288"></canvas>';
      if (ui.mapMode === 'property') {
        if (V.selPlot >= 0) {
          var pl = G.plots[V.selPlot];
          h += '<div class="plotinfo"><b>Tontti ' + (V.selPlot % 12 + 1) + ',' + (Math.floor(V.selPlot / 12) + 1) + '</b> – ' + (pl.owner === 1 ? 'oma' : pl.owner === 2 ? 'kaupungin' : 'myytävänä') +
            '<br>Hinta: <b>' + money(FS.plotValue(G, V.selPlot)) + '</b> · Ravinteet ' + Math.round(pl.nutr) + ' · Pohjavesi ' + FS.groundwater(G, V.selPlot).toFixed(1) + ' · Kivisyys ' + Math.round(pl.rock * 100) + ' % · Myrkyt ' + Math.round(pl.tox) + ' · Vettä ' + pl.water + ' ruutua' +
            '<br>' + (pl.owner === 0 ? '<button data-act="buyPlot">Osta tontti</button>' : pl.owner === 1 ? '<button data-act="sellPlot">Myy tontti</button>' : '') + '</div>';
        } else h += '<p class="hint">Klikkaa tonttia nähdäksesi hinnan. Vihreä = oma, sininen = kaupunki.</p>';
      } else if (ui.mapMode !== 'overview') h += '<p class="hint">Vihreä = hyvä, punainen = huono. Klikkaa siirtyäksesi.</p>';
      return h;
    },
    after: function (c) {
      var cv = c.querySelector('#mini');
      FS.renderMinimap(G, cv, ui.mapMode);
      cv.onpointerdown = function (e) {
        var r = cv.getBoundingClientRect(), tx = (e.clientX - r.left) / r.width * FS.MAP, ty = (e.clientY - r.top) / r.height * FS.MAP;
        if (ui.mapMode === 'property') { V.selPlot = FS.plotOf(Math.floor(tx), Math.floor(ty)); ui.refresh('map'); }
        else { FS.centerOn(tx, ty); FS.renderMinimap(G, cv, ui.mapMode); }
      };
    }
  };

  W.weather = {
    title: 'Sää', w: 340, live: true,
    render: function () {
      var w = G.weather, d = FS.dateOf(G.day);
      var h = '<div class="wtop"><div>Viikko ' + d.week + ', ' + FS.MONTHS[d.month] + '<br>' + FS.seasonName(d.season) + ' → ' + FS.seasonName((d.season + 1) % 4) + '</div>' + img('w_' + w.sky, 4) + '<div class="temp">' + FS.tempStr(w.T) + '<br><small>' + Math.round(w.T) + ' °F</small></div></div>';
      h += '<div class="gauge"><span>Haihdunta</span>' + bar(w.evap / 0.6 * 100, w.evap > 0.4 ? 'red' : 'yellow') + '</div>';
      h += '<div class="gauge"><span>Pohjavesi</span>' + bar(w.table / 9 * 100, 'blue') + '</div>';
      h += '<div>Tuuli: <b>' + FS.mphToMs(w.wind).toFixed(1) + ' m/s</b> · Sadepäiviä tänä vuonna: <b>' + w.rainYear + '</b></div>';
      if (G.disaster && G.disaster.daysLeft > 0) h += '<div class="alert">Käynnissä: ' + FS.DISASTERS.find(function (x) { return x.id === G.disaster.id; }).name + ' (' + G.disaster.daysLeft + ' pv)</div>';
      h += '<div class="fore">' + w.queue.slice(1, 6).map(function (q, k) { return '<div>' + img('w_' + q.sky, 2) + '<br>+' + (k + 1) + ' pv<br><b>' + FS.tempStr(q.T) + '</b></div>'; }).join('') + '</div>';
      return h;
    }
  };

  W.balance = {
    title: 'Tase', w: 420, live: true,
    render: function () {
      var Y = G.year, P = FS.yearProfit(Y);
      function rows(obj, names) { return Object.keys(names).map(function (k) { return '<tr><td>' + names[k] + '</td><td>' + money(obj[k] || 0) + '</td></tr>'; }).join(''); }
      var h = '<div class="cols"><table><tr><th colspan=2>Varat</th></tr>' +
        '<tr><td>Kassa</td><td>' + money(G.funds) + '</td></tr><tr><td>Maa</td><td>' + money(FS.landValue(G)) + '</td></tr><tr><td>Koneet</td><td>' + money(FS.machinesValue(G)) + '</td></tr>' +
        '<tr><td>Rakennukset</td><td>' + money(FS.buildingsValue(G)) + '</td></tr><tr><td>Eläimet</td><td>' + money(FS.animalsValue(G)) + '</td></tr><tr><td>Sadot siilossa</td><td>' + money(FS.siloValue(G)) + '</td></tr>' +
        '<tr><td>Velat</td><td>' + money(-FS.debt(G)) + '</td></tr><tr class="sum"><td>Nettovarallisuus</td><td>' + money(FS.netWorth(G)) + '</td></tr></table>';
      h += '<table><tr><th colspan=2>Tulot (tämä vuosi)</th></tr>' + rows(Y.inc, { crops: 'Sadot', futures: 'Futuurit', animals: 'Eläimet', machines: 'Koneet', land: 'Maa', prizes: 'Palkinnot' }) + '<tr class="sum"><td>Yhteensä</td><td>' + money(P.inc) + '</td></tr></table></div>';
      h += '<table class="exp"><tr><th colspan=2>Menot (tämä vuosi)</th></tr>' + rows(Y.exp, { seed: 'Siemenet', planting: 'Kylvötyö', machines: 'Koneet', lease: 'Konevuokrat', land: 'Maa', buildings: 'Rakennukset', animals: 'Eläimet', feed: 'Rehu', chem: 'Ruiskutteet', labor: 'Käsityö', wages: 'Tilanhoitaja', interest: 'Korot', tax: 'Verot', misc: 'Muut' }) +
        '<tr class="sum"><td>Yhteensä</td><td>' + money(P.exp) + '</td></tr><tr class="sum"><td>Tulos</td><td class="' + (P.profit < 0 ? 'neg' : 'pos') + '">' + money(P.profit) + '</td></tr></table>';
      h += '<p>Arvioitu vero vuoden lopussa: <b>' + money(FS.taxEstimate(G)) + '</b>' + (G.loans.length ? ' · Lainanlyhennys neljännesvuosittain: <b>' + money(FS.quarterPayment(G)) + '</b>' : '') + '</p>';
      return h;
    }
  };

  W.bank = {
    title: 'Pankki', w: 340, manual: true,
    render: function () {
      var h = '<div class="atm"><div>Rahat: <b>' + money(G.funds) + '</b></div><div>Velka: <b>' + money(FS.debt(G)) + '</b></div><div>Luottoraja: <b>' + money(FS.creditLimit(G)) + '</b></div>' +
        '<div>Korko nyt: <b>' + (G.interest * 100).toFixed(1) + ' %</b></div><div>Neljännesvuosimaksu: <b>' + money(FS.quarterPayment(G)) + '</b></div></div>';
      h += '<div class="btnrow"><input id="loanAmt" type="number" min="0" step="500" value="' + Math.min(5000, FS.creditLimit(G)) + '"><button data-act="loan">Ota laina</button><button data-act="repay"' + (G.loans.length ? '' : ' disabled') + '>Maksa kaikki</button></div>';
      h += '<p class="hint">Laina-aika 5 vuotta, lyhennys ja korko neljännesvuosittain. Luottoraja perustuu maan, koneiden ja rakennusten arvoon.</p>';
      if (G.loans.length) h += '<table><tr><th>Laina</th><th>Jäljellä</th><th>Korko</th></tr>' + G.loans.map(function (l) { return '<tr><td>' + money(l.orig) + '</td><td>' + money(l.rem) + '</td><td>' + (l.rate * 100).toFixed(1) + ' %</td></tr>'; }).join('') + '</table>';
      return h;
    }
  };

  W.market = {
    title: 'Markkinat', w: 440, live: true,
    render: function () {
      var c = FS.CROP[ui.marketCrop], mk = G.market[c.id], hist = mk.hist;
      var h = '<div class="cropgrid sm">' + FS.CROPS.map(function (cc) {
        var m2 = G.market[cc.id], tr = m2.hist[m2.hist.length - 1] - m2.hist[m2.hist.length - 5];
        return '<button data-act="market" data-id="' + cc.id + '" class="' + (ui.marketCrop === cc.id ? 'on' : '') + '" title="' + esc(cc.name) + ' ' + money(m2.p) + '">' + img('f_' + cc.id + '_ripe', 1) + '<small class="' + (tr >= 0 ? 'pos' : 'neg') + '">' + (tr >= 0 ? '▲' : '▼') + '</small></button>';
      }).join('') + '</div>';
      var max = Math.max.apply(null, hist), min = Math.min.apply(null, hist), span = Math.max(1, max - min);
      var pts = hist.map(function (v, k) { return (k * 400 / 29).toFixed(1) + ',' + (110 - (v - min) / span * 100).toFixed(1); }).join(' ');
      var trend = hist[hist.length - 1] - hist[hist.length - 5];
      h += '<h3>' + esc(c.name) + ': ' + money(FS.cropPrice(G, c.id)) + ' <small class="' + (trend >= 0 ? 'pos' : 'neg') + '">' + (trend >= 0 ? '▲ nousussa' : '▼ laskussa') + '</small></h3>';
      h += '<svg class="chart" viewBox="0 0 400 120" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      h += '<div class="chartlbl"><span>30 vk sitten</span><span>' + money(min) + ' – ' + money(max) + '</span><span>nyt</span></div>';
      h += '<p>Siemen: <b>' + money(FS.seedPrice(G, c.id)) + '</b>/säkki · Hinta on erinomaisen sadon arvo – heikompi laatu saa osan hinnasta. Futuurin voi tehdä peltoikkunasta.</p>';
      return h;
    }
  };

  W.expert = {
    title: 'Asiantuntija – Farmari Joe', w: 470,
    render: function () {
      var h = tabs('expertTab', [['crops', 'Kasvit'], ['advice', 'Neuvoja'], ['machines', 'Koneet'], ['animals', 'Eläimet'], ['sprays', 'Ruiskutteet']]);
      if (ui.expertTab === 'crops') {
        var c = FS.CROP[ui.expertItem] || FS.CROPS[0];
        h += '<div class="cropgrid sm">' + FS.CROPS.map(function (cc) { return '<button data-act="expert" data-id="' + cc.id + '" class="' + (c.id === cc.id ? 'on' : '') + '" title="' + esc(cc.name) + '">' + img('f_' + cc.id + '_ripe', 1) + '</button>'; }).join('') + '</div>';
        var temp = c.temp.t === 'dd' ? (c.temp.v[0] === c.temp.v[1] ? c.temp.v[0] : c.temp.v.join('–')) + ' lämpöastepäivää (ihanne n. ' + FS.tempStr(c.idealT) + ')' : c.temp.t === 'chill' ? c.temp.v.join('–') + ' kylmäkertymää (alle 10 °C)' : 'Ei pakkasta';
        var R = ['Matala', 'Korkea'];
        h += '<div class="expert"><div>' + img('f_' + c.id + '_ripe', 4) + '</div><table><tr><th colspan=2>' + esc(c.name) + '</th></tr><tr><td>Kasvuaika</td><td>' + c.w + ' viikkoa</td></tr><tr><td>Lämpövaatimus</td><td>' + temp + '</td></tr><tr><td>Vedentarve</td><td>' + c.water.join('–') + ' sadepäivää</td></tr>' +
          '<tr><td>Kestävyys: tuholaiset</td><td>' + R[c.res[0]] + '</td></tr><tr><td>Kestävyys: rikat</td><td>' + R[c.res[1]] + '</td></tr><tr><td>Kestävyys: taudit</td><td>' + R[c.res[2]] + '</td></tr>' +
          '<tr><td>Varastolämpö</td><td>' + FS.tempStr(c.store[0]) + ' – ' + FS.tempStr(c.store[1]) + '</td></tr><tr><td>Uusi kylvö joka sadon jälkeen</td><td>' + (c.perennial ? 'Ei (monivuotinen)' : 'Kyllä') + '</td></tr><tr><td>Korjuu</td><td>' + (c.hand ? 'Käsin (työväki + kuorma-auto)' : 'Puimuri, perävaunu ja kuorma-auto') + '</td></tr>' +
          '<tr><td>Hinta nyt</td><td>' + money(FS.cropPrice(G, c.id)) + '</td></tr><tr><td>Kylvö nyt alueellasi</td><td>' + (FS.seasonOk(G, c.id) ? '✓ sopiva' : '✗ hallariski') + '</td></tr></table></div><p>' + esc(c.tip) + '</p>';
      }
      if (ui.expertTab === 'advice') h += advice();
      if (ui.expertTab === 'machines') h += '<p>Yhden pellon minimikalusto: traktori, aura, kylvökone, puimuri, perävaunu ja kuorma-auto. Koneet kuluvat käytössä ja ulkona – säilytä vajassa. Teiden käyttö vähentää kulumista. Koneet ajavat pellolle lähimmästä paikasta.</p>' + FS.MACHINES.map(function (m) { return '<div class="row">' + img('m_' + m.id, 1) + '<span class="grow"><b>' + m.name + '</b> ' + money(m.price) + '<br><small>' + esc(m.desc) + ' Vuokra ' + money(m.price * FS.LEASE_RATE) + '/kerta.</small></span></div>'; }).join('');
      if (ui.expertTab === 'animals') h += '<p>Eläimet tarvitsevat aitauksen, rehua ja vettä. Navetta parantaa kuntoa ja vähentää ruoan tarvetta. Rahaa tulee eniten jalostuksesta: osta naaraita ja uros samaan aitaukseen. Messualueella pidetään karjanäyttelyitä.</p>' + FS.ANIMALS.map(function (a) { return '<div class="row">' + img('a_' + a.id + '0', 2) + '<span class="grow"><b>' + a.name + '</b> ' + money(a.price) + '<br><small>Elää ' + Math.round(a.life / 364) + ' v, rehua ' + a.feed + ' paalia/kk, tiineys ' + Math.round(a.gest / 30) + ' kk</small></span></div>'; }).join('');
      if (ui.expertTab === 'sprays') h += '<p>Ruiskutus maksaa ' + FS.SPRAY_COST + ' $ (varastosta ' + FS.SPRAY_STOCK_PRICE + ' $) ja tarvitsee traktorin ja ruiskun. Lannoite ei myrkytä maata, mutta torjunta-aineet lisäävät myrkyllisyyttä, mikä heikentää satoja ja maan arvoa. Vuoroviljely (soija, maapähkinä) ja kesanto palauttavat ravinteita.</p>' + FS.SPRAYS.map(function (s) { return '<p><b>' + s.name + '</b>: ' + esc(s.desc) + '</p>'; }).join('');
      return h;
    }
  };
  function advice() {
    var tips = [], now = FS.CROPS.filter(function (c) { return FS.seasonOk(G, c.id); });
    tips.push('<b>Kylvettäväksi sopivat nyt (' + FS.REGION[G.region].name + '):</b> ' + (now.length ? now.map(function (c) { return c.name; }).join(', ') : 'ei mikään – odota kevättä tai valitse kylmää kestävä kasvi.'));
    var Y = G.year.exp;
    if (Y.lease > 1500) tips.push('Konevuokria on kertynyt ' + money(Y.lease) + ' tänä vuonna. Omat koneet maksavat itsensä nopeasti takaisin – ja porrasta kylvöt, jotta koneet riittävät.');
    if (!owned('sprayer') && Object.keys(G.fields).length) tips.push('Sinulla ei ole ruiskua: jokainen ruiskutus vuokraa koneet.');
    var fl = Object.keys(G.fields).map(function (k) { return G.fields[k]; });
    var noWind = fl.filter(function (f) { return f.wb < 8; }).length;
    if (noWind && FS.REGION[G.region].wind >= 9) tips.push(noWind + ' pellolta puuttuu tuulensuoja. Istuta vähintään 8 puuta 2 ruudun säteelle pellosta.');
    var dry = fl.filter(function (f) { return FS.fieldIssues(f).indexOf('dry') >= 0; }).length;
    if (dry) tips.push(dry + ' peltoa kärsii kuivuudesta. Rakenna pumppu veden rantaan ja ojat peltojen reunoille.');
    var flood = fl.filter(function (f) { return FS.fieldIssues(f).indexOf('flood') >= 0; }).length;
    if (flood) tips.push(flood + ' peltoa on liian märkiä. Sulje venttiilit tai kaiva kuiva salaoja pellon reunalle.');
    if (fl.some(function (f) { return f.nutr < 30; })) tips.push('Joidenkin peltojen ravinteet ovat vähissä: lannoita tai viljele soijaa/maapähkinää.');
    if (!FS.siloCapacity(G)) tips.push('Ilman siiloa sato myydään heti. Siilolla voit odottaa parempaa hintaa (huomioi varastolämpö).');
    if (G.animals.length && !Object.keys(G.troughs).length) tips.push('Eläimillä ei ole vesikaukaloa!');
    if (G.funds < 2000 && FS.creditLimit(G) > 0) tips.push('Kassa on tiukoilla. Pankista saa lainaa ' + money(FS.creditLimit(G)) + ' asti.');
    return '<ul class="tips">' + tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  W.eval = {
    title: 'Vuoden arviointi', w: 430,
    render: function () {
      var rec = G.history[G.history.length - 1], prev = G.history[G.history.length - 2];
      if (!rec) return '<p>Arviointi tehdään vuoden lopussa. Ensimmäinen vuosi on vielä kesken.</p><p>Nettovarallisuus nyt: <b>' + money(FS.netWorth(G)) + '</b></p>';
      function cmp(name, v, pv, fmt, good) {
        var diff = pv === undefined ? 0 : v - pv, up = good ? diff >= 0 : diff <= 0;
        return '<div class="evrow"><span>' + name + '</span><b>' + fmt(v) + '</b><em class="' + (diff === 0 ? '' : up ? 'pos' : 'neg') + '">' + (diff === 0 ? '–' : (diff > 0 ? '▲' : '▼')) + '</em></div>';
      }
      var p = prev || {};
      var h = '<h3>Vuosi ' + rec.year + '</h3>' +
        cmp('Nettovarallisuus', rec.worth, p.worth, money, true) + cmp('Vuoden tulos', rec.profit, p.profit, money, true) +
        cmp('Satoja', rec.harvests, p.harvests, String, true) + cmp('Keskilaatu', Math.round(rec.quality * 100), p.quality !== undefined ? Math.round(p.quality * 100) : undefined, function (v) { return v + ' %'; }, true) +
        cmp('Maaperän ravinteet', Math.round(rec.soil), p.soil !== undefined ? Math.round(p.soil) : undefined, String, true) + cmp('Myrkyllisyys', Math.round(rec.tox), p.tox !== undefined ? Math.round(p.tox) : undefined, String, false) +
        cmp('Kaupungin koko', rec.town, p.town, function (v) { return v + ' tonttia'; }, true) + '<p>Verot: ' + money(rec.tax) + ' · Kotitila: ' + FS.HOME_LEVELS[G.homeLevel].name + '</p>';
      var next = FS.HOME_LEVELS[G.homeLevel + 1];
      if (next) h += '<p class="hint">Kotitila laajenee (' + next.name + '), kun vuoden tulos on vähintään ' + money(next.profit) + '.</p>';
      return h + advice();
    }
  };

  W.manager = {
    title: 'Tilanhoitaja (idle-aika)', w: 440, live: false,
    render: function () {
      var L = FS.idleLimits(G), eff = FS.idleEff(G);
      var h = '<p>Kun olet poissa (selain suljettu tai välilehti piilossa), tilanhoitaja pyörittää tilaa. Valitse kuinka tehokkaasti: suurempi teho kuluttaa enemmän peliaikaa poissaolosi aikana, mutta hoitajan palkka nousee jyrkemmin.</p>';
      h += '<div class="slider"><input id="idleSlider" type="range" min="0" max="' + Math.round(L.max * 100) + '" step="5" value="' + Math.round(eff * 100) + '"><b id="idleVal">' + Math.round(eff * 100) + ' %</b></div>';
      h += '<div class="btnrow">' + [0, 0.25, 0.5, 1, L.max].filter(function (v, k, a) { return v <= L.max && a.indexOf(v) === k; }).map(function (v) { return '<button data-act="idlePreset" data-v="' + v + '">' + Math.round(v * 100) + ' %</button>'; }).join('') + '</div>';
      h += '<div id="idleInfo"></div>';
      h += '<h4>Hoitajan taito: ' + L.skill + '/5</h4><ul class="skills">' + FS.SKILLS.map(function (s, k) { return '<li class="' + (k < L.skill ? 'ok' : 'no') + '">' + (k < L.skill ? '✓ ' : '✗ ') + esc(s) + '</li>'; }).join('') + '</ul>';
      var next = FS.HOME_LEVELS[G.homeLevel + 1];
      h += '<h4>Näin hoitaja paranee</h4><ul class="tips"><li>Kotitilan taso ' + (G.homeLevel + 1) + '/5' + (next ? ' – seuraava, kun vuoden tulos ≥ ' + money(next.profit) : ' – maksimi') + ': +' + Math.round(FS.IDLE.perHomeLevel * 100) + ' %-yks. tehoa, +' + FS.IDLE.hoursPerLevel + ' h, +1 taito.</li>' +
        '<li>Kaupungin Työnvälitys ' + (FS.townHas(G, 'jobs') ? '✓' : '✗') + ': +25 %-yks., +6 h, +1 taito.</li><li>Maatalouskoulu ' + (FS.townHas(G, 'school') ? '✓' : '✗') + ': +15 %-yks., +1 taito.</li><li>Kaupunki kasvaa veroistasi – äänestä laajennuksissa.</li></ul>';
      return h;
    },
    after: function (c) { updateIdleInfo(c); }
  };
  function updateIdleInfo(c) {
    var L = FS.idleLimits(G), eff = FS.idleEff(G), box = c.querySelector('#idleInfo');
    if (!box) return;
    c.querySelector('#idleVal').textContent = Math.round(eff * 100) + ' %';
    if (eff <= 0) { box.innerHTML = '<p><b>Tila odottaa</b> poissaolosi ajan – aika ei kulu eikä palkkaa makseta.</p>'; return; }
    var dph = FS.IDLE.daysPerHour * eff;
    var rows = [1, 8, L.hours].filter(function (v, k, a) { return a.indexOf(v) === k; }).map(function (hh) { var p = FS.idlePreview(G, eff, hh); return '<tr><td>' + hh + ' h poissa</td><td>' + p.days + ' pv (' + (p.days / 7).toFixed(1) + ' vk)</td><td>' + money(p.wage) + '</td></tr>'; }).join('');
    box.innerHTML = '<p>1 tunti poissa = <b>' + dph.toFixed(1) + ' päivää</b> peliaikaa · palkka <b>' + money(FS.idleWage(G, eff)) + '/vk</b> · poissaoloa lasketaan enintään <b>' + L.hours + ' h</b> · tehon yläraja <b>' + Math.round(L.max * 100) + ' %</b></p><table><tr><th>Poissa</th><th>Peliaikaa</th><th>Palkat</th></tr>' + rows + '</table>';
  }

  var topCache = null;
  ui.loadTop = function () {
    topCache = { loading: true };
    ui.refresh('neighbors');
    FS.net.top().then(function (j) { topCache = j; ui.refresh('neighbors'); }).catch(function (e) { topCache = { error: e.message }; ui.refresh('neighbors'); });
  };
  W.neighbors = {
    title: 'Naapurit – rikkaimmat tilat', w: 460, manual: true,
    render: function () {
      if (!topCache) { setTimeout(ui.loadTop, 0); return '<p>Ladataan…</p>'; }
      if (topCache.loading) return '<p>Ladataan…</p>';
      if (topCache.error) return '<p>' + esc(topCache.error) + '</p><button data-act="reloadTop">Yritä uudelleen</button>';
      if (topCache.local) return '<p>Paikallisessa tilassa ei ole naapurilistaa. Pelaa palvelimella nähdäksesi muiden tilat.</p>';
      var e = topCache.entries || [];
      return '<table class="top"><tr><th>#</th><th>Pelaaja</th><th>Tila</th><th>Alue</th><th>Vuosi</th><th>Varallisuus</th></tr>' + e.map(function (r) {
        return '<tr class="' + (r.me ? 'me' : '') + '"><td>' + r.r + '</td><td>' + esc(r.n) + '</td><td>' + esc(r.f || '') + '</td><td>' + esc((FS.REGION[r.g] || {}).name || '') + '</td><td>' + (r.y || 1) + '</td><td>' + money(r.w || 0) + '</td></tr>';
      }).join('') + '</table>' + (e.length ? '' : '<p>Lista on tyhjä.</p>') + '<button data-act="reloadTop">Päivitä</button><p class="hint">Lista päivittyy tallennuksen yhteydessä.</p>';
    }
  };

  W.log = {
    title: 'Viestit', w: 420,
    render: function () {
      return '<div class="log">' + G.msgs.slice().reverse().map(function (m) {
        return '<div class="lm t-' + m.type + '"' + (m.at ? ' data-act="goto" data-x="' + m.at.x + '" data-y="' + m.at.y + '"' : '') + '><small>' + FS.formatDate(m.day) + '</small> ' + esc(m.text) + '</div>';
      }).join('') + '</div>';
    }
  };

  W.help = {
    title: 'Pikaohje', w: 480,
    render: function () {
      return '<div class="help"><p><b>Tavoite:</b> rakenna kannattava maatila. Peli on avoin – menestystä mittaa nettovarallisuus.</p>' +
        '<ol><li><b>KYLVÄ</b> (vasen palkki): valitse kasvi ja klikkaa omalle maalle (aidattu alue). Pelto on 8×8 ruutua. Kyntö ja kylvö tapahtuvat viikon päästä.</li>' +
        '<li>Ilman omia koneita ne <b>vuokrataan</b> automaattisesti – kallista! Osta traktori, aura, kylvökone, puimuri, perävaunu ja kuorma-auto (Osta-ikkuna).</li>' +
        '<li>Klikkaa peltoa <b>Tutki</b>-työkalulla: näet kypsyyden, laadun, mittarit ja voit vaihtaa seuraavan kasvin, ruiskuttaa, tehdä futuurin tai korjata heti.</li>' +
        '<li><b>Vesi:</b> pumppu joen/järven rantaan → ojat pellon reunoille. Venttiilillä säädät virtausta; kuiva oja toimii salaojana.</li>' +
        '<li><b>Tuuli</b> vie pintamaata: istuta vähintään 8 puuta 2 ruudun säteelle pellosta.</li>' +
        '<li><b>Siilo</b> varastoi sadot – myy kun hinta on hyvä (Markkinat). <b>Vaja</b> suojaa koneita.</li>' +
        '<li><b>Eläimet:</b> aitaa alue, lisää rehu ja vesikaukalo, osta naaraita ja uros.</li>' +
        '<li><b>Tilanhoitaja</b> hoitaa tilaa, kun olet poissa. Säädä teho Hoitaja-ikkunassa.</li></ol>' +
        '<p><b>Näppäimet:</b> nuolet = vieritä, +/− tai hiiren rulla = zoomaa, välilyönti = tauko, Esc = peruuta, kirjaimet = työkalut. Hiiren oikea/keskinäppäin raahaa karttaa.</p></div>';
    }
  };

  W.about = {
    title: 'Tietoja', w: 420,
    render: function () {
      return '<p><b>FarmSim Online</b> on itsenäinen fanitoteutus, joka on saanut innoituksensa Maxisin SimFarm-pelistä (1993). Pelin koodi, grafiikka ja tekstit on tehty alusta asti uudelleen; kasvien kasvuajat ja vaatimukset noudattavat alkuperäisen käsikirjan julkisia tietoja.</p>' +
        '<p>SimFarm on Electronic Artsin tavaramerkki. Tämä peli ei ole EA:n tai Maxisin tekemä tai hyväksymä.</p>' +
        '<p><b>Tietosuoja:</b> palvelimelle tallennetaan vain nimimerkki, salakoodin tiiviste, pelitila ja tallennusajat. IP-osoitteita ei tallenneta. Voit poistaa tilasi valikosta Peli → Poista tilani.</p>';
    }
  };

  W.voteResult = {
    title: 'Äänestyksen tulos', w: 380, manual: true,
    render: function () {
      var R = ui.voteResult;
      if (!R) return '';
      var h = '<p>Äänestit: <b>' + esc(FS.TOWN_TYPE[R.choice].name) + '</b></p><table>' + R.tally.map(function (t) {
        return '<tr' + (t.id === R.result ? ' class="sum"' : '') + '><td>' + esc(FS.TOWN_TYPE[t.id].name) + (t.id === R.result ? ' ✓' : '') + '</td><td>' + t.pct + ' %</td></tr>';
      }).join('') + '</table>';
      h += R.result === R.choice ? '<p class="pos">Ehdotuksesi voitti! Kaupunkiin rakennetaan ' + esc(FS.TOWN_TYPE[R.result].name.toLowerCase()) + '.</p>'
        : '<p class="neg">Kaupunkilaiset äänestivät toisin – rakennetaan ' + esc(FS.TOWN_TYPE[R.result].name.toLowerCase()) + '. Ehdotuksesi voi voittaa seuraavassa laajennuksessa.</p>';
      return h + '<button class="wide" data-act="close">OK</button>';
    }
  };

  W.vote = {
    title: 'Kaupunki laajenee!', w: 400, manual: true,
    render: function () {
      var v = G.town.vote;
      if (!v) return '<p>Ei äänestystä.</p>';
      return '<p>Kaupunki on saanut uuden tontin. Mitä sinne rakennetaan? Myös kaupunkilaiset äänestävät: äänesi ratkaisee noin neljä kertaa viidestä, mutta ei aina.</p>' + v.options.map(function (o) {
        var t = FS.TOWN_TYPE[o]; return '<button class="wide vote" data-act="vote" data-id="' + o + '"><b>' + t.name + '</b><br><small>' + esc(t.desc) + '</small></button>';
      }).join('');
    }
  };

  ui.idleSummary = null;
  W.idle = {
    title: 'Tervetuloa takaisin!', w: 440, manual: true,
    render: function () {
      var R = ui.idleSummary;
      if (!R) return '';
      if (R.paused) return '<p>Olit poissa ' + R.hours.toFixed(1) + ' h. Idle-teho oli 0 %, joten tila odotti sinua.</p><button data-act="closeIdle" class="wide">Jatka</button>';
      var h = '<p>Olit poissa <b>' + R.hours.toFixed(1) + ' h</b>' + (R.capped ? ' (laskettiin enintään ' + FS.idleLimits(G).hours + ' h)' : '') + '. Tilanhoitaja hoiti tilaa <b>' + Math.round(R.eff * 100) + ' %</b> teholla:</p>';
      h += '<table><tr><td>Peliaikaa kului</td><td><b>' + R.days + ' pv</b> (' + (R.days / 7).toFixed(1) + ' vk)</td></tr><tr><td>Satoja korjattiin</td><td>' + R.harvests + '</td></tr><tr><td>Tulot</td><td>' + money(R.earned) + '</td></tr><tr><td>Menot (sis. palkat)</td><td>' + money(R.spent) + '</td></tr><tr><td>Hoitajan palkat</td><td>' + money(R.wages) + '</td></tr><tr class="sum"><td>Kassan muutos</td><td class="' + (R.funds < 0 ? 'neg' : 'pos') + '">' + money(R.funds) + '</td></tr><tr><td>Varallisuuden muutos</td><td class="' + (R.worth < 0 ? 'neg' : 'pos') + '">' + money(R.worth) + '</td></tr></table>';
      if (R.disasters.length) h += '<p class="alert">Katastrofit: ' + esc(R.disasters.join(', ')) + '</p>';
      if (R.log.length) h += '<div class="log">' + R.log.map(function (m) { return '<div class="lm t-' + m.type + '"><small>' + FS.formatDate(m.day) + '</small> ' + esc(m.text) + '</div>'; }).join('') + '</div>';
      return h + '<button data-act="closeIdle" class="wide">Jatka pelaamista</button>';
    }
  };

  W.gameover = {
    title: 'Peli päättyi', w: 380, manual: true,
    render: function () { return '<p>Verottaja ja pankki ottivat tilan haltuunsa. Maanviljely on vaikeaa – yritä uudelleen!</p><button data-act="newFarm" class="wide">Aloita uusi tila</button>'; }
  };
})();
