/* Elämänkoulu – pelin luvut: vakiot, perushyökkäykset ja hahmot.
   Kaikki tasapainoon vaikuttavat luvut ovat tässä tiedostossa. Tekstit ovat tiedostossa text.js. */
(function () {
  'use strict';
  const EK = window.EK;

  EK.C = {
    W: 960, H: 540,          // kankaan looginen koko
    GROUND: 474,             // maan korkeus ruudulla
    STAGE_W: 1500,           // areenan leveys maailmayksiköissä
    EDGE: 36,                // seinän paksuus: hahmo ei mene tätä lähemmäs reunaa
    MAX_SEP: 820,            // hahmojen suurin etäisyys (kamera ei venytä enempää)
    GRAV: 0.8,
    FRICTION: 0.82,          // työntövauhdin hidastuminen ruutua kohden
    HP: 1000,
    METER: 100,              // Oivallus-mittari (superliike maksaa koko mittarin)
    JAKS: 600,               // Jaksaminen-mittari (6 palkkia)
    JAKS_REGEN: 0.3,         // palautuminen ruutua kohden normaalisti
    JAKS_BURN_REGEN: 1.4,    // palautuminen uupumuksessa
    JAKS_BURN_UNTIL: 300,    // uupumus päättyy, kun mittari on palautunut tähän
    JAKS_REST: 7,            // Lepohetki palauttaa näin paljon ruudussa
    JAKS_PARRY_HOLD: 1.5,    // Hengitä-torjunnan pitäminen kuluttaa ruudussa
    JAKS_PARRY_COST: 30,     // Hengitä-torjunnan aloitus maksaa
    JAKS_PARRY_OK: 20,       // onnistunut Hengitä palauttaa (täydellinen kolminkertaisesti)
    JAKS_BLOCK_K: 1.0,       // torjuttu isku vie torjujalta (vahinko × k)
    PERFECT_WIN: 4,          // täydellinen Hengitä: osuma ensimmäisten ruutujen aikana
    PERFECT_FREEZE: 22,      // täydellisen torjunnan jälkeen hyökkääjä jähmettyy
    ROUND_TIME: 99,
    ROUNDS_TO_WIN: 2,
    BUFFER: 5,               // napinpainallus odottaa näin monta ruutua toimintavuoroa
    MOTION_WIN: 14,          // liikesarjan (esim. ↓↘→) ikkuna ruutuina
    MODERN_DMG: 0.85,        // modernin ohjauksen erikoisliikkeiden vahinkokerroin
    CHIP: 0.12,              // erikoisliikkeen torjuttu vahinko
    CHIP_BURN: 0.25,         // uupuneen torjujan saama vahinko kaikista iskuista
    COUNTER_DMG: 1.2, COUNTER_HS: 4,
    REST_DMG: 1.3,           // Lepohetken aikana saatu isku sattuu enemmän
    SCALE: [1, 1, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3], // yhdistelmän vahingon skaalaus osumaa kohden
    THROW_TECH: 8,           // heiton voi purkaa näin monen ruudun aikana
    JUGGLE_MAX: 3,
    DOWN_TIME: 38, GETUP_TIME: 22,
    METER_GAIN: { hit: 0.09, block: 0.05, taken: 0.06, special: 2 }
  };

  // Hahmon osumalaatikot (x eteenpäin, y ylös maasta)
  EK.HURT = {
    stand: [{ x0: -27, x1: 25, y0: 0, y1: 150 }, { x0: -14, x1: 18, y0: 150, y1: 186 }],
    crouch: [{ x0: -30, x1: 30, y0: 0, y1: 96 }],
    air: [{ x0: -24, x1: 24, y0: 30, y1: 150 }, { x0: -14, x1: 16, y0: 150, y1: 180 }],
    down: [{ x0: -60, x1: 60, y0: 0, y1: 26 }],
    low: [{ x0: -34, x1: 34, y0: 0, y1: 62 }]
  };
  EK.PUSH_W = 30; // työntölaatikon puolikas leveys

  /* Perushyökkäykset. st = käynnistys, act = aktiiviset ruudut, rec = palautuminen.
     hs/bs = osuma- ja torjuntajähmetys. lvl: mid (torjutaan seisten tai kyykyssä), low (vain kyykyssä), over (vain seisten).
     hb = osumalaatikko suhteessa hahmon jalkoihin. */
  EK.NORMALS = {
    sL: { name: 'Nopea isku', st: 4, act: 3, rec: 7, dmg: 30, hs: 13, bs: 9, lvl: 'mid', hb: [30, 92, 126, 152], pw: 'jabW', pa: 'jab', cancel: true, chain: ['sL', 'cL', 'sM', 'cM'], str: 'L', push: 5 },
    sM: { name: 'Etupotku', st: 7, act: 3, rec: 13, dmg: 55, hs: 17, bs: 13, lvl: 'mid', hb: [30, 112, 66, 112], pw: 'kickW', pa: 'kick', cancel: true, chain: ['sH', 'cH'], str: 'M', push: 6 },
    sH: { name: 'Iso isku', st: 10, act: 4, rec: 19, dmg: 85, hs: 24, bs: 18, lvl: 'mid', hb: [34, 118, 112, 158], pw: 'hookW', pa: 'hook', cancel: true, str: 'H', push: 8 },
    cL: { name: 'Kyykkyisku', st: 4, act: 3, rec: 7, dmg: 25, hs: 12, bs: 9, lvl: 'mid', hb: [30, 90, 56, 84], pw: 'cjabW', pa: 'cjab', cancel: true, chain: ['sL', 'cL', 'sM', 'cM'], str: 'L', crouch: true, push: 5 },
    cM: { name: 'Matala potku', st: 7, act: 3, rec: 13, dmg: 50, hs: 17, bs: 13, lvl: 'low', hb: [30, 118, 0, 30], pw: 'lowkW', pa: 'lowk', cancel: true, chain: ['sH', 'cH'], str: 'M', crouch: true, push: 6 },
    cH: { name: 'Jalkapyyhkäisy', st: 9, act: 4, rec: 24, dmg: 80, hs: 30, bs: 14, lvl: 'low', hb: [30, 130, 0, 24], pw: 'sweepW', pa: 'sweep', kd: 'trip', str: 'H', crouch: true, push: 7 },
    jL: { name: 'Hyppyisku', st: 4, act: 9, rec: 4, dmg: 35, hs: 15, bs: 11, lvl: 'over', hb: [14, 66, 50, 104], pw: 'jpunchW', pa: 'jpunch', air: true, str: 'L', push: 4 },
    jM: { name: 'Hyppypotku', st: 6, act: 7, rec: 4, dmg: 55, hs: 18, bs: 13, lvl: 'over', hb: [18, 92, 6, 62], pw: 'jkickW', pa: 'jkick', air: true, str: 'M', push: 5 },
    jH: { name: 'Lentopotku', st: 8, act: 6, rec: 4, dmg: 80, hs: 22, bs: 16, lvl: 'over', hb: [22, 102, -4, 52], pw: 'jbigW', pa: 'jbig', air: true, str: 'H', push: 6 },
    fM: { name: 'Yläisku', st: 18, act: 3, rec: 14, dmg: 60, hs: 18, bs: 12, lvl: 'over', hb: [28, 100, 86, 170], pw: 'overW', pa: 'over', str: 'M', push: 6 },
    throw: { name: 'Heitto', st: 5, act: 2, rec: 22, dmg: 120, range: 84 }
  };

  // Lyönnin voimakkuuden mukaiset jähmetykset (hitstop) ja tärinä
  EK.STOP = { L: 7, M: 9, H: 12, S: 11, X: 14 };

  /* Hahmot. Erikoisliikkeet: s1 = ↓↘→ tai Erikois, s2 = →↓↘ tai →+Erikois, s3 = ↓↙← tai ↓+Erikois.
     Superliike: ↓↘→↓↘→ + isku tai Erikois + Iso (H). Liiketyypit toteutetaan tiedostossa moves.js.
     Kolme arvoa taulukossa = voimakkuudet L / M / H. */
  EK.CHARS = [
    {
      id: 'kaisa', name: 'Kaisa Kahvi', title: 'Barista', stage: 'kahvila',
      hp: 1000, walk: 3.3, back: 2.7, jump: { vy: 15.5, vx: 4.2 }, dash: { f: 116, b: 92 },
      power: 1.0, reach: 1.0, speed: 0, size: 1.0,
      style: 'Monipuolinen. Kuppi kaukaa, vaahdotin ilmassa tulijoille, ryntäys loppuun.',
      look: { skin: '#f1c5a3', hair: '#8a2f1d', hairStyle: 'bun', top: '#f3ead8', top2: '#6b4026', bottom: '#2f3846', shoes: '#f4f4f4', acc: ['apron'], sleeves: 'short', legs: 'pants', build: 1.0, eye: '#2a1c14' },
      s1: { type: 'proj', name: 'Kuuma kuppi', sprite: 'cup', speed: [5.5, 7, 8.5], dmg: 60, color: '#c98a4b' },
      s2: { type: 'rise', name: 'Vaahdotin', dmg: [95, 110, 125], fx: '#fff6e6' },
      s3: { type: 'rush', name: 'Kofeiiniryntäys', dist: [120, 170, 220], dmg: [70, 85, 100], fx: '#c98a4b' },
      sup: { type: 'rushc', name: 'Tuplaespresso', dmg: 320, fx: '#e2a159', words: ['Tauko!', 'Vettä!', 'Hengitä!', 'Kahvi!'] }
    },
    {
      id: 'jere', name: 'Jere Joogi', title: 'Joogaopettaja', stage: 'ranta',
      hp: 920, walk: 2.7, back: 2.4, jump: { vy: 14.5, vx: 3.8, g: 0.68 }, dash: { f: 100, b: 96 },
      power: 0.9, reach: 1.18, speed: 1, size: 1.04,
      style: 'Pitkät raajat ja rauhallinen tahti. Pidä vastustaja kaukana ja vastaa iskuun Puun asennolla.',
      look: { skin: '#c99068', hair: '#2b1e16', hairStyle: 'topknot', top: '#5fb8a6', top2: '#f2c14e', bottom: '#e9e3d6', shoes: null, acc: ['headband', 'beard'], sleeves: 'none', legs: 'pants', build: 0.9, eye: '#1c1410' },
      s1: { type: 'proj', name: 'Hengitysaalto', sprite: 'ring', speed: [3.2, 4.2, 5.4], dmg: 48, color: '#8fe3d4' },
      s2: { type: 'counter', name: 'Puun asento', dmg: [100, 115, 130], fx: '#8fe3d4' },
      s3: { type: 'tele', name: 'Asanavaihto', to: ['back', 'front', 'behind'], fx: '#8fe3d4' },
      sup: { type: 'beam', name: 'Aurinkotervehdys', dmg: 300, fx: '#ffd36a', words: ['Hengitä', 'Tunne', 'Päästä irti'] }
    },
    {
      id: 'martta', name: 'Mummo Martta', title: 'Sauvakävelijä', stage: 'piha',
      hp: 1000, walk: 2.4, back: 2.2, jump: { vy: 14.8, vx: 3.6 }, dash: { f: 96, b: 84 },
      power: 1.0, reach: 1.1, speed: 1, size: 0.9,
      style: 'Sauvat antavat ulottuvuutta. Villasukka kaartaa yli, ja kopautus menee torjunnasta läpi.',
      look: { skin: '#f0cdb6', hair: '#e9e9ef', hairStyle: 'granny', top: '#b0453f', top2: '#e8d7a8', bottom: '#4b3c5c', shoes: '#5a4030', acc: ['glasses', 'cardigan'], sleeves: 'long', legs: 'skirt', build: 0.95, eye: '#2b2b2b', prop: 'pole' },
      s1: { type: 'proj', name: 'Villasukka', sprite: 'sock', speed: [4.5, 5.5, 6.5], arc: true, dmg: 55, color: '#d95f5f' },
      s2: { type: 'rise', name: 'Sauvaloikka', dmg: [90, 105, 120], fx: '#e8d7a8' },
      s3: { type: 'hop', name: 'Kepin kopautus', dist: [60, 100, 140], dmg: [65, 75, 90], fx: '#e8d7a8' },
      sup: { type: 'grabc', name: 'Pullakahvit', dmg: 330, fx: '#f3c37a', words: ['Istu!', 'Ota pulla!', 'Toinen!', 'Lämmintä päälle!'] }
    },
    {
      id: 'leevi', name: 'Leevi Läppäri', title: 'Etätyöläinen', stage: 'koti',
      hp: 1000, walk: 2.9, back: 2.6, jump: { vy: 15.2, vx: 4.0 }, dash: { f: 104, b: 90 },
      power: 0.95, reach: 1.04, speed: 0, size: 1.0,
      style: 'Kaukopelaaja. Kokouskutsuja ruudun täydeltä, ja Ctrl+Z vie pois pahasta paikasta.',
      look: { skin: '#e6b48f', hair: '#3a2b22', hairStyle: 'messy', top: '#4a5a7a', top2: '#9fb0cc', bottom: '#58606b', shoes: '#c8423a', acc: ['glasses', 'headset', 'hood'], sleeves: 'long', legs: 'pants', build: 1.0, eye: '#1e1a18' },
      s1: { type: 'proj', name: 'Kokouskutsu', sprite: 'invite', speed: [4, 6, 8], dmg: 60, color: '#6fa8ff' },
      s2: { type: 'tele', name: 'Ctrl+Z', to: ['back', 'front', 'behind'], fx: '#6fa8ff' },
      s3: { type: 'spin', name: 'Pikanäppäimet', hits: [3, 4, 5], dmg: 26, vx: [2, 3, 4], fx: '#9fd0ff' },
      sup: { type: 'beam', name: 'Poissa toimistolta', dmg: 300, fx: '#7fb6ff', words: ['Automaattivastaus', 'Lomalla', 'Ei verkossa'] }
    },
    {
      id: 'saara', name: 'Saara Sähköpyörä', title: 'Pyörälähetti', stage: 'katu',
      hp: 950, walk: 4.0, back: 3.2, jump: { vy: 15.8, vx: 4.8 }, dash: { f: 140, b: 100 },
      power: 1.05, reach: 0.95, speed: -1, size: 0.97,
      style: 'Nopein hahmo. Ei heittoliikettä: polkaise sisään, kaarra alta ja paina päälle.',
      look: { skin: '#8d5a3b', hair: '#1a1210', hairStyle: 'braids', top: '#f0c330', top2: '#2a2a2a', bottom: '#2a2a2a', shoes: '#30c48d', acc: ['helmet', 'backpack'], sleeves: 'short', legs: 'shorts', build: 0.95, eye: '#140e0b' },
      s1: { type: 'rush', name: 'Polkaisu', dist: [140, 200, 260], dmg: [65, 80, 95], fx: '#30c48d' },
      s2: { type: 'rise', name: 'Pupuhyppy', dmg: [90, 105, 120], fx: '#f0c330' },
      s3: { type: 'spin', name: 'Kaarre', hits: [2, 3, 3], dmg: 30, vx: [4, 5, 6], low: true, fx: '#30c48d' },
      sup: { type: 'rushc', name: 'Ruuhkatunti', dmg: 320, fx: '#30c48d', words: ['Kypärä!', 'Jarru!', 'Valot!', 'Perillä!'] }
    },
    {
      id: 'rami', name: 'Rami Remontti', title: 'Remonttimies', stage: 'tyomaa',
      hp: 1200, walk: 2.7, back: 2.3, jump: { vy: 15.0, vx: 3.6, g: 0.84 }, dash: { f: 92, b: 80 },
      power: 1.2, reach: 1.05, speed: 2, size: 1.12,
      style: 'Hidas mutta vankka. Purkutyö nappaa torjunnankin läpi, ja Lekaisku kestää yhden iskun.',
      look: { skin: '#eab08d', hair: '#7a5a2e', hairStyle: 'cap', top: '#3d6fb3', top2: '#f2a23a', bottom: '#3d6fb3', shoes: '#4a3524', acc: ['overalls', 'beard', 'hammer'], sleeves: 'short', legs: 'pants', build: 1.25, eye: '#20160f' },
      s1: { type: 'grab', name: 'Purkutyö', range: [84, 94, 104], dmg: [140, 160, 180], fx: '#f2a23a' },
      s2: { type: 'rise', name: 'Nosturi', dmg: [100, 120, 140], fx: '#f2a23a' },
      s3: { type: 'rush', name: 'Lekaisku', dist: [70, 100, 130], dmg: [90, 105, 120], armor: true, fx: '#f2a23a' },
      sup: { type: 'grabc', name: 'Täysremontti', dmg: 360, fx: '#f2a23a', words: ['Mittaa!', 'Sahaa!', 'Tasaa!', 'Valmis!'] }
    },
    {
      id: 'iida', name: 'Iida Influensseri', title: 'Sisällöntuottaja', stage: 'studio',
      hp: 1000, walk: 3.4, back: 2.9, jump: { vy: 15.6, vx: 4.4 }, dash: { f: 120, b: 96 },
      power: 1.05, reach: 1.0, speed: 0, size: 0.98,
      style: 'Nopea salama lähelle, Swaippaus liukuu alta ja Viraali nousee sydämien kanssa.',
      look: { skin: '#f3cdb3', hair: '#e7b5d4', hairStyle: 'ponytail', top: '#ff6fa8', top2: '#fff1f7', bottom: '#2e2a44', shoes: '#ffffff', acc: ['shades', 'phone'], sleeves: 'long', legs: 'pants', build: 0.92, eye: '#2b1a24' },
      s1: { type: 'proj', name: 'Salamavalo', sprite: 'flash', speed: [9, 10, 11], life: [24, 32, 40], dmg: 45, color: '#fff7a8' },
      s2: { type: 'rise', name: 'Viraali', dmg: [90, 105, 120], multi: 3, fx: '#ff6fa8' },
      s3: { type: 'rush', name: 'Swaippaus', dist: [120, 160, 200], dmg: [60, 70, 85], low: true, fx: '#ff6fa8' },
      sup: { type: 'risec', name: 'Livelähetys', dmg: 300, fx: '#ff6fa8', words: ['LIVE', '♥', '♥♥', '♥♥♥'] }
    },
    {
      id: 'hannu', name: 'Hannu Hustle', title: 'Toimitusjohtaja', stage: 'loft', boss: true,
      hp: 1000, walk: 3.4, back: 2.8, jump: { vy: 15.5, vx: 4.4 }, dash: { f: 124, b: 96 },
      power: 1.0, reach: 1.05, speed: 0, size: 1.04,
      style: 'Kaikki kerralla: nopea disruptio, skaalaus ilmaan ja pivotointi selän taakse.',
      look: { skin: '#efc19f', hair: '#c9a24a', hairStyle: 'slick', top: '#262a33', top2: '#ffffff', bottom: '#262a33', shoes: '#f4f4f4', acc: ['suit', 'earbuds'], sleeves: 'long', legs: 'pants', build: 1.05, eye: '#1b1b1b' },
      s1: { type: 'proj', name: 'Disruptio', sprite: 'chart', speed: [6, 7.5, 9], dmg: 54, color: '#ffcf3a' },
      s2: { type: 'rise', name: 'Skaalaus', dmg: [100, 115, 130], fx: '#ffcf3a' },
      s3: { type: 'tele', name: 'Pivotointi', to: ['back', 'front', 'behind'], fx: '#ffcf3a' },
      sup: { type: 'rushc', name: 'Exit-strategia', dmg: 330, fx: '#ffcf3a', words: ['Synergia!', 'Skaalaa!', 'Disruptoi!', 'EXIT!'] }
    }
  ];
  EK.CHAR = {};
  EK.CHARS.forEach((c, i) => { c.index = i; EK.CHAR[c.id] = c; });

  // Pelihallin vaikeustasot tekoälylle
  EK.DIFF = [
    { name: 'Rento', react: 26, block: 0.25, aa: 0.15, combo: 0.15, punish: 0.2, aggr: 0.35, mistake: 0.25 },
    { name: 'Tavallinen', react: 18, block: 0.5, aa: 0.4, combo: 0.45, punish: 0.5, aggr: 0.5, mistake: 0.12 },
    { name: 'Tiukka', react: 12, block: 0.72, aa: 0.65, combo: 0.75, punish: 0.75, aggr: 0.6, mistake: 0.05 },
    { name: 'Mestari', react: 8, block: 0.88, aa: 0.85, combo: 0.92, punish: 0.92, aggr: 0.65, mistake: 0.02 }
  ];
})();
