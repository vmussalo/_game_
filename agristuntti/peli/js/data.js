// AgriStuntti – kaikki säädettävät luvut yhdessä paikassa.
// Yksiköt: metri, sekunti, kilogramma, newton. Akselit: y ylös, ruudukko x/z-tasossa.

export const TILE = 30;        // ruudun sivu (m)
export const LEVEL = 5;        // yhden korkeustason korkeus (m)
export const GRID = 24;        // ruudukko GRID × GRID
export const ROAD_W = 10;      // tien leveys (m)
export const ROAD_T = 0.7;     // tien paksuus (m)
export const CURB = 0.9;       // reunakivetyksen leveys (m)
export const MAX_LEVEL = 4;
export const GRAV = 9.81;
export const STEP = 1 / 120;   // fysiikan askel (s)

// Maasto ruuduittain: pito, vierintävastus ja väri (editori ja maan tekstuuri)
export const TERRAIN = [
  { id: 'nurmi', name: 'Nurmi', grip: 0.75, roll: 0.06, col: '#5f9a3a', col2: '#6aa642' },
  { id: 'pelto', name: 'Pelto', grip: 0.6, roll: 0.12, col: '#8a6a3c', col2: '#7a5c32' },
  { id: 'vesi', name: 'Vesi', grip: 0, roll: 0, col: '#2f6fa8', col2: '#3a7fbc', water: true },
  { id: 'sora', name: 'Sora', grip: 0.65, roll: 0.05, col: '#b7a27a', col2: '#a8946c' }
];
export const ROAD_GRIP = 1.0;

// Maisemaesineet: törmäysmuoto (sylinteri r/h tai laatikko w/l/h), editorin symboli
export const PROPS = [
  { id: 'koivu', name: 'Koivu', shape: 'cyl', r: 0.6, h: 12, icon: '🌳' },
  { id: 'kuusi', name: 'Kuusi', shape: 'cyl', r: 0.7, h: 15, icon: '🌲' },
  { id: 'lato', name: 'Lato', shape: 'box', w: 14, l: 20, h: 9, icon: '🏠' },
  { id: 'siilo', name: 'Siilo', shape: 'cyl', r: 4, h: 18, icon: '🛢' },
  { id: 'paalit', name: 'Paalit', shape: 'box', w: 6, l: 9, h: 3, icon: '🌾' },
  { id: 'kivi', name: 'Kivi', shape: 'cyl', r: 2.4, h: 3, icon: '🪨' },
  { id: 'tuulimylly', name: 'Tuulimylly', shape: 'cyl', r: 3, h: 20, icon: '🌀' }
];

// Kalusto. dims = pituus, leveys, korkeus (törmäyslaatikko massakeskipisteen ympärillä).
// wheels: x (vasen +), z (eteen +), r = säde, drive = vetävä, steer = 1 eteen kääntyvä, -1 taakse kääntyvä.
// Nopeudet ovat pelillisiä ("stunttiviritys"), jotta jokainen kone jaksaa silmukan.
export const VEHICLES = [
  {
    id: 'leikkuri', name: 'Ajoleikkuri', desc: 'Kevyt ja ketterä. Pomppii herkästi, mutta kääntyy kuin ajatus.',
    mass: 320, dims: [2.2, 1.25, 1.0], cg: 0.45, vmax: 33, acc: 6.2, grip: 1.05, steer: 0.62, susp: 0.22,
    wheels: [{ x: 0.52, z: 0.7, r: 0.24, steer: 1 }, { x: -0.52, z: 0.7, r: 0.24, steer: 1 },
             { x: 0.55, z: -0.62, r: 0.33, drive: 1 }, { x: -0.55, z: -0.62, r: 0.33, drive: 1 }],
    color: '#d8402a'
  },
  {
    id: 'monkija', name: 'Mönkijä', desc: 'Nopein kiihtyjä. Lyhyt akseliväli: hypyissä nokka nousee helposti.',
    mass: 380, dims: [2.1, 1.2, 1.15], cg: 0.5, vmax: 39, acc: 7.5, grip: 1.1, steer: 0.55, susp: 0.26,
    wheels: [{ x: 0.5, z: 0.68, r: 0.3, steer: 1, drive: 1 }, { x: -0.5, z: 0.68, r: 0.3, steer: 1, drive: 1 },
             { x: 0.5, z: -0.62, r: 0.3, drive: 1 }, { x: -0.5, z: -0.62, r: 0.3, drive: 1 }],
    color: '#3f7f3a'
  },
  {
    id: 'pikkutraktori', name: 'Pikkutraktori', desc: 'Iso takarengas ja vakaa runko. Hyvä ensimmäinen kone.',
    mass: 1500, dims: [3.2, 1.7, 2.1], cg: 0.75, vmax: 36, acc: 5.4, grip: 1.0, steer: 0.55, susp: 0.24,
    wheels: [{ x: 0.72, z: 1.05, r: 0.4, steer: 1 }, { x: -0.72, z: 1.05, r: 0.4, steer: 1 },
             { x: 0.82, z: -0.75, r: 0.68, drive: 1 }, { x: -0.82, z: -0.75, r: 0.68, drive: 1 }],
    color: '#c8362e'
  },
  {
    id: 'kurottaja', name: 'Kurottaja', desc: 'Neljäpyöräohjaus: molemmat akselit kääntyvät, joten tiukat mutkat sujuvat.',
    mass: 3600, dims: [4.6, 2.2, 2.4], cg: 0.85, vmax: 34, acc: 4.8, grip: 1.0, steer: 0.42, susp: 0.24,
    wheels: [{ x: 0.95, z: 1.4, r: 0.56, steer: 1, drive: 1 }, { x: -0.95, z: 1.4, r: 0.56, steer: 1, drive: 1 },
             { x: 0.95, z: -1.4, r: 0.56, steer: -1, drive: 1 }, { x: -0.95, z: -1.4, r: 0.56, steer: -1, drive: 1 }],
    color: '#e0a020'
  },
  {
    id: 'linkku', name: 'Linkkutraktori', desc: 'Runko-ohjattu jättiläinen: taittuu keskeltä. Raskas ja nopea suoralla.',
    mass: 6000, dims: [5.6, 2.6, 3.1], cg: 1.0, vmax: 38, acc: 5.0, grip: 1.05, steer: 0.4, susp: 0.26,
    articulated: true,
    wheels: [{ x: 1.05, z: 1.75, r: 0.8, steer: 1, drive: 1 }, { x: -1.05, z: 1.75, r: 0.8, steer: 1, drive: 1 },
             { x: 1.05, z: -1.75, r: 0.8, steer: -1, drive: 1 }, { x: -1.05, z: -1.75, r: 0.8, steer: -1, drive: 1 }],
    color: '#2f6fb8'
  },
  {
    id: 'puimuri', name: 'Puimuri', desc: 'Takapyöräohjaus ja leveä leikkuupöytä. Kääntyy oudosti mutta varmasti.',
    mass: 9000, dims: [7.0, 3.2, 3.8], cg: 1.2, vmax: 33, acc: 5.0, grip: 1.0, steer: 0.48, susp: 0.24,
    wheels: [{ x: 1.3, z: 1.4, r: 0.85, drive: 1 }, { x: -1.3, z: 1.4, r: 0.85, drive: 1 },
             { x: 1.15, z: -1.9, r: 0.55, steer: -1 }, { x: -1.15, z: -1.9, r: 0.55, steer: -1 }],
    color: '#4a9a3a', header: 5.6
  },
  {
    id: 'kaivinkone', name: 'Kaivinkone', desc: 'Telat: kääntyy paikallaan ja pitää kuin liimattu. Hitain kiihtyjä.',
    mass: 14000, dims: [5.6, 3.0, 3.0], cg: 1.0, vmax: 32, acc: 5.0, grip: 1.25, steer: 1.6, susp: 0.2,
    tracked: true,
    wheels: [{ x: 1.15, z: 1.75, r: 0.45, drive: 1 }, { x: -1.15, z: 1.75, r: 0.45, drive: 1 },
             { x: 1.15, z: 0, r: 0.45, drive: 1 }, { x: -1.15, z: 0, r: 0.45, drive: 1 },
             { x: 1.15, z: -1.75, r: 0.45, drive: 1 }, { x: -1.15, z: -1.75, r: 0.45, drive: 1 }],
    color: '#e8b818'
  }
];

// Tietokonevastustajat: nopeuskerroin tekoälyn tavoitenopeuksiin
export const OPPONENTS = [
  { id: 'ei', name: 'Ei vastustajaa' },
  { id: 'haamu', name: 'Oma ennätys (haamu)' },
  { id: 'helppo', name: 'Naapurin Pertti (helppo)', skill: 0.8, vi: 2, color: '#8a8f2a' },
  { id: 'keski', name: 'Urakoitsija-Oili (keski)', skill: 0.9, vi: 4, color: '#b04fc8' },
  { id: 'kova', name: 'Hurja-Hessu (kova)', skill: 0.98, vi: 1, color: '#e07a30' }
];

export const CRASH = { impact: 11, topImpact: 6, flipTime: 1.6, respawnDelay: 2.2 };
