# Elämänkoulu – tekninen ohje

## Käynnistys paikallisesti

```
cd elamankoulu
python -m http.server 8779 --bind 127.0.0.1
```
Avaa selaimessa http://127.0.0.1:8779/peli/

## Julkaisu
Kopioi `peli/`-kansio sellaisenaan palvelimelle (esim. Kapsi). Peli on PWA: `sw.js` tallentaa tiedostot välimuistiin, joten peli toimii myös ilman verkkoa. Kun lisäät tai poistat tiedostoja, päivitä `sw.js`:n `ASSETS`-lista ja kasvata `VERSION`-arvoa.
`scripts/`-kansio on vain testejä varten, eikä sitä julkaista.

## Tiedostot (peli/js)
| Tiedosto | Sisältö |
|---|---|
| util.js | apufunktiot, toistettava satunnaisluku, tallennus |
| text.js | kaikki tekstit: repliikit, elämänohjeet, loput |
| data.js | **kaikki tasapainoluvut**: vakiot, perushyökkäykset, hahmot, vaikeustasot |
| moves.js | liikkeiden kääntäjä (data → ruutuaikajanat) |
| fighter.js | taistelija: syöte, liikesarjat, puskuri, tilakone, fysiikka |
| battle.js | ottelu: osumat, torjunta, Hengitä, heitot, superit, erät, kamera |
| ai.js | tietokonevastustaja (painaa virtuaalisia nappeja) |
| poses.js, rig.js | luurankoasennot ja hahmojen piirto |
| stages.js | 8 areenaa parallaksikerroksina |
| render.js | ottelun piirto, efektit, mittarit |
| audio.js | syntetisoidut äänet ja musiikki |
| input.js | näppäimistö, peliohjaimet, kosketus |
| ui.js, main.js | näkymät ja pääsilmukka |

Logiikka (util, text, data, moves, fighter, battle, ai) toimii ilman selainta, joten sitä voi testata Nodella.

## Testit
- `node scripts/test-input.js` – liikesarjat, moderni ohjaus, heitto, syöksy, Hengitä, Lepohetki, ketjut, kumoamiset ja torjunta (26 tarkistusta)
- `node scripts/sim.js [otteluita/pari] [taso 0-3] [hahmo1] [hahmo2]` – tekoäly vastaan tekoäly kaikilla pareilla: voitto-%, NaN-arvot, jumit
- `node scripts/sim-moves.js` – mistä liikkeistä vahinko syntyy, hahmoittain
- `python scripts/ui_testi.py` – Playwright-testi oikeassa Chromessa (valikot, näppäimet, hiiri, kaksinpeli, kosketus). Palvelimen pitää olla käynnissä.
- `scripts/test-headless.sh shot "test&p1=kaisa&p2=rami&cpu=both&ff=900" 960 540 kuva.png` – kuvakaappaus, kun peliä on kelattu 900 ruutua eteenpäin
- `scripts/poses.html?mode=poses&ch=kaisa` – kaikki asennot yhdellä sivulla; `?mode=chars` näyttää kaikki hahmot

URL-parametrit: `test` (ei service workeria), `ff=N` (kelaa N ruutua), `spd=N` (nopeutus), `hitbox` (osumalaatikot), `scene=title|select|vs|book|help|settings|ending`, `all` (Hannu auki), `seed=N`, `nointro`.
