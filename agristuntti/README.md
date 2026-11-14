# AgriStuntti (työnimi): 3D-stunttiajo maatalouskoneilla

Selaimessa toimiva 3D-ajopeli, jossa ajetaan aikaa vastaan silmukoita, hyppyreitä, siltoja ja kallistettuja kaarteita.
Kalustona on sama porukka kuin AgriRallissa: ajoleikkuri, mönkijä, pikkutraktori, kurottaja, linkkutraktori, puimuri ja kaivinkone.
Mukana on rataeditori, ja omat radat voi jakaa ratakoodina tai tiedostona.

Peli on lajityypin klassikoiden henkinen mutta oma: radat, palat, koneet, grafiikka ja nimet on tehty tähän peliin.

## Julkaisu
Kopioi **`peli/`-kansion sisältö** kotisivutilaan (esim. `…/agristuntti/`). Palvelinohjelmia ei tarvita.
`scripts/` ja juuren `package.json` ovat vain testausta varten, eikä niitä julkaista.
Peli asentuu sovellukseksi (PWA) ja toimii myös PIN-suojatussa kansiossa (`manifest.json`, evästeet mukana).
Isossa päivityksessä kasvata `peli/sw.js`:n `VERSION`-arvoa.

three.js (r160, MIT-lisenssi) on mukana tiedostossa `peli/lib/`, joten peli ei hae mitään ulkopuolisilta palvelimilta.

## Ohjaus
| Toiminto | Näppäimistö | Peliohjain | Kosketus |
|---|---|---|---|
| Ohjaus | ← → / A D | vasen tikku | ◀ ▶ |
| Kaasu | ↑ / W | RT tai A | ▲ |
| Jarru / peruutus | ↓ / S / välilyönti | LT tai B | ▼ |
| Kamera (takaa, kaukaa, konepelti, TV, ylhäältä) | C | Y | 🎥 |
| Takaisin radalle | R | Back | ↺ |
| Tauko | Esc / P | Start | II |

## Pelin sisältö
- **8 valmista rataa:** harjoituslenkki, tiukat mutkat, sillat, silmukat, hypyt veden yli, kahdeksikko risteyksellä sekä kaiken yhdistävä lähdöstä maaliin -rata.
- **Ratapalat:** suora, lähtö, maali, jyrkkä mutka, loiva kaarre (2×2), kallistettu kaarre (2×2), nousu, hyppyri, silmukka (1×2), kumpare ja risteys.
  Korkeustasoja on 0–4. Korkeiden osien alle tulee pylväät, ja maan tasolla olevat palat seisovat penkereen päällä.
- **Fysiikka:** jousitetut pyörät, painonsiirrot, luisto ja kaatuminen. Silmukassa pyörät painavat rataa vasten, joten vauhti ratkaisee.
  - Kaivinkone kääntyy teloillaan.
  - Kurottaja ja linkku kääntävät molempia akseleita.
  - Puimuri kääntää takapyöriään.
- **Kolarit:** kova törmäys, katolleen kääntyminen tai veteen ajaminen palauttaa koneen radalle hetken kuluttua. Aika juoksee koko ajan.
- **Tarkistuspisteet:** reitin osat pitää ajaa järjestyksessä, eikä pitkiä oikaisuja hyväksytä.
- **Vastustajat:** oma haamu (paras ajo) tai kolme tietokonekuskia (helppo, keski ja kova). Tietokonekuskit ajavat samaa fysiikkaa kuin pelaaja.
- **Uusinta:** jokaisen kisan jälkeen. Toistoa voi hidastaa, nopeuttaa ja kelata taaksepäin, ja kamerakulmia on viisi (oletuksena TV-kamerat).
- **Grafiikkatyylit:** *Retro* on kulmikas, pikselöity ja kevyt. *Moderni* tuo varjot, sumun, sävytyksen ja tarkan kuvan. Tyyli vaihdetaan asetuksista.

## Rataeditori
- Valitse pala ja klikkaa ruudukkoa. **R** kiertää, ja **+** ja **−** vaihtavat tasoa. Oikea hiiren nappi poistaa.
- Nousupala nostaa tasoa yhdellä, ja käännettynä se laskee.
- Hyppyrin taakse tarvitaan vastakkain käännetty hyppyri alastuloksi 1–4 ruudun päähän samalle korkeudelle. Väliin voi laittaa vettä.
- Rata alkaa lähtöruudusta ja päättyy joko maaliruutuun tai palaa lähtöön (kierros). Editori kertoo heti, jos rata katkeaa, ja näyttää kohdan.
- Valmiista radasta voi tehdä oman kopion (**Muokkaa valittua**).
- **Jakaminen:**
  - **Ratakoodi** (`AS1:…`, n. 600–1000 merkkiä) kopioidaan leikepöydälle, ja kaveri tuo sen kohdasta *Tuo ratakoodi*.
  - Radan voi myös tallentaa tiedostoksi `.agristuntti.json`.
  - Rikkinäinen tai muokattu koodi ei kaada peliä, koska arvot tarkistetaan.

Kaikki (omat radat, ennätykset ja haamut) tallentuu vain selaimen localStorageen.

## Tiedostot
`peli/js/`:
- `data`: kaikki luvut ja kalusto
- `pieces`: ratapalojen muodot
- `track`: sijoitus, reitin jäljitys, geometria ja törmäykset
- `physics`: ajoneuvofysiikka
- `ai`: autopilotti
- `race`: kisan kulku ja uusinnan tallennus
- `tracks`: valmiit radat
- `models`: koneiden 3D-mallit
- `scene`: three.js-näkymä, tyylit ja kamerat
- `game`: kisa käynnissä, HUD ja uusinta
- `editor`, `ui`, `input`, `audio` ja `storage`
- `main`: käynnistys

Fysiikka, radat ja tekoäly ovat puhdasta JavaScriptiä ilman selainta, joten ne testataan Nodella.

## Testaus
Paikallinen palvelin: `python -m http.server 8778 --bind 127.0.0.1` agristuntti-kansiossa → http://127.0.0.1:8778/peli/

| Komento | Mitä tekee |
|---|---|
| `node scripts/sim.js` | autopilotti ajaa kaikki radat kaikilla koneilla: ajat, kolarit, pääseekö maaliin |
| `node scripts/test-steer.js` | jokainen kone kääntyy oikeaan suuntaan eri nopeuksilla |
| `node scripts/test-code.js` | ratakoodi → rata → koodi säilyttää radan, rikkinäinen koodi ei kaada |
| `node scripts/map.js [RATA]` | radan ASCII-kartta |
| `node scripts/design.js I J SUUNTA "OHJELMA"` | uuden radan suunnittelu kilpikonnakomennoilla: sulkeutuuko kierros |
| `node scripts/debug-*.js` | vianetsintä (kolarin syy, säde, tekoälyn ohjaus) |
| `scripts/test-headless.sh shot "parametrit" L K kuva.png` | kuvakaappaus Chromella ilman ikkunaa (ohjelmistopohjainen WebGL) |

URL-testiparametrit: `?track=N&veh=N&opp=ei|haamu|helppo|keski|kova`, `&auto` (tekoäly ajaa), `&ff=SEKUNTIA` (pikakelaus),
`&cam=0–4`, `&style=retro|moderni`, `&replay` (uusinta maalin jälkeen), `?screen=tracks|setup|editor|settings|help`, `&touch` ja `&mute`.

## Tasapaino ja tila
- Autopilotti pääsee maaliin kaikilla 8 radalla kaikilla 7 koneella (56/56). Vaikeilla radoilla se kolaroi välillä, mikä kuuluu lajiin.
- Ihmisen ajotuntuma on vielä testaamatta. Näppäimistöllä ohjauskulma pienenee vauhdin kasvaessa, ja herkkyys säädetään `physics.js`:n `maxA`-kaavassa.
- Hyppyrin vaatima vauhti kasvaa raon mukana: 1 ruutu noin 80 km/h, 2 ruutua noin 105 km/h. Hitaimmat koneet juuri ja juuri ylittävät 2 ruudun raon.
