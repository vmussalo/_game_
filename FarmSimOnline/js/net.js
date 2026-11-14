/* FarmSim Online – palvelinyhteys (api/farm.php) ja paikallinen varatila.
 * Palvelin tallentaa vain nimimerkin, salakoodin tiivisteen, pelitilan ja aikaleimat. */
'use strict';
(function () {
  var FS = window.FS, API = 'api/farm.php';
  var net = FS.net = { local: false, name: null, token: null };

  function post(body) {
    return fetch(API, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(parse);
  }
  function parse(r) {
    return r.text().then(function (t) {
      var j = null;
      try { j = JSON.parse(t); } catch (e) { /* ei JSONia */ }
      if (!j) {
        var err = new Error(r.status === 403 ? 'Palvelin esti pyynnön (403).' : 'Palvelin ei vastannut oikein (' + r.status + ').');
        err.code = 'server'; throw err;
      }
      if (!j.ok) {
        var msgs = {
          pin: 'PIN-istunto on vanhentunut. Lataa sivu uudelleen ja syötä PIN-koodi.',
          name: 'Nimimerkki ei kelpaa: 2–20 merkkiä, kirjaimia, numeroita, välilyöntejä tai -_.',
          taken: 'Nimimerkki on jo käytössä. Jatka tilaa salakoodilla tai valitse toinen nimi.',
          auth: 'Nimimerkki tai salakoodi on väärin.',
          locked: 'Liian monta väärää yritystä. Odota hetki ja yritä uudelleen.',
          token: 'Istunto vanhentui – kirjaudu uudelleen.',
          size: 'Tallennus on liian suuri.',
          busy: 'Palvelin on kiireinen, yritä hetken päästä uudelleen.',
          storage: 'Palvelin ei voi tallentaa (kirjoitusoikeus puuttuu).'
        };
        var e2 = new Error(msgs[j.error] || ('Virhe: ' + j.error)); e2.code = j.error; throw e2;
      }
      return j;
    });
  }

  /* Paikallinen tila: localStorage, käytetään testatessa tai jos palvelinta ei ole. */
  function lkey(name) { return 'fso_local_' + name.toLowerCase(); }
  var local = {
    create: function (name) {
      if (FS.storage.get(lkey(name))) return Promise.reject(Object.assign(new Error('Nimimerkki on jo käytössä tässä selaimessa.'), { code: 'taken' }));
      var code = 'PAIK-' + String(Math.floor(1000 + Math.random() * 9000));
      FS.storage.set(lkey(name), JSON.stringify({ code: code, state: null, savedAt: 0 }));
      return Promise.resolve({ ok: true, code: code, token: 'local', now: Date.now() / 1000 });
    },
    login: function (name, code) {
      var raw = FS.storage.get(lkey(name)), rec = raw ? JSON.parse(raw) : null;
      if (!rec || rec.code !== code) return Promise.reject(Object.assign(new Error('Nimimerkki tai salakoodi on väärin.'), { code: 'auth' }));
      return Promise.resolve({ ok: true, token: 'local', state: rec.state, savedAt: rec.savedAt, now: Date.now() / 1000 });
    },
    save: function (name, state) {
      var raw = FS.storage.get(lkey(name)), rec = raw ? JSON.parse(raw) : { code: '' };
      rec.state = state; rec.savedAt = Date.now() / 1000;
      FS.storage.set(lkey(name), JSON.stringify(rec));
      return Promise.resolve({ ok: true, savedAt: rec.savedAt });
    }
  };

  net.check = function () {
    if (net.local) return Promise.resolve(false);
    return fetch(API + '?a=check', { cache: 'no-store', credentials: 'same-origin' }).then(parse).then(function () { return true; });
  };
  net.create = function (name) {
    var p = net.local ? local.create(name) : post({ a: 'create', name: name });
    return p.then(function (j) { net.name = name; net.token = j.token; return j; });
  };
  net.login = function (name, code) {
    var p = net.local ? local.login(name, code) : post({ a: 'login', name: name, code: code });
    return p.then(function (j) { net.name = name; net.token = j.token; return j; });
  };
  net.save = function (stateJson, meta, beacon) {
    if (!net.name) return Promise.resolve(null);
    if (net.local) return local.save(net.name, stateJson);
    var body = { a: 'save', name: net.name, token: net.token, state: stateJson, meta: meta };
    if (beacon && navigator.sendBeacon) {
      var ok = navigator.sendBeacon(API, new Blob([JSON.stringify(body)], { type: 'application/json' }));
      return Promise.resolve(ok ? { ok: true } : null);
    }
    return post(body);
  };
  net.top = function () {
    if (net.local) return Promise.resolve({ ok: true, entries: [], local: true });
    return fetch(API + '?a=top&me=' + encodeURIComponent(net.name || ''), { cache: 'no-store', credentials: 'same-origin' }).then(parse);
  };
  net.remove = function (code) {
    if (net.local) { FS.storage.del(lkey(net.name)); return Promise.resolve({ ok: true }); }
    return post({ a: 'delete', name: net.name, code: code });
  };
})();
