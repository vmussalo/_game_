/* FarmSim Online – apufunktiot: satunnaisluvut, muotoilu, pakkaus. */
'use strict';
var FS = window.FS || (window.FS = {});

(function () {
  /** Siemennetty satunnaislukugeneraattori (mulberry32). Tila tallentuu pelin mukana. */
  function Rng(seed) { this.s = (seed >>> 0) || 1; }
  Rng.prototype.next = function () {
    var t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  Rng.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  /** Normaalijakauma (Box–Muller). */
  Rng.prototype.gauss = function () {
    var u = 1 - this.next(), v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  FS.Rng = Rng;

  FS.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  FS.lerp = function (a, b, t) { return a + (b - a) * t; };

  var MONTHS = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu',
    'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'];
  var MONTHS_SHORT = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'];
  var SEASONS = ['talvi', 'kevät', 'kesä', 'syksy'];
  FS.MONTHS = MONTHS;
  FS.MONTHS_SHORT = MONTHS_SHORT;

  /** Pelin kalenteri: vuodessa 52 viikkoa = 364 päivää, kuukausi = 1/12 vuotta. */
  FS.DAYS_PER_YEAR = 364;
  FS.dateOf = function (day) {
    var year = Math.floor(day / 364) + 1;
    var doy = day % 364;
    var month = Math.min(11, Math.floor(doy / (364 / 12)));
    var dom = Math.floor(doy - month * (364 / 12)) + 1;
    var week = Math.floor(doy / 7) + 1;
    var season = month === 11 || month < 2 ? 0 : month < 5 ? 1 : month < 8 ? 2 : 3;
    return { year: year, doy: doy, month: month, dom: dom, week: week, season: season };
  };
  FS.formatDate = function (day) {
    var d = FS.dateOf(day);
    return d.dom + '. ' + MONTHS_SHORT[d.month] + 'kuuta, vuosi ' + d.year;
  };
  FS.seasonName = function (s) { return SEASONS[s]; };

  FS.money = function (v) {
    var neg = v < 0; v = Math.round(Math.abs(v));
    var s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + s + ' $';
  };
  FS.pct = function (v) { return Math.round(v * 100) + ' %'; };
  FS.fToC = function (f) { return (f - 32) * 5 / 9; };
  FS.tempStr = function (f) { return Math.round(FS.fToC(f)) + ' °C'; };
  FS.mphToMs = function (m) { return m * 0.447; };

  /** Laatuluokka arvosta 0–100. */
  FS.grade = function (q) {
    if (q >= 75) return { id: 'H', name: 'Erinomainen', cls: 'g-h' };
    if (q >= 50) return { id: 'F', name: 'Hyvä', cls: 'g-f' };
    if (q >= 25) return { id: 'P', name: 'Heikko', cls: 'g-p' };
    return { id: 'X', name: 'Huono', cls: 'g-x' };
  };

  /** Tavutaulukon RLE-pakkaus ja base64 tallennusta varten. */
  FS.packBytes = function (arr) {
    var out = [];
    for (var i = 0; i < arr.length;) {
      var v = arr[i], n = 1;
      while (i + n < arr.length && arr[i + n] === v && n < 255) n++;
      out.push(n, v); i += n;
    }
    var s = '';
    for (var j = 0; j < out.length; j += 8192) s += String.fromCharCode.apply(null, out.slice(j, j + 8192));
    return btoa(s);
  };
  FS.unpackBytes = function (b64, len, Type) {
    var s = atob(b64), arr = new (Type || Uint8Array)(len), p = 0;
    for (var i = 0; i + 1 < s.length; i += 2) {
      var n = s.charCodeAt(i), v = s.charCodeAt(i + 1);
      for (var k = 0; k < n && p < len; k++) arr[p++] = v;
    }
    return arr;
  };
  /** 16-bittiset taulukot (viitteet kenttiin ja rakennuksiin) pilkotaan kahdeksi tavutaulukoksi. */
  FS.pack16 = function (arr) {
    var lo = new Uint8Array(arr.length), hi = new Uint8Array(arr.length);
    for (var i = 0; i < arr.length; i++) { lo[i] = arr[i] & 255; hi[i] = (arr[i] >> 8) & 255; }
    return [FS.packBytes(lo), FS.packBytes(hi)];
  };
  FS.unpack16 = function (pair, len) {
    var lo = FS.unpackBytes(pair[0], len), hi = FS.unpackBytes(pair[1], len), out = new Int16Array(len);
    for (var i = 0; i < len; i++) out[i] = lo[i] | (hi[i] << 8);
    return out;
  };

  FS.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  FS.storage = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* yksityinen tila */ } },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* yksityinen tila */ } }
  };
})();
