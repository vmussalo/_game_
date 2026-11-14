'use strict';
// Turn-based combat: initiative, AP, aimed attacks, criticals, AI.
(function () {
  const U = GG.U, R = GG.R, G = GG.G;
  const C = GG.Combat = {};

  C.AIM = {
    torso: { name: 'Torso', pen: 0, crit: 0 },
    head: { name: 'Head', pen: 40, crit: 25 },
    eyes: { name: 'Eyes', pen: 60, crit: 40 },
    arms: { name: 'Arms', pen: 30, crit: 10 },
    legs: { name: 'Legs', pen: 20, crit: 10 },
    groin: { name: 'Groin', pen: 30, crit: 20 },
    tumor: { name: 'Tumour', pen: 10, crit: 35 },
  };
  C.partsOf = e => {
    const t = G.tplOf(e);
    if (t && t.beast) return ['torso', 'head', 'legs'].concat(t.parts || []);
    return ['torso', 'head', 'eyes', 'arms', 'legs', 'groin'];
  };

  // grotesque critical flavour, {t} = target name
  C.CRIT_TXT = {
    head: ['{t}\'s skull rings like a cheap bell.', '{t}\'s hat leaves. So does a tooth or two.', '{t} loses an ear, and seems more upset about the hat.'],
    eyes: ['{t} is blinded and screams for a mother who never loved them.', '{t}\'s eye pops like a grape at a church picnic.'],
    torso: ['The blow goes clean through {t}\'s defences, and partly through {t}.', '{t} folds like a cheap deckchair.'],
    arms: ['{t}\'s arm bends a new and exciting way. The weapon drops.', '{t} drops everything to cradle what used to be an elbow.'],
    legs: ['{t}\'s knee makes a noise like a wet branch.', '{t} will be limping into the afterlife.'],
    groin: ['{t} makes a sound only dogs can hear.', '{t} goes cross-eyed and falls to the ground. The audience winces.'],
    tumor: ['{t}\'s tumour bursts in a hot spray of acid.', 'The tumour pops. {t} deflates with a whistle.'],
  };

  C.CRIT_PC = {
    head: ['Your skull rings like a cheap bell.', 'Your hat leaves. So do a couple of teeth.'],
    eyes: ['Everything goes white, then red, then blurry.'],
    torso: ['The blow goes clean through your guard and partly through you.', 'You fold like a cheap deckchair.'],
    arms: ['Your arm bends a new and exciting way. You drop your weapon.'],
    legs: ['Your knee makes a noise like a wet branch.'],
    groin: ['You make a sound only dogs can hear.'],
  };
  C.cur = () => { const S = G.S; return S.combat ? G.ent(S.combat.order[S.combat.idx]) : null; };
  C.isPcTurn = () => G.S.mode === 'combat' && C.cur() === G.S.pc;

  const wantsIn = e => !e.dead && !e.gone && !e.caged && (e.party || G.alive().some(o => G.hostile(e, o) && U.de(e, o) <= 18));

  C.start = (initiator, playerFirst) => {
    const S = G.S;
    if (S.mode === 'combat') { C.join(initiator); return; }
    if (S.dlg) GG.Dialog.end();
    S.ui = null;
    S.mode = 'combat';
    const pc = S.pc;
    // only those who see the party, stand close, or started it join now; others join on sight or noise
    const parts = G.alive().filter(e => e.party || (U.de(e, pc) <= 22 && wantsIn(e) &&
      (e === initiator || (!e.sleep && U.de(e, pc) <= 6) || G.partyEnts().some(p => G.canSee(e, p)))));
    for (const e of parts) { e.path = null; e.pending = null; e.ap = G.maxAp(e); if (G.hostileToPlayer(e)) e.aware = true; }
    parts.sort((a, b) => (R.seq(b) - R.seq(a)) || (U.r() - 0.5));
    if (playerFirst) { parts.splice(parts.indexOf(pc), 1); parts.unshift(pc); }
    S.combat = { order: parts.map(e => e.id), idx: 0, round: 1, wait: 0, quiet: 0 };
    G.log('— Combat! —', 'combat');
    G.emit('combat', { on: true });
    G.emit('sound', { s: 'combat' });
    C.beginTurn();
  };
  C.join = e => {
    const S = G.S;
    if (!e || e.dead || S.combat.order.includes(e.id)) return;
    S.combat.order.push(e.id);
    e.aware = true; e.ap = G.maxAp(e); e.path = null;
  };

  C.beginTurn = () => {
    const S = G.S;
    if (S.mode !== 'combat') return;
    // newcomers who see a fight
    for (const e of G.alive()) if (!S.combat.order.includes(e.id) && wantsIn(e) && U.de(e, S.pc) <= 18 && G.partyEnts().some(p => G.canSee(e, p) && G.hostile(e, p))) C.join(e);
    let guard = 0;
    while (guard++ < 100) {
      const e = C.cur();
      if (e && !e.dead && !e.gone) break;
      S.combat.idx++;
      if (S.combat.idx >= S.combat.order.length) { S.combat.idx = 0; S.combat.round++; }
    }
    if (C.checkEnd()) return;
    const e = C.cur();
    e.ap = G.maxAp(e);
    if (e.cripLegs) e.ap = Math.max(2, e.ap - 2);
    S.combat.wait = 0.35;
    G.emit('turn', { id: e.id });
  };

  C.endTurn = () => {
    const S = G.S;
    if (S.mode !== 'combat') return;
    const e = C.cur();
    if (e && e.fleeing && !e.dead) {
      const far = G.partyEnts().every(p => U.de(e, p) > 11 || !G.los(e.x, e.y, p.x, p.y));
      if (far) { e.gone = true; G.log(`${e.name} escapes.`); }
    }
    S.combat.idx++;
    if (S.combat.idx >= S.combat.order.length) { S.combat.idx = 0; S.combat.round++; }
    C.beginTurn();
  };
  C.endTurnPlayer = () => { if (C.isPcTurn() && !G.S.pc.path) C.endTurn(); };

  C.checkEnd = () => {
    const S = G.S;
    const foes = G.alive().filter(e => G.hostileToPlayer(e) && !e.caged && !(e.fleeing && G.partyEnts().every(p => U.de(e, p) > 10)));
    const engaged = foes.filter(e => S.combat.order.includes(e.id) && (U.de(e, S.pc) <= 20) && (e.aware || G.partyEnts().some(p => G.canSee(e, p))));
    if (engaged.length && S.combat.round < 300) return false;
    C.end();
    return true;
  };
  C.end = () => {
    const S = G.S;
    S.mode = 'explore';
    S.combat = null;
    for (const e of G.alive()) { e.ap = G.maxAp(e); e.knocked = false; }
    G.log('— Combat over —', 'combat');
    G.emit('combat', { on: false });
  };

  C.update = dt => {
    const S = G.S;
    const e = C.cur();
    if (!e) return;
    if (e.path) { G.moveStep(e, dt * 1.35); return; }
    if (G.busy()) return;
    if (e === S.pc) {
      // escape: standing on a map exit with no enemy adjacent
      const ex = G.isExit(e.x, e.y);
      if (ex && !G.alive().some(o => G.hostileToPlayer(o) && U.de(o, e) <= 2)) {
        G.log('You slip away.');
        C.end();
        G.leaveMap(ex);
        return;
      }
      if (e.ap <= 0 && !e.pending) { S.combat.wait -= dt; if (S.combat.wait < -0.4) C.endTurn(); }
      return;
    }
    S.combat.wait -= dt;
    if (S.combat.wait > 0) return;
    S.combat.wait = 0.28;
    const r = C.aiStep(e);
    if (G.S.mode !== 'combat') return;
    if (r === 'done') C.endTurn();
  };

  // ---------------------------------------------------------- attacks
  C.apCost = (a, w, aim) => Math.max(2, w.ap + (aim && aim !== 'torso' ? 1 : 0) + (w.skill === 'guns' ? R.sum(a, 'gunAp') : 0));

  C.hitChance = (a, t, aim = 'torso', w = G.weapon(a)) => {
    let ch = G.skill(a, w.skill);
    const d = U.de(a, t);
    if (w.range > 1) {
      const perc = 2 + R.stat(a, 'wits');
      ch -= Math.max(0, d - perc) * 3;
      if (d > w.range) ch -= (d - w.range) * 10;
      ch -= G.coverOn(a, t);
      ch -= R.sum(a, 'aimPen');
    } else if (d > 1) return 0;
    ch -= R.armor(t).ac;
    if (!G.lit(t.x, t.y) && !(a.scars || []).includes('nightowl')) ch -= 10;
    const A = C.AIM[aim] || C.AIM.torso;
    ch -= A.pen;
    if (aim !== 'torso') ch += R.sum(a, 'aim');
    if (t.sleep || t.knocked) ch += 25;
    if (a.blind) ch -= 25;
    if (a.id === 'pc' && G.S.sneaking && !t.aware) ch += 15;
    return Math.round(U.clamp(ch, 5, 95));
  };

  C.canReach = (a, t, w = G.weapon(a)) => {
    const d = U.de(a, t);
    if (w.range <= 1) return d <= 1;
    return d <= w.range * 2 && G.los(a.x, a.y, t.x, t.y);
  };

  C.attack = (a, t, aim = 'torso') => {
    const S = G.S;
    let w = G.weapon(a);
    const cost = C.apCost(a, w, aim);
    if (a.ap < cost) return false;
    if (w.mag && a.loaded <= 0) return false;
    if (!C.canReach(a, t, w)) return false;
    a.ap -= cost;
    if (t.x !== a.x) a.facing = t.x > a.x ? 1 : -1;
    if (w.mag) a.loaded--;
    let tx = t.x, ty = t.y;
    const ch = C.hitChance(a, t, aim, w);
    const roll = U.r() * 100;
    const hit = roll < ch;
    if (w.thrown) {
      if (!G.removeItem(a, w.id, 1)) a.equip.weapon = 'fists';
      if (!hit) { const nb = U.pick(U.area(t.x, t.y, 2).filter(([c, r]) => G.inb(c, r) && !G.wallAt(c, r))); if (nb) { tx = nb[0]; ty = nb[1]; } }
    }
    G.emit('attack', { from: a.id, to: t.id, tx, ty, hit, w: w.id, ranged: w.range > 1, thrown: !!w.thrown });
    G.emit('sound', { s: w.thrown ? 'throw' : w.skill === 'guns' ? (w.id === 'scattergun' ? 'shotgun' : w.id === 'rivetgun' ? 'rivet' : 'shot') : w.natural ? 'bite' : 'swing' });
    if (!t.party && a.party && !G.hostileToPlayer(t)) GG.Act.provoke(t);
    t.aware = true;
    if (t.sleep) t.sleep = false;
    // noise draws in hostiles within earshot
    const noise = w.skill === 'guns' ? 11 : w.thrown ? 9 : 4;
    for (const o of G.alive()) {
      if (S.combat.order.includes(o.id) || U.de(o, a) > noise || o.caged) continue;
      if (U.de(o, a) > noise / 2 && !G.los(o.x, o.y, a.x, a.y)) continue; // walls muffle
      if (G.partyEnts().some(p => G.hostile(o, p))) { if (o.sleep && U.de(o, a) > 5) continue; o.sleep = false; C.join(o); }
    }
    if (w.thrown && w.splash) {
      G.emit('boom', { x: tx, y: ty, r: w.splash, dtype: w.dtype });
      G.emit('sound', { s: w.dtype === 'fire' ? 'boom' : 'splat' });
      for (const v of G.alive().filter(v => U.dist(v.x, v.y, tx, ty) <= w.splash)) {
        const near = U.dist(v.x, v.y, tx, ty) === 0 ? 1 : 0.6;
        C.damage(v, Math.round(U.ri(w.dmg[0], w.dmg[1]) * near), { from: a, dtype: w.dtype, aim: 'torso', w });
        if (!v.party && a.party && !G.hostileToPlayer(v) && !v.dead) GG.Act.provoke(v);
      }
      if (a.id === 'pc') G.log(hit ? `The ${w.name} lands right on target.` : `The ${w.name} goes wide.`);
      return true;
    }
    if (!hit) {
      const who = a.id === 'pc' ? 'You miss' : `${a.name} misses`;
      G.log(`${who} ${t.id === 'pc' ? 'you' : t.name}. (${ch}%)`);
      G.float(t, 'miss', '#c8c0a8');
      if (roll > 97 && w.range > 1 && w.mag) { a.ap = 0; G.log(a.id === 'pc' ? 'Your gun jams! You lose the rest of your turn clearing it.' : `${a.name}'s gun jams.`); }
      return true;
    }
    let critCh = G.crit(a) + C.AIM[aim].crit + (w.crit || 0);
    const tt = G.tplOf(t);
    if (tt && tt.beast) critCh += R.sum(a, 'critBeast');
    if (a.id === 'pc' && G.S.sneaking && !t.aware) critCh += 20;
    if (t.id === 'pc' && (t.scars || []).includes('luckyticket')) critCh -= 5;
    const crit = U.r() * 100 < critCh;
    let dmg = U.ri(w.dmg[0], w.dmg[1]);
    if (w.range <= 1 && !w.natural) dmg += a.id === 'pc' ? R.meleeBonus(a) : 2;
    if (w.falloff) { const d = U.de(a, t); if (d > 2) dmg = Math.round(dmg * Math.max(0.3, 1 - (d - 2) * w.falloff / 20)); }
    C.damage(t, dmg, { from: a, crit, aim, dtype: w.dtype, w, ch });
    return true;
  };

  C.damage = (t, dmg, o) => {
    if (t.dead) return;
    const arm = R.armor(t);
    let dt = arm.dt, dr = arm.dr;
    if (o.dtype === 'acid') dt = Math.floor(dt / 2);
    if (o.dtype === 'fire') dr = Math.floor(dr * 0.75);
    let effect = '';
    if (o.crit) {
      dmg = Math.round(dmg * (1.5 + U.r() * 1.2));
      const aim = o.aim || 'torso';
      if (aim === 'torso') { dt = 0; dr = Math.floor(dr / 2); }
      if (aim === 'head' || aim === 'groin') { t.knocked = true; effect = 'knocked down'; }
      if (aim === 'eyes') { t.blind = true; effect = 'blinded'; }
      if (aim === 'legs') { t.cripLegs = true; effect = 'leg crippled'; }
      if (aim === 'arms' && t.equip.weapon !== 'fists' && !GG.ITEMS[t.equip.weapon].natural) { G.unequip(t, 'weapon'); effect = 'disarmed'; }
      if (aim === 'tumor') { dmg += 30; for (const v of G.alive()) if (v !== t && U.de(v, t) <= 1) C.damage(v, U.ri(4, 9), { dtype: 'acid', from: o.from }); G.emit('boom', { x: t.x, y: t.y, r: 1, dtype: 'acid' }); }
    }
    let fin = Math.round(Math.max(0, dmg - dt) * (1 - dr / 100));
    if (o.crit && fin < 1) fin = 1;
    t.hp -= fin;
    const a = o.from;
    const tn = t.id === 'pc' ? 'you' : t.name;
    if (o.crit) {
      const lines = C.CRIT_TXT[o.aim || 'torso'] || C.CRIT_TXT.torso;
      const ln = t.id === 'pc' ? U.pick(C.CRIT_PC[o.aim || 'torso'] || C.CRIT_PC.torso) : U.pick(lines).replace(/\{t\}/g, t.name);
      G.log(`CRITICAL! ${U.cap(ln)} (${fin} damage${effect ? ', ' + effect : ''})`, t.party ? 'hurt' : 'crit');
    } else if (a) {
      const who = a.id === 'pc' ? 'You hit' : `${a.name} hits`;
      const part = o.aim && o.aim !== 'torso' ? ` in the ${C.AIM[o.aim].name.toLowerCase()}` : '';
      G.log(fin > 0 ? `${who} ${tn}${part} for ${fin} damage.` : `${who} ${tn}${part}, but it bounces off.`, t.party ? 'hurt' : '');
    } else G.log(`${U.cap(tn)} take${t.id === 'pc' ? '' : 's'} ${fin} damage.`, t.party ? 'hurt' : '');
    G.float(t, o.crit ? `${fin}!` : String(fin), o.crit ? '#ffd040' : t.party ? '#ff7060' : '#ffffff');
    G.emit('hit', { id: t.id, dmg: fin, crit: o.crit, dtype: o.dtype });
    if (t.hp <= 0) { G.die(t, a); return; }
    const tt = G.tplOf(t);
    if (tt && tt.flee && t.hp < G.maxHp(t) * tt.flee && !t.fleeing && U.r() < 0.6) { t.fleeing = true; G.float(t, U.pick(['I yield!', 'Not worth it!', 'Mama!']), '#ffe080'); }
  };

  // ---------------------------------------------------------- player
  C.playerMove = (c, r) => {
    const S = G.S, pc = S.pc;
    if (!C.isPcTurn() || pc.path) return;
    if (pc.ap < 1) { G.log('No action points left. End your turn (Space).'); return; }
    const p = G.findPath(pc, c, r, { strict: true });
    if (!p || !p.length) return;
    pc.path = p.slice(0, pc.ap);
    pc.dest = null;
  };
  C.playerAttack = (t, aim = 'torso') => {
    const S = G.S, pc = S.pc;
    if (!C.isPcTurn() || pc.path || !t || t.dead) return;
    const w = G.weapon(pc);
    const cost = C.apCost(pc, w, aim);
    if (w.mag && pc.loaded <= 0) {
      if (G.reloadNeed(pc) > 0) { if (!G.reload(pc)) G.log('Not enough AP to reload.'); } else G.log('Out of ammo! Switch weapons.');
      return;
    }
    if (w.range <= 1 && U.de(pc, t) > 1) {
      const p = G.findPath(pc, t.x, t.y, { adj: 1, strict: true });
      if (!p) { G.log('You cannot reach them.'); return; }
      if (p.length + cost > pc.ap) {
        if (p.length < pc.ap) { pc.path = p.slice(0, pc.ap); G.log('You close in, but will not have the AP to strike this turn.'); } else G.log('Too far to reach and strike this turn.');
        return;
      }
      pc.path = p; pc.pending = { kind: 'attack', id: t.id, aim };
      return;
    }
    if (w.range > 1 && !G.los(pc.x, pc.y, t.x, t.y)) { G.log('No line of fire.'); return; }
    if (w.range > 1 && U.de(pc, t) > w.range * 2) { G.log('Out of range.'); return; }
    if (pc.ap < cost) { G.log(`Not enough action points (need ${cost}).`); return; }
    C.attack(pc, t, aim);
  };

  // ---------------------------------------------------------- AI
  C.aiStep = e => {
    if (e.dead || e.gone) return 'done';
    if (e.knocked) { e.knocked = false; e.ap = Math.max(0, e.ap - 4); G.float(e, 'gets up', '#c8c0a8'); if (e.ap <= 0) return 'done'; }
    const t = G.tplOf(e) || {};
    // re-arm after being disarmed
    if (e.equip.weapon === 'fists' && t.weapon && t.weapon !== 'fists' && G.count(e, t.weapon) > 0 && e.ap >= 2) { G.equip(e, t.weapon); e.ap -= 2; return 'acted'; }
    // heal
    if (e.hp < G.maxHp(e) * 0.35 && G.count(e, 'suture') > 0 && e.ap >= 2) { GG.Act.useItem(e, 'suture', e); return 'acted'; }
    const foes = G.alive().filter(o => G.hostile(e, o) && !o.caged);
    if (!foes.length) return 'done';
    // flee
    if (e.fleeing) {
      const near = foes.reduce((b, o) => (U.de(e, o) < U.de(e, b) ? o : b));
      let best = null, bd = U.de(e, near);
      for (const [c, r] of U.area(e.x, e.y, Math.min(e.ap, 6))) {
        if (!G.inb(c, r) || !G.passable(c, r, e)) continue;
        const d = U.dist(c, r, near.x, near.y);
        if (d > bd) { bd = d; best = [c, r]; }
      }
      if (!best || e.ap < 1) return 'done';
      const p = G.findPath(e, best[0], best[1], { strict: true });
      if (!p || !p.length) return 'done';
      e.path = p.slice(0, e.ap);
      return 'acted';
    }
    let w = G.weapon(e);
    if (w.mag && e.loaded <= 0) {
      if (G.reloadNeed(e) > 0 && e.ap >= 2) { G.reload(e); return 'acted'; }
      if (G.reloadNeed(e) <= 0) {
        const melee = e.inv.find(s => GG.ITEMS[s.id].type === 'weapon' && GG.ITEMS[s.id].range <= 1);
        G.unequip(e, 'weapon');
        if (melee) G.equip(e, melee.id);
        w = G.weapon(e);
      } else return 'done';
    }
    // choose target: visible, close, wounded
    const vis = foes.filter(o => G.los(e.x, e.y, o.x, o.y) || U.de(e, o) <= 2);
    const pool = vis.length ? vis : foes;
    const score = o => U.de(e, o) * 2 + (o.hp / G.maxHp(o)) * 6 + (o.id === 'pc' ? -1 : 0);
    const tgt = pool.reduce((b, o) => (score(o) < score(b) ? o : b));
    const d = U.de(e, tgt);
    const inRange = w.range <= 1 ? d <= 1 : (d <= w.range && G.los(e.x, e.y, tgt.x, tgt.y));
    if (inRange) {
      let aim = 'torso';
      if (G.skill(e, w.skill) >= 75 && U.r() < 0.3 && C.hitChance(e, tgt, 'head', w) >= 35 && C.partsOf(tgt).includes('head')) aim = 'head';
      const cost = C.apCost(e, w, aim);
      if (e.ap < cost) { if (aim !== 'torso' && e.ap >= C.apCost(e, w, 'torso')) aim = 'torso'; else return 'done'; }
      if (w.range > 1 && C.hitChance(e, tgt, aim, w) < 20 && d > 2) {
        // too risky: step closer if possible
        const p = G.findPath(e, tgt.x, tgt.y, { adj: Math.max(1, Math.floor(w.range / 2)), losTo: true, strict: true });
        if (p && p.length && e.ap - Math.min(p.length, 2) >= C.apCost(e, w, 'torso')) { e.path = p.slice(0, 2); return 'acted'; }
      }
      return C.attack(e, tgt, aim) ? 'acted' : 'done';
    }
    if (e.ap < 1) return 'done';
    const adj = w.range <= 1 ? 1 : Math.max(1, Math.min(w.range - 2, 7));
    const p = G.findPath(e, tgt.x, tgt.y, { adj, losTo: w.range > 1, strict: true, max: 2500 });
    if (!p || !p.length) {
      // try any other foe
      const alt = foes.find(o => o !== tgt && G.findPath(e, o.x, o.y, { adj: 1, strict: true, max: 1500 }));
      if (alt) { const p2 = G.findPath(e, alt.x, alt.y, { adj: 1, strict: true }); if (p2 && p2.length) { e.path = p2.slice(0, e.ap); return 'acted'; } }
      return 'done';
    }
    let steps = Math.min(p.length, e.ap);
    const cost = C.apCost(e, w, 'torso');
    if (p.length <= e.ap - cost) steps = p.length;
    e.path = p.slice(0, steps);
    return 'acted';
  };
})();
