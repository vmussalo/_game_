'use strict';
// World map: terrain grid, nodes, travel, random encounters.
(function () {
  const U = GG.U, R = GG.R, G = GG.G;
  const W = GG.World = {};
  W.w = 48; W.h = 32;

  W.NODES = {
    gutwater: { name: 'Gutwater', x: 15, y: 19, map: 'gutwater', entry: 'south', desc: 'A ranch town beside its Mother Herd.' },
    sump: { name: 'The Sump', x: 6, y: 9, map: 'sump', entry: 'front', desc: 'Abundance Feedworks Station 9. Pipes, rust, and a carnival that is closed to the public.' },
    crossing: { name: 'Hollow Pike Crossing', x: 27, y: 15, map: 'crossing', entry: 'south', desc: 'A dry ford with a pike of skulls. Traders camp here.' },
    tallowmarket: { name: 'Tallowmarket', x: 40, y: 7, teaser: 'The road to Tallowmarket is choked by a Bloom-wall forty feet high. Cutting crews will clear it... eventually. (Act 2)' },
    saintoffal: { name: 'Saint Offal', x: 41, y: 26, teaser: 'You can hear the Choir from here, humming in a key that makes your fillings ache. The gates are shut to strangers this season. (Act 2)' },
    calliope: { name: 'Dust on the Horizon', x: 45, y: 16, teaser: 'A mile-long column of dust, and under it, very faintly, a calliope playing a waltz. The Grand Calliope is coming. (Act 2)' },
  };

  // terrain per world cell (deterministic)
  W.terrain = (x, y) => W.terrainF(x, y);
  W.terrainF = (x, y) => {
    const n = U.fbm(x / 7, y / 7, 404), m = U.fbm(x / 5, y / 5, 505);
    const river = Math.abs(U.fbm(x / 10, y / 10, 606) - 0.5) < 0.035;
    if (river) return 'river';
    if (n > 0.6 || (Math.hypot(x - 6, y - 9) < 4 && n > 0.45)) return 'bloom';
    if (m > 0.62) return 'badlands';
    return 'plains';
  };
  W.SPEED = { plains: 3.2, river: 2.6, badlands: 2.5, bloom: 2.0 };     // cells per game hour
  W.ENC = { plains: 7, river: 6, badlands: 9, bloom: 12 };               // % per hour

  W.known = id => !!G.S.world.known[id];
  W.reveal = id => { if (!G.S.world.known[id]) { G.S.world.known[id] = true; G.log(`New location: ${W.NODES[id].name}.`, 'loc'); } };

  W.nodeAt = (x, y) => Object.entries(W.NODES).find(([id, n]) => W.known(id) && Math.hypot(n.x - x, n.y - y) < 0.8);

  W.setDest = (x, y) => {
    const S = G.S;
    if (S.mode !== 'world' || S.world.enc) return;
    S.world.dest = [U.clamp(x, 0, W.w - 1), U.clamp(y, 0, W.h - 1)];
  };
  W.travelTo = id => { const n = W.NODES[id]; if (n) W.setDest(n.x, n.y); };

  let hourAcc = 0;
  W.REAL_PER_HOUR = 0.3;   // real seconds per game hour of travel
  W.update = dt => {
    const S = G.S;
    if (S.mode !== 'world' || S.world.enc || S.ui || !S.world.dest) return;
    const wd = S.world;
    const terr = W.terrain(Math.round(wd.x), Math.round(wd.y));
    const hours = dt / W.REAL_PER_HOUR;
    const step = W.SPEED[terr] * hours * (1 + G.skill(S.pc, 'survival') / 400);
    const dx = wd.dest[0] - wd.x, dy = wd.dest[1] - wd.y, d = Math.hypot(dx, dy);
    G.advance(hours * 60);
    if (d <= step) {
      wd.x = wd.dest[0]; wd.y = wd.dest[1]; wd.dest = null;
      const nd = W.nodeAt(wd.x, wd.y);
      if (nd) W.arrive(nd[0]);
      return;
    }
    wd.x += dx / d * step; wd.y += dy / d * step;
    for (const [id, n] of Object.entries(W.NODES)) if (!W.known(id) && !n.hidden && Math.hypot(n.x - wd.x, n.y - wd.y) < 3.5 && (n.teaser || id === 'crossing')) W.reveal(id);
    hourAcc += hours;
    while (hourAcc >= 1) {
      hourAcc -= 1;
      W.rollEncounter(terr);
      if (S.world.enc) break;
    }
  };

  W.rollEncounter = terr => {
    const S = G.S;
    if (Math.hypot(S.world.x - W.NODES.gutwater.x, S.world.y - W.NODES.gutwater.y) < 2) return;
    const sv = G.skill(S.pc, 'survival');
    const ch = Math.max(2, W.ENC[terr] - sv / 20) * (S.pc.level < 2 ? 0.5 : 1);
    if (!U.roll(ch)) return;
    const table = GG.ENC_TABLE[terr === 'river' ? 'plains' : terr].filter(([id]) => !(GG.ENCOUNTERS[id].once && S.world.encDone[id]) && (GG.ENCOUNTERS[id].minLevel || 1) <= S.pc.level);
    const tot = table.reduce((a, t) => a + t[1], 0);
    let r = U.r() * tot, pick = table[0][0];
    for (const [id, wgt] of table) { if ((r -= wgt) < 0) { pick = id; break; } }
    const E = GG.ENCOUNTERS[pick];
    const avoid = !E.peaceful && U.roll(Math.min(90, sv * 0.8));
    S.world.enc = { id: pick, terr, avoidable: avoid || !!E.peaceful, seed: U.ri(1, 1e6) };
    G.emit('encounter', S.world.enc);
  };

  W.resolveEncounter = enter => {
    const S = G.S, enc = S.world.enc;
    if (!enc) return;
    S.world.enc = null;
    if (!enter && enc.avoidable) { G.log(GG.ENCOUNTERS[enc.id].peaceful ? 'You ride on.' : 'You give them a wide berth.'); if (!GG.ENCOUNTERS[enc.id].peaceful) G.giveXp(20, 'avoided'); return; }
    W.startEncounter(enc.id, enc.terr === 'river' ? 'plains' : enc.terr, enc.seed);
  };

  W.startEncounter = (id, terr, seed) => {
    const S = G.S;
    const E = GG.ENCOUNTERS[id];
    if (E.once) S.world.encDone[id] = true;
    const def = GG.makeEncounterMap(id, terr, seed);
    G.enterMap('encounter', 'center', def);
    G.log(E.text);
    const pc = S.pc;
    for (const [tpl, mn, mx] of E.spawn) {
      const n = Math.min(U.ri(mn, mx), mn + Math.max(0, pc.level - 1));  // scale with level
      for (let i = 0; i < n; i++) {
        const d = U.ri(E.dist[0], E.dist[1]);
        const ring = U.ring(pc.x, pc.y, d).filter(([c, r]) => G.inb(c, r) && G.passable(c, r) && !G.isExit(c, r));
        if (!ring.length) continue;
        const base = S.map.ents.find(e => e.tpl === tpl);
        let spot = U.pick(ring);
        if (base) { const close = ring.filter(([c, r]) => U.dist(c, r, base.x, base.y) <= 4); if (close.length) spot = U.pick(close); }
        const e = G.makeEnt(tpl, spot, tpl === 'wynn' ? { id: 'wynn' } : {});
        e.ai = GG.CREATURES[tpl].ai === 'stand' ? 'stand' : 'wander';
        e.wander = 3;
        S.map.ents.push(e);
      }
    }
  };

  W.arrive = id => {
    const S = G.S, n = W.NODES[id];
    if (n.teaser) { G.log(n.teaser, 'loc'); G.emit('teaser', { id, text: n.teaser }); return; }
    S.world.at = id;
    G.emit('arrive', { id });
  };
  // enter a node's local map (UI may first ask for entry choice)
  W.enter = (id, entry) => {
    const S = G.S, n = W.NODES[id];
    if (!n || !n.map) return;
    S.world.visited[id] = true;
    G.enterMap(n.map, entry || n.entry);
  };
  W.entries = id => {
    if (id === 'sump' && G.S.flags.tallowCulvert) return [['front', 'The front gate'], ['culvert', 'The drainage culvert (Tallow\'s back way)']];
    return null;
  };
  // the node the party stands at (after leaving a map, they stand on its node)
  W.here = () => W.nodeAt(G.S.world.x, G.S.world.y);
  W.onLeaveMap = () => {
    const S = G.S;
    const from = S.lastMap;
    const nd = Object.entries(W.NODES).find(([, n]) => n.map === from);
    if (nd) { S.world.x = nd[1].x; S.world.y = nd[1].y; }
  };
  G.on((type) => { if (type === 'world') W.onLeaveMap(); });
})();
