'use strict';
// Game state, entities, maps, movement, perception, inventory, time, save/load.
// Browser-independent: the UI listens to events via GG.G.on().
(function () {
  const U = GG.U, R = GG.R;
  const G = GG.G = {};
  G.S = null;        // saved state
  G.geo = null;      // geometry of current map (rebuilt, not saved)
  G.busy = () => false;  // UI hook: true while animations play
  G.TIME_SCALE = 1;  // game minutes per real second while exploring
  const listeners = [];
  G.on = fn => listeners.push(fn);
  G.emit = (type, d) => { for (const fn of listeners) fn(type, d || {}); };
  G.log = (text, cls) => {
    const S = G.S;
    S.log.push({ t: text, c: cls || '' });
    if (S.log.length > 250) S.log.splice(0, S.log.length - 250);
    G.emit('log', { text, cls });
  };
  G.float = (e, text, color) => G.emit('float', { id: e.id, text, color });

  // ------------------------------------------------------------ entities
  let uid = 1;
  G.makeEnt = (tplId, at, extra = {}) => {
    const t = GG.CREATURES[tplId];
    const e = {
      id: extra.id || `${tplId}_${uid++}_${Math.floor(U.hash(uid, at[0], at[1]) * 1e5)}`,
      tpl: tplId, name: extra.name || t.name, faction: t.faction,
      x: at[0], y: at[1], home: [at[0], at[1]], facing: U.hash(at[0], at[1], 3) > 0.5 ? 1 : -1,
      hpFixed: t.hp, apFixed: t.ap, skillFixed: Object.assign({}, t.skills || {}), stats: Object.assign({ grit: 5, nerve: 5, wits: 5, charm: 5, reflex: 5, gut: 5 }, t.stats || {}),
      armorFixed: t.armorFixed ? Object.assign({}, t.armorFixed) : { ac: 3, dt: 0, dr: 0 },
      critFixed: t.crit != null ? t.crit : 5,
      inv: [], equip: { weapon: t.weapon || 'fists', armor: null }, loaded: 0,
      ai: t.ai || 'stand', wander: t.wander || 0, vision: t.vision || 8,
      path: null, moveT: 0, ap: t.ap, buffs: [], greet: t.greet || 0,
    };
    e.hp = t.hp;
    if (t.ammo) { e.inv.push({ id: t.ammo[0], n: t.ammo[1] }); }
    for (const [id, n] of t.inv || []) {
      const k = Array.isArray(n) ? U.ri(n[0], n[1]) : n;
      if (k > 0) G.addItem(e, id, k);
    }
    if (t.shop && GG.SHOPS && GG.SHOPS[t.shop]) for (const [id, n] of GG.SHOPS[t.shop]) G.addItem(e, id, n);
    const w = GG.ITEMS[e.equip.weapon];
    if (w && w.mag) e.loaded = w.mag;
    Object.assign(e, extra);
    return e;
  };

  G.makePC = (spec) => {
    const e = {
      id: 'pc', tpl: 'pc', name: spec.name || 'The Stray', faction: 'player', party: true,
      x: 0, y: 0, facing: 1, stats: Object.assign({}, spec.stats), skillPts: {}, knacks: spec.knacks.slice(), quirks: spec.quirks.slice(), scars: [],
      level: 1, xp: 0, unspent: 0, scarPending: 0, tutor: {},
      inv: [], equip: { weapon: 'fists', armor: null }, loaded: 0, path: null, moveT: 0, buffs: [],
      look: Object.assign({ kind: 'human', skin: '#c99a74', hair: '#4a3020', coat: '#6b4a30', pants: '#3e342a', hat: 'stetson', hatC: '#5a4028', face: 'plain', build: 1, h: 1 }, spec.look || {}),
    };
    e.hp = R.maxHp(e);
    e.ap = R.maxAp(e);
    return e;
  };

  G.tplOf = e => (e.tpl === 'pc' ? null : GG.CREATURES[e.tpl]);
  G.maxHp = e => R.maxHp(e);
  G.maxAp = e => R.maxAp(e) + e.buffs.reduce((a, b) => a + (b.ap || 0), 0);
  G.skill = (e, id) => {
    let v = R.skill(e, id);
    if (e === G.S.pc) for (const s of e.inv) { const it = GG.ITEMS[s.id]; if (it && it.carryBuff && it.carryBuff[id]) v += it.carryBuff[id]; }
    return v;
  };
  G.crit = e => {
    let v = R.crit(e);
    if (e.id === 'pc') for (const s of e.inv) { const it = GG.ITEMS[s.id]; if (it && it.carryBuff && it.carryBuff.crit) v += it.carryBuff.crit; }
    return v;
  };
  G.weapon = e => GG.ITEMS[e.equip.weapon] || GG.ITEMS.fists;
  G.ents = () => G.S.map.ents;
  G.ent = id => G.S.map.ents.find(e => e.id === id);
  G.alive = () => G.S.map.ents.filter(e => !e.dead && !e.gone);
  G.partyEnts = () => G.S.map.ents.filter(e => e.party && !e.dead && !e.gone);
  G.title = () => R.TITLES.find(t => t.test(G.S)).name;

  // ------------------------------------------------------------ hostility
  G.hostileToPlayer = e => {
    if (e.dead || e.gone || e.party) return false;
    if (e.hostileP) return true;
    switch (e.faction) {
      case 'wild': case 'raider': return true;
      case 'town': return !!G.S.flags.townHostile;
      case 'marrow': return !!G.S.flags.marrowHostile;
      default: return !!e.angry;
    }
  };
  G.hostile = (a, b) => {
    if (a === b || a.dead || b.dead || a.gone || b.gone) return false;
    if (a.party && b.party) return false;
    if (a.party) return G.hostileToPlayer(b);
    if (b.party) return G.hostileToPlayer(a);
    const wild = f => f === 'wild' || f === 'raider';
    if (wild(a.faction) !== wild(b.faction) && a.faction !== 'beast' && b.faction !== 'beast') return true;
    return false;
  };

  // ------------------------------------------------------------ inventory
  G.count = (e, id) => { const s = e.inv.find(s => s.id === id); return s ? s.n : 0; };
  G.addItem = (e, id, n = 1) => {
    if (!GG.ITEMS[id]) { console.warn('unknown item', id); return; }
    const s = e.inv.find(s => s.id === id);
    if (s) s.n += n; else e.inv.push({ id, n });
  };
  G.removeItem = (e, id, n = 1) => {
    const s = e.inv.find(s => s.id === id);
    if (!s || s.n < n) return false;
    s.n -= n;
    if (s.n <= 0) e.inv.splice(e.inv.indexOf(s), 1);
    return true;
  };
  G.has = id => G.count(G.S.pc, id) > 0 || (id === 'ticket' ? false : G.partyEnts().some(p => G.count(p, id) > 0));
  G.weight = e => GG.itemWeight(e.inv) + (e.equip.weapon && e.equip.weapon !== 'fists' ? GG.ITEMS[e.equip.weapon].weight : 0) + (e.equip.armor ? GG.ITEMS[e.equip.armor].weight : 0);

  G.unloadWeapon = e => {
    const w = G.weapon(e);
    if (w.ammo && e.loaded > 0) G.addItem(e, w.ammo, e.loaded);
    e.loaded = 0;
  };
  G.equip = (e, id) => {
    const it = GG.ITEMS[id];
    if (!it || !G.removeItem(e, id, 1)) return false;
    if (it.type === 'weapon') {
      G.unequip(e, 'weapon');
      e.equip.weapon = id;
      e.loaded = 0;
    } else if (it.type === 'armor') {
      G.unequip(e, 'armor');
      e.equip.armor = id;
    }
    if (e.id === 'pc') G.log(`You equip the ${it.name}.`);
    return true;
  };
  G.unequip = (e, slot) => {
    if (slot === 'weapon') {
      if (e.equip.weapon && e.equip.weapon !== 'fists') { G.unloadWeapon(e); if (!GG.ITEMS[e.equip.weapon].natural) G.addItem(e, e.equip.weapon, 1); }
      e.equip.weapon = 'fists'; e.loaded = 0;
    } else if (e.equip.armor) { G.addItem(e, e.equip.armor, 1); e.equip.armor = null; }
  };
  G.reloadNeed = e => { const w = G.weapon(e); return w.mag ? Math.min(w.mag - e.loaded, G.count(e, w.ammo)) : 0; };
  G.reload = (e, free) => {
    const w = G.weapon(e);
    if (!w.mag) return false;
    const n = G.reloadNeed(e);
    if (n <= 0) return false;
    if (G.S.mode === 'combat' && !free) { if (e.ap < 2) return false; e.ap -= 2; }
    G.removeItem(e, w.ammo, n);
    e.loaded += n;
    G.emit('sound', { s: 'reload', id: e.id });
    if (e.id === 'pc') G.log(`You reload the ${w.name}.`);
    return true;
  };

  // ------------------------------------------------------------ map geometry & queries
  G.buildMapGeo = def => {
    const geo = GG.buildGeometry(def);
    geo.def = def;
    return geo;
  };
  G.idx = (c, r) => r * G.geo.w + c;
  G.inb = (c, r) => c >= 0 && r >= 0 && c < G.geo.w && r < G.geo.h;
  G.rebuildObjCache = () => {
    const m = new Map();
    for (const o of G.S.map.objs) if (!o.gone) for (const [c, r] of GG.objCells(o)) m.set(U.K(c, r), o);
    G.ocache = m;
  };
  G.objAt = (c, r) => G.ocache.get(U.K(c, r));
  G.entAt = (c, r, incDead) => G.S.map.ents.find(e => e.x === c && e.y === r && !e.gone && (incDead || !e.dead));
  G.wallAt = (c, r) => G.inb(c, r) ? G.geo.wall[G.idx(c, r)] : 'rock';
  G.blockedStatic = (c, r) => {
    if (!G.inb(c, r)) return true;
    if (G.geo.wall[G.idx(c, r)]) return true;
    const o = G.objAt(c, r);
    if (o && o.type === 'door' && !o.open && !o.locked) return false; // walked through: auto-opens
    return !!(o && GG.objBlocks(o));
  };
  G.passable = (c, r, self) => !G.blockedStatic(c, r) && !G.S.map.ents.some(e => e !== self && !e.dead && !e.gone && e.x === c && e.y === r);
  G.losBlockAt = (c, r) => {
    const w = G.wallAt(c, r);
    if (w && (GG.WALL[w] || {}).los !== false) return true;
    const o = G.objAt(c, r);
    return !!(o && GG.objLos(o));
  };
  G.los = (x1, y1, x2, y2) => {
    const line = U.line(x1, y1, x2, y2);
    for (let i = 1; i < line.length - 1; i++) if (G.losBlockAt(line[i][0], line[i][1])) return false;
    return true;
  };
  // obstacle between shooter and target giving cover (low objects, other bodies)
  G.coverOn = (a, b) => {
    const line = U.line(a.x, a.y, b.x, b.y);
    let pen = 0;
    for (let i = 1; i < line.length - 1; i++) {
      const [c, r] = line[i];
      const o = G.objAt(c, r);
      if (o && (GG.OBJT[o.type] || {}).cover && i >= line.length - 3) pen = Math.max(pen, 15);
      const w = G.wallAt(c, r);
      if (w && GG.WALL[w].low) pen = Math.max(pen, 10);
      const e = G.entAt(c, r);
      if (e) pen = Math.max(pen, 10);
    }
    return pen;
  };
  G.isExit = (c, r) => G.inb(c, r) && G.geo.exit[G.idx(c, r)];

  G.findPath = (e, tc, tr, opts = {}) => {
    const strict = G.S.mode === 'combat' || opts.strict;
    const occ = new Set();
    for (const o of G.S.map.ents) if (o !== e && !o.dead && !o.gone && (strict || U.dist(o.x, o.y, e.x, e.y) <= 2 || o.ai === 'stand')) occ.add(U.K(o.x, o.y));
    const goal = opts.adj
      ? (c, r) => U.dist(c, r, tc, tr) <= opts.adj && (opts.losTo ? G.los(c, r, tc, tr) : true)
      : (c, r) => c === tc && r === tr;
    if (opts.adj && U.dist(e.x, e.y, tc, tr) <= opts.adj && (!opts.losTo || G.los(e.x, e.y, tc, tr))) return [];
    const cost = (c, r) => {
      if (G.blockedStatic(c, r)) return Infinity;
      if (occ.has(U.K(c, r)) && !(c === tc && r === tr && !opts.adj)) return Infinity;
      if (!e.party && G.isExit(c, r)) return Infinity;
      return (GG.TER[G.geo.ter[G.idx(c, r)]] || { cost: 1 }).cost;
    };
    return U.astar(G.geo.w, G.geo.h, e.x, e.y, goal, cost, (c, r) => U.dist(c, r, tc, tr), opts.max || 5000);
  };
  // multi-cell objects: path adjacent to any of its cells
  G.pathToObj = (e, o) => {
    const cells = GG.objCells(o);
    if (cells.some(([c, r]) => U.dist(c, r, e.x, e.y) <= 1)) return [];
    let best = null;
    for (const [c, r] of cells) {
      if (cells.length > 7 && U.dist(c, r, o.at[0], o.at[1]) < (o.size || GG.OBJT[o.type].size)) continue;
      const p = G.findPath(e, c, r, { adj: 1 });
      if (p && (!best || p.length < best.length)) best = p;
    }
    return best;
  };
  G.adjObj = (e, o) => GG.objCells(o).some(([c, r]) => U.dist(c, r, e.x, e.y) <= 1);

  // ------------------------------------------------------------ lighting & perception
  G.lit = (c, r) => {
    if (!U.isNight(G.S.time) && G.geo.def.outdoor) return true;
    if ((GG.TER[G.geo.ter[G.idx(c, r)]] || {}).floor) return true; // interiors are lamp-lit
    for (const o of G.S.map.objs) {
      const l = (GG.OBJT[o.type] || {}).light;
      if (l && !o.gone && !o.off && U.dist(c, r, o.at[0], o.at[1]) <= l.r) return true;
    }
    return false;
  };
  G.visionOf = (e, tgt) => {
    let v = e.sleep ? 2 : (e.vision || 8);
    if (!G.lit(tgt.x, tgt.y)) v -= 3;
    if (tgt.id === 'pc' && G.S.sneaking) v -= Math.floor(G.skill(tgt, 'sneak') / 12);
    return Math.max(1, v);
  };
  G.canSee = (e, tgt) => {
    const d = U.de(e, tgt);
    if (d > G.visionOf(e, tgt)) return false;
    return G.los(e.x, e.y, tgt.x, tgt.y);
  };
  // anyone of a faction witnessing the pc
  G.witnessed = (faction, range = 9) => G.alive().some(e => e.faction === faction && !e.sleep && !e.caged && U.de(e, G.S.pc) <= range && G.canSee(e, G.S.pc));

  // ------------------------------------------------------------ map loading
  G.instantiateMap = def => {
    const objs = [];
    G.geo = G.buildMapGeo(def);
    for (const d of G.geo.doors) objs.push({ id: d.id, type: d.type, at: d.at, open: false, locked: d.locked, key: d.key });
    for (const o of def.objs || []) {
      const c = Object.assign({}, o, { at: o.at.slice() });
      if (o.loot) c.inv = o.loot.map(([id, n]) => ({ id, n }));
      objs.push(c);
    }
    G.geo.reserved = new Set();
    for (const n of def.npcs || []) for (const [c, r] of U.area(n.at[0], n.at[1], 1)) G.geo.reserved.add(r * G.geo.w + c);
    for (const at of Object.values(def.entries || {})) for (const [c, r] of U.area(at[0], at[1], 2)) G.geo.reserved.add(r * G.geo.w + c);
    for (const sc of def.scatter || []) GG.scatter(G.geo, objs, sc[0], sc[1], sc[2], sc[3], sc[4]);
    objs.forEach((o, i) => { if (!o.id) o.id = `o${i}`; if (GGcontainer(o) && !o.inv) o.inv = []; });
    const ents = [];
    for (const n of def.npcs || []) {
      const extra = Object.assign({}, n);
      delete extra.tpl; delete extra.at;
      ents.push(G.makeEnt(n.tpl, n.at, extra));
    }
    return { id: def.id, objs, ents, def: def.temp ? def : null };
  };
  const GGcontainer = o => !!(GG.OBJT[o.type] || {}).container;

  G.enterMap = (mapId, entry, def) => {
    const S = G.S;
    const party = S.map ? S.map.ents.filter(e => e.party && !e.dead) : [S.pc];
    if (S.map) {
      S.map.ents = S.map.ents.filter(e => !e.party);
      if (!S.map.def) S.mapStates[S.map.id] = { objs: S.map.objs, ents: S.map.ents, left: S.time };
    }
    const mdef = def || GG.MAPS[mapId];
    let inst;
    if (!def && S.mapStates[mapId]) {
      G.geo = G.buildMapGeo(mdef);
      inst = { id: mapId, objs: S.mapStates[mapId].objs, ents: S.mapStates[mapId].ents, def: null };
      delete S.mapStates[mapId];
    } else {
      inst = G.instantiateMap(mdef);
    }
    S.map = inst;
    S.mapId = mapId;
    G.rebuildObjCache();
    let at = (mdef.entries && (mdef.entries[entry] || Object.values(mdef.entries)[0])) || [Math.floor(mdef.w / 2), Math.floor(mdef.h / 2)];
    for (const p of party) {
      const spot = G.freeNear(at[0], at[1], p === S.pc ? 0 : 1);
      p.x = spot[0]; p.y = spot[1]; p.path = null; p.pending = null; p.stepP = 1;
      inst.ents.push(p);
    }
    S.mode = 'explore';
    S.combat = null;
    for (const e of inst.ents) e.aware = false;
    const sc = GG.SCRIPTS.enter[mapId];
    if (sc) sc(G, entry);
    G.emit('map', { id: mapId });
    G.log(`— ${mdef.name} —`, 'loc');
  };
  G.freeNear = (c, r, minD = 0) => {
    for (let rad = minD; rad < 12; rad++) for (const [x, y] of (rad === 0 ? [[c, r]] : U.ring(c, r, rad))) if (G.passable(x, y) && !G.isExit(x, y)) return [x, y];
    return [c, r];
  };

  // ------------------------------------------------------------ new game / save / load
  G.newGame = (spec, seed) => {
    U.seed(seed || (Date.now() % 1e9));
    const pc = G.makePC(spec);
    G.S = {
      v: 1, time: 8 * 60 + 30, pc, map: null, mapId: null, mapStates: {}, flags: {}, quests: {}, rep: { gutwater: 0 },
      stats: { kills: 0, caught: 0 }, kills: {}, log: [], mode: 'explore', combat: null, sneaking: false, dlg: null,
      world: { x: 15, y: 19, known: { gutwater: true, crossing: true }, visited: {}, dest: null, encDone: {} },
    };
    pc.inv = [];
    G.addItem(pc, 'ticket', 75);
    G.addItem(pc, 'skinknife', 1);
    G.addItem(pc, 'pepperbox', 1);
    G.addItem(pc, 'r38', 30);
    G.addItem(pc, 'suture', 3);
    G.addItem(pc, 'jerky', 3);
    G.addItem(pc, 'duster', 1);
    G.equip(pc, 'pepperbox');
    pc.loaded = 6;
    G.equip(pc, 'duster');
    G.S.log = [];
    G.enterMap('gutwater', 'south');
    G.S.world.visited.gutwater = true;
  };

  G.serialize = () => JSON.stringify({ S: G.S, rs: U.rs, uid });
  G.deserialize = str => {
    const d = JSON.parse(str);
    G.S = d.S; U.rs = d.rs; uid = d.uid || 1000;
    const S = G.S;
    if (S.mode === 'world') { G.geo = null; }
    else {
      const def = S.map.def || GG.MAPS[S.mapId];
      G.geo = G.buildMapGeo(def);
      G.rebuildObjCache();
    }
    S.pc = S.map ? (S.map.ents.find(e => e.id === 'pc') || S.pc) : S.pc;
    G.emit('map', { id: S.mapId, loaded: true });
  };

  // ------------------------------------------------------------ xp & levels
  G.giveXp = (n, why) => {
    const pc = G.S.pc;
    pc.xp += n;
    G.log(`+${n} XP${why ? ' (' + why + ')' : ''}`, 'xp');
    while (pc.xp >= R.xpFor(pc.level + 1)) {
      pc.level++;
      const oldMax = pc.hp;
      pc.unspent += R.skillPtsPerLevel(pc);
      if (pc.level % R.SCAR_EVERY === 0) pc.scarPending++;
      pc.hp = Math.min(R.maxHp(pc), oldMax + 3 + Math.floor(R.stat(pc, 'gut') / 2));
      G.log(`Level ${pc.level}! You have ${pc.unspent} skill points to spend${pc.scarPending ? ' and a Scar to choose' : ''}.`, 'lvl');
      G.emit('levelup', { level: pc.level });
    }
  };

  // ------------------------------------------------------------ time
  G.advance = (mins) => {
    const S = G.S;
    const before = S.time;
    S.time += mins;
    // buffs
    for (const e of S.map ? S.map.ents : [S.pc]) {
      if (!e.buffs.length) continue;
      e.buffs = e.buffs.filter(b => (b.until || 0) > S.time);
    }
    if (Math.floor(before / 60) !== Math.floor(S.time / 60)) G.hourTick(Math.floor(S.time / 60) - Math.floor(before / 60));
  };
  G.hourTick = (hours) => {
    const S = G.S;
    for (const e of S.map ? G.partyEnts() : [S.pc]) {
      if (S.mode === 'combat') break;
      const gut = e.id === 'pc' ? R.stat(e, 'gut') : 5;
      e.hp = Math.min(G.maxHp(e), e.hp + hours * Math.max(1, Math.floor(gut / 4)));
    }
    if (S.map) { const sc = GG.SCRIPTS.hour[S.mapId]; if (sc) sc(G, hours); }
  };
  G.canRest = () => G.S.mode === 'explore' && !G.alive().some(e => G.hostileToPlayer(e) && U.de(e, G.S.pc) < 18);
  G.rest = (hours) => {
    if (!G.canRest()) { G.log('You cannot rest with enemies nearby.'); return false; }
    for (let i = 0; i < hours; i++) {
      G.advance(60);
      if (G.S.mode !== 'explore') break;
    }
    G.log(`You rest. It is now ${U.fmtTime(G.S.time)}.`);
    return true;
  };
  G.restUntilHealed = () => {
    let h = 0;
    while (G.S.pc.hp < G.maxHp(G.S.pc) && h < 48 && G.canRest()) { G.advance(60); h++; }
    G.log(`You rest ${h} hours. It is now ${U.fmtTime(G.S.time)}.`);
  };

  // ------------------------------------------------------------ real-time update
  G.stepTime = e => (e.id === 'pc' ? (G.S.sneaking ? 0.26 : 0.15) : e.party ? 0.15 : 0.22);
  let percAcc = 0, wanderAcc = 0;
  G.update = dt => {
    const S = G.S;
    if (!S || !S.map || S.mode === 'world' || S.mode === 'dead' || S.mode === 'end') return;
    if (S.dlg || S.ui) return; // paused while a modal is open
    if (S.mode === 'explore') {
      G.advance(dt * G.TIME_SCALE);
      for (const e of S.map.ents) if (!e.dead && !e.gone && e.path) G.moveStep(e, dt);
      wanderAcc += dt;
      if (wanderAcc > 0.5) { wanderAcc = 0; G.ambientAI(); }
      percAcc += dt;
      if (percAcc > 0.2) { percAcc = 0; G.perceive(); }
      const pc = S.pc;
      if (S.mode === 'explore' && !pc.path && G.isExit(pc.x, pc.y) && !S.dlg) G.leaveMap(G.isExit(pc.x, pc.y));
    } else if (S.mode === 'combat') {
      GG.Combat.update(dt);
    }
  };

  // one movement step along the path; returns true when a step happened
  G.moveStep = (e, dt) => {
    e.moveT = (e.moveT || 0) + dt;
    const st = G.stepTime(e);
    if (e.moveT < st) return false;
    e.moveT = 0;
    if (!e.path || !e.path.length) { G.arrive(e); return false; }
    const [nc, nr] = e.path[0];
    if (!G.passable(nc, nr, e)) {
      // blocked by someone: try to repath around once
      e.blockedN = (e.blockedN || 0) + 1;
      if (e.blockedN > 6 || !e.dest) { e.path = null; e.blockedN = 0; G.arrive(e, true); return false; }
      const np = G.findPath(e, e.dest[0], e.dest[1], { adj: e.dest[2] || 0, strict: true });
      if (np) e.path = np; else if (e.blockedN > 3) { e.path = null; G.arrive(e, true); }
      return false;
    }
    if (S_combat() && e.ap < 1) { e.path = null; return false; }
    e.blockedN = 0;
    e.path.shift();
    e.fx = e.x; e.fy = e.y; e.stepP = 0;
    if (nc !== e.x) e.facing = nc > e.x ? 1 : -1;
    e.x = nc; e.y = nr;
    const door = G.objAt(nc, nr);
    if (door && door.type === 'door' && !door.open) { door.open = true; G.emit('sound', { s: 'door' }); }
    if (S_combat()) e.ap -= 1;
    G.emit('step', { id: e.id });
    if (!e.path.length) { e.path = null; G.arrive(e); }
    else if (e.id === 'pc' && G.S.mode === 'explore') G.perceive();
    return true;
  };
  const S_combat = () => G.S.mode === 'combat';
  G.moveTo = (e, c, r, opts = {}) => {
    const p = G.findPath(e, c, r, opts);
    if (!p) return false;
    e.dest = [c, r, opts.adj || 0];
    e.path = p.length ? p : null;
    if (!p.length) G.arrive(e);
    return true;
  };
  G.arrive = (e, blocked) => {
    const pend = e.pending;
    e.path = null;
    if (!pend) return;
    e.pending = null;
    if (blocked) return;
    if (e.id === 'pc') G.doPending(pend);
  };

  // ------------------------------------------------------------ ambient AI (explore mode)
  G.ambientAI = () => {
    const S = G.S, pc = S.pc;
    for (const e of S.map.ents) {
      if (e.dead || e.gone || e.id === 'pc' || e.caged) continue;
      if (e.party) {
        const d = U.de(e, pc);
        if (d > 3 && (!e.path || U.dist(e.dest[0], e.dest[1], pc.x, pc.y) > 2)) G.moveTo(e, pc.x, pc.y, { adj: 2 });
        continue;
      }
      if (e.fleeing) continue;
      if (e.ai === 'wander' && !e.path && U.r() < 0.12) {
        const [hx, hy] = e.home;
        const c = hx + U.ri(-e.wander, e.wander), r = hy + U.ri(-e.wander, e.wander);
        if (G.inb(c, r) && G.passable(c, r, e) && !G.isExit(c, r)) G.moveTo(e, c, r, { max: 600 });
      }
      if (e.ai === 'hunt' && G.hostileToPlayer(e) && !e.path && U.r() < 0.1 && !e.aware) {
        const [hx, hy] = e.home;
        const c = hx + U.ri(-4, 4), r = hy + U.ri(-4, 4);
        if (G.inb(c, r) && G.passable(c, r, e)) G.moveTo(e, c, r, { max: 600 });
      }
      const t = G.tplOf(e);
      if (t && t.barks && !G.hostileToPlayer(e) && U.de(e, pc) <= 5 && U.r() < 0.025 && G.los(e.x, e.y, pc.x, pc.y)) G.float(e, U.pick(t.barks), '#e8d8b0');
    }
  };

  G.perceive = () => {
    const S = G.S, pc = S.pc;
    if (S.mode !== 'explore' || S.dlg) return;
    for (const e of S.map.ents) {
      if (e.dead || e.gone || e.party || e.caged || e.fleeing) continue;
      if (U.de(e, pc) > 16) continue;
      const aggressive = G.hostileToPlayer(e) || (e.faction === 'marrow' && !S.flags.showInvited && !e.gate);
      if (aggressive && G.canSee(e, pc)) {
        if (e.faction === 'marrow' && !S.flags.marrowHostile) {
          S.flags.marrowHostile = true;
          G.float(e, U.pick(['Intruder!', 'HONK! HONK!', 'Get the hooks!']), '#ff6a5a');
        }
        if (e.sleep) { e.sleep = false; G.float(e, '!?', '#ffb060'); }
        GG.Combat.start(e);
        return;
      }
      if (!aggressive && e.greet && !e.greeted && U.de(e, pc) <= e.greet && G.canSee(e, pc) && e.ai !== 'flee') {
        e.greeted = true;
        pc.path = null;
        G.talk(e, true);
        return;
      }
    }
  };

  // ------------------------------------------------------------ leaving a map
  G.leaveMap = to => {
    const S = G.S;
    if (S.mode === 'combat') return;
    if (to === 'world') {
      const def = G.geo.def;
      const sc = GG.SCRIPTS.leave[S.mapId];
      if (sc && sc(G) === false) {
        // step back off the exit band
        const back = U.area(S.pc.x, S.pc.y, 3).filter(([c, r]) => G.inb(c, r) && G.passable(c, r, S.pc) && !G.isExit(c, r));
        if (back.length) { const [c, r] = back.sort((a, b) => U.dist(a[0], a[1], S.pc.x, S.pc.y) - U.dist(b[0], b[1], S.pc.x, S.pc.y))[0]; G.moveTo(S.pc, c, r); }
        return;
      }
      S.map.ents = S.map.ents.filter(e => !e.party);
      if (!def.temp) S.mapStates[S.mapId] = { objs: S.map.objs, ents: S.map.ents, left: S.time };
      S.lastMap = S.mapId;
      S.map = null;
      S.mapId = null;
      G.geo = null;
      S.mode = 'world';
      S.world.dest = null;
      G.emit('world', {});
    }
  };

  // ------------------------------------------------------------ player commands
  G.clickCell = (c, r) => {
    const S = G.S, pc = S.pc;
    if (!G.inb(c, r)) return;
    pc.pending = null;
    if (S.mode === 'combat') return GG.Combat.playerMove(c, r);
    if (G.blockedStatic(c, r)) {
      const p = G.findPath(pc, c, r, { adj: 1 });
      if (p) { pc.dest = [c, r, 1]; pc.path = p.length ? p : null; }
      return;
    }
    G.moveTo(pc, c, r);
  };

  // default interaction with an entity or object
  G.interact = (kind, id) => {
    const S = G.S, pc = S.pc;
    if (kind === 'ent') {
      const e = G.ent(id);
      if (!e || e === pc) return;
      if (e.dead) return G.approach({ kind: 'loot', id });
      if (G.hostileToPlayer(e) || S.mode === 'combat' && !e.party) return G.attackCmd(id, 'torso');
      if (e.party && !GG.DLG[e.dlgId || G.tplOf(e).dlg]) return;
      return G.approach({ kind: 'talk', id });
    }
    return G.approach({ kind: 'use', id });
  };
  G.approach = pend => {
    const S = G.S, pc = S.pc;
    if (pend.kind === 'talk') {
      const e = G.ent(pend.id);
      if (U.de(pc, e) <= 2 && G.los(pc.x, pc.y, e.x, e.y)) return G.doPending(pend);
      if (S.mode === 'combat') { G.log('Not during a fight.'); return; }
      pc.pending = pend;
      if (!G.moveTo(pc, e.x, e.y, { adj: 2, losTo: true })) { pc.pending = null; G.log('You cannot reach them.'); }
      return;
    }
    const tgt = pend.kind === 'loot' ? G.ent(pend.id) : S.map.objs.find(o => o.id === pend.id);
    if (!tgt) return;
    const adj = pend.kind === 'loot' ? U.de(pc, tgt) <= 1 : G.adjObj(pc, tgt);
    if (adj) return G.doPending(pend);
    if (S.mode === 'combat') {
      const p = pend.kind === 'loot' ? G.findPath(pc, tgt.x, tgt.y, { adj: 1 }) : G.pathToObj(pc, tgt);
      if (!p || p.length > pc.ap - 1) { G.log('Not enough action points to get there.'); return; }
      pc.pending = pend; pc.path = p; pc.dest = null;
      return;
    }
    pc.pending = pend;
    const p = pend.kind === 'loot' ? G.findPath(pc, tgt.x, tgt.y, { adj: 1 }) : G.pathToObj(pc, tgt);
    if (!p) { pc.pending = null; G.log('You cannot reach that.'); return; }
    pc.dest = null;
    pc.path = p.length ? p : null;
    if (!p.length) G.arrive(pc);
  };
  G.doPending = pend => {
    const S = G.S;
    if (pend.kind === 'attack') return GG.Combat.playerAttack(G.ent(pend.id), pend.aim);
    if (S.mode === 'combat') {
      if (S.pc.ap < 2) { G.log('Not enough action points.'); return; }
      S.pc.ap -= 2;
    }
    switch (pend.kind) {
      case 'talk': return G.talk(G.ent(pend.id));
      case 'use': return GG.Act.useObj(S.map.objs.find(o => o.id === pend.id), pend.skill, pend.item);
      case 'loot': return GG.Act.openContainer({ ent: pend.id });
      case 'skillEnt': return GG.Act.skillOnEnt(pend.skill, G.ent(pend.id));
    }
  };
  G.attackCmd = (id, aim) => {
    const S = G.S, e = G.ent(id);
    if (!e || e.dead) return;
    if (S.mode !== 'combat') {
      if (!G.hostileToPlayer(e)) GG.Act.provoke(e);
      GG.Combat.start(S.pc, true);
    }
    GG.Combat.playerAttack(e, aim);
  };

  G.talk = (e, initiated) => {
    if (!e) return;
    const dlgId = e.dlgId || (G.tplOf(e) && G.tplOf(e).dlg);
    if (!dlgId || !GG.DLG[dlgId]) {
      const t = G.tplOf(e);
      G.float(e, t && t.barks ? U.pick(t.barks) : '...', '#e8d8b0');
      return;
    }
    if (e.x !== G.S.pc.x) e.facing = G.S.pc.x > e.x ? 1 : -1;
    GG.Dialog.start(dlgId, e.id, initiated);
  };

  G.toggleSneak = () => {
    G.S.sneaking = !G.S.sneaking;
    G.log(G.S.sneaking ? `You start sneaking. (Sneak ${G.skill(G.S.pc, 'sneak')})` : 'You stop sneaking.');
  };

  G.die = (e, killer) => {
    if (e.dead) return;
    e.dead = true; e.hp = 0; e.path = null; e.pending = null;
    if (e.equip.weapon && e.equip.weapon !== 'fists' && !GG.ITEMS[e.equip.weapon].natural) { G.unloadWeapon(e); G.addItem(e, e.equip.weapon, 1); }
    if (e.equip.armor && e.tpl !== 'pc') { G.addItem(e, e.equip.armor, 1); e.equip.armor = null; }
    e.equip.weapon = 'fists';
    G.emit('die', { id: e.id });
    if (e.id === 'pc') { G.S.mode = 'dead'; G.emit('gameover', {}); return; }
    G.log(`${e.name} dies.`, 'kill');
    if (killer && killer.party) {
      const t = G.tplOf(e);
      G.S.stats.kills++;
      G.S.kills[e.tpl] = (G.S.kills[e.tpl] || 0) + 1;
      if (t && t.xp && !e.noXp) G.giveXp(t.xp);
    }
    const sc = GG.SCRIPTS.death[e.tpl] || GG.SCRIPTS.death[e.id];
    if (sc) sc(G, e, killer);
    if (G.S.mode === 'combat' && G.S.combat) GG.Combat.checkEnd();  // last enemy down: end the fight at once
  };
})();
