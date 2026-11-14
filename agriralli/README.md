# AgriRalli (työnimi): taisteluralli maatalouskoneilla

Ylhäältä kuvattu taisteluralli selaimessa. Ajetaan kisoja rahasta ja sarjapisteistä, ammutaan ja rammataan vastustajia,
viritetään konetta varikolla ja noustaan ruohonleikkurista kaivinkoneeseen. Pelissä on kaksi teemaa:
**rosoinen dystopia** ja **suomalainen kyläraitti**. Teeman voi vaihtaa päävalikosta milloin tahansa, ja ura säilyy.
Peli on alkuperäinen genrepeli: nimet, radat, grafiikka ja tekstit ovat omia.

## Julkaisu
Kopioi **`peli/`-kansion sisältö** kotisivutilaan (esim. `…/agriralli/`). Palvelinohjelmia ei tarvita.
`scripts/` on vain testaukseen, eikä sitä julkaista. Peli toimii myös PIN-suojatussa kansiossa (`manifest.json`, evästeet mukana).
Isossa päivityksessä kasvata `peli/sw.js`:n `VERSION`-arvoa. Ura tallentuu selaimen localStorageen (`agriralli.ura.v1`).

## Ohjaus
| Toiminto | Näppäimistö | Kosketus | Peliohjain |
|---|---|---|---|
| Ohjaus | ← → / A D | ◀ ▶ | vasen tikku, ristiohjain |
| Kaasu / jarru | ↑ ↓ / W S | ▲ ▼ (automaattikaasu oletuksena) | RT / LT |
| Ase | välilyönti, Ctrl | ✷ | A |
| Miina / lantakasa | Z, C | ⬣ | B |
| Turbo (nitro / pontikka) | Shift, X | » | X, RB |
| Kauha (vain kaivinkone) | V, E | ⤼ | Y, LB |
| Tauko | Esc, P | II | Start |

### Kaksinpeli (sama näppäimistö, jaettu ruutu)
Päävalikon **Kaksinpeli** tai Pikakisa → Pelaajat 2. Vaakanäytöllä näkymät ovat vierekkäin, pystynäytöllä päällekkäin.
Kisa jatkuu, kunnes molemmat pelaajat ovat maalissa tai romuna. Vastustajia voi olla 0–4.

| Toiminto | Pelaaja 1 | Pelaaja 2 |
|---|---|---|
| Ohjaus, kaasu, jarru | W A S D | nuolet |
| Ase | välilyönti, vasen Ctrl | piste (.), oikea Ctrl, Num 0 |
| Turbo | vasen Shift | viiva (-), oikea Shift, Num , |
| Miina | Q | pilkku (,), Num 1 |
| Kauha | E | M, Num 2 |

Peliohjaimet: kahdella ohjaimella ensimmäinen ohjaa pelaajaa 1 ja toinen pelaajaa 2. Yksi ohjain menee pelaajalle 2, ja pelaaja 1 ajaa näppäimistöllä.
Halvoilla näppäimistöillä kaikki näppäinyhdistelmät eivät välttämättä rekisteröidy yhtä aikaa (ghosting), jolloin peliohjain auttaa.

### Täysi hööki (ajotapa pikakisassa)
Kaasu on koko ajan pohjassa kaikilla, myös tekoälyllä. Jarrua ei ole: jarrunappi peruuttaa vain, kun kone on lähes pysähdyksissä (jumista pois).
Turbo latautuu itsestään (0,45 s sekunnissa, aloitus 5 s). Seinävauriot ovat 60 % normaalista. Luvut ovat `data.js`-tiedoston `AR.HOOKI`-asetuksessa.

## Ura
- **Päivä = yksi kisa.** Tarjolla on kolme sarjaa (helppo, keski, vaikea). Vastustajat valitaan sarjataulukon sijoituksen mukaan.
- **Tulot:** sijoituspalkinto, tappopalkkio romutetuista ja radalta poimitut rahapussit. Romutettu pelaaja ei saa sijoituspalkintoa.
- **Vauriot säilyvät.** Korjaa varikolla. Ilmainen hätäkorjaus (rautalanka tai jeesusteippi) nostaa kunnon 35 %:iin, joten peli ei voi jumittua.
- **Viritykset:** moottori, renkaat tai telat, panssari, ase (5 asetta), puskupiikit. Uutta konetta ostettaessa vanha menee vaihdossa
  puoleen hintaan (kone + viritykset), ja uuden koneen viritykset alkavat alusta.
- **Sabotaasi** (hiekkaa vaihteistoon / sokeria tankkiin): yksi vastustaja lähtee kisaan puolikuntoisena.
- **Lainahai:** korko 6 % päivässä, eräpäivä 7 päivän päästä. Myöhästyminen: perijät pudottavat kunnon 40 %:iin, vievät yhden virityksen ja lisäävät velkaan 25 %.
- **Finaali:** kun nouset sarjataulukon kärkeen (pomon ja kaikkien kuskien edelle), päivän tarjouksiin tulee finaali pomokuskia vastaan.
  Voitto avaa lopputekstin, minkä jälkeen ura jatkuu.

## Kalusto
| Kone | Hinta | Erikoista |
|---|---|---|
| Ajoleikkuri | aloitus | kylkiterät: kylkikosketus satuttaa 1,3× |
| Mönkijä | 2 600 | kevyt ja nopea |
| Pikkutraktori | 8 500 | kestävä |
| Kurottaja | 16 000 | piikit: keularammaus 2,1× |
| Linkkutraktori | 27 000 | runko-ohjattu (taittuu keskeltä), raskas |
| Puimuri | 41 000 | leveä leikkuupöytä: rammaus 2,5× |
| Kaivinkone | 62 000 | telat (kääntyy paikallaan), kauha heittää vastustajan sivuun |

Kaikki luvut ovat tiedostossa `peli/js/data.js`, ja tekstit molemmille teemoille tiedostossa `peli/js/text.js`.

## Tiedostot
`peli/js/`: `util` (apufunktiot), `text` (teemojen tekstit), `data` (luvut), `track` (radan geometria), `trackart` (radan piirto),
`vehdraw` (koneiden piirto), `race` (fysiikka, aseet, tekoäly), `render` (kamera, partikkelit, HUD), `input`, `audio` (syntetisoidut äänet),
`career` (ura ja kauppa), `ui` (valikot), `main` (silmukka ja testikoukut).

## Testaus
Paikallinen palvelin: `python -m http.server 8774 --bind 127.0.0.1` agriralli-kansiossa → http://127.0.0.1:8774/peli/

| Komento | Mitä tekee |
|---|---|
| `node scripts/validate-tracks.js` | ratojen eri osat eivät ole liian lähellä toisiaan |
| `node scripts/sim-race.js all KONE TASO` | tekoälykisat kaikilla radoilla: ajat, voittaja ja vauriolähteet |
| `node scripts/sim-career.js PÄIVIÄ TAITO` | autopilotti pelaa uraa: rahat, kone ja sarjasijoitus päivittäin |
| `node scripts/sim-final.js KONE TASO KERTOJA` | finaalin vaikeus tietyllä kalustolla |
| `node scripts/test-career.js` | uran sivupolut: laina, perijät, sabotaasi, kauppa ja finaali |
| `node scripts/test-input.js` | kaksinpelin näppäinjako: kumpikin puolisko ohjaa vain omaa konettaan |
| `HOOKI=1 node scripts/sim-race.js all KONE TASO` | sama kisasimulaatio täysi hööki -tilassa |
| `scripts/test-headless.sh shot "parametrit" L K kuva.png` | kuvakaappaus Chromella ilman ikkunaa |

URL-testiparametrit: `?theme=kyla`, `?quick=RATA&veh=KONE&lv=TASO&n=VASTUSTAJIA`, `&players=2&veh2=KONE` (kaksinpeli), `&hooki` (täysi hööki), `?auto` (autopilotti), `?ff=SEKUNTIA` (pikakelaus),
`?career=new&screen=hub|shop|dealer|races|standings|shark|ending|race&offer=N&cash=N`, `?nodemo` (ei taustakisaa), `?touch` (kosketusnapit), `?mute`.
Headless-tilan virtuaaliaika etenee hitaasti, joten pelin kulkua testataan `ff`-pikakelauksella.

## Tasapainon nykytila (simulaatio)
- Autopilotti, joka ajaa varovasti keskisarjaa, nousee sarjataulukon kärkeen noin 35.–40. päivänä.
- Finaali vaatii simulaatiossa kaivinkoneen noin tasolla 4 (tasolla 4 noin 60 % voitoista, tasolla 3 ei voittoja). Siihen tarvitaan noin 120 000,
  mikä tarkoittaa käytännössä vaikean sarjan kisoja. Varovainen botti ei ehtinyt finaaliin 80 päivässä.
- Ihmisen kokemus on vielä testaamatta. Ihminen ajaa suorilla täysillä, mitä tekoäly ei tee, ja ottaa todennäköisesti enemmän riskiä vaikeassa sarjassa.
- Tekoälykuskien kalusto paranee taidon mukaan: helppo sarja pysyy kevyillä koneilla, ja huippukuskit nousevat kaivinkoneisiin noin 40 päivässä.
