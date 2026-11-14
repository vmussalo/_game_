/* Elämänkoulu – areenat. Jokainen areena on piirretty kerroksina (parallaksi): kaukana hitaasti, lähellä nopeasti.
   Kerroksen leveys = näkymän leveys + kameran liikealue × kerroin. */
(function () {
  'use strict';
  const EK = window.EK, C = EK.C, U = EK.U;
  const W = C.W, H = C.H, G = C.GROUND;
  const CAM_RANGE = C.STAGE_W - C.W;

  function layer(ctx, camX, k, fn) {
    ctx.save();
    ctx.translate(-(camX - W / 2) * k, 0);
    fn(W + CAM_RANGE * k);
    ctx.restore();
  }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function grad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }
  function poly(ctx, pts, c, ink) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function sign(ctx, x, y, w, h, bg, fg, lines, font) {
    ctx.fillStyle = bg; EK.roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = fg; ctx.font = font || 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 18));
    ctx.textBaseline = 'alphabetic';
  }

  // Yleisö: yksinkertaisia hahmoja, jotka heiluvat ja innostuvat
  function crowd(ctx, n, x0, x1, y, t, hype, pal, seed, sc) {
    const r = U.rng(seed);
    sc = sc || 1;
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + r() * 0.6) / n;
      const h = (34 + r() * 16) * sc;
      const ph = r() * 6;
      const bob = Math.abs(Math.sin(t * (0.08 + hype * 0.12) + ph)) * (2 + hype * 6) * sc;
      const body = pal[r.int(pal.length)];
      const skin = ['#f1c5a3', '#c99068', '#8d5a3b', '#eab08d', '#f3cdb3'][r.int(5)];
      const yy = y - bob;
      ctx.fillStyle = body; EK.roundRect(ctx, x - 9 * sc, yy - h, 18 * sc, h, 7 * sc); ctx.fill();
      circ(ctx, x, yy - h - 8 * sc, 8.5 * sc, skin);
      ctx.fillStyle = ['#2b1e16', '#7a5a2e', '#e9e9ef', '#1a1210', '#c9a24a', '#8a2f1d'][r.int(6)];
      ctx.beginPath(); ctx.arc(x, yy - h - 9 * sc, 9 * sc, Math.PI, Math.PI * 2); ctx.fill();
      if (hype > 0.4 && (i + Math.floor(t / 20)) % 3 === 0) {
        ctx.strokeStyle = body; ctx.lineWidth = 5 * sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 6 * sc, yy - h + 6 * sc); ctx.lineTo(x + 12 * sc, yy - h - 16 * sc); ctx.stroke();
      }
    }
  }
  function spruce(ctx, x, y, h, c) { poly(ctx, [x, y - h, x + h * 0.28, y, x - h * 0.28, y], c); }
  function birch(ctx, x, y, h, leaf) {
    rect(ctx, x - 3, y - h, 6, h, '#f2f0ea');
    for (let i = 0; i < 5; i++) rect(ctx, x - 3, y - h + 10 + i * h / 6, 4, 2, '#3a3a3a');
    circ(ctx, x, y - h, h * 0.28, leaf); circ(ctx, x - h * 0.18, y - h * 0.85, h * 0.2, leaf); circ(ctx, x + h * 0.18, y - h * 0.82, h * 0.22, leaf);
  }
  function floorLines(ctx, wid, y0, c, n, camX) {
    ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    for (let i = -n; i <= n * 3; i++) {
      const x = i * (wid / n);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (x - camX) * 0.6, H); ctx.stroke();
    }
  }

  const STAGES = {
    kahvila: {
      name: 'Kulmakahvila', floor: '#8a5a3a', tip: ['PÄIVÄN VINKKI:', 'Pidä tauko ajoissa'],
      draw(ctx, camX, t, hype) {
        rect(ctx, 0, 0, W, H, '#e8c9a0');
        layer(ctx, camX, 0.25, wid => {
          rect(ctx, 0, 0, wid, 300, '#ecd3ae');
          for (let x = 40; x < wid; x += 320) {
            rect(ctx, x, 50, 220, 170, '#7a4b2c');
            ctx.fillStyle = grad(ctx, 58, 212, ['#bfe3ff', '#e9f6ff']); ctx.fillRect(x + 8, 58, 204, 154);
            circ(ctx, x + 60, 190, 40, '#7fb069'); circ(ctx, x + 150, 200, 34, '#6aa257');
            rect(ctx, x + 106, 58, 8, 154, '#7a4b2c');
          }
          for (let x = 20; x < wid; x += 46) { rect(ctx, x, 230, 40, 6, '#a06b45'); circ(ctx, x + 12, 224, 7, '#f4f4f4'); circ(ctx, x + 28, 224, 7, '#d65f5f'); }
        });
        layer(ctx, camX, 0.6, wid => {
          for (let x = 0; x < wid; x += 22) rect(ctx, x, 300, 20, 10, x % 44 ? '#b5653f' : '#c47048');
          rect(ctx, 0, 330, wid, 70, '#5b3a24');
          rect(ctx, 0, 326, wid, 8, '#3d2616');
          for (let x = 120; x < wid; x += 420) {
            rect(ctx, x, 270, 90, 60, '#b9c2c9'); rect(ctx, x + 10, 280, 70, 22, '#2a2f35');
            rect(ctx, x + 20, 300, 10, 18, '#555'); rect(ctx, x + 58, 300, 10, 18, '#555');
            circ(ctx, x + 45, 262, 8 + Math.sin(t * 0.05) * 2, 'rgba(255,255,255,0.5)');
          }
          sign(ctx, 275, 244, 200, 50, '#2e3a35', '#f5f1e8', this_tip(this), 'bold 15px "Trebuchet MS", sans-serif');
          crowd(ctx, 16, 20, wid - 20, 418, t, hype, ['#6b4026', '#2f3846', '#c98a4b', '#5a7d6a', '#b0453f'], 11);
        });
      }
    },
    ranta: {
      name: 'Rantalaituri', floor: '#a3774f', tip: ['Hengitä', 'sisään 4 – ulos 6'],
      draw(ctx, camX, t, hype) {
        ctx.fillStyle = grad(ctx, 0, 330, ['#3e3a7a', '#a04f8f', '#ff8f6b', '#ffd27f']); ctx.fillRect(0, 0, W, H);
        layer(ctx, camX, 0.08, wid => { circ(ctx, wid * 0.55, 250, 60, '#ffe8a8'); circ(ctx, wid * 0.55, 250, 80, 'rgba(255,232,168,0.25)'); });
        layer(ctx, camX, 0.2, wid => {
          for (let x = -20; x < wid; x += 26) spruce(ctx, x, 300, 60 + ((x * 7) % 40), '#2c3a4a');
          ctx.fillStyle = grad(ctx, 300, 360, ['#d87a7a', '#5a5a9a']); ctx.fillRect(0, 300, wid, 70);
          for (let i = 0; i < 30; i++) rect(ctx, (i * 97 + t * 0.3) % wid, 310 + (i * 13) % 50, 30, 2, 'rgba(255,230,180,0.5)');
        });
        layer(ctx, camX, 0.55, wid => {
          for (let x = 60; x < wid; x += 340) birch(ctx, x, 380, 120, '#7fb069');
          rect(ctx, wid * 0.7, 300, 110, 80, '#7a4b2c'); poly(ctx, [wid * 0.7 - 10, 300, wid * 0.7 + 55, 260, wid * 0.7 + 120, 300], '#4a2e1c');
          rect(ctx, wid * 0.7 + 40, 330, 26, 50, '#3d2616');
          sign(ctx, wid * 0.3, 300, 170, 48, '#f5efe0', '#3e3a7a', this_tip(this));
          crowd(ctx, 10, 20, wid - 20, 410, t, hype, ['#5fb8a6', '#f2c14e', '#e9e3d6', '#ff8f6b'], 21, 0.95);
          for (let x = 0; x < wid; x += 70) rect(ctx, x + 6, 404, 56, 6, ['#5fb8a6', '#f2c14e', '#a04f8f'][(x / 70) % 3 | 0]);
        });
      }
    },
    piha: {
      name: 'Kerrostalon piha', floor: '#7d7f86', tip: ['Muista soittaa', 'mummolle'],
      draw(ctx, camX, t, hype) {
        ctx.fillStyle = grad(ctx, 0, 300, ['#8cc4ec', '#d8ecf7']); ctx.fillRect(0, 0, W, H);
        layer(ctx, camX, 0.2, wid => {
          for (let x = 0; x < wid; x += 300) {
            rect(ctx, x + 10, 60, 260, 280, ['#e4d6bf', '#cfd5d9', '#e8c9a8'][(x / 300) % 3 | 0]);
            for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
              const lit = ((x + r * 7 + c * 13) % 5) === 0;
              rect(ctx, x + 26 + c * 40, 76 + r * 42, 24, 28, lit ? '#ffe7a3' : '#6b8aa3');
              if (c % 2 === 0) rect(ctx, x + 22 + c * 40, 104 + r * 42, 32, 4, '#a0a6aa');
            }
          }
        });
        layer(ctx, camX, 0.55, wid => {
          for (let x = 30; x < wid; x += 260) { rect(ctx, x + 40, 300, 10, 90, '#5a3d2a'); circ(ctx, x + 45, 290, 46, ['#e48b2f', '#d9542c', '#f2b33d'][(x / 260) % 3 | 0]); }
          // mattoteline
          const mx = wid * 0.45;
          rect(ctx, mx, 300, 6, 100, '#555'); rect(ctx, mx + 190, 300, 6, 100, '#555'); rect(ctx, mx, 300, 196, 6, '#555');
          rect(ctx, mx + 20, 306, 150, 60, '#b0453f'); for (let i = 0; i < 6; i++) rect(ctx, mx + 30 + i * 24, 310, 10, 52, '#e8d7a8');
          sign(ctx, wid * 0.15, 320, 170, 48, '#fff8e8', '#b0453f', this_tip(this));
          crowd(ctx, 12, 20, wid - 20, 420, t, hype, ['#b0453f', '#4b3c5c', '#5a7d6a', '#e8d7a8', '#3d6fb3'], 31);
          rect(ctx, 0, 410, wid, 12, '#6e8f4e');
        });
      }
    },
    koti: {
      name: 'Kotitoimisto', floor: '#5a4636', tip: ['Läppäri kiinni', 'klo 17.00'],
      draw(ctx, camX, t, hype) {
        rect(ctx, 0, 0, W, H, '#2c2f4a');
        layer(ctx, camX, 0.2, wid => {
          for (let x = 40; x < wid; x += 380) {
            rect(ctx, x, 40, 280, 220, '#1a1c2e');
            ctx.fillStyle = grad(ctx, 48, 252, ['#14163a', '#3b2f6b']); ctx.fillRect(x + 8, 48, 264, 204);
            for (let i = 0; i < 14; i++) rect(ctx, x + 14 + i * 18, 170 - (i * 37 % 90), 14, 82 + (i * 37 % 90), '#22264a');
            for (let i = 0; i < 40; i++) rect(ctx, x + 16 + (i * 53 % 250), 180 - (i * 29 % 100), 3, 4, (i + Math.floor(t / 40)) % 7 ? '#ffd86b' : '#22264a');
            circ(ctx, x + 230, 80, 16, '#f5f0d0');
          }
        });
        layer(ctx, camX, 0.55, wid => {
          for (let x = 0; x < wid; x += 520) {
            // pöytä ja näytöt: videopalaverin kasvot ovat yleisö
            rect(ctx, x + 60, 340, 300, 12, '#8a6a4a'); rect(ctx, x + 80, 352, 10, 60, '#6a4a2a'); rect(ctx, x + 330, 352, 10, 60, '#6a4a2a');
            for (let m = 0; m < 2; m++) {
              const mx = x + 90 + m * 130;
              rect(ctx, mx, 240, 120, 84, '#111'); rect(ctx, mx + 4, 244, 112, 76, '#2a3b5a'); rect(ctx, mx + 54, 324, 12, 16, '#333');
              for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
                const fx = mx + 6 + c * 37, fy = 246 + r * 37;
                rect(ctx, fx, fy, 35, 35, ['#3b4d6b', '#4b3b5b', '#3b5b4b'][(c + r + m) % 3]);
                const bob = Math.sin(t * (0.1 + hype * 0.2) + c + r * 3 + m) * (1 + hype * 3);
                circ(ctx, fx + 17, fy + 15 + bob, 7, ['#f1c5a3', '#c99068', '#8d5a3b'][(c + m) % 3]);
                rect(ctx, fx + 8, fy + 24 + bob, 18, 11, ['#6fa8ff', '#ff6fa8', '#f0c330'][(c + r) % 3]);
              }
            }
            circ(ctx, x + 420, 330, 26, '#3f7a4a'); rect(ctx, x + 408, 350, 24, 40, '#b5653f');
          }
          sign(ctx, wid * 0.62, 150, 170, 48, '#fff', '#2c2f4a', this_tip(this));
          rect(ctx, 0, 405, wid, 10, '#3a2d24');
        });
      }
    },
    katu: {
      name: 'Pyörätie', floor: '#5d6168', tip: ['Kypärä päähän', '– myös ajatuksille'],
      draw(ctx, camX, t, hype) {
        ctx.fillStyle = grad(ctx, 0, 300, ['#7ec3f0', '#d9f0ff']); ctx.fillRect(0, 0, W, H);
        layer(ctx, camX, 0.25, wid => {
          const cols = ['#f2c6b4', '#c9e0c3', '#f5e3a1', '#c6d3ef', '#efc6df'];
          for (let x = 0, i = 0; x < wid; x += 170, i++) {
            const h = 220 + (i * 37) % 70;
            rect(ctx, x, 360 - h, 160, h, cols[i % 5]);
            for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rect(ctx, x + 18 + c * 48, 360 - h + 20 + r * 46, 26, 30, '#7d9bb8');
            rect(ctx, x + 10, 300, 140, 60, '#ffffffaa');
          }
          sign(ctx, wid * 0.4, 240, 120, 30, '#2a7a5a', '#fff', ['KORJAAMO'], 'bold 15px sans-serif');
          sign(ctx, wid * 0.75, 240, 120, 30, '#7a3a5a', '#fff', ['KIRJASTO'], 'bold 15px sans-serif');
          ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(wid, 130); ctx.stroke();
        });
        layer(ctx, camX, 0.6, wid => {
          rect(ctx, 0, 380, wid, 30, '#b9b4aa');
          crowd(ctx, 14, 20, wid - 20, 396, t, hype, ['#f0c330', '#30c48d', '#2a2a2a', '#3d6fb3', '#e05a2b'], 41);
          for (let x = 200; x < wid; x += 600) {
            rect(ctx, x, 230, 8, 170, '#333'); rect(ctx, x - 12, 210, 32, 72, '#222');
            circ(ctx, x + 4, 226, 8, Math.floor(t / 120) % 2 ? '#3a1a1a' : '#ff4040'); circ(ctx, x + 4, 246, 8, '#3a3a1a'); circ(ctx, x + 4, 266, 8, Math.floor(t / 120) % 2 ? '#40ff70' : '#1a3a1a');
          }
          sign(ctx, wid * 0.2, 280, 180, 48, '#f0c330', '#2a2a2a', this_tip(this));
        });
      },
      floorDeco(ctx, camX) {
        layer(ctx, camX, 1, wid => { rect(ctx, 0, G + 6, wid, 24, '#3f9a6b'); for (let x = 30; x < wid; x += 160) rect(ctx, x, G + 16, 60, 4, '#e9fff6'); });
      }
    },
    tyomaa: {
      name: 'Remonttityömaa', floor: '#9a8466', tip: ['Mittaa kahdesti,', 'sahaa kerran'],
      draw(ctx, camX, t, hype) {
        ctx.fillStyle = grad(ctx, 0, 330, ['#f7a35c', '#ffd9a0']); ctx.fillRect(0, 0, W, H);
        layer(ctx, camX, 0.15, wid => {
          ctx.strokeStyle = '#d9752a'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(wid * 0.7, 330); ctx.lineTo(wid * 0.7, 40); ctx.lineTo(wid * 0.2, 40); ctx.stroke();
          ctx.lineWidth = 2; for (let y = 60; y < 330; y += 22) { ctx.beginPath(); ctx.moveTo(wid * 0.7 - 8, y); ctx.lineTo(wid * 0.7 + 8, y + 11); ctx.stroke(); }
          rect(ctx, wid * 0.3, 40, 2, 80 + Math.sin(t * 0.02) * 10, '#333'); rect(ctx, wid * 0.3 - 20, 120 + Math.sin(t * 0.02) * 10, 42, 14, '#8a6a4a');
        });
        layer(ctx, camX, 0.35, wid => {
          for (let x = 0; x < wid; x += 360) {
            rect(ctx, x + 20, 150, 300, 220, '#d9cbb4');
            for (let r = 0; r < 8; r++) for (let c = 0; c < 10; c++) rect(ctx, x + 22 + c * 30 + (r % 2) * 15, 152 + r * 27, 26, 23, '#c47a5a');
            ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 4;
            for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + 20 + i * 100, 130); ctx.lineTo(x + 20 + i * 100, 370); ctx.stroke(); }
            for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x + 20, 150 + j * 80); ctx.lineTo(x + 320, 150 + j * 80); ctx.stroke(); }
          }
        });
        layer(ctx, camX, 0.6, wid => {
          crowd(ctx, 12, 20, wid - 20, 410, t, hype, ['#3d6fb3', '#f2a23a', '#e05a2b', '#5a5a5a'], 51);
          for (let x = 80; x < wid; x += 500) {
            for (let i = 0; i < 4; i++) rect(ctx, x, 380 - i * 12, 140, 10, i % 2 ? '#d9b27a' : '#c49a62');
            circ(ctx, x + 300, 360, 34, '#d9752a'); rect(ctx, x + 290, 380, 20, 30, '#555');
          }
          sign(ctx, wid * 0.55, 290, 180, 48, '#ffd23a', '#2a2a2a', this_tip(this));
        });
      }
    },
    studio: {
      name: 'Somestudio', floor: '#1c1428', tip: ['Elämä ei ole', 'syöte'],
      draw(ctx, camX, t, hype) {
        ctx.fillStyle = grad(ctx, 0, H, ['#1a0f2e', '#3a1650', '#5a1d5e']); ctx.fillRect(0, 0, W, H);
        layer(ctx, camX, 0.2, wid => {
          for (let x = 60; x < wid; x += 260) {
            ctx.strokeStyle = 'rgba(255,111,168,0.8)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, 150, 60, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 150, 60, 0, Math.PI * 2); ctx.stroke();
          }
          for (let i = 0; i < 18; i++) {
            const x = (i * 131) % wid, y = 300 - ((t * 0.6 + i * 47) % 300);
            ctx.fillStyle = 'rgba(255,111,168,' + (0.3 + 0.5 * (y / 300)) + ')'; ctx.font = '22px sans-serif'; ctx.fillText('♥', x, y);
          }
        });
        layer(ctx, camX, 0.5, wid => {
          sign(ctx, wid * 0.5 - 60, 96, 120, 44, Math.floor(t / 30) % 2 ? '#ff3355' : '#cc2244', '#fff', ['● LIVE'], 'bold 22px sans-serif');
          sign(ctx, wid * 0.15, 260, 170, 48, '#ff6fa8', '#fff', this_tip(this));
          crowd(ctx, 15, 20, wid - 20, 400, t, hype, ['#ff6fa8', '#7a4bd8', '#2e2a44', '#30c48d', '#fff1f7'], 61);
          for (let i = 0; i < 15; i++) { const x = 20 + (wid - 40) * (i + 0.3) / 15; rect(ctx, x + 4, 340 + Math.sin(t * 0.1 + i) * 2, 9, 14, '#7fd8ff'); }
        });
      }
    },
    loft: {
      name: 'Startup-loft', floor: '#4a4d55', tip: ['HUSTLE 24/7', '(älä usko tätä)'],
      draw(ctx, camX, t, hype) {
        rect(ctx, 0, 0, W, H, '#151821');
        layer(ctx, camX, 0.15, wid => {
          for (let x = 0; x < wid; x += 200) {
            rect(ctx, x + 10, 30, 180, 270, '#0d1020');
            for (let i = 0; i < 6; i++) rect(ctx, x + 20 + i * 28, 300 - 60 - (i * 53 % 120), 22, 60 + (i * 53 % 120), '#1c2240');
            for (let i = 0; i < 20; i++) rect(ctx, x + 22 + (i * 31 % 160), 290 - (i * 47 % 150), 3, 3, (i + Math.floor(t / 50)) % 5 ? '#6fa8ff' : '#1c2240');
            rect(ctx, x + 98, 30, 4, 270, '#2a2f3f');
          }
        });
        layer(ctx, camX, 0.45, wid => {
          const flick = Math.sin(t * 0.7) > -0.8;
          ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
          ctx.fillStyle = flick ? '#ffcf3a' : '#5a4a1a'; ctx.shadowColor = '#ffcf3a'; ctx.shadowBlur = flick ? 18 : 0;
          ctx.fillText('HUSTLE 24/7', wid * 0.5, 118); ctx.shadowBlur = 0;
          ctx.font = '14px sans-serif'; ctx.fillStyle = '#aab'; ctx.fillText('(älä usko tätä)', wid * 0.5, 138);
          for (let x = 40; x < wid; x += 420) {
            rect(ctx, x, 160, 160, 100, '#222838'); rect(ctx, x + 6, 166, 148, 88, '#0f1a2e');
            ctx.strokeStyle = '#30c48d'; ctx.lineWidth = 3; ctx.beginPath();
            for (let i = 0; i < 8; i++) ctx.lineTo(x + 14 + i * 19, 240 - i * i * 1.2 - Math.sin(t * 0.05 + i) * 3);
            ctx.stroke();
          }
          crowd(ctx, 12, 20, wid - 20, 410, t, hype * 0.6, ['#262a33', '#3a3f4a', '#ffcf3a', '#4a5a7a'], 71);
          for (let x = 120; x < wid; x += 380) { circ(ctx, x, 395, 30, '#d63c3c'); circ(ctx, x + 60, 398, 26, '#3d6fb3'); }
        });
      }
    }
  };
  // vinkkikyltin teksti
  function this_tip(s) { return s.tip; }
  Object.keys(STAGES).forEach(k => { STAGES[k].id = k; });

  EK.STAGES = STAGES;
  EK.STAGE_IDS = Object.keys(STAGES);

  // Areena kokonaisuudessaan: tausta, lattia ja lattian koristeet
  EK.drawStage = function (ctx, id, camX, t, hype) {
    const s = STAGES[id] || STAGES.kahvila;
    s.draw(ctx, camX, t, hype || 0);
    // lattia
    const fy = G - 46;
    ctx.fillStyle = s.floor; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, fy, W, 6);
    layer(ctx, camX, 1, wid => floorLines(ctx, wid, fy, 'rgba(0,0,0,0.12)', 14, camX));
    ctx.fillStyle = grad(ctx, fy, H, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']); ctx.fillRect(0, fy, W, H - fy);
    if (s.floorDeco) s.floorDeco(ctx, camX);
  };
})();
