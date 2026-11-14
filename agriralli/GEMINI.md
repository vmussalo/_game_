# AgriRalli (työnimi)

Taisteluralli maatalouskoneilla. Lajityyppi on top-down combat racing, mutta peli on oma. Teemoja on kaksi: rosoinen dystopia ja suomalainen kyläraitti. Kalusto ulottuu ruohonleikkurista linkkutraktoriin ja kaivinkoneeseen. Mukana on koko ura heti.

## Rakenne
- `peli/` julkaistaan (PWA, sw.js `cacheable()`), `scripts/` on testaukseen.
- **Kaikki luvut ovat tiedostossa `data.js` ja tekstit tiedostossa `text.js`.**
- Tekoälyn kehitys: `career.js updateDrivers` (g = day/40).
- Pikakisassa on paikallinen kaksinpeli jaetulla ruudulla: `race.players`, `car.pid`, `car.banner`, `Input.state(pid)` ja `render.js views()`. Toinen pelaaja käyttää WASD-näppäimiä, toinen nuolinäppäimiä.
- Täysi hööki -ajotapa: kaasu on aina pohjassa ja turbo latautuu itsestään (`AR.HOOKI` data.js:ssä).
- Ura on yksinpeli.

## Testaus
- Palvelin portissa 8774.
- Node-simulaatiot ilman selainta: `validate-tracks`, `sim-race`, `sim-career`, `sim-final` ja `test-career` (`node scripts/<nimi>.js`).
- Selaimessa: `scripts/test-headless.sh` ja `ff=N`.

## Tasapaino
- Varovainen botti nousee kärkeen noin 35.–40. päivänä, mutta ei ehdi finaaliin 80 päivässä. Syy on se, että pomo vaatii kaivinkoneen tasolla 4 (noin 120 000).
- Ihmisen pelikokemus on testaamatta, joten käyttäjän palaute ohjaa.

## Ideat
- Nettimoninpeliä on ehdotettu, mutta sitä ei ole tehty. Kapsi on PHP-pohjainen, eikä jatkuvasti käynnissä olevan WebSocket-palvelimen soveltuvuutta ole tarkistettu. Vaihtoehto on WebRTC ja PHP-signalointi.
