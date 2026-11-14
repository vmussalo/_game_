# Gristle & Glitter – grafiikan vaihto-ohje

Peli piirtää kaiken grafiikan itse (proseduraalisesti). Mikä tahansa piirros voidaan korvata PNG-kuvalla ilman koodimuutoksia:

1. Tallenna kuva kansioon `game/gfx/…` (esim. `game/gfx/char/agnes.png`).
2. Lisää rivi tiedostoon `game/gfx/manifest.js`:
   ```js
   'char/agnes': { file: 'char/agnes.png', ax: 0.5, ay: 0.96, s: 0.5 },
   ```
   - `ax`, `ay` = ankkuripiste kuvan sisällä (0–1). Hahmoilla ja esineillä se on **jalkojen / pohjan kohta** (yleensä `ax 0.5`, `ay 0.93–0.97`).
   - `s` = skaalaus. Generoi kuvat isompina (esim. 2×) ja käytä `s: 0.5`, niin ne pysyvät terävinä.
3. Lataa sivu uudelleen. Jos kuvaa ei löydy, peli käyttää automaattisesti omaa piirrostaan.

## Avaimet ja koot

| Avain | Mitä | Suositeltu koko (s = 0.5) | Huom |
|---|---|---|---|
| `char/<malli>` | hahmo kartalla, katse **oikealle** | 96×128 px (ihminen), 96×80 (Lump), 64×48 (Gristling) | peli peilaa vasemmalle |
| `dead/<malli>` | kuollut hahmo maassa | 128×64 | valinnainen |
| `obj/<tyyppi>` tai `obj/<id>` | esine, esim. `obj/tent`, `obj/mother`, `obj/pump` | tent 280×240, mother 760×420, wagon 200×120, pump 160×170 | id voittaa tyypin (`obj/mother` = Old Mother) |
| `portrait/<malli>` | keskustelun muotokuva | 480×560 (näytetään 240×280) | koko kuva, ei ankkuria |
| `ground/<kartta>` | koko kartan maapohja | gutwater 3256×1120, sump 2816×1120, crossing 2112×840 | `leveys = w·44+88`, `korkeus = h·20+120` |
| `icon/<esine>` | esineen ikoni | 88×60 | |

Mallien nimet (`<malli>`): agnes, purslane, ruby, saltlick, harrow, tallow, dellah, gummy, rancher, rancherf, deputy, lumper, gristling, bloattick, grinbird, ferallump, hidetaker, hidegunner, wynn, greasepaint, greasegun, stiltwalker, strongman, marrowby, moe. Pelaajan avain on `char/pc`.

## Tyyli

**Tavoite:** "Esirenderöity" 90-luvun lopun CRPG-tunnelma omalla ilmeellä: pehmeät 3D-renderöidyt muodot, lämmin pölyinen valo vasemmalta ylhäältä, okra–ruoste–lihanpunainen paletti ja karnevaalin haalistunut punakulta. Tyyli on semi-groteski eikä splatteria.

**Yleinen positiivinen prompt-alku** (SDXL / Flux):
```
prerendered 3D game sprite, isometric 3/4 view from above, single character standing, full body, facing right,
soft global illumination, warm dusty light from upper left, muted ochre rust and flesh-pink palette,
biopunk frontier western with travelling carnival elements, semi-grotesque, detailed, clean silhouette,
plain flat background
```
**Negatiivinen:**
```
photo, realistic photo, anime, chibi, cartoon outline, text, watermark, multiple characters, cropped feet,
gore, blood splatter, nudity, frame, border, shadow on background
```
Poista tausta (esim. ComfyUI:n *rembg* / *BiRefNet* -solmu) ja tallenna läpinäkyvänä PNG:nä.

Varo esikuvaa. Älä käytä prompteissa minkään olemassa olevan pelin nimeä (esim. "Fallout"), sillä se tuo mukaan tunnistettavia hahmoja ja logoja.

## Hahmokohtaiset promptit

| Malli | Prompt-loppu |
|---|---|
| agnes | stern older ranch matriarch, starched white bonnet, purple-grey work dress, scar across jaw, holding a double-barrel shotgun |
| purslane | thin frontier doctor, huge magnifying spectacles, bloodstained linen smock, red rubber apron, scalpel |
| ruby | carnival barker woman, scarlet tailcoat, dented black top hat, gold-capped teeth grin, red hair |
| saltlick | huge shopkeeper, waxed moustache, bowler hat, salt-white apron over brown vest |
| harrow | lean sheriff, grey moustache, polished star badge, long brown duster, long lever rifle |
| tallow | freckled ten-year-old street kid, oversized cap, patched clothes |
| dellah | enormous saloon woman, red shirt, gold tooth grin, rolled sleeves |
| gummy | toothless old drunk, magnificent white beard, battered stetson |
| rancher / rancherf | weathered rancher, stetson or bonnet, cleaver or skinning knife |
| lumper | grotesque docile livestock made of folded pink flesh, many stubby legs, small head with curled horns |
| gristling | small crawling tumour creature, pink-red flesh, glistening sac on its back, tiny legs, wet mouth |
| bloattick | dog-sized bloated purple tick, sloshing abdomen, spitting bile |
| grinbird | black carrion bird with a wide grin of human-like teeth |
| ferallump | huge feral flesh beast, too many legs, bone horns along the back |
| hidetaker / hidegunner | wasteland raider in patchwork tanned hide armour, skull cap with horns, black war paint |
| wynn | travelling trader, battered top hat, blue coat, big beard |
| greasepaint / greasegun | sinister carnival clown thug, white greasepaint face, red painted grin, ruff collar, cleaver / rivet pistol |
| stiltwalker | tall clown on wooden stilts, purple coat, top hat, lever rifle |
| strongman | huge circus strongwoman, striped leotard, handlebar moustache, surgical bonesaw |
| marrowby | ringmaster in scarlet coat and top hat, waxed moustache, a small second torso grafted at his ribs that claps politely |
| moe | one broad body with two heads: left round-faced anxious tenor, right long-faced sardonic baritone with moustache, blue coat |

**Muotokuvat:** vaihda alku muotoon `painted portrait bust, oil painting style, dramatic warm side light, dark brown background, head and shoulders` ja käytä samaa loppua.

**Old Mother (`obj/mother`):** `gigantic sleeping hill of living folded pink meat in a pasture, small eye half-closed, bone horn stumps, veins, warm and sad, prerendered 3D, 3/4 view from above`.

## Testaus

Avaa `game/index.html?test=1&at=60,30`, niin näet Old Motherin. `?test=1&map=sump&entry=front` vie suoraan Sumpiin, ja `&hour=23` asettaa kellonajan yöhön. Kuvakaappauksen saa komennolla `py scripts/shot.py "test=1&at=28,24" out.png`.
