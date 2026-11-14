/* FarmSim Online – pelin data: kasvit, koneet, rakennukset, eläimet, ilmastoalueet ja työkalut.
 * Kasvien kasvuajat, lämpö- ja vesivaatimukset sekä resistenssit noudattavat SimFarmin (1993)
 * käsikirjan julkaisemia arvoja (docs/simfarm-mekaniikka.md); hinnat ja tasapaino ovat omia. */
'use strict';
(function () {
  var FS = window.FS;

  FS.MAP = 96;          // kartan koko ruutuina
  FS.PLOT = 8;          // tontin koko ruutuina
  FS.PLOTS = 12;        // tontteja rivissä
  FS.FIELD = 8;         // pellon koko ruutuina
  FS.START_FUNDS = 40000;
  FS.LEASE_RATE = 0.3;  // vuokra käyttökerralta, osuus koneen hinnasta
  FS.AUTOBUY_MARKUP = 1.25;

  /* Maaston ja kohteiden tyypit (tile-taulukot). */
  FS.T = { GRASS: 0, DIRT: 1, WATER: 2 };
  FS.O = {
    NONE: 0, ROCK: 1, TREE: 2, PAVED: 3, DIRT_ROAD: 4, FENCE: 5, GATE: 6, DITCH: 7, VALVE: 8,
    FIELD: 9, BUILDING: 10, FEED: 11, TROUGH: 12, BRIDGE: 13, TOWN: 14, BUSH: 15
  };

  /* Kasvit.
   * w = kasvuviikot, temp = {t:'dd'|'chill'|'nofreeze', v:[min,max]}, water = sadepäivät [min,max],
   * res = resistenssi [tuholaiset, rikat, taudit] (1 = korkea), store = varastolämpö °F [min,max],
   * perennial = ei uudelleenkylvöä, hand = käsin korjattava, price = täydellisen sadon perushinta $.
   * nutr = vaikutus ravinteisiin sadonkorjuussa, ferSens = lannoitusherkkä ensimmäiset viikot. */
  FS.CROPS = [
    { id: 'almonds', name: 'Mantelit', w: 30, temp: { t: 'chill', v: [300, 500] }, water: [4, 7], res: [0, 1, 0], store: [36, 44], perennial: true, price: 8400, nutr: -10, col: ['#3f7f2a', '#c9a46a'], tip: 'Viihtyy Pohjois-Kalifornian kaltaisessa ilmastossa. Tarvitsee talvella viileyttä.' },
    { id: 'apples', name: 'Omenat', w: 17, temp: { t: 'chill', v: [900, 1500] }, water: [5, 8], res: [0, 1, 0], store: [32, 42], perennial: true, hand: true, price: 7800, nutr: -10, col: ['#2f7a2f', '#d23b2b'], tip: 'Kylmät talvet ja hedelmällinen maa. Pohjoiset alueet ja Tyynenmeren luode.' },
    { id: 'barley', name: 'Ohra', w: 34, temp: { t: 'nofreeze' }, water: [1, 3], res: [1, 0, 1], store: [50, 60], price: 4950, nutr: -12, col: ['#7fa040', '#d8c070'], tip: 'Viljakasvi. Vältä hallaa. Säilyy siilossa hyvin – odota hyvää hintaa.' },
    { id: 'carrots', name: 'Porkkanat', w: 17, temp: { t: 'dd', v: [1800, 1800] }, water: [3, 4], res: [0, 0, 0], store: [30, 38], price: 3900, nutr: -10, col: ['#4f9a2f', '#e8822a'], tip: 'Pitää lämpimästä. Helteellä kastele. Vältä pitkiä kylmiä jaksoja.' },
    { id: 'corn', name: 'Maissi', w: 12, temp: { t: 'dd', v: [2000, 2000] }, water: [8, 9], res: [0, 1, 1], store: [46, 54], price: 3000, nutr: -22, col: ['#3f8f2a', '#e8d040'], tip: 'Kuluttaa paljon ravinteita: lannoita hyvin tai viljele vuorotellen soijan kanssa.' },
    { id: 'cotton', name: 'Puuvilla', w: 12, temp: { t: 'dd', v: [850, 900] }, water: [8, 12], res: [0, 0, 1], store: [40, 120], price: 3450, nutr: -14, col: ['#4f8a3a', '#f4f4ee'], tip: 'Kylvä myöhäiskeväällä lämpimällä alueella, kun hallanvaara on ohi.' },
    { id: 'gladiolus', name: 'Gladiolukset', w: 12, temp: { t: 'nofreeze' }, water: [8, 12], res: [0, 0, 0], store: [36, 44], hand: true, price: 4350, nutr: -14, col: ['#4f9a3a', '#e04c8c'], tip: 'Vaatii ravinteikkaan maan: lannoita useasti. Älä päästä peltoa tulvimaan.' },
    { id: 'grapes', name: 'Viinirypäleet', w: 22, temp: { t: 'dd', v: [3000, 3000] }, water: [3, 5], res: [0, 0, 0], store: [36, 45], perennial: true, hand: true, price: 8100, nutr: -8, ferSens: true, col: ['#3f7a2a', '#6a2a7a'], tip: 'Istuta varhain keväällä. Älä lannoita istutushetkellä.' },
    { id: 'lettuce', name: 'Salaatti', w: 13, temp: { t: 'dd', v: [1600, 1600] }, water: [4, 6], res: [0, 0, 0], store: [30, 38], hand: true, price: 3450, nutr: -8, col: ['#5aa83a', '#9ad860'], tip: 'Kypsyy parhaiten viileässä. Ajoita kylvöt huolella.' },
    { id: 'oats', name: 'Kaura', w: 34, temp: { t: 'nofreeze' }, water: [2, 3], res: [0, 0, 0], store: [30, 38], price: 4500, nutr: -10, col: ['#7a9a40', '#d8d090'], tip: 'Viljakasvi, joka ei siedä liikaa vettä. Vältä hallaa. Säilyy siilossa hyvin.' },
    { id: 'onions', name: 'Sipulit', w: 22, temp: { t: 'dd', v: [2700, 2700] }, water: [3, 4], res: [1, 0, 0], store: [32, 50], price: 4650, nutr: -10, col: ['#5a9a3a', '#d8b070'], tip: 'Kylvä tammi- tai kesäkuussa talvi- ja kesäsadoksi.' },
    { id: 'oranges', name: 'Appelsiinit', w: 47, temp: { t: 'nofreeze' }, water: [3, 5], res: [0, 0, 0], store: [38, 45], perennial: true, hand: true, price: 11700, nutr: -10, col: ['#2f6f2a', '#f09a20'], tip: 'Lämmin ja hallaton ilmasto. Lannoita ennen istutusta.' },
    { id: 'peanuts', name: 'Maapähkinät', w: 22, temp: { t: 'nofreeze' }, water: [3, 4], res: [1, 0, 0], store: [15, 70], price: 4500, nutr: 12, col: ['#4f8a2f', '#c89a5a'], tip: 'Arka kylmälle. Palauttaa ravinteita maahan.' },
    { id: 'potatoes', name: 'Perunat', w: 17, temp: { t: 'dd', v: [2400, 2400] }, water: [5, 8], res: [1, 1, 1], store: [32, 38], price: 3750, nutr: -12, col: ['#4a8a30', '#b8905a'], tip: 'Kastele usein, mutta liika vesi mädättää. Vuorottele soijan tai maapähkinän kanssa.' },
    { id: 'rice', name: 'Riisi', w: 25, temp: { t: 'dd', v: [2400, 2400] }, water: [10, 13], res: [0, 0, 0], store: [46, 54], price: 5400, nutr: -14, col: ['#5aa040', '#d8d8a0'], tip: 'Pitää märästä. Lannoita ennen jokaista kylvöä.' },
    { id: 'sorghum', name: 'Durra', w: 22, temp: { t: 'dd', v: [105, 120] }, water: [3, 4], res: [1, 1, 1], store: [32, 60], price: 4050, nutr: -12, col: ['#6a9a30', '#a8442a'], tip: 'Lämpimän sään kasvi – vältä hallaa. Paras kylvöaika touko–kesäkuu.' },
    { id: 'soybeans', name: 'Soijapavut', w: 17, temp: { t: 'dd', v: [2400, 2400] }, water: [1, 2], res: [0, 0, 1], store: [46, 54], price: 3600, nutr: 18, col: ['#4f9a2a', '#c8b040'], tip: 'Ihanteellinen vuoroviljelyyn: lisää maahan ravinteita.' },
    { id: 'strawberries', name: 'Mansikat', w: 17, temp: { t: 'chill', v: [200, 1200] }, water: [6, 10], res: [0, 0, 0], store: [30, 38], hand: true, price: 4800, nutr: -10, col: ['#3f8f2f', '#e02a3a'], tip: 'Tarvitsee viileyttä kasvaessaan. Kylvä viileällä säällä helmi–maaliskuussa.' },
    { id: 'sugarbeets', name: 'Sokerijuurikkaat', w: 47, temp: { t: 'dd', v: [1800, 1800] }, water: [1, 2], res: [1, 0, 0], store: [30, 45], price: 8100, nutr: -14, ferSens: true, col: ['#4a9a3a', '#e8e0c8'], tip: 'Taimet ovat herkkiä – älä lannoita alkuvaiheessa.' },
    { id: 'sunflowers', name: 'Auringonkukat', w: 14, temp: { t: 'nofreeze' }, water: [5, 7], res: [0, 0, 0], store: [30, 50], price: 3150, nutr: -10, ferSens: true, col: ['#4f9a2a', '#f8d020'], tip: 'Herkkä lannoitteille alkuvaiheessa – odota noin kuusi viikkoa.' },
    { id: 'sweetpotatoes', name: 'Bataatit', w: 17, temp: { t: 'dd', v: [2500, 2500] }, water: [6, 8], res: [0, 0, 0], store: [55, 65], price: 4050, nutr: -10, col: ['#4a8a2f', '#c8603a'], tip: 'Lämpimät alueet. Korjaa kuivana aurinkoisena päivänä.' },
    { id: 'tobacco', name: 'Tupakka', w: 30, temp: { t: 'dd', v: [2000, 2000] }, water: [1, 3], res: [1, 0, 0], store: [60, 80], price: 6750, nutr: -16, col: ['#4a8a2a', '#b89a4a'], tip: 'Hedelmällinen, kostea maa, kun hallanvaara on ohi. Kostea, ei märkä.' },
    { id: 'tomatoes', name: 'Tomaatit', w: 13, temp: { t: 'dd', v: [200, 200] }, water: [6, 9], res: [0, 0, 0], store: [52, 58], hand: true, price: 3900, nutr: -12, col: ['#3f8a2a', '#e8302a'], tip: 'Kylvä vakaalla lämpimällä säällä (vähintään +13 °C). Kastele hyvin.' },
    { id: 'wheat', name: 'Vehnä', w: 34, temp: { t: 'nofreeze' }, water: [2, 3], res: [1, 0, 1], store: [50, 60], price: 5100, nutr: -12, col: ['#8aa040', '#e0c060'], tip: 'Suurten tasankojen kasvi: kuumat kesät ja kirkkaat päivät. Säilyy siilossa hyvin.' }
  ];
  FS.CROP = {};
  FS.CROPS.forEach(function (c, i) {
    c.idx = i;
    FS.CROP[c.id] = c;
    c.days = c.w * 7;
    c.regrowDays = c.perennial ? 364 : c.days;
    // Lämpösummasta johdettu ihanteellinen keskilämpö (pohja 50 °F)
    c.idealT = c.temp.t === 'dd' ? 50 + (c.temp.v[0] + c.temp.v[1]) / 2 / c.days : c.temp.t === 'chill' ? 55 : 65;
    var avg = (c.water[0] + c.water[1]) / 2;
    c.moist = 2.4 + avg * 0.55;                         // ihanteellinen kosteus asteikolla 0–11
    c.seed = Math.round(c.price * (c.perennial ? 0.22 : 0.07));
  });

  /* Koneet. size = ruutuja kartalla. */
  FS.MACHINES = [
    { id: 'tractor', name: 'Traktori', price: 400, size: 1, desc: 'Vetää auraa, kylvökonetta, ruiskua ja perävaunua.', life: 520 },
    { id: 'plow', name: 'Aura', price: 200, size: 1, desc: 'Valmistelee pellon kylvöä varten. Tarvitsee traktorin.', life: 520 },
    { id: 'planter', name: 'Kylvökone', price: 200, size: 1, desc: 'Kylvää siemenet. Tarvitsee traktorin ja siemenet.', life: 520 },
    { id: 'sprayer', name: 'Ruisku', price: 200, size: 1, desc: 'Levittää lannoitteet ja torjunta-aineet. Tarvitsee traktorin.', life: 520 },
    { id: 'harvester', name: 'Puimuri', price: 400, size: 2, desc: 'Korjaa sadon. Tarvitsee perävaunun ja kuorma-auton.', life: 520 },
    { id: 'trailer', name: 'Perävaunu', price: 200, size: 2, desc: 'Kuljettaa satoa korjuun aikana.', life: 520 },
    { id: 'truck', name: 'Kuorma-auto', price: 500, size: 2, desc: 'Vie sadon siiloon tai markkinoille.', life: 520 },
    { id: 'duster', name: 'Ruiskutuskone', price: 6000, size: 0, desc: 'Lentokone, joka ruiskuttaa kaikki pellot kerralla. Vaatii kaupunkiin lentokentän.', life: 780, needs: 'airport' }
  ];
  FS.MACHINE = {};
  FS.MACHINES.forEach(function (m) { FS.MACHINE[m.id] = m; });
  FS.JOBS = {
    plant: { name: 'Kyntö ja kylvö', needs: ['tractor', 'plow', 'planter'], days: 3 },
    spray: { name: 'Ruiskutus', needs: ['tractor', 'sprayer'], days: 1 },
    harvest: { name: 'Sadonkorjuu', needs: ['harvester', 'trailer', 'truck'], days: 3 },
    hand: { name: 'Käsinkorjuu', needs: ['truck'], days: 4, labor: 350 }
  };

  /* Rakennukset. w×h ruutua, cap = kapasiteetti. */
  FS.BUILDINGS = [
    { id: 'silo_s', name: 'Pieni siilo', price: 800, w: 2, h: 2, silo: 1, desc: 'Varastoi yhden sadon.' },
    { id: 'silo_l', name: 'Iso siilo', price: 2400, w: 3, h: 3, silo: 4, desc: 'Varastoi neljä satoa. Siilo voi räjähtää kuumalla säällä!' },
    { id: 'shed_s', name: 'Pieni vaja', price: 1200, w: 3, h: 2, cap: 6, desc: 'Suojaa 6 konetta säältä – koneet kuluvat hitaammin.' },
    { id: 'shed_l', name: 'Iso vaja', price: 1440, w: 4, h: 3, cap: 9, desc: 'Suojaa 9 konetta säältä.' },
    { id: 'barn_s', name: 'Pieni navetta', price: 2250, w: 3, h: 3, cap: 9, barn: true, desc: 'Eläinten suoja (9): parempi terveys ja arvo, vähemmän rehua ja vettä.' },
    { id: 'barn_l', name: 'Iso navetta', price: 2520, w: 4, h: 4, cap: 12, barn: true, desc: 'Eläinten suoja (12).' },
    { id: 'pump', name: 'Vesipumppu', price: 1000, w: 1, h: 1, water: true, desc: 'Pumppaa vettä joesta tai järvestä ojiin. Sijoita veden rantaan.' },
    { id: 'windmill', name: 'Tuulimylly', price: 2000, w: 1, h: 1, desc: 'Pumppaa kaivovettä viereiseen ojaan, kun tuulee vähintään 4,5 m/s.' },
    { id: 'tower', name: 'Vesitorni', price: 200, w: 1, h: 1, desc: 'Pitää vesikaukalot täynnä, kun viereisessä ojassa virtaa vettä.' }
  ];
  FS.BUILDING = {};
  FS.BUILDINGS.forEach(function (b) { FS.BUILDING[b.id] = b; });
  FS.HOMESTEAD = { id: 'home', name: 'Kotitila', w: 4, h: 4 };

  /* Kotieläimet. Ikä päivinä, rehu paalia kuukaudessa. */
  FS.ANIMALS = [
    { id: 'cow', name: 'Lehmä', price: 900, life: 20 * 364, feed: 0.25, mate: 15 * 30, gest: 10 * 30, max: 1.8, col: '#f4f0e8' },
    { id: 'pig', name: 'Sika', price: 250, life: 15 * 364, feed: 0.125, mate: 8 * 30, gest: 11 * 30, max: 1.9, col: '#f0a8a8' },
    { id: 'sheep', name: 'Lammas', price: 150, life: 10 * 364, feed: 0.0625, mate: 3 * 30, gest: 6 * 30, max: 1.8, col: '#e8e8e0' },
    { id: 'horse', name: 'Hevonen', price: 1200, life: 20 * 364, feed: 0.25, mate: 4 * 364, gest: 11 * 30, max: 1.6, col: '#8a5a32' }
  ];
  FS.ANIMAL = {};
  FS.ANIMALS.forEach(function (a) { FS.ANIMAL[a.id] = a; });

  FS.SPRAYS = [
    { id: 'fert', name: 'Lannoite', desc: 'Lisää ravinteita. Ei myrkytä maata.' },
    { id: 'pest', name: 'Hyönteismyrkky', desc: 'Torjuu tuholaiset. Lisää maan myrkyllisyyttä.' },
    { id: 'herb', name: 'Rikkakasvimyrkky', desc: 'Torjuu rikkaruohot. Lisää maan myrkyllisyyttä.' },
    { id: 'fung', name: 'Sienitautimyrkky', desc: 'Torjuu kasvitaudit. Lisää maan myrkyllisyyttä.' }
  ];
  FS.SPRAY = {};
  FS.SPRAYS.forEach(function (s) { FS.SPRAY[s.id] = s; });
  FS.SPRAY_COST = 200;
  FS.PLANT_COST = 120;
  FS.FEED_COST = 100;

  /* Rakennustyökalut. */
  FS.TOOLS = [
    { id: 'examine', short: 'Tutki', name: 'Tutki', key: 'T', desc: 'Näytä tietoa kohteesta. Pellon klikkaus avaa peltoikkunan.' },
    { id: 'move', name: 'Siirrä', key: 'S', desc: 'Siirrä kone, rehu tai vesikaukalo. Ohjaa eläimiä.' },
    { id: 'paved', short: 'Asfaltti', name: 'Asfalttitie', key: 'A', cost: 30, drag: true, desc: 'Koneet kulkevat teitä pitkin ja kuluvat vähemmän.' },
    { id: 'dirt', short: 'Hiekka', name: 'Hiekkatie', key: 'H', cost: 20, drag: true, desc: 'Halvempi tie. Pellon ja rakennuksen voi sijoittaa päälle.' },
    { id: 'fence', name: 'Aita', key: 'I', cost: 50, drag: true, desc: 'Pidä eläimet aitauksessa – muuten ne syövät pellot.' },
    { id: 'gate', name: 'Portti', key: 'P', cost: 75, desc: 'Koneet pääsevät portista, eläimet eivät. Klikkaa uudelleen avataksesi/sulkeaksesi.' },
    { id: 'ditch', name: 'Oja', key: 'O', cost: 35, drag: true, desc: 'Johtaa vettä pumpulta tai tuulimyllyltä pelloille. Kuiva oja kuivattaa.' },
    { id: 'valve', name: 'Venttiili', key: 'V', cost: 80, desc: 'Sijoita ojaan. Klikkaa avataksesi/sulkeaksesi veden virtauksen.' },
    { id: 'feed', name: 'Rehu', key: 'R', cost: 100, desc: 'Paali rehua eläimille aitauksen sisään.' },
    { id: 'trough', short: 'Kaukalo', name: 'Vesikaukalo', key: 'K', cost: 15, desc: 'Juomavesi eläimille. Vesitorni pitää kaukalot täynnä.' },
    { id: 'tree', name: 'Puut', key: 'U', cost: 10, drag: true, desc: 'Tuulensuoja: vähintään 8 puuta 2 ruudun etäisyydellä pellosta.' },
    { id: 'doze', short: 'Raivaa', name: 'Puskutraktori', key: 'D', cost: 25, drag: true, desc: 'Raivaa kivet, puut, tiet, aidat ja pellot.' }
  ];
  FS.TOOL = {};
  FS.TOOLS.forEach(function (t) { FS.TOOL[t.id] = t; });

  /* Ilmastoalueet: kuukausien keskilämpö °F, sadepäivät kuukaudessa, keskituuli mph.
   * Luvut ovat likimääräisiä alueen tyypillisiä arvoja. */
  FS.REGIONS = [
    { id: 'calif', name: 'Kalifornia', desc: 'Lämmin, kuiva kesä. Hedelmät ja mantelit.', t: [46, 51, 55, 61, 69, 76, 82, 80, 75, 65, 53, 46], r: [7, 7, 6, 3, 1, 0, 0, 0, 1, 2, 5, 6], wind: 6, river: true, lake: false },
    { id: 'pnw', name: 'Tyynenmeren luode', desc: 'Viileä ja sateinen. Omenat ja marjat.', t: [40, 44, 48, 52, 58, 63, 68, 68, 63, 54, 45, 39], r: [17, 15, 16, 13, 10, 7, 3, 3, 6, 11, 17, 18], wind: 7, river: true, lake: true },
    { id: 'desert', name: 'Lounaan aavikko', desc: 'Kuuma ja kuiva. Vaatii kastelua.', t: [54, 58, 63, 70, 79, 89, 93, 92, 87, 75, 62, 54], r: [3, 3, 3, 1, 1, 1, 4, 5, 3, 2, 2, 3], wind: 7, river: true, lake: false },
    { id: 'plains', name: 'Suuret tasangot', desc: 'Tuulinen. Vehnän ja durran maata.', t: [30, 35, 45, 55, 65, 75, 80, 78, 70, 58, 44, 33], r: [4, 5, 7, 8, 11, 10, 8, 8, 7, 6, 4, 4], wind: 13, river: false, lake: true },
    { id: 'midwest', name: 'Keskilänsi', desc: 'Maissivyöhyke: kylmä talvi, kostea kesä.', t: [20, 25, 37, 50, 61, 71, 75, 73, 65, 52, 38, 24], r: [7, 7, 9, 11, 12, 11, 9, 9, 8, 8, 7, 7], wind: 11, river: true, lake: false },
    { id: 'northeast', name: 'Koillinen', desc: 'Tasaiset sateet, viileät talvet.', t: [27, 29, 38, 49, 60, 68, 73, 71, 64, 52, 42, 32], r: [11, 10, 11, 11, 12, 11, 10, 9, 9, 9, 10, 11], wind: 9, river: true, lake: true },
    { id: 'southeast', name: 'Kaakko', desc: 'Lämmin ja kostea. Puuvilla ja maapähkinä.', t: [45, 49, 56, 63, 71, 78, 81, 80, 75, 64, 55, 47], r: [10, 9, 9, 7, 8, 10, 11, 10, 7, 6, 8, 9], wind: 7, river: true, lake: false },
    { id: 'florida', name: 'Florida', desc: 'Subtrooppinen. Appelsiinit ja sokeriruoko.', t: [61, 63, 67, 71, 77, 81, 83, 83, 81, 75, 68, 62], r: [6, 6, 6, 5, 7, 14, 16, 16, 13, 7, 5, 6], wind: 8, river: false, lake: true },
    { id: 'texas', name: 'Teksas', desc: 'Kuuma kesä, leuto talvi.', t: [52, 56, 63, 70, 77, 83, 85, 85, 80, 71, 61, 54], r: [7, 6, 6, 6, 7, 6, 4, 5, 7, 6, 6, 7], wind: 10, river: true, lake: false },
    { id: 'finland', name: 'Etelä-Pohjanmaa (bonus)', desc: 'Vaikea: lyhyt kesä ja pitkä talvi. Kokeile perunaa, porkkanaa, salaattia ja mansikkaa.', t: [17, 16, 24, 36, 49, 58, 63, 59, 49, 39, 30, 22], r: [11, 9, 8, 7, 7, 8, 9, 11, 11, 12, 12, 12], wind: 9, river: true, lake: false }
  ];
  FS.REGION = {};
  FS.REGIONS.forEach(function (r) { FS.REGION[r.id] = r; });

  /* Kaupungin rakennustyypit, joista pelaaja äänestää kaupungin laajentuessa. */
  FS.TOWN_TYPES = [
    { id: 'homes', name: 'Asuinalue', desc: 'Lisää veronmaksajia: kaupunki kasvaa nopeammin.' },
    { id: 'shops', name: 'Kauppakatu', desc: 'Siemenet ja rehu 10 % halvemmalla.' },
    { id: 'market', name: 'Tukkutori', desc: 'Sadoista 5 % parempi hinta.' },
    { id: 'jobs', name: 'Työnvälitys', desc: 'Parempia tilanhoitajia: idle-tehon yläraja +25 %-yks. ja 6 h pidempi poissaolo.' },
    { id: 'school', name: 'Maatalouskoulu', desc: 'Hoitaja osaa enemmän: idle-tehon yläraja +15 %-yks.' },
    { id: 'airport', name: 'Lentokenttä', desc: 'Mahdollistaa ruiskutuskoneen ostamisen.' },
    { id: 'fair', name: 'Messualue', desc: 'Karjanäyttelyt: palkintoja hyvistä eläimistä.' },
    { id: 'factory', name: 'Tehdas', desc: 'Paljon verotuloja kaupungille, mutta lisää ympäristön myrkyllisyyttä.' }
  ];
  FS.TOWN_TYPE = {};
  FS.TOWN_TYPES.forEach(function (t) { FS.TOWN_TYPE[t.id] = t; });

  /* Kotitilan tasot: vuoden tuloksen kynnys tason nostoon ja idle-hyödyt. */
  FS.HOME_LEVELS = [
    { name: 'Mökki', profit: 0 },
    { name: 'Maalaistalo', profit: 8000 },
    { name: 'Iso maalaistalo', profit: 20000 },
    { name: 'Kartano', profit: 45000 },
    { name: 'Suurtila', profit: 90000 }
  ];

  /* Idle-ajan (tilanhoitajan) säädöt. */
  FS.IDLE = {
    daysPerHour: 28,      // peliaikaa poissaolotuntia kohden 100 %:n teholla
    baseMax: 0.5,         // idle-tehon yläraja alussa
    perHomeLevel: 0.2,    // + kotitilan tasoa kohden
    baseHours: 8,         // laskettava poissaolo enintään (tuntia)
    hoursPerLevel: 4,
    wageBase: 40,         // hoitajan viikkopalkka 100 %:n teholla
    wagePerField: 20,
    wagePerAnimal: 3,
    wageExp: 1.5          // palkka kasvaa teholla jyrkemmin kuin tuotto
  };

  FS.DISASTERS = [
    { id: 'tornado', name: 'Tornado' },
    { id: 'locusts', name: 'Heinäsirkat' },
    { id: 'drought', name: 'Kuivuus' },
    { id: 'flood', name: 'Tulva' },
    { id: 'frost', name: 'Halla' },
    { id: 'windstorm', name: 'Myrsky' }
  ];
})();
