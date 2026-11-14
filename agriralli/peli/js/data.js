/* AgriRalli – pelin luvut: koneet, aseet, hinnat, radat ja palkinnot.
   Kaikki tasapainotus on tässä tiedostossa. Nopeudet ovat pikseleitä sekunnissa (1 px ≈ 8 cm). */
(function () {
  'use strict';
  const AR = window.AR;

  // len/wid = koko pikseleinä, spd = huippunopeus, acc = kiihtyvyys, grip = sivupito, turn = kääntönopeus rad/s,
  // mass = massa (törmäykset), hp = kunto, ram = keulan rammauskerroin, side = kylkikontaktin kerroin
  AR.VEH = [
    { id: 'leikkuri', price: 0, len: 30, wid: 22, spd: 250, acc: 260, grip: 7.0, turn: 3.5, mass: 1.0, hp: 60, ram: 1.0, side: 1.3 },
    { id: 'monkija', price: 2600, len: 34, wid: 22, spd: 282, acc: 290, grip: 6.5, turn: 3.4, mass: 1.2, hp: 70, ram: 1.0, side: 1.0 },
    { id: 'pikkutraktori', price: 8500, len: 40, wid: 26, spd: 312, acc: 290, grip: 7.5, turn: 3.1, mass: 2.0, hp: 100, ram: 1.25, side: 1.0 },
    { id: 'kurottaja', price: 16000, len: 46, wid: 26, spd: 342, acc: 305, grip: 7.2, turn: 3.0, mass: 2.4, hp: 120, ram: 2.1, side: 1.0, forks: 14 },
    { id: 'linkku', price: 27000, len: 56, wid: 30, spd: 372, acc: 320, grip: 8.0, turn: 2.8, mass: 3.4, hp: 165, ram: 1.5, side: 1.0, articulated: true },
    { id: 'puimuri', price: 41000, len: 54, wid: 40, spd: 398, acc: 330, grip: 8.0, turn: 2.75, mass: 4.0, hp: 215, ram: 2.5, side: 1.0 },
    { id: 'kaivinkone', price: 62000, len: 52, wid: 32, spd: 425, acc: 345, grip: 9.0, turn: 2.7, mass: 4.6, hp: 260, ram: 1.4, side: 1.0, tracked: true, kauha: true }
  ];
  AR.vehIndex = id => AR.VEH.findIndex(v => v.id === id);

  // Aseet tasoittain (taso 0 = ei asetta). dmg = osuman vahinko, rate = laukausta/s, n = hauleja/laukaus
  AR.GUNS = [
    null,
    { dmg: 1.35, rate: 6, n: 1, spread: 0.04, spd: 900, col: '#ffd27a', r: 2 },
    { dmg: 1.5, rate: 4, n: 4, spread: 0.16, spd: 850, col: '#ffb060', r: 2 },
    { dmg: 3.2, rate: 9, n: 1, spread: 0.03, spd: 1000, col: '#a8ffff', r: 2.5 },
    { dmg: 3.0, rate: 15, n: 1, spread: 0.07, spd: 1050, col: '#ffff80', r: 2 },
    { dmg: 7.0, rate: 7, n: 1, spread: 0.02, spd: 1200, col: '#d080ff', r: 3.5 }
  ];

  // Viritykset: hinta = base × (1 + kone × 0,45) × taso^1,15
  AR.UPG = {
    engine: { max: 5, base: 300 },
    tires: { max: 5, base: 220 },
    armor: { max: 5, base: 260 },
    gun: { max: 5, base: 380 },
    ram: { max: 3, base: 450 }
  };
  AR.UPG_KEYS = ['engine', 'tires', 'armor', 'gun', 'ram'];
  AR.upgPrice = (vi, key, level) => Math.round(AR.UPG[key].base * (1 + vi * 0.45) * Math.pow(level, 1.15) / 10) * 10;

  // Kulutustarvikkeet
  AR.CONS = {
    ammo: { add: 40, price: vi => 60 + vi * 20, max: vi => 160 + vi * 30 },
    mines: { add: 2, price: vi => 150 + vi * 30, max: () => 10 },
    turbo: { add: 2, price: vi => 120 + vi * 25, max: () => 10 }
  };
  AR.repairPerHp = vi => 3 + vi * 1.0;

  // Lopulliset ajo-ominaisuudet koneesta ja virityksistä
  AR.buildStats = (vi, up, body) => {
    const V = AR.VEH[vi];
    const e = up.engine | 0, t = up.tires | 0, a = up.armor | 0, g = up.gun | 0, r = up.ram | 0;
    const b = body || {};
    const bust = b.bust | 0, hips = b.hips | 0, tone = b.tone | 0, outfit = b.outfit | 0;
    const baseGrip = V.grip * (1 + 0.1 * t);
    const baseTurn = V.turn * (1 + 0.05 * t);
    const gripMult = 1 + (hips > 1 ? (hips - 1) * 0.025 : 0);
    const turnMult = 1 + (tone > 1 ? (tone - 1) * 0.02 : 0);
    const cashBonus = (bust > 1 ? (bust - 1) * 0.08 : 0);
    const dmgResist = (tone > 1 ? (tone - 1) * 0.04 : 0);
    return {
      vi, V, len: V.len, wid: V.wid, tracked: !!V.tracked, articulated: !!V.articulated, kauha: !!V.kauha,
      spd: V.spd * (1 + 0.085 * e), acc: V.acc * (1 + 0.12 * e), brake: 620,
      grip: baseGrip * gripMult, turn: baseTurn * turnMult, off: 0.55 + 0.06 * t,
      mass: V.mass * (1 + 0.05 * a), hp: Math.round(V.hp * (1 + 0.3 * a)),
      ram: V.ram + 0.45 * r, ramLv: r, armorLv: a, side: V.side, gun: AR.GUNS[g], gunLv: g,
      ammoMax: AR.CONS.ammo.max(vi),
      body: b, bust, hips, tone, outfit, cashBonus, dmgResist
    };
  };

  // Hahmon rungon kustomointi (Body Frame Tuning)
  AR.BODY_MODS = {
    bust: { max: 5, base: 350 },
    hips: { max: 5, base: 300 },
    tone: { max: 5, base: 280 },
    outfit: { max: 4, base: 450 }
  };
  AR.BODY_KEYS = ['bust', 'hips', 'tone', 'outfit'];
  AR.bodyPrice = (key, level) => Math.round(AR.BODY_MODS[key].base * Math.pow(level, 1.25) / 10) * 10;

  // Beach Mod Bikini Edition avausehdot
  AR.BEACH_MOD = {
    pointsReq: 80,
    racesReq: 4,
    playTimeReq: 300
  };

  // Kisasarjat: palkinnot sijoittain, tappopalkkio, sarjapisteet, tavoitematka (px), rahapussin arvo
  AR.DIFF = [
    { prize: [1200, 700, 400, 150], kill: 300, pts: [3, 2, 1, 0], dist: 14000, cash: 80, sabotage: 300 },
    { prize: [3000, 1600, 800, 250], kill: 700, pts: [6, 4, 2, 0], dist: 19000, cash: 180, sabotage: 800 },
    { prize: [8000, 4000, 1600, 400], kill: 1500, pts: [12, 8, 4, 1], dist: 24000, cash: 400, sabotage: 2000 },
    { prize: [25000, 5000, 2000, 500], kill: 3000, pts: [25, 10, 5, 0], dist: 26000, cash: 600, sabotage: 0 }
  ];

  AR.START_CASH = 600;
  AR.LOAN = { max: 15000, rate: 0.06, days: 7 };

  // Radat: ohjauspisteet (suljettu Catmull-Rom-käyrä), leveys W, piennar M. Viimeinen on finaalirata.
  AR.TRACKS = [
    { W: 170, scale: 1.0, seed: 11, pts: [[400, 450], [1100, 300], [1900, 330], [2450, 600], [2400, 1150], [1900, 1350], [1400, 1150], [1000, 1400], [500, 1350], [280, 900]] },
    { W: 165, scale: 1.0, seed: 23, pts: [[350, 350], [950, 280], [1350, 520], [1750, 330], [2350, 380], [2500, 900], [2050, 1150], [2400, 1550], [1700, 1700], [1150, 1380], [700, 1650], [300, 1450], [420, 900]] },
    { W: 170, scale: 1.0, seed: 37, pts: [[300, 500], [1000, 320], [1800, 280], [2550, 480], [2600, 1050], [2250, 1100], [1550, 850], [1050, 1050], [1550, 1350], [2350, 1540], [2300, 1880], [1300, 1850], [450, 1650], [250, 1050]] },
    { W: 160, scale: 1.0, seed: 41, pts: [[300, 350], [750, 300], [900, 850], [1250, 850], [1400, 300], [1850, 300], [2000, 850], [2350, 850], [2550, 350], [2900, 500], [2900, 1300], [2400, 1700], [1600, 1550], [900, 1750], [350, 1550], [250, 950]] },
    { W: 180, scale: 1.0, seed: 53, pts: [[400, 400], [2400, 350], [2700, 700], [1900, 1100], [2500, 1600], [2100, 1900], [500, 1800], [250, 1100]] },
    { W: 160, scale: 1.0, seed: 67, pts: [[400, 350], [900, 300], [1200, 650], [900, 950], [1300, 1250], [1800, 1000], [1700, 500], [2200, 300], [2600, 600], [2500, 1200], [2700, 1650], [2000, 1800], [1200, 1750], [500, 1650], [300, 1000]] },
    { W: 175, scale: 1.0, seed: 71, pts: [[350, 500], [1300, 250], [2300, 300], [2900, 700], [2800, 1350], [2200, 1500], [1700, 1250], [1200, 1600], [600, 1700], [250, 1200]] },
    { W: 165, scale: 1.0, seed: 83, pts: [[300, 300], [2700, 300], [2800, 700], [2200, 750], [2200, 1100], [2800, 1150], [2750, 1700], [1600, 1750], [1600, 1100], [1050, 1100], [1050, 1750], [300, 1700], [250, 1000]] },
    { W: 175, scale: 1.0, seed: 97, pts: [[400, 400], [1500, 250], [2600, 400], [2900, 1000], [2400, 1150], [2200, 1500], [2850, 1800], [1800, 2150], [1400, 1450], [1000, 1900], [350, 1750], [600, 1100], [250, 700]] }
  ];
  AR.TRACK_M = 60;   // pientareen leveys (hidas alue ennen seinää)
  AR.TRACK_WT = 14;  // seinän paksuus
  AR.FINAL_TRACK = AR.TRACKS.length - 1;

  // Kuljettajien värit
  AR.COLORS = ['#d8452b', '#e0a020', '#3f8fd8', '#4cae4c', '#b04fc8', '#e07a30', '#2bb5a8', '#c83c6e', '#8a8f2a',
    '#5a6ee0', '#c0a080', '#e05a5a', '#60c0e0', '#a0d040', '#d070a0', '#909090'];
  AR.PLAYER_COLOR = '#f2c230';
  AR.PLAYER2_COLOR = '#f4f4f0';
  // Täysi hööki: turbon itsestään lataus (s/s), aloitusturbo ja seinävaurion kerroin
  AR.HOOKI = { regen: 0.45, turbo: 5, wallDmg: 0.6 };
  AR.BOSS_COLOR = '#202020';
})();
