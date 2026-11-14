/* FarmSim Online – pelitilan sarjallistaminen tallennusta varten. */
'use strict';
(function () {
  var FS = window.FS, N = FS.MAP;
  var SKIP = { _rng: 1, _region: 1, _barnRegions: 1, _idle: 1, fx: 1, terrain: 1, obj: 1, ref: 1, flag: 1, waterDirty: 1, regionDirty: 1, envDirty: 1 };

  FS.serialize = function (G) {
    var out = {};
    Object.keys(G).forEach(function (k) { if (!SKIP[k]) out[k] = G[k]; });
    out.msgs = G.msgs.slice(-30);
    out.map = { terrain: FS.packBytes(G.terrain), obj: FS.packBytes(G.obj), flag: FS.packBytes(G.flag), ref: FS.pack16(G.ref) };
    return JSON.stringify(out);
  };

  FS.deserialize = function (json) {
    var G = typeof json === 'string' ? JSON.parse(json) : json;
    if (!G || !G.map || G.v !== 1) throw new Error('Tallennus on viallinen tai vanhaa muotoa.');
    G.terrain = FS.unpackBytes(G.map.terrain, N * N);
    G.obj = FS.unpackBytes(G.map.obj, N * N);
    G.flag = FS.unpackBytes(G.map.flag, N * N);
    G.ref = FS.unpack16(G.map.ref, N * N);
    delete G.map;
    G.fx = [];
    // Avainten tyypit: JSON muuttaa numeroavaimet merkkijonoiksi, mikä on tässä kunnossa
    FS.prepare(G);
    return G;
  };
})();
