'use strict';
// Builds map geometry from declarative ops (deterministic) and defines object/terrain types.
(function () {
  const U = GG.U;

  // terrain: base colour (render), walk cost
  GG.TER = {
    dirt:    { c: '#8b6c4a', cost: 1 },
    scrub:   { c: '#7c7444', cost: 1 },
    cracked: { c: '#9e7d58', cost: 1 },
    road:    { c: '#a58866', cost: 1 },
    mud:     { c: '#5c4632', cost: 2 },
    boards:  { c: '#6e4c32', cost: 1, floor: 'boards' },
    rug:     { c: '#6e2a2a', cost: 1, floor: 'rug' },
    fleshgrass: { c: '#8c5048', cost: 1 },
    flesh:   { c: '#a4525c', cost: 1.5 },
    metal:   { c: '#5a524c', cost: 1, floor: 'metal' },
    concrete:{ c: '#706a62', cost: 1, floor: 'concrete' },
    stage:   { c: '#7a2a24', cost: 1, floor: 'boards' },
    gravel:  { c: '#7e766a', cost: 1 },
    bone:    { c: '#c8bc9c', cost: 1.5 },
  };
  // walls: render colours; los false = see-through (fences, bars)
  GG.WALL = {
    plank:  { c: '#7a5434', top: '#9a7048', h: 46, los: true },
    adobe:  { c: '#a07a58', top: '#c09a74', h: 46, los: true },
    rust:   { c: '#6a4a3a', top: '#8a6650', h: 54, los: true },
    rock:   { c: '#6e6458', top: '#8e8474', h: 40, los: true },
    flesh:  { c: '#94485a', top: '#b46a78', h: 44, los: true },
    fence:  { c: '#6e5034', top: '#8a6a48', h: 18, los: false, low: true },
    bars:   { c: '#3e3a38', top: '#6a625a', h: 40, los: false, bars: true },
    canvas: { c: '#c8b8a0', top: '#e0d0b8', h: 40, los: true, stripes: '#a8302c' },
  };

  // object types: defaults
  GG.OBJT = {
    door:     { name: 'Door', block: 'closed', los: 'closed' },
    grate:    { name: 'Rusted Grate', block: 'closed', los: false },
    cagedoor: { name: 'Cage Door', block: 'closed', los: false },
    crate:    { name: 'Crate', block: true, container: true },
    barrel:   { name: 'Barrel', block: true, container: true, cover: true },
    locker:   { name: 'Footlocker', block: true, container: true },
    safe:     { name: 'Safe', block: true, container: true },
    shelf:    { name: 'Shelf', block: true, container: true, los: true },
    desk:     { name: 'Desk', block: true, container: true, cover: true },
    counter:  { name: 'Counter', block: true, cover: true },
    table:    { name: 'Table', block: true, cover: true },
    bench:    { name: 'Bench', block: true, cover: true },
    bed:      { name: 'Cot', block: true },
    wagon:    { name: 'Wagon', block: true, size: 1, los: true },
    tent:     { name: 'Tent', block: true, size: 2, los: true },
    lamp:     { name: 'Lantern Post', block: true, light: { r: 6, c: '255,190,110' } },
    campfire: { name: 'Campfire', block: true, light: { r: 8, c: '255,150,70' } },
    pump:     { name: 'Marrow Pump', block: true, size: 1, los: true },
    pipe:     { name: 'Pipe', block: true, cover: true },
    mother:   { name: 'Old Mother', block: true, size: 4, los: true },
    nest:     { name: 'Tumour Nest', block: true },
    sign:     { name: 'Sign', block: true },
    tower:    { name: 'Water Tower', block: true, size: 1, los: true },
    stalk:    { name: 'Meat-Stalk', block: true, los: true },
    rock:     { name: 'Boulder', block: true, los: true, cover: true },
    bones:    { name: 'Bones', block: false },
    trough:   { name: 'Trough', block: true, cover: true },
    poster:   { name: 'Poster', block: false },
    horns:    { name: 'Horn Rack', block: true },
    corpse:   { name: 'Remains', block: false, container: true },
  };

  GG.objBlocks = o => {
    const t = GG.OBJT[o.type] || {};
    if (o.gone) return false;
    if (t.block === 'closed') return !o.open;
    return !!t.block;
  };
  GG.objLos = o => {
    const t = GG.OBJT[o.type] || {};
    if (o.gone) return false;
    if (t.los === 'closed') return !o.open;
    return !!t.los;
  };
  GG.objCells = o => {
    const size = o.size != null ? o.size : (GG.OBJT[o.type] || {}).size || 0;
    return size ? U.area(o.at[0], o.at[1], size) : [o.at];
  };

  // ---- builder
  GG.buildGeometry = (def) => {
    const w = def.w, h = def.h, N = w * h;
    const ter = new Array(N).fill(def.base || 'dirt');
    const wall = new Array(N).fill(0);
    const exit = new Array(N).fill(0);
    const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    const set = (x, y, t) => { if (inb(x, y)) ter[y * w + x] = t; };
    const setW = (x, y, t) => { if (inb(x, y)) wall[y * w + x] = t; };
    const doors = [];
    for (const op of def.ops || []) {
      switch (op.op) {
        case 'noise':
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (op.only && !op.only.includes(ter[y * w + x])) continue;
            if (op.area && (x < op.area[0] || y < op.area[1] || x >= op.area[0] + op.area[2] || y >= op.area[1] + op.area[3])) continue;
            if (U.fbm(x / (op.scale || 6), y / (op.scale || 6), op.seed || 1) > op.thr) set(x, y, op.t);
          }
          break;
        case 'rect':
          for (let y = op.y; y < op.y + op.h; y++) for (let x = op.x; x < op.x + op.w; x++) set(x, y, op.t);
          break;
        case 'blob':
          for (const [x, y] of U.area(op.x, op.y, op.r)) if (!op.ragged || U.hash(x, y, 9) > 0.3 || U.dist(x, y, op.x, op.y) < op.r - 1) set(x, y, op.t);
          break;
        case 'road': {
          for (let i = 0; i + 1 < op.pts.length; i++) {
            const [a, b] = [op.pts[i], op.pts[i + 1]];
            for (const [x, y] of U.line(a[0], a[1], b[0], b[1])) for (const [x2, y2] of U.area(x, y, op.r || 1)) set(x2, y2, op.t);
          }
          break;
        }
        case 'room': {
          const { x, y } = op, x2 = op.x + op.w - 1, y2 = op.y + op.h - 1;
          for (let yy = y; yy <= y2; yy++) for (let xx = x; xx <= x2; xx++) {
            const edge = yy === y || yy === y2 || xx === x || xx === x2;
            if (op.floor) set(xx, yy, op.floor);
            if (edge && op.wall) setW(xx, yy, op.wall);
          }
          for (const d of op.doors || []) { setW(d[0], d[1], 0); doors.push({ at: [d[0], d[1]], type: d[2] || 'door', locked: d[3] || 0, key: d[4] || null, id: d[5] }); }
          for (const g of op.gaps || []) setW(g[0], g[1], 0);
          break;
        }
        case 'wall': {
          for (let i = 0; i + 1 < op.pts.length; i++) {
            const [a, b] = [op.pts[i], op.pts[i + 1]];
            for (const [xx, yy] of U.line(a[0], a[1], b[0], b[1])) setW(xx, yy, op.wall);
          }
          // straight columns in offset coords look tidier than hex lines
          for (const d of op.doors || []) { setW(d[0], d[1], 0); doors.push({ at: [d[0], d[1]], type: d[2] || 'door', locked: d[3] || 0, key: d[4] || null, id: d[5] }); }
          for (const g of op.gaps || []) setW(g[0], g[1], 0);
          break;
        }
        case 'col': // vertical wall in offset coords
          for (let yy = op.y1; yy <= op.y2; yy++) setW(op.x, yy, op.wall);
          for (const d of op.doors || []) { setW(d[0], d[1], 0); doors.push({ at: [d[0], d[1]], type: d[2] || 'door', locked: d[3] || 0, key: d[4] || null, id: d[5] }); }
          for (const g of op.gaps || []) setW(g[0], g[1], 0);
          break;
        case 'row':
          for (let xx = op.x1; xx <= op.x2; xx++) setW(xx, op.y, op.wall);
          for (const d of op.doors || []) { setW(d[0], d[1], 0); doors.push({ at: [d[0], d[1]], type: d[2] || 'door', locked: d[3] || 0, key: d[4] || null, id: d[5] }); }
          for (const g of op.gaps || []) setW(g[0], g[1], 0);
          break;
        case 'exit':
          for (let y = op.y; y < op.y + op.h; y++) for (let x = op.x; x < op.x + op.w; x++) if (inb(x, y)) exit[y * w + x] = op.to;
          break;
      }
    }
    return { w, h, ter, wall, exit, doors };
  };

  // scatter decorative objects deterministically
  GG.scatter = (geo, objs, type, n, area, onTer, seed, extra) => {
    const [ax, ay, aw, ah] = area || [1, 1, geo.w - 2, geo.h - 2];
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 30) {
      const x = ax + Math.floor(U.hash(tries, placed, seed) * aw), y = ay + Math.floor(U.hash(placed, tries, seed + 1) * ah);
      const i = y * geo.w + x;
      if (geo.wall[i] || geo.exit[i] || (geo.reserved && geo.reserved.has(i))) continue;
      if (onTer && !onTer.includes(geo.ter[i])) continue;
      if (objs.some(o => GG.objCells(o).some(([cx, cy]) => U.dist(cx, cy, x, y) <= 1))) continue;
      objs.push(Object.assign({ type, at: [x, y], v: Math.floor(U.hash(x, y, 77) * 4) }, extra || {}));
      placed++;
    }
  };
})();
