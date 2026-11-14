'use strict';
// Full-screen panels: title, creation, intro, inventory, character, skills, almanac, loot, barter, menus, endings.
(function () {
  const U = GG.U, G = GG.G, R = GG.R, UI = GG.UI, A = GG.Act;
  const Sc = GG.Screens = {};
  const $ = s => document.querySelector(s);
  const esc = s => UI.esc(s);
  const root = () => $('#screen');
  Sc.cur = null;

  Sc.open = (name, arg) => {
    UI.hideAim();
    if (Sc[name] == null) return;
    Sc.cur = name;
    root().classList.remove('hidden');
    if (G.S && name !== 'title' && name !== 'creation') G.S.ui = G.S.ui && (G.S.ui.type === 'loot' || G.S.ui.type === 'barter') ? G.S.ui : { type: 'screen', name };
    Sc[name](arg);
  };
  Sc.close = () => {
    root().classList.add('hidden');
    root().innerHTML = '';
    Sc.cur = null;
    if (G.S) G.S.ui = null;
  };
  Sc.refresh = () => { if (Sc.cur) Sc[Sc.cur](Sc.arg); };
  const panel = (title, sub, body, foot) => {
    root().innerHTML = `<div class="panel"><h1>${title}<small>${sub || ''}</small></h1><div class="pbody">${body}</div><div class="pfoot">${foot || '<button data-close>Close</button>'}</div></div>`;
    root().querySelectorAll('[data-close]').forEach(b => b.onclick = () => { GG.Audio.play('ui'); Sc.close(); });
  };
  const on = (sel, ev, fn) => root().querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => fn(el, e)));

  // ================================================================== SAVES
  Sc.SLOTS = ['1', '2', '3'];
  const store = {
    get: k => { try { return localStorage.getItem('gristle_' + k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem('gristle_' + k, v); return true; } catch (e) { return false; } },
  };
  Sc.meta = slot => { try { return JSON.parse(store.get('meta_' + slot) || 'null'); } catch (e) { return null; } };
  Sc.save = slot => {
    const S = G.S;
    if (!S || S.mode === 'combat' || S.mode === 'dead' || S.dlg) { UI.toast('Cannot save right now.'); return false; }
    const ok = store.set('save_' + slot, G.serialize()) && store.set('meta_' + slot, JSON.stringify({ name: S.pc.name, level: S.pc.level, time: U.fmtTime(S.time), loc: S.mode === 'world' ? 'The Rind' : G.geo.def.name, at: new Date().toLocaleString() }));
    UI.toast(ok ? `Saved${slot === 'auto' ? ' (auto)' : ' to slot ' + slot}.` : 'Saving failed (browser storage blocked?). Use Export instead.');
    return ok;
  };
  Sc.load = slot => {
    const d = store.get('save_' + slot);
    if (!d) { UI.toast('Empty slot.'); return false; }
    Sc.close();
    G.deserialize(d);
    UI.clearLog(true);
    G.log('Game loaded.');
    return true;
  };
  Sc.exportSave = () => {
    const blob = new Blob([G.serialize()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `gristle_${G.S.pc.name.replace(/\W+/g, '_')}_${G.S.pc.level}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  Sc.importSave = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => { try { Sc.close(); G.deserialize(t); UI.clearLog(true); G.log('Game loaded from file.'); } catch (e) { UI.toast('That file is not a Gristle save.'); } }); };
    inp.click();
  };

  // ================================================================== TITLE
  Sc.title = () => {
    const anySave = ['auto', ...Sc.SLOTS].find(s => Sc.meta(s));
    root().innerHTML = `<div class="title"><canvas id="tcv"></canvas><div class="menu">
      <h1>Gristle &amp; Glitter</h1><div class="sub">A tale of meat, money and the Grand Calliope — Act 1: The Wasting</div>
      <button id="tnew">New Game</button>
      ${anySave ? `<button id="tcont">Continue <small>(${esc(Sc.meta(anySave).name)}, L${Sc.meta(anySave).level})</small></button>` : ''}
      <button id="tload">Load from File…</button>
      <button id="thelp">How to Play</button></div></div>`;
    Sc.titleArt($('#tcv'));
    $('#tnew').onclick = () => { GG.Audio.init(); Sc.open('creation'); };
    if (anySave) $('#tcont').onclick = () => { GG.Audio.init(); const best = ['auto', ...Sc.SLOTS].filter(s => Sc.meta(s)).sort((a, b) => new Date(Sc.meta(b).at) - new Date(Sc.meta(a).at))[0]; Sc.load(best); };
    $('#tload').onclick = () => { GG.Audio.init(); Sc.importSave(); };
    $('#thelp').onclick = () => Sc.open('help', 'title');
  };
  Sc.titleArt = cv => {
    const W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
    const ctx = cv.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2a1428'); sky.addColorStop(0.45, '#a8402c'); sky.addColorStop(0.7, '#e8a050'); sky.addColorStop(1, '#3a1a10');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,220,150,0.85)'; ctx.beginPath(); ctx.arc(W * 0.7, H * 0.62, H * 0.12, 0, 7); ctx.fill();
    // flesh hills
    for (let l = 0; l < 3; l++) {
      ctx.fillStyle = ['#5a2430', '#6e2a36', '#3a1418'][l];
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (0.68 + l * 0.08) - Math.sin(x / (160 + l * 70) + l) * 40 - U.vnoise(x / 120, l, 4) * 50);
      ctx.lineTo(W, H); ctx.fill();
    }
    // tent silhouette and wagons
    const tx = W * 0.28, ty = H * 0.8;
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath(); ctx.moveTo(tx - 160, ty); ctx.lineTo(tx, ty - 230); ctx.lineTo(tx + 160, ty); ctx.fill();
    ctx.fillRect(tx - 2, ty - 270, 4, 40);
    ctx.beginPath(); ctx.moveTo(tx + 2, ty - 270); ctx.lineTo(tx + 40, ty - 258); ctx.lineTo(tx + 2, ty - 246); ctx.fill();
    for (let i = 0; i < 6; i++) { const wx = W * 0.5 + i * 90, wy = H * 0.84 - i * 6; ctx.fillRect(wx, wy - 40, 70, 34); ctx.beginPath(); ctx.arc(wx + 14, wy - 4, 10, 0, 7); ctx.arc(wx + 56, wy - 4, 10, 0, 7); ctx.fill(); }
    // string lights
    ctx.strokeStyle = 'rgba(20,10,10,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty - 230); ctx.quadraticCurveTo(W * 0.45, H * 0.62, W * 0.62, H * 0.76); ctx.stroke();
    for (let i = 0; i < 14; i++) { const p = i / 13; const x = (1 - p) * (1 - p) * tx + 2 * (1 - p) * p * W * 0.45 + p * p * W * 0.62; const y = (1 - p) * (1 - p) * (ty - 230) + 2 * (1 - p) * p * H * 0.62 + p * p * H * 0.76; ctx.fillStyle = ['#ffe080', '#ff8060', '#80e0ff'][i % 3]; ctx.beginPath(); ctx.arc(x, y + 4, 3, 0, 7); ctx.fill(); }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.15; ctx.fillStyle = ctx.createPattern(GG.SP.noise(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  Sc.help = (from) => {
    panel('How to Play', 'Controls & tips', `<div class="cols"><div>
      <h2>Exploring</h2><p><b>Left-click</b> the ground to walk. Left-click a person to talk, an object to use or open it, a corpse to loot it.</p>
      <p><b>Right-click</b> anything to examine it. Walk onto the amber-edged map border to leave for the world map.</p>
      <p><b>Arrow keys</b> or the screen edges pan the camera. <b>Home</b> re-centres on you.</p>
      <h2>Combat</h2><p>Turn-based. Every step costs 1 AP, attacks cost what the weapon says. <b>Left-click</b> an enemy to attack the torso, <b>right-click</b> an enemy to pick a body part (head, eyes, legs…). <b>Space</b> ends your turn. <b>R</b> reloads.</p>
      <p>Stand on the map edge with no enemy next to you to slip away.</p></div><div>
      <h2>Keys</h2><div class="kv"><span>Inventory</span><b>I</b><span>Character</span><b>C</b><span>Skills</span><b>K</b><span>Almanac (quests, rest, save)</span><b>J</b><span>Sneak</span><b>N</b><span>Quicksave / Quickload</span><b>F5 / F9</b><span>Dialogue options</span><b>1–9</b><span>Menu / close</span><b>Esc</b></div>
      <h2>Tips</h2><p>Skill checks in dialogue are shown as tags, e.g. <span class="chip">Gab 50</span>. Green means you will pass.</p>
      <p>Most problems have several answers: talk, sneak, pick a lock, fix a machine, or shoot it.</p>
      <p>Rest in the Almanac to heal. Doc Purslane patches you up for tickets.</p></div></div>`,
      `<button data-close>${from === 'title' ? 'Back' : 'Close'}</button>`);
    if (from === 'title') root().querySelector('[data-close]').onclick = () => Sc.open('title');
  };

  // ================================================================== CREATION
  const PRESETS = {
    gunhand: { label: 'The Gunhand', blurb: 'Quick hands, steady nerves, few words.', name: 'Jess Calloway', stats: { grit: 6, nerve: 7, wits: 5, charm: 4, reflex: 8, gut: 5 }, knacks: ['guns', 'sneak', 'doctor'], quirks: ['twitchy'], look: { coat: '#5a4632', hat: 'stetson', hatC: '#3a2a1c', face: 'plain' } },
    barker: { label: 'The Barker', blurb: 'Raised under a big top. Talks first, talks last.', name: 'Ambrose Penny', stats: { grit: 4, nerve: 5, wits: 7, charm: 9, reflex: 5, gut: 5 }, knacks: ['gab', 'show', 'guns'], quirks: ['showboat'], look: { coat: '#7a2a3a', hat: 'top', hatC: '#1a1418', face: 'mustache' } },
    cutter: { label: 'The Cutter', blurb: 'A rancher\'s knife-hand. Strong stomach, stronger arms.', name: 'Hattie Bone', stats: { grit: 8, nerve: 6, wits: 5, charm: 4, reflex: 6, gut: 6 }, knacks: ['melee', 'butchery', 'wrangle'], quirks: ['ironstomach'], look: { coat: '#6a5a3a', hat: 'bonnet', hatC: '#d8ccb0', face: 'scar', hair: '#7a4a28' } },
    tinker: { label: 'The Tinker', blurb: 'Grew up in Abundance ruins, fixing what should stay broken.', name: 'Ozzie Rook', stats: { grit: 5, nerve: 5, wits: 8, charm: 5, reflex: 7, gut: 5 }, knacks: ['tinker', 'lockwork', 'sneak'], quirks: [], look: { coat: '#4a5a5a', hat: 'cap', hatC: '#5a3a2a', face: 'spectacles' } },
  };
  const BASE_POINTS = 35;
  let cr = null;
  Sc.creation = () => {
    if (!cr) cr = JSON.parse(JSON.stringify(PRESETS.gunhand));
    const used = Object.values(cr.stats).reduce((a, b) => a + b, 0);
    const left = BASE_POINTS - used;
    const fake = { stats: cr.stats, knacks: cr.knacks, quirks: cr.quirks, skillPts: {}, scars: [], buffs: [], level: 1, equip: {}, inv: [] };
    const stats = GG.R.STATS.map(s => `<div class="stat" title="${esc(s.desc)}"><span>${s.name}<br><small style="color:#6a5040;font-size:12px">${esc(s.desc)}</small></span><button data-s="${s.id}" data-d="-1">−</button><b>${cr.stats[s.id]}</b><button data-s="${s.id}" data-d="1">+</button></div>`).join('');
    const skills = GG.R.SKILLS.map(s => `<label class="skill ${cr.knacks.includes(s.id) ? 'knack' : ''}" title="${esc(s.desc)}"><span><input type="checkbox" data-k="${s.id}" ${cr.knacks.includes(s.id) ? 'checked' : ''}> ${s.name}</span><b>${GG.R.skill(fake, s.id)}%</b><span></span></label>`).join('');
    const quirks = GG.R.QUIRKS.map(q => `<label><input type="checkbox" data-q="${q.id}" ${cr.quirks.includes(q.id) ? 'checked' : ''}><span><b>${q.name}</b><small>${esc(q.desc)}</small></span></label>`).join('');
    const pre = Object.entries(PRESETS).map(([k, p]) => `<button data-p="${k}" title="${esc(p.blurb)}">${p.label}</button>`).join(' ');
    root().innerHTML = `<div class="panel"><h1>Who Walks Into Gutwater?<small>${left} point${left === 1 ? '' : 's'} left · 3 Knacks · up to 2 Quirks</small></h1>
      <div class="pbody"><div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><span style="font-family:var(--disp)">Start from:</span>${pre}</div>
      <div class="cols3"><div><h2>Name</h2><input type="text" id="cname" maxlength="24" value="${esc(cr.name)}"><canvas id="cpor" width="220" height="220" style="margin-top:10px;width:220px;height:220px;border:3px solid #3a2414"></canvas>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button id="chat">Hat</button><button id="ccoat">Coat</button><button id="cface">Face</button></div>
        <h2>Derived</h2><div class="kv"><span>Hit points</span><b>${GG.R.maxHp(fake)}</b><span>Action points</span><b>${GG.R.maxAp(fake)}</b><span>Sequence</span><b>${GG.R.seq(fake)}</b><span>Critical chance</span><b>${GG.R.crit(fake)}%</b><span>Carry weight</span><b>${GG.R.carry(fake)}</b></div></div>
      <div><h2>Attributes</h2>${stats}<h2>Quirks</h2><div class="pick">${quirks}</div></div>
      <div><h2>Knacks <small style="font-family:var(--type);font-size:12px">(+20, skill grows twice as fast)</small></h2>${skills}</div></div></div>
      <div class="pfoot"><span class="grow">${left ? `Spend all attribute points (${left} left).` : cr.knacks.length !== 3 ? 'Pick exactly three Knacks.' : 'Ready when you are.'}</span><button id="cback">Back</button><button id="cgo" class="red" ${left || cr.knacks.length !== 3 ? 'disabled' : ''}>Walk into Gutwater</button></div></div>`;
    GG.SP.portrait($('#cpor'), { look: Object.assign({ kind: 'human', skin: '#c99a74', hair: '#4a3020', coat: '#6b4a30', pants: '#3e342a', hat: 'stetson', hatC: '#5a4028', face: 'plain', build: 1, h: 1 }, cr.look) });
    on('[data-p]', 'click', b => { cr = JSON.parse(JSON.stringify(PRESETS[b.dataset.p])); Sc.creation(); });
    on('[data-s]', 'click', b => { const s = b.dataset.s, d = +b.dataset.d; const v = cr.stats[s] + d; if (v < 1 || v > 10 || (d > 0 && left <= 0)) return; cr.stats[s] = v; Sc.creation(); });
    on('[data-k]', 'change', b => { const k = b.dataset.k; if (b.checked) { if (cr.knacks.length >= 3) cr.knacks.shift(); cr.knacks.push(k); } else cr.knacks = cr.knacks.filter(x => x !== k); Sc.creation(); });
    on('[data-q]', 'change', b => { const q = b.dataset.q; if (b.checked) { if (cr.quirks.length >= 2) cr.quirks.shift(); cr.quirks.push(q); } else cr.quirks = cr.quirks.filter(x => x !== q); Sc.creation(); });
    $('#cname').oninput = e => { cr.name = e.target.value; };
    const cyc = (k, arr) => { const i = arr.indexOf(cr.look[k]); cr.look[k] = arr[(i + 1) % arr.length]; Sc.creation(); };
    $('#chat').onclick = () => cyc('hat', ['stetson', 'bowler', 'top', 'bonnet', 'cap', 'none']);
    $('#ccoat').onclick = () => cyc('coat', ['#6b4a30', '#5a4632', '#7a2a3a', '#4a5a5a', '#3a4a7a', '#6a5a3a', '#2a2a2a']);
    $('#cface').onclick = () => cyc('face', ['plain', 'mustache', 'beard', 'scar', 'spectacles', 'freckles', 'lipstick']);
    $('#cback').onclick = () => Sc.open('title');
    $('#cgo').onclick = () => {
      const spec = { name: (cr.name || 'The Stray').trim().slice(0, 24) || 'The Stray', stats: cr.stats, knacks: cr.knacks, quirks: cr.quirks, look: cr.look };
      Sc.close();
      G.newGame(spec);
      UI.clearLog(true);
    };
  };

  // ================================================================== INTRO
  const INTRO = [
    ['The Bloom', 'Forty-one years ago, Abundance Biologics gave the world PERPETUA: meat that grows back. It ended hunger for eight glorious months. Then the meat grew together, and kept growing, and swallowed the plains, the cities, and the government that had signed off on it.'],
    ['The Rind', 'Now the plains are called the Rind. People herd the flesh, cut it, and eat it. Every town lives beside a Mother Herd: a vast, sleepy hill of meat that is cut by day and regrows by night. The only institutions that survived are the travelling carnivals. Their tickets are your money.'],
    ['Gutwater', 'You are a Stray: no herd, no wagon, no particular reason to be here. You walked in from the south with a revolver, a skinning knife and seventy-five tickets. The town sign says POP. 61. Somebody has crossed out the 1.'],
  ];
  Sc.intro = (i = 0) => {
    Sc.arg = i;
    const [h, p] = INTRO[i];
    root().innerHTML = `<div class="crawl"><h2>${h}</h2><p>${esc(p)}</p><p><button id="inext">${i < INTRO.length - 1 ? 'Go on' : 'Begin'}</button> <button id="iskip">Skip</button></p></div>`;
    $('#inext').onclick = () => { if (i < INTRO.length - 1) Sc.intro(i + 1); else { Sc.close(); G.log('You arrive in Gutwater. Agnes Vell, the Herdmother, keeps the big hall north of the main street.', 'loc'); } };
    $('#iskip').onclick = () => { Sc.close(); G.log('You arrive in Gutwater. Agnes Vell, the Herdmother, keeps the big hall north of the main street.', 'loc'); };
  };

  // ================================================================== INVENTORY
  let invSel = null;
  Sc.inv = () => {
    const S = G.S, pc = S.pc;
    const items = pc.inv.slice().sort((a, b) => ['weapon', 'armor', 'ammo', 'use', 'quest', 'misc', 'money'].indexOf(GG.ITEMS[a.id].type) - ['weapon', 'armor', 'ammo', 'use', 'quest', 'misc', 'money'].indexOf(GG.ITEMS[b.id].type));
    const row = (id, n, eq) => `<div class="row ${eq ? 'eq' : ''} ${invSel === (eq ? 'eq:' + eq : id) ? 'sel' : ''}" data-id="${eq ? 'eq:' + eq : id}"><img src="${GG.SP.icon(id)}"><span>${esc(GG.ITEMS[id].name)}${eq ? ` <span class="chip">${eq}</span>` : ''}</span><span class="n">${n > 1 ? '×' + n : ''}</span></div>`;
    const w = pc.equip.weapon, a = pc.equip.armor;
    let detail = '<div class="desc">Select an item.</div>', actions = '';
    const selId = invSel && invSel.startsWith('eq:') ? (invSel === 'eq:weapon' ? w : a) : invSel;
    if (selId && GG.ITEMS[selId]) {
      const it = GG.ITEMS[selId];
      const facts = [];
      if (it.type === 'weapon') facts.push(`${it.dmg[0]}–${it.dmg[1]} damage`, `${it.ap} AP`, `range ${it.range}`, GG.R.SKILL[it.skill].name, it.mag ? `${it.mag} rounds (${GG.ITEMS[it.ammo].name})` : '', it.splash ? `blast radius ${it.splash}` : '');
      if (it.type === 'armor') facts.push(`AC +${it.ac}`, `DT ${it.dt}`, `DR ${it.dr}%`);
      if (it.heal) facts.push(`heals ${it.heal[0]}–${it.heal[1]}`);
      if (it.buff) facts.push(Object.entries(it.buff.mod || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ') + ` for ${it.buff.dur} min`);
      facts.push(`weight ${it.weight}`, `value ${it.value}`);
      detail = `<h2>${esc(it.name)}</h2><div class="desc">${esc(it.desc || '')}</div><p style="font-family:var(--type);font-size:13px">${facts.filter(Boolean).join(' · ')}</p>`;
      if (invSel.startsWith('eq:')) { if (selId !== 'fists') actions = `<button id="iunq">Unequip</button>`; }
      else {
        if (it.type === 'weapon' || it.type === 'armor') actions += `<button id="ieq">Equip</button>`;
        if (it.type === 'use') actions += `<button id="iuse">Use</button>`;
        if (it.type !== 'quest' && it.type !== 'money') actions += `<button id="idrop">Drop one</button>`;
      }
    }
    const party = G.partyEnts().filter(e => e !== pc);
    panel('Inventory', `${G.weight(pc).toFixed(1)} / ${GG.R.carry(pc)} weight · ${G.count(pc, 'ticket')} tickets`,
      `<div class="cols"><div><h2>Equipped</h2><div class="list">${row(w, 1, 'weapon')}${a ? row(a, 1, 'armor') : '<div class="row"><span></span><span style="color:#7a6a58">No armour</span></div>'}</div>
        <h2>Pack</h2><div class="list">${items.map(s => row(s.id, s.n)).join('') || '<i>Empty.</i>'}</div></div>
       <div>${detail}<div style="margin-top:8px;display:flex;gap:6px">${actions}</div>
       ${party.length ? `<h2>Companions</h2>${party.map(p => `<p>${esc(p.name)}: ${p.hp}/${G.maxHp(p)} HP · ${esc(G.weapon(p).name)} · ${p.loaded} loaded, ${G.count(p, G.weapon(p).ammo || '_')} spare <button data-give="${p.id}">Give ammo</button> <button data-heal="${p.id}">Give Suture Paste</button></p>`).join('')}` : ''}
       </div></div>`);
    on('.row[data-id]', 'click', el => { invSel = el.dataset.id; Sc.inv(); });
    on('.row[data-id]', 'dblclick', el => { const id = el.dataset.id; if (id.startsWith('eq:')) return; const it = GG.ITEMS[id]; if (it.type === 'use') A.useItem(pc, id, pc); else if (it.type === 'weapon' || it.type === 'armor') A.useItem(pc, id); Sc.inv(); });
    if ($('#ieq')) $('#ieq').onclick = () => { A.useItem(pc, invSel); invSel = null; Sc.inv(); };
    if ($('#iuse')) $('#iuse').onclick = () => { A.useItem(pc, invSel, pc); if (!G.count(pc, invSel)) invSel = null; Sc.inv(); };
    if ($('#idrop')) $('#idrop').onclick = () => { if (S.mode === 'world') { G.removeItem(pc, invSel, 1); } else A.drop(invSel, 1); if (!G.count(pc, invSel)) invSel = null; Sc.inv(); };
    if ($('#iunq')) $('#iunq').onclick = () => { G.unequip(pc, invSel.slice(3)); invSel = null; Sc.inv(); };
    on('[data-give]', 'click', b => { const p = G.ent(b.dataset.give), am = G.weapon(p).ammo; if (am && G.count(pc, am)) { const n = Math.min(12, G.count(pc, am)); G.removeItem(pc, am, n); G.addItem(p, am, n); } Sc.inv(); });
    on('[data-heal]', 'click', b => { const p = G.ent(b.dataset.heal); if (G.count(pc, 'suture')) { G.removeItem(pc, 'suture', 1); G.addItem(p, 'suture', 1); A.useItem(p, 'suture', p); } Sc.inv(); });
  };

  // ================================================================== CHARACTER
  Sc.char = () => {
    const S = G.S, pc = S.pc, Rr = GG.R;
    const arm = Rr.armor(pc);
    const stats = Rr.STATS.map(s => `<div class="stat" title="${esc(s.desc)}"><span>${s.name}</span><span></span><b>${Rr.stat(pc, s.id)}</b><span></span></div>`).join('');
    const skills = Rr.SKILLS.map(s => `<div class="skill ${pc.knacks.includes(s.id) ? 'knack' : ''}" title="${esc(s.desc)}"><span>${s.name}${pc.knacks.includes(s.id) ? ' ★' : ''}</span><b>${G.skill(pc, s.id)}%</b><span>${pc.unspent ? `<button data-sk="${s.id}">+</button>` : ''}</span></div>`).join('');
    const scarPick = pc.scarPending ? `<h2>Choose a Scar</h2><div class="pick">${Rr.SCARS.filter(s => !pc.scars.includes(s.id)).map(s => `<label><input type="radio" name="scar" data-scar="${s.id}"><span><b>${s.name}</b><small>${esc(s.desc)}</small></span></label>`).join('')}</div>` : '';
    panel(esc(pc.name), `${esc(G.title())} · Level ${pc.level} · ${pc.xp} / ${Rr.xpFor(pc.level + 1)} XP`,
      `<div class="cols3"><div><h2>Attributes</h2>${stats}<h2>Condition</h2><div class="kv"><span>Hit points</span><b>${pc.hp}/${G.maxHp(pc)}</b><span>Action points</span><b>${G.maxAp(pc)}</b><span>Armour class</span><b>${arm.ac}</b><span>Damage threshold</span><b>${arm.dt}</b><span>Damage resist</span><b>${arm.dr}%</b><span>Sequence</span><b>${Rr.seq(pc)}</b><span>Critical chance</span><b>${G.crit(pc)}%</b><span>Melee bonus</span><b>+${Rr.meleeBonus(pc)}</b><span>Carry</span><b>${G.weight(pc).toFixed(0)}/${Rr.carry(pc)}</b></div>
        ${pc.buffs.length ? `<h2>Effects</h2>${pc.buffs.map(b => `<span class="chip">${esc(b.name)}</span>`).join('')}` : ''}</div>
       <div><h2>Skills ${pc.unspent ? `<small style="font-family:var(--type);font-size:13px">${pc.unspent} points to spend (★ Knacks gain 2 per point)</small>` : ''}</h2>${skills}</div>
       <div><h2>Quirks</h2>${pc.quirks.map(q => `<p><b>${Rr.QUIRK[q].name}</b> — <i>${esc(Rr.QUIRK[q].desc)}</i></p>`).join('') || '<p><i>None.</i></p>'}
        <h2>Scars</h2>${pc.scars.map(s => `<p><b>${Rr.SCAR[s].name}</b> — <i>${esc(Rr.SCAR[s].desc)}</i></p>`).join('') || '<p><i>None yet. One every 3 levels.</i></p>'}${scarPick}
        <h2>Record</h2><div class="kv"><span>Kills</span><b>${S.stats.kills}</b><span>Title</span><b>${esc(G.title())}</b></div></div></div>`);
    on('[data-sk]', 'click', (b, e) => { A.spendSkill(b.dataset.sk, e.shiftKey ? Math.min(5, pc.unspent) : 1); GG.Audio.play('ui'); Sc.char(); });
    on('[data-scar]', 'change', b => { A.takeScar(b.dataset.scar); Sc.char(); });
  };

  // ================================================================== SKILLS
  const ACTIVE = [['doctor', 'Patch up yourself or a companion (click them).'], ['butchery', 'Cut a dead creature for meat and parts.'], ['lockwork', 'Pick a lock on a door, cage, locker or safe.'], ['tinker', 'Work a machine: pumps, grates, traps.'], ['wrangle', 'Calm a Lump or beast.'], ['sneak', 'Toggle sneaking.']];
  Sc.skills = () => {
    const pc = G.S.pc;
    panel('Use a Skill', 'Pick a skill, then click the target', `<div class="list">${ACTIVE.map(([id, d]) => `<div class="row" data-sk="${id}"><span></span><span><b>${GG.R.SKILL[id].name}</b> — <i>${esc(d)}</i></span><span class="n">${G.skill(pc, id)}%</span></div>`).join('')}</div>
      <p style="margin-top:10px"><button id="selfdoc">Doctor yourself now</button></p>`);
    on('[data-sk]', 'click', el => {
      const id = el.dataset.sk;
      Sc.close();
      if (id === 'sneak') { G.toggleSneak(); return; }
      UI.mode = 'skill:' + id;
      document.body.classList.add('skillmode');
      UI.toast(`${GG.R.SKILL[id].name}: click a target (right-click to cancel).`);
    });
    $('#selfdoc').onclick = () => { Sc.close(); A.skillOnEnt('doctor', pc); };
  };

  // ================================================================== ALMANAC
  let almTab = 'quests';
  Sc.alm = (tab) => {
    if (tab) almTab = tab;
    const S = G.S;
    let body = '';
    if (almTab === 'quests') {
      const qs = Object.entries(S.quests).sort((a, b) => (a[1].done - b[1].done));
      body = qs.map(([id, q]) => {
        const def = GG.QUESTS[id];
        const hist = q.hist.slice(0, -1).map(st => `<p class="old">${esc(def.stages[st] || '')}</p>`).join('');
        return `<div class="quest ${q.done ? 'done' : ''}"><h3>${esc(def.name)}${q.done ? ' ✓' : ''}</h3>${hist}<p>${esc(def.stages[q.stage] || '')}</p></div>`;
      }).join('') || '<p><i>No quests yet. Talk to people. Someone in Gutwater always needs something.</i></p>';
    } else if (almTab === 'rest') {
      const can = G.canRest();
      body = `<p>${U.fmtTime(S.time)}. ${U.isNight(S.time) ? 'Night. Gristlings bud from their nests in the dark.' : 'Daylight.'}</p>
        <p>${can ? 'It is quiet enough to rest here.' : '<b>You cannot rest with enemies nearby.</b>'}</p>
        <p><button data-r="1" ${can ? '' : 'disabled'}>Wait 1 hour</button> <button data-r="morning" ${can ? '' : 'disabled'}>Until morning</button> <button data-r="night" ${can ? '' : 'disabled'}>Until nightfall</button> <button data-r="heal" ${can ? '' : 'disabled'}>Until healed</button></p>`;
    } else if (almTab === 'save') {
      const slot = s => { const m = Sc.meta(s); return `<div class="row"><span style="font-family:var(--disp)">${s === 'auto' ? 'Auto' : 'Slot ' + s}</span><span>${m ? `${esc(m.name)}, L${m.level} · ${esc(m.loc)} · ${esc(m.time)} <small style="color:#7a6a58">(${esc(m.at)})</small>` : '<i>empty</i>'}</span><span>${s !== 'auto' ? `<button data-save="${s}">Save</button> ` : ''}${m ? `<button data-load="${s}">Load</button>` : ''}</span></div>`; };
      body = `<div class="list">${['auto', ...Sc.SLOTS].map(slot).join('')}</div><p style="margin-top:12px"><button id="exp">Export save file…</button> <button id="imp">Import save file…</button></p><p><i>Saves live in this browser. Export a file to keep a copy elsewhere.</i></p>`;
    } else if (almTab === 'status') {
      body = `<div class="kv"><span>Date</span><b>${U.fmtTime(S.time)}</b><span>Title</span><b>${esc(G.title())}</b><span>Kills</span><b>${S.stats.kills}</b><span>Tickets</span><b>${G.count(S.pc, 'ticket')}</b><span>Locations known</span><b>${Object.keys(S.world.known).length}</b></div>`;
    }
    const tabs = [['quests', 'Quests'], ['rest', 'Rest'], ['status', 'Status'], ['save', 'Save & Load']].map(([k, l]) => `<button data-tab="${k}" class="${almTab === k ? 'cur' : ''}">${l}</button>`).join('');
    panel('The Almanac', 'Quests, time and records', `<div class="tabs" style="padding:0;margin-bottom:10px">${tabs}</div>${body}`);
    on('[data-tab]', 'click', b => Sc.alm(b.dataset.tab));
    on('[data-r]', 'click', b => {
      const r = b.dataset.r;
      if (r === 'heal') G.restUntilHealed();
      else if (r === 'morning') { let n = 0; while ((U.hourOf(S.time) < 6 || U.hourOf(S.time) > 7) && n++ < 30 && G.canRest()) G.advance(60); G.log(`You sleep until ${U.fmtTime(S.time)}.`); }
      else if (r === 'night') { let n = 0; while (!U.isNight(S.time) && n++ < 30 && G.canRest()) G.advance(60); G.log(`You wait until ${U.fmtTime(S.time)}.`); }
      else G.rest(1);
      if (S.mode !== 'explore') { Sc.close(); return; }
      Sc.alm();
    });
    on('[data-save]', 'click', b => { Sc.save(b.dataset.save); Sc.alm(); });
    on('[data-load]', 'click', b => Sc.load(b.dataset.load));
    if ($('#exp')) $('#exp').onclick = Sc.exportSave;
    if ($('#imp')) $('#imp').onclick = Sc.importSave;
  };

  // ================================================================== LOOT
  Sc.loot = () => {
    const S = G.S, ref = S.ui && S.ui.type === 'loot' ? S.ui : Sc.lastLoot;
    if (!ref) return Sc.close();
    Sc.lastLoot = ref;
    S.ui = ref;
    const c = A.containerOf(ref);
    if (!c) return Sc.close();
    const nm = ref.ent ? c.name : (c.name || GG.OBJT[c.type].name);
    const row = (s, side) => `<div class="row" data-${side}="${s.id}"><img src="${GG.SP.icon(s.id)}"><span>${esc(GG.ITEMS[s.id].name)}</span><span class="n">${s.n > 1 ? '×' + s.n : ''}</span></div>`;
    panel(esc(nm), ref.ent ? 'Searching the body' : 'Contents', `<div class="cols"><div><h2>${esc(nm)}</h2><div class="list">${c.inv.map(s => row(s, 'take')).join('') || '<i>Nothing left.</i>'}</div></div>
      <div><h2>Your pack</h2><div class="list">${S.pc.inv.filter(s => GG.ITEMS[s.id].type !== 'quest').map(s => row(s, 'put')).join('')}</div></div></div>
      ${ref.ent && GG.CREATURES[c.tpl] && GG.CREATURES[c.tpl].butcher && !c.butchered ? `<p><button id="butch">Butcher it (${G.skill(S.pc, 'butchery')}%)</button></p>` : ''}`,
      `<span class="grow">Click to move one item, shift-click to move a stack.</span><button id="tall">Take all</button><button data-close>Done</button>`);
    on('[data-take]', 'click', (el, e) => { A.take(ref, el.dataset.take, e.shiftKey ? 999 : 1); if (Sc.cur === 'loot' && S.ui) Sc.loot(); else if (S.mode === 'combat') Sc.close(); });
    on('[data-put]', 'click', (el, e) => { A.put(ref, el.dataset.put, e.shiftKey ? 999 : 1); Sc.loot(); });
    $('#tall').onclick = () => { A.takeAll(ref); if (S.ui) Sc.close(); };
    if ($('#butch')) $('#butch').onclick = () => { A.skillOnEnt('butchery', c); Sc.loot(); };
  };

  // ================================================================== BARTER
  let offerMine = [], offerTheirs = [];
  Sc.barter = () => {
    const S = G.S, ref = S.ui && S.ui.type === 'barter' ? S.ui : null;
    if (!ref) return Sc.close();
    const m = G.ent(ref.ent);
    const avail = (inv, offer) => inv.map(s => ({ id: s.id, n: s.n - (offer.find(o => o.id === s.id) || { n: 0 }).n })).filter(s => s.n > 0 && GG.ITEMS[s.id].type !== 'quest');
    const myInv = avail(S.pc.inv, offerMine), theirInv = avail(m.inv, offerTheirs);
    const price = (id, mine) => id === 'ticket' ? 1 : mine ? A.sellPrice(id, m) : A.buyPrice(id, m);
    const row = (s, side, mine) => `<div class="row" data-${side}="${s.id}"><img src="${GG.SP.icon(s.id)}"><span>${esc(GG.ITEMS[s.id].name)}${s.n > 1 ? ' ×' + s.n : ''}</span><span class="n">${price(s.id, mine)}</span></div>`;
    const bal = A.tradeBalance(m, offerMine, offerTheirs);
    const pay = bal < 0 ? -bal : 0, get = bal > 0 ? Math.min(bal, G.count(m, 'ticket')) : 0;
    panel(`Trading with ${esc(m.name)}`, `You: ${G.count(S.pc, 'ticket')} tickets · ${esc(m.name)}: ${G.count(m, 'ticket')} tickets · Haggle ${G.skill(S.pc, 'haggle')}%`,
      `<div class="trade"><div class="col"><h2>Your pack</h2>${myInv.filter(s => s.id !== 'ticket').map(s => row(s, 'om', true)).join('')}</div>
        <div class="col"><h2>You offer</h2>${offerMine.map(s => row(s, 'rm', true)).join('') || '<i>—</i>'}</div>
        <div class="col"><h2>You take</h2>${offerTheirs.map(s => row(s, 'rt', false)).join('') || '<i>—</i>'}</div>
        <div class="col"><h2>${esc(m.name)}</h2>${theirInv.filter(s => s.id !== 'ticket').map(s => row(s, 'ot', false)).join('')}</div></div>`,
      `<span class="grow balance">${pay ? `You pay ${pay} tickets` : get ? `You receive ${get} tickets${bal > get ? ` (they only have ${G.count(m, 'ticket')})` : ''}` : 'Even trade'}</span><button id="bclear">Clear</button><button id="bdeal" class="red" ${pay > G.count(S.pc, 'ticket') || (!offerMine.length && !offerTheirs.length) ? 'disabled' : ''}>Deal</button><button data-close>Leave</button>`);
    const mv = (arr, id, n) => { const s = arr.find(o => o.id === id); if (s) s.n += n; else arr.push({ id, n }); for (let i = arr.length - 1; i >= 0; i--) if (arr[i].n <= 0) arr.splice(i, 1); };
    const cnt = (inv, id) => (inv.find(s => s.id === id) || { n: 0 }).n;
    on('[data-om]', 'click', (el, e) => { const id = el.dataset.om; mv(offerMine, id, e.shiftKey ? cnt(myInv, id) : 1); Sc.barter(); });
    on('[data-ot]', 'click', (el, e) => { const id = el.dataset.ot; mv(offerTheirs, id, e.shiftKey ? cnt(theirInv, id) : 1); Sc.barter(); });
    on('[data-rm]', 'click', (el, e) => { const id = el.dataset.rm; mv(offerMine, id, e.shiftKey ? -999 : -1); Sc.barter(); });
    on('[data-rt]', 'click', (el, e) => { const id = el.dataset.rt; mv(offerTheirs, id, e.shiftKey ? -999 : -1); Sc.barter(); });
    $('#bclear').onclick = () => { offerMine = []; offerTheirs = []; Sc.barter(); };
    $('#bdeal').onclick = () => { const r = A.trade(m, offerMine.map(s => ({ ...s })), offerTheirs.map(s => ({ ...s }))); UI.toast(r.msg); if (r.ok) { offerMine = []; offerTheirs = []; } Sc.barter(); };
    root().querySelectorAll('[data-close]').forEach(b => b.onclick = () => { offerMine = []; offerTheirs = []; Sc.close(); });
  };

  // ================================================================== MENU / DEATH / WORLD PROMPTS
  Sc.menu = () => {
    panel('Menu', '', `<div style="display:grid;gap:8px;max-width:360px;margin:auto">
      <button id="mres">Resume</button><button id="msave">Save &amp; Load</button><button id="mhelp">How to Play</button>
      <button id="mmus">Music: ${GG.Audio.musicOn ? 'on' : 'off'}</button><button id="mquit" class="red">Quit to Title</button></div>`, ' ');
    $('#mres').onclick = Sc.close;
    $('#msave').onclick = () => Sc.open('alm', 'save');
    $('#mhelp').onclick = () => Sc.open('help');
    $('#mmus').onclick = () => { GG.Audio.musicOn = !GG.Audio.musicOn; Sc.menu(); };
    $('#mquit').onclick = () => { if (confirm('Quit to title? Unsaved progress is lost.')) { G.S = null; Sc.open('title'); } };
  };
  const EPITAPHS = ['Here lies the Stray. Tasted of gristle.', 'Died as they lived: briefly.', 'Gone to the big top in the sky.', 'Not regrowing, unfortunately.', 'Their tickets were divided fairly. Mostly.'];
  Sc.death = () => {
    const S = G.S;
    root().innerHTML = `<div class="crawl"><h2>You Have Died</h2><p><i>"${esc(U.pick(EPITAPHS))}"</i></p><p>${esc(S.pc.name)}, ${esc(G.title())}. Level ${S.pc.level}. ${U.fmtTime(S.time)}.</p>
      <p><button id="dload">Load a Save</button> <button id="dnew">New Game</button></p></div>`;
    $('#dload').onclick = () => Sc.open('alm', 'save');
    $('#dnew').onclick = () => Sc.open('creation');
  };
  Sc.encounter = () => {
    const S = G.S, enc = S.world.enc;
    if (!enc) return Sc.close();
    const E = GG.ENCOUNTERS[enc.id];
    root().innerHTML = `<div class="slide" style="grid-template-columns:1fr"><div class="st"><h2>${esc(E.name)}</h2><p>${esc(E.text)}</p>
      <p style="margin-top:10px;font-family:var(--type);font-size:14px">${E.peaceful ? 'You could stop, or ride on.' : enc.avoidable ? `Your Survival (${G.skill(S.pc, 'survival')}%) spotted them first. You could slip past.` : 'Too late to avoid them.'}</p>
      <div class="nav">${enc.avoidable ? `<button id="eav">${E.peaceful ? 'Ride on' : 'Avoid them'}</button>` : ''}<button id="ego" class="red">${E.peaceful ? 'Stop here' : 'Face them'}</button></div></div></div>`;
    $('#ego').onclick = () => { Sc.close(); GG.World.resolveEncounter(true); };
    if ($('#eav')) $('#eav').onclick = () => { Sc.close(); GG.World.resolveEncounter(false); };
  };
  Sc.teaser = d => {
    root().innerHTML = `<div class="slide" style="grid-template-columns:1fr"><div class="st"><h2>${esc(GG.World.NODES[d.id].name)}</h2><p>${esc(d.text)}</p><div class="nav"><button id="tok">Turn back</button></div></div></div>`;
    $('#tok').onclick = Sc.close;
  };
  Sc.arrive = d => {
    const n = GG.World.NODES[d.id];
    const entries = GG.World.entries(d.id);
    root().innerHTML = `<div class="slide" style="grid-template-columns:1fr"><div class="st"><h2>${esc(n.name)}</h2><p>${esc(n.desc || '')}</p>
      <div class="nav">${entries ? entries.map(([k, l]) => `<button data-e="${k}" class="red">${esc(l)}</button>`).join('') : `<button data-e="" class="red">Enter</button>`}<button id="astay">Stay on the map</button></div></div></div>`;
    on('[data-e]', 'click', b => { Sc.close(); GG.World.enter(d.id, b.dataset.e || undefined); Sc.save('auto'); });
    $('#astay').onclick = Sc.close;
  };

  // ================================================================== ENDING
  Sc.ending = (i = 0) => {
    Sc.arg = i;
    const S = G.S, list = GG.ENDINGS;
    if (i >= list.length) {
      root().innerHTML = `<div class="crawl"><h2>End of Act 1: The Wasting</h2>
        <p>${esc(S.pc.name)}, ${esc(G.title())}. Level ${S.pc.level}. ${S.stats.kills} kills. ${G.count(S.pc, 'ticket')} tickets.</p>
        <p><i>Act 2, The Circuit, takes you on the road with the Grand Calliope.</i></p>
        <p><button id="eplay">Keep exploring</button> <button id="etitle">Title screen</button></p></div>`;
      $('#eplay').onclick = Sc.close;
      $('#etitle').onclick = () => { G.S = null; Sc.open('title'); };
      return;
    }
    const e = list[i];
    root().innerHTML = `<div class="slide"><canvas id="ecv" width="300" height="340"></canvas><div class="st"><h2>${esc(e.title)}</h2><p>${esc(e.text(S))}</p><div class="nav"><button id="enext">${i < list.length - 1 ? 'Next' : 'Finish'}</button></div></div></div>`;
    const who = { mother: { obj: { type: 'mother', health: S.flags.herdSaved ? 1 : 0.2 }, type: 'mother' }, stray: { look: S.pc.look, tpl: 'pc' } }[e.img] || { tpl: e.img, look: (GG.CREATURES[e.img === 'marrowby' ? 'marrowby' : e.img] || {}).look };
    GG.SP.portrait($('#ecv'), who);
    $('#enext').onclick = () => Sc.ending(i + 1);
  };
})();
