// Static + structural checks: dialogue graph, maps, reachability, item references.
// Run: node scripts/test_core.js
const GG = require('./load.js');
const { G, U } = GG;
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL:', msg); } };

// ---- items referenced exist
for (const [id, t] of Object.entries(GG.CREATURES)) {
  ok(GG.ITEMS[t.weapon || 'fists'], `creature ${id} weapon ${t.weapon}`);
  for (const [it] of t.inv || []) ok(GG.ITEMS[it], `creature ${id} inv ${it}`);
  if (t.ammo) ok(GG.ITEMS[t.ammo[0]], `creature ${id} ammo`);
  if (t.dlg) ok(GG.DLG[t.dlg], `creature ${id} dialogue ${t.dlg}`);
}
for (const [s, list] of Object.entries(GG.SHOPS)) for (const [it] of list) ok(GG.ITEMS[it], `shop ${s} item ${it}`);
for (const m of Object.values(GG.MAPS)) for (const o of m.objs) for (const [it] of o.loot || []) ok(GG.ITEMS[it], `map ${m.id} loot ${it}`);

// ---- dialogue graph: every go/fail target exists (static strings only)
for (const [id, T] of Object.entries(GG.DLG)) {
  const nodes = T.nodes;
  if (typeof T.start === 'string') ok(nodes[T.start], `dlg ${id} start ${T.start}`);
  for (const [nid, n] of Object.entries(nodes)) {
    if (typeof n.go === 'string') ok(nodes[n.go], `dlg ${id}.${nid} go ${n.go}`);
    for (const o of n.opts || []) {
      for (const k of ['go', 'fail']) if (typeof o[k] === 'string') ok(nodes[o[k]], `dlg ${id}.${nid} opt "${typeof o.t === 'string' ? o.t.slice(0, 30) : 'fn'}" ${k} ${o[k]}`);
      ok(o.go || o.end || o.barter || o.fight || o.fail, `dlg ${id}.${nid} option without destination`);
      if (o.check) ok(o.check[0] === 'stat' || o.check[0] === 'gut' || o.check[0] === 'tickets' || GG.R.SKILL[o.check[0]], `dlg ${id}.${nid} check ${o.check}`);
    }
    if (!n.go && !(n.opts || []).length) ok(false, `dlg ${id}.${nid} dead end`);
  }
}

// ---- maps: build, npcs/entries on passable cells, reachability
const spec = { name: 'Test', stats: { grit: 5, nerve: 5, wits: 5, charm: 5, reflex: 5, gut: 5 }, knacks: ['guns', 'gab', 'doctor'], quirks: [] };
G.newGame(spec, 42);
for (const mid of Object.keys(GG.MAPS)) {
  if (G.S.mapId !== mid) {
    G.S.mode = 'explore';
    G.enterMap(mid, Object.keys(GG.MAPS[mid].entries)[0]);
  }
  const S = G.S, pc = S.pc;
  for (const [en, at] of Object.entries(GG.MAPS[mid].entries)) ok(!G.blockedStatic(at[0], at[1]) && !G.isExit(at[0], at[1]), `${mid} entry ${en} blocked/exit at ${at}`);
  for (const e of S.map.ents) ok(!G.blockedStatic(e.x, e.y) || e.caged, `${mid} npc ${e.id} on blocked cell ${e.x},${e.y}`);
  const unlockAll = () => { for (const o of S.map.objs) if (o.type === 'door' || o.type === 'cagedoor' || o.type === 'grate') { o.locked = 0; o.open = true; } G.rebuildObjCache(); };
  unlockAll();
  for (const [en, at] of Object.entries(GG.MAPS[mid].entries)) {
    pc.x = at[0]; pc.y = at[1];
    for (const e of S.map.ents) {
      if (e === pc || e.ai === 'hunt') continue;
      const p = G.findPath(pc, e.x, e.y, { adj: e.caged ? 2 : 1, max: 20000 });
      ok(p, `${mid}: from ${en} cannot reach ${e.id} (${e.x},${e.y})`);
    }
    for (const o of S.map.objs) {
      if (!['door', 'safe', 'locker', 'pump', 'desk', 'mother', 'nest', 'sign', 'crate', 'corpse'].includes(o.type) || o.type === 'door') continue;
      const p = G.pathToObj(pc, o);
      ok(p, `${mid}: from ${en} cannot reach object ${o.type} ${o.id} at ${o.at}`);
    }
  }
  console.log(`${mid}: ${S.map.ents.length} npcs, ${S.map.objs.length} objects`);
}

// ---- encounter maps generate
for (const id of Object.keys(GG.ENCOUNTERS)) {
  for (const terr of ['plains', 'bloom', 'badlands']) {
    G.S.mode = 'world'; G.S.map = null;
    GG.World.startEncounter(id, terr, 1234 + id.length);
    ok(G.S.map && G.S.mapId === 'encounter', `encounter ${id} ${terr}`);
    const n = G.S.map.ents.filter(e => !e.party).length;
    const exp = GG.ENCOUNTERS[id].spawn.reduce((a, s) => a + s[1], 0);
    ok(n >= exp, `encounter ${id} ${terr} spawned ${n} (min ${exp})`);
  }
}
// ---- save/load round trip
const str = G.serialize();
G.deserialize(str);
ok(G.S.pc && G.geo, 'save/load');

console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
