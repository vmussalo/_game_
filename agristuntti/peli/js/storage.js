// AgriStuntti – tallennus selaimeen (localStorage): omat radat, ratakoodit jakamista varten, ennätykset ja haamut.
// Kaikki pysyy käyttäjän omassa selaimessa; mitään ei lähetetä minnekään.
import { GRID } from './data.js';
import { PIECES } from './pieces.js';
import { PROPS } from './data.js';
import { emptyTrack } from './track.js';

const K_TRACKS = 'agristuntti.radat.v1', K_REC = 'agristuntti.ennatykset.v1', K_SET = 'agristuntti.asetukset';
const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

export const settings = () => Object.assign({ style: 'moderni', sound: true, cam: 0, vi: 2, opp: 1, name: '' }, get(K_SET, {}));
export const saveSettings = s => set(K_SET, s);

// ---------- ratakoodi ----------
// AS1:<base64url(JSON)>; JSON = { v, n, t (maasto merkkijonona), p [[pala, i, j, r, l]], o [[esine, i, j, r]] }
export function toCode(track) {
  const o = {
    v: 1, n: track.name || 'Nimetön',
    t: rle(Array.from(track.terrain).join('')),
    p: track.pieces.map(p => [PIECES.findIndex(d => d.id === p.t), p.i, p.j, p.r, p.l]),
    o: track.props.map(p => [PROPS.findIndex(d => d.id === p.t), p.i, p.j, p.r || 0])
  };
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return 'AS1:' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromCode(code) {
  code = String(code || '').trim();
  const m = code.match(/AS1:([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Ratakoodi ei ole AgriStuntin koodi (alkaa AS1:).');
  let b = m[1].replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let o;
  try { o = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { throw new Error('Ratakoodi on rikki tai vajaa (kopioitiinko koko koodi?).'); }
  if (o.v !== 1) throw new Error('Tuntematon ratakoodin versio.');
  const t = emptyTrack(String(o.n || 'Nimetön').slice(0, 40));
  const ter = unrle(String(o.t || ''));
  for (let i = 0; i < GRID * GRID; i++) t.terrain[i] = Math.max(0, Math.min(3, +ter[i] || 0));
  // tarkistetaan arvot, jotta rikkinäinen tai muokattu koodi ei kaada peliä
  const ok = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  t.pieces = (o.p || []).filter(a => Array.isArray(a) && ok(a[0], 0, PIECES.length - 1) && ok(a[1], -2, GRID) && ok(a[2], -2, GRID) && ok(a[3], 0, 3) && ok(a[4], 0, 6))
    .map(a => ({ t: PIECES[a[0]].id, i: a[1], j: a[2], r: a[3], l: a[4] })).slice(0, 600);
  t.props = (o.o || []).filter(a => Array.isArray(a) && ok(a[0], 0, PROPS.length - 1) && ok(a[1], 0, GRID - 1) && ok(a[2], 0, GRID - 1))
    .map(a => ({ t: PROPS[a[0]].id, i: a[1], j: a[2], r: ok(a[3], 0, 3) ? a[3] : 0 })).slice(0, 400);
  return t;
}
// maasto pakataan: '0*120 1*5 …' (merkki*toistot), yksittäiset merkit sellaisenaan
function rle(s) { return s.replace(/(\d)\1{3,}/g, m => m[0] + '*' + m.length + '.'); }
function unrle(s) { return s.replace(/(\d)\*(\d+)\./g, (m, c, n) => c.repeat(Math.min(+n, GRID * GRID))); }

// radan tunniste ennätyksiä varten (nimi ei vaikuta)
export function trackKey(track) {
  if (track.builtin) return 'b:' + track.id;
  const s = toCode(Object.assign({}, track, { name: '' }));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'o:' + (h >>> 0).toString(36);
}

// ---------- omat radat ----------
export const ownTracks = () => get(K_TRACKS, []);
export function saveOwn(track, id) {
  const list = ownTracks();
  id = id || ('r' + Date.now().toString(36));
  const item = { id, name: track.name, code: toCode(track), updated: Date.now() };
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list[i] = item; else list.unshift(item);
  return set(K_TRACKS, list) ? id : null;
}
export function deleteOwn(id) { set(K_TRACKS, ownTracks().filter(x => x.id !== id)); }
export function loadOwn(id) { const x = ownTracks().find(t => t.id === id); if (!x) return null; const t = fromCode(x.code); t.ownId = id; return t; }

// ---------- ennätykset ja haamut ----------
export const records = () => get(K_REC, {});
export const record = key => records()[key] || null;
// uusinta pakataan 16-bittisiksi kokonaisluvuiksi (≈ 30 kt / 90 s)
export function packReplay(rec) {
  const f = rec.frames, step = 2; // 15 kehystä/s
  const n = Math.ceil(f.length / step), a = new Int16Array(n * 8);
  for (let i = 0; i < n; i++) {
    const r = f[i * step];
    a.set([Math.round(r[0] * 20), Math.round(r[1] * 20), Math.round(r[2] * 20), Math.round(r[3] * 32767), Math.round(r[4] * 32767), Math.round(r[5] * 32767), Math.round(r[6] * 32767), Math.round(r[7] * 127)], i * 8);
  }
  const u = new Uint8Array(a.buffer); let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  return { hz: rec.hz / step, vi: rec.vi, d: btoa(s) };
}
export function unpackReplay(p) {
  const bin = atob(p.d), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const a = new Int16Array(u.buffer), frames = [];
  for (let i = 0; i < a.length; i += 8) frames.push([a[i] / 20, a[i + 1] / 20, a[i + 2] / 20, a[i + 3] / 32767, a[i + 4] / 32767, a[i + 5] / 32767, a[i + 6] / 32767, a[i + 7] / 127, 0, 0]);
  return { hz: p.hz, vi: p.vi, frames };
}
// palauttaa true, jos uusi ennätys
export function submitRecord(key, time, vi, name, rec) {
  const all = records();
  const old = all[key];
  if (old && old.time <= time) return false;
  all[key] = { time, vi, name: name || '', date: Date.now(), ghost: rec ? packReplay(rec) : null };
  if (!set(K_REC, all)) { all[key].ghost = null; set(K_REC, all); }
  return true;
}
