#!/usr/bin/env bash
# AgriStuntti – testit Chromen taustatilassa (headless). Ei kuulu julkaistaviin tiedostoihin.
#
# Käynnistä ensin paikallinen palvelin agriralli-kansiossa:
#   python -m http.server 8778 --bind 127.0.0.1
#
# Käyttö:
#   scripts/test-headless.sh dom  "test&level=1"                     → tulostaa sivun DOMin (virheet: data-err)
#   scripts/test-headless.sh shot "test&level=1" 390 844 kuva.png    → kuvakaappaus laitekehyksessä 390×844
# Ympäristömuuttuja VT = virtuaaliaika millisekunteina (oletus 8000).
# Ympäristömuuttuja TO = aikakatkaisu sekunteina (oletus 90): jumiutunut Chrome lopetetaan, ja skripti palauttaa koodin 124.
# Huom: Windowsin Chrome ei pienennä ikkunaa alle ~500 px, joten kapeat näytöt kuvataan iframe-kehyksessä.

CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
HOST="${HOST:-http://127.0.0.1:8778}"
GAME="${GAME:-peli}"
MODE="$1"; QS="$2"; W="${3:-390}"; H="${4:-844}"; OUT="$5"
VT="${VT:-8000}"
TO="${TO:-90}"

COMMON=(--headless=new --enable-unsafe-swiftshader --use-angle=swiftshader --hide-scrollbars --mute-audio --no-first-run --no-default-browser-check
        "--virtual-time-budget=${VT}")

if [ "$MODE" = "dom" ]; then
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" "--window-size=${W},${H}" --dump-dom "${HOST}/${GAME}/index.html?${QS}" 2>/dev/null
elif [ "$MODE" = "shot" ]; then
  WW=$(( W + 16 )); [ "$WW" -lt 520 ] && WW=520
  HH=$(( H + 16 ))
  SRC="../${GAME}/index.html?${QS//&/%26}"
  timeout -k 5 "$TO" "$CHROME" "${COMMON[@]}" "--window-size=${WW},${HH}" "--screenshot=$(cygpath -wa "$OUT")" \
    "${HOST}/scripts/frame.html?w=${W}&h=${H}&src=${SRC}" 2>/dev/null
else
  echo "Käyttö: $0 dom|shot \"parametrit\" [leveys korkeus tiedosto]"
  exit 1
fi
