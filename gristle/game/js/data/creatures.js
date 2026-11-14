'use strict';
// NPC and creature templates. Combat numbers are fixed (hp, ap, skills); people also get stats for checks.
(function () {
  const H = (o) => Object.assign({ kind: 'human', skin: '#c99a74', hair: '#3a2a1e', coat: '#6a5038', pants: '#4a3c30', hat: 'none', hatC: '#4a3626', face: 'plain', build: 1, h: 1 }, o);
  GG.CREATURES = {
    // ---------------- Gutwater
    agnes: { name: 'Agnes Vell', title: 'Herdmother', faction: 'town', hp: 40, ap: 7, skills: { guns: 70, melee: 60 }, weapon: 'scattergun', ammo: ['shell', 12], dlg: 'agnes', ai: 'stand',
      look: H({ skin: '#b98b66', hair: '#9a9a96', coat: '#4c3a52', pants: '#3a2e2a', hat: 'bonnet', hatC: '#e0d8c0', face: 'scar', build: 1.05 }), barks: ['Mind the Mother.', 'Cut clean or don\'t cut at all.'] },
    purslane: { name: 'Doc Purslane', faction: 'town', hp: 28, ap: 7, skills: { melee: 45 }, weapon: 'skinknife', dlg: 'purslane', ai: 'stand', shop: 'doc',
      look: H({ skin: '#d8b090', hair: '#6a5a4a', coat: '#d8d0bc', pants: '#3a3a3a', hat: 'none', face: 'spectacles', build: 0.9, apron: '#9a3a32' }), barks: ['Next!', 'Don\'t touch the jars.'] },
    ruby: { name: 'Ruby Teeth', faction: 'town', hp: 30, ap: 8, skills: { guns: 55, show: 95 }, weapon: 'pepperbox', ammo: ['r38', 12], dlg: 'ruby', ai: 'stand',
      look: H({ skin: '#e2b896', hair: '#a8282c', coat: '#a8282c', pants: '#2a1e2a', hat: 'top', hatC: '#1e1a1e', face: 'lipstick', build: 0.92 }), barks: ['Roll up! Roll up! ...oh, it\'s just you.', 'Seen a two-headed man? Tenor and baritone?'] },
    saltlick: { name: '"Saltlick" Morrow', faction: 'town', hp: 32, ap: 7, skills: { guns: 50 }, weapon: 'pepperbox', ammo: ['r38', 6], dlg: 'saltlick', ai: 'stand', shop: 'store',
      look: H({ skin: '#c08860', hair: '#2a2018', coat: '#7a6a4a', pants: '#4a3a2a', hat: 'bowler', hatC: '#2a2420', face: 'mustache', build: 1.25, apron: '#cfc6a8' }), barks: ['Everything\'s for sale except my tongue.', 'Buyin\' gristle, sellin\' paste.'] },
    harrow: { name: 'Sheriff Cobb Harrow', faction: 'town', hp: 55, ap: 8, skills: { guns: 80, melee: 55 }, weapon: 'harrowrifle', ammo: ['r44', 18], inv: [['ticket', 160], ['jerky', 2]], dlg: 'harrow', ai: 'stand', armorFixed: { ac: 8, dt: 2, dr: 20 }, xp: 300,
      look: H({ skin: '#b48058', hair: '#5a4632', coat: '#5c4630', pants: '#3e3428', hat: 'stetson', hatC: '#2e2418', face: 'mustache', build: 1.1, star: true }), barks: ['Keep your iron holstered.', 'Nothing to see east of the fence.'] },
    tallow: { name: 'Tallow', faction: 'town', hp: 14, ap: 8, skills: { brawl: 40 }, weapon: 'fists', dlg: 'tallow', ai: 'wander', wander: 3,
      look: H({ skin: '#d0a07a', hair: '#c89a50', coat: '#8a7a5a', pants: '#5a4a38', hat: 'cap', hatC: '#6a3a2a', face: 'freckles', build: 0.75, h: 0.72 }), barks: ['Got any sugar gristle?', 'I know things. Things cost.'] },
    dellah: { name: 'Big Dellah', faction: 'town', hp: 50, ap: 7, skills: { brawl: 75 }, weapon: 'fists', stats: { gut: 9 }, dlg: 'dellah', ai: 'stand',
      look: H({ skin: '#a87452', hair: '#1e1612', coat: '#7a3a32', pants: '#3a2e28', hat: 'none', face: 'grin', build: 1.45, h: 1.05 }), barks: ['Who\'s buyin\'?', 'Nobody outdrinks Dellah.'] },
    gummy: { name: 'Old Gummy', faction: 'town', hp: 18, ap: 6, skills: { brawl: 30 }, weapon: 'fists', dlg: 'gummy', ai: 'stand',
      look: H({ skin: '#c8a082', hair: '#d8d8d0', coat: '#5a5040', pants: '#4a4034', hat: 'stetson', hatC: '#6a5a40', face: 'beard', build: 0.9 }), barks: ['*hic*', 'I remember when meat stayed dead.'] },
    rancher: { name: 'Rancher', faction: 'town', hp: 26, ap: 7, skills: { guns: 50, melee: 50 }, weapon: 'cleaver', dlg: 'townsfolk', ai: 'wander', wander: 5, xp: 40,
      look: H({ coat: '#6a5a3a', hat: 'stetson', hatC: '#5a4630', face: 'beard' }), barks: ['Herd\'s looking grey.', 'Cut\'s been thin this month.', 'Gristlings again last night.', 'Heard the Calliope\'s coming this way.'] },
    rancherf: { name: 'Rancher', faction: 'town', hp: 24, ap: 7, skills: { guns: 55, melee: 45 }, weapon: 'skinknife', dlg: 'townsfolk', ai: 'wander', wander: 5, xp: 40,
      look: H({ skin: '#d4a882', hair: '#7a4a28', coat: '#7a5048', hat: 'bonnet', hatC: '#c8b898', face: 'plain', build: 0.9 }), barks: ['Old Mother didn\'t sing last night.', 'Don\'t you go cutting without asking.', 'Saltlick\'s prices are criminal.'] },
    deputy: { name: 'Deputy Pruitt', faction: 'town', hp: 32, ap: 7, skills: { guns: 60 }, weapon: 'pepperbox', ammo: ['r38', 12], dlg: 'deputy', ai: 'stand', xp: 60,
      look: H({ coat: '#5a4a38', hat: 'stetson', hatC: '#3a2e20', face: 'plain', star: true, build: 0.95 }), barks: ['Sheriff says move along.', 'Quiet day. Quiet\'s good.'] },
    lumper: { name: 'Lump', faction: 'beast', beast: true, hp: 45, ap: 5, skills: { brawl: 40 }, weapon: 'gore', ai: 'wander', wander: 6, passive: true, butcher: [['gristle', 3]], xp: 30,
      look: { kind: 'lump', skin: '#b0646a', scale: 1 }, barks: ['*wet lowing*', '*gurgle*'] },

    // ---------------- creatures
    gristling: { name: 'Gristling', faction: 'wild', beast: true, hp: 14, ap: 6, skills: { brawl: 55 }, weapon: 'acidbite', ai: 'hunt', aggro: true, vision: 7, xp: 60, butcher: [['tumorsac', 1]], parts: ['tumor'],
      look: { kind: 'gristling', skin: '#b0585e', scale: 1 } },
    bloattick: { name: 'Bloat-Tick', faction: 'wild', beast: true, hp: 22, ap: 5, skills: { brawl: 50, guns: 50 }, weapon: 'spit', ai: 'hunt', aggro: true, vision: 7, xp: 70, butcher: [['tickgland', 1]], armorFixed: { ac: 4, dt: 2, dr: 10 },
      look: { kind: 'tick', skin: '#6a5a72', scale: 1 } },
    grinbird: { name: 'Grinbird', faction: 'wild', beast: true, hp: 12, ap: 8, skills: { brawl: 60 }, weapon: 'peck', ai: 'hunt', aggro: true, vision: 10, xp: 40, butcher: [['teeth', 1]], armorFixed: { ac: 14, dt: 0, dr: 0 },
      look: { kind: 'bird', skin: '#4a3e3a', scale: 1 } },
    ferallump: { name: 'Feral Lump', faction: 'wild', beast: true, hp: 90, ap: 6, skills: { brawl: 65 }, weapon: 'gore', ai: 'hunt', aggro: true, vision: 6, xp: 180, butcher: [['gristle', 6]], armorFixed: { ac: 2, dt: 4, dr: 20 },
      look: { kind: 'lump', skin: '#8a3e4a', scale: 1.45 } },
    hidetaker: { name: 'Hide-Taker', faction: 'raider', hp: 30, ap: 7, skills: { guns: 55, melee: 60, throwing: 45 }, weapon: 'cleaver', inv: [['ticket', [5, 30]], ['jerky', [0, 2]]], ai: 'hunt', aggro: true, vision: 9, xp: 90, armorFixed: { ac: 4, dt: 1, dr: 10 }, flee: 0.2,
      look: H({ skin: '#b08060', coat: '#5e4a3a', pants: '#3a3028', hat: 'skullcap', hatC: '#d8ccb0', face: 'warpaint', build: 1.05 }), barks: ['Nice skin you got.', 'Hold still, I\'m measuring.'] },
    hidegunner: { name: 'Hide-Taker Gunner', faction: 'raider', hp: 28, ap: 7, skills: { guns: 60, melee: 40 }, weapon: 'pepperbox', ammo: ['r38', 10], inv: [['ticket', [5, 25]], ['r38', [0, 6]]], ai: 'hunt', aggro: true, vision: 10, xp: 100, armorFixed: { ac: 4, dt: 1, dr: 10 }, flee: 0.2,
      look: H({ skin: '#a87858', coat: '#6a4a38', pants: '#3a3028', hat: 'skullcap', hatC: '#d8ccb0', face: 'warpaint' }) },
    wynn: { name: 'Wagon Wynn', faction: 'neutral', hp: 35, ap: 7, skills: { guns: 65 }, weapon: 'scattergun', ammo: ['shell', 8], dlg: 'wynn', ai: 'stand', shop: 'wynn',
      look: H({ skin: '#c89070', hair: '#8a8a7a', coat: '#3a5a6a', hat: 'top', hatC: '#4a3a2a', face: 'beard', build: 1.1 }), barks: ['Wares! Fair-ish prices!'] },

    // ---------------- The Marrow Show
    greasepaint: { name: 'Greasepaint', faction: 'marrow', hp: 24, ap: 7, skills: { melee: 60, guns: 45 }, weapon: 'cleaver', inv: [['ticket', [5, 20]], ['greasepaint', [0, 1]]], ai: 'stand', vision: 8, xp: 90, armorFixed: { ac: 3, dt: 1, dr: 10 }, flee: 0.15, dlg: 'clown',
      look: H({ skin: '#e8e2d8', hair: '#c83a3a', coat: '#c8c0b0', pants: '#2a2a32', hat: 'none', face: 'clown', build: 1, ruff: '#d8d0c0' }), barks: ['Honk.', 'Show\'s closed.', 'You\'re not on the bill.'] },
    greasegun: { name: 'Greasepaint Shooter', faction: 'marrow', hp: 22, ap: 7, skills: { guns: 62, melee: 40 }, weapon: 'rivetgun', ammo: ['rivet', 20], inv: [['ticket', [5, 20]]], ai: 'stand', vision: 9, xp: 100, armorFixed: { ac: 3, dt: 1, dr: 10 }, flee: 0.15, dlg: 'clown',
      look: H({ skin: '#e8e2d8', hair: '#3a5ac8', coat: '#3a3a5a', pants: '#2a2a32', face: 'clown', ruff: '#d8d0c0' }), barks: ['Smile.', 'The Ringmaster is resting.'] },
    stiltwalker: { name: 'Stilt-Walker Keeper', faction: 'marrow', hp: 34, ap: 6, skills: { guns: 70, melee: 45 }, weapon: 'leverrifle', ammo: ['r44', 16], inv: [['cagekey', 1], ['ticket', [10, 30]]], ai: 'stand', vision: 12, xp: 140, armorFixed: { ac: 6, dt: 1, dr: 10 }, dlg: 'clown',
      look: H({ skin: '#e8e2d8', hair: '#2a2a2a', coat: '#5a2a5a', pants: '#2a1a2a', hat: 'top', hatC: '#2a1a2a', face: 'clown', h: 1.5, stilts: true }), barks: ['I see everything from up here.'] },
    strongman: { name: 'Bonesaw Bertha', faction: 'marrow', hp: 60, ap: 7, skills: { melee: 70, brawl: 75 }, weapon: 'bonesaw', inv: [['ticket', [20, 50]], ['officekey', 1]], ai: 'stand', vision: 7, xp: 260, armorFixed: { ac: 3, dt: 4, dr: 20 }, dlg: 'clown',
      look: H({ skin: '#d8b8a0', hair: '#2a1a12', coat: '#7a2a2a', pants: '#2a1a1a', face: 'mustache', build: 1.6, h: 1.12, leotard: true }), barks: ['I lift Lumps for breakfast.'] },
    marrowby: { name: 'Mister Marrowby', title: 'Ringmaster of Marrow', faction: 'marrow', hp: 65, ap: 8, skills: { guns: 75, melee: 60 }, weapon: 'marrowpistol', ammo: ['r38', 24], inv: [['ticket', 220], ['valvekey', 1], ['ledger', 1], ['ringcoat', 1]], ai: 'stand', vision: 9, xp: 600, armorFixed: { ac: 10, dt: 3, dr: 25 }, dlg: 'marrowby', greet: 5, extraAttack: true,
      look: H({ skin: '#e0c8b0', hair: '#1a1a1a', coat: '#7a1f2b', pants: '#1a1a1e', hat: 'top', hatC: '#141018', face: 'waxmustache', build: 1.15, graft: true }), barks: ['Ladies, gentlemen, and things in between!'] },
    moe: { name: 'Moe & Lester', title: 'The Two-Headed Tenor', faction: 'town', hp: 48, ap: 8, skills: { guns: 60, melee: 55, brawl: 60, show: 80, gab: 50 }, weapon: 'pepperbox', ammo: ['r38', 18], dlg: 'moe', ai: 'stand', companion: true,
      stats: { grit: 6, nerve: 5, wits: 6, charm: 7, reflex: 6, gut: 6 },
      look: H({ skin: '#d6ae8c', hair: '#4a3a2a', coat: '#3a4a7a', pants: '#2a2a3a', hat: 'none', face: 'plain', build: 1.2, twohead: true }), barks: ['MOE: Tenor.', 'LESTER: Baritone. Obviously.'] },
  };
  for (const [id, t] of Object.entries(GG.CREATURES)) t.id = id;
})();
