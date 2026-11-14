'use strict';
// Actions on objects, items and skills; containers; barter; theft.
(function () {
  const U = GG.U, R = GG.R, G = GG.G;
  const A = GG.Act = {};
  const inCombat = () => G.S.mode === 'combat';

  // attacking or stealing from non-hostiles
  A.provoke = e => {
    const S = G.S;
    if (!e || G.hostileToPlayer(e)) return;
    if (e.faction === 'town') {
      if ((e.tpl === 'harrow' || e.tpl === 'deputy') && S.flags.harrowExposed) { e.hostileP = true; return; }
      S.flags.townHostile = true;
      G.log('Gutwater turns on you!', 'hurt');
    } else if (e.faction === 'marrow') S.flags.marrowHostile = true;
    else {
      e.angry = true;
      if (e.faction === 'beast') for (const o of G.alive()) if (o.tpl === e.tpl && U.de(o, e) < 8) o.angry = true;
    }
  };

  const lockChance = (sk, dc) => Math.round(U.clamp(70 + (sk - dc) * 1.5, 5, 95));
  A.lockChance = o => lockChance(G.skill(G.S.pc, 'lockwork'), o.locked);

  A.tryUnlock = (o, how) => {
    const S = G.S, pc = S.pc;
    if (o.key && G.has(o.key)) { o.locked = 0; G.log(`You unlock it with the ${GG.ITEMS[o.key].name}.`); return true; }
    if (how === 'lockwork') {
      if (inCombat()) { if (pc.ap < 4) { G.log('Not enough AP.'); return false; } pc.ap -= 4; } else G.advance(2);
      const ch = A.lockChance(o);
      if (U.roll(ch)) {
        o.locked = 0;
        G.log(`You pick the lock. (${ch}%)`);
        G.emit('sound', { s: 'click' });
        if (!o.pickedXp) { o.pickedXp = true; G.giveXp(25 + Math.round(o.lockDc || 0)); }
        return true;
      }
      G.log(`The lock resists. (${ch}%)`);
      return false;
    }
    G.log(`Locked.${o.key ? ' It needs a key' : ''}${o.key ? ', or' : ''} Try Lockwork (${A.lockChance(o)}% chance).`);
    return false;
  };

  A.useObj = (o, skill, item) => {
    const S = G.S, pc = S.pc;
    if (!o || o.gone) return;
    const T = GG.OBJT[o.type] || {};
    if (o.script && GG.SCRIPTS.obj[o.script]) { if (GG.SCRIPTS.obj[o.script](G, o, { skill, item }) !== false) return; }
    if (item) return A.useItemOn(item, o);
    if (o.type === 'door' || o.type === 'grate' || o.type === 'cagedoor') {
      if (o.locked) {
        if (o.type === 'grate' && !skill && R.stat(pc, 'grit') >= 6) { o.locked = 0; G.log('You put your shoulder into the rusted grate. It gives with a shriek.'); G.emit('sound', { s: 'clang' }); }
        else if (o.type === 'grate' && skill === 'tinker' && G.skill(pc, 'tinker') >= 20) { o.locked = 0; G.log('You knock the rusted hinge pins out. The grate swings free.'); }
        else if (!A.tryUnlock(o, skill)) return;
      }
      if (o.open && G.entAt(o.at[0], o.at[1])) { G.log('Something is in the way.'); return; }
      o.open = !o.open;
      G.emit('sound', { s: o.type === 'door' ? 'door' : 'clang' });
      if (o.id === 'moecage' && o.open) GG.SCRIPTS.obj.moecage(G, o);
      return;
    }
    if (T.container || o.inv) {
      if (o.locked && !A.tryUnlock(o, skill)) return;
      return A.openContainer({ obj: o.id });
    }
    G.log(o.desc || `${o.name || T.name}.`);
  };

  A.look = (kind, id) => {
    if (kind === 'ent') {
      const e = G.ent(id);
      if (!e) return;
      const t = G.tplOf(e);
      if (e.id === 'pc') { G.log(`That's you. ${G.title()}. ${e.hp}/${G.maxHp(e)} HP.`); return; }
      const hp = e.hp / G.maxHp(e);
      const st = e.dead ? 'dead' : hp > 0.9 ? 'unhurt' : hp > 0.6 ? 'wounded' : hp > 0.3 ? 'badly wounded' : 'almost dead';
      G.log(`${e.name}${t && t.title ? ', ' + t.title : ''}. Looks ${st}.${t && t.weapon && !e.dead ? ' Armed with ' + G.weapon(e).name + '.' : ''}`);
      return;
    }
    const o = G.S.map.objs.find(o => o.id === id);
    if (o) G.log(o.desc || (o.name || GG.OBJT[o.type].name) + (o.locked ? ' (locked)' : '') + '.');
  };

  // ---------------------------------------------------------- containers
  A.openContainer = ref => {
    G.S.ui = Object.assign({ type: 'loot' }, ref);
    G.emit('ui', G.S.ui);
  };
  A.containerOf = ref => ref.ent ? G.ent(ref.ent) : G.S.map.objs.find(o => o.id === ref.obj);
  A.take = (ref, id, n) => {
    const S = G.S, c = A.containerOf(ref);
    if (!c) return;
    const s = c.inv.find(s => s.id === id);
    if (!s) return;
    n = Math.min(n || s.n, s.n);
    if (c.owner === 'town' && !S.flags.townHostile && G.witnessed('town', 8)) {
      S.stats.caught++;
      if (S.stats.caught >= 2) {
        G.log('"THIEF!" Gutwater has had enough of you.', 'hurt');
        S.ui = null;
        for (const e of G.alive()) if (e.tpl === 'harrow' || e.tpl === 'deputy') e.hostileP = true;
        const h = G.alive().find(e => e.hostileP);
        if (h) GG.Combat.start(h);
        return;
      }
      G.log('"Hey! Put that back." Somebody saw you. Next time there will be trouble.', 'hurt');
      return;
    }
    G.removeItem(c, id, n);
    G.addItem(S.pc, id, n);
    if (GG.ITEMS[id].type === 'quest') GG.Scripts.onQuestItem(id);
  };
  A.takeAll = ref => {
    const c = A.containerOf(ref);
    if (!c) return;
    for (const s of c.inv.slice()) { A.take(ref, s.id, s.n); if (!G.S.ui) break; }
  };
  A.put = (ref, id, n) => {
    const c = A.containerOf(ref), pc = G.S.pc;
    if (!c || GG.ITEMS[id].type === 'quest') return;
    n = Math.min(n || G.count(pc, id), G.count(pc, id));
    if (n <= 0) return;
    G.removeItem(pc, id, n);
    G.addItem(c, id, n);
  };
  A.drop = (id, n) => {
    const S = G.S, pc = S.pc;
    const it = GG.ITEMS[id];
    if (it.type === 'quest') { G.log('You might need that.'); return; }
    n = Math.min(n || 1, G.count(pc, id));
    if (n <= 0) return;
    G.removeItem(pc, id, n);
    let pile = S.map.objs.find(o => o.type === 'bones' && o.at[0] === pc.x && o.at[1] === pc.y && o.pile);
    if (!pile) { pile = { id: 'pile' + Date.now() % 1e7 + U.ri(0, 999), type: 'bones', at: [pc.x, pc.y], pile: true, name: 'Dropped Items', inv: [] }; S.map.objs.push(pile); G.rebuildObjCache(); }
    G.addItem(pile, id, n);
  };

  // ---------------------------------------------------------- items
  A.useItem = (user, id, target) => {
    const S = G.S;
    const it = GG.ITEMS[id];
    if (!it || G.count(user, id) <= 0) return false;
    target = target || user;
    if (it.type === 'weapon' || it.type === 'armor') { if (inCombat() && user.ap < 2) return false; if (inCombat()) user.ap -= 2; return G.equip(user, id); }
    if (it.type !== 'use') { G.log(it.desc || 'Nothing happens.'); return false; }
    if (inCombat()) { if (user.ap < (it.ap || 2)) { if (user.id === 'pc') G.log('Not enough AP.'); return false; } user.ap -= it.ap || 2; }
    G.removeItem(user, id, 1);
    const tn = target.id === 'pc' ? 'You' : target.name;
    if (it.heal) {
      let h = U.ri(it.heal[0], it.heal[1]);
      if (target.id === 'pc') {
        h *= R.mods(target).reduce((m, q) => m * (q.healMul || 1), 1);
        if (it.food) h *= R.mods(target).reduce((m, q) => m * (q.foodMul || 1), 1);
      }
      h = Math.round(h);
      const before = target.hp;
      target.hp = Math.min(G.maxHp(target), target.hp + h);
      G.float(target, `+${target.hp - before}`, '#80e080');
      G.log(`${tn} use${target.id === 'pc' ? '' : 's'} ${it.name}: +${target.hp - before} HP.`);
      G.emit('sound', { s: it.food ? 'eat' : 'heal' });
    }
    if (it.cure) { target.poisoned = 0; }
    if (it.buff) {
      target.buffs = target.buffs.filter(b => b.name !== it.buff.name);
      target.buffs.push(Object.assign({}, it.buff, { until: S.time + it.buff.dur }));
      if (it.buff.ap && inCombat()) target.ap += it.buff.ap;
      G.log(`${tn} use${target.id === 'pc' ? '' : 's'} ${it.name}.`);
      if (it.drink) G.emit('sound', { s: 'drink' });
    }
    return true;
  };
  A.useItemOn = (id, o) => { G.log('That does nothing useful here.'); };

  // ---------------------------------------------------------- skills
  A.skillOnEnt = (skill, e) => {
    const S = G.S, pc = S.pc;
    if (!e) return;
    if (skill === 'doctor') {
      if (e.dead) { G.log('Too late for that.'); return; }
      if (G.hostileToPlayer(e)) { G.log('They will not hold still for it.'); return; }
      if (e.hp >= G.maxHp(e)) { G.log(`${e.id === 'pc' ? 'You are' : e.name + ' is'} not hurt.`); return; }
      if ((e.docUntil || 0) > S.time) { G.log('The stitches need time. Try again later.'); return; }
      const sk = G.skill(pc, 'doctor');
      let h = Math.round((4 + sk / 6 + U.ri(0, 6)) * R.mods(pc).reduce((m, q) => m * (q.docMul || 1), 1));
      if (inCombat()) { if (pc.ap < 4) { G.log('Not enough AP.'); return; } pc.ap -= 4; } else if (!(pc.scars || []).includes('bonesetter')) G.advance(15);
      e.docUntil = S.time + 120;
      const before = e.hp;
      e.hp = Math.min(G.maxHp(e), e.hp + h);
      G.float(e, `+${e.hp - before}`, '#80e080');
      G.log(`You patch up ${e.id === 'pc' ? 'yourself' : e.name}: +${e.hp - before} HP.`);
      if (!S.flags.docXp) { S.flags.docXp = true; G.giveXp(25); }
      return;
    }
    if (skill === 'butchery') {
      const t = G.tplOf(e);
      if (!e.dead) { G.log('It has to be dead first. Usually.'); return; }
      if (!t || !t.butcher) { G.log(t && !t.beast ? 'Even in the Rind, there are lines.' : 'Nothing worth cutting.'); return; }
      if (e.butchered) { G.log('Already picked clean.'); return; }
      e.butchered = true;
      const sk = G.skill(pc, 'butchery');
      if (!inCombat()) G.advance(10);
      let got = 0;
      for (const [id, n] of t.butcher) {
        const k = Math.max(0, Math.round(n * (sk >= 60 ? 1.5 : sk >= 30 ? 1 : 0.5) + (U.r() < 0.4 ? 1 : 0) - (sk < 20 ? 1 : 0)));
        if (k > 0) { G.addItem(pc, id, k); got += k; G.log(`You cut ${k} × ${GG.ITEMS[id].name}.`); }
      }
      if (!got) G.log('You make a mess of it. Nothing usable.');
      G.emit('sound', { s: 'squelch' });
      G.giveXp(10);
      return;
    }
    if (skill === 'wrangle') {
      const t = G.tplOf(e);
      if (!t || !t.beast || e.dead) { G.log('You cannot wrangle that.'); return; }
      const sk = G.skill(pc, 'wrangle');
      if (e.tpl === 'lumper') {
        if (e.angry) {
          if (U.roll(sk + 20)) { e.angry = false; G.log('You hum the old herding tune. The Lump settles, wetly.'); if (inCombat()) GG.Combat.checkEnd(); }
          else G.log('The Lump is not in the mood.');
        } else G.log('You scratch the Lump behind what might be an ear. It purrs like a wet engine.');
        return;
      }
      G.log('That one is past wrangling.');
      return;
    }
    if (skill === 'gab' || skill === 'show') { G.talk(e); return; }
    G.log('Nothing to do with that here.');
  };

  A.useSkill = (skill, kind, id) => {
    const S = G.S, pc = S.pc;
    if (skill === 'sneak') return G.toggleSneak();
    if (kind === 'self') return A.skillOnEnt(skill, pc);
    if (kind === 'ent') {
      const e = G.ent(id);
      if (!e) return;
      if (e === pc) return A.skillOnEnt(skill, pc);
      if (U.de(pc, e) <= 1) return A.skillOnEnt(skill, e);
      return G.approach({ kind: 'skillEnt', id, skill });
    }
    if (kind === 'obj') return G.approach({ kind: 'use', id, skill });
  };

  // ---------------------------------------------------------- barter
  A.priceMul = (merchant) => {
    const pc = G.S.pc;
    const m = U.clamp(G.skill(pc, 'haggle') / 100, 0, 1.6);
    let buy = 2.0 - 0.6 * m, sell = 0.35 + 0.25 * m;
    if ((pc.quirks || []).includes('fairborn') && merchant && merchant.faction === 'town') buy *= 1.1;
    if (merchant && merchant.tpl === 'saltlick' && G.S.flags.saltlickDiscount) buy *= 0.85;
    return { buy, sell };
  };
  A.buyPrice = (id, merchant) => Math.max(1, Math.round(GG.ITEMS[id].value * A.priceMul(merchant).buy));
  A.sellPrice = (id, merchant) => Math.max(0, Math.floor(GG.ITEMS[id].value * A.priceMul(merchant).sell));
  A.openBarter = e => { G.S.ui = { type: 'barter', ent: e.id }; G.emit('ui', G.S.ui); };
  // offers: arrays of {id,n}. Tickets are added automatically to balance.
  A.tradeBalance = (merchant, mine, theirs) => {
    const give = mine.reduce((a, s) => a + (s.id === 'ticket' ? s.n : A.sellPrice(s.id, merchant) * s.n), 0);
    const take = theirs.reduce((a, s) => a + (s.id === 'ticket' ? s.n : A.buyPrice(s.id, merchant) * s.n), 0);
    return give - take;
  };
  A.trade = (merchant, mine, theirs) => {
    const pc = G.S.pc;
    const bal = A.tradeBalance(merchant, mine, theirs);
    let payTickets = 0, getTickets = 0;
    if (bal < 0) payTickets = -bal; else getTickets = Math.min(bal, G.count(merchant, 'ticket'));
    if (payTickets > G.count(pc, 'ticket')) return { ok: false, msg: 'You cannot afford that.' };
    for (const s of mine) if (G.count(pc, s.id) < s.n) return { ok: false, msg: 'You do not have that.' };
    for (const s of theirs) if (G.count(merchant, s.id) < s.n) return { ok: false, msg: 'They do not have that.' };
    for (const s of mine) { G.removeItem(pc, s.id, s.n); G.addItem(merchant, s.id, s.n); }
    for (const s of theirs) { G.removeItem(merchant, s.id, s.n); G.addItem(pc, s.id, s.n); }
    if (payTickets) { G.removeItem(pc, 'ticket', payTickets); G.addItem(merchant, 'ticket', payTickets); }
    if (getTickets) { G.removeItem(merchant, 'ticket', getTickets); G.addItem(pc, 'ticket', getTickets); }
    G.emit('sound', { s: 'coins' });
    return { ok: true, msg: payTickets ? `You pay ${payTickets} tickets.` : getTickets ? `You receive ${getTickets} tickets.` : 'Deal.' };
  };

  // ---------------------------------------------------------- levelling
  A.spendSkill = (id, n = 1) => {
    const pc = G.S.pc;
    if (pc.unspent < n || G.skill(pc, id) >= 200) return false;
    pc.skillPts[id] = (pc.skillPts[id] || 0) + n;
    pc.unspent -= n;
    return true;
  };
  A.takeScar = id => {
    const pc = G.S.pc;
    if (!pc.scarPending || pc.scars.includes(id)) return false;
    pc.scars.push(id);
    pc.scarPending--;
    pc.hp = Math.min(G.maxHp(pc), pc.hp + (GG.R.SCAR[id].hpLvl || 0) * pc.level);
    G.log(`New Scar: ${GG.R.SCAR[id].name}.`, 'lvl');
    return true;
  };
})();
