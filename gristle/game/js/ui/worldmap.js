'use strict';
// World map: a painted survey chart of the Rind.
(function () {
  const U = GG.U, G = GG.G, W = GG.World, SP = GG.SP;
  const WM = GG.WorldMap = {};
  const CS = 26;
  let chart = null;
  WM.hover = null;

  const COL = { plains: '#a08660', bloom: '#a24e56', badlands: '#7a6c5c', river: '#6e5a44' };
  WM.build = () => {
    const w = W.w * CS, h = W.h * CS;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // smooth terrain painted at sub-cell resolution, then scaled up
    const SUB = 4, sw = W.w * SUB, sh = W.h * SUB;
    const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
    const sx = sm.getContext('2d'), id = sx.createImageData(sw, sh);
    const RGB = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)]]));
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const fx = (x + 0.5) / SUB - 0.5, fy = (y + 0.5) / SUB - 0.5;
      const t = W.terrainF(fx, fy), c = RGB[t];
      const n = (U.fbm(fx / 2.5, fy / 2.5, 77) - 0.5) * 40;
      const i = (y * sw + x) * 4;
      id.data[i] = c[0] + n; id.data[i + 1] = c[1] + n; id.data[i + 2] = c[2] + n * 0.8; id.data[i + 3] = 255;
    }
    sx.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'blur(3px)'; ctx.drawImage(sm, -6, -6, w + 12, h + 12); ctx.filter = 'none';
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const t = W.terrain(x, y), cx = x * CS + CS / 2, cy = y * CS + CS / 2, hh = k => U.hash(x, y, k);
      if (t === 'bloom' && hh(1) > 0.72) { const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, 9); g.addColorStop(0, '#e8a0a0'); g.addColorStop(1, '#8a3040'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx + (hh(2) - 0.5) * 10, cy, 5 + hh(3) * 4, 3 + hh(4) * 3, 0, 0, 7); ctx.fill(); }
      if (t === 'badlands' && hh(5) > 0.8) { ctx.fillStyle = '#5a4c40'; ctx.beginPath(); ctx.moveTo(cx - 9, cy + 5); ctx.lineTo(cx - 6, cy - 5); ctx.lineTo(cx + 6, cy - 6); ctx.lineTo(cx + 9, cy + 5); ctx.fill(); ctx.fillStyle = '#9a8a74'; ctx.fillRect(cx - 6, cy - 6, 12, 2); }
      if (t === 'plains' && hh(6) > 0.86) { ctx.strokeStyle = 'rgba(80,70,30,0.5)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(cx + k * 3, cy + 2); ctx.lineTo(cx + k * 4, cy - 3); ctx.stroke(); } }
    }
    // roads (old highway, faded)
    ctx.strokeStyle = 'rgba(70,45,25,0.55)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
    const road = (a, b) => { const A = W.NODES[a], B = W.NODES[b]; ctx.beginPath(); ctx.moveTo(A.x * CS + CS / 2, A.y * CS + CS / 2); ctx.quadraticCurveTo((A.x + B.x) / 2 * CS + 30, (A.y + B.y) / 2 * CS - 20, B.x * CS + CS / 2, B.y * CS + CS / 2); ctx.stroke(); };
    road('gutwater', 'crossing'); road('crossing', 'tallowmarket'); road('crossing', 'calliope'); road('gutwater', 'saintoffal');
    ctx.setLineDash([]);
    // paper grain, stains, border
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.25; ctx.fillStyle = ctx.createPattern(SP.noise(), 'repeat'); ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 6; i++) { const g = ctx.createRadialGradient(U.hash(i, 1, 9) * w, U.hash(i, 2, 9) * h, 5, U.hash(i, 1, 9) * w, U.hash(i, 2, 9) * h, 60 + U.hash(i, 3, 9) * 90); g.addColorStop(0, 'rgba(120,70,30,0.0)'); g.addColorStop(0.85, 'rgba(120,70,30,0.12)'); g.addColorStop(1, 'rgba(120,70,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.65); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(70,35,10,0.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6); ctx.lineWidth = 1.5; ctx.strokeRect(12, 12, w - 24, h - 24);
    // compass
    ctx.save(); ctx.translate(w - 70, h - 70); ctx.fillStyle = '#3a2414';
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(6, 0); ctx.lineTo(-6, 0); ctx.fill(); }
    ctx.fillStyle = '#a8302c'; ctx.font = '16px Rye, serif'; ctx.textAlign = 'center'; ctx.fillText('N', 0, -40); ctx.restore();
    ctx.fillStyle = '#3a2414'; ctx.font = '22px Rye, serif'; ctx.textAlign = 'left';
    ctx.fillText('THE RIND', 26, 44); ctx.font = 'italic 14px "IM Fell English", serif'; ctx.fillText('A Survey of the Gutwater Reach, much corrected in pencil', 26, 62);
    chart = c;
  };

  WM.layout = () => {
    const [Wd, Hd] = GG.Render.size();
    const vh = Hd - GG.Render.HUD_H - 20;
    const sc = Math.min((Wd - 40) / (W.w * CS), vh / (W.h * CS));
    const w = W.w * CS * sc, h = W.h * CS * sc;
    return { sc, x: (Wd - w) / 2, y: 10 + (vh - h) / 2, w, h };
  };
  WM.toCell = (sx, sy) => { const L = WM.layout(); return [(sx - L.x) / L.sc / CS - 0.5, (sy - L.y) / L.sc / CS - 0.5]; };
  WM.nodeAtScreen = (sx, sy) => {
    const [x, y] = WM.toCell(sx, sy);
    return Object.entries(W.NODES).find(([id, n]) => W.known(id) && Math.hypot(n.x - x, n.y - y) < 1.1);
  };

  WM.draw = (ctx, t) => {
    if (!chart) WM.build();
    const S = G.S, L = WM.layout();
    ctx.fillStyle = '#1a100a'; ctx.fillRect(0, 0, ...GG.Render.size());
    ctx.drawImage(chart, L.x, L.y, L.w, L.h);
    const P = (x, y) => [L.x + (x + 0.5) * CS * L.sc, L.y + (y + 0.5) * CS * L.sc];
    // nodes
    for (const [id, n] of Object.entries(W.NODES)) {
      if (!W.known(id)) continue;
      const [x, y] = P(n.x, n.y);
      const hov = WM.hover === id;
      ctx.save(); ctx.translate(x, y);
      if (n.teaser) {
        ctx.fillStyle = 'rgba(58,36,20,0.75)'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8dcc0'; ctx.font = '15px Rye, serif'; ctx.textAlign = 'center'; ctx.fillText(id === 'calliope' ? '♪' : '?', 0, 5);
        if (id === 'calliope') { ctx.fillStyle = `rgba(200,170,120,${0.25 + Math.sin(t * 1.5) * 0.1})`; ctx.beginPath(); ctx.ellipse(20, -6, 40, 12, -0.2, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = '#a8302c'; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, hov ? 13 : 11, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f0e0b8';
        if (id === 'gutwater') { for (const dx of [-5, 0, 5]) { ctx.fillRect(dx - 2, -3, 4, 6); ctx.beginPath(); ctx.moveTo(dx - 3, -3); ctx.lineTo(dx, -7); ctx.lineTo(dx + 3, -3); ctx.fill(); } }
        else if (id === 'sump') { ctx.fillRect(-2, -7, 4, 12); ctx.fillRect(-6, 1, 12, 4); }
        else { ctx.fillRect(-1, -8, 2, 14); ctx.beginPath(); ctx.arc(0, -6, 3, 0, 7); ctx.fill(); }
      }
      ctx.restore();
      ctx.font = `${hov ? 17 : 15}px Rye, serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(232,220,192,0.85)'; ctx.strokeText(n.name, x, y - 18); ctx.fillStyle = '#2a1408'; ctx.fillText(n.name, x, y - 18);
    }
    // destination
    const wd = S.world;
    const [px, py] = P(wd.x, wd.y);
    if (wd.dest) {
      const [dx, dy] = P(wd.dest[0], wd.dest[1]);
      ctx.strokeStyle = 'rgba(168,48,44,0.85)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(dx, dy); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#a8302c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx - 7, dy - 7); ctx.lineTo(dx + 7, dy + 7); ctx.moveTo(dx + 7, dy - 7); ctx.lineTo(dx - 7, dy + 7); ctx.stroke();
    }
    // party marker
    ctx.strokeStyle = `rgba(232,192,72,${0.6 + Math.sin(t * 4) * 0.3})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 14 + Math.sin(t * 4) * 2, 0, 7); ctx.stroke();
    ctx.fillStyle = '#2a1408'; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8c048'; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 7); ctx.fill();
    // info strip
    ctx.fillStyle = 'rgba(26,16,10,0.85)'; ctx.fillRect(L.x, L.y + L.h - 30, L.w, 30);
    ctx.fillStyle = '#e8dcc0'; ctx.font = '15px "Special Elite", monospace'; ctx.textAlign = 'left';
    const terr = W.terrain(Math.round(wd.x), Math.round(wd.y));
    ctx.fillText(`${U.fmtTime(S.time)}   ·   Terrain: ${terr}   ·   ${wd.dest ? 'Travelling…' : 'Click the chart to travel. Click a location to go there.'}`, L.x + 14, L.y + L.h - 10);
    if (S.world.enc || S.ui) return;
    if (WM.hover) {
      const n = W.NODES[WM.hover];
      const [x, y] = P(n.x, n.y);
      const txt = n.desc || n.teaser || '';
      ctx.font = 'italic 14px "IM Fell English", serif';
      const tw = Math.min(360, ctx.measureText(txt).width + 20);
      ctx.fillStyle = 'rgba(232,220,192,0.95)'; ctx.fillRect(x - tw / 2, y + 16, tw, 24);
      ctx.fillStyle = '#2a1408'; ctx.textAlign = 'center'; ctx.fillText(txt.length > 60 ? txt.slice(0, 58) + '…' : txt, x, y + 33);
    }
  };
})();
