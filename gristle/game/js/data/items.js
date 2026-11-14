'use strict';
// Item catalogue. type: weapon | armor | ammo | use | misc | quest | money
(function () {
  const I = GG.ITEMS = {
    // ---- money
    ticket: { name: 'Ticket', type: 'money', weight: 0, value: 1, desc: 'A carnival ticket, the currency of the Rind. "ADMIT ONE". Nobody remembers to what.' },

    // ---- weapons: skill, dmg [min,max], range, ap, ammo, mag
    fists: { name: 'Fists', type: 'weapon', skill: 'brawl', dmg: [1, 3], range: 1, ap: 3, weight: 0, value: 0, nodrop: true, desc: 'The ones you were born with.' },
    knuckles: { name: 'Brass Knuckles', type: 'weapon', skill: 'brawl', dmg: [3, 7], range: 1, ap: 3, weight: 1, value: 60, desc: 'Engraved: "ALL THE FUN OF THE FAIR".' },
    skinknife: { name: 'Skinning Knife', type: 'weapon', skill: 'melee', dmg: [3, 8], range: 1, ap: 3, weight: 1, value: 50, desc: 'Thin, sharp, mostly for Lump-hide.' },
    cleaver: { name: 'Cleaver', type: 'weapon', skill: 'melee', dmg: [5, 12], range: 1, ap: 4, weight: 3, value: 90, desc: 'Every kitchen in the Rind has one. Every brawl too.' },
    meathook: { name: 'Meat Hook', type: 'weapon', skill: 'melee', dmg: [4, 13], range: 1, ap: 4, weight: 3, value: 110, crit: 10, desc: 'Hooks are for hanging. People forget that.' },
    bonesaw: { name: 'Bonesaw', type: 'weapon', skill: 'melee', dmg: [8, 18], range: 1, ap: 5, weight: 6, value: 220, desc: 'Surgical, technically. Two-handed, practically.' },
    pepperbox: { name: 'Pepperbox Revolver', type: 'weapon', skill: 'guns', dmg: [5, 12], range: 10, ap: 3, ammo: 'r38', mag: 6, weight: 3, value: 200, desc: 'Six barrels, one opinion.' },
    rivetgun: { name: 'Rivet Pistol', type: 'weapon', skill: 'guns', dmg: [7, 13], range: 8, ap: 4, ammo: 'rivet', mag: 10, weight: 4, value: 260, desc: 'An Abundance construction tool. Construction was a long time ago.' },
    leverrifle: { name: 'Lever Rifle', type: 'weapon', skill: 'guns', dmg: [10, 20], range: 22, ap: 5, ammo: 'r44', mag: 8, weight: 7, value: 420, desc: 'Long, honest, loud.' },
    scattergun: { name: 'Scattergun', type: 'weapon', skill: 'guns', dmg: [12, 26], range: 5, ap: 5, ammo: 'shell', mag: 2, weight: 7, value: 380, falloff: 4, desc: 'Brutal up close. Short-tempered at range.' },
    marrowpistol: { name: "Marrowby's Dueller", type: 'weapon', skill: 'guns', dmg: [8, 15], range: 14, ap: 4, ammo: 'r38', mag: 6, weight: 3, value: 600, crit: 10, desc: 'Gold-chased, ivory grip. The ivory is not ivory.' },
    harrowrifle: { name: "Harrow's Long Rifle", type: 'weapon', skill: 'guns', dmg: [14, 24], range: 25, ap: 5, ammo: 'r44', mag: 6, weight: 8, value: 650, crit: 5, desc: 'The sheriff kept it cleaner than his conscience.' },
    biljar: { name: 'Bile Jar', type: 'weapon', skill: 'throwing', dmg: [8, 16], range: 7, ap: 4, thrown: true, splash: 1, dtype: 'acid', weight: 1, value: 45, desc: 'A sealed jar of Lump bile. Do not shake. Definitely do not open.' },
    dynamite: { name: 'Dynamite', type: 'weapon', skill: 'throwing', dmg: [18, 35], range: 7, ap: 4, thrown: true, splash: 2, dtype: 'fire', weight: 1, value: 90, desc: 'Old mining stock. Sweats a bit.' },
    // creature "weapons"
    bite: { name: 'Bite', type: 'weapon', skill: 'brawl', dmg: [2, 5], range: 1, ap: 3, nodrop: true, natural: true },
    acidbite: { name: 'Acid Bite', type: 'weapon', skill: 'brawl', dmg: [3, 7], range: 1, ap: 3, dtype: 'acid', nodrop: true, natural: true },
    gore: { name: 'Gore', type: 'weapon', skill: 'brawl', dmg: [8, 16], range: 1, ap: 4, nodrop: true, natural: true },
    peck: { name: 'Beak', type: 'weapon', skill: 'brawl', dmg: [2, 6], range: 1, ap: 3, nodrop: true, natural: true },
    spit: { name: 'Bile Spit', type: 'weapon', skill: 'guns', dmg: [4, 9], range: 6, ap: 4, dtype: 'acid', nodrop: true, natural: true },

    // ---- ammo
    r38: { name: '.38 Rounds', type: 'ammo', weight: 0.05, value: 3, desc: 'Hand-loaded in Tallowmarket. Mostly lead.' },
    r44: { name: '.44 Rifle Rounds', type: 'ammo', weight: 0.08, value: 5, desc: 'Long brass cartridges.' },
    shell: { name: 'Scatter Shells', type: 'ammo', weight: 0.1, value: 6, desc: 'Nails, glass and good intentions.' },
    rivet: { name: 'Rivets', type: 'ammo', weight: 0.05, value: 3, desc: 'Abundance standard, part no. 9-114.' },

    // ---- armour
    duster: { name: 'Rawhide Duster', type: 'armor', ac: 5, dt: 1, dr: 15, weight: 6, value: 150, look: '#6b4a30', desc: 'Lump-hide, tanned with smoke. Still faintly warm.' },
    boneplate: { name: 'Bone-Plated Vest', type: 'armor', ac: 8, dt: 3, dr: 25, weight: 12, value: 380, look: '#cbbf9e', desc: 'Ribs sewn over leather. Someone else\'s ribs.' },
    ringcoat: { name: "Ringmaster's Coat", type: 'armor', ac: 12, dt: 3, dr: 30, weight: 8, value: 700, look: '#7a1f2b', desc: 'Scarlet, gold-frogged, with plates sewn into the lining. Smells of greasepaint.' },
    hidevest: { name: 'Hide-Taker Vest', type: 'armor', ac: 6, dt: 2, dr: 20, weight: 9, value: 220, look: '#5e4a3a', desc: 'Patchwork hide. Some of the patches have tattoos.' },

    // ---- consumables
    suture: { name: 'Suture Paste', type: 'use', heal: [14, 22], ap: 2, weight: 0.5, value: 40, desc: 'Grey paste in a tin. Closes wounds by growing over them. Itches for a week.' },
    jerky: { name: 'Lump Jerky', type: 'use', heal: [3, 6], food: true, ap: 2, weight: 0.3, value: 6, desc: 'Chewy. Regrows a little if you leave it in the sun.' },
    sweetgristle: { name: 'Sugar Gristle', type: 'use', heal: [1, 3], food: true, ap: 2, weight: 0.2, value: 10, desc: 'Candied cartilage on a stick. Children love it. Dentists loved it.' },
    marrowshine: { name: 'Marrowshine', type: 'use', ap: 2, weight: 1, value: 25, drink: true, buff: { name: 'Marrowshine', mod: { nerve: 2, wits: -2 }, dur: 120 }, desc: 'Distilled from marrow. Tastes like a bonfire in a butcher shop.' },
    purge: { name: 'Purge Tonic', type: 'use', ap: 2, weight: 0.5, value: 35, cure: 'poison', heal: [2, 4], desc: 'Makes you sick so you stop being sick. Usually works.' },
    smellsalts: { name: 'Smelling Salts', type: 'use', ap: 1, weight: 0.1, value: 30, buff: { name: 'Salts', mod: { reflex: 1 }, ap: 1, dur: 30 }, desc: 'One sniff and you can hear colours.' },

    // ---- loot / trade goods
    gristle: { name: 'Prime Gristle', type: 'misc', weight: 1, value: 12, desc: 'A clean-cut chunk of Bloom meat. Sells everywhere.' },
    tumorsac: { name: 'Tumour Sac', type: 'misc', weight: 0.5, value: 15, desc: 'Cut from a Gristling. It is still deciding whether to be a Gristling.' },
    teeth: { name: 'Jar of Teeth', type: 'misc', weight: 1, value: 20, desc: 'Sawbones pay for teeth. Do not ask what for.' },
    tickgland: { name: 'Bloat-Tick Gland', type: 'misc', weight: 0.3, value: 18, desc: 'Squishy. Used in Suture Paste.' },
    greasepaint: { name: 'Greasepaint Tin', type: 'misc', weight: 0.2, value: 15, desc: 'White, red and black. The Marrow Show buys it by the barrel.' },
    poster: { name: 'Faded Poster', type: 'misc', weight: 0.1, value: 5, desc: '"THE GRAND CALLIOPE — COMING THIS SUMMER — EVERY SUMMER".' },
    pocketwatch: { name: 'Stopped Pocket Watch', type: 'misc', weight: 0.2, value: 45, desc: 'Stopped at 4:12. Every watch in the Rind seems to be.' },
    rabbitfoot: { name: "Ruby's Lucky Foot", type: 'misc', weight: 0.1, value: 80, carryBuff: { crit: 5 }, desc: 'Not a rabbit\'s. Carrying it gives +5% critical chance.' },

    // ---- quest items
    ledger: { name: 'Marrow Ledger', type: 'quest', weight: 0.5, value: 0, desc: 'Columns of figures in purple ink. Litres drawn, tickets paid, and a buyer: "the Grand Calliope, per Advance Agent". A local "facilitator" is listed as C.H.' },
    valvekey: { name: 'Valve Key', type: 'quest', weight: 0.5, value: 0, desc: 'A heavy brass key shaped like a clown\'s nose. Fits the Feedworks pump.' },
    cagekey: { name: 'Cage Key', type: 'quest', weight: 0.1, value: 0, desc: 'A small key on a ring of tiny bells.' },
    officekey: { name: "Marrowby's Office Key", type: 'quest', weight: 0.1, value: 0, desc: 'Monogrammed "M". Also smells of greasepaint.' },
    sample: { name: 'Analysed Sample', type: 'quest', weight: 0.2, value: 0, desc: 'Doc Purslane\'s slide. Hollow bone, needle marks. Old Mother is being drained.' },
    coupling: { name: 'Pipe Coupling', type: 'quest', weight: 2, value: 0, desc: 'Brass, freshly greased, stamped "ABUNDANCE FEEDWORKS 9". It came out of Old Mother.' },
  };
  for (const [id, it] of Object.entries(I)) it.id = id;

  GG.itemWeight = (inv) => inv.reduce((a, s) => a + (I[s.id] ? I[s.id].weight * s.n : 0), 0);
})();
