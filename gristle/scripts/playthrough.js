// Scripted bot playthrough of the Act 1 slice using the real game logic.
// Usage: node scripts/playthrough.js [fighter|talker|sneaker] [seed] [-v]
const GG = require('./load.js');
const { G, U } = GG;
const C = GG.Combat, W = GG.World, Dg = GG.Dialog;
const build = process.argv[2] || 'fighter';
const seed = +(process.argv[3] || 7);
const VERBOSE = process.argv.includes('-v');

const BUILDS = {
  fighter: { name: 'Fighter', stats: { grit: 7, nerve: 6, wits: 5, charm: 3, reflex: 8, gut: 6 }, knacks: ['guns', 'melee', 'doctor'], quirks: [] },
  talker: { name: 'Talker', stats: { grit: 4, nerve: 5, wits: 7, charm: 9, reflex: 5, gut: 5 }, knacks: ['gab', 'show', 'guns'], quirks: ['showboat'] },
  sneaker: { name: 'Sneaker', stats: { grit: 6, nerve: 6, wits: 7, charm: 4, reflex: 8, gut: 4 }, knacks: ['sneak', 'guns', 'tinker'], quirks: [] },
};
const events = [];
G.on((t, d) => {
  if (t === 'log' && VERBOSE) console.log('  log:', d.text);
  if (t === 'log') events.push(d.text);
});
G.newGame(BUILDS[build], seed);
const S = () => G.S;
let fights = 0, deaths = 0, fled = 0;
const die = msg => { console.log(`\n[${build}] STOPPED: ${msg}`); report(); process.exit(1); };
const say = msg => console.log(`[${U.fmtTime(S().time)}] ${msg}`);

function autoCombatTurn() {
  const s = S(), pc = s.pc;
  if (!C.isPcTurn() || pc.path || pc.pending) return;
  const w = G.weapon(pc);
  if (pc.hp < G.maxHp(pc) * 0.4 && G.count(pc, 'suture') && pc.ap >= 2) { GG.Act.useItem(pc, 'suture', pc); return; }
  if (w.mag && pc.loaded === 0) {
    if (G.reloadNeed(pc) > 0 && pc.ap >= 2) { G.reload(pc); return; }
    if (G.reloadNeed(pc) <= 0) { const m = pc.inv.find(s => GG.ITEMS[s.id].type === 'weapon' && !GG.ITEMS[s.id].mag && !GG.ITEMS[s.id].thrown); G.unequip(pc, 'weapon'); if (m) G.equip(pc, m.id); return; }
  }
  const foes = G.alive().filter(e => G.hostileToPlayer(e) && !e.caged);
  if (!foes.length) { C.endTurn(); return; }
  // run for the map edge when losing
  if (pc.hp < G.maxHp(pc) * 0.3 && !G.count(pc, 'suture') && G.S.mapId === 'encounter') {
    let best = null;
    for (let r = 0; r < G.geo.h; r++) for (let c = 0; c < G.geo.w; c++) if (G.isExit(c, r) && (!best || U.dist(c, r, pc.x, pc.y) < U.dist(best[0], best[1], pc.x, pc.y))) best = [c, r];
    const p = best && G.findPath(pc, best[0], best[1], { strict: true });
    if (p && p.length && pc.ap > 0) { pc.path = p.slice(0, pc.ap); fled++; return; }
  }
  const t = foes.sort((a, b) => U.de(a, pc) - U.de(b, pc))[0];
  const cost = C.apCost(pc, w, 'torso');
  if (C.canReach(pc, t, w) && (w.range <= 1 || U.de(pc, t) <= w.range) && pc.ap >= cost) { C.playerAttack(t, 'torso'); return; }
  if (pc.ap >= 1) {
    const p = G.findPath(pc, t.x, t.y, { adj: w.range > 1 ? Math.min(w.range - 1, 6) : 1, losTo: w.range > 1, strict: true });
    if (p && p.length) { pc.path = p.slice(0, Math.max(1, Math.min(pc.ap, p.length))); return; }
  }
  C.endTurn();
}
function tick(n = 1) {
  for (let i = 0; i < n; i++) {
    G.update(0.05);
    W.update(0.05);
    if (S().mode === 'combat') autoCombatTurn();
    if (S().mode === 'dead') die('player died');
    if (S().ui) S().ui = null;
  }
}
function settle(max = 4000) {
  let i = 0;
  while (S().mode === 'combat' && i++ < max) tick();
  if (S().mode === 'combat') die('combat did not end');
}
const fightIfNeeded = () => { if (S().mode === 'combat') { fights++; const hp0 = S().pc.hp; settle(); say(`  fight over, hp ${hp0} -> ${S().pc.hp}/${G.maxHp(S().pc)}`); healUp(); } };
function healUp() {
  const pc = S().pc;
  while (pc.hp < G.maxHp(pc) * 0.7 && G.count(pc, 'suture') > 0) GG.Act.useItem(pc, 'suture', pc);
  if (pc.hp < G.maxHp(pc) * 0.7 && !G.canRest() && S().mapId === 'sump') { const back = [pc.x, pc.y]; walk(31, 46, 0); if (G.canRest()) G.restUntilHealed(); walk(back[0], back[1], 1); }
  else if (pc.hp < G.maxHp(pc) * 0.7 && G.canRest()) G.restUntilHealed();
}
function walk(c, r, adj = 0, max = 3000) {
  const pc = S().pc;
  if (!G.moveTo(pc, c, r, { adj })) die(`no path to ${c},${r}`);
  let i = 0;
  while ((pc.path || pc.pending) && i++ < max && !S().dlg) { tick(); fightIfNeeded(); if (!pc.path && U.dist(pc.x, pc.y, c, r) > adj) G.moveTo(pc, c, r, { adj }); }
}
function talk(id) {
  const e = G.ent(id);
  if (!e) die(`no npc ${id}`);
  G.interact('ent', id);
  let i = 0;
  while (!S().dlg && i++ < 3000) { tick(); fightIfNeeded(); }
  if (!S().dlg) die(`could not talk to ${id}`);
}
function use(id) {
  for (let tries = 0; tries < 4 && !S().dlg && !S().ui; tries++) {
    G.interact('obj', id);
    let i = 0;
    while (!S().dlg && !S().ui && i++ < 3000 && S().pc.pending) { tick(); fightIfNeeded(); }
    fightIfNeeded();
    if (!S().map.objs.find(o => o.id === id) || S().map.objs.find(o => o.id === id).gone) break;
    if (!S().dlg && !S().ui && !G.adjObj(S().pc, S().map.objs.find(o => o.id === id))) continue;
    break;
  }
}
function skipCont() { let n = 0; while (S().dlg && n++ < 20) { const o = Dg.options(); if (o.length === 1 && o[0].cont) { if (VERBOSE) console.log("   > " + Dg.text().slice(0, 70)); Dg.choose(0); } else break; } }
function pick(sub, required = true) {
  skipCont();
  const opts = Dg.options();
  const i = opts.findIndex(o => o.t.toLowerCase().includes(sub.toLowerCase()));
  if (i < 0) { if (required) die(`option "${sub}" not found in ${S().dlg && S().dlg.id}.${S().dlg && S().dlg.node}: ${opts.map(o => o.t).join(' | ')}`); return false; }
  if (VERBOSE) console.log(`   > ${opts[i].tag} ${opts[i].t}`);
  Dg.choose(i);
  return true;
}
function pickOk(subs) { skipCont(); const opts = Dg.options(); for (const sub of subs) { const i = opts.findIndex(o => o.ok && o.t.toLowerCase().includes(sub.toLowerCase())); if (i >= 0) { if (VERBOSE) console.log('   > ' + opts[i].tag + ' ' + opts[i].t); Dg.choose(i); return true; } } die('no passable option among ' + subs); }
const endDlg = () => { if (S().dlg) Dg.end(); };
function leave() {
  if (S().mode === 'world') return;
  G.leaveMap('world');
}
function travel(node) {
  leave();
  let guard = 0;
  while (guard++ < 40) {
    W.travelTo(node);
    let i = 0;
    while (S().mode === 'world' && (S().world.dest || S().world.enc) && i++ < 20000) {
      if (S().world.enc) {
        const enc = S().world.enc;
        say(`  encounter: ${enc.id} (${enc.terr})`);
        W.resolveEncounter(!enc.avoidable || GG.ENCOUNTERS[enc.id].peaceful ? !GG.ENCOUNTERS[enc.id].peaceful : false);
        if (S().mode !== 'world') {
          let j = 0;
          while (j++ < 200) { tick(); if (S().mode === 'combat') fightIfNeeded(); }
          fightIfNeeded();
          // loot the dead
          if (S().map) for (const e of S().map.ents) if (e.dead) for (const s of e.inv.slice()) { G.addItem(S().pc, s.id, s.n); }
          leave();
        }
        break;
      }
      tick();
    }
    const here = W.here();
    if (here && here[0] === node) break;
  }
  W.enter(node, node === 'sump' && build === 'sneaker' ? 'culvert' : undefined);
  say(`arrived at ${node}`);
}
function lootEnt(id) { const e = G.ent(id); if (e && e.dead) for (const s of e.inv.slice()) { const n = s.n; G.removeItem(e, s.id, n); G.addItem(S().pc, s.id, n); if (GG.ITEMS[s.id].type === 'quest') GG.Scripts.onQuestItem(s.id); } }
function report() {
  const s = S(), pc = s.pc;
  console.log(`\n[${build} seed ${seed}] level ${pc.level} xp ${pc.xp} hp ${pc.hp}/${G.maxHp(pc)} tickets ${G.count(pc, 'ticket')} fights ${fights} kills ${s.stats.kills}`);
  console.log('quests:', Object.entries(s.quests).map(([k, q]) => `${k}=${q.stage}${q.done ? '✓' : ''}`).join(' '));
  console.log('flags:', Object.keys(s.flags).filter(k => !k.startsWith('chk_') && !k.startsWith('once_')).join(' '));
  console.log('title:', G.title());
}
function spend() {
  const pc = S().pc;
  const pref = { fighter: ['guns', 'doctor', 'butchery'], talker: ['gab', 'show', 'tinker'], sneaker: ['sneak', 'tinker', 'guns'] }[build];
  while (pc.unspent > 0) { const id = pref.find(p => G.skill(pc, p) < 100) || 'guns'; GG.Act.spendSkill(id, 1); }
  while (pc.scarPending) GG.Act.takeScar(build === 'talker' ? 'silvertongue' : 'thickhide');
}

// ================================================================ script
say(`start: ${build} hp ${S().pc.hp} ap ${G.maxAp(S().pc)} gab ${G.skill(S().pc, 'gab')} show ${G.skill(S().pc, 'show')} guns ${G.skill(S().pc, 'guns')} doctor ${G.skill(S().pc, 'doctor')} tinker ${G.skill(S().pc, 'tinker')} sneak ${G.skill(S().pc, 'sneak')}`);
talk('agnes'); pick('What kind of use'); pick('I\'ll find out'); endDlg();
say('accepted herd quest');

if (build === 'talker') {
  talk('tallow'); pick('Know anything'); pick('Information'); endDlg();
  talk('ruby'); pick('Marrow Show'); pick('I\'ll find them'); pick('Teach me some patter'); endDlg();
  talk('dellah'); pick('bet'); pick('You\'re on'); pick('Knock it back'); pick('Make a big show') || 0; pick('Is that the Calliope') || 0; endDlg();
  spend();
} else {
  talk('tallow'); pick('Know anything'); pick('Twenty tickets'); endDlg();
  use('mother');
  if (!S().dlg) die('mother dialogue did not open');
  pick('Examine the puckered', false) || pick('Read the meat', false) || pick('Hum the herding', false);
  endDlg();
  if (!G.has('coupling')) say('  failed to find the coupling at Old Mother');
  if (!W.known('sump')) { talk('ruby'); pick('Marrow Show'); pick('I\'ll find them'); endDlg(); }
  if (build === 'fighter') {
    // level up on the gristling bounty first
    const board = S().map.objs.find(o => o.name === 'Bounty Board');
    use(board.id); pick('Take the bounty'); endDlg();
    while (!U.isNight(S().time)) G.rest(1);
    walk(58, 30, 0);
    for (let h = 0; h < 6; h++) {
      G.rest(1); fightIfNeeded();
      for (const g of G.alive().filter(e => e.tpl === 'gristling')) { G.attackCmd(g.id, 'torso'); fightIfNeeded(); }
    }
    for (const n of S().map.objs.filter(o => o.type === 'nest' && !o.gone)) { use(n.id); pickOk(['Cut it out', 'Hack']); endDlg(); fightIfNeeded(); }
    healUp();
    talk('harrow'); pick('collect', false); pick('nests', false); endDlg();
    spend();
    const sl = G.ent('saltlick');
    const n = Math.min(24, Math.floor(G.count(S().pc, 'ticket') / 2 / GG.Act.buyPrice('r38', sl)));
    const doc = G.ent('purslane'); const ns = Math.floor(G.count(S().pc, 'ticket') / GG.Act.buyPrice('suture', doc)); if (ns > 0) say('  bought sutures: ' + GG.Act.trade(doc, [], [{ id: 'suture', n: ns }]).msg);
    if (n > 0) say('  bought ammo: ' + GG.Act.trade(sl, [], [{ id: 'r38', n }]).msg);
    say(`  after bounty: level ${S().pc.level}, kills ${S().stats.kills}, tickets ${G.count(S().pc, 'ticket')}`);
  }
}
say(`herd stage ${S().quests.herd.stage}, sump known ${W.known('sump')}`);
travel('sump');

const marrowby = () => G.ent('marrowby');
if (build === 'talker') {
  walk(31, 37, 0);
  if (!S().dlg) { talk('gate1'); }
  pick('new act');
  endDlg();
  if (!S().flags.showInvited) die('not invited');
  walk(31, 12, 0);
  let i = 0; while (!S().dlg && i++ < 200) tick();
  if (!S().dlg) talk('marrowby');
  pick('What exactly'); pick('who appreciates'); pick('Grand Calliope');
  pick('tenor'); pick('void', false) || pick('buy their contract');
  pick('killing'); pick('Calliope buys marrow', false) || pick('read the room');
  endDlg();
  if (!S().flags.marrowLeft) die('marrowby not talked down');
  fightIfNeeded();
  use('moecage');
  i = 0; while (!S().dlg && i++ < 50) tick();
  if (S().dlg) { pick('Come with me'); endDlg(); }
  use('pump'); pick('valve key'); endDlg();
} else {
  if (build === 'sneaker') {
    G.toggleSneak();
    walk(53, 26, 0);
    use('grate');
    // pick the office door and the safe for the spare valve key
    const pickLock = id => {
      const o = S().map.objs.find(o => o.id === id);
      let n = 0;
      while (o.locked && n++ < 40 && S().mode === 'explore') { G.approach({ kind: 'use', id, skill: 'lockwork' }); let k = 0; while ((S().pc.path || S().pc.pending) && k++ < 400) tick(); }
      fightIfNeeded();
      return !o.locked;
    };
    say(`  office door: ${pickLock('officedoor')}`);
    say(`  safe: ${pickLock('safe')}`);
    GG.Act.takeAll({ obj: 'safe' });
    walk(48, 22, 0);
    use('pump');
    if (!S().dlg) die('pump dialogue did not open');
    pickOk(['valve key', 'Reverse', 'Jam the governor', 'Smash']);
    endDlg();
    fightIfNeeded();
    // and the tenor
    const cage = S().map.objs.find(o => o.id === 'moecage');
    if (S().mode === 'explore') { pickLock('moecage'); use('moecage'); let k = 0; while (!S().dlg && k++ < 50) tick(); if (S().dlg) { pick('Come with me'); endDlg(); } fightIfNeeded(); }
    G.toggleSneak();
    say(`  sneak result: pump ${!!S().flags.pumpStopped} moe ${!!S().flags.moeFreed} hostile ${!!S().flags.marrowHostile}`);
    if (S().flags.pumpStopped && !S().flags.marrowHostile) { walk(57, 45, 0); }
  } else {
    walk(31, 37, 0);
    if (!S().dlg) talk('gate1');
    pick('go through you');
    fightIfNeeded();
  }
  spend();
  // clear the station (unless the sneaker got out clean)
  let guard = 0;
  while (guard++ < 30 && G.alive().some(e => e.faction === 'marrow') && !(build === 'sneaker' && !S().flags.marrowHostile)) {
    const boss = e => e.tpl === 'marrowby' || e.tpl === 'strongman';
    const pool = G.alive().filter(e => e.faction === 'marrow');
    if (!S().flags.moeFreed && !pool.some(e => !boss(e) && e.tpl === 'stiltwalker')) { lootEnt('keeper');  use('moecage'); let k = 0; while (!S().dlg && k++ < 50) tick(); if (S().dlg) { pickOk(['Come with me', 'owe me', 'Go back to Ruby']); endDlg(); } healUp(); }
    const t = (pool.filter(e => !boss(e)).length ? pool.filter(e => !boss(e)) : pool).sort((a, b) => U.de(a, S().pc) - U.de(b, S().pc))[0];
    G.attackCmd(t.id, 'torso');
    fightIfNeeded();
    if (S().mode === 'explore' && G.alive().includes(t)) { walk(t.x, t.y, 1); fightIfNeeded(); }
  }
  spend();
  for (const id of ['marrowby', 'keeper', 'bertha']) lootEnt(id);
  if (!S().flags.pumpStopped) { use('pump'); pick('valve key'); endDlg(); fightIfNeeded(); }
  use('moecage'); fightIfNeeded();
  let i = 0; while (!S().dlg && i++ < 50) tick();
  if (S().dlg) { pick('Come with me'); endDlg(); }
}
say(`sump done: pump stopped ${!!S().flags.pumpStopped}, moe ${S().flags.moeJoined ? 'joined' : S().flags.moeToRuby ? 'to ruby' : 'no'}; party ${G.partyEnts().length}`);
spend();
travel('gutwater');
talk('agnes');
pick('Reversed', false) || pick('Shut down', false);
pick('Grand Calliope', false);
pick('Goodbye', false); endDlg();
if (G.has('ledger') && S().quests.lawman) { talk('agnes'); pick('C.H.', false) && pick('Exile him', false); endDlg(); }
if (S().quests.ruby) { talk('ruby'); endDlg(); }
spend();
report();
const herd = S().quests.herd;
process.exit(herd && herd.done ? 0 : 1);
