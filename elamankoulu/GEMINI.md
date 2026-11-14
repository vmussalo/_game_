# Elämänkoulu

2D-taistelupeli arjen hahmoilla. Lajityyppi on kaksintaistelupeli, mutta peli on oma. Väkivaltaa on vähemmän kuin lajityypin brutaaleimmissa peleissä, eikä mukana ole maatalousteemaa. Voittaja jakaa elämänohjeen.

## Sisältö
- 8 hahmoa: Kaisa Kahvi, Jere Joogi, Mummo Martta, Leevi Läppäri, Saara Sähköpyörä, Rami Remontti, Iida Influensseri ja pomo Hannu Hustle. Hannu avautuu, kun pelihalli on läpäisty tai URL:ssa on `all`.
- Verta ei ole: tyrmäys on OIVALLUS, ja superliikkeellä ratkaistu ottelu on OPETUS. Elämänohjeet kertyvät Opetuskirjaan (56 kpl).
- Mekaniikat:
  - Jaksaminen.
  - Hengitä-torjunta: täydellinen ajoitus jähmettää hyökkääjän.
  - Uupumus.
  - Lepohetki (↓ + Hengitä).
- Ohjaustapa on klassinen tai moderni. Pelitilat: pelihalli, kaksinpeli samalla näppäimistöllä, harjoittelu nukella ja katsojatila.
- Ammukset kulkevat rintakorkeudella (y = 92), jotta niiden yli voi hypätä.

## Rakenne
- `peli/` julkaistaan (PWA). **Luvut ovat tiedostossa `data.js` ja tekstit tiedostossa `text.js`.**

## Testaus
- Node:
  - `scripts/test-input.js` (26 syötetestiä)
  - `sim.js` (tekoäly vastaan tekoäly, voitto-%)
  - `sim-moves.js` (vahingon lähteet).
- Selaimessa: palvelin portissa 8779, `python scripts/ui_testi.py` (Playwright) ja `scripts/test-headless.sh shot "test&...&ff=N"`.
- Headless-Chromen rAF ei etene virtuaaliajassa, joten `ff` ajetaan synkronisesti käynnistyksessä.
- Tasapaino: tekoälyotteluissa voitto-% on noin 35–65. Hannu voittaa noin 60–67 % (tarkoituksella, koska hän on pomo). Ihmisen tuntuma on testaamatta.
