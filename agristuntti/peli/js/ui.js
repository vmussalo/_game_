// AgriStuntti – valikot (DOM). Napit käyttävät data-a-attribuuttia.
import { VEHICLES, OPPONENTS, GRID } from './data.js';
import { BUILTIN } from './tracks.js';
import { buildWorld, samples, trace } from './track.js';
import * as ST from './storage.js';
import * as SC from './scene.js';
import * as AU from './audio.js';
import { G, fmtTime, startRace, showTrack, startReplay, setPaused, forfeit, replayCtl } from './game.js';
import { createEditor, drawPiece } from './editor.js';

const U = { scr: null, sel: { track: null, ownId: null }, editor: null, builtin: BUILTIN() };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const btn = (a, label, cls, data) => `<button class="btn ${cls || ''}" data-a="${a}"${data ? Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('') : ''}>${label}</button>`;

export function init() {
  U.scr = document.getElementById('scr');
  U.scr.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled || U.editor && U.scr.querySelector('.ed') && b.closest('.ed')) return;
    AU.unlock();
    const f = ACT[b.dataset.a]; if (f) f(b.dataset, b);
  });
  document.getElementById('rpbar').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { if (b.dataset.r === 'exit') ACT.endReplay(); else replayCtl(b.dataset.r); } });
  G.cb.pause = () => pause();
  G.cb.results = r => results(r);
  G.cb.endReplay = () => ACT.endReplay();
  U.sel.track = U.builtin[0];
}

function show(name, html, cls) {
  U.scr.className = 'screen ' + (cls || '');
  U.scr.innerHTML = html;
  U.scr.classList.remove('hidden');
  U.scr.scrollTop = 0;
  document.documentElement.dataset.screen = name;
  U.scr.querySelectorAll('canvas[data-mini]').forEach(cv => miniMap(cv, cv.dataset.mini));
}
export function hide() { U.scr.classList.add('hidden'); document.documentElement.dataset.screen = ''; }

const ACT = {};

// ---------- päävalikko ----------
export function title() {
  G.mode = 'menu';
  show('title', `<div class="title">
    <h1 class="logo"><span class="l1">AGRI</span><span class="l2">STUNTTI</span></h1>
    <p class="sub">Silmukoita, hyppyreitä ja kallistettuja kaarteita – ruohonleikkurista kaivinkoneeseen</p>
    <div class="menu">
      ${btn('tracks', '🏁 Aja', 'big primary')}
      ${btn('editor', '🛠 Rataeditori', 'big')}
      <div class="row">${btn('settings', '⚙ Asetukset')}${btn('help', '❔ Ohjeet')}</div>
    </div>
    <p class="foot">AgriStuntti (työnimi) · näppäimistö, peliohjain tai kosketus</p>
  </div>`, 'title-scr');
}
ACT.title = () => title();

// ---------- radan valinta ----------
function trackCard(t, key, extra) {
  const r = ST.record(ST.trackKey(t));
  const sel = U.sel.track === t || (U.sel.ownId && U.sel.ownId === t.ownId);
  return `<button class="tcard${sel ? ' sel' : ''}" data-a="pick" data-k="${key}">
    <canvas width="150" height="110" data-mini="${key}"></canvas>
    <b>${esc(t.name)}</b><small>${esc(t.desc || '')}</small>
    <span class="rec">${r ? '⏱ ' + fmtTime(r.time) + ' · ' + esc(VEHICLES[r.vi].name) : 'Ei ennätystä'}</span>${extra || ''}</button>`;
}
function ownList() {
  return ST.ownTracks().map(o => { try { const t = ST.fromCode(o.code); t.ownId = o.id; return t; } catch (e) { return null; } }).filter(Boolean);
}
export function tracks() {
  G.mode = 'menu';
  const own = ownList();
  U.ownCache = own;
  show('tracks', `<div class="panel wide">
    <div class="phead"><h2>Valitse rata</h2>${btn('title', 'Takaisin', 'small')}</div>
    <h3>Valmiit radat</h3><div class="tgrid">${U.builtin.map((t, i) => trackCard(t, 'b' + i)).join('')}</div>
    <h3>Omat radat</h3><div class="tgrid">${own.length ? own.map((t, i) => trackCard(t, 'o' + i)).join('') : '<p class="hint">Ei vielä omia ratoja. Tee ensimmäinen rataeditorissa tai tuo kaverin ratakoodi.</p>'}</div>
    <div class="row wrap">${btn('editCopy', '✏ Muokkaa valittua')}${btn('editor', '🛠 Uusi rata')}${btn('importTrack', '📥 Tuo ratakoodi')}${btn('delOwn', '🗑 Poista oma rata')}</div>
    <div class="sticky">${btn('setup', 'Seuraava: kone →', 'primary big')}</div>
  </div>`);
}
ACT.tracks = () => tracks();
const trackByKey = k => k[0] === 'b' ? U.builtin[+k.slice(1)] : (U.ownCache || ownList())[+k.slice(1)];
ACT.pick = d => {
  const t = trackByKey(d.k); if (!t) return;
  U.sel.track = t; U.sel.ownId = t.ownId || null;
  showTrack(t);
  U.scr.querySelectorAll('.tcard').forEach(c => c.classList.toggle('sel', c.dataset.k === d.k));
};
ACT.importTrack = () => {
  const c = prompt('Liitä ratakoodi (alkaa AS1:):'); if (!c) return;
  try { const t = ST.fromCode(c); const id = ST.saveOwn(t); if (!id) throw new Error('Tallennus epäonnistui.'); tracks(); }
  catch (e) { alert(e.message || 'Virheellinen ratakoodi.'); }
};

// ---------- kone ja vastustaja ----------
export function setup() {
  const set = ST.settings();
  const t = U.sel.track;
  const tr = trace(t);
  if (!tr.ok) { alert('Rataa ei voi ajaa: ' + tr.err); return; }
  const stat = (v, max) => `<i class="bar"><i style="width:${Math.round(Math.min(1, v / max) * 100)}%"></i></i>`;
  show('setup', `<div class="panel wide">
    <div class="phead"><h2>${esc(t.name)}</h2>${btn('tracks', 'Takaisin', 'small')}</div>
    <h3>Kone</h3><div class="vgrid">${VEHICLES.map((v, i) => `<button class="vcard${set.vi === i ? ' sel' : ''}" data-a="veh" data-v="${i}">
      <b>${esc(v.name)}</b><small>${esc(v.desc)}</small>
      <span class="st">Huippu ${stat(v.vmax, 40)}</span><span class="st">Kiihtyvyys ${stat(v.acc, 8)}</span>
      <span class="st">Pito ${stat(v.grip, 1.3)}</span><span class="st">Paino ${stat(Math.log(v.mass), Math.log(15000))}</span></button>`).join('')}</div>
    <h3>Vastustaja</h3><div class="row wrap">${OPPONENTS.map((o, i) => btn('opp', esc(o.name), set.opp === i ? 'sel' : '', { v: i })).join('')}</div>
    <p class="hint">Haamu on oma paras ajosi tällä radalla läpikuultavana. Tietokonekuskit ajavat omilla koneillaan.</p>
    <div class="sticky">${btn('go', '🏁 Aja!', 'primary big')}</div>
  </div>`);
}
ACT.setup = () => setup();
ACT.veh = d => { const s = ST.settings(); s.vi = +d.v; ST.saveSettings(s); U.scr.querySelectorAll('.vcard').forEach(c => c.classList.toggle('sel', c.dataset.v === d.v)); };
ACT.opp = d => { const s = ST.settings(); s.opp = +d.v; ST.saveSettings(s); U.scr.querySelectorAll('[data-a=opp]').forEach(c => c.classList.toggle('sel', c.dataset.v === d.v)); };
ACT.go = () => { G.fromEditor = false; go(); };
ACT.backEd = () => editor(U.edTrack);
export function go(opts) {
  const s = ST.settings();
  try { startRace(U.sel.track, s.vi, OPPONENTS[s.opp] ? OPPONENTS[s.opp].id : 'ei', opts); }
  catch (e) { alert(e.message); return; }
  SC.setCam(s.cam || 0);
  hide();
}

// ---------- tauko ja tulokset ----------
function pause() {
  if (G.mode !== 'race') return;
  if (G.paused) { ACT.resume(); return; }
  setPaused(true);
  show('pause', `<div class="panel narrow"><h2>Tauko</h2><div class="menu">
    ${btn('resume', 'Jatka', 'big primary')}${btn('restart', '↻ Aloita alusta', 'big')}
    ${btn('sound', AU.isOn() ? '🔊 Äänet päällä' : '🔇 Äänet pois', 'big')}${btn('quit', 'Lopeta kisa', 'big')}</div>
    <p class="hint">C vaihtaa kameraa, R palauttaa radalle.</p></div>`, 'dim');
}
ACT.resume = () => { setPaused(false); hide(); };
ACT.restart = () => { setPaused(false); go(); };
ACT.quit = () => { setPaused(false); forfeit(); if (G.fromEditor) editor(U.edTrack); else tracks(); };
ACT.sound = () => { const s = ST.settings(); s.sound = !AU.isOn(); ST.saveSettings(s); AU.setOn(s.sound); if (G.mode === 'race') { G.paused = false; pause(); } else settings(); };

function results(r) {
  const beat = r.opp && r.opp.time != null ? (r.time < r.opp.time ? 'Voitit: ' + esc(r.opp.name) + ' ' + fmtTime(r.opp.time) : esc(r.opp.name) + ' oli nopeampi: ' + fmtTime(r.opp.time)) : r.opp ? esc(r.opp.name) + ' ei ehtinyt maaliin' : '';
  show('results', `<div class="panel narrow results">
    <h2 class="big-time">${fmtTime(r.time)}</h2>
    ${r.rec ? '<p class="newrec">🏆 Uusi ennätys!</p>' : r.best != null ? '<p class="quip">Ennätys ' + fmtTime(r.best) + '</p>' : ''}
    ${beat ? '<p class="quip">' + beat + '</p>' : ''}
    <table class="tbl"><tr><td>Kolarit</td><td>${r.crashes}</td></tr><tr><td>Palautukset radalle</td><td>${r.resets}</td></tr><tr><td>Pisin ilmalento</td><td>${r.air ? r.air.toFixed(1) + ' s' : '–'}</td></tr></table>
    <div class="row wrap">${btn('replay', '🎬 Katso uusinta', 'primary')}${btn('restart', '↻ Uudelleen')}${G.fromEditor ? btn('backEd', '🛠 Takaisin editoriin') : btn('setup', 'Vaihda konetta') + btn('tracks', 'Radat')}</div>
  </div>`, 'dim');
}
ACT.replay = () => { hide(); startReplay(); };
ACT.endReplay = () => { document.getElementById('rpbar').classList.add('hidden'); G.mode = 'menu'; if (G.fromEditor) editor(U.edTrack); else tracks(); };

// ---------- editori ----------
ACT.editor = () => editor(null);
export function editor(track) {
  G.mode = 'editor';
  if (track && track.builtin) { track = ST.fromCode(ST.toCode(track)); track.name = track.name + ' (kopio)'; }
  show('editor', '<div id="edRoot" class="edroot"></div>', 'editor-scr');
  if (U.editor) U.editor.destroy();
  U.editor = createEditor(document.getElementById('edRoot'), track ? Object.assign({}, track, { terrain: new Uint8Array(track.terrain), pieces: track.pieces.map(p => Object.assign({}, p)), props: track.props.map(p => Object.assign({}, p)) }) : null, {
    onBack: () => { U.editor.destroy(); U.editor = null; title(); },
    onTest: t => { U.edTrack = t; U.sel.track = t; G.track = null; go(); G.fromEditor = true; }
  });
}
ACT.editCopy = () => editor(U.sel.track);
ACT.delOwn = () => { const t = U.sel.track; if (!t || !t.ownId) { alert('Valitse ensin oma rata.'); return; } if (confirm('Poistetaanko rata "' + t.name + '"? Tätä ei voi perua.')) { ST.deleteOwn(t.ownId); U.sel.track = U.builtin[0]; U.sel.ownId = null; tracks(); } };

// ---------- asetukset ja ohjeet ----------
export function settings() {
  const s = ST.settings();
  show('settings', `<div class="panel narrow"><div class="phead"><h2>Asetukset</h2>${btn('title', 'Takaisin', 'small')}</div>
    <h3>Grafiikka</h3><div class="row">${btn('style', '🟫 Retro (90-luku)', s.style === 'retro' ? 'sel' : '', { v: 'retro' })}${btn('style', '✨ Moderni', s.style !== 'retro' ? 'sel' : '', { v: 'moderni' })}</div>
    <p class="hint">Retro: kulmikas, pikselöity ja kevyt. Moderni: varjot, sumu ja tarkka kuva (raskaampi).</p>
    <h3>Ääni</h3><div class="row">${btn('sound', AU.isOn() ? '🔊 Äänet päällä' : '🔇 Äänet pois')}</div>
    <h3>Oletuskamera</h3><div class="row wrap">${SC.CAM_MODES.map((c, i) => btn('defcam', c, (s.cam || 0) === i ? 'sel' : '', { v: i })).join('')}</div>
    <h3>Nimimerkki ennätyksiin</h3><input id="setName" maxlength="16" value="${esc(s.name || '')}" placeholder="Sinä">
    <p class="hint">Kaikki tallentuu vain tähän selaimeen. Omat radat voi jakaa ratakoodina.</p></div>`);
  document.getElementById('setName').addEventListener('input', e => { const z = ST.settings(); z.name = e.target.value.trim(); ST.saveSettings(z); });
}
ACT.settings = () => settings();
ACT.style = d => { const s = ST.settings(); s.style = d.v; ST.saveSettings(s); SC.setStyle(d.v); settings(); };
ACT.defcam = d => { const s = ST.settings(); s.cam = +d.v; ST.saveSettings(s); settings(); };
ACT.help = () => show('help', `<div class="panel narrow"><div class="phead"><h2>Ohjeet</h2>${btn('title', 'Takaisin', 'small')}</div>
  <h3>Ajaminen</h3><p>Nuolet tai WASD. Alas jarruttaa ja pysähdyksissä peruuttaa. <b>C</b> vaihtaa kameraa, <b>R</b> palauttaa radalle (aika juoksee), <b>Esc</b> tauko. Peliohjain: RT kaasu, LT jarru, Y kamera, Back palautus.</p>
  <h3>Kisa</h3><p>Aja reitti lähdöstä maaliin tai kierros takaisin lähtöön. Reittiä ei voi oikaista: radan osat pitää ajaa järjestyksessä. Kolarin jälkeen kone palaa radalle hetken päästä.</p>
  <h3>Stuntit</h3><p><b>Silmukka</b> vaatii vauhtia – tule suoraan ja täysillä. <b>Hyppyrille</b> sopiva vauhti riippuu raon pituudesta: liian hiljaa → veteen, liian lujaa → yli. <b>Kallistetussa kaarteessa</b> voi ajaa lujempaa kuin tasaisessa. Korkeilla silloilla ei ole kaiteita.</p>
  <h3>Koneet</h3><p>Jokainen kone käyttäytyy eri tavalla: kurottaja ja linkku kääntävät molempia akseleita, puimuri takapyöriä ja kaivinkone kääntyy teloillaan paikallaan.</p>
  <h3>Rataeditori</h3><p>Valitse pala ja klikkaa ruudukkoa. R kiertää, + ja − vaihtavat korkeustasoa (nousupala nostaa tasoa yhdellä). Hyppyrin taakse tarvitaan vastakkain käännetty hyppyri alastuloksi 1–4 ruudun päähän. Jaa rata <b>ratakoodina</b> tai tiedostona.</p></div>`);

// radan pienoiskartta valintakortteihin
function miniMap(cv, key) {
  const t = trackByKey(key); if (!t) return;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#3f6b2c'; ctx.fillRect(0, 0, cv.width, cv.height);
  let i0 = GRID, i1 = 0, j0 = GRID, j1 = 0;
  for (const p of t.pieces) { i0 = Math.min(i0, p.i); j0 = Math.min(j0, p.j); i1 = Math.max(i1, p.i + 2); j1 = Math.max(j1, p.j + 2); }
  if (i1 <= i0) { i0 = 0; j0 = 0; i1 = GRID; j1 = GRID; }
  const sc = Math.min((cv.width - 10) / ((i1 - i0) * 30), (cv.height - 10) / ((j1 - j0) * 30));
  ctx.save(); ctx.translate((cv.width - (i1 - i0) * 30 * sc) / 2 - i0 * 30 * sc, (cv.height - (j1 - j0) * 30 * sc) / 2 - j0 * 30 * sc);
  t.pieces.slice().sort((a, b) => a.l - b.l).forEach(p => drawPiece(ctx, p, sc, 1));
  ctx.restore();
}
void buildWorld; void samples;
export const help = () => ACT.help();
