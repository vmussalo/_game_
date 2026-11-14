#!/usr/bin/env bash
# FarmSim Online – testit Chromen taustatilassa (headless). Ei kuulu julkaistaviin tiedostoihin.
#
# Käyttö (FarmSimOnline-kansiossa):
#   scripts/test-headless.sh sim  "region=midwest&years=5"         → simulaatiotesti (tiedostosta, ei palvelinta)
#   scripts/test-headless.sh dom  "local&demo"                     → pelisivun DOM (vaatii palvelimen)
#   scripts/test-headless.sh shot "local&demo" 1280 800 kuva.png   → kuvakaappaus
#   scripts/test-headless.sh flow                                  → kirjautumisen ja tallennuksen kulkutesti
# Palvelin: python scripts/mock_server.py 8770
# Ympäristömuuttujat: VT = virtuaaliaika ms (oletus 8000), TO = aikakatkaisu s (oletus 90).

CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
HOST="${HOST:-http://127.0.0.1:8770}"
MODE="$1"; QS="$2"; W="${3:-1280}"; H="${4:-800}"; OUT="$5"
VT="${VT:-8000}"; TO="${TO:-90}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMON=(--headless=new --disable-gpu --hide-scrollbars --mute-audio --no-first-run --no-default-browser-check
        --allow-file-access-from-files "--virtual-time-budget=${VT}")

if [ "$MODE" = "sim" ]; then
  URL="file:///$(cygpath -m "$ROOT")/scripts/simtest.html?${QS}"
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" --dump-dom "$URL" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g; s/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g'
elif [ "$MODE" = "flow" ]; then
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" "--window-size=1300,800" --dump-dom "${HOST}/scripts/flowtest.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g'
elif [ "$MODE" = "dom" ]; then
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" "--window-size=${W},${H}" --dump-dom "${HOST}/index.html?${QS}" 2>/dev/null
elif [ "$MODE" = "shot" ]; then
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" "--window-size=${W},${H}" "--screenshot=$(cygpath -wa "$OUT")" "${HOST}/index.html?${QS}" 2>/dev/null
else
  echo "Käyttö: $0 sim|dom|shot \"parametrit\" [leveys korkeus tiedosto]"; exit 1
fi
