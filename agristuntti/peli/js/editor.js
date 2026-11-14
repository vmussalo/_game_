// AgriStuntti – rataeditori: ruudukko ylhäältä, palat, korkeustasot, maasto ja maisemaesineet.
import { GRID, TILE as T, TERRAIN, PROPS, MAX_LEVEL } from './data.js';
import { PIECES, PIECE_BY_ID } from './pieces.js';
import { footprint, pieceCells, worldFrames, trace, samples, emptyTrack } from './track.js';
import { toCode, fromCode, saveOwn } from './storage.js';

const LV_COL = ['#5a5f66', '#6c7a8a', '#7f90a8', '#93a5c4', '#a8bbe0'];

export function createEditor(root, track, cb) {
  track = track || emptyTrack('Oma rata');
  const st = { tool: { k: 'pala', id: 'suora' }, rot: 0, lvl: 0, hover: null, down: false, check: null, ownId: track.ownId || null, dirty: false };
  root.innerHTML = `
  <div class="ed">
    <div class="ed-side">
      <div class="ed-row"><input id="edName" maxlength="40" value="" aria-label="Radan nimi"><button class="btn small" data-a="back">✕</button></div>
      <h4>Palat</h4><div class="ed-grid" id="edPieces"></div>
      <div class="ed-row"><button class="btn small" data-a="rot">⟳ Kierrä (R)</button>
        <span class="ed-lvl">Taso <button class="btn small" data-a="lvl-">−</button><b id="edLvl">0</b><button class="btn small" data-a="lvl+">+</button></span></div>
      <h4>Maasto</h4><div class="ed-grid" id="edTerrain"></div>
      <h4>Esineet</h4><div class="ed-grid" id="edProps"></div>
      <div class="ed-row"><button class="btn small" data-tool="kumi">🧽 Poista</button><button class="btn small" data-a="clear">Tyhjennä</button></div>
      <div id="edMsg" class="ed-msg"></div>
      <div class="ed-row wrap">
        <button class="btn primary" data-a="test">▶ Koeaja</button>
        <button class="btn" data-a="save">💾 Tallenna</button>
        <button class="btn" data-a="export">📋 Ratakoodi</button>
        <button class="btn" data-a="import">📥 Tuo koodi</button>
        <button class="btn" data-a="file">⬇ Tiedostoksi</button>
        <label class="btn">⬆ Tiedostosta<input type="file" id="edFile" accept=".json,.txt,application/json" hidden></label>
      </div>
      <p class="hint">Hiiri: klikkaa tai vedä. Oikea nappi poistaa. R kiertää, + ja − vaihtavat tasoa. Rata alkaa lähtöruudusta ja päättyy maaliin tai palaa lähtöön.</p>
    </div>
    <div class="ed-main"><canvas id="edCv"></canvas></div>
  </div>`;
  const $ = id => root.querySelector('#' + id);
  const cv = $('edCv'), ctx = cv.getContext('2d');
  $('edName').value = track.name;
  $('edName').addEventListener('input', () => { track.name = $('edName').value || 'Nimetön'; st.dirty = true; });

  // työkalunapit pienoiskuvilla
  const pieceBtns = PIECES.map(d => `<button class="tool" data-tool="pala" data-id="${d.id}" title="${d.name}"><canvas width="56" height="56" data-pc="${d.id}"></canvas><span>${d.name}</span></button>`).join('');
  $('edPieces').innerHTML = pieceBtns;
  $('edTerrain').innerHTML = TERRAIN.map((t, i) => `<button class="tool" data-tool="maasto" data-id="${i}"><i style="background:${t.col}"></i><span>${t.name}</span></button>`).join('');
  $('edProps').innerHTML = PROPS.map(p => `<button class="tool" data-tool="esine" data-id="${p.id}"><i class="emo">${p.icon}</i><span>${p.name}</span></button>`).join('');
  root.querySelectorAll('canvas[data-pc]').forEach(c => drawPieceIcon(c, c.dataset.pc));

  const selectTool = (k, id) => {
    st.tool = { k, id };
    root.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('sel', b.dataset.tool === k && (b.dataset.id || '') === String(id || '')));
    draw();
  };
  selectTool('pala', 'suora');

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-tool],[data-a]');
    if (!b) return;
    if (b.dataset.tool) return selectTool(b.dataset.tool, b.dataset.id);
    act(b.dataset.a);
  });
  $('edFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(txt => loadCode(txt)).catch(() => msg('Tiedoston luku ei onnistunut.', true));
    e.target.value = '';
  });

  function act(a) {
    switch (a) {
      case 'back': if (!st.dirty || confirm('Poistutaanko editorista? Tallentamattomat muutokset häviävät.')) cb.onBack(); break;
      case 'rot': st.rot = (st.rot + 1) % 4; draw(); break;
      case 'lvl+': st.lvl = Math.min(MAX_LEVEL, st.lvl + 1); $('edLvl').textContent = st.lvl; draw(); break;
      case 'lvl-': st.lvl = Math.max(0, st.lvl - 1); $('edLvl').textContent = st.lvl; draw(); break;
      case 'clear': if (confirm('Tyhjennetäänkö koko rata?')) { const n = track.name; Object.assign(track, emptyTrack(n)); st.dirty = true; validate(); } break;
      case 'test': { validate(); if (!st.check.ok) { msg('Rataa ei voi ajaa: ' + st.check.err, true); return; } cb.onTest(track); break; }
      case 'save': {
        const id = saveOwn(track, st.ownId);
        if (id) { st.ownId = id; track.ownId = id; st.dirty = false; msg('Tallennettu omiin ratoihin.'); } else msg('Tallennus epäonnistui (selaimen tila täynnä?).', true);
        break;
      }
      case 'export': {
        const code = toCode(track);
        const done = () => msg('Ratakoodi kopioitu leikepöydälle. Jaa se kaverille – hän voi tuoda sen kohdasta "Tuo koodi".');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => prompt('Kopioi ratakoodi:', code));
        else prompt('Kopioi ratakoodi:', code);
        break;
      }
      case 'import': { const c = prompt('Liitä ratakoodi (alkaa AS1:):'); if (c) loadCode(c); break; }
      case 'file': {
        const blob = new Blob([JSON.stringify({ peli: 'AgriStuntti', nimi: track.name, koodi: toCode(track) }, null, 1)], { type: 'application/json' });
        const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob);
        a2.download = (track.name || 'rata').replace(/[^\wäöåÄÖÅ -]/g, '').trim().replace(/\s+/g, '_') + '.agristuntti.json';
        document.body.appendChild(a2); a2.click(); setTimeout(() => { URL.revokeObjectURL(a2.href); a2.remove(); }, 500);
        break;
      }
    }
  }
  function loadCode(txt) {
    try {
      let code = txt;
      try { const j = JSON.parse(txt); if (j && j.koodi) code = j.koodi; } catch (e) { /* pelkkä koodi */ }
      const t = fromCode(code);
      Object.assign(track, t); delete track.builtin; delete track.id;
      st.ownId = null; $('edName').value = track.name; st.dirty = true;
      validate(); msg('Rata tuotu: ' + track.name);
    } catch (e) { msg(e.message || 'Virheellinen ratakoodi.', true); }
  }
  function msg(t, bad) { const m = $('edMsg'); m.textContent = t; m.classList.toggle('bad', !!bad); }

  // ---------- muokkaus ----------
  const tileAt = e => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * cv.width, y = (e.clientY - r.top) / r.height * cv.height;
    const i = Math.floor((x - st.ox) / st.cs), j = Math.floor((y - st.oy) / st.cs);
    return i >= 0 && j >= 0 && i < GRID && j < GRID ? [i, j] : null;
  };
  const occAt = (i, j) => track.pieces.findIndex(p => pieceCells(p).some(([a, b]) => a === i && b === j));
  const propAt = (i, j) => track.props.findIndex(p => p.i === i && p.j === j);
  function apply(t, erase) {
    if (!t) return;
    const [i, j] = t;
    if (erase || st.tool.k === 'kumi') {
      const k = occAt(i, j); if (k >= 0) track.pieces.splice(k, 1);
      else { const q = propAt(i, j); if (q >= 0) track.props.splice(q, 1); }
    } else if (st.tool.k === 'maasto') track.terrain[j * GRID + i] = +st.tool.id;
    else if (st.tool.k === 'esine') {
      if (occAt(i, j) >= 0) return;
      const q = propAt(i, j); if (q >= 0) track.props.splice(q, 1);
      track.props.push({ t: st.tool.id, i, j, r: st.rot });
    } else if (st.tool.k === 'pala') {
      const p = { t: st.tool.id, i, j, r: st.rot, l: st.lvl };
      const cells = pieceCells(p);
      if (cells.some(([a, b]) => a >= GRID || b >= GRID)) return;
      if (st.tool.id === 'lahto') track.pieces = track.pieces.filter(q => q.t !== 'lahto');
      // korvataan alle jäävät palat ja esineet
      track.pieces = track.pieces.filter(q => !pieceCells(q).some(([a, b]) => cells.some(([c, d]) => a === c && b === d)));
      track.props = track.props.filter(q => !cells.some(([c, d]) => q.i === c && q.j === d));
      track.pieces.push(p);
    }
    st.dirty = true;
    validate();
  }
  let lastTile = null;
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    st.down = e.button === 2 ? 'erase' : 'draw';
    const t = tileAt(e); lastTile = t && t.join();
    apply(t, st.down === 'erase');
  });
  cv.addEventListener('pointermove', e => {
    const t = tileAt(e);
    st.hover = t; draw();
    if (st.down && t && t.join() !== lastTile && (st.tool.k === 'maasto' || st.tool.k === 'kumi' || st.down === 'erase' || st.tool.id === 'suora')) { lastTile = t.join(); apply(t, st.down === 'erase'); }
  });
  cv.addEventListener('pointerup', () => { st.down = false; });
  cv.addEventListener('pointerleave', () => { st.hover = null; draw(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const onKey = e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'KeyR') act('rot');
    else if (e.key === '+' || e.code === 'PageUp') act('lvl+');
    else if (e.key === '-' || e.code === 'PageDown') act('lvl-');
  };
  addEventListener('keydown', onKey);

  // ---------- piirto ----------
  function resize() {
    const box = cv.parentElement.getBoundingClientRect();
    const s = Math.max(240, Math.floor(Math.min(box.width, box.height)));
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = cv.height = Math.floor(s * dpr);
    cv.style.width = cv.style.height = s + 'px';
    st.cs = cv.width / GRID; st.ox = 0; st.oy = 0;
    draw();
  }
  function validate() {
    const tr = trace(track);
    st.check = tr;
    let len = 0;
    if (tr.ok) { const sm = samples(track, tr.seq); len = sm.length ? sm[sm.length - 1].d : 0; }
    msg(tr.ok ? `Rata kunnossa: ${tr.circuit ? 'kierros' : 'lähdöstä maaliin'}, ${Math.round(len)} m, ${tr.seq.length} palaa.` : '⚠ ' + tr.err, !tr.ok);
    draw();
  }
  function draw() {
    if (!st.cs) return;
    const cs = st.cs, W = cv.width;
    ctx.fillStyle = '#1b1d1a'; ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const t = TERRAIN[track.terrain[j * GRID + i]] || TERRAIN[0];
      ctx.fillStyle = (i + j) % 2 ? t.col : t.col2; ctx.fillRect(i * cs, j * cs, cs + 0.5, cs + 0.5);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let k = 0; k <= GRID; k++) { ctx.beginPath(); ctx.moveTo(k * cs, 0); ctx.lineTo(k * cs, W); ctx.moveTo(0, k * cs); ctx.lineTo(W, k * cs); ctx.stroke(); }
    // palat tasojärjestyksessä
    const ps = track.pieces.slice().sort((a, b) => a.l - b.l);
    for (const p of ps) drawPiece(ctx, p, cs / T, 1);
    // reitin järjestys nuolina
    if (st.check && st.check.ok) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      st.check.seq.forEach((s, k) => {
        if (k % 2) return;
        const fr = worldFrames(track.pieces[s.pi], s.path); const m = fr[Math.floor(fr.length / 2)], m2 = fr[Math.min(fr.length - 1, Math.floor(fr.length / 2) + 1)];
        let dx = m2.x - m.x, dz = m2.z - m.z; if (s.rev) { dx = -dx; dz = -dz; }
        arrow(ctx, m.x * cs / T, m.z * cs / T, Math.atan2(dz, dx), cs * 0.22);
      });
    }
    for (const pr of track.props) {
      const d = PROPS.find(x => x.id === pr.t);
      ctx.font = Math.floor(cs * 0.7) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d ? d.icon : '?', (pr.i + 0.5) * cs, (pr.j + 0.55) * cs);
    }
    if (st.check && !st.check.ok && st.check.at) {
      const [i, j] = st.check.at; ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 3; ctx.strokeRect(i * cs + 2, j * cs + 2, cs - 4, cs - 4);
    }
    // esikatselu kursorin kohdalla
    if (st.hover) {
      const [i, j] = st.hover;
      if (st.tool.k === 'pala') {
        const p = { t: st.tool.id, i, j, r: st.rot, l: st.lvl };
        const [w, l] = footprint(PIECE_BY_ID[p.t], p.r);
        const ok = i + w <= GRID && j + l <= GRID;
        ctx.globalAlpha = 0.6; drawPiece(ctx, p, cs / T, 1); ctx.globalAlpha = 1;
        ctx.strokeStyle = ok ? '#ffe36a' : '#ff4040'; ctx.lineWidth = 2; ctx.strokeRect(i * cs, j * cs, w * cs, l * cs);
      } else { ctx.strokeStyle = st.tool.k === 'kumi' ? '#ff4040' : '#ffe36a'; ctx.lineWidth = 2; ctx.strokeRect(i * cs, j * cs, cs, cs); }
    }
  }
  const ro = new ResizeObserver(resize); ro.observe(cv.parentElement);
  resize(); validate();
  return { destroy() { ro.disconnect(); removeEventListener('keydown', onKey); root.innerHTML = ''; }, track };
}

function arrow(ctx, x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, s * 0.6); ctx.lineTo(-s * 0.6, -s * 0.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// pala ylhäältä: keskilinja tien levyisenä, väri tason mukaan
export function drawPiece(ctx, p, sc, alpha) {
  const def = PIECE_BY_ID[p.t];
  def.paths.forEach((path, pi) => {
    const fr = worldFrames(p, pi);
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    const line = (w, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); fr.forEach((f, k) => { const x = f.x * sc, y = f.z * sc; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    };
    line(10.5 * sc, '#1a1a1a');
    line(9.2 * sc, def.loop ? '#8a6ab0' : def.jump ? '#b07a3a' : LV_COL[Math.min(4, p.l)]);
    if (def.loop) { // silmukka: rengas keskelle
      const m = fr[Math.floor(fr.length / 2)];
      ctx.strokeStyle = '#f0e0ff'; ctx.lineWidth = 2 * sc * 3; ctx.beginPath(); ctx.arc(m.x * sc, m.z * sc, 6 * sc, 0, Math.PI * 2); ctx.stroke();
    }
    if (def.deco) {
      const m = fr[Math.floor(fr.length / 2)], m2 = fr[Math.floor(fr.length / 2) + 1];
      const a = Math.atan2(m2.z - m.z, m2.x - m.x) + Math.PI / 2;
      ctx.strokeStyle = def.deco === 'start' ? '#ffe040' : '#ff5040'; ctx.lineWidth = 3 * sc * 2;
      ctx.beginPath(); ctx.moveTo((m.x + Math.cos(a) * 5) * sc, (m.z + Math.sin(a) * 5) * sc); ctx.lineTo((m.x - Math.cos(a) * 5) * sc, (m.z - Math.sin(a) * 5) * sc); ctx.stroke();
    }
    if (def.jump) { // hyppyrin korkea pää
      const e = fr[fr.length - 1];
      ctx.fillStyle = '#ffcc66'; ctx.beginPath(); ctx.arc(e.x * sc, e.z * sc, 2.5 * sc * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    if ((p.l || def.paths[0].b.dl) && sc > 0.5) {
      const m = fr[Math.floor(fr.length / 2)];
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.max(9, Math.floor(10 * sc)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.t === 'nousu' ? p.l + '↗' + (p.l + 1) : String(p.l), m.x * sc, m.z * sc);
    }
  });
  void alpha;
}

function drawPieceIcon(cv, id) {
  const ctx = cv.getContext('2d');
  const def = PIECE_BY_ID[id];
  const [w, l] = def.size;
  const s = cv.width / (Math.max(w, l) * T);
  ctx.fillStyle = '#4f7f35'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.translate((cv.width - w * T * s) / 2, (cv.height - l * T * s) / 2);
  drawPiece(ctx, { t: id, i: 0, j: 0, r: 0, l: 0 }, s, 1);
  ctx.restore();
}
