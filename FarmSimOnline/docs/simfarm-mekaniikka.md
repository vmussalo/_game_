# SimFarm (Maxis 1993) – pelimekaniikan tiivistelmä

Lähde: SimFarmin alkuperäinen käsikirja (Reference-osio), Sim Classics Collection 2 Reference Manual,
archive.org: `sim-classics-collection-2-manual`. Lisäksi Compute!-lehden arvio 6/1994 ja Wikipedia.

> Tekijänoikeus: tähän on kirjattu vain pelin **mekaniikat ja luvut** (ideoita ja faktoja, eivät
> suojattuja). Alkuperäisen pelin grafiikkaa, ääniä, musiikkia, tekstejä tai SimFarm-nimeä
> (tavaramerkki, nykyään EA) ei käytetä. "Abandonware" ei tarkoita, että peli olisi vapaasti
> käytettävissä – oikeudet ovat yhä voimassa.

## Maailma
- Kartta 96×96 ruutua, jaettu 12×12 tonttiin (8×8 ruutua / tontti, 144 tonttia).
- Tontit: omat, kaupungin ja myytävät. Rakentaa voi vain omalle maalle; ostettu maa aidataan automaattisesti.
- Maan hinta riippuu maaperän laadusta (kivisyys), pohjavedestä ja myrkyllisyydestä. Kotitilan tonttia ei voi myydä.
- Kotitalo paranee vaurauden mukaan.
- Aloituskassa 40 000 $ (vapaa peli). 8 valmista skenaariota, 9 USA:n ilmastoaluetta tai oma ilmasto
  (sademäärä, lämpötila, tuuli; joki/järvi päälle/pois).

## Pellot ja viljely
- Pelto on aina 8×8 ruutua raivatulla maalla. Kylvö maksaa 120 $ + siemen (1 säkki / kylvö).
- Viikko pellon sijoittamisesta: kyntö + kylvö automaattisesti. Puuttuvat koneet vuokrataan (AutoLease, kallis % hankintahinnasta / käyttökerta).
- Sato: puimuri + kuorma-auto + perävaunu. Sato siiloon tai heti myyntiin markkinahintaan.
- Tulo = markkinahinta × laatu (laatu riippuu säästä, auringosta, vedestä, maaperästä).
- Varastoitu sato menettää arvoa joka viikko, kun lämpötila on yli lajikkeen optimin.
- Aikataulu-ikkuna (Schedule): kylvöt, sadonkorjuut, ruiskutukset ja futuurisopimukset aikajanalle;
  sato kylvetään uudelleen automaattisesti kunnes "Cut".
- Pellon mittarit: tauti, tuholaiset, rikkaruohot, vesi (kuiva ↔ tulvinut), maaperän ravinteet.
- Kuvakkeet pellolla: tuholaiset, rikat, tauti, liian kuiva (lehmän kallo), tulvinut (aalto), ravinnepuute, myrkyt.
- Ruiskutukset 200 $/kerta: lannoite (ei myrkytä), torjunta-aine, rikkakasvien torjunta, sienitautien torjunta
  (nämä kolme lisäävät maan myrkyllisyyttä → satotaso ja maan arvo laskevat). Liian myrkyllinen pelto pitää puskea.
- Laatuluokat: High, Fair, Poor, Bad (X).

## Sää
- Päivätyypit: aurinkoinen, puolipilvinen, pilvinen, sade, lumi – kullakin eri haihdunta.
- Sadepäivä ≈ 1/4" vettä; haihdunta 0–1/2" / pv lämpötilan ja tuulen mukaan.
- Pohjavedellä 12 kosteusastetta. Tuuli vie pintamaata → lannoitustarve; tuulensuoja = väh. 8 puuta 2 ruudun säteellä pellosta.
- Lämpösummat: Degree Days (pohja 50 °F) ja Chill Hours (alle 32 °F).

## Rakentaminen (työkalut)
| Työkalu | Hinta |
|---|---|
| Päällystetty tie | 30 $/ruutu |
| Hiekkatie (pellon/rakennuksen voi sijoittaa päälle) | 20 $/ruutu |
| Aita | 50 $/ruutu |
| Portti | 75 $ |
| Kastelu-/salaoja | 35 $/ruutu |
| Vesiventtiili | 80 $ |
| Rehu (1 yks.) | 100 $ |
| Vesikaukalo | 15 $ |
| Puu (tuulensuoja) | 10 $ |
| Puskutraktori | 25 $/ruutu |
| Kylvö | 120 $ |
| Ruiskutus | 200 $ |

Vesi virtaa lähteestä (joki/järvi + pumppu, tuulimylly) ojia pitkin poispäin. Venttiili kiinni → oja toimii salaojana.
Ojan pitää kulkea pellon koko sivun matkalta.

## Koneet (hinta uutena, koko)
Traktori 400 $ (1) · Aura 200 $ (1) · Kylvökone 200 $ (1) · Ruisku 200 $ (1) · Puimuri 400 $ (2) ·
Perävaunu 200 $ (2) · Kuorma-auto 500 $ (2) · Lentokone 6 000 $ (vaatii kaupungin lentokentän).
Koneet vanhenevat ja kuluvat (nopeammin ulkona ja maastossa ilman tietä) → High/Fair/Poor/Bad; Bad ei toimi.
Minimikalusto yhdelle pellolle: traktori, aura, kylvökone, puimuri, kuorma-auto, perävaunu.

## Rakennukset
Pieni siilo 800 $ (1 sato) · Iso siilo 2 400 $ (4 satoa; siilo voi räjähtää) · Pieni vaja 1 200 $ (6) ·
Iso vaja 1 440 $ (9) · Pieni navetta 2 250 $ (9) · Iso navetta 2 520 $ (12) · Vesipumppu 1 000 $ ·
Tuulimylly 2 000 $ (vaatii tuulta 10 mph) · Vesitorni 200 $.

## Kotieläimet
| Laji | Elinikä | Rehua / kk | Parittelee | Tiineys |
|---|---|---|---|---|
| Lehmä | 20 v | 1/4 paali | 15–20 kk | 10 kk |
| Sika | 15 v | 1/8 paali | 8 kk | 11 kk |
| Lammas | 10 v | 1/16 paali | 3 kk | 6 kk |
| Hevonen | 20 v | 1/4 paali | 4 v | 11–12 kk |
Aitaamattomat eläimet syövät peltoja. Navetta parantaa terveyttä ja arvoa. Jalostus kannattavinta. Kaupungin karjanäyttelyt.

## Talous
- Pankkilaina: luottoraja omaisuuden mukaan, korko 5–15 %, maksut neljännesvuosittain 5 vuoden aikana.
- Verot vuoden lopussa (maa, koneet, rakennukset, tulos). Maksamatta → omaisuutta myydään pakolla; kaikki menetetty → peli ohi.
- Futuurit: myy tuleva sato tämän hetken hintaan; maksu toimitettaessa, huono laatu → osa hinnasta.
- Siemenen hinta seuraa sadon markkina-arvoa; AutoBuy kalliimpi kuin etukäteisosto.
- Markkinahintaikkuna: 30 viikon käyrä.

## Kaupunki
Kasvaa tontti kerrallaan verotulojen ja tilan menestyksen mukaan. Laajentuessa pelaaja äänestää rakennustyypistä
(esim. lentokenttä → lentokone). Kaupungin rakennukset (pankki ym.) avaavat ikkunoita.

## Katastrofit
Tornado, heinäsirkat, kuivuus, tulva (rikkoo pumput ja ojat), halla, myrsky (syö pintamaata). Voi kytkeä pois.

## Nopeudet
Tauko, hidas, normaali, nopea, ultra. Vuoden lopussa arviointi-ikkuna (tilan ja kaupungin kasvu, tuottavuus, maaperä, ympäristö).

## Kasvit (24 kpl, alkuperäisessä 16 kerrallaan aktiivisena)
Kasvuviikot · lämpövaatimus · vesi (sadepäiviä) · resistenssi tuholaiset/rikat/taudit (H/L) · varastolämpö (°F) · uudelleenkylvö?

| Kasvi | Vk | Lämpö | Vesi | T/R/Ta | Varasto | Uusi kylvö |
|---|---|---|---|---|---|---|
| Mantelit | 30 | 300–500 Chill | 4–7 | L/H/L | 40 | Ei |
| Omenat | 17 | 900–1500 Chill | 5–8 | L/H/L | 32–42 | Ei |
| Ohra | 34 | ei pakkasta | 1–3 | H/L/H | 50–60 | Kyllä |
| Porkkana | 17 | 1800 DD | 3–4 | L/L/L | 34 | Kyllä |
| Maissi | 12 | 2000 DD | 8–9 | L/H/H | 50 | Kyllä |
| Puuvilla | 12 | 850–900 DD | 8–12 | L/L/H | 40–120 | Kyllä |
| Gladiolus | 12 | ei pakkasta | 8–12 | L/L/L | 40 | Kyllä |
| Viinirypäle | 22 | 3000 DD | 3–5 | L/L/L | 36–45 | Ei |
| Salaatti | 13 | 1600 DD | 4–6 | L/L/L | 34 | Kyllä |
| Kaura | 34 | ei pakkasta | 2–3 | L/L/L | 34 | Kyllä |
| Sipuli | 22 | 2700 DD | 3–4 | H/L/L | ≥32 | Kyllä |
| Appelsiini | 47 | ei pakkasta | 3–5 | L/L/L | 38–45 | Ei |
| Maapähkinä | 22 | ei pakkasta | 3–4 | H/L/L | 15–70 | Kyllä |
| Peruna | 17 | 2400 DD | 5–8 | H/H/H | 34 | Kyllä |
| Riisi | 25 | 2400 DD | 10–13 | L/L/L | 50 | Kyllä |
| Durra | 22 | 105–120 DD | 3–4 | H/H/H | ≥32 | Kyllä |
| Soijapapu | 17 | 2400 DD | 1–2 | L/L/H | 50 | Kyllä |
| Mansikka | 17 | 200–1200 Chill | 6–10 | L/L/L | 34 | Kyllä |
| Sokerijuurikas | 47 | 1800 DD | 1–2 | H/L/L | ≤45 | Kyllä |
| Auringonkukka | 14 | ei pakkasta | 5–7 | L/L/L | ≤50 | Kyllä |
| Bataatti | 17 | 2500 DD | 6–8 | L/L/L | ≥55 | Kyllä |
| Tupakka | 30 | 2000 DD | 1–3 | H/L/L | ≥60 | Kyllä |
| Tomaatti | 13 | 200 DD | 6–9 | L/L/L | 55 | Kyllä |
| Vehnä | 34 | ei pakkasta | 2–3 | H/L/H | 50–60 | Kyllä |

Erityishuomioita: maissi kuluttaa ravinteita; soija lisää ravinteita (vuoroviljely); auringonkukka ja sokerijuurikas
eivät siedä lannoitusta alkuvaiheessa; peruna mätänee liiasta vedestä; riisi pitää tulvasta.
