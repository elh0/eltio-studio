/* Player deck as a real 3D model, built to match Elliot's render.
   Units: 1 = 100 px of the render at its native 1036 x 650 size, centred on (520, 312).
   The page script owns the state (window.D); this file only draws it and sends presses back. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const X = x => (x - 520) / 100, Z = y => (y - 312) / 100;
const host = document.getElementById('deck');
const canvas = document.createElement('canvas');
canvas.className = 'gl';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(new THREE.Color('#ECE9E1'), 1); // same as the page, so the canvas edge never shows
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = .9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(canvas);

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = .55;

const camera = new THREE.PerspectiveCamera(18, 1036 / 650, 1, 100);
const deck = new THREE.Group();
scene.add(deck);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-3, 10, -2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 4, bottom: -4, near: 1, far: 20 });
sun.shadow.radius = 4;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ---------- textures drawn in canvas ---------- */
function tex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.userData.redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

/* PCB: native 91..952 x 78..541, drawn at 4 px per native px */
const PX = 4, P0 = [91, 78], PW = 861, PH = 474;
const pcbTex = tex(PW * PX, PH * PX, (g, w, h) => {
  const cx = x => (x - P0[0]) * PX, cy = y => (y - P0[1]) * PX;
  g.fillStyle = '#5E6762'; g.fillRect(0, 0, w, h);
  // faint mottling so the board isn't flat plastic
  const r = rnd(7);
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},0.008)`; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 80, 0, 7); g.fill(); }
  // traces
  g.lineCap = 'round'; g.lineJoin = 'round';
  const bundle = (pts, n, gap) => {
    for (let k = 0; k < n; k++) {
      g.strokeStyle = 'rgba(176,158,100,0.6)'; g.lineWidth = 1.5 * PX;
      g.beginPath(); pts.forEach((p, j) => g[j ? 'lineTo' : 'moveTo'](cx(p[0] + k * gap), cy(p[1] + k * gap))); g.stroke();
    }
  };
  bundle([[660, 124], [660, 180], [520, 180], [508, 192], [508, 318]], 6, 3);
  bundle([[524, 200], [640, 200], [684, 220], [684, 268]], 5, 3);
  bundle([[706, 334], [728, 360], [728, 382], [536, 382], [506, 452], [452, 520]], 6, 3);
  bundle([[742, 300], [786, 300], [800, 318], [822, 318]], 4, 3);
  bundle([[850, 130], [868, 150], [868, 380], [850, 400]], 2, 3);
  // pads, vias and small parts
  for (let k = 0; k < 520; k++) {
    const x = 95 + r() * 850, y = 82 + r() * 455;
    if (Math.hypot(x - 304, y - 320) < 98 || (x > 660 && x < 856 && y < 176)) continue;
    if (r() < .55) { g.fillStyle = 'rgba(205,190,140,.7)'; g.beginPath(); g.arc(cx(x), cy(y), (0.9 + r() * 1.1) * PX, 0, 7); g.fill(); }
    else { const v = r() < .5; g.fillStyle = '#C9C7BE'; g.fillRect(cx(x), cy(y), (v ? 2.4 : 5) * PX, (v ? 5 : 2.4) * PX); g.fillStyle = '#3A3B39'; g.fillRect(cx(x) + PX * .6, cy(y) + PX * .6, (v ? 1.2 : 3.8) * PX, (v ? 3.8 : 1.2) * PX); }
  }
  // dotted ring round the knob
  g.fillStyle = '#20211F';
  for (let k = 0; k < 34; k++) { const a = k / 34 * Math.PI * 2; g.beginPath(); g.arc(cx(127 + Math.cos(a) * 39), cy(112 + Math.sin(a) * 39), 1.3 * PX, 0, 7); g.fill(); }
  // volume scale
  g.fillStyle = '#2A2B29';
  for (let y = 182, k = 0; y <= 470; y += 11.5, k++) g.fillRect(cx(k % 4 ? 879 : 873), cy(y), (k % 4 ? 6 : 12) * PX, 1 * PX);
  g.fillRect(cx(884), cy(182), 1 * PX, (470 - 182) * PX);
  // labels
  g.fillStyle = '#1C1D1B'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 ${13.5 * PX}px "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
  [['PREV', 500, 154], ['NEXT', 599, 154], ['PLAY', 587, 541], ['INFO', 696, 541], ['LIST', 808, 541], ['VOL', 925, 124]]
    .forEach(([s, x, y]) => g.fillText(s, cx(x), cy(y)));
});

const capTex = tex(1024, 1024, (g, w) => {
  // spun aluminium: a conic sweep of light and dark around the centre, plus fine rings
  const c = g.createConicGradient(0, w / 2, w / 2);
  const st = [['#C0200F', 0], ['#D93220', .12], ['#A8180B', .27], ['#C9281A', .45], ['#DC3826', .62], ['#A5170A', .78], ['#C8291A', .9], ['#C0200F', 1]];
  st.forEach(([col, s]) => c.addColorStop(s, col));
  g.fillStyle = c; g.fillRect(0, 0, w, w);
  const r = rnd(3);
  for (let k = 0; k < 260; k++) { g.strokeStyle = `rgba(${r() < .5 ? '255,255,255' : '90,0,0'},${0.03 + r() * 0.04})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.arc(w / 2, w / 2, r() * w / 2, 0, 7); g.stroke(); }
});

function iconTex(draw) {
  return tex(512, 512, (g, w) => {
    g.fillStyle = '#B4B5B0'; g.fillRect(0, 0, w, w);
    const rg = g.createRadialGradient(w * .4, w * .35, 0, w / 2, w / 2, w * .55);
    rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(0,0,0,.08)');
    g.fillStyle = rg; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#6A6B67'; g.fillStyle = '#6A6B67'; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round';
    draw(g, w);
  });
}
const icons = {
  play: iconTex((g, w) => { g.beginPath(); g.moveTo(w * .4, w * .3); g.lineTo(w * .68, w * .5); g.lineTo(w * .4, w * .7); g.closePath(); g.stroke(); }),
  info: iconTex((g, w) => { g.beginPath(); g.arc(w * .53, w * .3, 16, 0, 7); g.fill(); g.lineWidth = 18; g.beginPath(); g.moveTo(w * .46, w * .44); g.lineTo(w * .53, w * .44); g.lineTo(w * .47, w * .68); g.quadraticCurveTo(w * .46, w * .74, w * .56, w * .7); g.stroke(); }),
  list: iconTex((g, w) => { for (let k = 0; k < 4; k++) { const y = w * (.34 + k * .11); g.beginPath(); g.arc(w * .33, y, 9, 0, 7); g.fill(); g.beginPath(); g.moveTo(w * .42, y); g.lineTo(w * .7, y); g.stroke(); } }),
  prev: iconTex((g, w) => { [.3, .5].forEach(x => { g.beginPath(); g.moveTo(w * (x + .2), w * .36); g.lineTo(w * x, w * .5); g.lineTo(w * (x + .2), w * .64); g.closePath(); g.stroke(); }); }),
  next: iconTex((g, w) => { [.3, .5].forEach(x => { g.beginPath(); g.moveTo(w * x, w * .36); g.lineTo(w * (x + .2), w * .5); g.lineTo(w * x, w * .64); g.closePath(); g.stroke(); }); })
};

/* ---------- materials ---------- */
const M = {
  acrylic: new THREE.MeshPhysicalMaterial({ color: 0xE9EAE6, roughness: .32, transmission: 1, thickness: .5, ior: 1.49, clearcoat: .6, clearcoatRoughness: .25 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xE6E6E1, roughness: .7 }),
  pcb: new THREE.MeshStandardMaterial({ map: pcbTex, roughness: .62, metalness: .05 }),
  chip: new THREE.MeshStandardMaterial({ color: 0x2C2E2D, roughness: .5 }),
  pin: new THREE.MeshStandardMaterial({ color: 0xC8C6BE, roughness: .3, metalness: .9 }),
  platter: new THREE.MeshPhysicalMaterial({ color: 0xF6F7F4, roughness: .12, transmission: .92, thickness: .35, ior: 1.49, clearcoat: 1, clearcoatRoughness: .08 }),
  rim: new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: .15, transmission: .6, thickness: .3, clearcoat: 1 }),
  cap: new THREE.MeshPhysicalMaterial({ map: capTex, color: 0xB4B4B4, emissiveMap: capTex, emissive: 0xffffff, emissiveIntensity: .3, roughness: .6, metalness: 0, specularIntensity: .35 }),
  capSide: new THREE.MeshPhysicalMaterial({ color: 0x8E180E, roughness: .4, metalness: .3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xD7D8D4, roughness: .28, metalness: .95 }),
  knob: new THREE.MeshStandardMaterial({ color: 0x8E8F8B, roughness: .5, metalness: .6 }),
  btn: new THREE.MeshStandardMaterial({ color: 0xB4B5B0, roughness: .6 }),
  collar: new THREE.MeshStandardMaterial({ color: 0x7E807C, roughness: .6 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x2E302E, roughness: .6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }),
  slot: new THREE.MeshStandardMaterial({ color: 0x151615, roughness: .6 }),
  house: new THREE.MeshStandardMaterial({ color: 0xC4C5C0, roughness: .5 })
};
const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = shade(new THREE.Mesh(g, m)); o.position.set(x, y, z); return o; };
const hit = {}; // k -> group, for presses
function tag(o, k) { o.traverse(c => { c.userData.k = k; }); return o; }

/* ---------- case ---------- */
function rrect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
const outer = rrect(9.26, 5.32, .26);
outer.holes.push(rrect(8.66, 4.74, .1));
const rimG = new THREE.ExtrudeGeometry(outer, { depth: .3, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 6, curveSegments: 24 });
rimG.rotateX(-Math.PI / 2); rimG.translate(0, -.32, 0);
deck.add(mesh(rimG, M.acrylic, 0, 0, Z(315)));
deck.add(mesh(new RoundedBoxGeometry(9.2, .2, 5.26, 4, .1), M.acrylic, 0, -.34, Z(315)));
const pcb = mesh(new THREE.BoxGeometry(8.66, .04, 4.74), [M.floor, M.floor, M.pcb, M.floor, M.floor, M.floor], X(521.5), -.02, Z(315));
pcb.castShadow = false;
deck.add(pcb);

// soft contact shadow on the page
const shadowTex = tex(512, 320, (g, w, h) => {
  g.filter = 'blur(26px)'; g.fillStyle = 'rgba(40,30,20,.55)';
  g.beginPath(); g.roundRect(60, 50, w - 120, h - 100, 30); g.fill();
}, false);
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
floorShadow.rotation.x = -Math.PI / 2; floorShadow.position.set(.25, -.46, .35);
scene.add(floorShadow);

/* ---------- chips ---------- */
function chip(x, y, w, d, pins) {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(w / 100, .06, d / 100, 2, .01), M.chip, 0, .03, 0));
  if (pins) {
    const n = Math.max(3, Math.round(d / 8)), pg = new THREE.BoxGeometry(.05, .015, .018);
    for (let k = 0; k < n; k++) {
      const z = (k / (n - 1) - .5) * (d / 100 - .06);
      g.add(mesh(pg, M.pin, -w / 200 - .02, .01, z)); g.add(mesh(pg, M.pin, w / 200 + .02, .01, z));
      if (pins === 4) { const p2 = mesh(pg, M.pin, z * w / d, .01, -d / 200 - .02); p2.rotation.y = Math.PI / 2; g.add(p2); const p3 = p2.clone(); p3.position.z *= -1; g.add(p3); }
    }
  }
  g.position.set(X(x), 0, Z(y)); deck.add(g);
}
chip(707, 296, 52, 52, 4);
[[585, 230], [585, 284], [585, 338], [832, 244], [832, 282], [832, 330], [770, 214], [845, 380], [480, 482]].forEach(([x, y]) => chip(x, y, 24, 28, 2));

/* ---------- platter and red cap ---------- */
const plat = new THREE.Group(); plat.position.set(X(304), 0, Z(320));
const disc = mesh(new THREE.CylinderGeometry(2.13, 2.13, .09, 160), M.platter, 0, .18, 0);
plat.add(disc);
const lip = mesh(new THREE.TorusGeometry(2.1, .03, 12, 160), M.rim, 0, .22, 0); lip.rotation.x = Math.PI / 2; plat.add(lip);
const spinner = new THREE.Group(); plat.add(spinner);
const capG = new THREE.CylinderGeometry(.96, .97, .15, 128);
spinner.add(mesh(capG, [M.capSide, M.cap, M.capSide], 0, .3, 0));
const bev = mesh(new THREE.TorusGeometry(.955, .018, 10, 128), M.capSide, 0, .375, 0); bev.rotation.x = Math.PI / 2; spinner.add(bev);
spinner.add(mesh(new THREE.CylinderGeometry(.065, .065, .1, 32), M.steel, 0, .41, 0));
spinner.add(mesh(new THREE.SphereGeometry(.065, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel, 0, .46, 0));
tag(plat, 'disc'); deck.add(plat);

/* ---------- knob ---------- */
const knob = new THREE.Group(); knob.position.set(X(127), 0, Z(112));
const kg = new THREE.CylinderGeometry(.27, .28, .26, 120, 1);
{ const p = kg.attributes.position, v = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const r = Math.hypot(v.x, v.z); if (r > .2) { const a = Math.atan2(v.z, v.x), f = 1 + .018 * Math.sign(Math.sin(a * 60)); p.setXYZ(k, v.x * f, v.y, v.z * f); } }
  kg.computeVertexNormals(); }
knob.add(mesh(kg, M.knob, 0, .13, 0));
knob.add(mesh(new THREE.CylinderGeometry(.24, .26, .02, 64), M.knob, 0, .265, 0));
knob.add(mesh(new THREE.BoxGeometry(.025, .012, .17), M.ink, 0, .28, -.1));
tag(knob, 'knob'); deck.add(knob);

/* ---------- buttons ---------- */
function roundBtn(k, x, y) {
  const g = new THREE.Group(); g.position.set(X(x), 0, Z(y));
  g.add(mesh(new THREE.CylinderGeometry(.46, .47, .05, 64), M.collar, 0, .025, 0));
  const cap = new THREE.Group();
  const prof = [[0, .25], [.34, .25], [.385, .24], [.405, .215], [.41, .18], [.41, .03]].map(p => new THREE.Vector2(p[0], p[1]));
  cap.add(mesh(new THREE.LatheGeometry(prof, 72), M.btn));
  const top = new THREE.Mesh(new THREE.CircleGeometry(.345, 64), new THREE.MeshStandardMaterial({ map: icons[k], roughness: .55 }));
  top.rotation.x = -Math.PI / 2; top.position.y = .2505; top.receiveShadow = true; cap.add(top);
  g.add(cap); hit[k] = cap; tag(g, k); deck.add(g);
}
roundBtn('play', 587, 484); roundBtn('info', 696, 483); roundBtn('list', 808, 483);
function squareBtn(k, x, y) {
  const g = new THREE.Group(); g.position.set(X(x), 0, Z(y));
  g.add(mesh(new RoundedBoxGeometry(.84, .05, .66, 3, .06), M.collar, 0, .025, 0));
  const cap = new THREE.Group();
  cap.add(mesh(new RoundedBoxGeometry(.76, .22, .58, 5, .07), M.btn, 0, .13, 0));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(.6, .44), new THREE.MeshStandardMaterial({ map: icons[k], roughness: .55 }));
  top.rotation.x = -Math.PI / 2; top.position.y = .2405; top.receiveShadow = true; cap.add(top);
  g.add(cap); hit[k] = cap; tag(g, k); deck.add(g);
}
squareBtn('prev', 500, 110); squareBtn('next', 599, 110);

/* ---------- screen ---------- */
const scrC = document.createElement('canvas'); scrC.width = 1024; scrC.height = 480;
const scrT = new THREE.CanvasTexture(scrC); scrT.colorSpace = THREE.SRGBColorSpace; scrT.anisotropy = 8;
deck.add(mesh(new RoundedBoxGeometry(1.9, .1, .98, 3, .03), M.ink, X(761), .05, Z(126)));
deck.add(mesh(new THREE.BoxGeometry(1.8, .03, .88), M.glass, X(761), .1, Z(126)));
const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.62, .76), new THREE.MeshBasicMaterial({ map: scrT, transparent: true, toneMapped: false }));
scr.rotation.x = -Math.PI / 2; scr.position.set(X(761), .1155, Z(128)); deck.add(scr);
let lastLines = '';
function drawScreen(lines) {
  const s = lines.join('|'); if (s === lastLines) return; lastLines = s;
  const g = scrC.getContext('2d'); g.clearRect(0, 0, 1024, 480);
  g.fillStyle = '#F2F2EE'; g.font = '400 96px "DM Mono", ui-monospace, Menlo, monospace'; g.textBaseline = 'alphabetic';
  [13.5, 29.5, 45.5, 67.5].forEach((y, k) => g.fillText((lines[k] || '').toUpperCase().slice(0, 17), 6, y * 6.32));
  scrT.needsUpdate = true;
}

/* ---------- volume ---------- */
const vol = new THREE.Group(); vol.position.set(X(924), 0, Z(321));
vol.add(mesh(new RoundedBoxGeometry(.62, .1, 3.64, 3, .05), M.house, 0, .05, 0));
vol.add(mesh(new THREE.BoxGeometry(.05, .02, 3.1), M.slot, 0, .1, 0));
const fader = new THREE.Group();
fader.add(mesh(new RoundedBoxGeometry(.52, .2, .34, 4, .05), M.btn, 0, .2, 0));
fader.add(mesh(new THREE.BoxGeometry(.44, .005, .025), M.ink, 0, .302, 0));
vol.add(fader); tag(vol, 'vol'); deck.add(vol);
const FZ = [Z(178) - Z(321), Z(464) - Z(321)];

/* ---------- lights and screws ---------- */
function glowTex(rgb) {
  return tex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(.25, `rgba(${rgb},.55)`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, w, w); });
}
function led(x, y, col, rgb) {
  const g = new THREE.Group(); g.position.set(X(x), 0, Z(y));
  const m = new THREE.MeshStandardMaterial({ color: 0x9A9C98, emissive: col, emissiveIntensity: 0, roughness: .3 });
  g.add(mesh(new THREE.SphereGeometry(.055, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m));
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  sp.scale.set(.9, .9, 1); sp.position.y = .06; g.add(sp); deck.add(g);
  return { m, sp };
}
const leds = { play: led(587, 420, 0x45F25F, '90,255,110'), info: led(696, 420, 0xFF9C2E, '255,160,60'), list: led(808, 420, 0xFF9C2E, '255,160,60') };
[[104, 94], [936, 94], [104, 536], [936, 536]].forEach(([x, y]) => {
  const s = mesh(new THREE.CylinderGeometry(.1, .1, .04, 40), M.steel, X(x), .02, Z(y)); deck.add(s);
  const c = mesh(new THREE.BoxGeometry(.13, .01, .022), M.ink, X(x), .041, Z(y)); c.rotation.y = .6; deck.add(c);
});

/* ---------- camera fit ---------- */
const TILT = THREE.MathUtils.degToRad(11);
function fit() {
  const r = host.getBoundingClientRect(); if (!r.width) return;
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  const W = 10.0, d = W / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  camera.position.set(0, d * Math.cos(TILT), d * Math.sin(TILT));
  camera.lookAt(0, -.15, .05);
  camera.updateProjectionMatrix();
}
new ResizeObserver(fit).observe(host); fit();

/* ---------- input ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObject(deck, true).find(i => i.object.userData.k);
  return h ? h.object.userData.k : null;
}
function screenOf(obj) {
  const v = new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera);
  const r = canvas.getBoundingClientRect();
  return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
}
const press = {}; let drag = null, a0 = 0, tilt = [0, 0], tiltT = [0, 0];
canvas.addEventListener('pointerdown', e => {
  const k = pick(e); if (!k) return;
  e.preventDefault(); canvas.setPointerCapture(e.pointerId);
  if (k === 'disc') { const c = screenOf(plat); a0 = Math.atan2(e.clientY - c[1], e.clientX - c[0]); drag = 'disc'; window.D.grab(true); return; }
  if (k === 'vol') { drag = 'vol'; volAt(e); return; }
  drag = k; press[k] = 1;
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); tiltT = [(e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5]; }
  if (!drag) { canvas.style.cursor = pick(e) ? (pick(e) === 'disc' ? 'grab' : 'pointer') : ''; return; }
  if (drag === 'disc') {
    const c = screenOf(plat), a = Math.atan2(e.clientY - c[1], e.clientX - c[0]); let da = a - a0;
    if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; a0 = a; window.D.scrub(da);
  }
  if (drag === 'vol') volAt(e);
});
function volAt(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const p = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.2), p);
  const z = p.z - vol.position.z; window.D.vol(1 - (z - FZ[0]) / (FZ[1] - FZ[0]));
}
function up(e) {
  if (drag && drag !== 'disc' && drag !== 'vol') { press[drag] = 0; if (pick(e) === drag) window.D.act(drag); }
  if (drag === 'disc') window.D.grab(false);
  drag = null;
}
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', () => { Object.keys(press).forEach(k => press[k] = 0); if (drag === 'disc') window.D.grab(false); drag = null; });
canvas.addEventListener('pointerleave', () => { tiltT = [0, 0]; });

/* ---------- loop ---------- */
const depth = {}; let knobA = 0, faderZ = 0, t0 = performance.now();
function loop(t) {
  const dt = Math.min(.05, (t - t0) / 1000); t0 = t;
  const s = window.D.state();
  spinner.rotation.y = -s.angle * Math.PI / 180; disc.rotation.y = spinner.rotation.y;
  knobA += (-s.knob * Math.PI / 180 - knobA) * Math.min(1, dt * 14); knob.rotation.y = knobA;
  const fz = FZ[0] + (1 - s.vol) * (FZ[1] - FZ[0]); faderZ += (fz - faderZ) * Math.min(1, dt * 20); fader.position.z = faderZ;
  Object.keys(hit).forEach(k => { depth[k] = (depth[k] || 0) + ((press[k] ? 1 : 0) - (depth[k] || 0)) * Math.min(1, dt * 30); hit[k].position.y = -.07 * depth[k]; });
  const pulse = .55 + .45 * Math.cos(t / 1000 * Math.PI / .6);
  [['play', s.playing ? pulse : 0], ['info', s.info ? 1 : 0], ['list', s.list ? 1 : 0]].forEach(([k, v]) => { leds[k].m.emissiveIntensity = v * 5; leds[k].sp.material.opacity = v; });
  drawScreen(s.lines);
  tilt[0] += (tiltT[0] - tilt[0]) * Math.min(1, dt * 4); tilt[1] += (tiltT[1] - tilt[1]) * Math.min(1, dt * 4);
  deck.rotation.set(tilt[1] * .06, 0, -tilt[0] * .05);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
const ready = document.fonts ? Promise.all([document.fonts.load('400 96px "DM Mono"'), document.fonts.load('500 54px "Inter Tight"')]).catch(() => {}) : Promise.resolve();
ready.then(() => {
  pcbTex.userData.redraw(); // the board labels need Inter Tight, so draw again once it's in
  requestAnimationFrame(t => { t0 = t; loop(t); requestAnimationFrame(() => host.classList.add('live')); });
});
