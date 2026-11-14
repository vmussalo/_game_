'use strict';
// Local map definitions. Coordinates are odd-r offset hexes [col,row].
(function () {
  const M = GG.MAPS = {};

  // ======================================================== GUTWATER
  M.gutwater = {
    id: 'gutwater', name: 'Gutwater', w: 72, h: 50, base: 'dirt', outdoor: true, ambient: 'town',
    ops: [
      { op: 'noise', t: 'scrub', thr: 0.56, scale: 5, seed: 3 },
      { op: 'noise', t: 'cracked', thr: 0.63, scale: 7, seed: 5 },
      { op: 'rect', x: 0, y: 0, w: 5, h: 50, t: 'cracked' },
      { op: 'noise', t: 'mud', thr: 0.5, scale: 4, seed: 11, area: [0, 0, 6, 50] },
      { op: 'rect', x: 51, y: 0, w: 21, h: 50, t: 'fleshgrass' },
      { op: 'noise', t: 'flesh', thr: 0.58, scale: 4, seed: 8, only: ['fleshgrass'] },
      { op: 'blob', x: 61, y: 24, r: 7, t: 'flesh', ragged: true },
      { op: 'road', pts: [[5, 24], [50, 24]], r: 1, t: 'road' },
      { op: 'road', pts: [[50, 24], [55, 24]], r: 0, t: 'dirt' },
      { op: 'road', pts: [[28, 25], [28, 49]], r: 1, t: 'road' },
      { op: 'road', pts: [[12, 26], [12, 28]], r: 0, t: 'road' },
      { op: 'road', pts: [[35, 26], [35, 28]], r: 0, t: 'road' },
      // buildings
      { op: 'room', x: 7, y: 9, w: 14, h: 12, wall: 'plank', floor: 'boards', doors: [[14, 20]] },          // The Sweetbread saloon
      { op: 'room', x: 23, y: 11, w: 8, h: 10, wall: 'adobe', floor: 'boards', doors: [[26, 20]] },        // Doc's clinic
      { op: 'room', x: 33, y: 6, w: 14, h: 15, wall: 'plank', floor: 'boards', doors: [[39, 20]] },        // Herdmother's Hall
      { op: 'rect', x: 36, y: 9, w: 8, h: 9, t: 'rug' },
      { op: 'room', x: 7, y: 29, w: 11, h: 9, wall: 'adobe', floor: 'boards', doors: [[12, 29]] },         // Saltlick's store
      { op: 'room', x: 31, y: 29, w: 10, h: 10, wall: 'adobe', floor: 'boards', doors: [[35, 29]] },       // Sheriff
      { op: 'col', x: 37, y1: 30, y2: 37, wall: 'bars', doors: [[37, 34, 'cagedoor']] },
      { op: 'room', x: 7, y: 41, w: 7, h: 6, wall: 'plank', floor: 'boards', doors: [[10, 41]] },
      { op: 'room', x: 17, y: 41, w: 7, h: 6, wall: 'plank', floor: 'boards', doors: [[20, 41]] },
      { op: 'col', x: 50, y1: 1, y2: 48, wall: 'fence', gaps: [[50, 22], [50, 23], [50, 24], [50, 25], [50, 26]] },
      // exits
      { op: 'exit', x: 5, y: 48, w: 45, h: 2, to: 'world' },
      { op: 'exit', x: 70, y: 0, w: 2, h: 50, to: 'world' },
      { op: 'exit', x: 0, y: 0, w: 1, h: 50, to: 'world' },
      { op: 'exit', x: 5, y: 0, w: 45, h: 1, to: 'world' },
    ],
    entries: { south: [28, 46], east: [68, 24], west: [2, 24], north: [27, 2] },
    objs: [
      // saloon
      ...[9, 10, 11, 12, 13, 14].map(x => ({ type: 'counter', at: [x, 13] })),
      ...[9, 11, 13].map(x => ({ type: 'shelf', at: [x, 10], name: 'Bottle Shelf', loot: x === 11 ? [['marrowshine', 1]] : [] })),
      { type: 'table', at: [17, 11] }, { type: 'table', at: [17, 17] }, { type: 'table', at: [12, 17] },
      { type: 'lamp', at: [19, 10], indoor: true },
      { type: 'sign', at: [16, 21], name: 'Sign: THE SWEETBREAD', desc: '"THE SWEETBREAD — DRINKS — NO CUTTING AT THE BAR".' },
      // doc
      { type: 'bed', at: [24, 13] }, { type: 'bed', at: [24, 16] },
      { type: 'shelf', at: [29, 12], name: 'Medicine Shelf', loot: [['suture', 2], ['purge', 1]], locked: 30, owner: 'town' },
      { type: 'desk', at: [29, 17], loot: [['tickgland', 1]] },
      { type: 'lamp', at: [29, 19], indoor: true },
      // hall
      ...[37, 38, 39, 40, 41, 42].map(x => ({ type: 'table', at: [x, 13] })),
      { type: 'horns', at: [40, 7], name: 'Horn Rack', desc: 'Horns cut from Old Mother over forty years. Some of them are still growing.' },
      { type: 'lamp', at: [34, 7], indoor: true }, { type: 'lamp', at: [45, 7], indoor: true },
      { type: 'desk', at: [44, 17], name: "Agnes's Desk", loot: [['ticket', 40], ['pocketwatch', 1]], locked: 40, owner: 'town' },
      // store
      ...[8, 9, 10, 11, 12, 13, 14, 15].map(x => ({ type: 'counter', at: [x, 34] })),
      ...[9, 11, 14, 16].map(x => ({ type: 'shelf', at: [x, 36] })),
      { type: 'crate', at: [16, 30], loot: [['jerky', 3]], locked: 20, owner: 'town' },
      { type: 'sign', at: [10, 28], name: "Sign: SALTLICK'S", desc: '"SALTLICK\'S PROVISIONS — WE BUY GRISTLE".' },
      // sheriff
      { type: 'desk', at: [33, 32], loot: [['r44', 6]] },
      { type: 'locker', at: [32, 37], name: 'Gun Locker', loot: [['r44', 12], ['suture', 1], ['dynamite', 1]], locked: 50, owner: 'town' },
      { type: 'bed', at: [39, 33] },
      { type: 'sign', at: [33, 27], name: 'Bounty Board', script: 'bountyBoard', desc: 'Notices nailed over notices.' },
      // ruby's camp
      { type: 'tent', at: [45, 35], name: "Ruby's Rarities", desc: 'A patched striped tent. "RUBY\'S RARITIES — MARVELS OF THE BLOOM — (TEMPORARILY ONE MARVEL SHORT)".' },
      { type: 'wagon', at: [41, 38], name: 'Show Wagon', desc: 'Painted with a two-headed man singing to the moon. The moon is singing back.' },
      { type: 'poster', at: [40, 31], name: 'Poster', desc: '"MOE & LESTER — THE TWO-HEADED TENOR — HARMONY LIKE YOU\'VE NEVER HEARD (FROM ONE THROAT)".' },
      { type: 'campfire', at: [44, 40] },
      // street furniture
      { type: 'lamp', at: [10, 22] }, { type: 'lamp', at: [22, 22] }, { type: 'lamp', at: [32, 22] }, { type: 'lamp', at: [46, 22] }, { type: 'lamp', at: [26, 28] },
      { type: 'trough', at: [30, 21] }, { type: 'barrel', at: [21, 21], loot: [] }, { type: 'barrel', at: [6, 27], loot: [['jerky', 1]] },
      { type: 'tower', at: [21, 33], name: 'Water Tower', desc: 'Dry since spring. Someone painted "WE\'RE FINE" on it.' },
      { type: 'sign', at: [26, 47], name: 'Town Sign', desc: '"GUTWATER — POP. 61 — NO GRAZING ON THE MOTHER".' },
      // homes
      { type: 'bed', at: [8, 43] }, { type: 'locker', at: [12, 45], loot: [['ticket', 12], ['sweetgristle', 1]], locked: 25, owner: 'town' },
      { type: 'bed', at: [22, 43] }, { type: 'locker', at: [18, 45], loot: [['skinknife', 1], ['jerky', 2]], owner: 'town' },
      // pasture
      { id: 'mother', type: 'mother', at: [61, 24], script: 'mother', name: 'Old Mother', desc: 'The Mother Herd of Gutwater: a hill of living meat, forty years of cutting and regrowing. Her folds are greyer than they should be.' },
      { id: 'nest1', type: 'nest', at: [55, 11], script: 'nest' }, { id: 'nest2', type: 'nest', at: [67, 40], script: 'nest' }, { id: 'nest3', type: 'nest', at: [55, 39], script: 'nest' },
      { type: 'trough', at: [53, 20] }, { type: 'trough', at: [53, 29] },
      { type: 'sign', at: [52, 27], name: 'Pasture Sign', desc: '"CUTTING BY LICENCE ONLY — HERDMOTHER\'S ORDER".' },
    ],
    scatter: [
      ['stalk', 12, [52, 1, 18, 47], ['fleshgrass', 'flesh'], 31],
      ['bones', 14, [1, 1, 69, 47], ['dirt', 'scrub', 'cracked', 'fleshgrass'], 32],
      ['rock', 9, [1, 1, 48, 47], ['scrub', 'cracked', 'mud'], 33],
    ],
    npcs: [
      { id: 'agnes', tpl: 'agnes', at: [39, 10] },
      { id: 'purslane', tpl: 'purslane', at: [27, 14] },
      { id: 'ruby', tpl: 'ruby', at: [42, 32] },
      { id: 'saltlick', tpl: 'saltlick', at: [12, 35] },
      { id: 'harrow', tpl: 'harrow', at: [34, 34] },
      { id: 'deputy', tpl: 'deputy', at: [37, 27] },
      { id: 'tallow', tpl: 'tallow', at: [23, 30] },
      { id: 'dellah', tpl: 'dellah', at: [16, 14] },
      { id: 'gummy', tpl: 'gummy', at: [10, 16] },
      { tpl: 'rancher', at: [20, 26] }, { tpl: 'rancherf', at: [31, 23] }, { tpl: 'rancher', at: [44, 26] }, { tpl: 'rancherf', at: [8, 25] },
      { tpl: 'lumper', at: [57, 17] }, { tpl: 'lumper', at: [65, 15] }, { tpl: 'lumper', at: [66, 31] }, { tpl: 'lumper', at: [56, 31] },
    ],
  };

  // ======================================================== THE SUMP (Feedworks Station 9)
  M.sump = {
    id: 'sump', name: 'The Sump — Feedworks Station 9', w: 62, h: 50, base: 'cracked', outdoor: true, ambient: 'sump',
    ops: [
      { op: 'noise', t: 'fleshgrass', thr: 0.55, scale: 6, seed: 21 },
      { op: 'noise', t: 'flesh', thr: 0.66, scale: 4, seed: 22, only: ['fleshgrass'] },
      { op: 'noise', t: 'mud', thr: 0.45, scale: 4, seed: 23, area: [53, 20, 9, 30] },
      { op: 'road', pts: [[31, 31], [31, 49]], r: 1, t: 'gravel' },
      { op: 'road', pts: [[54, 26], [57, 31], [57, 49]], r: 1, t: 'mud' },
      { op: 'room', x: 8, y: 4, w: 45, h: 27, wall: 'rust', floor: 'metal', doors: [[31, 30], [52, 26, 'grate', 30, null, 'grate']] },
      { op: 'row', y: 18, x1: 8, x2: 24, wall: 'rust', doors: [[16, 18]] },
      { op: 'col', x: 24, y1: 4, y2: 30, wall: 'rust', doors: [[24, 11], [24, 24]] },
      { op: 'col', x: 38, y1: 4, y2: 30, wall: 'rust', doors: [[38, 9], [38, 24]] },
      { op: 'row', y: 19, x1: 24, x2: 38, wall: 'rust', doors: [[31, 19]] },
      { op: 'row', y: 14, x1: 38, x2: 52, wall: 'rust', doors: [[45, 14, 'door', 60, 'officekey', 'officedoor']] },
      { op: 'room', x: 11, y: 7, w: 5, h: 5, wall: 'bars', doors: [[13, 11, 'cagedoor', 40, 'cagekey', 'moecage']] },
      { op: 'room', x: 18, y: 7, w: 5, h: 5, wall: 'bars', doors: [[20, 11, 'cagedoor', 40, 'cagekey']] },
      { op: 'rect', x: 27, y: 6, w: 9, h: 4, t: 'stage' },
      { op: 'rect', x: 40, y: 6, w: 11, h: 7, t: 'rug' },
      { op: 'exit', x: 0, y: 48, w: 62, h: 2, to: 'world' },
      { op: 'exit', x: 61, y: 20, w: 1, h: 30, to: 'world' },
      { op: 'exit', x: 0, y: 32, w: 1, h: 18, to: 'world' },
    ],
    entries: { front: [31, 46], culvert: [57, 45] },
    objs: [
      // cages
      { type: 'corpse', at: [20, 9], name: 'Remains of the Amazing Antonio', desc: 'A performer with too many joints. Drained grey. A card in his pocket: "THE AMAZING ANTONIO — HE BENDS!"', loot: [['pepperbox', 1], ['r38', 10], ['poster', 1]] },
      { type: 'barrel', at: [21, 15], loot: [['greasepaint', 1]] }, { type: 'bones', at: [10, 15] },
      { type: 'lamp', at: [9, 5], indoor: true },
      // barracks
      { type: 'bed', at: [10, 21] }, { type: 'bed', at: [10, 24] }, { type: 'bed', at: [10, 27] }, { type: 'bed', at: [14, 21] }, { type: 'bed', at: [14, 28] },
      { type: 'locker', at: [12, 21], loot: [['ticket', 25], ['jerky', 2], ['shell', 6]] },
      { type: 'locker', at: [12, 28], loot: [['scattergun', 1], ['shell', 4], ['marrowshine', 1]], locked: 35 },
      { type: 'table', at: [20, 24] }, { type: 'lamp', at: [22, 20], indoor: true },
      // theatre
      ...[27, 28, 29, 30, 32, 33, 34, 35].flatMap(x => [{ type: 'bench', at: [x, 13] }, { type: 'bench', at: [x, 16] }]),
      { type: 'lamp', at: [26, 6], indoor: true, name: 'Footlight' }, { type: 'lamp', at: [36, 6], indoor: true, name: 'Footlight' },
      { type: 'poster', at: [31, 5], name: 'Banner', desc: '"THE MARROW SHOW — FEEL THE GOODNESS — BY APPOINTMENT TO THE GRAND CALLIOPE"' },
      // entry hall
      { type: 'crate', at: [26, 28], loot: [['r38', 12], ['rivet', 10]] }, { type: 'crate', at: [36, 28], loot: [['suture', 1], ['biljar', 2]] },
      { type: 'poster', at: [28, 20], name: 'Notice', desc: '"STAFF: THE GRATE IN THE PUMP HALL IS RUSTED. DO NOT LEAN ON IT. — MGMT"' },
      // office
      { type: 'desk', at: [44, 8], name: "Marrowby's Desk", loot: [['ticket', 40], ['poster', 1], ['smellsalts', 1]] },
      { id: 'safe', type: 'safe', at: [50, 6], loot: [['ticket', 300], ['valvekey', 1], ['dynamite', 2], ['suture', 2]], locked: 60 },
      { type: 'shelf', at: [40, 6], loot: [['marrowshine', 2]] }, { type: 'lamp', at: [50, 12], indoor: true },
      // pump hall
      { id: 'pump', type: 'pump', at: [45, 21], script: 'pump', desc: 'A brass-and-iron pump the size of a wagon, thumping like a heart. Thick hoses run down into the floor, east, towards Gutwater.' },
      ...[16, 19, 25, 28].map(y => ({ type: 'pipe', at: [40, y] })), ...[16, 19, 23, 28].map(y => ({ type: 'pipe', at: [50, y] })),
      { type: 'barrel', at: [49, 28], loot: [['biljar', 1]] }, { type: 'lamp', at: [41, 15], indoor: true },
      // yard
      { type: 'wagon', at: [14, 37], name: 'Marrow Show Wagon', desc: '"FEEL THE GOODNESS!" in peeling red.' }, { type: 'wagon', at: [20, 43], name: 'Tank Wagon', desc: 'A sealed tank wagon. It sloshes. Something inside knocks back.' },
      { type: 'wagon', at: [44, 40], name: 'Tank Wagon', desc: 'Labelled "MARROW — GRADE A — PROPERTY OF THE GRAND CALLIOPE".' }, { type: 'wagon', at: [48, 34], name: 'Prop Wagon', desc: 'Full of giant mallets and smaller, sharper mallets.' },
      { type: 'tent', at: [38, 43], name: 'Mess Tent' }, { type: 'campfire', at: [26, 40] },
      { type: 'lamp', at: [28, 32] }, { type: 'lamp', at: [34, 32] },
      { type: 'sign', at: [34, 35], name: 'Sign', desc: '"ABUNDANCE BIOLOGICS — FEEDWORKS STATION 9 — FEEDING TOMORROW, TODAY". Below, in greasepaint: "THE MARROW SHOW — CLOSED FOR PRIVATE PERFORMANCE".' },
    ],
    scatter: [
      ['stalk', 10, [1, 32, 50, 15], ['fleshgrass', 'flesh'], 41],
      ['rock', 10, [1, 32, 60, 15], ['cracked', 'fleshgrass', 'mud'], 42],
      ['bones', 12, [1, 31, 60, 18], null, 43],
      ['stalk', 5, [1, 1, 6, 30], ['fleshgrass', 'flesh'], 44],
    ],
    npcs: [
      { id: 'gate1', tpl: 'greasepaint', at: [29, 33], gate: true, greet: 5, dlgId: 'gate', name: 'Gate Clown' },
      { id: 'gate2', tpl: 'greasegun', at: [33, 33], gate: true, dlgId: 'gate', name: 'Gate Clown' },
      { id: 'keeper', tpl: 'stiltwalker', at: [17, 14] },
      { id: 'sleeper1', tpl: 'greasepaint', at: [17, 22], sleep: true },
      { id: 'sleeper2', tpl: 'greasegun', at: [18, 27], sleep: true },
      { id: 'hall1', tpl: 'greasegun', at: [27, 22] }, { id: 'hall2', tpl: 'greasepaint', at: [35, 22] },
      { id: 'mechanic', tpl: 'greasepaint', at: [43, 27], name: 'Greasepaint Mechanic' },
      { id: 'bertha', tpl: 'strongman', at: [43, 10] },
      { id: 'marrowby', tpl: 'marrowby', at: [31, 8] },
      { id: 'moe', tpl: 'moe', at: [13, 9], caged: true },
    ],
  };

  // ======================================================== HOLLOW PIKE CROSSING
  M.crossing = {
    id: 'crossing', name: 'Hollow Pike Crossing', w: 46, h: 36, base: 'scrub', outdoor: true, ambient: 'plains',
    ops: [
      { op: 'noise', t: 'dirt', thr: 0.5, scale: 5, seed: 51 },
      { op: 'road', pts: [[0, 6], [16, 14], [22, 18], [30, 24], [45, 30]], r: 3, t: 'cracked' },
      { op: 'noise', t: 'mud', thr: 0.55, scale: 3, seed: 52, only: ['cracked'] },
      { op: 'road', pts: [[22, 0], [22, 35]], r: 1, t: 'road' },
      { op: 'exit', x: 0, y: 34, w: 46, h: 2, to: 'world' }, { op: 'exit', x: 0, y: 0, w: 46, h: 1, to: 'world' },
      { op: 'exit', x: 0, y: 0, w: 1, h: 36, to: 'world' }, { op: 'exit', x: 45, y: 0, w: 1, h: 36, to: 'world' },
    ],
    entries: { south: [22, 32] },
    objs: [
      { type: 'wagon', at: [26, 26], name: "Wynn's Wagon", desc: 'Pots, pans, guns, and a cage of something that purrs.' },
      { type: 'campfire', at: [25, 29] },
      { type: 'sign', at: [20, 20], name: 'Pike', desc: 'A tall pike driven into the riverbed, hung with old cow skulls. From before the Bloom. Someone keeps polishing them.' },
      { type: 'rock', at: [17, 16] }, { type: 'rock', at: [27, 21] }, { type: 'bones', at: [14, 13] },
    ],
    scatter: [['rock', 10, null, ['scrub', 'dirt'], 61], ['stalk', 4, null, ['scrub'], 62], ['bones', 6, null, null, 63]],
    npcs: [{ id: 'wynn', tpl: 'wynn', at: [24, 27] }],
  };

  // ======================================================== random encounters
  GG.ENCOUNTERS = {
    hidetakers: { name: 'Hide-Takers', text: 'Figures in patchwork hide, spreading out to flank you.', spawn: [['hidetaker', 1, 3], ['hidegunner', 0, 1]], dist: [7, 10], minLevel: 2 },
    grinbirds: { name: 'Grinbirds', text: 'A flock of Grinbirds wheels overhead, all teeth and no song.', spawn: [['grinbird', 2, 5]], dist: [6, 9] },
    gristlings: { name: 'Gristling Pack', text: 'The ground heaves. Gristlings crawl out of a split in the Bloom.', spawn: [['gristling', 2, 5]], dist: [5, 8] },
    ticks: { name: 'Bloat-Ticks', text: 'Bloat-Ticks the size of dogs, swollen and sloshing.', spawn: [['bloattick', 1, 3]], dist: [6, 9] },
    feral: { name: 'Feral Lump', text: 'A Lump gone wild: horns, too many legs, and very bad manners.', spawn: [['ferallump', 1, 1], ['gristling', 0, 2]], dist: [8, 10], minLevel: 3 },
    herd: { name: 'Wild Herd', text: 'A herd of untended Lumps grazes on the Bloom. Free meat, if you are not squeamish.', spawn: [['lumper', 3, 5]], dist: [4, 8], peaceful: true },
    peddler: { name: 'Wagon Wynn', text: 'A trader\'s wagon, painted bright, pulled by two weary Lumps.', spawn: [['wynn', 1, 1]], dist: [3, 4], peaceful: true },
    deadcarny: { name: 'Dead Carny', text: 'A dead carnival barker lies by a broken cart, still smiling. Something took the eyes; nothing took the bag.', spawn: [], dist: [3, 4], peaceful: true, loot: [['pepperbox', 1], ['r38', 14], ['poster', 1], ['ticket', 35]], once: true },
  };
  GG.ENC_TABLE = {
    plains: [['hidetakers', 3], ['grinbirds', 3], ['ticks', 2], ['herd', 2], ['peddler', 1], ['deadcarny', 1]],
    bloom: [['gristlings', 4], ['ticks', 3], ['feral', 2], ['herd', 1]],
    badlands: [['hidetakers', 4], ['grinbirds', 3], ['feral', 1], ['deadcarny', 1]],
  };

  GG.makeEncounterMap = (encId, terrain, seed) => {
    const E = GG.ENCOUNTERS[encId];
    const base = terrain === 'bloom' ? 'fleshgrass' : terrain === 'badlands' ? 'cracked' : 'scrub';
    const def = {
      id: 'encounter', name: E.name, w: 40, h: 34, base, outdoor: true, ambient: terrain === 'bloom' ? 'sump' : 'plains', temp: true, seed,
      ops: [
        { op: 'noise', t: terrain === 'bloom' ? 'flesh' : 'dirt', thr: 0.55, scale: 5, seed: seed % 997 },
        { op: 'noise', t: terrain === 'badlands' ? 'gravel' : 'cracked', thr: 0.64, scale: 6, seed: (seed % 991) + 3 },
        { op: 'exit', x: 0, y: 0, w: 40, h: 1, to: 'world' }, { op: 'exit', x: 0, y: 33, w: 40, h: 1, to: 'world' },
        { op: 'exit', x: 0, y: 0, w: 1, h: 34, to: 'world' }, { op: 'exit', x: 39, y: 0, w: 1, h: 34, to: 'world' },
      ],
      entries: { center: [20, 17] },
      objs: [],
      scatter: [
        [terrain === 'bloom' ? 'stalk' : 'rock', 14, [2, 2, 36, 30], null, seed % 89],
        ['bones', 8, [2, 2, 36, 30], null, (seed % 83) + 1],
        [terrain === 'bloom' ? 'rock' : 'stalk', 4, [2, 2, 36, 30], null, (seed % 79) + 2],
      ],
      npcs: [],
    };
    if (encId === 'peddler') def.objs.push({ type: 'wagon', at: [23, 15], name: "Wynn's Wagon" });
    if (E.loot) def.objs.push({ type: 'corpse', at: [22, 16], name: 'Dead Carny', loot: E.loot.map(l => l.slice()) });
    return def;
  };
})();
