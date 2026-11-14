'use strict';
// HUD, log, tooltips, toasts, aim menu, dialogue panel.
(function () {
  const U = GG.U, G = GG.G, R = GG.R;
  const UI = GG.UI = {};
  const $ = s => document.querySelector(s);
  UI.$ = $;
  UI.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // *stage directions* become italics
  UI.fmt = s => UI.esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>');
  UI.mode = null;       // 'skill:<id>' while picking a target

  UI.init = () => {
    document.querySelectorAll('#btns button').forEach(b => b.addEventListener('click', () => { GG.Audio.play('ui'); UI.button(b.dataset.k); }));
    $('#weapon').addEventListener('click', () => { const pc = G.S.pc; if (!G.reload(pc)) { if (G.weapon(pc).mag) G.log(G.reloadNeed(pc) <= 0 ? 'No spare ammo, or already full.' : 'Not enough AP to reload.'); } });
    G.on(UI.event);
  };

  UI.button = k => {
    const S = G.S;
    if (!S || S.mode === 'dead') return;
    if (k === 'inv') return GG.Screens.open('inv');
    if (k === 'char') return GG.Screens.open('char');
    if (k === 'skill') return GG.Screens.open('skills');
    if (k === 'alm') return GG.Screens.open('alm');
    if (k === 'sneak') { if (S.mode !== 'world') G.toggleSneak(); return; }
    if (k === 'end') { if (S.mode === 'combat') GG.Combat.endTurnPlayer(); else if (S.mode === 'explore' && G.alive().some(e => G.hostileToPlayer(e) && U.de(e, S.pc) < 14)) GG.Combat.start(S.pc, true); return; }
    if (k === 'menu') return GG.Screens.open('menu');
  };

  // ---------------------------------------------------------- events
  UI.event = (type, d) => {
    GG.Render.event(type, d);
    switch (type) {
      case 'log': UI.addLog(d.text, d.cls); break;
      case 'dialog': UI.showDialog(); break;
      case 'ui': if (d.type === 'loot') GG.Screens.open('loot'); else if (d.type === 'barter') GG.Screens.open('barter'); break;
      case 'map': GG.Render.onMap(); UI.clearLog(true); GG.Audio.setAmbient(GG.MAPS[d.id] ? GG.MAPS[d.id].ambient : 'plains'); break;
      case 'world': GG.Screens.close(); UI.hideDialog(); break;
      case 'quest': UI.toast(`${GG.G.S.quests[d.id].done ? 'Quest complete' : 'Quest updated'}: ${GG.QUESTS[d.id].name}`); GG.Audio.play('quest'); break;
      case 'levelup': UI.toast(`Level ${d.level}! Open your Character sheet (C).`); GG.Audio.play('level'); break;
      case 'combat': GG.Render.follow = d.on; if (d.on) UI.toast('Combat!'); break;
      case 'sound': GG.Audio.play(d.s); break;
      case 'hit': GG.Audio.play(d.dtype === 'acid' ? 'squelch' : 'hit'); break;
      case 'gameover': setTimeout(() => GG.Screens.open('death'), 900); break;
      case 'intro': GG.Screens.open('intro'); break;
      case 'ending': setTimeout(() => GG.Screens.open('ending'), 200); break;
      case 'encounter': GG.Screens.open('encounter'); break;
      case 'teaser': GG.Screens.open('teaser', d); break;
      case 'arrive': GG.Screens.open('arrive', d); break;
    }
  };

  // ---------------------------------------------------------- log
  UI.addLog = (text, cls) => {
    const el = $('#log');
    const div = document.createElement('div');
    if (cls) div.className = 'l-' + cls;
    div.textContent = text;
    el.appendChild(div);
    while (el.children.length > 120) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  };
  UI.clearLog = (keep) => {
    const el = $('#log');
    el.innerHTML = '';
    if (keep && G.S) for (const l of G.S.log.slice(-30)) UI.addLog(l.t, l.c);
  };

  UI.toast = (text) => {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3800);
  };

  UI.tip = (html, x, y) => {
    const t = $('#tip');
    if (!html) { t.classList.add('hidden'); return; }
    t.innerHTML = html; t.classList.remove('hidden');
    const [W, H] = GG.Render.size();
    t.style.left = Math.min(W - t.offsetWidth - 8, x + 18) + 'px';
    t.style.top = Math.min(H - t.offsetHeight - 8, y + 16) + 'px';
  };

  // ---------------------------------------------------------- HUD
  let hudAcc = 0;
  UI.hud = (dt) => {
    hudAcc += dt;
    if (hudAcc < 0.1) return;
    hudAcc = 0;
    const S = G.S;
    const hud = $('#hud');
    if (!S || S.mode === 'end') { hud.classList.add('hidden'); return; }
    hud.classList.remove('hidden');
    const pc = S.pc;
    const mx = G.maxHp(pc);
    $('#hpfill').style.width = Math.max(0, pc.hp / mx * 100) + '%';
    $('#hptxt').textContent = `${Math.max(0, pc.hp)}/${mx}`;
    const ap = S.mode === 'combat' ? pc.ap : G.maxAp(pc), max = G.maxAp(pc);
    const pips = $('#appips');
    if (pips.children.length !== max) pips.innerHTML = '<i></i>'.repeat(max);
    [...pips.children].forEach((p, i) => p.classList.toggle('on', i < ap));
    const w = G.weapon(pc);
    const wkey = w.id + pc.loaded + G.count(pc, w.ammo || '_') + S.mode;
    if ($('#weapon').dataset.k !== wkey) {
      $('#weapon').dataset.k = wkey;
      $('#weapon').innerHTML = `<img src="${GG.SP.icon(w.id)}"><div><b>${UI.esc(w.name)}</b>${w.mag ? `${pc.loaded}/${w.mag} · ${G.count(pc, w.ammo)} spare` : w.thrown ? `${G.count(pc, w.id) + 1} left` : 'melee'} · ${GG.Combat.apCost(pc, w, 'torso')} AP · ${w.dmg[0]}–${w.dmg[1]} dmg</div>`;
    }
    const loc = S.mode === 'world' ? 'The Rind' : (G.geo ? G.geo.def.name : '');
    $('#loc').textContent = `${loc} — ${U.fmtTime(S.time)}${S.mode === 'combat' ? ` — Round ${S.combat.round}` : ''}`;
    $('#bsneak').classList.toggle('on', !!S.sneaking);
    $('#bend').textContent = S.mode === 'combat' ? (GG.Combat.isPcTurn() ? 'End Turn' : 'Wait…') : 'Fight';
    $('#bend').disabled = S.mode === 'combat' && !GG.Combat.isPcTurn();
    const party = S.map ? G.partyEnts().filter(e => e !== pc) : [];
    $('#party').textContent = party.map(p => `${p.name}: ${p.hp}/${G.maxHp(p)}`).join(' · ') + (pc.unspent || pc.scarPending ? `  ★ Level up! Open Character (C)` : '');
  };

  // ---------------------------------------------------------- aim menu
  UI.aimMenu = (e, sx, sy) => {
    const pc = G.S.pc, w = G.weapon(pc);
    const el = $('#aim');
    const parts = w.thrown ? ['torso'] : GG.Combat.partsOf(e);
    el.innerHTML = `<div class="h">${UI.esc(e.name)} — ${UI.esc(w.name)}</div>` + parts.map(p => {
      const ch = GG.Combat.hitChance(pc, e, p, w), ap = GG.Combat.apCost(pc, w, p);
      return `<button data-p="${p}"><span>${GG.Combat.AIM[p].name}</span><span>${ch}% · ${ap} AP</span></button>`;
    }).join('') + `<button data-p="x"><span>Cancel</span><span></span></button>`;
    el.classList.remove('hidden');
    const [W, H] = GG.Render.size();
    el.style.left = Math.min(W - 220, sx + 10) + 'px';
    el.style.top = Math.min(H - el.offsetHeight - 10, sy - 20) + 'px';
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
      el.classList.add('hidden');
      if (b.dataset.p !== 'x') G.attackCmd(e.id, b.dataset.p);
    });
  };
  UI.hideAim = () => $('#aim').classList.add('hidden');

  // ---------------------------------------------------------- dialogue
  UI.showDialog = () => {
    const S = G.S, D = GG.Dialog;
    const box = $('#dialog');
    if (!S.dlg) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const sp = S.dlg.sp ? G.ent(S.dlg.sp) : null;
    const obj = S.dlg.obj ? S.map.objs.find(o => o.id === S.dlg.obj) : null;
    const t = sp ? G.tplOf(sp) : null;
    $('#dname').innerHTML = sp ? `${UI.esc(sp.name)}${t && t.title ? `<small>${UI.esc(t.title)}</small>` : ''}` : UI.esc(obj ? (obj.name || GG.OBJT[obj.type].name) : '');
    const pc = $('#portrait');
    GG.SP.portrait(pc, sp ? { tpl: sp.tpl, look: sp.look || (t && t.look) } : { obj, type: obj && obj.type });
    $('#dtext').innerHTML = UI.fmt(D.text());
    const inter = D.inter();
    $('#dinter').innerHTML = inter ? UI.fmt(inter) : '';
    const opts = D.options();
    $('#dopts').innerHTML = opts.map((o, i) => `<li data-i="${i}">${o.tag ? `<span class="tag ${o.ok ? 'ok' : 'no'}">${UI.esc(o.tag)}</span>` : ''}${UI.fmt(o.t)}</li>`).join('');
    $('#dopts').querySelectorAll('li').forEach(li => li.onclick = () => { GG.Audio.play('ui'); D.choose(+li.dataset.i); });
    if (sp && sp.faction === 'marrow' && Math.random() < 0.3) GG.Audio.play('honk');
  };
  UI.hideDialog = () => $('#dialog').classList.add('hidden');
  G.on((type, d) => { if (type === 'dialog' && d.closed) UI.hideDialog(); });
})();
