// AgriStuntti – koneiden 3D-mallit matalapolygonisista kappaleista.
// Paikallinen koordinaatisto kuten fysiikassa: x = vasen, y = ylös, z = eteen, origo = massakeskipiste.
import * as THREE from '../lib/three.module.min.js';

// mat(väri, {metal, emissive, opacity}) annetaan ulkoa (tyylin mukaan Lambert tai Standard)
export function buildVehicle(spec, color, mat, opts) {
  opts = opts || {};
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const C = new THREE.Color(color);
  const dark = '#262626', grey = '#6b6b6b', black = '#151515', glass = '#9fc4d8', steel = '#9a9a9a';
  const M = (c, o) => mat(c, o);
  const gy = -spec.cg; // maan taso levossa
  const box = (w, h, l, c, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), M(c));
    m.position.set(x, y, z); (parent || body).add(m); m.castShadow = true; return m;
  };
  const cyl = (r, len, c, x, y, z, axis, parent, seg) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), M(c));
    if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z); (parent || body).add(m); m.castShadow = true; return m;
  };
  // pyörät: ryhmä (ohjaus y-akselin ympäri) → rengas (pyöriminen x-akselin ympäri)
  const wheels = [];
  const addWheel = (w, parent) => {
    const holder = new THREE.Group();
    const tire = new THREE.Group();
    const wid = Math.max(0.18, w.r * 0.55);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, wid, 14), M(black));
    t.rotation.z = Math.PI / 2; tire.add(t);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.55, w.r * 0.55, wid + 0.02, 8), M(spec.id === 'pikkutraktori' || spec.id === 'linkku' ? '#e8c020' : steel));
    hub.rotation.z = Math.PI / 2; tire.add(hub);
    // kuviopalat näkyviin pyörimisen hahmottamiseksi
    for (let k = 0; k < 6; k++) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.03, w.r * 0.18, w.r * 0.32), M('#333'));
      const a = k / 6 * Math.PI * 2;
      lug.position.set(0, Math.sin(a) * w.r * 0.92, Math.cos(a) * w.r * 0.92); lug.rotation.x = -a;
      tire.add(lug);
    }
    tire.traverse(o => { if (o.isMesh) o.castShadow = true; });
    holder.add(tire);
    holder.position.set(w.x + Math.sign(w.x) * wid * 0.1, gy + w.r, w.z);
    (parent || body).add(holder);
    wheels.push({ holder, tire, spec: w, parent: parent || body });
  };
  const parts = {};

  switch (spec.id) {
    case 'leikkuri': {
      box(1.1, 0.35, 1.9, color, 0, gy + 0.55, 0.05);
      box(0.95, 0.38, 0.8, color, 0, gy + 0.85, 0.5);          // konepelti
      box(1.25, 0.12, 0.95, grey, 0, gy + 0.22, 0.15);          // leikkuupöytä
      box(0.5, 0.12, 0.5, dark, 0, gy + 0.85, -0.35);           // istuin
      box(0.5, 0.45, 0.1, dark, 0, gy + 1.1, -0.58);            // selkänoja
      cyl(0.03, 0.5, dark, 0, gy + 1.05, 0.1, null);            // ohjausakseli
      cyl(0.17, 0.04, dark, 0, gy + 1.3, 0.05, null);           // ratti
      box(0.6, 0.05, 0.25, '#ddd', 0, gy + 1.04, 0.88);         // valot
      break;
    }
    case 'monkija': {
      box(0.9, 0.4, 1.5, color, 0, gy + 0.7, 0);
      box(1.05, 0.12, 0.55, dark, 0, gy + 0.95, 0.65);          // etuteline
      box(1.05, 0.12, 0.6, dark, 0, gy + 0.95, -0.62);          // takateline
      box(0.42, 0.18, 0.75, black, 0, gy + 1.0, -0.05);         // satula
      cyl(0.025, 0.85, steel, 0, gy + 1.22, 0.42, 'x');         // ohjaustanko
      box(0.75, 0.25, 0.35, color, 0, gy + 0.9, 0.62);          // etulokasuojat
      box(0.5, 0.06, 0.2, '#ffe9a0', 0, gy + 0.9, 0.82, null);
      break;
    }
    case 'pikkutraktori': {
      box(0.7, 0.75, 1.5, color, 0, gy + 1.05, 0.75);           // konepelti
      box(0.75, 0.1, 1.6, dark, 0, gy + 0.62, 0.6);             // runko
      box(1.2, 0.2, 0.9, color, 0, gy + 0.95, -0.7);            // lokasuojat
      box(0.55, 0.1, 0.55, dark, 0, gy + 1.15, -0.65);          // istuin
      for (const sx of [-1, 1]) cyl(0.04, 1.4, dark, sx * 0.6, gy + 1.75, -0.95, null); // turvakaari
      box(1.25, 0.08, 0.15, dark, 0, gy + 2.45, -0.95);
      cyl(0.06, 0.8, '#333', 0.25, gy + 1.75, 1.15, null);      // pakoputki
      box(0.72, 0.5, 0.06, '#ccc', 0, gy + 1.05, 1.52);         // säleikkö
      break;
    }
    case 'kurottaja': {
      box(1.7, 0.6, 4.2, color, 0, gy + 1.0, 0);                // runko
      box(0.85, 1.35, 1.3, color, 0.55, gy + 1.95, -0.2);       // ohjaamo vasemmalla
      box(0.75, 0.85, 1.05, glass, 0.55, gy + 2.1, -0.2);
      box(0.9, 0.08, 1.35, dark, 0.55, gy + 2.66, -0.2);
      const boom = new THREE.Group(); boom.position.set(-0.35, gy + 1.6, -1.6); body.add(boom);
      box(0.5, 0.5, 4.6, color, 0, 0, 2.3, boom); boom.rotation.x = -0.12;
      box(1.3, 0.08, 1.2, steel, 0, -0.3, 4.9, boom);            // piikit
      box(1.3, 0.9, 0.08, steel, 0, 0.1, 4.3, boom);
      parts.boom = boom;
      break;
    }
    case 'linkku': {
      // kaksi runkopuoliskoa: etupuolisko kääntyy nivelen ympäri
      const front = new THREE.Group(), rear = new THREE.Group();
      front.position.set(0, 0, 0.2); rear.position.set(0, 0, 0.2);
      body.add(front); body.add(rear);
      box(1.9, 1.2, 2.4, color, 0, gy + 1.65, 1.3, front);      // konepelti
      box(2.2, 0.35, 0.3, dark, 0, gy + 1.2, 2.6, front);       // puskuri
      box(2.3, 1.0, 2.2, color, 0, gy + 1.6, -1.3, rear);       // takarunko
      box(1.9, 1.7, 1.7, color, 0, gy + 2.95, -0.75, rear);     // ohjaamo
      box(1.95, 1.2, 1.75, glass, 0, gy + 3.05, -0.75, rear);
      box(2.05, 0.1, 1.85, '#eee', 0, gy + 3.85, -0.75, rear);
      cyl(0.09, 1.3, '#333', 0.6, gy + 2.85, 1.6, null, front); // pakoputki
      parts.front = front; parts.rear = rear;
      for (const w of spec.wheels) addWheel(w, w.z > 0 ? front : rear);
      break;
    }
    case 'puimuri': {
      box(2.6, 2.2, 5.2, color, 0, gy + 2.2, -0.6);             // runko
      box(2.4, 1.0, 3.0, color, 0, gy + 3.8, -1.2);             // viljasäiliö
      box(1.6, 1.4, 1.6, color, 0, gy + 3.85, 1.25);            // ohjaamo
      box(1.65, 1.0, 1.65, glass, 0, gy + 3.95, 1.3);
      box(1.7, 0.1, 1.7, '#eee', 0, gy + 4.6, 1.25);
      const hdr = new THREE.Group(); hdr.position.set(0, gy + 0.75, 3.1); body.add(hdr);
      box(spec.header, 0.5, 1.4, '#c8b820', 0, 0, 0, hdr);       // leikkuupöytä
      box(spec.header, 0.08, 0.2, steel, 0, -0.25, 0.75, hdr);   // terä
      const reel = new THREE.Group(); reel.position.set(0, 0.85, 0.2); hdr.add(reel);
      cyl(0.08, spec.header * 0.95, dark, 0, 0, 0, 'x', reel);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; box(spec.header * 0.9, 0.06, 0.06, '#d0302a', 0, Math.sin(a) * 0.6, Math.cos(a) * 0.6, reel); }
      box(0.9, 0.9, 1.4, color, 0, gy + 1.0, 2.2);               // syöttökuilu
      const aug = cyl(0.18, 4.2, color, 1.35, gy + 4.0, -1.0, 'x'); aug.rotation.y = 0.35; // purkuputki
      parts.reel = reel;
      break;
    }
    case 'kaivinkone': {
      for (const sx of [-1, 1]) {
        box(0.65, 0.85, 5.0, black, sx * 1.15, gy + 0.45, 0);   // telat
        box(0.68, 0.12, 5.05, '#3a3a3a', sx * 1.15, gy + 0.9, 0);
      }
      box(1.8, 0.45, 3.6, dark, 0, gy + 0.85, 0);               // alavaunu
      const upper = new THREE.Group(); upper.position.set(0, gy + 1.15, 0); body.add(upper);
      box(2.6, 1.0, 3.4, color, 0, 0.55, -0.4, upper);          // ylävaunu
      box(1.0, 1.45, 1.3, color, 0.75, 1.75, 0.55, upper);       // ohjaamo
      box(0.9, 1.1, 1.2, glass, 0.75, 1.85, 0.6, upper);
      box(2.5, 0.6, 0.6, '#444', 0, 0.75, -2.0, upper);          // vastapaino
      const boom = new THREE.Group(); boom.position.set(-0.3, 0.9, 1.1); upper.add(boom);
      box(0.45, 0.55, 3.4, color, 0, 0.6, 1.5, boom); boom.rotation.x = -0.55;
      const stick = new THREE.Group(); stick.position.set(0, 0.9, 3.1); boom.add(stick);
      box(0.35, 0.4, 2.3, color, 0, -0.6, 0.6, stick); stick.rotation.x = 1.5;
      box(1.0, 0.7, 0.7, '#444', 0, -1.5, 1.1, stick);           // kauha
      parts.upper = upper; parts.boom = boom;
      break;
    }
  }
  if (spec.id !== 'linkku' && !spec.tracked) for (const w of spec.wheels) addWheel(w);
  if (spec.tracked) for (const w of spec.wheels) wheels.push({ holder: null, tire: null, spec: w });
  // pakokaasun / pölyn lähtökohta
  g.userData = { wheels, parts, spec };
  if (opts.ghost) g.traverse(o => { if (o.isMesh) { o.material = mat(color, { opacity: 0.35 }); o.castShadow = false; } });
  return g;
}

// päivitetään pyörät ja liikkuvat osat (car = fysiikan tila tai uusinnan kehys)
export function poseVehicle(g, st, dt) {
  const ud = g.userData, spec = ud.spec;
  const steer = st.steerAng != null ? st.steerAng : (st.steer || 0) * spec.steer * 0.5;
  ud.wheels.forEach((w, i) => {
    if (!w.holder) return;
    const pw = st.wheels && st.wheels[i];
    const len = pw ? pw.len : 0;
    // pyörän keskipiste: kiinnityspiste − jousen pituus (levossa jousi on lähes pituudessaan)
    const base = -spec.cg + w.spec.r;
    w.holder.position.y = pw ? base + (spec.susp * 0.68 - len) : base;
    if (spec.articulated) w.holder.rotation.y = 0;
    else w.holder.rotation.y = w.spec.steer ? steer * w.spec.steer : 0;
    w.tire.rotation.x = pw ? pw.spin : (w.tire.rotation.x + (st.vf || 0) / w.spec.r * dt);
  });
  if (spec.articulated && ud.parts.front) {
    ud.parts.front.rotation.y = steer * 0.9;
    ud.parts.rear.rotation.y = -steer * 0.9;
  }
  if (ud.parts.reel) ud.parts.reel.rotation.x += dt * 4;
}
