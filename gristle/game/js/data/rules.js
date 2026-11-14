'use strict';
// Attributes, skills, quirks, scars and derived-stat formulas.
(function () {
  const R = GG.R = {};

  R.STATS = [
    { id: 'grit',   name: 'Grit',   desc: 'Muscle and stubbornness. Hit points, carry weight, melee damage.' },
    { id: 'nerve',  name: 'Nerve',  desc: 'Cold blood. Critical chance, combat sequence, not flinching.' },
    { id: 'wits',   name: 'Wits',   desc: 'Brains and eyes. Skill points per level, technical skills, spotting things.' },
    { id: 'charm',  name: 'Charm',  desc: 'Face, voice and patter. Talking, trading, performing.' },
    { id: 'reflex', name: 'Reflex', desc: 'Speed of hand and foot. Action points, armour class, guns, sneaking.' },
    { id: 'gut',    name: 'Gut',    desc: 'What you can stomach. Healing, poison, butchery, survival, and what you dare to eat.' },
  ];
  R.STAT_IDS = R.STATS.map(s => s.id);

  // base(stats) for each skill
  R.SKILLS = [
    { id: 'guns',     name: 'Guns',        f: s => 10 + 2 * s.reflex + 2 * s.nerve, desc: 'Pistols, rifles, scatterguns, rivet-throwers.' },
    { id: 'melee',    name: 'Melee',       f: s => 20 + 2 * s.grit + 2 * s.reflex, desc: 'Cleavers, hooks, saws and anything with a handle.' },
    { id: 'brawl',    name: 'Brawling',    f: s => 20 + 3 * s.grit + 2 * s.reflex, desc: 'Fists, knees, foreheads.' },
    { id: 'throwing', name: 'Throwing',    f: s => 4 * s.reflex, desc: 'Knives, bile jars, dynamite.' },
    { id: 'doctor',   name: 'Doctoring',   f: s => 5 + 2 * s.wits + s.gut, desc: 'Stitching, setting, diagnosing. Use on yourself or others.' },
    { id: 'butchery', name: 'Butchery',    f: s => 10 + 2 * s.gut + s.grit, desc: 'Cutting meat cleanly. Harvest creatures, read flesh, remove growths.' },
    { id: 'sneak',    name: 'Sneak',       f: s => 5 + 3 * s.reflex, desc: 'Moving unseen. Toggle with the Sneak button.' },
    { id: 'lockwork', name: 'Lockwork',    f: s => 5 + 2 * s.wits + s.reflex, desc: 'Locks, latches, cages and safes.' },
    { id: 'tinker',   name: 'Tinkering',   f: s => 3 * s.wits, desc: 'Pumps, pipes, traps and old Abundance machinery.' },
    { id: 'gab',      name: 'Gab',         f: s => 5 + 3 * s.charm + s.wits, desc: 'Persuading, lying and talking people down.' },
    { id: 'haggle',   name: 'Haggle',      f: s => 4 * s.charm, desc: 'Better prices when trading.' },
    { id: 'wrangle',  name: 'Wrangling',   f: s => 2 * s.charm + 2 * s.gut, desc: 'Handling Lumps, beasts and Mother Herds.' },
    { id: 'show',     name: 'Showmanship', f: s => 3 * s.charm + s.nerve, desc: 'Performing, bluffing crowds, carnival know-how.' },
    { id: 'survival', name: 'Survival',    f: s => 2 * s.gut + 2 * s.wits, desc: 'Travel, foraging, avoiding trouble on the world map.' },
  ];
  R.SKILL = Object.fromEntries(R.SKILLS.map(s => [s.id, s]));

  R.QUIRKS = [
    { id: 'ironstomach', name: 'Iron Stomach', desc: 'You can eat anything and keep it down. +2 Gut for eating and drinking checks. −1 Charm: everyone has noticed your breath.', mod: { charm: -1 } },
    { id: 'showboat', name: 'Showboat', desc: 'Raised under a big top. +15 Showmanship and Gab. −15 Sneak: you cannot help being seen.', skill: { show: 15, gab: 15, sneak: -15 } },
    { id: 'twitchy', name: 'Twitchy', desc: '+1 action point and +4 Sequence. −10 to all ranged hit chances; your hands shake.', ap: 1, seq: 4, aimPen: 10 },
    { id: 'bruiser', name: 'Bruiser', desc: '+2 Grit. −1 action point. You hit like a wagon and move like one.', mod: { grit: 2 }, ap: -1 },
    { id: 'squeamish', name: 'Squeamish', desc: '+15 Doctoring. −25 Butchery. Blood is for putting back in.', skill: { doctor: 15, butchery: -25 } },
    { id: 'fairborn', name: 'Fair-Born', desc: 'Born in a carnival wagon. +10 Haggle and Showmanship. Ranch folk charge you 10% more.', skill: { haggle: 10, show: 10 }, rancherTax: 0.1 },
    { id: 'fastmetab', name: 'Fast Metabolism', desc: 'Healing items and food heal 50% more. Poison hits you 50% harder.', healMul: 1.5, poisonMul: 1.5 },
  ];
  R.QUIRK = Object.fromEntries(R.QUIRKS.map(q => [q.id, q]));

  R.SCARS = [
    { id: 'thickhide', name: 'Thick Hide', desc: '+2 damage threshold against everything.', dt: 2 },
    { id: 'quickdraw', name: 'Quick Draw', desc: 'Gun attacks cost 1 less AP.', gunAp: -1 },
    { id: 'nimble', name: 'Nimble', desc: '+1 action point.', ap: 1 },
    { id: 'steady', name: 'Steady Hands', desc: '+15 to aimed shots.', aim: 15 },
    { id: 'butcherseye', name: "Butcher's Eye", desc: '+15% critical chance against creatures.', critBeast: 15 },
    { id: 'silvertongue', name: 'Silver Tongue', desc: '+15 Gab and +10 Haggle.', skill: { gab: 15, haggle: 10 } },
    { id: 'secondstomach', name: 'Second Stomach', desc: 'Food heals double, and you count as having +2 Gut for checks.', foodMul: 2, gutCheck: 2 },
    { id: 'packmule', name: 'Pack Mule', desc: '+50 carry weight.', carry: 50 },
    { id: 'luckyticket', name: 'Lucky Ticket', desc: '+5% critical chance; critical hits against you are rarer.', crit: 5 },
    { id: 'bonesetter', name: 'Bonesetter', desc: 'Doctoring heals 50% more and costs no extra time.', docMul: 1.5 },
    { id: 'nightowl', name: 'Night Owl', desc: 'No darkness penalty to hit or spot.', night: 1 },
    { id: 'toughcookie', name: 'Tough Cookie', desc: '+3 HP per level, applied retroactively.', hpLvl: 3 },
  ];
  R.SCAR = Object.fromEntries(R.SCARS.map(s => [s.id, s]));

  R.xpFor = lvl => 1000 * lvl * (lvl - 1) / 2;       // xp needed to reach lvl
  R.SCAR_EVERY = 3;

  const allMods = e => {
    const list = [];
    for (const q of e.quirks || []) list.push(R.QUIRK[q]);
    for (const s of e.scars || []) list.push(R.SCAR[s]);
    for (const b of e.buffs || []) list.push(b);
    return list.filter(Boolean);
  };
  R.mods = allMods;
  R.sum = (e, key) => allMods(e).reduce((a, m) => a + (m[key] || 0), 0);

  // effective stat (players: base + quirk/buff mods; NPCs: template stats)
  R.stat = (e, id) => {
    let v = (e.stats && e.stats[id]) || 5;
    for (const m of allMods(e)) if (m.mod && m.mod[id]) v += m.mod[id];
    return GG.U.clamp(v, 1, 10);
  };
  R.stats = e => Object.fromEntries(R.STAT_IDS.map(id => [id, R.stat(e, id)]));

  R.skillBase = (e, id) => R.SKILL[id].f(R.stats(e));
  R.skill = (e, id) => {
    if (e.skillFixed && e.skillFixed[id] != null) return e.skillFixed[id];
    let v = R.skillBase(e, id);
    const knack = (e.knacks || []).includes(id);
    if (knack) v += 20;
    v += ((e.skillPts && e.skillPts[id]) || 0) * (knack ? 2 : 1);
    for (const m of allMods(e)) if (m.skill && m.skill[id]) v += m.skill[id];
    if (e.tutor && e.tutor[id]) v += e.tutor[id];
    return Math.max(0, Math.min(200, Math.round(v)));
  };

  R.maxHp = e => {
    if (e.hpFixed) return e.hpFixed;
    const g = R.stat(e, 'grit'), gut = R.stat(e, 'gut'), lv = e.level || 1;
    return 20 + 2 * g + gut + (lv - 1) * (3 + Math.floor(gut / 2) + R.sum(e, 'hpLvl')) + R.sum(e, 'hpLvl');
  };
  R.maxAp = e => (e.apFixed || (5 + Math.floor(R.stat(e, 'reflex') / 2))) + R.sum(e, 'ap');
  R.seq = e => (e.seqFixed || (2 * R.stat(e, 'nerve') + Math.floor(R.stat(e, 'reflex') / 2))) + R.sum(e, 'seq');
  R.crit = e => (e.critFixed != null ? e.critFixed : R.stat(e, 'nerve')) + R.sum(e, 'crit');
  R.carry = e => 25 + 15 * R.stat(e, 'grit') + R.sum(e, 'carry');
  R.meleeBonus = e => Math.max(1, R.stat(e, 'grit') - 4);
  R.skillPtsPerLevel = e => 5 + 2 * R.stat(e, 'wits');
  R.gutCheck = e => R.stat(e, 'gut') + R.sum(e, 'gutCheck') + ((e.quirks || []).includes('ironstomach') ? 2 : 0);

  R.armor = e => {
    const a = e.equip && e.equip.armor ? GG.ITEMS[e.equip.armor] : null;
    const base = e.armorFixed || { ac: 0, dt: 0, dr: 0 };
    return {
      ac: (e.armorFixed ? base.ac : R.stat(e, 'reflex')) + (a ? a.ac : 0),
      dt: base.dt + (a ? a.dt : 0) + R.sum(e, 'dt'),
      dr: Math.min(85, base.dr + (a ? a.dr : 0)),
    };
  };

  // titles from deeds, highest priority first
  R.TITLES = [
    { id: 'herdsaint', name: 'Saint of the Herd', test: s => s.flags.pumpReversed && s.flags.herdSaved },
    { id: 'butcher', name: 'The Butcher of the Rind', test: s => (s.stats.kills || 0) >= 40 },
    { id: 'sellout', name: 'Ticket-Taker', test: s => s.flags.tookMarrowDeal },
    { id: 'drinker', name: 'Bottomless Dellah\'s Bane', test: s => s.flags.wonDrinking },
    { id: 'friendoffreaks', name: 'Friend of Freaks', test: s => s.flags.moeFreed },
    { id: 'stray', name: 'The Stray', test: () => true },
  ];
})();
