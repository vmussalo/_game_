/* Elämänkoulu – service worker: peli toimii myös ilman verkkoyhteyttä.
   Strategia: verkko ensin (tarkistetaan aina palvelimelta, joten päivitykset näkyvät heti), välimuisti varalla.
   */
// Välimuistin nimi sisältää pelikansion osoitteen, joten saman sivuston eri pelit (esim. modit) eivät sotke toisiaan.
// Isossa päivityksessä voit kasvattaa versionumeroa (v1 → v2).
const VERSION = 'v2';
const CACHE = 'elamankoulu-' + VERSION + ':' + self.registration.scope;
const ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'js/util.js', 'js/text.js', 'js/data.js', 'js/moves.js', 'js/fighter.js', 'js/battle.js', 'js/ai.js', 'js/poses.js',
  'js/rig.js', 'js/stages.js', 'js/render.js', 'js/audio.js', 'js/input.js', 'js/ui.js', 'js/main.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

// PIN-suojatussa kansiossa (lataa.php) palvelin vastaa kirjautumissivulla, jos PIN-istunto on vanhentunut.
// Sitä ei tallenneta pelin tiedostojen tilalle, jotta asennettu peli toimii myös ilman verkkoa.
// Pelin oman sivun tunnistaa js/main.js-viittauksesta; muut tiedostot eivät saa olla HTML:ää.
function cacheable(url, res) {
  if (!res || !res.ok) return Promise.resolve(false);
  const path = new URL(url).pathname;
  const html = (res.headers.get('Content-Type') || '').indexOf('text/html') >= 0;
  if (path.slice(-1) !== '/' && !/\.html?$/.test(path)) return Promise.resolve(!html);
  return res.clone().text().then(t => t.indexOf('js/main.js') >= 0, () => false);
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(a => {
      const req = new Request(a, { cache: 'reload' });
      return fetch(req).then(res => cacheable(req.url, res).then(ok => ok ? c.put(req, res) : null)).catch(() => null);
    })))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // poistetaan vain tämän pelikansion vanhat versiot, ei muiden pelien välimuisteja
  const mine = ':' + self.registration.scope;
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.slice(-mine.length) === mine).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.indexOf('/api/') >= 0) return;
  const key = url.origin + url.pathname; // kyselyosa (?…) ei luo uusia välimuistirivejä
  const fresh = req.mode === 'navigate'
    ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    fresh.then(res => {
      const copy = res.clone();
      cacheable(req.url, copy).then(ok => ok && caches.open(CACHE).then(c => c.put(key, copy))).catch(() => {});
      return res;
    }).catch(() => caches.match(key).then(r => r || caches.match(req, { ignoreSearch: true }))
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
