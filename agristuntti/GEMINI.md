# AgriStuntti (työnimi)

3D-stunttiajopeli maatalouskoneilla ja rataeditori. Lajityyppi on 90-luvun stunttiajopeli, mutta peli on oma eikä kopio.

## Päätökset
- Grafiikka on sekä retro (90-luvun kulmikas) että moderni, ja tyyliä voi vaihtaa.
- Ratamodaus tehdään ruudukkoeditorilla. Radat jaetaan koodina (AS1) tai tiedostona.
- Kalusto on sama kuin AgriRallissa (7 konetta).

## Rakenne
- three.js r160 on vendoroitu kansioon `peli/lib`.
- Fysiikka, radat ja tekoäly ovat puhdasta JS:ää: `data`, `pieces`, `track`, `physics`, `ai`, `race` ja `tracks`.
- Juuren `package.json` (`{type: module}`) on vain Node-testejä varten.

## Testaus
- Node:
  - `node scripts/sim.js` ajaa kaikki radat kaikilla koneilla, ja kaikkien pitää päästä maaliin (56/56).
  - `test-steer.js`.
  - `design.js` tarkistaa kilpikonnaohjelman sulkeutumisen.
  - `map.js` piirtää ASCII-kartan.
  - `debug-*.js` ovat debug-skriptejä.
- Selaimessa: palvelin portissa 8778 ja `scripts/test-headless.sh`, jossa on lippu `--enable-unsafe-swiftshader`, jotta WebGL toimii. Editorin kuvakaappaus vaatii `VT=9000`.
- Tila: 8 rataa, haamu, 3 tekoälyvastustajaa, uusinta, 5 kameraa sekä retro- ja modernityyli. Ihmisen ajotuntuma on testaamatta.

## Fysiikan opit
- Tiepinnat ovat ohuita laattoja, joten alapinnan ja kylkien syvyysraja on pieni.
- Silmukka on klotoidi.
- Telakoneen sivukitka ei saa kääntää konetta.
- Takapyöräohjaus ja 4WS häivytetään vauhdissa.
- Tekoäly on Stanley-ohjain.
- Kallistus lasketaan sivuttain, koska silmukassa `uy < 0` aiheutti NaN:n.
