# Alkuperäisen SimFarmin (DOS 1993) tiedostojen analyysi

Tehty 2026-10-25 FarmSim Onlinen ulkoasun suunnittelua varten. Tiedostoja tutkittiin vain lukemalla
(yhtään alkuperäistä ohjelmaa ei ajettu), ja puretut kuvat pidettiin väliaikaisessa työkansiossa –
**mitään alkuperäistä grafiikkaa, tekstiä, ääntä tai dataa ei ole kopioitu peliin**. Peliin otettiin vain
yleiset tyylipiirteet ja värisävyt (16 värin paletti), joita ei suojata tekijänoikeudella.

Huom: `OG zip files/SimFarm.zip` sisältää 1993 BBS-piraattiryhmän mainostiedoston (`--------.---`), eli kopio
on alun perin laitonta jakelua. Alkuperäisiä tiedostoja ei saa julkaista eikä jakaa.

## Tiedostomuodot (DOS-versio)

| Tiedosto | Sisältö |
|---|---|
| `SIMFARM.CFG` | Näyttötila: `E` = EGA 640×350 16 väriä, `V` = VGA 640×480 16 väriä |
| `MEGADATA.IDX` | Arkiston hakemisto: 20 tavun tietueet = nimi (12 t, nollatäyte) + lippu (4 t) + sijainti (4 t, LE) |
| `MEGADATA.EEA` | 152 tiedostoa peräkkäin: `*.bmp`, `*.btl`, `*.til`, `*.int`, `*.pal`, `*.spr`, `*.dat`, `*.xmi`, `*.voc`, `*.hc` |
| `*.pal` | 16 väriä × RGB, VGA:n 6-bittiset arvot (0–63) |
| `*.int` | Koko näytön kuva 640×480, EGA-tasot rivi kerrallaan (rivillä 4 × 80 tavua) |
| `*.bmp` | Otsake (leveys tavuina, korkeus, tasot, ?) + 4 kokonaista bittitasoa peräkkäin |
| `*.til` | 16×16-ruudut, 128 tavua/ruutu, 4 bittitasoa × 32 tavua |
| `CROPS/*.CRP` | 44 × 16×16-ruutua (8 ensimmäistä = pellon kasvuvaiheet, lopussa kuvake) + asiantuntijateksti |

## Tyylihavainnot, joita FarmSim Online jäljittelee omilla piirroksillaan

- **Paletti:** musta, keltainen, vaaleansininen, punainen, lohenpunainen, tummansininen, sininen, ruskea,
  vihreä, tummanvihreä, tummanruskea, vaalea/keski/tummanharmaa, valkoinen. Välisävyt ruutukuvioinnilla.
- **Maasto:** ruskea maa tummanvihrein ja vihrein täplin; vesi kirkkaan sinistä; tiet vaaleanharmaita.
- **Pellot:** sama 16×16-ruutu toistuu koko pellolla; tumma multa, vihreät rivit ja värikkäät hedelmäpisteet.
- **Puut:** pyöreitä tummanvihreitä pensaita, rasteroitu musta varjo.
- **Käyttöliittymä:** harmaat paneelit, ikkunoissa ruskea puukehys, siniset varjostetut otsikot,
  ISOIN KIRJAIMIN merkityt painikkeet (BUY, CLOSE), pellon mittarit puoliympyrän muotoisina osoittimina,
  pankki ATM-tyylisenä (vihreä teksti mustalla), ohjauspalkissa ikonipainikkeet ja Date/Funds-kentät.
- **Alueen valinta:** USA:n kartta, jonka alueita klikataan (mahdollinen jatkokehitys).

## Havainto pelin datasta

Pelin sisäiset kasvitiedot poikkeavat paikoin käsikirjasta (esim. maissin vesitarve 6 sadepäivää pelissä,
8–9 käsikirjassa). FarmSim Online käyttää käsikirjan julkaisemia arvoja.
