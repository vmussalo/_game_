/* Elämänkoulu – käynnistys, kankaan skaalaus ja pääsilmukka (60 ruutua sekunnissa, kiinteä askel). */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U, G = EK.Game;
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  let scale = 1, q = 1, offX = 0, offY = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    scale = Math.min(w / C.W, h / C.H);
    const dpr = window.devicePixelRatio || 1;
    q = U.clamp(scale * dpr, 1, 2.5);
    cv.width = Math.round(C.W * q); cv.height = Math.round(C.H * q);
    cv.style.width = Math.round(C.W * scale) + 'px'; cv.style.height = Math.round(C.H * scale) + 'px';
    offX = (w - C.W * scale) / 2; offY = (h - C.H * scale) / 2;
    cv.style.left = offX + 'px'; cv.style.top = offY + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // osoitin: valikkojen klikkaukset
  function toLogical(e) { return [(e.clientX - offX) / scale, (e.clientY - offY) / scale]; }
  cv.addEventListener('pointerdown', e => {
    EK.Audio.init();
    const [x, y] = toLogical(e);
    const h = G.hits.slice().reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (h && h.fn) h.fn();
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const [x, y] = toLogical(e);
    const h = G.hits.slice().reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    cv.style.cursor = h ? 'pointer' : 'default';
    if (h && h.hover) h.hover();
  });

  EK.Input.init(() => EK.Audio.init());
  const pb = document.getElementById('pauseBtn');
  if (pb) pb.addEventListener('pointerdown', e => { e.preventDefault(); if (G.name === 'fight' && G.scene.b.phase !== 'done') G.scene.paused = !G.scene.paused; });

  // Testit: ?test&scene=fight&p1=kaisa&p2=rami&cpu=both&ff=4
  const P = U.params;
  function boot() {
    if (P.scene === 'fight' || P.test && P.p1) {
      const cpu = P.cpu || 'both';
      const ctrl = [cpu === 'both' || cpu === '1' ? 'cpu' : null, cpu === 'both' || cpu === '2' ? 'cpu' : (P.mode === 'training' ? 'dummy' : null)];
      G.go('fight', { p1: P.p1 || 'kaisa', p2: P.p2 || 'rami', ctrl, mode: P.mode || 'watch', modern: [!!P.modern, false], stage: P.stage || (EK.CHAR[P.p2 || 'rami'].stage), diff: P.diff != null ? +P.diff : 2 });
    } else if (P.scene === 'select') G.go('select', { mode: P.mode || 'arcade' });
    else if (P.scene === 'vs') G.go('vs', { p1: P.p1 || 'kaisa', p2: P.p2 || 'hannu', ctrl: [null, 'cpu'], mode: 'arcade', modern: [false, false], stage: 'loft', boss: true, n: 7, of: 7 });
    else if (P.scene && G.SCENES[P.scene] && P.scene !== 'result' && P.scene !== 'ending') G.go(P.scene);
    else if (P.scene === 'ending') { G.arcade = { p1: P.p1 || 'kaisa', opp: [], n: 7, learned: [EK.LINES.kaisa.win[0], EK.LINES.rami.win[2]] }; G.go('ending'); if (P.page) G.scene.page = +P.page; }
    else G.go('title');
  }
  boot();
  // Pikakelaus testeihin: ?ff=RUUTUJA ajaa pelin eteenpäin heti käynnistyksessä
  if (P.ff) {
    for (let i = 0; i < +P.ff; i++) { G.t++; G.scene.update({}); }
    EK.Render.parts = []; EK.Render.screenFlash = 0; EK.Render.superBanner = null;
  }

  let last = performance.now(), acc = 0, t = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    acc += Math.min(200, now - last); last = now;
    let n = 0;
    // testitilassa (tf=N) ajetaan kiinteä määrä askelia jokaisella piirrolla ajasta riippumatta
    if (P.tf) acc = STEP * (+P.tf);
    while (acc >= STEP && n < (P.tf ? +P.tf : 5)) {
      acc -= STEP; n++;
      t++; G.t++;
      const m = EK.Input.pollMenu();
      if (document.hidden && G.name === 'fight') G.scene.paused = true;
      G.scene.update(m);
      EK.Input.endFrame();
    }
    ctx.setTransform(q, 0, 0, q, 0, 0);
    G.hits = [];
    G.scene.draw(ctx, t);
    // tila testejä varten
    if (G.name === 'fight' || G.name === 'result') {
      const b = G.scene.b;
      document.documentElement.setAttribute('data-state', 't' + t + ' ' + b.phase + ' r' + b.round + ' w' + b.wins.join('-') + ' hp' + b.f.map(f => Math.round(f.hp)).join('/') + (b.result ? ' winner' + b.result.winner : ''));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Palvelutyöntekijä: peli toimii myös ilman verkkoa (ei testeissä)
  if ('serviceWorker' in navigator && !P.test && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
