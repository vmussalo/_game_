/* Elämänkoulu – liikkeiden kääntäjä.
   Muuntaa data.js:n perushyökkäykset ja erikoisliikkeet aikajanoiksi, joita fighter.js suorittaa ruutu kerrallaan.

   Liikkeen kentät:
     len        kokonaispituus ruutuina
     hits[]     osumaikkunat {f0,f1,dmg,hs,bs,hb,lvl,kd,launch,juggle,push,str}
     anim[]     asentojen avainruudut [[ruutu, asento], ...]
     vel[]      nopeusmuutokset [ruutu, vx, vy] (vx hahmon katsesuuntaan, vy ylös; null = ei muutosta)
     inv        [f0,f1] haavoittumaton iskuille ja ammuksille
     armor      [f0,f1] panssari kestää yhden iskun
     counter    {f0,f1,dmg} vastaiskuasento
     proj       {f, ...} ammus syntyy ruudulla f
     tele       {f0,f1,to} katoaa ruudulla f0, ilmestyy ruudulla f1
     grab       {f, range, dmg, cmd} heitto tai komentoheitto
     airborne   liike nostaa ilmaan: laskeutuminen päättää liikkeen (landRec)
*/
(function () {
  'use strict';
  const EK = window.EK;
  const STR = ['L', 'M', 'H'];

  function box(hb, reach, size) {
    return { x0: hb[0], x1: hb[0] + (hb[1] - hb[0]) * reach, y0: hb[2] * size, y1: hb[3] * size };
  }

  function normal(ch, id) {
    const n = EK.NORMALS[id];
    const slow = n.str === 'L' ? (ch.speed >= 2 ? 1 : 0) : ch.speed;
    const st = Math.max(3, n.st + slow);
    const rec = Math.max(4, n.rec + Math.max(0, ch.speed));
    const len = st + n.act + rec;
    const base = n.air ? 'jump' : n.crouch ? 'crouch' : 'stance';
    return {
      id, name: n.name, kind: 'normal', str: n.str, len, st,
      hits: [{ f0: st, f1: st + n.act - 1, dmg: Math.round(n.dmg * ch.power), hs: n.hs, bs: n.bs, lvl: n.lvl, kd: n.kd || null,
        hb: box(n.hb, ch.reach, ch.size), push: n.push, str: n.str, launch: null, juggle: false }],
      anim: [[0, base], [Math.max(1, st - 2), n.pw], [st, n.pa], [st + n.act + 1, n.pa], [len, base]],
      cancel: !!n.cancel, chain: n.chain || null, crouch: !!n.crouch, air: !!n.air,
      hurt: n.crouch ? 'crouch' : n.air ? 'air' : 'stand', prop: ch.look.prop || null
    };
  }

  function throwMove(ch) {
    const t = EK.NORMALS.throw;
    return {
      id: 'throw', name: t.name, kind: 'throw', str: 'M', len: t.st + t.act + t.rec, st: t.st, hits: [],
      grab: { f0: t.st, f1: t.st + t.act - 1, range: t.range, dmg: Math.round(t.dmg * ch.power), cmd: false },
      anim: [[0, 'stance'], [3, 'grabW'], [t.st, 'grab'], [t.st + t.act + 6, 'grab'], [t.st + t.act + t.rec, 'stance']],
      hurt: 'stand'
    };
  }

  // Erikoisliikkeiden rakentajat tyypin mukaan. i = voimakkuus 0..2
  const BUILD = {
    proj(ch, s, i) {
      const st = 13 + Math.max(0, ch.speed - 1), len = st + 32;
      const life = s.life ? s.life[i] : 220;
      return {
        len, st, hits: [],
        proj: { f: st, sprite: s.sprite, color: s.color, vx: s.speed[i], vy: s.arc ? 6 + i * 1.2 : 0, g: s.arc ? 0.32 : 0,
          x: 58, y: (s.sprite === 'flash' ? 104 : 92) * ch.size, w: s.sprite === 'flash' ? 46 : 34, h: s.sprite === 'flash' ? 46 : 28, life,
          dmg: Math.round(s.dmg * ch.power), hs: s.sprite === 'flash' ? 22 : 20, bs: 15, lvl: 'mid', str: 'M', hits: 1 },
        anim: [[0, 'stance'], [st - 5, 'castW'], [st, 'cast'], [len - 10, 'cast'], [len, 'stance']]
      };
    },
    rise(ch, s, i) {
      const st = 3 + i;
      const vy = [12.5, 14, 15.5][i];
      const dmg = Math.round(s.dmg[i] * ch.power);
      const multi = s.multi || 1;
      const hits = [];
      for (let k = 0; k < multi; k++) {
        const f0 = st + k * 5;
        hits.push({ f0, f1: f0 + (multi > 1 ? 3 : 7 + i), dmg: Math.round(dmg / multi), hs: 30, bs: 18, lvl: 'mid', kd: k === multi - 1 ? 'launch' : null,
          launch: { vx: 3, vy: 11 }, juggle: true, hb: box([4, 66, 50, 196], 1, ch.size), push: 4, str: 'H' });
      }
      return {
        len: 140, st, hits, airborne: true, landRec: 12 + i * 3,
        inv: [1, st + [1, 4, 8][i]],
        vel: [[st, [2.2, 2.8, 3.4][i], vy]],
        anim: [[0, 'riseW'], [st, 'rise'], [st + 16, 'rise'], [st + 30, 'fall'], [140, 'fall']]
      };
    },
    rush(ch, s, i) {
      const st = 10 + i + Math.max(0, ch.speed - 1);
      const sp = s.armor ? 8 : 10;
      const act = Math.max(6, Math.round(s.dist[i] / sp));
      const rec = (s.armor ? 20 : 15) + i * 2;
      const len = st + act + rec;
      const low = !!s.low;
      return {
        len, st,
        hits: [{ f0: st, f1: st + act - 1, dmg: Math.round(s.dmg[i] * ch.power), hs: 22, bs: 15, lvl: low ? 'low' : 'mid',
          kd: i === 2 || low ? 'down' : null, launch: { vx: 4, vy: 6 }, juggle: false,
          hb: box(low ? [10, 96, 0, 46] : [14, 92, 70, 150], 1, ch.size), push: 9, str: i === 2 ? 'H' : 'M', stopOnHit: true }],
        vel: [[st, sp, null], [st + act, 0, null]],
        armor: s.armor ? [3, st + act - 1] : null,
        hurt: low ? 'low' : 'stand',
        anim: low ? [[0, 'stance'], [st - 3, 'slideW'], [st, 'slide'], [st + act, 'slide'], [len, 'crouch']]
          : [[0, 'stance'], [st - 3, 'rushW'], [st, 'rush'], [st + act, 'rush'], [len, 'stance']]
      };
    },
    grab(ch, s, i) {
      const st = 6, len = st + 2 + 34;
      return {
        len, st, hits: [],
        grab: { f0: st, f1: st + 1, range: s.range[i], dmg: Math.round(s.dmg[i] * ch.power), cmd: true },
        anim: [[0, 'stance'], [st - 3, 'grabW'], [st, 'grab'], [st + 10, 'grab'], [len, 'stance']]
      };
    },
    counter(ch, s, i) {
      const win = [16, 22, 28][i];
      const len = 3 + win + 16;
      return {
        len, st: 3, hits: [],
        counter: { f0: 3, f1: 3 + win, dmg: Math.round(s.dmg[i] * ch.power) },
        anim: [[0, 'stance'], [3, 'tree'], [3 + win, 'tree'], [len, 'stance']]
      };
    },
    tele(ch, s, i) {
      return {
        len: 38, st: 8, hits: [],
        inv: [3, 28], tinv: [3, 28],
        tele: { f0: 9, f1: 22, to: s.to[i] },
        anim: [[0, 'stance'], [8, 'teleW'], [22, 'teleW'], [30, 'stance'], [38, 'stance']]
      };
    },
    spin(ch, s, i) {
      const n = s.hits[i], st = 8, gap = 6;
      const low = !!s.low;
      const hits = [];
      const anim = [[0, 'stance'], [st - 2, low ? 'slideW' : 'jabW']];
      for (let k = 0; k < n; k++) {
        const f0 = st + k * gap, last = k === n - 1;
        hits.push({ f0, f1: f0 + 3, dmg: Math.round(s.dmg * ch.power), hs: last ? 22 : 16, bs: last ? 14 : 12, lvl: low ? 'low' : 'mid',
          kd: last && (low || i === 2) ? 'down' : null, launch: { vx: 3, vy: 6 }, juggle: k > 0,
          hb: box(low ? [10, 88, 0, 44] : [18, 84, 70, 140], 1, ch.size), push: last ? 7 : 2, str: last ? 'M' : 'L' });
        anim.push([f0, low ? 'slide' : (k % 2 ? 'jab' : 'str')]);
        anim.push([f0 + gap - 1, low ? 'slide' : 'jabW']);
      }
      const len = st + n * gap + 14;
      anim.push([len, 'stance']);
      return { len, st, hits, vel: [[st, s.vx[i], null], [st + n * gap, 0, null]], hurt: low ? 'low' : 'stand', anim };
    },
    hop(ch, s, i) {
      const st = 5, air = 24, vx = s.dist[i] / air;
      return {
        len: 140, st, airborne: true, landRec: 10,
        hits: [{ f0: st + 11, f1: st + 40, dmg: Math.round(s.dmg[i] * ch.power), hs: 20, bs: 12, lvl: 'over', kd: null, launch: null,
          juggle: false, hb: box([8, 80, -10, 96], 1, ch.size), push: 6, str: 'M' }],
        vel: [[st, vx, 9.6]],
        anim: [[0, 'crouch'], [st, 'jump'], [st + 10, 'overW'], [st + 16, 'over'], [140, 'over']]
      };
    }
  };

  // Superliikkeet
  const SUPER = {
    rushc(ch, s) {
      const st = 6, act = 18, len = st + act + 30;
      return {
        len, st, inv: [0, st + 4],
        hits: [{ f0: st, f1: st + act - 1, dmg: 40, hs: 30, bs: 22, lvl: 'mid', kd: null, juggle: true,
          hb: box([10, 96, 40, 170], 1, ch.size), push: 2, str: 'X', cine: true, stopOnHit: true }],
        vel: [[st, 13, null], [st + act, 0, null]],
        anim: [[0, 'castW'], [st, 'rush'], [st + act, 'rush'], [len, 'stance']]
      };
    },
    grabc(ch, s) {
      const st = 3, len = st + 2 + 40;
      return {
        len, st, inv: [0, st + 2], hits: [],
        grab: { f0: st, f1: st + 1, range: 124, dmg: 0, cmd: true, cine: true },
        anim: [[0, 'grabW'], [st, 'grab'], [st + 14, 'grab'], [len, 'stance']]
      };
    },
    beam(ch, s) {
      const st = 14, len = st + 46;
      return {
        len, st, inv: [0, st + 6], hits: [],
        proj: { f: st, sprite: 'beam', color: s.fx, vx: 9, vy: 0, g: 0, x: 70, y: 110 * ch.size, w: 84, h: 110, life: 140,
          dmg: Math.round(s.dmg / 5), hs: 26, bs: 16, lvl: 'mid', str: 'H', hits: 5, every: 5, sup: true, juggle: true },
        anim: [[0, 'castW'], [st, 'cast'], [len - 8, 'cast'], [len, 'stance']]
      };
    },
    risec(ch, s) {
      const st = 4, n = 5;
      const hits = [];
      for (let k = 0; k < n; k++) {
        const f0 = st + k * 5;
        hits.push({ f0, f1: f0 + 3, dmg: Math.round(s.dmg / n), hs: 30, bs: 14, lvl: 'mid', kd: k === n - 1 ? 'launch' : null,
          launch: { vx: 3, vy: 12 }, juggle: true, hb: box([0, 74, 30, 210], 1, ch.size), push: 2, str: k === n - 1 ? 'X' : 'M' });
      }
      return {
        len: 160, st, hits, airborne: true, landRec: 24, inv: [0, st + 14],
        vel: [[st, 2.6, 16]],
        anim: [[0, 'riseW'], [st, 'rise'], [st + 24, 'rise'], [st + 34, 'fall'], [160, 'fall']]
      };
    }
  };

  function finish(m, ch, extra) {
    Object.assign(m, extra);
    m.hits = m.hits || [];
    m.hurt = m.hurt || 'stand';
    m.prop = ch.look.prop || null;
    return m;
  }

  // Rakentaa hahmon kaikki liikkeet: perushyökkäykset, heiton, erikoisliikkeet (s1L..s3H) ja superin
  EK.compileMoves = function (ch) {
    const moves = {};
    Object.keys(EK.NORMALS).forEach(id => { if (id !== 'throw') moves[id] = normal(ch, id); });
    moves.throw = throwMove(ch);
    ['s1', 's2', 's3'].forEach(k => {
      const s = ch[k];
      for (let i = 0; i < 3; i++) {
        const id = k + STR[i];
        moves[id] = finish(BUILD[s.type](ch, s, i), ch, { id, name: s.name, kind: 'special', str: STR[i], slot: k, type: s.type, fx: s.fx || s.color });
      }
    });
    const sp = ch.sup;
    moves.sup = finish(SUPER[sp.type](ch, sp), ch, { id: 'sup', name: sp.name, kind: 'super', str: 'X', type: sp.type, fx: sp.fx, sup: true });
    // Ensimmäinen ja viimeinen aktiivinen ruutu (vastaisku- ja rankaisuosumien tunnistukseen)
    Object.keys(moves).forEach(id => {
      const m = moves[id];
      const fs = m.hits.map(h => h.f0).concat(m.grab ? [m.grab.f0] : [], m.proj ? [m.proj.f] : [], m.counter ? [m.counter.f0] : [], m.tele ? [m.tele.f1] : []);
      const ls = m.hits.map(h => h.f1).concat(m.grab ? [m.grab.f1] : [], m.proj ? [m.proj.f] : [], m.counter ? [m.counter.f1] : [], m.tele ? [m.tele.f1] : []);
      m.first = fs.length ? Math.min.apply(null, fs) : m.st;
      m.last = ls.length ? Math.max.apply(null, ls) : m.st;
    });
    return moves;
  };
})();
