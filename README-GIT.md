# Peliprojektit gitissä – siirto uudelle koneelle

Koko `_game_`-kansio on **yksi git-repo**. Jokaisessa projektissa on oma `GEMINI.md`, ja juuren `GEMINI.md` sisältää yhteiset säännöt. Antigravity ja Gemini lukevat ne automaattisesti työtilakansiosta repon juureen asti.

## Mitä EI ole repossa (tarkoituksella)
- `.pin`-tiedostot, `.env` ja avaimet.
- `lataa.php`:n `SALASANA_TIIVISTE`. Suodatin tyhjentää sen commitista, mutta paikallinen tiedosto pysyy ennallaan.
- Palvelimen ajonaikainen data (`api/data/*`) ja SQLite-kannat.
- Testien kuvakaappaukset (`scripts/out/`). Ne syntyvät uudelleen, kun testit ajetaan.

## 1. Tällä koneella (kerran)
```bash
cd "_game_"
git config user.name "Oma Nimi"
git config user.email "omatunnus@users.noreply.github.com"   # GitHubin noreply-osoite: sähköposti ei näy
git commit -m "Peliprojektit versionhallintaan"
```
Luo GitHubiin **yksityinen** (private) repo, esimerkiksi `peliprojektit`, ja yhdistä se:
```bash
git remote add origin https://github.com/<tunnus>/peliprojektit.git
git push -u origin main
```

## 2. Uudella koneella
1. Asenna: **Git**, **Node.js LTS**, **Python 3** + `pip install playwright pyzbar` + `playwright install chromium`, **Google Chrome** (polkuun `C:\Program Files\Google\Chrome\Application\`) ja tarvittaessa PHP 8.3- ja 7.4-zip (windows.php.net).
2. Kloonaa repo **OneDriven ulkopuolelle**, esimerkiksi `C:\koodi\peliprojektit`. Silloin OneDrive ja git eivät kilpaile samoista tiedostoista.
   ```bash
   git clone https://github.com/<tunnus>/peliprojektit.git
   cd peliprojektit
   git config filter.piilota-tiiviste.clean "sh tyokalut/piilota-tiiviste.sh"
   git config filter.piilota-tiiviste.smudge cat
   ```
3. Jos tarvitset `lataa.php`:tä paikallisesti, liitä tiiviste riville 25 (ohje on tiedostossa `Kotisivutila-tiedostolataus/OHJE.md`). Palvelimella oleva versio toimii joka tapauksessa.
4. Avaa yksittäinen projektikansio (esim. `gristle/`) Antigravityssä. Agentti lukee silloin sekä projektin että juuren `GEMINI.md`:n.

## Päivittäinen käyttö
```bash
git add -A && git commit -m "Mitä muuttui"   # tallenna välivaihe
git push                                     # vie GitHubiin
git pull                                     # hae toiselta koneelta
git diff / git log                           # katso mitä agentti muutti
git restore <tiedosto>                       # peru tekemättömät muutokset
```
Hyvä tapa: **commit ennen jokaista isoa agenttipyyntöä.** Jos tulos ei kelpaa, palaaminen on yhden komennon päässä.
