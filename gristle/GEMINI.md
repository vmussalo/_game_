# Gristle & Glitter

Isometrinen vuoropohjainen joutomaa-CRPG. Lajityyppi on klassinen post-apo-CRPG, mutta peli on oma eikä käytä esikuvan nimiä tai ulkoasua.
- Maailmana on biopunk-länsi ("Meat & Chrome"), jossa tivolikillat toimivat valtioina.
- Tyyli on esirenderöity, ja ikäraja K16.
- **Pelin kieli on englanti, mutta keskustelu käyttäjän kanssa käydään suomeksi.**

## Rakenne
- `DESIGN.md` on koko pelin runko: 3 näytöstä, noin 18 paikkaa ja 7 ryhmittymää.
- `GRAFIIKKA.md` on PNG-vaihto-ohje ja sisältää ComfyUI-promptit (`gfx/manifest.js`, avaimet `char/`, `obj/`, `portrait/`, `ground/` ja `icon/`).
- `game/` on pelkkä selainpeli ilman build-vaihetta. Se toimii myös `file://`-osoitteesta.
  - Logiikka on selaimesta riippumatonta: `js/core` (util, mapgen, game, combat, acts, dialog, world) ja `js/data` (rules, items, creatures, maps, scripts, dialogues).
  - Selainosat: `js/ui` (sprites, render, worldmap, ui, screens, audio) ja `js/main.js`.

## Testaus
- Node:
  - `node scripts/test_core.js`: rakenne, dialogigraafi ja saavutettavuus (892 tarkistusta).
  - `node scripts/playthrough.js [fighter|talker|sneaker] [seed] [-v]`: botti pelaa näytöksen 1.
- Selaimessa:
  - Palvelin: `python -m http.server 8782 --bind 127.0.0.1` gristle-kansiossa.
  - `python scripts/ui_test.py` (23 klikkaustarkistusta).
  - `python scripts/shot.py "test=1&at=x,y&map=&entry=&hour=&dlg=" out.png`.
- Tasapaino: puhujabuild läpäisee näytöksen kolmella siemenellä kolmesta. Taistelijabotti kuolee Sumpissa Marrowbyyn tasolla 2, ja hiipijäbotti jää kiinni. Ihmisen tuntuma on testaamatta.

## Sudenkuopat
- Botin silmukassa `s.n` on otettava talteen ennen kuin `removeItem` muuttaa pinon.
- Kun taistelu alkaa, `pending` nollautuu. Botin `use()` yrittää siksi uudelleen.
- Kaupankäynnissä on välitettävä kopiot pinoista.
- Dialogisolmu, jossa on `text` + `go`, näytetään Continue-vaihtoehdon kanssa. Pelkkä `go` ilman tekstiä on ohjaus. Botin `pick()` ohittaa Continue-vaihtoehdot.
- `once`-vaihtoehto kuluu vain onnistuneesta tarkistuksesta.
- `G.die` kutsuu `Combat.checkEnd()`-funktiota, joten taistelu ei jää päälle.

## Jatkoideat
- Näytös 2 (Grand Calliope liikkuvana kohteena).
- Mutaatiot.
- Lisää paikkoja.
- ComfyUI-grafiikat.
