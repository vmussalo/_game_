// AgriStuntti – 3D-näkymä (three.js): kaksi tyyliä, rata, maasto, taivas, maisema, koneet ja kamerat.
//   Retro: kulmikas (flat shading), matala resoluutio pikseleinä, ei varjoja, rajattu väripaletti.
//   Moderni: täysi resoluutio, varjot, sumu, sävytys ja pehmeämpi valaistus.
import * as THREE from '../lib/three.module.min.js';
import { TILE as T, GRID, TERRAIN, PROPS, VEHICLES, ROAD_T } from './data.js';
import { buildVehicle, poseVehicle } from './models.js';
import { PIECE_BY_ID } from './pieces.js';

const S = { renderer: null, scene: null, camera: null, style: 'moderni', world: null, cars: new Map(), camMode: 0, sun: null, tvCams: [], camQ: null, camPos: null, t: 0 };
export const CAM_MODES = ['Takaa', 'Kaukaa', 'Konepelti', 'TV-kamerat', 'Ylhäältä'];

let matCache = new Map();
function mat(color, o) {
  o = o || {};
  const key = S.style + color + (o.opacity || '') + (o.vc ? 'vc' : '') + (o.emissive || '');
  if (matCache.has(key)) return matCache.get(key);
  const p = { color: o.vc ? 0xffffff : color, vertexColors: !!o.vc };
  if (o.opacity) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = false; }
  if (o.emissive) p.emissive = new THREE.Color(o.emissive);
  const m = S.style === 'retro' ? new THREE.MeshLambertMaterial(Object.assign(p, { flatShading: true }))
    : new THREE.MeshStandardMaterial(Object.assign(p, { roughness: o.rough != null ? o.rough : 0.82, metalness: o.metal || 0.05 }));
  matCache.set(key, m);
  return m;
}

export function init(canvas) {
  S.canvas = canvas;
  S.camera = new THREE.PerspectiveCamera(62, 1, 0.3, 5000);
  S.camQ = new THREE.Quaternion(); S.camPos = new THREE.Vector3();
  window.addEventListener('resize', resize);
}

export function setStyle(style) {
  S.style = style === 'retro' ? 'retro' : 'moderni';
  // renderöijä luodaan uudelleen (antialias ei vaihdu lennossa)
  if (S.renderer) S.renderer.dispose();
  const retro = S.style === 'retro';
  S.renderer = new THREE.WebGLRenderer({ canvas: S.canvas, antialias: !retro, powerPreference: 'high-performance' });
  S.renderer.shadowMap.enabled = !retro;
  S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  S.renderer.toneMapping = retro ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  S.renderer.toneMappingExposure = 1.05;
  S.renderer.outputColorSpace = THREE.SRGBColorSpace;
  S.canvas.style.imageRendering = retro ? 'pixelated' : 'auto';
  matCache = new Map();
  resize();
  if (S.world) buildScene(S.world);
}

function resize() {
  if (!S.renderer) return;
  const w = S.canvas.clientWidth || innerWidth, h = S.canvas.clientHeight || innerHeight;
  // retro: n. 270 pikselin korkuinen kuva skaalattuna (pikselöity)
  const pr = S.style === 'retro' ? Math.min(1, 360 / h) : Math.min(2, devicePixelRatio || 1);
  S.renderer.setPixelRatio(pr);
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
}

// ---------- maailma ----------
export function buildScene(world) {
  S.world = world;
  const retro = S.style === 'retro';
  const scene = new THREE.Scene();
  S.scene = scene;
  S.cars.forEach(c => { c.obj = null; });
  // valot
  const hemi = new THREE.HemisphereLight(retro ? 0xd8e8ff : 0xcfe3ff, retro ? 0x6a7a40 : 0x5a6a3a, retro ? 1.1 : 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, retro ? 1.4 : 2.4);
  sun.position.set(220, 380, 140);
  if (!retro) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera; c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.near = 10; c.far = 900;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  }
  scene.add(sun); scene.add(sun.target);
  S.sun = sun;
  // taivas ja sumu
  scene.background = new THREE.Color(retro ? 0x6fa8dc : 0x9cc7ea);
  if (!retro) scene.fog = new THREE.Fog(0xb9d4ea, 350, 1700);
  else scene.fog = new THREE.Fog(0x8fbde4, 500, 1600);
  scene.add(sky(retro));
  scene.add(hills(retro));
  // maa
  scene.add(ground(world, retro));
  // rata
  scene.add(trackMesh(world));
  // maisemaesineet, pylväät, lähtöportti
  scene.add(props(world));
  scene.add(decor(world));
  // TV-kamerat reitin varrelle
  S.tvCams = [];
  const sm = world.samples;
  for (let k = 0; k < sm.length; k += 14) {
    const s = sm[k];
    const lx = s.uy * s.fz - s.uz * s.fy, lz = s.ux * s.fy - s.uy * s.fx;
    const side = (k / 14) % 2 ? 1 : -1;
    S.tvCams.push(new THREE.Vector3(s.x + lx * 22 * side, Math.max(6, s.y + 7 + (k % 3) * 3), s.z + lz * 22 * side));
  }
}

function sky(retro) {
  const geo = new THREE.SphereGeometry(3500, retro ? 8 : 24, retro ? 6 : 16);
  const top = new THREE.Color(retro ? 0x3a78c8 : 0x4f8fd6), mid = new THREE.Color(retro ? 0x8cc0ec : 0xbcdaf2), bot = new THREE.Color(retro ? 0xc8dcc0 : 0xe6eef0);
  const col = [];
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 3500;
    const c = y > 0.15 ? mid.clone().lerp(top, Math.min(1, (y - 0.15) / 0.6)) : bot.clone().lerp(mid, Math.max(0, (y + 0.05) / 0.2));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.position.set(GRID * T / 2, 0, GRID * T / 2);
  m.renderOrder = -10;
  return m;
}

// kaukaiset kumpareet ja metsänreuna horisontissa
function hills(retro) {
  const g = new THREE.Group();
  const cx = GRID * T / 2, cz = GRID * T / 2;
  const rnd = mulberry(7);
  const n = retro ? 24 : 48;
  const pos = [], col = [];
  const R = 1400;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    const h0 = 40 + rnd() * 110, h1 = 40 + rnd() * 110;
    const P = (a, r, h) => [cx + Math.cos(a) * r, h, cz + Math.sin(a) * r];
    const v = [P(a0, R, -2), P(a1, R, -2), P(a1, R, h1), P(a0, R, h0)];
    pos.push(...v[0], ...v[1], ...v[2], ...v[0], ...v[2], ...v[3]);
    const c = new THREE.Color(retro ? (i % 2 ? 0x3f6f3a : 0x4a7a40) : 0x4f7a55).multiplyScalar(0.8 + rnd() * 0.25);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true })));
  return g;
}

function ground(world, retro) {
  const g = new THREE.Group();
  const px = retro ? 8 : 32;
  const cv = document.createElement('canvas');
  cv.width = cv.height = GRID * px;
  const c = cv.getContext('2d');
  const rnd = mulberry(3);
  const ter = world.track.terrain;
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const t = TERRAIN[ter[j * GRID + i]] || TERRAIN[0];
    c.fillStyle = t.col; c.fillRect(i * px, j * px, px, px);
    if (!retro) {
      // pientä kuviointia: peltovaot, ruohotupsut, aallot
      for (let k = 0; k < 40; k++) {
        c.fillStyle = rnd() < 0.5 ? t.col2 : shade(t.col, rnd() * 0.16 - 0.08);
        if (t.id === 'pelto') c.fillRect(i * px, j * px + (k % 8) * px / 8, px, 1.5);
        else c.fillRect(i * px + rnd() * px, j * px + rnd() * px, 2 + rnd() * 3, 2 + rnd() * 3);
      }
    } else if ((i + j) % 2) { c.fillStyle = t.col2; c.fillRect(i * px, j * px, px, px); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (retro) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; }
  else tex.anisotropy = 4;
  const size = GRID * T;
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(size, size), S.style === 'retro'
    ? new THREE.MeshLambertMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  inner.rotation.x = -Math.PI / 2; inner.position.set(size / 2, 0, size / 2); inner.receiveShadow = true;
  // maa piirretään syvyydeltään hieman taaemmas, jottei se peitä 4 cm korkeampaa tietä loivasta kulmasta
  Object.assign(inner.material, { polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
  g.add(inner);
  // ympäröivä maa radan ulkopuolella
  const om = (retro ? new THREE.MeshLambertMaterial({ color: 0x5a9036 }) : new THREE.MeshStandardMaterial({ color: 0x5c8f3e, roughness: 1 }));
  Object.assign(om, { polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 });
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), om);
  outer.rotation.x = -Math.PI / 2; outer.position.set(size / 2, -0.05, size / 2); outer.receiveShadow = true;
  g.add(outer);
  // vesi: kiiltävä pinta vesiruutujen päälle
  const wm = S.style === 'retro' ? new THREE.MeshLambertMaterial({ color: 0x2f6fb0 }) : new THREE.MeshStandardMaterial({ color: 0x2a6aa8, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.88 });
  Object.assign(wm, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    if (!TERRAIN[ter[j * GRID + i]] || !TERRAIN[ter[j * GRID + i]].water) continue;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(T, T), wm);
    q.rotation.x = -Math.PI / 2; q.position.set((i + 0.5) * T, 0.02, (j + 0.5) * T); q.receiveShadow = true;
    g.add(q);
  }
  // radan reuna-aita
  const fence = new THREE.Group();
  const fm = mat('#7a5a38');
  for (let k = 0; k <= GRID * 4; k++) {
    const d = k * T / 4;
    for (const [x, z] of [[d, 0], [d, size], [0, d], [size, d]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.25), fm); p.position.set(x, 0.7, z); fence.add(p);
    }
  }
  for (const [x, z, w, l] of [[size / 2, 0, size, 0.12], [size / 2, size, size, 0.12], [0, size / 2, 0.12, size], [size, size / 2, 0.12, size]]) {
    for (const y of [0.6, 1.15]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, l), fm); r.position.set(x, y, z); fence.add(r); }
  }
  g.add(fence);
  return g;
}

function trackMesh(world) {
  const g = new THREE.Group();
  const pos = [], col = [];
  for (const geo of world.geos) { pos.push(...geo.pos); col.push(...geo.col); }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  bg.computeVertexNormals();
  const m = new THREE.Mesh(bg, mat('#ffffff', { vc: true }));
  m.castShadow = true; m.receiveShadow = true;
  // sama materiaali molemmin puolin silmukan sisäpintaa varten ei tarvita: pinnoilla on omat kolmionsa
  g.add(m);
  // pylväät
  const pm = mat(S.style === 'retro' ? '#9a958c' : '#a8a39a');
  for (const geo of world.geos) for (const p of geo.pillars) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, p.h, 1.6), pm);
    b.position.set(p.x, p.h / 2, p.z); b.castShadow = true; b.receiveShadow = true; g.add(b);
  }
  // lähtö- ja maaliportit
  world.track.pieces.forEach(p => {
    const def = PIECE_BY_ID[p.t];
    if (!def.deco) return;
    const cx = (p.i + 0.5) * T, cz = (p.j + 0.5) * T, y = p.l * 5;
    const arch = new THREE.Group();
    const c = def.deco === 'start' ? '#e8b818' : '#d83a2a';
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.5, 0.6), mat('#ddd')); post.position.set(s * 6.2, 3.25, 0); arch.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(13, 1.5, 0.5), mat(c)); beam.position.set(0, 6.3, 0); arch.add(beam);
    const txt = textPlane(def.deco === 'start' ? 'LÄHTÖ' : 'MAALI', c);
    txt.position.set(0, 6.3, 0.27); arch.add(txt);
    const t2 = txt.clone(); t2.position.z = -0.27; t2.rotation.y = Math.PI; arch.add(t2);
    arch.position.set(cx, y, cz);
    arch.rotation.y = p.r % 2 ? Math.PI / 2 : 0;
    arch.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(arch);
  });
  return g;
}

function textPlane(text, bg) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32;
  const c = cv.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, 256, 32);
  c.fillStyle = '#111'; c.font = '900 26px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 128, 17);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.45), new THREE.MeshBasicMaterial({ map: tex }));
}

// maisemaesineet (törmäävät) ja koristeet radan ulkopuolella (eivät törmää)
function propMesh(id, rnd) {
  const g = new THREE.Group();
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const retro = S.style === 'retro';
  switch (id) {
    case 'koivu':
      add(new THREE.CylinderGeometry(0.3, 0.45, 7, 6), '#e8e4dc', 0, 3.5, 0);
      add(new THREE.IcosahedronGeometry(3.2, retro ? 0 : 1), '#6fae3c', 0, 8.5, 0);
      add(new THREE.IcosahedronGeometry(2.4, retro ? 0 : 1), '#7cba44', 1.2, 10.5, 0.6);
      break;
    case 'kuusi':
      add(new THREE.CylinderGeometry(0.35, 0.5, 3, 6), '#5a3a22', 0, 1.5, 0);
      for (let k = 0; k < 3; k++) add(new THREE.ConeGeometry(3.4 - k * 0.9, 5, retro ? 6 : 9), k % 2 ? '#2f5f34' : '#2a5630', 0, 4.5 + k * 3.2, 0);
      break;
    case 'lato': {
      add(new THREE.BoxGeometry(14, 6, 20), '#a8322a', 0, 3, 0);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 8.6, 4, 4, 1), mat('#3a3a3a'));
      roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.42); roof.position.set(0, 8, 0); roof.castShadow = true; g.add(roof);
      add(new THREE.BoxGeometry(4.5, 4.5, 0.2), '#f0ece0', 0, 2.25, 10.05);
      add(new THREE.BoxGeometry(14.2, 0.4, 0.3), '#f0ece0', 0, 6, 10.05);
      break;
    }
    case 'siilo':
      add(new THREE.CylinderGeometry(4, 4, 16, retro ? 8 : 18), '#c8ccd0', 0, 8, 0);
      add(new THREE.ConeGeometry(4.2, 2.5, retro ? 8 : 18), '#a8acb0', 0, 17.25, 0);
      break;
    case 'paalit':
      for (let k = 0; k < 6; k++) { const m = add(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 10), '#f2f0e6', (k % 3 - 1) * 1.7 - 0.5, 0.75 + Math.floor(k / 3) * 1.4, (k % 2) * 3 - 1.5); m.rotation.z = Math.PI / 2; }
      break;
    case 'kivi':
      add(new THREE.DodecahedronGeometry(2.6, 0), '#8a8780', 0, 1.2, 0).scale.set(1, 0.6, 0.9);
      break;
    case 'tuulimylly': {
      add(new THREE.CylinderGeometry(1.4, 3, 16, 8), '#e8e0d0', 0, 8, 0);
      add(new THREE.ConeGeometry(2.2, 3, 8), '#5a3a2a', 0, 17.5, 0);
      const rot = new THREE.Group(); rot.position.set(0, 15.5, 2.4); g.add(rot);
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8, 0.15), mat('#d8d0c0')); b.position.y = 4; const h = new THREE.Group(); h.rotation.z = k * Math.PI / 2; h.add(b); rot.add(h); }
      g.userData.spin = rot;
      break;
    }
  }
  void rnd;
  return g;
}

function props(world) {
  const g = new THREE.Group();
  const rnd = mulberry(11);
  S.spinners = [];
  for (const pr of world.track.props) {
    const m = propMesh(pr.t, rnd);
    m.position.set((pr.i + 0.5) * T, 0, (pr.j + 0.5) * T);
    m.rotation.y = pr.r * Math.PI / 2;
    if (m.userData.spin) S.spinners.push(m.userData.spin);
    g.add(m);
  }
  return g;
}

function decor(world) {
  // puita radan ulkopuolelle (ei törmäystä, koska aita estää pääsyn)
  const g = new THREE.Group();
  const rnd = mulberry(5);
  const size = GRID * T;
  const n = S.style === 'retro' ? 70 : 140;
  for (let k = 0; k < n; k++) {
    const side = k % 4, d = rnd() * (size + 200) - 100, off = 25 + rnd() * 180;
    const x = side === 0 ? d : side === 1 ? d : side === 2 ? -off : size + off;
    const z = side === 0 ? -off : side === 1 ? size + off : d;
    const m = propMesh(rnd() < 0.6 ? 'kuusi' : 'koivu', rnd);
    m.position.set(x, 0, z); m.scale.setScalar(0.8 + rnd() * 0.6);
    g.add(m);
  }
  for (let k = 0; k < 4; k++) {
    const m = propMesh(k % 2 ? 'lato' : 'siilo', rnd);
    m.position.set(k < 2 ? -70 - k * 40 : size + 60, 0, size * (0.2 + k * 0.2)); g.add(m);
  }
  void world;
  return g;
}

// ---------- koneet ----------
// key = tunniste; st = { pos, q, steer/steerAng, wheels?, vf, crashed }; ghost = läpikuultava
export function setCar(key, vi, color, ghost) {
  let c = S.cars.get(key);
  if (!c) { c = { vi, color, ghost }; S.cars.set(key, c); }
  c.vi = vi; c.color = color; c.ghost = ghost;
  if (c.obj) { S.scene.remove(c.obj); c.obj = null; }
}
export function clearCars() { S.cars.forEach(c => { if (c.obj && S.scene) S.scene.remove(c.obj); }); S.cars.clear(); }

function carObj(c) {
  if (!c.obj) {
    c.obj = buildVehicle(VEHICLES[c.vi], c.color, (col, o) => mat(col, Object.assign({}, o, c.ghost ? { opacity: 0.35 } : {})), { ghost: c.ghost });
    S.scene.add(c.obj);
  }
  return c.obj;
}

// ---------- kehys ----------
// view = { follow: key, states: Map(key → st), dt, replay }
export function render(view) {
  if (!S.renderer || !S.scene) return;
  const dt = view.dt || 0;
  S.t += dt;
  for (const [key, c] of S.cars) {
    const st = view.states.get(key);
    const o = carObj(c);
    if (!st) { o.visible = false; continue; }
    o.visible = !st.hidden;
    o.position.set(st.pos[0], st.pos[1], st.pos[2]);
    o.quaternion.set(st.q[0], st.q[1], st.q[2], st.q[3]);
    poseVehicle(o, st, dt);
  }
  for (const s of S.spinners || []) s.rotation.z += dt * 0.6;
  const st = view.states.get(view.follow);
  if (st) camera(st, dt, view);
  if (S.sun && st) {
    S.sun.position.set(st.pos[0] + 220, st.pos[1] + 380, st.pos[2] + 140);
    S.sun.target.position.set(st.pos[0], st.pos[1], st.pos[2]);
  }
  S.renderer.render(S.scene, S.camera);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function camera(st, dt, view) {
  const cam = S.camera;
  const q = new THREE.Quaternion(st.q[0], st.q[1], st.q[2], st.q[3]);
  const p = V(st.pos[0], st.pos[1], st.pos[2]);
  const spec = VEHICLES[S.cars.get(view.follow).vi];
  const size = Math.max(spec.dims[0], 3);
  const k = Math.min(1, dt * 4);
  if (view.snap) { S.camQ.copy(q); }
  S.camQ.slerp(q, Math.min(1, dt * 3.2));
  const mode = CAM_MODES[S.camMode];
  if (mode === 'Takaa' || mode === 'Kaukaa') {
    const far = mode === 'Kaukaa';
    // kameran suunta seuraa konetta pehmeästi; ylösvektori koneen mukaan (silmukassa kamera kiertää mukana)
    const fwd = V(0, 0, 1).applyQuaternion(S.camQ), up = V(0, 1, 0).applyQuaternion(S.camQ);
    if (far) { fwd.y = 0; if (fwd.lengthSq() < 0.01) fwd.set(0, 0, 1); fwd.normalize(); up.set(0, 1, 0); }
    const dist = (far ? 22 : 9) + size * (far ? 1.5 : 1.1), h = (far ? 10 : 3.2) + size * 0.35;
    const want = p.clone().addScaledVector(fwd, -dist).addScaledVector(up, h);
    if (!far && want.y < 0.6) want.y = 0.6;
    if (view.snap) S.camPos.copy(want); else S.camPos.lerp(want, Math.min(1, dt * (far ? 3 : 6)));
    cam.position.copy(S.camPos);
    cam.up.copy(far ? V(0, 1, 0) : V(0, 1, 0).lerp(up, 0.85).normalize());
    cam.lookAt(p.clone().addScaledVector(up, 1.2).addScaledVector(fwd, 4));
    cam.fov = far ? 55 : 64;
  } else if (mode === 'Konepelti') {
    const top = spec.dims[2] - spec.cg + 0.3;
    const pos = p.clone().add(V(0, top, spec.dims[0] * 0.2).applyQuaternion(q));
    cam.position.copy(pos);
    cam.up.copy(V(0, 1, 0).applyQuaternion(q));
    cam.lookAt(pos.clone().add(V(0, -0.15, 10).applyQuaternion(q)));
    cam.fov = 72;
  } else if (mode === 'TV-kamerat') {
    let best = null, bd = 1e18;
    for (const c of S.tvCams) { const d = c.distanceToSquared(p); if (d < bd) { bd = d; best = c; } }
    if (best) {
      if (!S.tvCur || S.tvCur.distanceToSquared(p) > 110 * 110 || (S.tvCur !== best && bd < S.tvCur.distanceToSquared(p) * 0.4)) S.tvCur = best;
      cam.position.copy(S.tvCur); cam.up.set(0, 1, 0); cam.lookAt(p);
      cam.fov = Math.max(14, Math.min(60, 1400 / Math.max(10, Math.sqrt(S.tvCur.distanceToSquared(p)))));
    }
  } else {
    const want = p.clone().add(V(0, 70, 0.1));
    if (view.snap) S.camPos.copy(want); else S.camPos.lerp(want, k);
    cam.position.copy(S.camPos); cam.up.set(0, 0, -1); cam.lookAt(p);
    cam.fov = 60;
  }
  cam.updateProjectionMatrix();
}

export function cycleCam(d) { S.camMode = (S.camMode + (d || 1) + CAM_MODES.length) % CAM_MODES.length; S.tvCur = null; return CAM_MODES[S.camMode]; }
export function setCam(i) { S.camMode = i % CAM_MODES.length; S.tvCur = null; }
export const camName = () => CAM_MODES[S.camMode];

// valikoiden taustalla hitaasti kiertävä kamera radan yllä
export function orbit(t) {
  if (!S.renderer || !S.scene) return;
  // radan keskipiste ja koko näytteistä
  let cx = GRID * T / 2, cz = GRID * T / 2, R = 300;
  const sm = S.world && S.world.samples;
  if (sm && sm.length) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of sm) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
    cx = (x0 + x1) / 2; cz = (z0 + z1) / 2; R = Math.max(x1 - x0, z1 - z0) * 0.62 + 60;
  }
  const a = t * 0.06;
  S.camera.position.set(cx + Math.cos(a) * R, R * 0.38, cz + Math.sin(a) * R);
  S.camera.up.set(0, 1, 0); S.camera.fov = 55; S.camera.updateProjectionMatrix();
  S.camera.lookAt(cx, -R * 0.12, cz);
  for (const s of S.spinners || []) s.rotation.z += 0.01;
  S.renderer.render(S.scene, S.camera);
}

export function screenshotSize() { return [S.canvas.width, S.canvas.height]; }

// ---------- apurit ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + 255 * f)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + 255 * f)), b = Math.max(0, Math.min(255, (n & 255) + 255 * f));
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
void ROAD_T;
