// AgriStuntti – valmiit radat. Radat kirjoitetaan "kilpikonnakomennoilla", jolloin palat liittyvät aina toisiinsa:
//   S / S3   suora (3 kpl)        L / R    jyrkkä mutka vasemmalle / oikealle
//   LL / RR  loiva kaarre (2×2)   BL / BR  kallistettu kaarre (2×2)
//   U / D    nousu / lasku         J1…J4    hyppyri + rako (ruutua) + alastulo
//   O        silmukka (1×2)       K        kumpare      X  risteys      F  maali
// Lisäksi maasto (fill) ja maisemaesineet (props) ruutukoordinaateilla.
import { GRID } from './data.js';
import { PIECE_BY_ID } from './pieces.js';
import { DIRS, rotCell, emptyTrack } from './track.js';

export function turtle(i, j, d, program) {
  const pieces = [];
  let ci = i, cj = j, lvl = 0;
  const put = (type, rev) => {
    const def = PIECE_BY_ID[type], path = def.paths[0];
    const pin = rev ? path.b : path.a, pout = rev ? path.a : path.b;
    const r = (d + 2 - pin.e + 8) % 4;
    const off = rotCell(def, pin.c[0], pin.c[1], r);
    const l = lvl - pin.dl;
    const pi = ci - off[0], pj = cj - off[1];
    pieces.push({ t: type, i: pi, j: pj, r, l });
    const oc = rotCell(def, pout.c[0], pout.c[1], r);
    d = (pout.e + r) % 4;
    ci = pi + oc[0] + DIRS[d][0]; cj = pj + oc[1] + DIRS[d][1];
    lvl = l + pout.dl;
  };
  // risteys: ajetaan suoraan läpi; jos ruudussa on jo risteys, sitä ei lisätä uudelleen
  const cross = () => {
    const ex = pieces.find(p => p.t === 'risteys' && p.i === ci && p.j === cj);
    if (!ex) pieces.push({ t: 'risteys', i: ci, j: cj, r: 0, l: lvl });
    ci += DIRS[d][0]; cj += DIRS[d][1];
  };
  put('lahto');
  for (const tok of program.trim().split(/\s+/)) {
    const m = tok.match(/^([A-Z]+)(\d*)$/);
    if (!m) throw new Error('Tuntematon komento: ' + tok);
    const c = m[1], nrep = m[2] ? +m[2] : 1;
    switch (c) {
      case 'S': for (let k = 0; k < nrep; k++) put('suora'); break;
      case 'L': for (let k = 0; k < nrep; k++) put('mutka'); break;
      case 'R': for (let k = 0; k < nrep; k++) put('mutka', true); break;
      case 'LL': put('kaarre'); break;
      case 'RR': put('kaarre', true); break;
      case 'BL': put('kallistus'); break;
      case 'BR': put('kallistus', true); break;
      case 'U': for (let k = 0; k < nrep; k++) put('nousu'); break;
      case 'D': for (let k = 0; k < nrep; k++) put('nousu', true); break;
      case 'J': put('hyppyri'); ci += DIRS[d][0] * nrep; cj += DIRS[d][1] * nrep; put('hyppyri', true); break;
      case 'O': put('silmukka'); break;
      case 'K': for (let k = 0; k < nrep; k++) put('kumpare'); break;
      case 'X': cross(); break;
      case 'F': put('maali'); break;
      default: throw new Error('Tuntematon komento: ' + tok);
    }
  }
  return { pieces, end: { i: ci, j: cj, d, lvl } };
}

function make(def) {
  const t = emptyTrack(def.name);
  const tt = turtle(def.start[0], def.start[1], def.start[2], def.prog);
  t.pieces = tt.pieces;
  t.end = tt.end;
  for (const f of def.fill || []) {
    const [ty, i0, j0, i1, j1] = f;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (i >= 0 && j >= 0 && i < GRID && j < GRID) t.terrain[j * GRID + i] = ty;
  }
  t.props = (def.props || []).map(p => ({ t: p[0], i: p[1], j: p[2], r: p[3] || 0 }));
  t.desc = def.desc || '';
  t.builtin = true;
  t.id = def.id;
  return t;
}

// maasto: 0 nurmi, 1 pelto, 2 vesi, 3 sora
export const TRACK_DEFS = [
  {
    id: 'harjoitus', name: 'Harjoituspelto', desc: 'Lyhyt lenkki loivilla kaarteilla ja yhdellä kumpareella. Opettele ajotuntuma.',
    start: [5, 16, 0], prog: 'S2 RR S3 K S2 RR S3 RR S2 K S3 RR',
    fill: [[1, 8, 9, 13, 14]], props: [['lato', 10, 11, 1], ['koivu', 8, 9], ['koivu', 13, 14], ['paalit', 11, 13]]
  },
  {
    id: 'ojanpientare', name: 'Ojanpientare', desc: 'Tiukkoja mutkia ja kumpareita. Jarruta ajoissa, kiihdytä aikaisin.',
    start: [2, 12, 1], prog: 'S2 R L S K S L R S2 RR S4 RR S2 L R S K S R L S2 RR S5 R',
    fill: [[2, 0, 13, 23, 13], [2, 6, 14, 12, 18], [3, 2, 11, 12, 11], [1, 15, 10, 22, 22]],
    props: [['kuusi', 3, 14], ['kuusi', 4, 16], ['koivu', 2, 15], ['kivi', 14, 9], ['koivu', 16, 12], ['siilo', 17, 15]]
  },
  {
    id: 'kuivuri', name: 'Kuivurin kierros', desc: 'Silta kuivurin yli, kallistetut kaarteet ja kumpare. Kallistuksessa saa ajaa lujaa.',
    start: [3, 20, 0], prog: 'S U S3 D S BR S2 K S2 U S2 D S BR S8 RR S10 RR',
    fill: [[1, 5, 13, 14, 20], [3, 4, 10, 17, 10]],
    props: [['siilo', 8, 16], ['siilo', 10, 16], ['lato', 12, 18, 1], ['paalit', 6, 19], ['koivu', 2, 9], ['koivu', 18, 14], ['kuusi', 18, 20]]
  },
  {
    id: 'lantala', name: 'Lantalan silmukka', desc: 'Silmukka heti alkuun ja hyppy lantalammen yli. Silmukkaan tarvitaan vauhtia.',
    start: [4, 17, 0], prog: 'S2 O S RR S2 J2 S2 RR S6 RR S8 RR',
    fill: [[2, 8, 8, 11, 9], [2, 9, 10, 10, 10], [1, 6, 12, 13, 15]],
    props: [['lato', 9, 13, 0], ['paalit', 7, 13], ['paalit', 12, 14], ['koivu', 3, 9], ['tuulimylly', 18, 12]]
  },
  {
    id: 'kahdeksikko', name: 'Siilon kahdeksikko', desc: 'Kahdeksikko risteyksellä. Varo risteävää liikennettä – ja omia jälkiäsi.',
    start: [6, 20, 0], prog: 'S3 X S2 RR S2 BR S2 R S4 X S LL S2 LL S L',
    fill: [[1, 7, 13, 10, 15], [3, 4, 17, 5, 19]],
    props: [['siilo', 8, 14], ['siilo', 9, 14], ['paalit', 4, 17], ['kuusi', 14, 13], ['koivu', 2, 15], ['kivi', 13, 17]]
  },
  {
    id: 'navetta', name: 'Navetan hypyt', desc: 'Neljä hyppyriä veden ja pellon yli. Tarkka vauhti ratkaisee: liian hiljaa → molskis.',
    start: [3, 18, 0], prog: 'S2 J1 S2 RR S J2 S RR S2 J2 S2 RR S2 J1 S RR',
    fill: [[2, 3, 14, 3, 14], [2, 7, 9, 8, 10], [2, 13, 13, 13, 15], [1, 5, 11, 11, 17], [2, 7, 19, 7, 21]],
    props: [['lato', 8, 14, 1], ['paalit', 6, 12], ['paalit', 10, 16], ['koivu', 1, 10], ['kuusi', 16, 9], ['kuusi', 16, 20]]
  },
  {
    id: 'tornitie', name: 'Tornitie', desc: 'Kaksi kerrosta ylös, pitkä silta ja silmukka paluumatkalla.',
    start: [3, 19, 0], prog: 'S2 U S U S RR S4 D S D S2 RR S2 O S3 RR S9 RR',
    fill: [[2, 5, 13, 13, 16], [1, 5, 17, 13, 18]],
    props: [['tuulimylly', 9, 15], ['kivi', 6, 14], ['kivi', 12, 15], ['kuusi', 1, 12], ['koivu', 18, 18]]
  },
  {
    id: 'hessu', name: 'Hurjan Hessun koetus', desc: 'Kaikki samassa: kaksi silmukkaa, hyppy, silta ja kallistukset. Lähdöstä maaliin.',
    start: [2, 20, 0], prog: 'S2 O S2 RR S2 J2 S BR U S3 D S BR S2 K2 S RR S2 O S F',
    fill: [[2, 7, 11, 8, 13], [1, 4, 15, 12, 19], [3, 0, 21, 23, 23]],
    props: [['lato', 8, 16, 1], ['siilo', 10, 18], ['paalit', 5, 18], ['tuulimylly', 16, 6], ['kuusi', 1, 9], ['kuusi', 14, 21]]
  }
];

export const BUILTIN = () => TRACK_DEFS.map(make);
