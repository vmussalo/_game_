'use strict';
// Dialogue engine. Trees live in GG.DLG; conditions/effects are functions receiving the helper $.
(function () {
  const U = GG.U, R = GG.R, G = GG.G;
  const D = GG.Dialog = {};

  const SKN = id => (R.SKILL[id] ? R.SKILL[id].name : id === 'gut' ? 'Gut' : U.cap(id));

  // helper API for dialogue data
  D.$ = () => {
    const S = G.S, pc = S.pc;
    const $ = {
      S, pc,
      sp: S.dlg && S.dlg.sp ? G.ent(S.dlg.sp) : null,
      f: k => !!S.flags[k],
      v: k => S.flags[k] || 0,
      set: (k, v = true) => { S.flags[k] = v; },
      inc: (k, n = 1) => { S.flags[k] = (S.flags[k] || 0) + n; },
      q: id => (S.quests[id] ? S.quests[id].stage : 0),
      qdone: id => !!(S.quests[id] && S.quests[id].done),
      qset: (id, stage, done) => GG.Scripts.quest(id, stage, done),
      has: (id, n = 1) => G.count(pc, id) >= n || (n === 1 && G.has(id)),
      tickets: () => G.count(pc, 'ticket'),
      take: (id, n = 1) => { if (!G.removeItem(pc, id, n)) for (const p of G.partyEnts()) if (G.removeItem(p, id, n)) break; G.log(`Lost: ${n > 1 ? n + ' × ' : ''}${GG.ITEMS[id].name}.`, 'item'); },
      give: (id, n = 1) => { G.addItem(pc, id, n); G.log(`Received: ${n > 1 ? n + ' × ' : ''}${GG.ITEMS[id].name}.`, 'item'); if (GG.ITEMS[id].type === 'quest') GG.Scripts.onQuestItem(id); },
      xp: (n, why) => G.giveXp(n, why),
      skill: id => G.skill(pc, id),
      stat: id => R.stat(pc, id),
      gut: () => R.gutCheck(pc),
      lvl: () => pc.level,
      inParty: tpl => G.partyEnts().some(e => e.tpl === tpl),
      ent: id => G.ent(id),
      log: (t, c) => G.log(t, c),
      time: () => S.time,
      night: () => U.isNight(S.time),
      advance: m => G.advance(m),
      heal: () => { pc.hp = G.maxHp(pc); for (const p of G.partyEnts()) p.hp = G.maxHp(p); },
      tutor: (id, n) => { pc.tutor[id] = (pc.tutor[id] || 0) + n; G.log(`${SKN(id)} +${n}.`, 'lvl'); },
      title: () => G.title(),
      name: () => pc.name,
      emit: (t, d) => G.emit(t, d),
      reveal: id => GG.World.reveal(id),
      join: id => { const e = G.ent(id); if (e) { e.party = true; e.faction = 'player'; e.caged = false; e.gone = false; G.log(`${e.name} join${e.tpl === 'moe' ? '' : 's'} you.`, 'quest'); } },
      obj: () => (S.dlg && S.dlg.obj ? S.map.objs.find(o => o.id === S.dlg.obj) : null),
      destroy: () => { const o = $.obj(); if (o) { o.gone = true; G.rebuildObjCache(); } },
      hurt: n => { pc.hp -= n; G.float(pc, String(n), '#ff7060'); G.log(`You take ${n} damage.`, 'hurt'); if (pc.hp <= 0) G.die(pc); },
      stopPump: xp => {
        $.set('pumpStopped');
        const st = $.q('herd');
        if (st < 40 || st === 45) GG.Scripts.quest('herd', 40);
        G.giveXp(xp, 'pump');
        G.emit('sound', { s: 'clang' });
      },
      // noisy: everyone in the station hears; otherwise only witnesses react (after the dialogue closes)
      alarm: noisy => {
        if (S.flags.marrowHostile || S.flags.marrowGone) return;
        const present = G.alive().filter(e => e.faction === 'marrow' && !e.gone);
        if (!present.length) return;
        if (noisy || G.witnessed('marrow', 10)) { S.flags.marrowHostile = true; S.pendingCombat = true; }
      },
      blowback: () => {
        for (const e of G.alive()) if (e.faction === 'marrow' && e.x >= 25 && e.y <= 30) GG.Combat.damage(e, U.ri(15, 30), { from: pc, dtype: 'acid' });
        $.alarm(true);
      },
    };
    return $;
  };

  D.start = (dlgId, speakerId, initiated, obj) => {
    const S = G.S;
    const T = GG.DLG[dlgId];
    if (!T) return;
    S.dlg = { id: dlgId, sp: speakerId || null, obj: obj || null, node: null, hist: [] };
    if (S.pc.path) S.pc.path = null;
    const $ = D.$();
    let start = 'start';
    if (T.start) start = typeof T.start === 'function' ? T.start($) : T.start;
    D.goto(start);
  };

  D.goto = nodeId => {
    const S = G.S;
    if (!S.dlg) return;
    const T = GG.DLG[S.dlg.id];
    let guard = 0;
    while (guard++ < 20) {
      const n = T.nodes[nodeId];
      if (!n) { console.warn('missing node', S.dlg.id, nodeId); D.end(); return; }
      S.dlg.node = nodeId;
      if (n.do) n.do(D.$());
      if (!S.dlg) return;               // effect ended the dialogue (fight, barter...)
      // a node without text is a pure redirect; a node with text is shown and gets a "Continue" option
      if (n.go && !n.text) { nodeId = typeof n.go === 'function' ? n.go(D.$()) : n.go; continue; }
      break;
    }
    G.emit('dialog', {});
  };

  D.node = () => {
    const S = G.S;
    if (!S.dlg) return null;
    return GG.DLG[S.dlg.id].nodes[S.dlg.node];
  };
  D.text = () => {
    const n = D.node();
    if (!n) return '';
    const $ = D.$();
    return typeof n.text === 'function' ? n.text($) : n.text || '';
  };
  D.inter = () => {
    const n = D.node();
    if (!n || !n.moe || !D.$().inParty('moe')) return null;
    return typeof n.moe === 'function' ? n.moe(D.$()) : n.moe;
  };
  const checkVal = ($, chk) => {
    if (chk[0] === 'stat') return $.stat(chk[1]);
    if (chk[0] === 'gut') return $.gut();
    if (chk[0] === 'tickets') return $.tickets();
    return $.skill(chk[0]);
  };
  const checkLabel = chk => {
    if (chk[0] === 'stat') return `${U.cap(chk[1])} ${chk[2]}`;
    if (chk[0] === 'gut') return `Gut ${chk[1]}`;
    if (chk[0] === 'tickets') return `${chk[1]} tickets`;
    return `${SKN(chk[0])} ${chk[1]}`;
  };
  // visible options with labels
  D.options = () => {
    const S = G.S, n = D.node();
    if (!n) return [];
    const $ = D.$();
    const out = [];
    if (n.go && !(n.opts || []).length) return [{ i: -1, t: 'Continue.', tag: '', ok: true, cont: true }];
    (n.opts || []).forEach((o, i) => {
      if (o.if && !o.if($)) return;
      if (o.once && S.flags['once_' + o.once]) return;
      let t = typeof o.t === 'function' ? o.t($) : o.t;
      let tag = '';
      if (o.check) {
        const chk = o.check;
        const dc = chk[0] === 'stat' || chk[0] === 'tickets' ? chk[2] : chk[1];
        const ok = checkVal($, chk) >= dc;
        tag = `[${checkLabel(chk)}${chk[0] === 'stat' || chk[0] === 'gut' ? '' : ''}]`;
        out.push({ i, t, tag, ok });
      } else out.push({ i, t, tag: o.tag || '', ok: true });
    });
    return out;
  };

  D.choose = visIdx => {
    const S = G.S;
    if (!S.dlg) return;
    const vis = D.options();
    const v = vis[visIdx];
    if (!v) return;
    const n = D.node();
    if (v.cont) { S.dlg.hist.push(S.dlg.node); D.goto(typeof n.go === 'function' ? n.go(D.$()) : n.go); return; }
    const o = n.opts[v.i];
    const $ = D.$();
    S.dlg.hist.push(S.dlg.node);
    // one-shot options are used up on success; a failed check can be retried after improving the skill
    if (o.once && !o.check) S.flags['once_' + o.once] = true;
    let next = o.go;
    if (o.check) {
      const chk = o.check;
      const dc = chk[0] === 'stat' || chk[0] === 'tickets' ? chk[2] : chk[1];
      const pass = checkVal($, chk) >= dc;
      if (pass && o.once) S.flags['once_' + o.once] = true;
      const key = `chk_${S.dlg.id}_${S.dlg.node}_${v.i}`;
      if (pass) {
        if (!S.flags[key] && chk[0] !== 'tickets') { S.flags[key] = 1; G.giveXp(Math.max(15, Math.round(dc * (chk[0] === 'stat' || chk[0] === 'gut' ? 8 : 1.2))), 'check'); }
        if (o.okDo) o.okDo($);
      } else {
        next = o.fail || o.go;
        if (o.failDo) o.failDo($);
      }
      if (!pass && !o.fail) next = o.go;
    }
    if (o.do) o.do($);
    if (!S.dlg) return;
    const sp = S.dlg.sp ? G.ent(S.dlg.sp) : null;
    if (o.barter) { D.end(); if (sp) GG.Act.openBarter(sp); return; }
    if (o.fight) {
      D.end();
      if (sp) { GG.Act.provoke(sp); GG.Combat.start(sp); }
      return;
    }
    if (o.end || !next) { D.end(); return; }
    D.goto(typeof next === 'function' ? next($) : next);
  };

  D.end = () => {
    const S = G.S;
    if (!S.dlg) return;
    const T = GG.DLG[S.dlg.id];
    S.dlg = null;
    G.emit('dialog', { closed: true });
    if (T && T.after) T.after(D.$());
    GG.Scripts.afterDialog();
  };
})();
