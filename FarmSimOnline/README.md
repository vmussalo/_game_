# FarmSim Online

Selaimessa pelattava maatilasimulaatio, joka on saanut innoituksensa Maxisin SimFarmista (1993).
Pelin koodi, grafiikka ja tekstit on tehty alusta asti itse – alkuperäisen pelin tiedostoja ei käytetä.
Kasvien kasvuajat, lämpö- ja vesivaatimukset sekä koneiden ja rakennusten hinnat noudattavat alkuperäisen
käsikirjan julkaisemia tietoja (ks. [docs/simfarm-mekaniikka.md](docs/simfarm-mekaniikka.md)).

## Ominaisuudet

- 96×96 ruudun maailma, 12×12 tonttia, 10 ilmastoaluetta (9 USA:n aluetta + bonuksena Etelä-Pohjanmaa)
- 24 kasvia, 8×8-pellot, kyntö/kylvö/korjuu omilla tai vuokrakoneilla, kypsyys ja laatuluokat
- Sää ja vuodenajat, pohjavesi, haihdunta, kastelu- ja salaojat, pumput, tuulimyllyt, venttiilit, tuulensuojat
- Rikat, tuholaiset, taudit, ravinteet ja maan myrkyllisyys; lannoitus ja ruiskutukset; vuoroviljely
- Kotieläimet (lehmä, sika, lammas, hevonen): aitaukset, rehu, vesi, navetat, lisääntyminen
- Markkinahinnat 30 viikon käyrällä, siilovarastointi, futuurisopimukset, pankkilainat, verot
- Kaupunki kasvaa veroistasi – äänestä uusista rakennuksista (lentokenttä → ruiskutuskone ym.)
- Katastrofit: tornado, heinäsirkat, kuivuus, tulva, halla, myrsky
- **Online:** tila tallentuu palvelimelle nimimerkillä + salakoodilla, naapurilista (rikkaimmat tilat)
- **Alkuperäistyylinen ulkoasu** (oletus, vaihdettavissa Asetuksista): kaikki omat piirrokset muunnetaan
  1990-luvun VGA-pelien tapaan 16 värin paletille ruutukuvioinnilla, ikkunoissa puukehykset ja pellon
  mittarit osoittimina. Tyylihavainnot: [docs/og-analyysi.md](docs/og-analyysi.md).
- **Idle-aika (tilanhoitaja):** tila etenee poissa ollessasi valitsemallasi teholla (0 % = tila odottaa).
  Teho määrää poissaoloajan peliajan, ja hoitajan palkka kasvaa teholla jyrkemmin. Tehon yläraja,
  poissaolon enimmäispituus ja hoitajan taito kasvavat pelin edetessä (kotitilan taso, kaupungin
  työnvälitys ja maatalouskoulu).

## Kansiot

| Kansio | Sisältö | Julkaistaan? |
|---|---|---|
| `index.html`, `css/`, `js/` | Peli | Kyllä |
| `api/farm.php`, `api/data/` | Tallennusrajapinta ja datakansio (suojattu `.htaccess`illa) | Kyllä |
| `scripts/` | Testityökalut (testipalvelin, headless-testit) | Ei |
| `docs/` | Tutkimusmuistiinpanot | Ei |
| `OG zip files/` | Alkuperäisen pelin tiedostot (vain viitteeksi) | **Ei koskaan** |

## Testaus omalla koneella

```bash
python scripts/mock_server.py 8770          # jäljittelee PHP-rajapintaa muistissa
# avaa selaimessa http://127.0.0.1:8770/
scripts/test-headless.sh sim "region=midwest&years=5&manage=1&smart=1"   # simulaation tasapainotesti
scripts/test-headless.sh flow                                             # kirjautuminen + tallennus
scripts/test-headless.sh shot "demo&setup" 1280 800 scripts/out/kuva.png  # kuvakaappaus
```

Testiparametreja: `?local` (tallennus vain selaimeen), `?demo&setup` (valmis testitila),
`&days=N`, `&idle=H` (H tunnin poissaolo), `&open=field,map` (avaa ikkunoita).

## Julkaisu Kapsiin

1. Lataa SFTP:llä palvelimelle esim. `/CC/farmsim/`: `index.html`, `css/`, `js/`, `api/farm.php`,
   `api/data/.htaccess` ja `api/data/index.html`.
2. Varmista, että PHP voi kirjoittaa kansioon `api/data/` (Kapsissa PHP ajetaan omana käyttäjänäsi,
   joten oikeudet 755 riittävät). PHP 7.0 tai uudempi.
3. Jos kansio on PIN-suojauksen (`lataa.php`) takana, rajapinta toimii, koska `PORTTI_PHP_OHJELMAT`
   sallii suojattujen kansioiden PHP-ohjelmat. PIN-istunnon vanhetessa peli pyytää lataamaan sivun uudelleen.
4. Tarkista: `api/farm.php?a=check` palauttaa `{"ok":true}` ja `api/data/` antaa 403.

## Tietosuoja

Palvelimelle tallennetaan vain nimimerkki, salakoodin tiiviste, istuntotunnisteiden tiivisteet, pelitila,
naapurilistan tiedot (tilan nimi, alue, pelivuosi, varallisuus) ja aikaleimat. IP-osoitteita ei tallenneta.
Pelaaja voi poistaa tilansa valikosta *Peli → Poista tilani palvelimelta*. Pelaajia ohjeistetaan olemaan
käyttämättä oikeaa nimeään nimimerkkinä.

## Tekijänoikeudet

SimFarm on Electronic Artsin (alun perin Maxis) tavaramerkki ja tekijänoikeudella suojattu teos.
"Abandonware" ei tarkoita, että peli olisi vapaasti käytettävissä. Tämä peli ei sisällä alkuperäisen pelin
koodia, grafiikkaa, ääniä tai tekstejä, eikä se ole EA:n tai Maxisin tekemä tai hyväksymä.
