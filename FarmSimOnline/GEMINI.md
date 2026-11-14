# FarmSimOnline

Maatilasimulaattori selaimeen. Lajityypin esikuva on 1990-luvun maatilasimulaatio. **Alkuperäisen pelin nimeä, grafiikoita, ääniä tai tekstejä ei käytetä.**

## Rakenne
- `js/`: util, data, world, sim, econ, actions, idle, save, gfx, render, net, ui, main. Tavallisia skriptejä globaalissa `FS`-oliossa.
- Grafiikka piirretään koodilla (`gfx.js`). Retrotyyli: 16 värin paletti ja automaattinen rasterointi (`quantize`, `FS.retro`, oletuksena päällä) sekä puukehykset (`body.retro`).
- `api/farm.php` hoitaa PHP+JSON-tallennuksen (`api/data/` on suojattu `.htaccess`:llä).
- `docs/simfarm-mekaniikka.md` on mekaniikkatiivistelmä. `docs/og-analyysi.md` sisältää tiedostomuotohavainnot.

## Päätökset
- Julkaisu Kapsiin `/CC/`-kansioon PIN-portin taakse.
- Tunnistus: nimimerkki ja pelin antama salakoodi, ei sähköpostia.
- Idle-aika = "tilanhoitaja": pelaaja valitsee tehon liukusäätimellä. Teho määrää poissaolon peliajan ja hoitajan palkan (eksponentti 1.5). Yläraja kasvaa kotitilan tasosta sekä kaupungin työnvälityksestä ja koulusta.
- Palautteen perusteella korjattu: eläimet kävelevät rehulle ja vedelle (BFS), portit ja venttiilit avautuvat Tutki-työkalulla tai hiiren oikealla, työkalunapit ovat isommat ja äänestystulos näkyy prosentteina.
- Käyttäjä toivoi myöhemmin suoraa porttausta omana projektinaan. Suositeltu malli on uusi moottori, joka lukee käyttäjän omat alkuperäistiedostot ajonaikaisesti (OpenTTD-tyyli). **Alkuperäistiedostoja ei koskaan jaeta tai lisätä repoon.** Niitä ei myöskään pureta eikä ajeta ilman pyyntöä.

## Testaus
- `python scripts/mock_server.py` (portti 8770) jäljittelee PHP:tä.
- `scripts/test-headless.sh sim|flow|dom|shot`: `sim` on tasapainotesti, `flow` testaa kirjautumisen, tallennuksen ja käyttöliittymän.
- `farm.php` on tarkistettu vain lukemalla. Testaa se oikealla PHP:llä, jos mahdollista.
- Kapsi-julkaisuohje on README.md:ssä.
