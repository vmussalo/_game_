/* Elämänkoulu – asennot. Hahmo on luuranko, jonka raajojen kulmat määritellään asteina.
   Raajojen kulmat ovat absoluuttisia: 0 = suoraan alas, 90 = eteenpäin vaakaan, 180 = ylös, negatiivinen = taaksepäin.
   t = vartalon kallistus (0 = pysty, + = eteen), hd = pään lisäkallistus.
   a1 = kaukainen käsi, a2 = lähempi käsi, l1 = kaukainen (taka)jalka, l2 = lähempi (etu)jalka. u = olkavarsi/reisi, f = kyynärvarsi/sääri.
   hy = lantion korkeus (jos puuttuu, lasketaan niin, että jalat ovat maassa). */
(function () {
  'use strict';
  const EK = window.EK, U = EK.U;
  const D = U.deg;
  EK.BONES = { torso: 58, ua: 31, fa: 29, th: 44, sh: 44, head: 15 };

  const P = {
    stance: { t: 6, hd: 0, a1u: 28, a1f: 150, a2u: 48, a2f: 128, l1u: -18, l1f: -8, l2u: 22, l2f: 5 },
    crouch: { t: 38, hd: -28, a1u: 40, a1f: 150, a2u: 62, a2f: 140, l1u: 50, l1f: -70, l2u: 85, l2f: -10 },
    jump: { t: 10, hd: 0, a1u: 60, a1f: 140, a2u: 80, a2f: 150, l1u: 70, l1f: -20, l2u: 100, l2f: 10, hy: 64 },
    jumpsq: { t: 18, hd: -10, a1u: 20, a1f: 120, a2u: 40, a2f: 120, l1u: 30, l1f: -40, l2u: 55, l2f: -15 },
    jabW: { t: 4, hd: 0, a1u: 26, a1f: 152, a2u: 22, a2f: 150, l1u: -18, l1f: -8, l2u: 22, l2f: 5 },
    jab: { t: 14, hd: -6, hx: 4, a1u: 24, a1f: 155, a2u: 88, a2f: 90, l1u: -24, l1f: -10, l2u: 26, l2f: 4 },
    str: { t: 20, hd: -8, hx: 6, a1u: 88, a1f: 90, a2u: 30, a2f: 150, l1u: -28, l1f: -14, l2u: 28, l2f: 4 },
    kickW: { t: -4, hd: 4, a1u: 30, a1f: 140, a2u: 40, a2f: 140, l1u: -4, l1f: 0, l2u: 82, l2f: -20 },
    kick: { t: -14, hd: 10, a1u: -10, a1f: 60, a2u: 50, a2f: 140, l1u: -6, l1f: 0, l2u: 84, l2f: 86 },
    hookW: { t: -6, hd: 0, a1u: -30, a1f: 40, a2u: 40, a2f: 150, l1u: -28, l1f: -14, l2u: 26, l2f: 6 },
    hook: { t: 26, hd: -12, hx: 10, a1u: 94, a1f: 96, a2u: 14, a2f: 150, l1u: -36, l1f: -22, l2u: 38, l2f: 4 },
    cjabW: { t: 36, hd: -26, a1u: 40, a1f: 150, a2u: 30, a2f: 160, l1u: 50, l1f: -70, l2u: 85, l2f: -10 },
    cjab: { t: 34, hd: -22, a1u: 40, a1f: 150, a2u: 102, a2f: 98, l1u: 50, l1f: -70, l2u: 85, l2f: -10 },
    lowkW: { t: 30, hd: -24, a1u: 40, a1f: 150, a2u: 60, a2f: 140, l1u: 46, l1f: -70, l2u: 60, l2f: -40 },
    lowk: { t: 24, hd: -18, a1u: 30, a1f: 140, a2u: 50, a2f: 130, l1u: 44, l1f: -70, l2u: 70, l2f: 82 },
    sweepW: { t: 40, hd: -28, a1u: 70, a1f: 30, a2u: 60, a2f: 120, l1u: 60, l1f: -80, l2u: 40, l2f: -60, hy: 34 },
    sweep: { t: 48, hd: -34, a1u: 30, a1f: 10, a2u: 50, a2f: 120, l1u: 80, l1f: -85, l2u: 86, l2f: 92, hy: 26 },
    jpunchW: { t: 10, hd: 0, a1u: 50, a1f: 130, a2u: 40, a2f: 150, l1u: 70, l1f: -20, l2u: 100, l2f: 10, hy: 64 },
    jpunch: { t: 22, hd: -10, a1u: 40, a1f: 130, a2u: 58, a2f: 58, l1u: 70, l1f: -20, l2u: 95, l2f: 10, hy: 64 },
    jkickW: { t: 4, hd: 0, a1u: 60, a1f: 140, a2u: 70, a2f: 150, l1u: 80, l1f: -20, l2u: 90, l2f: -20, hy: 64 },
    jkick: { t: -12, hd: 8, a1u: 100, a1f: 150, a2u: 120, a2f: 160, l1u: 90, l1f: -30, l2u: 60, l2f: 60, hy: 64 },
    jbigW: { t: 0, hd: 0, a1u: 60, a1f: 140, a2u: 70, a2f: 150, l1u: 60, l1f: -40, l2u: 100, l2f: -30, hy: 64 },
    jbig: { t: -22, hd: 12, a1u: -40, a1f: -20, a2u: -20, a2f: 10, l1u: 20, l1f: -60, l2u: 72, l2f: 74, hy: 64 },
    overW: { t: -10, hd: 6, a1u: 20, a1f: 120, a2u: 172, a2f: 192, l1u: -18, l1f: -8, l2u: 22, l2f: 5 },
    over: { t: 30, hd: -14, hx: 8, a1u: 20, a1f: 100, a2u: 100, a2f: 58, l1u: -30, l1f: -16, l2u: 36, l2f: 2 },
    grabW: { t: 12, hd: 0, a1u: 66, a1f: 80, a2u: 72, a2f: 86, l1u: -22, l1f: -10, l2u: 24, l2f: 4 },
    grab: { t: 22, hd: -6, hx: 6, a1u: 86, a1f: 70, a2u: 90, a2f: 76, l1u: -30, l1f: -16, l2u: 30, l2f: 4 },
    castW: { t: -10, hd: 0, a1u: -40, a1f: 30, a2u: -30, a2f: 40, l1u: -26, l1f: -12, l2u: 30, l2f: 6 },
    cast: { t: 20, hd: -8, hx: 8, a1u: 88, a1f: 90, a2u: 92, a2f: 92, l1u: -36, l1f: -20, l2u: 36, l2f: 2 },
    riseW: { t: 34, hd: -20, a1u: 30, a1f: 120, a2u: 30, a2f: 60, l1u: 50, l1f: -70, l2u: 85, l2f: -10 },
    rise: { t: -6, hd: 8, a1u: -20, a1f: 10, a2u: 166, a2f: 176, l1u: -6, l1f: 0, l2u: 50, l2f: -20, hy: 90 },
    fall: { t: 0, hd: 0, a1u: 120, a1f: 140, a2u: 110, a2f: 130, l1u: 10, l1f: -20, l2u: 30, l2f: 0, hy: 88 },
    rushW: { t: -8, hd: 4, a1u: -20, a1f: 60, a2u: 20, a2f: 120, l1u: -20, l1f: -10, l2u: 30, l2f: 10 },
    rush: { t: 36, hd: -20, hx: 10, a1u: 40, a1f: 120, a2u: 82, a2f: 160, l1u: -52, l1f: -46, l2u: 52, l2f: 10 },
    slideW: { t: 20, hd: -10, a1u: -30, a1f: 0, a2u: -10, a2f: 20, l1u: 40, l1f: -60, l2u: 70, l2f: -10 },
    slide: { t: -62, hd: 30, a1u: -70, a1f: -40, a2u: -40, a2f: -20, l1u: 60, l1f: 30, l2u: 84, l2f: 90, hy: 24 },
    tree: { t: 0, hd: 0, a1u: 168, a1f: 186, a2u: 172, a2f: 190, l1u: 0, l1f: 0, l2u: 70, l2f: -100, calm: 1 },
    palm: { t: 22, hd: -8, hx: 10, a1u: 20, a1f: 90, a2u: 92, a2f: 94, l1u: -36, l1f: -20, l2u: 38, l2f: 2 },
    teleW: { t: 10, hd: 10, a1u: 40, a1f: 170, a2u: 36, a2f: 172, l1u: 30, l1f: -50, l2u: 60, l2f: -30, calm: 1 },
    hitHi: { t: -22, hd: -18, a1u: -30, a1f: 10, a2u: 20, a2f: 40, l1u: -22, l1f: -10, l2u: 18, l2f: 2, hurt: 1 },
    hitLo: { t: 18, hd: -10, a1u: 10, a1f: 60, a2u: 30, a2f: 90, l1u: 50, l1f: -70, l2u: 85, l2f: -10, hurt: 1 },
    hitGut: { t: 34, hd: 10, a1u: 20, a1f: 40, a2u: 30, a2f: 60, l1u: -24, l1f: -6, l2u: 20, l2f: 2, hurt: 1 },
    block: { t: -6, hd: 6, a1u: 60, a1f: 162, a2u: 52, a2f: 166, l1u: -24, l1f: -12, l2u: 24, l2f: 4 },
    cblock: { t: 30, hd: -14, a1u: 62, a1f: 160, a2u: 56, a2f: 166, l1u: 50, l1f: -70, l2u: 85, l2f: -10 },
    juggle: { t: -64, hd: -20, a1u: 160, a1f: 172, a2u: 140, a2f: 160, l1u: 40, l1f: 60, l2u: 60, l2f: 82, hy: 50, hurt: 1 },
    down: { t: -90, hd: 0, a1u: -94, a1f: -96, a2u: -80, a2f: -90, l1u: 86, l1f: 92, l2u: 80, l2f: 96, hy: 13, ko: 0 },
    koSit: { t: -12, hd: 24, a1u: -20, a1f: 10, a2u: 110, a2f: 60, l1u: 84, l1f: 94, l2u: 128, l2f: 12, hy: 22, ko: 1 },
    winA: { t: -4, hd: -6, a1u: 18, a1f: 40, a2u: 172, a2f: 182, l1u: -8, l1f: -2, l2u: 10, l2f: 2, happy: 1 },
    winB: { t: -2, hd: 4, a1u: 10, a1f: 150, a2u: 70, a2f: 160, l1u: -8, l1f: -2, l2u: 10, l2f: 2, happy: 1 },
    intro: { t: -6, hd: -6, a1u: 160, a1f: 172, a2u: 166, a2f: 178, l1u: -8, l1f: -2, l2u: 10, l2f: 2 },
    lose: { t: 12, hd: 26, a1u: 4, a1f: 4, a2u: 8, a2f: 6, l1u: -6, l1f: -2, l2u: 8, l2f: 2 },
    parry: { t: 0, hd: 4, a1u: 58, a1f: 162, a2u: 54, a2f: 160, l1u: -12, l1f: -4, l2u: 14, l2f: 2, calm: 1 },
    rest: { t: 0, hd: 14, a1u: 40, a1f: 84, a2u: 36, a2f: 92, l1u: 82, l1f: -84, l2u: 94, l2f: -78, hy: 18, calm: 1 },
    dashF: { t: 24, hd: -12, a1u: -40, a1f: 20, a2u: 60, a2f: 140, l1u: -44, l1f: -64, l2u: 62, l2f: 12 },
    dashB: { t: -16, hd: 4, a1u: 50, a1f: 150, a2u: 40, a2f: 150, l1u: -34, l1f: -10, l2u: 34, l2f: 12 },
    stagger: { t: -10, hd: -14, a1u: 8, a1f: 18, a2u: 14, a2f: 30, l1u: -12, l1f: -4, l2u: 14, l2f: 2, hurt: 1 },
    serve: { t: 8, hd: 0, a1u: 70, a1f: 84, a2u: 74, a2f: 88, l1u: -12, l1f: -4, l2u: 14, l2f: 2, happy: 1 }
  };

  // Lasketaan valmiiksi maassa seisovien asentojen lantion korkeus
  function legDrop(u, f) { const B = EK.BONES; return B.th * Math.cos(u * D) + B.sh * Math.cos(f * D); }
  function autoHy(p) { return Math.max(legDrop(p.l1u, p.l1f), legDrop(p.l2u, p.l2f)); }
  Object.keys(P).forEach(k => { const p = P[k]; p.name = k; if (p.hy == null) { p.ground = true; p.hy = autoHy(p); } p.hx = p.hx || 0; });
  EK.POSES = P;

  const FIELDS = ['t', 'hd', 'a1u', 'a1f', 'a2u', 'a2f', 'l1u', 'l1f', 'l2u', 'l2f', 'hy', 'hx'];
  function blend(a, b, k) {
    const o = {};
    FIELDS.forEach(f => { o[f] = a[f] + (b[f] - a[f]) * k; });
    o.ground = a.ground && b.ground;
    if (o.ground) o.hy = autoHy(o);
    const pick = k < 0.5 ? a : b;
    o.hurt = pick.hurt; o.calm = pick.calm; o.happy = pick.happy; o.ko = pick.ko;
    return o;
  }
  EK.blendPose = blend;

  function clone(p) { return blend(p, p, 0); }

  // Kävely: jalat heiluvat vaiheen mukaan
  function walk(phase, back) {
    const s = Math.sin(phase), c = Math.cos(phase);
    const p = clone(P.stance);
    p.l1u = -6 + 22 * s; p.l1f = p.l1u - 12 - 18 * Math.max(0, c);
    p.l2u = 8 - 22 * s; p.l2f = p.l2u - 12 - 18 * Math.max(0, -c);
    p.t = back ? 0 : 10;
    p.hy = autoHy(p);
    return p;
  }

  // Liikkeen avainruutujen tulkinta
  function animAt(anim, f) {
    for (let i = 0; i < anim.length - 1; i++) {
      const a = anim[i], b = anim[i + 1];
      if (f >= a[0] && f <= b[0]) {
        const k = b[0] === a[0] ? 1 : (f - a[0]) / (b[0] - a[0]);
        return blend(P[a[1]] || P.stance, P[b[1]] || P.stance, U.ease(U.clamp(k, 0, 1)));
      }
    }
    return clone(P[anim[anim.length - 1][1]] || P.stance);
  }

  const CINE = {
    rush: ['jab', 'hook', 'kick', 'cast'],
    grab: ['grab', 'over', 'hook', 'cast']
  };

  // Hahmon tilasta asento piirtoa varten
  EK.poseFor = function (f, battle, time) {
    const s = f.state, sf = f.sf;
    const T = time || 0;
    switch (s) {
      case 'intro': return sf < 70 ? blend(P.intro, P.stance, U.clamp((sf - 40) / 30, 0, 1)) : clone(P.stance);
      case 'stand': {
        if (f.guarding) return clone(f.crouching ? P.cblock : P.block);
        if (f.crouching) return clone(P.crouch);
        if (f.mvx > 0.1) return walk(T * 0.22 * (f.ch.walk / 3), false);
        if (f.mvx < -0.1) return walk(-T * 0.2, true);
        const p = clone(P.stance);
        const br = Math.sin(T * 0.08 + f.idx);
        p.t += br * 1.5; p.a2u += br * 3; p.a1f += br * 2; p.hy -= 0.8 + br * 0.8;
        return p;
      }
      case 'jumpsq': return clone(P.jumpsq);
      case 'air': return f.vy > 3 ? blend(P.jump, P.fall, 0.15) : blend(P.jump, P.fall, U.clamp(-f.vy / 10, 0, 0.6));
      case 'move': return animAt(f.move.anim, f.mf);
      case 'land': return f.counterPose ? (sf < 18 ? clone(P.palm) : blend(P.palm, P.stance, (sf - 18) / 8)) : blend(P.jumpsq, P.stance, U.clamp(sf / Math.max(1, f.landT), 0, 1));
      case 'dash': return clone(f.dashDir > 0 ? P.dashF : P.dashB);
      case 'hit': {
        const k = U.clamp(sf / Math.max(1, f.stun), 0, 1);
        const base = f.crouching ? P.hitLo : (f.stun > 18 ? P.hitGut : P.hitHi);
        return blend(base, f.crouching ? P.crouch : P.stance, U.ease(Math.max(0, k * 1.4 - 0.4)));
      }
      case 'block': return clone(f.crouching ? P.cblock : P.block);
      case 'juggle': case 'thrown': case 'ko': {
        const p = clone(P.juggle);
        p.t = -40 - Math.min(60, sf * 3);
        return p;
      }
      case 'down': return clone(P.down);
      case 'getup': {
        const k = sf / 22;
        return k < 0.5 ? blend(P.down, P.crouch, k * 2) : blend(P.crouch, P.stance, (k - 0.5) * 2);
      }
      case 'koDown': return sf < 40 ? clone(P.down) : blend(P.down, P.koSit, U.clamp((sf - 40) / 24, 0, 1));
      case 'parry': return clone(P.parry);
      case 'rest': return blend(P.crouch, P.rest, U.clamp(sf / 10, 0, 1));
      case 'restEnd': return blend(P.rest, P.stance, U.clamp(sf / 14, 0, 1));
      case 'stagger': { const p = clone(P.stagger); p.t += Math.sin(sf * 0.6) * 6; return p; }
      case 'throwing': return clone(battle && battle.grab && battle.grab.t > battle.grab.len - 16 ? P.cast : P.grab);
      case 'cineAtk': {
        const kind = battle && battle.cine ? battle.cine.kind : 'rush';
        const list = f.ch.sup.type === 'grabc' && f.ch.id === 'martta' ? ['serve', 'serve', 'grab', 'cast'] : CINE[kind] || CINE.rush;
        const i = Math.min(list.length - 1, Math.floor(sf / 18));
        const k = (sf % 18) / 18;
        return blend(P[list[Math.max(0, i - 1)]] || P.stance, P[list[i]], U.clamp(k * 3, 0, 1));
      }
      case 'cine': {
        if (battle && battle.cine && battle.cine.a.ch.id === 'martta') return clone(P.koSit);
        return clone(Math.floor(sf / 9) % 2 ? P.hitHi : P.hitGut);
      }
      case 'win': {
        const w = f.winPose ? P.winB : P.winA;
        return blend(P.stance, w, U.clamp(sf / 14, 0, 1));
      }
      case 'lose': return blend(P.stance, P.lose, U.clamp(sf / 20, 0, 1));
      default: return clone(P.stance);
    }
  };
  EK.animAt = animAt;
})();
