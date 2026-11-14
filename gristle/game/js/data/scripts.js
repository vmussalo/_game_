'use strict';
// Quests, shops, map/object hooks and ending slides.
(function () {
  const U = GG.U;

  GG.QUESTS = {
    herd: { name: 'Old Mother Is Wasting', stages: {
      10: 'Agnes Vell, the Herdmother, wants to know why Old Mother is greying and shrinking. 300 tickets if I find out.',
      20: 'Old Mother is not sick: she is being drained. A pipe was buried in her, stamped "Abundance Feedworks 9". The old Feedworks, "the Sump", lies north-west of Gutwater.',
      30: 'I found the Sump. A carnival troupe, the Marrow Show, has set up a pump in it.',
      40: 'The pump is stopped. I should tell Agnes.',
      45: 'Mister Marrowby paid me to tell Agnes it was a natural wasting. The pump is still running.',
      50: 'Old Mother is saved. Agnes paid up.',
      55: 'I lied to Agnes. Old Mother will keep wasting, and Gutwater with her.',
    }, done: [50, 55] },
    lawman: { name: "The Lawman's Cut", stages: {
      10: 'The Marrow Ledger names a local "facilitator": C.H. Cobb Harrow, the sheriff?',
      20: 'Harrow is exposed and gone from Gutwater.',
      30: 'Harrow is paying me to keep quiet.',
      40: 'Harrow is dead.',
      50: 'Harrow confessed and handed himself over to Agnes.',
    }, done: [20, 30, 40, 50] },
    ruby: { name: "Ruby's Missing Marvel", stages: {
      10: 'Ruby Teeth\'s star act, Moe & Lester the Two-Headed Tenor, went to the Marrow Show to ask for "a better contract" and never came back.',
      20: 'I found Moe & Lester locked in a cage in the Sump.',
      30: 'Moe & Lester are free. Ruby will want to know.',
      40: 'Ruby has her marvel back (or at least knows where he is).',
      45: 'Moe & Lester are dead. Ruby has to be told.',
    }, done: [40] },
    bounty: { name: 'Gristling Season', stages: {
      10: 'The bounty board pays 10 tickets for every Gristling killed around Gutwater, and 100 for burning out all three tumour nests in the pasture. Collect from the sheriff\'s office.',
      20: 'All three tumour nests are gone. Time to collect.',
      30: 'The nest bounty is paid.',
    }, done: [30] },
    drink: { name: 'Bottoms Up', stages: {
      10: 'Big Dellah at the Sweetbread has never lost a drinking contest. 50 tickets says I can be the first.',
      20: 'I outdrank Big Dellah.',
      30: 'Dellah drank me under the table.',
    }, done: [20, 30] },
    tallow: { name: 'The Back Way', stages: {
      10: 'Tallow, a kid in Gutwater, claims to know a secret way into the Sump. Information costs.',
      20: 'Tallow told me about a drainage culvert on the east side of the Sump: the grate is rusted and just needs a shove.',
    }, done: [20] },
  };

  GG.SHOPS = {
    store: [['ticket', 400], ['r38', 40], ['r44', 24], ['shell', 16], ['jerky', 10], ['sweetgristle', 4], ['marrowshine', 5], ['skinknife', 1], ['cleaver', 2], ['meathook', 1], ['knuckles', 1], ['leverrifle', 1], ['biljar', 3], ['duster', 1], ['purge', 2]],
    doc: [['ticket', 250], ['suture', 8], ['purge', 4], ['smellsalts', 2], ['bonesaw', 1]],
    wynn: [['ticket', 300], ['r38', 30], ['rivet', 30], ['shell', 12], ['scattergun', 1], ['rivetgun', 1], ['boneplate', 1], ['dynamite', 3], ['suture', 4], ['jerky', 6], ['marrowshine', 3]],
  };

  const Q = (G, id, stage, done) => GG.Scripts.quest(id, stage, done);

  GG.Scripts = {
    quest: (id, stage, done) => {
      const G = GG.G, S = G.S;
      const q = S.quests[id] || (S.quests[id] = { stage: 0, done: false, hist: [] });
      if (q.stage === stage) return;
      q.stage = stage;
      q.hist.push(stage);
      const def = GG.QUESTS[id];
      q.done = done || def.done.includes(stage);
      G.log(`${q.done ? 'Quest complete' : 'Quest updated'}: ${def.name}`, 'quest');
      G.emit('quest', { id, stage });
    },
    onQuestItem: id => {
      const G = GG.G, S = G.S;
      if (id === 'ledger' && !S.quests.lawman) Q(G, 'lawman', 10);
      if (id === 'coupling' && (S.quests.herd || {}).stage < 20) { Q(G, 'herd', 20); GG.World.reveal('sump'); }
      if (id === 'sample' && (S.quests.herd || {}).stage < 20) { Q(G, 'herd', 20); GG.World.reveal('sump'); }
    },
    afterDialog: () => {
      const G = GG.G, S = G.S;
      if (S.flags.marrowLeft && S.mapId === 'sump' && !S.flags.marrowGone) {
        S.flags.marrowGone = true;
        for (const e of S.map.ents) if (e.faction === 'marrow' && !e.dead) e.gone = true;
        G.log('The Marrow Show packs its wagons with astonishing speed and rattles away into the Rind, honking.');
      }
      if (S.pendingCombat) {
        S.pendingCombat = false;
        const near = G.alive().filter(e => G.hostileToPlayer(e)).sort((a, b) => U.de(a, S.pc) - U.de(b, S.pc))[0];
        if (near) { G.log('The whole station heard that.', 'hurt'); GG.Combat.start(near); }
      }
      if (S.flags.moeJoined && S.mapId === 'sump') {
        const m = G.ent('moe');
        if (m && !m.party) { m.party = true; m.caged = false; m.faction = 'player'; m.dlgId = 'moe'; G.log('Moe & Lester join you.', 'quest'); }
      }
    },
  };

  const SC = GG.SCRIPTS = { enter: {}, leave: {}, hour: {}, death: {}, obj: {} };

  // ---------------------------------------------------------------- Gutwater
  SC.enter.gutwater = (G, entry) => {
    const S = G.S;
    if (!S.flags.introDone) {
      S.flags.introDone = true;
      G.emit('intro', {});
    }
    const harrow = G.ent('harrow');
    if (harrow && (S.flags.harrowExiled || S.flags.harrowJailed) && !harrow.dead) harrow.gone = true;
    if (S.flags.moeToRuby && !G.ent('moe_town') && !S.flags.moeDead) {
      const e = G.makeEnt('moe', [43, 33], { id: 'moe_town', dlgId: 'moeruby' });
      S.map.ents.push(e);
    }
    if (S.flags.herdSaved) { const m = S.map.objs.find(o => o.id === 'mother'); if (m) m.health = 1; }
  };
  SC.hour.gutwater = (G, hours) => {
    const S = G.S;
    if (!S.flags.herdSaved) S.flags.motherDrain = (S.flags.motherDrain || 0) + hours;
    if (!U.isNight(S.time)) return;
    for (const o of S.map.objs) {
      if (o.type !== 'nest' || o.gone) continue;
      const near = G.alive().filter(e => e.tpl === 'gristling' && U.dist(e.x, e.y, o.at[0], o.at[1]) < 8).length;
      if (near < 2 && U.r() < 0.5) {
        const spot = G.freeNear(o.at[0], o.at[1], 1);
        const e = G.makeEnt('gristling', spot, { ai: 'wander', wander: 4, home: [o.at[0], o.at[1]] });
        S.map.ents.push(e);
      }
    }
  };
  SC.death.gristling = (G, e, killer) => {
    const S = G.S;
    if (S.mapId === 'gutwater' && killer && killer.party && (S.quests.bounty || {}).stage >= 10) S.flags.bountyOwed = (S.flags.bountyOwed || 0) + 10;
  };
  SC.death.harrow = (G) => {
    const S = G.S;
    S.flags.harrowDead = true;
    if (S.quests.lawman && !S.quests.lawman.done) Q(G, 'lawman', 40);
  };
  SC.death.marrowby = (G) => { G.S.flags.marrowbyDead = true; G.log('Mister Marrowby takes his final bow.'); };
  SC.death.moe = (G) => { G.S.flags.moeDead = true; if (G.S.quests.ruby) Q(G, 'ruby', 45); };
  SC.death.agnes = (G) => { G.S.flags.agnesDead = true; };

  SC.obj.mother = (G, o, { skill }) => { GG.Dialog.start('mother', null, false, o.id); };
  SC.obj.nest = (G, o, { skill }) => { GG.Dialog.start('nest', null, false, o.id); };
  SC.obj.pump = (G, o, { skill }) => { GG.Dialog.start('pump', null, false, o.id); };
  SC.obj.bountyBoard = (G, o) => { GG.Dialog.start('board', null, false, o.id); };
  SC.obj.moecage = (G, o) => {
    const S = G.S;
    if (S.flags.moeFreed) return;
    S.flags.moeFreed = true;
    const m = G.ent('moe');
    if (m) m.caged = false;
    if ((S.quests.ruby || {}).stage < 30) Q(G, 'ruby', 30);
    G.giveXp(150, 'freed Moe & Lester');
    if (!S.flags.marrowHostile && !S.flags.marrowGone && G.witnessed('marrow', 9)) {
      S.flags.marrowHostile = true;
      G.log('"HEY! The tenor\'s loose!"', 'hurt');
      const w = G.alive().find(e => e.faction === 'marrow');
      if (w) { GG.Combat.start(w); return; }
    }
    if (m && G.S.mode === 'explore') G.talk(m);
  };

  // ---------------------------------------------------------------- Sump
  SC.enter.sump = (G, entry) => {
    const S = G.S;
    if ((S.quests.herd || { stage: 0 }).stage < 30) Q(G, 'herd', 30);
    if (S.flags.tallowCulvert) { const g = S.map.objs.find(o => o.id === 'grate'); if (g) g.locked = 0; }
    const moe = G.ent('moe');
    if (moe && !S.flags.moeFreed && (S.quests.ruby || {}).stage === 10) { /* found later on sight */ }
    if (S.flags.marrowLeft) for (const e of S.map.ents) if (e.faction === 'marrow') e.gone = true;
    if (entry === 'culvert') G.log('You squelch up the culvert. The grate into the pump hall is just ahead, to the west.');
  };
  SC.hour.sump = (G) => {
    const S = G.S;
    const m = G.ent('moe');
    if (m && m.caged && (S.quests.ruby || {}).stage === 10 && GG.U.de(m, S.pc) < 8) Q(G, 'ruby', 20);
  };

  // ---------------------------------------------------------------- endings
  GG.ENDINGS = [
    { id: 'herd', img: 'mother', title: 'Gutwater', text: S =>
      S.flags.pumpReversed ? 'With the Marrow Show\'s stolen marrow pumped straight back into her, Old Mother swelled pink and fat within a week. That autumn she sang every night, and the cutting crews had to wear earplugs. Gutwater had its best year in a decade.'
      : S.flags.herdSaved ? 'Old Mother healed slowly, the way old things do. The cuts were thin for a season and then, one morning, Agnes Vell came out of the pasture smiling. Gutwater went on, which in the Rind is the same as winning.'
      : S.flags.lied ? 'Old Mother wasted through the winter. By spring she was a grey ridge of gristle, and Gutwater packed its wagons and followed the road east, towards the music. Nobody ever learned why. You did.'
      : 'Old Mother kept greying. Gutwater kept cutting. Some stories do not end; they just thin out.' },
    { id: 'harrow', img: 'harrow', title: 'Sheriff Harrow', text: S =>
      S.flags.harrowDead ? 'Sheriff Cobb Harrow was buried at the edge of the pasture, facing away from the town. Deputy Pruitt took the star and, to everyone\'s surprise, kept it clean.'
      : S.flags.harrowJailed ? 'Cobb Harrow spent a season in his own cell, then took a job cutting for the herd he had sold. He is said to be very good at it now, and very quiet.'
      : S.flags.harrowExiled ? 'Agnes Vell gave Cobb Harrow a mule, a canteen and one hour. He was last seen riding east, towards the dust on the horizon, where a man of his talents would be appreciated.'
      : S.flags.harrowBlackmail ? 'Sheriff Harrow paid, and kept paying, and kept the star. Some nights he cleaned his long rifle and looked at the road you had taken.'
      : 'Sheriff Harrow kept his secrets and his star. The ledger, wherever it ended up, said what it said.' },
    { id: 'moe', img: 'moe', title: 'Moe & Lester', text: S =>
      S.flags.moeDead ? 'Ruby Teeth painted over the two-headed man on her wagon. Then, after a week, she painted him back.'
      : S.flags.moeJoined ? 'Moe & Lester rode with the Stray. Moe kept a diary of the journey in verse. Lester kept a second diary, correcting the first.'
      : S.flags.moeToRuby ? 'Ruby\'s Rarities reopened with a new show: "THE TENOR WHO CAME BACK FROM THE MARROW". It ran for two hundred nights. Moe sang. Lester did the jokes. They were both, finally, paid the same.'
      : S.flags.moeFreed ? 'Moe & Lester walked out of the Sump into the Rind, arguing about which way was north. Nobody has heard their harmony since. Nobody has heard their argument end, either.'
      : 'Somewhere in the Sump, a tenor and a baritone are still harmonising through the bars. The song is getting quieter.' },
    { id: 'marrow', img: 'marrowby', title: 'The Marrow Show', text: S =>
      S.flags.marrowbyDead ? 'Mister Marrowby\'s scarlet coat ended up on a scarecrow in the Gutwater pasture. The Gristlings avoid it. So does everyone else.'
      : S.flags.marrowLeft ? 'The Marrow Show rolled east to rejoin the Grand Calliope, short one pump and one excuse. Their next performance would be much bigger.'
      : S.flags.tookMarrowDeal ? 'Mister Marrowby kept his word, in the way men like him keep anything: until it was inconvenient. Your share stopped arriving after two months.'
      : 'The Marrow Show is still out there, somewhere, feeling the goodness.' },
    { id: 'dellah', img: 'dellah', title: 'Big Dellah', text: S =>
      S.flags.wonDrinking ? 'Big Dellah demanded a rematch every week for a year. She never got one. She did, eventually, get a plaque.'
      : (S.quests.drink || {}).stage === 30 ? 'Big Dellah told the story of how she drank the Stray under the table to anyone who would listen, and several who would not.'
      : 'Big Dellah remained undefeated, which she mentions often.' },
    { id: 'stray', img: 'stray', title: 'The Stray', text: S => `They called you ${GG.G.title()}. You rode east after the dust on the horizon, ${S.flags.moeJoined ? 'two heads harmonising behind you, ' : ''}with a ledger full of questions and a name nobody in Gutwater would forget. The Grand Calliope was coming. Every summer, it was coming.` },
  ];
})();
