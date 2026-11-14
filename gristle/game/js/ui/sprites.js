'use strict';
// Procedural "pre-rendered" art: painted ground, extruded walls, objects, characters, portraits.
// Any sprite can be replaced by a PNG listed in gfx/manifest.js (see GRAFIIKKA.md).
(function () {
  const U = GG.U;
  const SP = GG.SP = {};
  const HW = U.HW, RH = U.RH;
  const OUT = '#1c130d';

  // ---------------------------------------------------------- colour helpers
  const hex2 = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  SP.shade = (h, f, a = 1) => { const [r, g, b] = hex2(h); return f >= 0 ? rgb(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f, a) : rgb(r * (1 + f), g * (1 + f), b * (1 + f), a); };
  SP.mix = (h1, h2, t) => { const a = hex2(h1), b = hex2(h2); return '#' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0')).join(''); };
  const mk = (w, h) => { const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }); return c; };
  SP.mk = mk;

  // ---------------------------------------------------------- external graphics
  SP.img = {};
  SP.loadGfx = () => {
    const man = GG.GFX_MANIFEST || {};
    const base = GG.GFX_BASE || 'gfx/';
    for (const [key, d] of Object.entries(man)) {
      const im = new Image();
      im.onload = () => { SP.img[key] = { im, ax: d.ax != null ? d.ax : 0.5, ay: d.ay != null ? d.ay : 0.95, s: d.s || 1 }; };
      im.src = base + (d.file || d);
    }
  };
  SP.ext = key => SP.img[key];
  const drawExt = (ctx, key, x, y, flip) => {
    const e = SP.img[key];
    if (!e) return false;
    const w = e.im.width * e.s, h = e.im.height * e.s;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(e.im, -w * e.ax, -h * e.ay, w, h);
    ctx.restore();
    return true;
  };

  // ---------------------------------------------------------- noise texture
  let noiseTex = null;
  SP.noise = () => {
    if (noiseTex) return noiseTex;
    const c = mk(256, 256), x = c.getContext('2d');
    const id = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (Math.random() - 0.5) * 120; id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0);
    noiseTex = c;
    return c;
  };

  const hexPath = (ctx, cx, cy, scale = 1) => {
    const cs = U.corners(scale);
    ctx.beginPath();
    cs.forEach(([dx, dy], i) => (i ? ctx.lineTo(cx + dx, cy + dy) : ctx.moveTo(cx + dx, cy + dy)));
    ctx.closePath();
  };
  SP.hexPath = hexPath;

  // ---------------------------------------------------------- ground prerender
  SP.PAD = { x: HW, y: 60 };
  SP.renderGround = (geo) => {
    const W = geo.w * HW + HW * 2, H = geo.h * RH + 120;
    const c = mk(W, H), ctx = c.getContext('2d');
    const ox = SP.PAD.x, oy = SP.PAD.y;
    const ext = SP.img['ground/' + geo.def.id];
    if (ext) { ctx.drawImage(ext.im, 0, 0, W, H); return c; }
    ctx.fillStyle = (GG.TER[geo.def.base] || GG.TER.dirt).c;
    ctx.fillRect(0, 0, W, H);
    const T = (x, y) => geo.ter[U.clamp(y, 0, geo.h - 1) * geo.w + U.clamp(x, 0, geo.w - 1)];
    // soft painted blobs
    for (let y = -1; y <= geo.h; y++) for (let x = -1; x <= geo.w; x++) {
      const t = T(x, y), td = GG.TER[t];
      if (td.floor) continue;
      const [px, py] = U.px(x, y);
      const v = U.hash(x, y, 5) - 0.5;
      const col = SP.shade(td.c, v * 0.18);
      const g = ctx.createRadialGradient(ox + px, oy + py, 2, ox + px, oy + py, HW * 0.95);
      g.addColorStop(0, col); g.addColorStop(0.55, col); g.addColorStop(1, SP.shade(td.c, v * 0.18, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(ox + px, oy + py, HW * 0.95, HW * 0.95 * U.SQ, 0, 0, 7); ctx.fill();
    }
    // large-scale light variation
    for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) {
      const n = U.fbm(x / 260, y / 160, 3) - 0.5;
      ctx.fillStyle = n > 0 ? `rgba(255,240,200,${n * 0.16})` : `rgba(30,15,5,${-n * 0.22})`;
      ctx.fillRect(x, y, 24, 24);
    }
    // details per cell
    for (let y = 0; y < geo.h; y++) for (let x = 0; x < geo.w; x++) {
      const t = T(x, y);
      const [px0, py0] = U.px(x, y);
      const px = ox + px0, py = oy + py0, h = (k) => U.hash(x, y, k);
      if (GG.TER[t].floor) { SP.floorTile(ctx, t, px, py, x, y); continue; }
      if (t === 'scrub' || (t === 'dirt' && h(1) > 0.7)) {
        for (let i = 0; i < (t === 'scrub' ? 5 : 2); i++) {
          const gx = px + (h(10 + i) - 0.5) * HW * 0.9, gy = py + (h(20 + i) - 0.5) * RH * 0.9;
          ctx.strokeStyle = SP.shade(t === 'scrub' ? '#5a5a2a' : '#6a5a34', (h(30 + i) - 0.5) * 0.4);
          ctx.lineWidth = 1.2;
          for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(gx + k, gy); ctx.lineTo(gx + k * 2.2 + (h(40 + i) - 0.5) * 3, gy - 4 - h(50 + i + k) * 5); ctx.stroke(); }
        }
      }
      if (t === 'cracked' && h(2) > 0.4) {
        ctx.strokeStyle = 'rgba(60,40,24,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); let cx = px + (h(3) - 0.5) * HW, cy = py + (h(4) - 0.5) * RH; ctx.moveTo(cx, cy);
        for (let i = 0; i < 4; i++) { cx += (h(5 + i) - 0.5) * 18; cy += (h(9 + i) - 0.5) * 9; ctx.lineTo(cx, cy); }
        ctx.stroke();
      }
      if (t === 'fleshgrass' || t === 'flesh') {
        if (h(6) > (t === 'flesh' ? 0.3 : 0.65)) {
          ctx.strokeStyle = t === 'flesh' ? 'rgba(110,30,45,0.55)' : 'rgba(110,40,40,0.35)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); const sx = px + (h(7) - 0.5) * HW, sy = py + (h(8) - 0.5) * RH;
          ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + 10, sy - 6 + h(11) * 8, sx + 18, sy + 4, sx + 26 * (h(12) + 0.4), sy + (h(13) - 0.5) * 10); ctx.stroke();
        }
        if (h(14) > 0.82) {
          const bx = px + (h(15) - 0.5) * HW * 0.8, by = py + (h(16) - 0.5) * RH * 0.8, r = 2 + h(17) * 3;
          const g = ctx.createRadialGradient(bx - r / 3, by - r / 3, 0, bx, by, r);
          g.addColorStop(0, '#f0b8a8'); g.addColorStop(1, '#a04858');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.7, 0, 0, 7); ctx.fill();
        }
        if (t === 'fleshgrass' && h(18) > 0.55) {
          ctx.strokeStyle = 'rgba(150,70,60,0.6)'; ctx.lineWidth = 1.1;
          const gx = px + (h(19) - 0.5) * HW, gy = py + (h(20) - 0.5) * RH;
          for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 2, gy); ctx.quadraticCurveTo(gx + k * 3, gy - 4, gx + k * 4 + 1, gy - 6 - h(21 + k) * 3); ctx.stroke(); }
        }
      }
      if (t === 'mud' && h(22) > 0.5) {
        ctx.fillStyle = 'rgba(200,180,150,0.12)';
        ctx.beginPath(); ctx.ellipse(px + (h(23) - 0.5) * 20, py + (h(24) - 0.5) * 8, 6 + h(25) * 8, 2 + h(26) * 2, 0, 0, 7); ctx.fill();
      }
      if ((t === 'road' || t === 'gravel') && h(27) > 0.35) {
        for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(${h(28 + i) > 0.5 ? '60,45,30' : '210,190,160'},0.35)`; ctx.fillRect(px + (h(31 + i) - 0.5) * HW, py + (h(34 + i) - 0.5) * RH, 2, 1.5); }
      }
      if (t === 'bone' || (h(37) > 0.97 && t !== 'road')) {
        ctx.fillStyle = 'rgba(230,220,195,0.7)';
        ctx.fillRect(px + (h(38) - 0.5) * 20, py + (h(39) - 0.5) * 8, 6, 1.5);
      }
    }
    // ambient occlusion along walls
    for (let y = 0; y < geo.h; y++) for (let x = 0; x < geo.w; x++) {
      const w = geo.wall[y * geo.w + x];
      if (!w || GG.WALL[w].low || GG.WALL[w].bars) continue;
      const [px0, py0] = U.px(x, y);
      const g = ctx.createRadialGradient(ox + px0, oy + py0 + 4, 4, ox + px0, oy + py0 + 4, HW * 0.9);
      g.addColorStop(0, 'rgba(15,8,4,0.55)'); g.addColorStop(1, 'rgba(15,8,4,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(ox + px0, oy + py0 + 4, HW * 0.9, HW * 0.9 * U.SQ, 0, 0, 7); ctx.fill();
    }
    // grain
    ctx.globalAlpha = 0.09; ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(SP.noise(), 'repeat'); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return c;
  };

  SP.floorTile = (ctx, t, px, py, x, y) => {
    const base = GG.TER[t].c;
    const v = (U.hash(x, y, 61) - 0.5) * (t === 'rug' ? 0.03 : 0.1);
    hexPath(ctx, px, py, 1.03);
    ctx.fillStyle = SP.shade(base, v); ctx.fill();
    ctx.save(); hexPath(ctx, px, py, 1.03); ctx.clip();
    if (t === 'boards' || t === 'stage') {
      ctx.strokeStyle = 'rgba(20,10,4,0.45)'; ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(px - HW, py + k * 5 + (x % 2) * 2); ctx.lineTo(px + HW, py + k * 5 + (x % 2) * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,220,180,0.08)';
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(px - HW, py + k * 5 + 1 + (x % 2) * 2); ctx.lineTo(px + HW, py + k * 5 + 1 + (x % 2) * 2); ctx.stroke(); }
    } else if (t === 'metal') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(px - HW / 2 + 2, py - RH / 2 + 1, HW - 4, RH - 2);
      ctx.fillStyle = 'rgba(200,190,170,0.35)';
      for (const [dx, dy] of [[-HW / 2 + 5, -RH / 2 + 4], [HW / 2 - 5, -RH / 2 + 4], [-HW / 2 + 5, RH / 2 - 4], [HW / 2 - 5, RH / 2 - 4]]) ctx.fillRect(px + dx, py + dy, 1.5, 1.5);
      if (U.hash(x, y, 62) > 0.7) { ctx.fillStyle = 'rgba(120,60,30,0.3)'; ctx.beginPath(); ctx.ellipse(px + (U.hash(x, y, 63) - 0.5) * 20, py, 8, 3, 0, 0, 7); ctx.fill(); }
    } else if (t === 'rug') {
      if ((x + y) % 3 === 0) { ctx.fillStyle = 'rgba(220,170,90,0.18)'; ctx.fillRect(px - 2, py - 1, 4, 2); }
    } else if (t === 'concrete') {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(px - 3, py - 1, 6, 2);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------- walls (cached per type)
  const wallCache = {};
  SP.wallSprite = (type, v) => {
    const key = type + v;
    if (wallCache[key]) return wallCache[key];
    const W = GG.WALL[type];
    const h = W.h, cs = U.corners(1.02);
    const cw = HW + 8, ch = h + RH * 2 + 8;
    const c = mk(cw, ch), ctx = c.getContext('2d');
    const cx = cw / 2, cy = ch - RH - 2;     // ground centre
    const P = (i, up = 0) => [cx + cs[i][0], cy + cs[i][1] - up];
    const face = (i, j, col) => {
      const a = P(i), b = P(j), a2 = P(i, h), b2 = P(j, h);
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...b2); ctx.lineTo(...a2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      return [a, b, a2, b2];
    };
    if (W.bars) {
      ctx.strokeStyle = W.c; ctx.lineWidth = 2.2;
      for (let i = -3; i <= 3; i++) { const x = cx + i * 6; ctx.beginPath(); ctx.moveTo(x, cy + 2); ctx.lineTo(x, cy - h); ctx.stroke(); }
      ctx.strokeStyle = W.top; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 20, cy - h); ctx.lineTo(cx + 20, cy - h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 20, cy - h * 0.45); ctx.lineTo(cx + 20, cy - h * 0.45); ctx.stroke();
      wallCache[key] = { c, ax: cx, ay: cy };
      return wallCache[key];
    }
    if (W.low) { // fence
      ctx.fillStyle = W.c;
      for (const dx of [-14, 0, 14]) { ctx.fillRect(cx + dx - 2, cy - h - 4, 4, h + 6); }
      ctx.fillStyle = W.top;
      ctx.fillRect(cx - 22, cy - h + 2, 44, 3); ctx.fillRect(cx - 22, cy - h / 2, 44, 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.strokeRect(cx - 22, cy - h + 2, 44, 3);
      wallCache[key] = { c, ax: cx, ay: cy };
      return wallCache[key];
    }
    // box-style wall: a top slab and one front face, so neighbouring cells merge into one wall
    const base = W.c;
    const x0 = cx - HW / 2 - 0.5, x1 = cx + HW / 2 + 0.5;
    const fb = cy + RH / 2 + 1, ft = fb - h;          // front face bottom / top
    const tt = ft - RH - 1;                            // top slab back edge
    // front face
    const fg = ctx.createLinearGradient(0, ft, 0, fb);
    fg.addColorStop(0, SP.shade(base, 0.06)); fg.addColorStop(1, SP.shade(base, -0.32));
    ctx.fillStyle = fg; ctx.fillRect(x0, ft, x1 - x0, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, ft, x1 - x0, h); ctx.clip();
    if (type === 'plank') {
      ctx.strokeStyle = 'rgba(25,12,5,0.5)'; ctx.lineWidth = 1;
      for (let y = 6; y < h; y += 8) { ctx.beginPath(); ctx.moveTo(x0, fb - y); ctx.lineTo(x1, fb - y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,220,170,0.08)';
      for (let y = 7; y < h; y += 8) { ctx.beginPath(); ctx.moveTo(x0, fb - y); ctx.lineTo(x1, fb - y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,15,5,0.55)'; ctx.fillRect(x0 + 6 + v * 9, ft, 1.5, h);
      ctx.fillStyle = 'rgba(20,10,5,0.6)'; for (let y = 10; y < h; y += 16) ctx.fillRect(x0 + 8 + v * 9, fb - y, 1.5, 1.5);
    } else if (type === 'rust') {
      for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(${130 + U.hash(i, v, 1) * 60},${60 + U.hash(i, v, 2) * 30},30,0.35)`; ctx.fillRect(x0 + U.hash(i, v, 3) * HW, ft + U.hash(i, v, 4) * h * 0.4, 2 + U.hash(i, v, 5) * 3, h * (0.3 + U.hash(i, v, 6) * 0.6)); }
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, ft + h * 0.5); ctx.lineTo(x1, ft + h * 0.5); ctx.moveTo(x0 + 0.5, ft); ctx.lineTo(x0 + 0.5, fb); ctx.stroke();
      ctx.fillStyle = 'rgba(220,200,170,0.45)';
      for (const y of [ft + 4, ft + h * 0.5 - 3, ft + h * 0.5 + 4, fb - 4]) for (let x = x0 + 4; x < x1; x += 9) ctx.fillRect(x, y, 1.5, 1.5);
    } else if (type === 'adobe') {
      for (let i = 0; i < 26; i++) { ctx.fillStyle = U.hash(i, v, 8) > 0.5 ? 'rgba(255,230,190,0.16)' : 'rgba(60,30,10,0.16)'; ctx.fillRect(x0 + U.hash(i, v, 9) * HW, ft + U.hash(i, v, 10) * h, 2, 2); }
      if (v === 2) { ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.beginPath(); ctx.moveTo(x0 + 10, ft + 8); ctx.lineTo(x0 + 16, ft + 20); ctx.lineTo(x0 + 13, ft + 30); ctx.stroke(); }
      ctx.fillStyle = 'rgba(80,40,15,0.25)'; ctx.fillRect(x0, fb - 6, x1 - x0, 6);
    } else if (type === 'canvas') {
      for (let x = x0; x < x1; x += 12) { ctx.fillStyle = W.stripes; ctx.fillRect(x, ft, 6, h); }
    } else if (type === 'flesh') {
      ctx.strokeStyle = 'rgba(90,20,35,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + 6 + i * 14, fb); ctx.bezierCurveTo(x0 + 12 + i * 12, fb - h / 2, x0 + 2 + i * 14, fb - h * 0.7, x0 + 8 + i * 14, ft); ctx.stroke(); }
    }
    ctx.restore();
    // top slab
    ctx.fillStyle = W.top; ctx.fillRect(x0, tt, x1 - x0, ft - tt);
    ctx.fillStyle = 'rgba(255,235,200,0.10)'; ctx.fillRect(x0, tt, x1 - x0, 2);
    ctx.fillStyle = 'rgba(15,8,3,0.55)'; ctx.fillRect(x0, ft - 1, x1 - x0, 1.5);
    wallCache[key] = { c, ax: cx, ay: cy };
    return wallCache[key];
  };

  // ---------------------------------------------------------- objects
  const objCache = {};
  const box = (ctx, x, y, w, d, h, col, top) => { // simple oblique box, base centre (x,y)
    const dy = d * U.SQ * 0.5;
    ctx.fillStyle = SP.shade(col, -0.15); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = top || SP.shade(col, 0.15);
    ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + dy, y - h - dy); ctx.lineTo(x + w / 2 + dy, y - h - dy); ctx.lineTo(x + w / 2, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SP.shade(col, -0.35);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 + dy, y - h - dy); ctx.lineTo(x + w / 2 + dy, y - dy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h, w, h);
  };
  const shadow = (ctx, x, y, rx, ry, a = 0.35) => { ctx.fillStyle = `rgba(10,5,0,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  SP.box = box;

  const OBJ_DRAW = {
    crate: (ctx, x, y) => { shadow(ctx, x, y, 16, 6); box(ctx, x, y + 2, 26, 18, 20, '#8a6a42'); ctx.strokeStyle = 'rgba(30,15,5,0.6)'; ctx.beginPath(); ctx.moveTo(x - 13, y - 16); ctx.lineTo(x + 13, y + 2); ctx.moveTo(x + 13, y - 16); ctx.lineTo(x - 13, y + 2); ctx.stroke(); },
    barrel: (ctx, x, y) => { shadow(ctx, x, y, 12, 5); const g = ctx.createLinearGradient(x - 11, 0, x + 11, 0); g.addColorStop(0, '#5a3a22'); g.addColorStop(0.35, '#9a6a3c'); g.addColorStop(1, '#3a2414'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 1, 11, 5, 0, 0, Math.PI); ctx.lineTo(x - 11, y - 24); ctx.ellipse(x, y - 24, 11, 5, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(x, y - 24, 11, 5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; for (const yy of [-5, -19]) { ctx.beginPath(); ctx.ellipse(x, y + yy, 11, 5, 0, 0, Math.PI); ctx.stroke(); } },
    locker: (ctx, x, y) => { shadow(ctx, x, y, 16, 6); box(ctx, x, y + 2, 28, 14, 16, '#5a4632'); ctx.fillStyle = '#b8a070'; ctx.fillRect(x - 2, y - 10, 4, 5); },
    safe: (ctx, x, y) => { shadow(ctx, x, y, 16, 6); box(ctx, x, y + 2, 26, 18, 28, '#3e4448'); ctx.strokeStyle = '#c8b070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 12, 5, 0, 7); ctx.stroke(); ctx.fillStyle = '#c8b070'; ctx.fillRect(x - 1, y - 18, 2, 4); },
    shelf: (ctx, x, y, o) => { shadow(ctx, x, y, 18, 5); box(ctx, x, y + 2, 34, 10, 38, '#5e4028'); for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(20,10,5,0.7)'; ctx.fillRect(x - 15, y - 34 + i * 12, 30, 2); for (let k = 0; k < 5; k++) { ctx.fillStyle = ['#7a3a2a', '#3a5a3a', '#8a7a4a', '#5a3a5a', '#c0b090'][(k + i + (o.v || 0)) % 5]; ctx.fillRect(x - 14 + k * 6, y - 33 + i * 12 - 6 - (k % 2) * 2, 4, 6 + (k % 2) * 2); } } },
    desk: (ctx, x, y) => { shadow(ctx, x, y, 20, 6); box(ctx, x, y + 2, 36, 18, 16, '#6a4628'); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 6, y - 21, 10, 6); ctx.fillStyle = '#3a2a6a'; ctx.fillRect(x + 6, y - 20, 4, 4); },
    counter: (ctx, x, y) => { shadow(ctx, x, y, 22, 6); box(ctx, x, y + 2, 44, 14, 18, '#6e4a2c', '#8e6a44'); },
    table: (ctx, x, y) => { shadow(ctx, x, y, 18, 6); ctx.fillStyle = '#3a2414'; ctx.fillRect(x - 14, y - 12, 3, 13); ctx.fillRect(x + 11, y - 12, 3, 13); box(ctx, x, y - 10, 34, 18, 4, '#7a5432', '#9a744e'); ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 4, y - 22, 4, 6); },
    bench: (ctx, x, y) => { shadow(ctx, x, y, 18, 4); box(ctx, x, y, 40, 8, 10, '#5e3a24'); },
    bed: (ctx, x, y) => { shadow(ctx, x, y, 20, 7); box(ctx, x, y + 2, 38, 18, 9, '#5a4030', '#c8b898'); ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x - 17, y - 14, 10, 5); },
    wagon: (ctx, x, y, o) => {
      shadow(ctx, x, y + 4, 46, 14);
      const col = o.name && o.name.includes('Tank') ? '#5a5a52' : o.name && o.name.includes('Wynn') ? '#3a6a8a' : '#8a2a26';
      box(ctx, x, y - 10, 84, 30, 34, col, SP.shade(col, 0.25));
      if (!(o.name || '').includes('Tank')) { ctx.fillStyle = '#e8c860'; ctx.font = 'bold 9px serif'; ctx.textAlign = 'center'; ctx.fillText((o.name || '').includes('Wynn') ? 'WYNN\'S WARES' : 'THE SHOW', x, y - 26); for (let i = -38; i < 40; i += 8) { ctx.fillStyle = i % 16 ? '#e8d8b8' : col; ctx.fillRect(x + i, y - 46, 8, 4); } }
      else { ctx.fillStyle = 'rgba(200,100,110,0.5)'; ctx.fillRect(x - 36, y - 30, 72, 4); ctx.strokeStyle = '#2a2a2a'; ctx.strokeRect(x - 40, y - 42, 80, 30); }
      for (const dx of [-30, 30]) { ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + dx, y - 6, 11, 0, 7); ctx.stroke(); ctx.lineWidth = 1.2; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(x + dx, y - 6); ctx.lineTo(x + dx + Math.cos(a) * 11, y - 6 + Math.sin(a) * 11); ctx.stroke(); } }
    },
    tent: (ctx, x, y, o) => {
      shadow(ctx, x, y + 6, 70, 20);
      const st = '#a8302c', bg = '#e6d6b8';
      for (let i = 0; i < 10; i++) {
        const a0 = Math.PI + i * Math.PI / 10, a1 = a0 + Math.PI / 10;
        ctx.fillStyle = i % 2 ? st : bg;
        ctx.beginPath(); ctx.moveTo(x, y - 96); ctx.lineTo(x + Math.cos(a0) * -66, y - 10 + Math.sin(a0) * -14); ctx.lineTo(x + Math.cos(a1) * -66, y - 10 + Math.sin(a1) * -14); ctx.closePath(); ctx.fill();
      }
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? st : bg; ctx.fillRect(x - 64 + i * 12.8, y - 30, 12.8, 26); }
      const g = ctx.createLinearGradient(x - 66, 0, x + 66, 0); g.addColorStop(0, 'rgba(255,240,210,0.15)'); g.addColorStop(1, 'rgba(20,5,0,0.35)'); ctx.fillStyle = g; ctx.fillRect(x - 64, y - 30, 128, 26);
      ctx.fillStyle = '#2a1410'; ctx.beginPath(); ctx.moveTo(x - 10, y - 4); ctx.lineTo(x, y - 34); ctx.lineTo(x + 10, y - 4); ctx.fill();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 96); ctx.lineTo(x, y - 112); ctx.stroke(); ctx.fillStyle = '#e8c048'; ctx.beginPath(); ctx.moveTo(x, y - 112); ctx.lineTo(x + 14, y - 107); ctx.lineTo(x, y - 102); ctx.fill();
    },
    lamp: (ctx, x, y, o) => { shadow(ctx, x, y, 6, 3); ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 1.5, y - (o.indoor ? 26 : 46), 3, o.indoor ? 26 : 46); const ly = y - (o.indoor ? 30 : 50); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 5, ly - 2, 10, 2); const g = ctx.createRadialGradient(x, ly + 4, 0, x, ly + 4, 7); g.addColorStop(0, '#fff2c0'); g.addColorStop(1, '#e09030'); ctx.fillStyle = g; ctx.fillRect(x - 4, ly, 8, 9); ctx.strokeStyle = '#2a2018'; ctx.strokeRect(x - 4, ly, 8, 9); },
    campfire: (ctx, x, y) => { ctx.fillStyle = '#3a2a1e'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(i) * 10, y + Math.sin(i) * 4, 4, 3, 0, 0, 7); ctx.fill(); } ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 9, y + 2); ctx.lineTo(x + 8, y - 3); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x + 9, y + 2); ctx.stroke(); },
    pump: (ctx, x, y) => {
      shadow(ctx, x, y + 4, 48, 16);
      box(ctx, x, y + 6, 70, 34, 18, '#4a4038');
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0); g.addColorStop(0, '#6a4a28'); g.addColorStop(0.3, '#c89a50'); g.addColorStop(1, '#4a3018');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 14, 26, 9, 0, 0, Math.PI); ctx.lineTo(x - 26, y - 56); ctx.ellipse(x, y - 56, 26, 9, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b08848'; ctx.beginPath(); ctx.ellipse(x, y - 56, 26, 9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.arc(x - 8, y - 36, 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a1a0a'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y - 36); ctx.lineTo(x - 4, y - 40); ctx.stroke();
      ctx.fillStyle = 'rgba(220,120,130,0.8)'; ctx.fillRect(x + 6, y - 46, 8, 20); ctx.strokeRect(x + 6, y - 46, 8, 20);
      ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 24, y - 30); ctx.bezierCurveTo(x + 50, y - 30, x + 40, y + 4, x + 56, y + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 24, y - 26); ctx.bezierCurveTo(x - 50, y - 26, x - 44, y + 4, x - 60, y + 6); ctx.stroke();
      ctx.fillStyle = '#d83030'; ctx.beginPath(); ctx.arc(x, y - 66, 4, 0, 7); ctx.fill();
    },
    pipe: (ctx, x, y) => { ctx.strokeStyle = '#4a3a30'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 40); ctx.stroke(); ctx.strokeStyle = 'rgba(200,170,130,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 2, y - 40); ctx.stroke(); ctx.fillStyle = '#6a5040'; ctx.fillRect(x - 6, y - 24, 12, 4); },
    nest: (ctx, x, y, o, t) => {
      shadow(ctx, x, y, 20, 7, 0.4);
      const p = Math.sin(t * 3 + x) * 1.5;
      const g = ctx.createRadialGradient(x - 4, y - 12, 2, x, y - 6, 22); g.addColorStop(0, '#e8a0a0'); g.addColorStop(0.6, '#a04858'); g.addColorStop(1, '#5a1e2a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 6, 20 + p, 12 + p * 0.5, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.4, bx = x + Math.cos(a) * 13, by = y - 10 + Math.sin(a) * 6; const g2 = ctx.createRadialGradient(bx - 1, by - 2, 0, bx, by, 5); g2.addColorStop(0, '#f4c8b8'); g2.addColorStop(1, '#b0586a'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(bx, by - 2, 4 + (i % 3), 0, 7); ctx.fill(); }
      ctx.fillStyle = '#1a0a0a'; ctx.beginPath(); ctx.arc(x + 3, y - 14, 1.6, 0, 7); ctx.fill();
    },
    mother: (ctx, x, y, o, t) => {
      const health = o.health != null ? o.health : Math.max(0, 1 - (GG.G.S && GG.G.S.flags.motherDrain || 0) / 400);
      const saved = GG.G.S && GG.G.S.flags.herdSaved;
      const base = saved ? '#c86a74' : SP.mix('#8e8478', '#c86a74', health * 0.6);
      const br = Math.sin(t * 0.8) * 3;
      shadow(ctx, x, y + 10, 175, 58, 0.45);
      const g = ctx.createRadialGradient(x - 50, y - 120, 20, x, y - 50, 190);
      g.addColorStop(0, SP.shade(base, 0.35)); g.addColorStop(0.5, base); g.addColorStop(1, SP.shade(base, -0.45));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 170, y + 10);
      ctx.bezierCurveTo(x - 180, y - 70, x - 120, y - 150 - br, x - 30, y - 160 - br);
      ctx.bezierCurveTo(x + 50, y - 175 - br, x + 140, y - 120, x + 168, y - 40);
      ctx.bezierCurveTo(x + 180, y - 10, x + 170, y + 12, x + 150, y + 18);
      ctx.bezierCurveTo(x + 60, y + 40, x - 80, y + 40, x - 170, y + 10);
      ctx.fill();
      // folds
      ctx.strokeStyle = SP.shade(base, -0.5, 0.6); ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); const fx = x - 130 + i * 42, fy = y - 20 - Math.sin(i * 1.3) * 30; ctx.moveTo(fx, fy + 30); ctx.bezierCurveTo(fx + 10, fy - 10, fx + 30, fy - 40 - br, fx + 18, fy - 90 + i * 6); ctx.stroke(); }
      ctx.strokeStyle = SP.shade(base, 0.4, 0.35); ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); const fx = x - 115 + i * 44, fy = y - 30 - Math.sin(i * 1.3) * 30; ctx.moveTo(fx, fy + 25); ctx.bezierCurveTo(fx + 12, fy - 8, fx + 28, fy - 36 - br, fx + 20, fy - 80 + i * 6); ctx.stroke(); }
      // veins
      ctx.strokeStyle = 'rgba(90,30,60,0.45)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); const vx = x - 140 + U.hash(i, 1, 4) * 280, vy = y - U.hash(i, 2, 4) * 120; ctx.moveTo(vx, vy); ctx.bezierCurveTo(vx + 20, vy - 15, vx + 10, vy - 30, vx + 35 * (U.hash(i, 3, 4) - 0.3), vy - 45); ctx.stroke(); }
      // eye-like nub and mouth folds (semi-grotesque)
      ctx.fillStyle = SP.shade(base, -0.6); ctx.beginPath(); ctx.ellipse(x + 120, y - 60, 14, 5 + Math.max(0, Math.sin(t * 0.3)) * 3, -0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8d8c0'; ctx.beginPath(); ctx.arc(x + 122, y - 61, 3, 0, 7); ctx.fill();
      if (!saved && health < 0.8) { ctx.fillStyle = 'rgba(160,160,150,0.25)'; ctx.beginPath(); ctx.ellipse(x - 40, y - 60, 90, 50, 0.2, 0, 7); ctx.fill(); }
      // horns stumps
      ctx.fillStyle = '#d8c8a0'; for (const [hx, hy] of [[-60, -150], [10, -165], [70, -140]]) { ctx.beginPath(); ctx.moveTo(x + hx - 6, y + hy + 6); ctx.lineTo(x + hx, y + hy - 14); ctx.lineTo(x + hx + 6, y + hy + 6); ctx.fill(); }
    },
    sign: (ctx, x, y, o) => { shadow(ctx, x, y, 8, 3); ctx.fillStyle = '#3a2614'; ctx.fillRect(x - 2, y - 30, 4, 30); box(ctx, x, y - 26, 34, 4, 16, '#8a6a40', '#a4845a'); ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x - 12, y - 37, 24, 1.5); ctx.fillRect(x - 10, y - 33, 20, 1.5); if ((o.name || '').includes('Bounty')) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 14, y - 40, 9, 11); ctx.fillRect(x - 2, y - 41, 10, 12); ctx.fillRect(x + 9, y - 39, 6, 9); } },
    tower: (ctx, x, y) => { shadow(ctx, x, y, 40, 14); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 4; for (const dx of [-22, 22]) { ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx * 0.6, y - 70); ctx.stroke(); } ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 20, y - 10); ctx.lineTo(x + 14, y - 60); ctx.moveTo(x + 20, y - 10); ctx.lineTo(x - 14, y - 60); ctx.stroke(); const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0); g.addColorStop(0, '#6a5038'); g.addColorStop(0.35, '#9a7a54'); g.addColorStop(1, '#4a3420'); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 110, 52, 42); ctx.fillStyle = '#5a4026'; ctx.beginPath(); ctx.moveTo(x - 30, y - 110); ctx.lineTo(x, y - 128); ctx.lineTo(x + 30, y - 110); ctx.fill(); ctx.fillStyle = '#e8e0c8'; ctx.font = 'bold 9px serif'; ctx.textAlign = 'center'; ctx.fillText("WE'RE FINE", x, y - 86); },
    stalk: (ctx, x, y, o) => { shadow(ctx, x, y, 9, 3); const h = 30 + (o.v || 0) * 8; const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0); g.addColorStop(0, '#c87078'); g.addColorStop(1, '#6a2a3a'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.bezierCurveTo(x - 7, y - h * 0.5, x + 4, y - h * 0.7, x - 2, y - h); ctx.bezierCurveTo(x + 6, y - h * 0.8, x + 7, y - h * 0.4, x + 6, y); ctx.fill(); ctx.fillStyle = '#e8b0a0'; ctx.beginPath(); ctx.arc(x - 2, y - h, 4, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(70,15,25,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x - 1, y - h + 6); ctx.stroke(); },
    rock: (ctx, x, y, o) => { shadow(ctx, x, y + 1, 15, 5); const s = 0.8 + (o.v || 0) * 0.15; const g = ctx.createLinearGradient(x - 14, y - 20, x + 14, y); g.addColorStop(0, '#a89a84'); g.addColorStop(1, '#4e463c'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 15 * s, y); ctx.lineTo(x - 12 * s, y - 12 * s); ctx.lineTo(x - 2 * s, y - 19 * s); ctx.lineTo(x + 10 * s, y - 14 * s); ctx.lineTo(x + 15 * s, y - 2 * s); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(20,12,6,0.6)'; ctx.stroke(); },
    bones: (ctx, x, y, o) => { if (o.pile) { box(ctx, x, y, 14, 8, 6, '#6a5236'); return; } ctx.fillStyle = '#ddd2b4'; ctx.save(); ctx.translate(x, y); ctx.rotate((o.v || 0) * 0.7); ctx.fillRect(-9, -1, 18, 2.5); ctx.beginPath(); ctx.arc(-9, 0, 2.2, 0, 7); ctx.arc(9, 0, 2.2, 0, 7); ctx.fill(); ctx.restore(); if ((o.v || 0) > 1) { ctx.fillStyle = '#e4dac0'; ctx.beginPath(); ctx.ellipse(x + 8, y - 3, 5, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x + 6, y - 4, 1.5, 1.5); ctx.fillRect(x + 9, y - 4, 1.5, 1.5); } },
    trough: (ctx, x, y) => { shadow(ctx, x, y, 22, 6); box(ctx, x, y + 2, 42, 14, 10, '#6a4a2c'); ctx.fillStyle = '#7a3a3a'; ctx.fillRect(x - 18, y - 9, 36, 3); },
    poster: (ctx, x, y) => { ctx.fillStyle = '#3a2614'; ctx.fillRect(x - 1, y - 34, 2, 34); ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x - 9, y - 40, 18, 22); ctx.fillStyle = '#a8302c'; ctx.fillRect(x - 7, y - 37, 14, 4); ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - 6, y - 30, 12, 1.5); ctx.fillRect(x - 6, y - 26, 10, 1.5); },
    horns: (ctx, x, y) => { shadow(ctx, x, y, 18, 5); box(ctx, x, y + 2, 34, 8, 8, '#4a3020'); ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 7, y - 8); ctx.quadraticCurveTo(x + i * 9 + 6, y - 24, x + i * 8 + 2, y - 34 - Math.abs(i) * 2); ctx.stroke(); } },
    corpse: (ctx, x, y, o) => { ctx.fillStyle = 'rgba(80,20,20,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 18, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#7a6a5a'; ctx.beginPath(); ctx.ellipse(x - 2, y - 3, 14, 5, 0.1, 0, 7); ctx.fill(); ctx.fillStyle = '#c8a888'; ctx.beginPath(); ctx.arc(x + 12, y - 4, 4.5, 0, 7); ctx.fill(); },
    door: (ctx, x, y, o, t, geo) => {
      if (o.open) { ctx.fillStyle = 'rgba(20,10,5,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, 16, 6, 0, 0, 7); ctx.fill(); return; }
      const wt = SP.neighborWall(o, geo) || 'plank';
      const col = GG.WALL[wt].bars ? '#4a4440' : wt === 'rust' ? '#5a3e30' : '#6e4a2a';
      box(ctx, x, y + 3, 30, 8, Math.min(44, GG.WALL[wt].h - 4), col);
      ctx.fillStyle = o.locked ? '#c8a050' : '#8a7050'; ctx.fillRect(x + 8, y - 20, 3, 4);
    },
    grate: (ctx, x, y, o) => { if (o.open) return; ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 6, y); ctx.lineTo(x + i * 6, y - 40); ctx.stroke(); } ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 16, y - 20); ctx.lineTo(x + 16, y - 20); ctx.stroke(); ctx.fillStyle = 'rgba(160,80,40,0.5)'; ctx.fillRect(x - 14, y - 36, 6, 30); },
    cagedoor: (ctx, x, y, o) => { if (o.open) return; ctx.strokeStyle = '#3e3a38'; ctx.lineWidth = 2.4; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 6, y + 2); ctx.lineTo(x + i * 6, y - 38); ctx.stroke(); } ctx.fillStyle = '#c8a050'; ctx.fillRect(x + 4, y - 22, 5, 6); },
  };
  SP.neighborWall = (o, geo) => {
    if (!geo) return null;
    for (const [c, r] of U.nb(o.at[0], o.at[1])) { const w = geo.wall[r * geo.w + c]; if (w) return w; }
    return null;
  };
  // returns true if drawn
  SP.drawObj = (ctx, o, x, y, t, geo) => {
    if (drawExt(ctx, 'obj/' + (o.id && SP.img['obj/' + o.id] ? o.id : o.type), x, y)) return;
    const f = OBJ_DRAW[o.type];
    if (f) f(ctx, x, y, o, t, geo);
  };
  SP.objHeight = o => ({ mother: 170, tent: 110, tower: 128, wagon: 52, pump: 70, lamp: 56, shelf: 40, safe: 30 }[o.type] || 26);

  // ---------------------------------------------------------- characters
  const HAT = {
    stetson: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -1, 11, 3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-6, -10, 0, -10); ctx.quadraticCurveTo(6, -10, 6, -1); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-6, -3, 12, 1.5); },
    bowler: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -1, 8, 2.2, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -2, 5.5, Math.PI, 0); ctx.fill(); },
    top: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -1, 9, 2.4, 0, 0, 7); ctx.fill(); ctx.fillRect(-5.5, -15, 11, 14); ctx.fillStyle = '#a8302c'; ctx.fillRect(-5.5, -4, 11, 2); },
    bonnet: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.strokeStyle = SP.shade(c, -0.3); ctx.lineWidth = 1; ctx.stroke(); },
    cap: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -0.5, 6.5, Math.PI, 0); ctx.fill(); ctx.fillRect(1, -1.5, 9, 2); },
    skullcap: (ctx, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 6.8, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#2a1a10'; ctx.fillRect(-3, -4, 2, 2); ctx.fillRect(1, -4, 2, 2); ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-9, -8); ctx.moveTo(6, -2); ctx.lineTo(9, -8); ctx.stroke(); },
  };
  const head = (ctx, L, hx, hy, r, alt) => {
    const skin = L.face === 'clown' ? '#ece6dc' : L.skin;
    const g = ctx.createRadialGradient(hx - r * 0.4, hy - r * 0.4, 1, hx, hy, r * 1.2);
    g.addColorStop(0, SP.shade(skin, 0.18)); g.addColorStop(1, SP.shade(skin, -0.25));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    // hair
    if (L.hat === 'none' || alt) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(hx, hy - 1, r, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    // eyes & face facing +x
    ctx.fillStyle = '#1a100a';
    ctx.fillRect(hx + r * 0.25, hy - 1, 1.6, 1.6); ctx.fillRect(hx + r * 0.62, hy - 1, 1.4, 1.6);
    const f = alt || L.face;
    if (f === 'clown') { ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.ellipse(hx + r * 0.4, hy + r * 0.45, r * 0.55, r * 0.22, 0, 0, Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(hx + r * 0.95, hy + 0.5, 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2a6a'; ctx.fillRect(hx + r * 0.2, hy - 3.5, 2.5, 1); }
    if (f === 'mustache' || f === 'waxmustache') { ctx.strokeStyle = L.face === 'waxmustache' ? '#111' : L.hair; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + r * 0.1, hy + r * 0.45); ctx.quadraticCurveTo(hx + r * 0.55, hy + r * 0.25, hx + r * 1.0, hy + r * 0.45); if (f === 'waxmustache') { ctx.moveTo(hx + r * 0.1, hy + r * 0.45); ctx.lineTo(hx - r * 0.2, hy + r * 0.05); ctx.moveTo(hx + r, hy + r * 0.45); ctx.lineTo(hx + r * 1.3, hy + r * 0.05); } ctx.stroke(); }
    if (f === 'beard') { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(hx + r * 0.35, hy + r * 0.6, r * 0.8, r * 0.6, 0, 0, Math.PI); ctx.fill(); }
    if (f === 'spectacles') { ctx.strokeStyle = '#c8b070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx + r * 0.3, hy - 0.5, 2.6, 0, 7); ctx.arc(hx + r * 0.75, hy - 0.5, 2.4, 0, 7); ctx.stroke(); }
    if (f === 'lipstick') { ctx.fillStyle = '#b8202a'; ctx.fillRect(hx + r * 0.35, hy + r * 0.4, r * 0.45, 1.6); ctx.fillStyle = '#e8c048'; ctx.fillRect(hx + r * 0.4, hy + r * 0.38, 1.2, 1.2); }
    if (f === 'scar') { ctx.strokeStyle = 'rgba(120,40,40,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + r * 0.1, hy + r * 0.1); ctx.lineTo(hx + r * 0.7, hy + r * 0.75); ctx.stroke(); }
    if (f === 'freckles') { ctx.fillStyle = 'rgba(140,70,30,0.7)'; for (let i = 0; i < 4; i++) ctx.fillRect(hx + r * (0.2 + i * 0.18), hy + r * 0.2, 1, 1); }
    if (f === 'warpaint') { ctx.fillStyle = 'rgba(20,10,10,0.75)'; ctx.fillRect(hx - r * 0.1, hy - 2.5, r * 1.1, 2.4); }
    if (f === 'grin') { ctx.fillStyle = '#f0e0b0'; ctx.fillRect(hx + r * 0.3, hy + r * 0.4, r * 0.5, 1.6); ctx.fillStyle = '#e8c048'; ctx.fillRect(hx + r * 0.55, hy + r * 0.4, 1.2, 1.6); }
  };
  const WEAP = {
    guns: (ctx, id) => { const long = ['leverrifle', 'harrowrifle', 'scattergun'].includes(id); ctx.fillStyle = '#2a2420'; ctx.fillRect(0, -2, long ? 26 : 12, 3); ctx.fillStyle = long ? '#6a4628' : '#4a3828'; ctx.fillRect(long ? -6 : -2, -1, long ? 9 : 4, long ? 4 : 6); if (id === 'marrowpistol') { ctx.fillStyle = '#e8c048'; ctx.fillRect(2, -2, 8, 1); } },
    melee: (ctx, id) => { if (id === 'bonesaw') { ctx.fillStyle = '#c8c8c0'; ctx.fillRect(2, -4, 18, 6); ctx.fillStyle = '#4a3020'; ctx.fillRect(-4, -2, 7, 3); ctx.fillStyle = '#2a2a2a'; for (let i = 0; i < 6; i++) ctx.fillRect(3 + i * 3, 2, 1.5, 1.5); return; } if (id === 'meathook') { ctx.strokeStyle = '#a8a8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -2); ctx.arc(11, 1, 4, Math.PI, Math.PI * 2.4); ctx.stroke(); return; } ctx.fillStyle = '#4a3020'; ctx.fillRect(-3, -1, 6, 3); ctx.fillStyle = '#d0d0c8'; ctx.fillRect(3, id === 'cleaver' ? -5 : -1, id === 'cleaver' ? 9 : 10, id === 'cleaver' ? 8 : 2); },
    throwing: (ctx, id) => { ctx.fillStyle = id === 'dynamite' ? '#b8302a' : '#8aa048'; ctx.fillRect(-1, -6, 5, 9); },
    brawl: () => {},
  };
  SP.drawHuman = (ctx, e, L, x, y, t, opts = {}) => {
    const s = (L.h || 1), b = L.build || 1;
    const walk = opts.walk || 0;
    const sw = Math.sin(walk * Math.PI * 2) * 4;
    ctx.save();
    ctx.translate(x, y);
    if (opts.flip) ctx.scale(-1, 1);
    ctx.scale(s, s);
    const legH = L.stilts ? 34 : 15;
    const hipY = -legH, shY = hipY - 17 * (L.leotard ? 1.05 : 1), hy = shY - 6.5;
    // legs
    ctx.lineCap = 'round';
    if (L.stilts) {
      ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-3, hipY); ctx.lineTo(-3 + sw * 0.6, 0); ctx.moveTo(3, hipY); ctx.lineTo(3 - sw * 0.6, 0); ctx.stroke();
      ctx.strokeStyle = L.pants; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-3, hipY); ctx.lineTo(-3, hipY + 12); ctx.moveTo(3, hipY); ctx.lineTo(3, hipY + 12); ctx.stroke();
      // stripes on trousers
      ctx.strokeStyle = 'rgba(230,220,200,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, hipY); ctx.lineTo(-3, hipY + 12); ctx.stroke();
    } else {
      ctx.strokeStyle = SP.shade(L.pants, -0.15); ctx.lineWidth = 5.5 * Math.min(1.3, b);
      ctx.beginPath(); ctx.moveTo(-2.5 * b, hipY); ctx.lineTo(-2.5 * b + sw, -2); ctx.stroke();
      ctx.strokeStyle = L.pants;
      ctx.beginPath(); ctx.moveTo(2.5 * b, hipY); ctx.lineTo(2.5 * b - sw, -2); ctx.stroke();
      ctx.fillStyle = '#2a1c12';
      ctx.fillRect(-2.5 * b + sw - 3, -3, 7, 3.2); ctx.fillRect(2.5 * b - sw - 3, -3, 7, 3.2);
    }
    // body
    const tw = 8 * b, bw = 7 * b;
    const coat = L.coat;
    const g = ctx.createLinearGradient(-tw, 0, tw, 0);
    g.addColorStop(0, SP.shade(coat, 0.2)); g.addColorStop(0.6, coat); g.addColorStop(1, SP.shade(coat, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-tw, shY + 2); ctx.quadraticCurveTo(0, shY - 2, tw, shY + 2);
    ctx.lineTo(bw + (L.apron ? 0 : 1.5), hipY + 4); ctx.lineTo(-bw - (L.apron ? 0 : 1.5), hipY + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    if (L.leotard) { ctx.fillStyle = 'rgba(240,230,210,0.7)'; for (let i = 0; i < 3; i++) ctx.fillRect(-tw + 1, shY + 4 + i * 5, tw * 2 - 2, 2); }
    if (L.apron) { ctx.fillStyle = L.apron; ctx.beginPath(); ctx.moveTo(-bw + 1, shY + 6); ctx.lineTo(bw - 1, shY + 6); ctx.lineTo(bw + 1, hipY + 6); ctx.lineTo(-bw - 1, hipY + 6); ctx.closePath(); ctx.fill(); }
    if (L.star) { ctx.fillStyle = '#e8c048'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 1.2 : 2.8; ctx.lineTo(tw * 0.35 + Math.cos(a) * r, shY + 6 + Math.sin(a) * r); } ctx.fill(); }
    if (L.ruff) { ctx.fillStyle = L.ruff; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 2.4, shY + 1, 2.6, 0, 7); ctx.fill(); } }
    if (opts.armorCol) { ctx.fillStyle = SP.shade(opts.armorCol, 0, 0.55); ctx.fillRect(-tw + 1, shY + 3, tw * 2 - 2, 8); }
    // graft (second little torso)
    if (L.graft) {
      ctx.fillStyle = SP.shade(L.skin, -0.05); ctx.beginPath(); ctx.ellipse(-tw - 2, shY + 9, 3.5, 5, 0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-tw - 3, shY + 2.5, 2.6, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
      const clap = Math.sin(t * 9) * 1.5; ctx.strokeStyle = SP.shade(L.skin, -0.2); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-tw - 4, shY + 8); ctx.lineTo(-tw - 8 + clap, shY + 5); ctx.moveTo(-tw - 1, shY + 8); ctx.lineTo(-tw - 7 - clap, shY + 6); ctx.stroke();
    }
    // back arm
    const aSw = -sw * 0.8;
    ctx.strokeStyle = SP.shade(coat, -0.3); ctx.lineWidth = 3.6 * Math.min(1.3, b);
    ctx.beginPath(); ctx.moveTo(-tw + 1.5, shY + 3); ctx.lineTo(-tw + 1 + aSw, hipY + 2); ctx.stroke();
    // heads
    if (L.twohead) {
      head(ctx, L, -4.5, hy - 1, 5.4, 'plain');
      head(ctx, Object.assign({}, L, { skin: SP.shade(L.skin, -0.06).replace('rgba', 'rgba') && L.skin, hair: '#2a2018' }), 5, hy - 2, 5.8, 'mustache');
    } else {
      head(ctx, L, 0.5, hy, 6);
      if (L.hat && L.hat !== 'none' && HAT[L.hat]) { ctx.save(); ctx.translate(0.5, hy - 3.5); HAT[L.hat](ctx, L.hatC); ctx.restore(); }
      else if (L.face === 'clown') { ctx.fillStyle = L.hair; for (const dx of [-6, 6]) { ctx.beginPath(); ctx.arc(dx + 0.5, hy - 2, 3.4, 0, 7); ctx.fill(); } }
    }
    // weapon arm
    const w = GG.ITEMS[(e && e.equip && e.equip.weapon) || 'fists'] || GG.ITEMS.fists;
    const aim = opts.aiming ? 1 : 0;
    ctx.strokeStyle = SP.shade(coat, 0.05); ctx.lineWidth = 3.8 * Math.min(1.3, b);
    const hx = tw - 1 + (aim ? 9 : sw * 0.6), hyy = aim ? shY + 5 : hipY + 2;
    ctx.beginPath(); ctx.moveTo(tw - 1.5, shY + 3); ctx.lineTo(hx, hyy); ctx.stroke();
    ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(hx, hyy, 1.9, 0, 7); ctx.fill();
    if (w && WEAP[w.skill] && !w.natural && w.id !== 'fists') { ctx.save(); ctx.translate(hx, hyy); if (!aim) ctx.rotate(w.skill === 'guns' ? 1.2 : 0.6); WEAP[w.skill](ctx, w.id); ctx.restore(); }
    ctx.restore();
  };

  SP.drawBeast = (ctx, e, L, x, y, t, opts = {}) => {
    const s = L.scale || 1, ph = t * 3 + (e ? e.x : 0);
    ctx.save(); ctx.translate(x, y); if (opts.flip) ctx.scale(-1, 1); ctx.scale(s, s);
    if (L.kind === 'lump') {
      const br = Math.sin(ph) * 1.2;
      ctx.strokeStyle = '#4a2028'; ctx.lineWidth = 3;
      for (const lx of [-12, -5, 4, 11]) { ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx + Math.sin(ph * 2 + lx) * (opts.walk ? 2.5 : 0), 0); ctx.stroke(); }
      const g = ctx.createRadialGradient(-6, -20, 2, 0, -12, 22);
      g.addColorStop(0, SP.shade(L.skin, 0.35)); g.addColorStop(1, SP.shade(L.skin, -0.4));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -13 - br * 0.5, 19, 12 + br, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = SP.shade(L.skin, -0.45, 0.6); ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 7 - 3, -22); ctx.quadraticCurveTo(i * 7 + 2, -14, i * 7 - 2, -5); ctx.stroke(); }
      ctx.fillStyle = SP.shade(L.skin, 0.1); ctx.beginPath(); ctx.ellipse(18, -16, 6, 5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0a0a'; ctx.fillRect(20, -18, 1.5, 1.5);
      ctx.strokeStyle = '#e0d0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, -20); ctx.quadraticCurveTo(14, -27, 19, -29); ctx.moveTo(20, -20); ctx.quadraticCurveTo(22, -26, 26, -26); ctx.stroke();
      if (s > 1.2) { ctx.fillStyle = '#e8d8b8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 8, -23); ctx.lineTo(-11 + i * 8, -31); ctx.lineTo(-8 + i * 8, -23); ctx.fill(); } }
    } else if (L.kind === 'gristling') {
      const cr = Math.sin(ph * 2) * 1.5;
      ctx.strokeStyle = '#5a1e28'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 4, -4); ctx.lineTo(-8 + i * 4 + cr * (i % 2 ? 1 : -1), 0); ctx.stroke(); }
      const g = ctx.createRadialGradient(-2, -9, 1, 0, -6, 11); g.addColorStop(0, '#e8a0a0'); g.addColorStop(1, '#8a3448');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -6, 10, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
      const g2 = ctx.createRadialGradient(-5, -14, 0, -4, -12, 6); g2.addColorStop(0, '#f8e0c8'); g2.addColorStop(1, '#c87868');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(-4, -12 + Math.sin(ph) * 0.8, 5 + Math.sin(ph * 1.5) * 0.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a0606'; ctx.beginPath(); ctx.ellipse(8, -6, 2.5, 1.8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f0e8d0'; ctx.fillRect(7, -7, 1, 1); ctx.fillRect(8.5, -5.5, 1, 1);
    } else if (L.kind === 'tick') {
      ctx.strokeStyle = '#2a1a24'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { const lx = -8 + i * 5; ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx - 3 + Math.sin(ph * 2 + i) * (opts.walk ? 2 : 0), 0); ctx.stroke(); }
      const g = ctx.createRadialGradient(-5, -16, 2, 0, -12, 16); g.addColorStop(0, '#b8a0c0'); g.addColorStop(1, '#4a3050');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-3, -13 + Math.sin(ph) * 0.6, 13, 10, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#3a2430'; ctx.beginPath(); ctx.ellipse(11, -10, 5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#d8e070'; ctx.fillRect(13, -12, 1.5, 1.5);
    } else if (L.kind === 'bird') {
      const fl = Math.sin(ph * 4) * 6;
      ctx.translate(0, -8 - Math.abs(Math.sin(ph * 2)) * 4);
      ctx.fillStyle = '#2a2220'; ctx.beginPath(); ctx.ellipse(0, -6, 8, 5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-14, -12 - fl); ctx.lineTo(-4, -4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(10, -14 - fl * 0.7); ctx.lineTo(4, -4); ctx.fill();
      ctx.fillStyle = '#3a302c'; ctx.beginPath(); ctx.arc(8, -9, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#f0e8d0'; ctx.fillRect(9, -8, 6, 2); ctx.fillStyle = '#1a1010'; for (let i = 0; i < 3; i++) ctx.fillRect(10 + i * 2, -8, 0.8, 2);
      ctx.fillStyle = '#e8d040'; ctx.fillRect(9, -11, 1.5, 1.5);
    }
    ctx.restore();
  };

  SP.drawEnt = (ctx, e, x, y, t, opts = {}) => {
    const L = e.look || (GG.CREATURES[e.tpl] || {}).look;
    if (!L) return;
    if (e.dead) {
      if (drawExt(ctx, 'dead/' + e.tpl, x, y, opts.flip)) return;
      ctx.fillStyle = L.kind === 'gristling' || L.kind === 'tick' ? 'rgba(120,60,80,0.55)' : 'rgba(90,15,15,0.55)';
      ctx.beginPath(); ctx.ellipse(x + 2, y, 16 * (L.scale || 1), 6, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x, y - 2); ctx.rotate(-Math.PI / 2 * (opts.flip ? -1 : 1) * 0.98); ctx.translate(0, 4);
      (L.kind === 'human' ? SP.drawHuman : SP.drawBeast)(ctx, e, L, 0, 0, 0, { flip: false });
      ctx.restore();
      return;
    }
    shadow(ctx, x, y, L.kind === 'human' ? 9 * (L.build || 1) : 14 * (L.scale || 1), 3.5 * (L.scale || 1), 0.4);
    if (drawExt(ctx, 'char/' + e.tpl, x, y, opts.flip)) return;
    (L.kind === 'human' ? SP.drawHuman : SP.drawBeast)(ctx, e, L, x, y, t, opts);
  };
  SP.entHeight = e => { const L = e.look || (GG.CREATURES[e.tpl] || {}).look || {}; return L.kind === 'human' ? 44 * (L.h || 1) + (L.stilts ? 20 : 0) : 26 * (L.scale || 1); };

  // ---------------------------------------------------------- painted bust for portraits
  SP.bust = (ctx, L, W, H, t) => {
    const cx = W * 0.5, s = W / 240;
    ctx.save();
    ctx.translate(cx, 0); ctx.scale(s, s);
    const skin = L.face === 'clown' ? '#ece6dc' : L.skin;
    const b = Math.min(1.35, L.build || 1);
    // shoulders & torso
    const coat = L.coat;
    const tg = ctx.createLinearGradient(-110, 0, 110, 0);
    tg.addColorStop(0, SP.shade(coat, 0.22)); tg.addColorStop(0.55, coat); tg.addColorStop(1, SP.shade(coat, -0.45));
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.moveTo(-95 * b, 300); ctx.bezierCurveTo(-92 * b, 215, -70 * b, 190, -30, 182); ctx.lineTo(30, 182); ctx.bezierCurveTo(70 * b, 190, 92 * b, 215, 95 * b, 300); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    // lapels / collar
    ctx.fillStyle = SP.shade(coat, -0.25);
    ctx.beginPath(); ctx.moveTo(-26, 184); ctx.lineTo(0, 240); ctx.lineTo(-10, 300); ctx.lineTo(-42, 300); ctx.lineTo(-40, 200); ctx.fill();
    ctx.beginPath(); ctx.moveTo(26, 184); ctx.lineTo(0, 240); ctx.lineTo(10, 300); ctx.lineTo(42, 300); ctx.lineTo(40, 200); ctx.fill();
    ctx.fillStyle = L.apron || (L.leotard ? '#e8dcc8' : '#d8ccb0');
    ctx.beginPath(); ctx.moveTo(-16, 184); ctx.lineTo(0, 236); ctx.lineTo(16, 184); ctx.fill();
    if (L.leotard) { ctx.fillStyle = 'rgba(230,220,200,0.6)'; for (let i = 0; i < 4; i++) ctx.fillRect(-90 * b, 220 + i * 20, 180 * b, 7); }
    if (L.star) { ctx.fillStyle = '#e8c048'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 6 : 14; ctx.lineTo(-48 + Math.cos(a) * r, 236 + Math.sin(a) * r); } ctx.fill(); ctx.strokeStyle = '#7a5a18'; ctx.lineWidth = 1.5; ctx.stroke(); }
    if (L.ruff) { ctx.fillStyle = L.ruff; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.arc(i * 10, 186 + Math.abs(i) * 1.5, 11, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(60,40,30,0.4)'; ctx.lineWidth = 1; ctx.stroke(); } }
    if (L.graft) { // the Associate peeks out at the shoulder
      ctx.fillStyle = SP.shade(L.skin, -0.05); ctx.beginPath(); ctx.ellipse(-82, 232, 20, 28, 0.25, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(-88, 196, 15, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a100a'; ctx.beginPath(); ctx.arc(-92, 194, 2, 0, 7); ctx.arc(-83, 194, 2, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6a2020'; ctx.beginPath(); ctx.arc(-88, 202, 5, 0.1, Math.PI - 0.1); ctx.stroke();
      const clap = Math.sin((t || 0) * 8) * 4;
      ctx.strokeStyle = SP.shade(L.skin, -0.2); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-74, 226); ctx.lineTo(-58 + clap, 214); ctx.moveTo(-90, 228); ctx.lineTo(-62 - clap, 218); ctx.stroke();
    }
    const face = (hx, hy, sc, Lf, alt) => {
      ctx.save(); ctx.translate(hx, hy); ctx.scale(sc, sc);
      const sk = Lf.face === 'clown' ? '#ece6dc' : Lf.skin;
      // neck
      ctx.fillStyle = SP.shade(Lf.skin, -0.25); ctx.fillRect(-16, 40, 32, 46);
      // hair behind
      const hatless = !Lf.hat || Lf.hat === 'none' || alt;
      if (hatless && Lf.face !== 'clown') { ctx.fillStyle = Lf.hair; ctx.beginPath(); ctx.ellipse(-4, -6, 48, 54, 0, 0, 7); ctx.fill(); }
      // ear
      ctx.fillStyle = SP.shade(sk, -0.1); ctx.beginPath(); ctx.ellipse(-38, 8, 9, 14, 0, 0, 7); ctx.fill();
      // head
      const hg = ctx.createRadialGradient(-12, -16, 6, 0, 6, 62);
      hg.addColorStop(0, SP.shade(sk, 0.22)); hg.addColorStop(0.7, sk); hg.addColorStop(1, SP.shade(sk, -0.35));
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(-38, -10); ctx.bezierCurveTo(-40, -52, 30, -60, 40, -16); ctx.bezierCurveTo(46, 14, 34, 44, 6, 54); ctx.bezierCurveTo(-18, 58, -38, 34, -38, -10); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      // hair top/fringe
      if (hatless && Lf.face !== 'clown') { ctx.fillStyle = Lf.hair; ctx.beginPath(); ctx.moveTo(-40, -6); ctx.bezierCurveTo(-42, -56, 34, -66, 42, -18); ctx.bezierCurveTo(22, -34, -6, -30, -40, -6); ctx.fill(); }
      if (Lf.face === 'clown') { ctx.fillStyle = Lf.hair; for (const dx of [-44, 40]) { ctx.beginPath(); ctx.arc(dx, -16, 20, 0, 7); ctx.arc(dx + (dx < 0 ? -6 : 6), 4, 16, 0, 7); ctx.fill(); } }
      // eyes (3/4 view to the right)
      for (const [ex, ew] of [[-6, 9], [24, 8]]) {
        ctx.fillStyle = '#f0e8dc'; ctx.beginPath(); ctx.ellipse(ex, 0, ew, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = Lf.face === 'clown' ? '#2a3a6a' : '#3a2a1a'; ctx.beginPath(); ctx.arc(ex + 2, 0.5, 3.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(ex + 2.5, -2, 1.5, 1.5);
        ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, 0, ew, 5, 0, Math.PI, 0); ctx.stroke();
        ctx.strokeStyle = Lf.face === 'clown' ? '#1a1a3a' : SP.shade(Lf.hair, -0.2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - ew, -10); ctx.quadraticCurveTo(ex, -14 - (Lf.face === 'clown' ? 4 : 0), ex + ew, -10); ctx.stroke();
      }
      // nose
      ctx.fillStyle = SP.shade(sk, -0.22); ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(22, 22); ctx.lineTo(10, 24); ctx.fill();
      // mouth
      const f = alt || Lf.face;
      ctx.strokeStyle = 'rgba(90,30,30,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-2, 36); ctx.quadraticCurveTo(10, f === 'grin' ? 44 : 39, 22, 34); ctx.stroke();
      if (f === 'clown') { ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.moveTo(-14, 30); ctx.quadraticCurveTo(10, 56, 36, 28); ctx.quadraticCurveTo(10, 44, -14, 30); ctx.fill(); ctx.beginPath(); ctx.arc(24, 18, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#3a4aa0'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-4, -22); ctx.lineTo(-2, -8); ctx.fill(); }
      if (f === 'mustache' || f === 'waxmustache') { ctx.fillStyle = f === 'waxmustache' ? '#141010' : Lf.hair; ctx.beginPath(); ctx.moveTo(-8, 30); ctx.quadraticCurveTo(10, 22, 30, 30); ctx.quadraticCurveTo(10, 34, -8, 30); ctx.fill(); if (f === 'waxmustache') { ctx.strokeStyle = '#141010'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 30); ctx.quadraticCurveTo(-20, 28, -22, 14); ctx.moveTo(28, 30); ctx.quadraticCurveTo(42, 28, 44, 14); ctx.stroke(); } }
      if (f === 'beard') { ctx.fillStyle = Lf.hair; ctx.beginPath(); ctx.moveTo(-36, 6); ctx.bezierCurveTo(-34, 70, 40, 74, 40, 10); ctx.bezierCurveTo(30, 34, 0, 30, -36, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 8; i++) ctx.fillRect(-20 + i * 7, 40 + (i % 3) * 6, 2, 10); }
      if (f === 'spectacles') { ctx.strokeStyle = '#b89848'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-6, 0, 12, 0, 7); ctx.moveTo(36, 0); ctx.arc(24, 0, 12, 0, 7); ctx.moveTo(6, 0); ctx.lineTo(12, 0); ctx.stroke(); ctx.fillStyle = 'rgba(200,230,255,0.18)'; ctx.beginPath(); ctx.arc(-6, 0, 12, 0, 7); ctx.arc(24, 0, 12, 0, 7); ctx.fill(); }
      if (f === 'lipstick') { ctx.fillStyle = '#b8202a'; ctx.beginPath(); ctx.ellipse(10, 37, 12, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e8c048'; ctx.fillRect(6, 35, 4, 4); ctx.fillRect(12, 35, 4, 4); }
      if (f === 'scar') { ctx.strokeStyle = 'rgba(140,50,50,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, 14); ctx.lineTo(6, 48); ctx.stroke(); }
      if (f === 'freckles') { ctx.fillStyle = 'rgba(150,80,40,0.7)'; for (let i = 0; i < 12; i++) ctx.fillRect(-14 + (i * 7) % 40, 10 + (i * 5) % 9, 2, 2); }
      if (f === 'warpaint') { ctx.fillStyle = 'rgba(20,10,10,0.75)'; ctx.fillRect(-34, -8, 74, 14); ctx.fillStyle = '#f0e8dc'; ctx.beginPath(); ctx.ellipse(-6, 0, 7, 4, 0, 0, 7); ctx.ellipse(24, 0, 6, 4, 0, 0, 7); ctx.fill(); }
      if (f === 'grin') { ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 36, 22, 5); ctx.fillStyle = '#e8c048'; ctx.fillRect(12, 36, 5, 5); }
      // hat
      if (!hatless && HAT[Lf.hat]) { ctx.save(); ctx.translate(0, -30); ctx.scale(6.2, 6.2); HAT[Lf.hat](ctx, Lf.hatC); ctx.restore(); }
      ctx.restore();
    };
    if (L.twohead) {
      face(-48, 118, 0.82, Object.assign({}, L, { hat: 'none' }), 'plain');
      face(52, 108, 0.88, Object.assign({}, L, { hat: 'none', hair: '#2a2018' }), 'mustache');
    } else face(0, 112, 1, L);
    ctx.restore();
  };

  // ---------------------------------------------------------- portraits
  SP.portrait = (canvas, who) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const key = 'portrait/' + (who.tpl || who.type || who.id);
    const g = ctx.createRadialGradient(W * 0.45, H * 0.35, 10, W / 2, H / 2, W * 0.8);
    g.addColorStop(0, '#6a4a32'); g.addColorStop(1, '#1a100a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (SP.img[key]) { ctx.drawImage(SP.img[key].im, 0, 0, W, H); }
    else if (who.obj) {
      ctx.save(); ctx.translate(W / 2, H * 0.9);
      const sc = who.obj.type === 'mother' ? 0.55 : who.obj.type === 'pump' ? 1.9 : who.obj.type === 'sign' ? 2.6 : 2.4;
      ctx.scale(sc, sc); SP.drawObj(ctx, who.obj, 0, 0, performance.now() / 1000, null); ctx.restore();
    } else if (who.look && who.look.kind === 'human') {
      SP.bust(ctx, who.look, W, H, performance.now() / 1000);
    } else if (who.look) {
      const L = who.look;
      const big = L.kind === 'human' ? 4.4 / (L.h || 1) : 3.6 / (L.scale || 1);
      ctx.save();
      ctx.translate(W * 0.5, L.kind === 'human' ? H * 0.42 + 38.5 * big + (L.stilts ? 19 * big : 0) : H * 0.9);
      ctx.scale(big, big);
      const fake = { equip: { weapon: 'fists' }, x: 0 };
      (L.kind === 'human' ? SP.drawHuman : SP.drawBeast)(ctx, fake, L, 0, 0, performance.now() / 1000, {});
      ctx.restore();
    }
    // vignette, grade, grain
    const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,5,0,0.7)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.15; ctx.fillStyle = ctx.createPattern(SP.noise(), 'repeat'); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };

  // ---------------------------------------------------------- item icons
  const iconCache = {};
  SP.icon = id => {
    if (iconCache[id]) return iconCache[id];
    const c = document.createElement('canvas'); c.width = 44; c.height = 30;
    const ctx = c.getContext('2d');
    const it = GG.ITEMS[id];
    if (SP.img['icon/' + id]) { ctx.drawImage(SP.img['icon/' + id].im, 0, 0, 44, 30); }
    else {
      ctx.translate(22, 16);
      ctx.lineCap = 'round';
      const t = it.type;
      if (t === 'weapon' && it.skill === 'guns') { ctx.scale(1.6, 1.6); WEAP.guns(ctx, id); }
      else if (t === 'weapon' && it.skill === 'melee') { ctx.scale(1.5, 1.5); ctx.translate(-6, 0); WEAP.melee(ctx, id); }
      else if (t === 'weapon' && it.skill === 'throwing') { ctx.scale(1.8, 1.8); WEAP.throwing(ctx, id); }
      else if (t === 'weapon') { ctx.fillStyle = '#c8a050'; ctx.fillRect(-8, -4, 16, 8); }
      else if (t === 'armor') { ctx.fillStyle = it.look || '#6b4a30'; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke(); }
      else if (t === 'ammo') { ctx.fillStyle = '#c8a050'; for (let i = 0; i < 4; i++) { ctx.fillRect(-9 + i * 5, -6, 3, 10); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-9 + i * 5, -8, 3, 3); ctx.fillStyle = '#c8a050'; } }
      else if (id === 'ticket') { ctx.fillStyle = '#e8c048'; ctx.fillRect(-12, -7, 24, 14); ctx.fillStyle = '#a8302c'; ctx.font = 'bold 7px serif'; ctx.textAlign = 'center'; ctx.fillText('ADMIT', 0, 0); ctx.fillText('ONE', 0, 6); }
      else if (t === 'use') { ctx.fillStyle = it.drink ? '#7a5a3a' : it.food ? '#a05848' : '#c8c0b0'; if (it.drink) { ctx.fillRect(-4, -10, 8, 18); ctx.fillRect(-2, -14, 4, 5); } else if (it.food) { ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0.3, 0, 7); ctx.fill(); } else { ctx.beginPath(); ctx.ellipse(0, 2, 10, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#8a8070'; ctx.fillRect(-10, -3, 20, 5); } }
      else if (t === 'quest') { ctx.fillStyle = id === 'ledger' ? '#5a2a6a' : '#c8a050'; ctx.fillRect(-8, -9, 16, 18); ctx.strokeStyle = OUT; ctx.strokeRect(-8, -9, 16, 18); }
      else { ctx.fillStyle = id === 'gristle' ? '#c86a74' : id === 'tumorsac' ? '#e8a0a0' : '#a8987a'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 7, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke(); }
    }
    iconCache[id] = c.toDataURL();
    return iconCache[id];
  };
})();
