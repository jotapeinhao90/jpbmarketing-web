/* JPB v2 — La planta: fábrica 3D que se construye sola (plano → píxeles → planta encendida).
   Todo es geometría procedural + texturas en canvas; las pantallas muestran clientes, cifras y servicios. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// persona real: maniquí de Mixamo con esqueleto, optimizado (0,6 MB) y con zonas del cuerpo para vestirlo
let persona = null;
const cargaPersona = new GLTFLoader().loadAsync('modelos/trabajador.glb?v=1').then((g) => {
  g.scene.traverse((n) => { if (n.isSkinnedMesh) { const a = n.geometry.getAttribute('__zona'); if (a) n.geometry.setAttribute('zona', a); } });
  persona = g; return g;
}).catch(() => null);

let font3D = null;
const fuente3D = new FontLoader().loadAsync('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json').then((f) => (font3D = f)).catch(() => null);
try {
  await Promise.race([
    Promise.all([document.fonts.load('900 40px Archivo'), document.fonts.load('500 14px "JetBrains Mono"'), fuente3D]),
    new Promise((r) => setTimeout(r, 2500))
  ]);
} catch (e) { /* sin fuentes: se usa la de respaldo */ }
await Promise.race([cargaPersona, new Promise((r) => setTimeout(r, 4000))]);

const canvas = document.getElementById('fabrica');
const section = canvas.parentElement;
const hudEstado = document.getElementById('hud-estado');
const hudPct = document.getElementById('hud-pct');
const navStatus = document.getElementById('nav-status-txt');
const tip = document.getElementById('hud-tip');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
// celulares y tablets: modo liviano (sin sombras, menos luces, menos detalle, 30 fps y resolución adaptativa)
const LOW = touch || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
const small = () => innerWidth < 760;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('planta-fallback').hidden = false;
  hudEstado.textContent = 'PLANTA JPB';
  hudPct.textContent = '';
  throw e;
}
const DPR_MAX = Math.min(devicePixelRatio || 1, 2);
let DPR = DPR_MAX;
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !LOW;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = new THREE.Color(0x03050a);
scene.background = BG;
scene.fog = new THREE.Fog(0x03050a, 34, 78);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);

/* ------------------------------------------------------------------ */
/*  Efecto de construcción: shaders inyectados en todos los materiales */
/* ------------------------------------------------------------------ */
const U = { uLine: { value: 0 }, uSolid: { value: 0 }, uBlock: { value: 7 * DPR } };
const GLSL = /* glsl */`
uniform float uLine; uniform float uSolid; uniform float uBlock;
varying vec3 vBP;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float h31(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float bkey(vec3 p){ return clamp(p.y/13.0*0.34 + (p.z+18.0)/34.0*0.16 + vn(p*0.21)*0.5, 0.0, 1.0); }
`;
const VERT = /* glsl */`
  vec4 bpw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    bpw = instanceMatrix * bpw;
  #endif
  vBP = (modelMatrix * bpw).xyz;`;
const FRAG = {
  solid: /* glsl */`
  if (uSolid < 1.09) { float k = bkey(vBP); float r = h21(floor(gl_FragCoord.xy / uBlock));
    float d = uSolid - (k*0.72 + r*0.28);
    if (d < 0.0) discard;
    if (d < 0.045) gl_FragColor = vec4(vec3(0.07 + 0.30*r), 1.0); }`,
  line: /* glsl */`
  if (uSolid < 1.09) { float k = bkey(vBP); float d = uLine - k;
    if (d < 0.0) discard;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0,0.96,0.82), smoothstep(0.05, 0.0, d));
    float s = uSolid - (k*0.72 + 0.3);
    gl_FragColor.a *= 1.0 - smoothstep(0.0, 0.1, s); }`
};
function patch(mat, kind = 'solid', extra = null) {
  mat.onBeforeCompile = (sh) => {
    if (extra) extra(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vBP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + VERT);
    sh.fragmentShader = GLSL + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>' + FRAG[kind]);
  };
  mat.customProgramCacheKey = () => 'jpb-' + kind + (extra ? '-x' : '');
  return mat;
}

/* ------------------------------------------------------------------ */
/*  Texturas en canvas                                                 */
/* ------------------------------------------------------------------ */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let seed = 7;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

function texFloor() {
  const W = 2048, H = 1582, c = cv(W, H), x = c.getContext('2d');
  const X = (v) => (v + 22) / 44 * W, Z = (v) => (v + 18) / 34 * H, S = W / 44;
  x.fillStyle = '#55585e'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { // manchas
    const g = x.createRadialGradient(rnd() * W, rnd() * H, 0, rnd() * W, rnd() * H, 60 + rnd() * 260);
    g.addColorStop(0, `rgba(${rnd() < .5 ? '20,20,24' : '120,122,128'},${.05 + rnd() * .08})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < 26000; i++) { const v = rnd() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${rnd() * .06})`; x.fillRect(rnd() * W, rnd() * H, 2, 2); }
  x.strokeStyle = 'rgba(15,16,20,.5)'; x.lineWidth = 2; // juntas de dilatación
  for (let gx = -20; gx <= 20; gx += 5) { x.beginPath(); x.moveTo(X(gx), 0); x.lineTo(X(gx), H); x.stroke(); }
  for (let gz = -15; gz <= 15; gz += 5) { x.beginPath(); x.moveTo(0, Z(gz)); x.lineTo(W, Z(gz)); x.stroke(); }
  const Y = 'rgba(245,184,0,.82)';
  const line = (x1, z1, x2, z2, w = .12) => { x.strokeStyle = Y; x.lineWidth = w * S; x.beginPath(); x.moveTo(X(x1), Z(z1)); x.lineTo(X(x2), Z(z2)); x.stroke(); };
  line(-14, -3.3, 13, -3.3); line(-14, 1.3, 13, 1.3); line(-14, -3.3, -14, 1.3); line(13, -3.3, 13, 1.3); // celda de la línea
  line(-21, 2.6, 21, 2.6, .1); line(-21, 4.1, 21, 4.1, .1); // pasillo peatonal
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function texWall() {
  const c = cv(256, 256), x = c.getContext('2d');
  for (let i = 0; i < 256; i++) { const s = Math.sin(i / 256 * Math.PI * 8); const v = 34 + s * 10; x.fillStyle = `rgb(${v},${v + 4},${v + 12})`; x.fillRect(i, 0, 1, 256); }
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * .08})`; x.fillRect(rnd() * 256, rnd() * 256, 1, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texCarton() {
  const c = cv(128, 128), x = c.getContext('2d');
  x.fillStyle = '#b48a55'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(80,50,20,${rnd() * .12})`; x.fillRect(rnd() * 128, rnd() * 128, 2, 1); }
  x.fillStyle = 'rgba(210,180,120,.8)'; x.fillRect(0, 56, 128, 16);
  x.fillStyle = 'rgba(30,24,20,.6)'; x.font = '700 15px "JetBrains Mono", monospace'; x.fillText('JPB', 8, 110);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texBelt() {
  const c = cv(128, 64), x = c.getContext('2d');
  x.fillStyle = '#121418'; x.fillRect(0, 0, 128, 64);
  x.strokeStyle = '#2a2e36'; x.lineWidth = 6;
  for (let i = -64; i < 192; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 32); x.lineTo(i, 64); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texVentana() { // máscara de luz para el foco que entra por las ventanas
  const c = cv(512, 512), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) x.fillRect(70 + i * 95, 150 + j * 110, 82, 96);
  const t = new THREE.CanvasTexture(c); return t;
}
function texGrad(stops) {
  const c = cv(4, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 256, 0, 0);
  stops.forEach(([o, v]) => g.addColorStop(o, `rgb(${v},${v},${v})`)); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/*  Materiales                                                         */
/* ------------------------------------------------------------------ */
const std = (o) => patch(new THREE.MeshStandardMaterial(o));
const basic = (o) => patch(new THREE.MeshBasicMaterial(o));
const beltTex = texBelt();
const M = {
  floor: std({ map: texFloor(), color: 0x7c828e, roughness: .78, metalness: .08 }),
  wall: std({ color: 0x55607a, map: texWall(), roughness: .7, metalness: .35 }),
  ceiling: std({ color: 0x0d1018, roughness: .9 }),
  steel: std({ color: 0x3a4356, roughness: .42, metalness: .7 }),
  dark: std({ color: 0x161a24, roughness: .55, metalness: .5 }),
  yellow: std({ color: 0xf5b800, roughness: .42, metalness: .2 }),
  navy: std({ color: 0x1f3d8f, roughness: .45, metalness: .45 }),
  orange: std({ color: 0xe8742a, roughness: .45, metalness: .1 }),
  pvc: std({ color: 0xd8dce2, roughness: .35 }),
  rebar: std({ color: 0x6e5040, roughness: .55, metalness: .65 }),
  wood: std({ color: 0x8c6a42, roughness: .85 }),
  carton: std({ map: texCarton(), roughness: .9 }),
  rubber: std({ color: 0x0b0d11, roughness: .92 }),
  machine: std({ color: 0x2a3550, roughness: .5, metalness: .5 }),
  white: std({ color: 0xe6e8ec, roughness: .55 }),
  film: std({ color: 0xa9d4ea, roughness: .25, metalness: .1 }),
  belt: std({ map: beltTex, roughness: .8 }),
  glass: std({ color: 0x9cc3e0, roughness: .08, metalness: .3, transparent: true, opacity: .16, depthWrite: false }),
  window: basic({ color: 0xb8d4f0 }),
  lamp: basic({ color: 0xffe6b8 }),
  screenOff: basic({ color: 0x05070c })
};
M.window.toneMapped = false; M.lamp.toneMapped = false;
const lineMat = patch(new THREE.LineBasicMaterial({ color: 0xf5b800, transparent: true, opacity: .62, depthWrite: false }), 'line');

/* ------------------------------------------------------------------ */
/*  Constructores: estático (se fusiona) y dinámico (se anima)         */
/* ------------------------------------------------------------------ */
const statics = new Map();
const staticEdges = [];
const dynLines = [];
const mtx = (px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const at = (B, ...a) => B.clone().multiply(mtx(...a));
const I = new THREE.Matrix4();
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);

function S(geo, mat, matrix = I, edgeAngle = 30, edges = true) {
  const g = geo.index ? geo.clone() : geo.clone();
  g.applyMatrix4(matrix);
  if (!statics.has(mat)) statics.set(mat, []);
  statics.get(mat).push(g);
  if (edges) staticEdges.push(new THREE.EdgesGeometry(g, edgeAngle));
}
function D(geo, mat, parent, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, edgeAngle = 30) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px, py, pz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  if (edgeAngle !== null) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, edgeAngle), lineMat); m.add(l); dynLines.push(l); }
  parent.add(m);
  return m;
}
function grp(parent, px = 0, py = 0, pz = 0, ry = 0) { const g = new THREE.Group(); g.position.set(px, py, pz); g.rotation.y = ry; parent.add(g); return g; }

/* ------------------------------------------------------------------ */
/*  Nave                                                               */
/* ------------------------------------------------------------------ */
S(new THREE.PlaneGeometry(44, 34), M.floor, mtx(0, 0, -1, -Math.PI / 2));
S(box(44, 13, .4), M.wall, mtx(0, 6.5, -18.2));
S(box(.4, 13, 34), M.wall, mtx(-22.2, 6.5, -1));
S(box(.4, 13, 34), M.wall, mtx(22.2, 6.5, -1));
S(box(44.8, .3, 34), M.ceiling, mtx(0, 13.15, -1));
S(box(44, 1.1, .12), M.dark, mtx(0, .55, -17.95), 30, false); // zócalo
// ventanas muro izquierdo
for (const z of [-14.5, -9.5, -4.5, .5, 5.5, 10.5]) {
  S(box(.06, 3, 3.8), M.window, mtx(-21.96, 8.6, z));
  S(box(.14, 3.2, .14), M.dark, mtx(-21.9, 8.6, z - 1.95)); S(box(.14, 3.2, .14), M.dark, mtx(-21.9, 8.6, z + 1.95));
  S(box(.12, 3, .08), M.dark, mtx(-21.9, 8.6, z)); S(box(.12, .08, 3.8), M.dark, mtx(-21.9, 8.6, z));
  S(box(.16, .12, 4.1), M.dark, mtx(-21.9, 7.05, z)); S(box(.16, .12, 4.1), M.dark, mtx(-21.9, 10.15, z));
}
// lucarna muro del fondo
for (const xw of [-18, -12, -6, 0, 6, 12, 18]) {
  S(box(4.4, 1.3, .06), M.window, mtx(xw, 11.4, -17.97));
  S(box(.1, 1.4, .1), M.dark, mtx(xw, 11.4, -17.9)); S(box(4.6, .1, .12), M.dark, mtx(xw, 10.7, -17.9)); S(box(4.6, .1, .12), M.dark, mtx(xw, 12.1, -17.9));
}
// pilares en I
function pilarI(x, z, rotY = 0, h = 12.9) {
  const B = mtx(x, h / 2, z, 0, rotY, 0);
  S(box(.55, h, .06), M.steel, at(B, 0, 0, .22)); S(box(.55, h, .06), M.steel, at(B, 0, 0, -.22)); S(box(.06, h, .44), M.steel, B, 30, false);
}
for (const x of [-15, -6, 3, 12]) pilarI(x, -17.65);
for (const z of [-11, -3, 5, 13]) { pilarI(-21.65, z, Math.PI / 2); pilarI(21.65, z, Math.PI / 2); }
// cerchas de techo
for (const z of [-16, -10, -4, 2, 8, 14]) {
  S(box(44, .18, .18), M.steel, mtx(0, 10.4, z)); S(box(44, .18, .18), M.steel, mtx(0, 12.7, z));
  const n = 16, pw = 44 / n, hh = 2.3, L = Math.hypot(pw, hh), a = Math.atan2(hh, pw);
  for (let i = 0; i <= n; i++) S(box(.1, hh, .1), M.steel, mtx(-22 + i * pw, 11.55, z), 30, i % 2 === 0);
  for (let i = 0; i < n; i++) S(box(L, .08, .08), M.steel, mtx(-22 + (i + .5) * pw, 11.55, z, 0, 0, i % 2 ? a : -a));
}
for (let x = -20; x <= 20; x += 5) S(box(.12, .16, 34), M.steel, mtx(x, 12.88, -1), 30, false);
// rieles del puente grúa
S(box(.4, .5, 33.4), M.steel, mtx(-20.9, 9.6, -1)); S(box(.4, .5, 33.4), M.steel, mtx(20.9, 9.6, -1));

/* ------------------------------------------------------------------ */
/*  Mezzanine con escalera y oficina comercial                         */
/* ------------------------------------------------------------------ */
S(box(11, .3, 10), M.dark, mtx(-16.5, 4.25, -13));
S(box(11, .4, .14), M.yellow, mtx(-16.5, 4.15, -8.03), 30, true);
for (const [x, z] of [[-11.2, -8.3], [-11.2, -13], [-11.2, -17.6], [-16, -8.3]]) S(box(.26, 4.1, .26), M.steel, mtx(x, 2.05, z));
function baranda(x1, z1, x2, z2, y) {
  const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(z2 - z1, x2 - x1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  S(box(L, .06, .06), M.yellow, mtx(cx, y + 1.05, cz, 0, -a, 0)); S(box(L, .05, .05), M.steel, mtx(cx, y + .55, cz, 0, -a, 0), 30, false);
  S(box(L, .12, .02), M.steel, mtx(cx, y + .06, cz, 0, -a, 0), 30, false);
  const n = Math.max(1, Math.round(L / 1.25));
  for (let i = 0; i <= n; i++) S(box(.06, 1.05, .06), M.steel, mtx(x1 + (x2 - x1) * i / n, y + .525, z1 + (z2 - z1) * i / n));
}
baranda(-22, -8.1, -12.5, -8.1, 4.4);
baranda(-11.05, -18, -11.05, -9.4, 4.4);
// escalera
const steps = 15, rise = 4.4 / (steps + 1), run = 6.2 / (steps + 1);
for (let i = 0; i < steps; i++) S(box(1.2, .05, run + .04), M.steel, mtx(-11.8, 4.4 - (i + 1) * rise, -8 + (i + .5) * run));
{
  const L = Math.hypot(6.2, 4.4), a = Math.atan2(4.4, 6.2);
  for (const x of [-12.43, -11.17]) {
    S(box(.06, .26, L), M.dark, mtx(x, 2.2, -4.9, a, 0, 0));
    S(box(.05, .05, L), M.yellow, mtx(x - Math.sign(x + 11.8) * .02, 3.2, -4.9, a, 0, 0));
    for (let k = 0; k <= 4; k++) { const z = -8 + k * 6.2 / 4, y = 4.4 - k * 4.4 / 4; S(box(.04, 1, .04), M.steel, mtx(x, y + .5, z), 30, false); }
  }
}
// segundo piso: oficina comercial abierta (escritorios; personas y pantallas se agregan más abajo)
const OFI = []; for (const z of [-11.2, -14.7]) for (const x of [-19.9, -17, -14.1]) OFI.push([x, z]);
for (const [x, z] of OFI) {
  S(box(2.3, .05, .82), M.white, mtx(x, 5.14, z));
  for (const dx of [-1.08, 1.08]) S(box(.05, .72, .74), M.dark, mtx(x + dx, 4.76, z), 30, false);
  S(box(.06, .3, .06), M.dark, mtx(x, 5.3, z - .3), 30, false); S(box(.25, .02, .16), M.dark, mtx(x, 5.17, z - .3), 30, false);
  S(box(.45, .015, .15), M.dark, mtx(x, 5.175, z + .12), 30, false);
  S(box(.5, .07, .48), M.rubber, mtx(x, 4.88, z + .78)); S(box(.48, .55, .06), M.rubber, mtx(x, 5.25, z + 1.04), 30, false);
  S(cyl(.03, .03, .42, 8), M.steel, mtx(x, 4.63, z + .78), 40, false); S(cyl(.27, .27, .03, 5), M.dark, mtx(x, 4.43, z + .78), 40, false);
}
S(box(10.6, .02, 9.4), std({ color: 0x1a2440, roughness: .95 }), mtx(-16.6, 4.411, -13.1), 30, false); // alfombra de la oficina


/* ------------------------------------------------------------------ */
/*  Línea de producción                                                */
/* ------------------------------------------------------------------ */
const lineZ = -1, beltY = .95, beltX0 = -9, beltX1 = 8;
S(box(beltX1 - beltX0, .06, 1.05), M.belt, mtx((beltX0 + beltX1) / 2, beltY, lineZ), 30, false);
for (const s of [-1, 1]) S(box(beltX1 - beltX0, .22, .08), M.steel, mtx((beltX0 + beltX1) / 2, beltY - .05, lineZ + s * .58));
for (let x = beltX0 + .4; x <= beltX1; x += 2.1) for (const s of [-1, 1]) S(box(.08, beltY - .1, .08), M.dark, mtx(x, (beltY - .1) / 2, lineZ + s * .52));
// dosificadora (inicio)
S(box(3.2, 2.6, 2.6), M.machine, mtx(-10.6, 1.3, lineZ));
S(cyl(1.25, .32, 1.5, 4), M.steel, mtx(-10.6, 3.35, lineZ, 0, Math.PI / 4, 0));
S(box(.7, .9, .1), M.dark, mtx(-9.6, 1.5, lineZ + 1.33));
S(box(.08, .9, 1.2), M.dark, mtx(-8.98, 1.1, lineZ), 30, false);
S(box(3.24, .06, 2.64), M.yellow, mtx(-10.6, 2.62, lineZ), 30, false);
for (const [dx, dz] of [[-1.6, 1.3], [1.6, 1.3]]) S(box(.05, 2.6, .05), M.yellow, mtx(-10.6 + dx, 1.3, lineZ + dz), 30, false);
S(box(.9, .14, .02), M.lamp, mtx(-11.2, 2.1, lineZ + 1.31), 30, false);
// embaladora (fin)
S(box(3.2, 2.4, 2.8), M.machine, mtx(9.6, 1.2, lineZ));
S(box(.06, 1.1, 1.25), M.rubber, mtx(7.98, 1.25, lineZ), 30, false);
S(box(3.25, .25, 2.85), M.dark, mtx(9.6, 2.5, lineZ)); S(box(3.27, .06, 2.87), M.yellow, mtx(9.6, 2.36, lineZ), 30, false);
// palletizado detrás de cada robot
for (const px of [-6.2, .8]) {
  S(box(1.2, .14, 1.0), M.wood, mtx(px, .07, -3.7));
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) S(box(.55, .42, .48), M.carton, mtx(px - .28 + a * .56, .35 + c * .43, -3.95 + b * .5));
}


/* ------------------------------------------------------------------ */
/*  Racks con producto, portón y letrero                               */
/* ------------------------------------------------------------------ */
{
  const xs = [11, 13.9, 16.8, 19.7], zf = -15.6, zb = -16.8, lv = [2.2, 4.3, 6.4];
  for (const x of xs) for (const z of [zf, zb]) S(box(.1, 7.2, .1), M.steel, mtx(x, 3.6, z));
  for (const x of xs) for (let k = 0; k < 6; k++) S(box(.04, 1.4, .04), M.steel, mtx(x, .9 + k * 1.15, (zf + zb) / 2, k % 2 ? .7 : -.7, 0, 0), 30, false);
  for (let b = 0; b < xs.length - 1; b++) {
    const cx = (xs[b] + xs[b + 1]) / 2;
    for (const y of lv) for (const z of [zf, zb]) S(box(2.8, .14, .1), M.dark, mtx(cx, y, z));
    [.0, ...lv].forEach((y, li) => {
      for (const dx of [-.68, .68]) {
        const px = cx + dx, py = y + .09;
        S(box(1.15, .13, 1.05), M.wood, mtx(px, py + .065, (zf + zb) / 2));
        const kind = (b * 7 + li * 3 + (dx > 0 ? 1 : 0)) % 5 === 4 ? 9 : 0;
        if (kind === 0) for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) S(box(.52, .42, .48), M.carton, mtx(px - .27 + a * .54, py + .35 + c * .43, (zf + zb) / 2), 30, c === 1);
        if (kind === 1) for (const [ex, ez] of [[-.26, -.24], [.26, -.24], [-.26, .24], [.26, .24]]) S(cyl(.23, .23, .85, 16), b % 2 ? M.navy : M.white, mtx(px + ex, py + .56, (zf + zb) / 2 + ez), 40, false);
        if (kind === 2) for (let a = 0; a < 3; a++) S(cyl(.16, .16, 1.05, 12), a % 2 ? M.orange : M.pvc, mtx(px - .34 + a * .34, py + .3, (zf + zb) / 2, Math.PI / 2, 0, 0), 40, false);
        if (kind === 3) for (const [ex, ez] of [[-.27, -.24], [.27, -.24], [-.27, .24], [.27, .24]]) S(cyl(.22, .22, .5, 16), M.film, mtx(px + ex, py + .38, (zf + zb) / 2 + ez), 40, false);
      }
    });
  }
}
// portón de andén
S(box(5.4, 5.4, .1), M.steel, mtx(5.5, 2.7, -17.92));
for (let k = 0; k < 13; k++) S(box(5.2, .05, .06), M.dark, mtx(5.5, .3 + k * .4, -17.85), 30, false);
for (const dx of [-2.75, 2.75]) S(box(.22, 5.6, .22), M.yellow, mtx(5.5 + dx, 2.8, -17.85));
S(box(5.7, .4, .5), M.dark, mtx(5.5, 5.75, -17.75));

/* ------------------------------------------------------------------ */
/*  Grúa horquilla                                                     */
/* ------------------------------------------------------------------ */
{
  const B = mtx(13.6, 0, -10.6, 0, Math.PI * .92, 0);
  S(box(1.2, .9, 1.9), M.yellow, at(B, 0, .75, 0));
  S(box(1.22, .85, .5), M.dark, at(B, 0, .78, -1.05));
  S(box(.5, .5, .5), M.rubber, at(B, 0, 1.45, -.2));
  for (const [x, z] of [[-.55, .55], [.55, .55], [-.55, -.75], [.55, -.75]]) S(box(.06, 1.3, .06), M.yellow, at(B, x, 1.85, z));
  S(box(1.2, .06, 1.4), M.dark, at(B, 0, 2.52, -.1));
  for (const x of [-.42, .42]) S(box(.1, 2.6, .12), M.dark, at(B, x, 1.4, 1.05));
  S(box(1, .5, .06), M.dark, at(B, 0, .75, 1.13));
  for (const x of [-.25, .25]) S(box(.12, .05, 1.15), M.steel, at(B, x, .35, 1.7));
  for (const [x, z] of [[-.62, .65], [.62, .65], [-.62, -.75], [.62, -.75]]) S(cyl(.3, .3, .24, 16), M.rubber, at(B, x, .3, z, 0, 0, Math.PI / 2), 40);
}

/* ------------------------------------------------------------------ */
/*  Lámparas industriales                                              */
/* ------------------------------------------------------------------ */
const lampPos = [];
for (const x of [-14, -5, 4, 13]) for (const z of [-13, -5, 3]) lampPos.push([x, z]);
for (const [x, z] of lampPos) {
  S(cyl(.2, .62, .5, 18, true), M.dark, mtx(x, 9.35, z), 40);
  S(new THREE.CircleGeometry(.58, 24), M.lamp, mtx(x, 9.1, z, Math.PI / 2, 0, 0), 30, false);
  S(cyl(.015, .015, 3.4, 4), M.dark, mtx(x, 11.3, z), 60, false);
}

/* ------------------------------------------------------------------ */
/*  Fusionar estáticos                                                 */
/* ------------------------------------------------------------------ */
for (const [mat, geos] of statics) {
  const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
  const noShadow = mat === M.wall || mat === M.ceiling || mat === M.window || mat === M.lamp || mat === M.glass || mat === M.floor;
  mesh.castShadow = !noShadow; mesh.receiveShadow = mat !== M.lamp && mat !== M.window;
  scene.add(mesh);
  geos.forEach((g) => g.dispose());
}
const staticLines = new THREE.LineSegments(mergeGeometries(staticEdges, false), lineMat);
scene.add(staticLines);

/* ------------------------------------------------------------------ */
/*  Dinámicos: cajas en la cinta, robots, puente grúa, balizas         */
/* ------------------------------------------------------------------ */
const cajas = [];
const cajaGeo = box(.56, .42, .5);
function texCaja(txt, bg, ink) {
  const c = cv(256, 192), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 192);
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * .07})`; x.fillRect(rnd() * 256, rnd() * 192, 2, 1); }
  x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 84, 256, 22);
  x.fillStyle = ink; x.font = '900 46px Archivo, sans-serif'; if ('fontStretch' in x) x.fontStretch = 'expanded';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 96, 236);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
M.lead = std({ map: texCaja('LEAD', '#8a93a3', '#1b2234'), roughness: .85 });
M.venta = std({ map: texCaja('VENTA ✓', '#f5b800', '#14181f'), roughness: .6, emissive: 0x5a3e00 });
for (let i = 0; i < 9; i++) cajas.push(D(cajaGeo, M.lead, scene, beltX0 + i * 1.95, beltY + .24, lineZ));

function robot(x, z, off) {
  const base = grp(scene, x, 0, z);
  D(cyl(.5, .6, .35, 20), M.dark, base, 0, .175, 0, 0, 0, 0, 40);
  const turret = grp(base, 0, .35, 0);
  D(cyl(.38, .44, .5, 18), M.yellow, turret, 0, .25, 0, 0, 0, 0, 40);
  const shoulder = grp(turret, 0, .62, 0);
  D(cyl(.24, .24, .5, 14), M.dark, shoulder, 0, 0, 0, 0, 0, Math.PI / 2, 40);
  D(box(.32, 1.55, .36), M.yellow, shoulder, 0, .78, 0);
  const elbow = grp(shoulder, 0, 1.55, 0);
  D(cyl(.19, .19, .42, 14), M.dark, elbow, 0, 0, 0, 0, 0, Math.PI / 2, 40);
  D(box(.24, 1.25, .26), M.yellow, elbow, 0, .62, 0);
  const wrist = grp(elbow, 0, 1.25, 0);
  D(cyl(.12, .12, .22, 12), M.dark, wrist, 0, .1, 0, 0, 0, 0, 40);
  D(box(.05, .26, .14), M.steel, wrist, -.1, .32, 0); D(box(.05, .26, .14), M.steel, wrist, .1, .32, 0);
  return { turret, shoulder, elbow, wrist, off };
}
const robots = [robot(-4.2, -2.6, 0), robot(2.8, -2.6, 2.1)];

const grua = grp(scene, 0, 0, -4);
for (const s of [-1, 1]) { D(box(41.4, .6, .38), M.dark, grua, 0, 10.25, s * .62); D(box(41.4, .07, .4), M.yellow, grua, 0, 10.58, s * .62); }
for (const s of [-1, 1]) D(box(.9, .55, 2.6), M.dark, grua, s * 20.9, 10.05, 0);
const carro = grp(grua, -6, 0, 0);
D(box(1.7, .8, 1.9), M.machine, carro, 0, 11.07, 0);
for (const s of [-1, 1]) D(cyl(.025, .025, 1.1, 4), M.dark, carro, s * .18, 10.1, 0, 0, 0, 0, 60);
D(box(.56, .5, .36), M.yellow, carro, 0, 9.35, 0);
D(new THREE.TorusGeometry(.14, .04, 8, 16, Math.PI * 1.4), M.steel, carro, 0, 8.98, 0, 0, 0, Math.PI * .8, 40);

const baliza = [0xff3b30, 0xffb800, 0x30d158].map((c, i) => {
  const mat = basic({ color: c }); mat.toneMapped = false;
  const m = D(cyl(.11, .11, .2, 14), mat, scene, 10.9, 2.75 + i * .21, lineZ + 1.1, 0, 0, 0, 40);
  m.userData.c = new THREE.Color(c); return m;
});

/* ------------------------------------------------------------------ */
/*  Pantallas                                                          */
/* ------------------------------------------------------------------ */
const IMG = {};
for (const [k, src] of Object.entries({
  polimer: '/Clientes/Foto_con_polimer.webp', idini: '/Clientes/Fierros_idini_foto.webp', conflex: '/Clientes/4413EF69-A08E-4B0B-96FA-4A9EE240617A.webp',
  kem: '/Clientes/kem_barbershop_foto.webp', lPolimer: '/Clientes/Polimer_logo.webp', lIdini: '/Clientes/Fierros_idini.webp',
  lPlasti: '/Clientes/Plastiservi_logo.webp', lConflex: '/Clientes/logo-conflex-transparent.webp', lKem: '/Clientes/kem_logo.webp'
})) { const im = new Image(); im.decoding = 'async'; im.src = src; IMG[k] = im; }
const ok = (im) => im && im.complete && im.naturalWidth > 0;
const YEL = '#f5b800', INK = '#eef0f4';
function setFont(x, w, s, fam = 'Archivo', wide = true) {
  x.font = `${w} ${s}px "${fam}", ${fam === 'Archivo' ? 'sans-serif' : 'monospace'}`;
  if ('fontStretch' in x) x.fontStretch = wide ? 'expanded' : 'normal';
  if ('letterSpacing' in x) x.letterSpacing = fam === 'Archivo' ? '0px' : '1px';
}
function cover(x, im, dx, dy, dw, dh, fy = .35) {
  if (!ok(im)) { x.fillStyle = '#10141f'; x.fillRect(dx, dy, dw, dh); return; }
  const ir = im.naturalWidth / im.naturalHeight, r = dw / dh; let sw, sh, sx, sy;
  if (ir > r) { sh = im.naturalHeight; sw = sh * r; sx = (im.naturalWidth - sw) / 2; sy = 0; } else { sw = im.naturalWidth; sh = sw / r; sx = 0; sy = (im.naturalHeight - sh) * fy; }
  x.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
}
function contain(x, im, dx, dy, dw, dh) {
  if (!ok(im)) return; const s = Math.min(dw / im.naturalWidth, dh / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
  x.drawImage(im, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}
function wrap(x, text, maxW) {
  const words = text.split(' '), lines = []; let l = '';
  for (const w of words) { const t = l ? l + ' ' + w : w; if (x.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }
  if (l) lines.push(l); return lines;
}
function chip(x, text, cx, cy, s = 13) {
  setFont(x, 500, s, 'JetBrains Mono', false); const w = x.measureText(text).width + 14;
  x.fillStyle = 'rgba(238,240,244,.12)'; x.fillRect(cx, cy, w, s + 12); x.fillStyle = INK; x.fillText(text, cx + 7, cy + s + 3); return w + 6;
}

const pantallas = [];
class Pantalla {
  constructor(parent, w, h, px, slides, opts = {}) {
    this.W = px; this.H = Math.round(px * h / w);
    this.c = cv(this.W, this.H); this.x = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.mat = basic({ map: this.tex, color: 0x000000 }); this.mat.toneMapped = false; this.mat.fog = false;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    parent.add(this.mesh);
    this.slides = slides; this.dur = opts.dur || 5.5; this.off = opts.off || 0; this.led = opts.led; this.on = 0; this.delay = opts.delay || 0;
    this.mesh.userData = { pantalla: this, label: opts.label, href: opts.href };
    this.scan = this.x.createPattern((() => { const p = cv(4, this.led ? 5 : 4), q = p.getContext('2d'); q.fillStyle = this.led ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.2)'; q.fillRect(0, 0, 4, 1); if (this.led) q.fillRect(0, 0, 1, 5); return p; })(), 'repeat');
    this.fps = opts.fps || (LOW ? 8 : 20); this.acc = 1; pantallas.push(this);
  }
  update(t, dt) {
    this.acc += dt; if (this.acc < 1 / this.fps) return; this.acc = 0;
    const x = this.x, W = this.W, H = this.H, tt = t + this.off;
    const idx = Math.max(0, Math.floor(tt / this.dur)) % this.slides.length, st = Math.max(0, tt) % this.dur;
    x.save(); x.fillStyle = '#04060b'; x.fillRect(0, 0, W, H);
    this.slides[idx](x, W, H, st, tt); x.restore();
    if (st < .22 && this.slides.length > 1) { // glitch de cambio
      for (let i = 0; i < 4; i++) { const y = Math.random() * H, hh = Math.random() * H * .05, dx = (Math.random() - .5) * 18; x.drawImage(this.c, 0, y, W, hh, dx, y, W, hh); }
      x.fillStyle = 'rgba(245,184,0,.12)'; x.fillRect(0, Math.random() * H, W, H * .05);
    }
    x.fillStyle = this.scan; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    this.tex.needsUpdate = true;
  }
}

// --- diapositivas ---
const sCliente = (img, logo, logoLight, num, title, sub) => (x, W, H, st) => {
  const z = 1 + st * .012; x.save(); x.translate(W / 2, H / 2); x.scale(z, z); x.translate(-W / 2, -H / 2); cover(x, IMG[img], 0, 0, W, H); x.restore();
  const g = x.createLinearGradient(0, H * .35, 0, H); g.addColorStop(0, 'rgba(4,6,11,0)'); g.addColorStop(1, 'rgba(4,6,11,.92)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  setFont(x, 500, 13, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText(`● CLIENTE ${num} · EN PLANTA`, 18, 28);
  if (ok(IMG[logo])) { const lw = W * .24, lh = H * .15; if (logoLight) { x.fillStyle = '#f4f2ee'; x.fillRect(W - lw - 22, 12, lw + 10, lh + 8); } contain(x, IMG[logo], W - lw - 17, 16, lw, lh); }
  setFont(x, 800, Math.round(H * .085)); x.fillStyle = INK;
  const lines = wrap(x, title, W - 40); lines.forEach((l, i) => x.fillText(l, 18, H - 50 - (lines.length - 1 - i) * H * .095));
  setFont(x, 500, 13, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.75)'; x.fillText(sub, 18, H - 20);
};
const sDato = (big, small, foot) => (x, W, H, st) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(238,240,244,.06)'; for (let i = 0; i < W; i += 20) { x.beginPath(); x.moveTo(i + .5, 0); x.lineTo(i + .5, H); x.stroke(); }
  setFont(x, 500, 13, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.6)'; x.fillText('JPB · INDICADOR', 18, 28);
  setFont(x, 900, Math.round(H * .38)); x.fillStyle = YEL; const k = Math.min(1, st / .6); x.globalAlpha = k; x.fillText(big, 16, H * .62); x.globalAlpha = 1;
  setFont(x, 700, Math.round(H * .075)); x.fillStyle = INK; wrap(x, small, W - 36).forEach((l, i) => x.fillText(l, 18, H * .76 + i * H * .085));
  if (foot) { setFont(x, 500, 12, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.5)'; x.fillText(foot, 18, H - 14); }
};
const sLogos = (logos, title) => (x, W, H) => {
  x.fillStyle = '#f2f0ec'; x.fillRect(0, 0, W, H);
  const n = logos.length, cw = (W - 40) / n;
  logos.forEach((l, i) => contain(x, IMG[l], 20 + i * cw + 10, H * .18, cw - 20, H * .52));
  let fs = Math.round(H * .07); setFont(x, 800, fs); while (x.measureText(title).width > W - 40 && fs > 12) setFont(x, 800, --fs);
  x.fillStyle = '#0b1220'; x.fillText(title, 20, H - 26);
};
const chatGuion = [[0, 'Hola, necesito 200 tubos PVC 110 mm'], [1, '¡Hola! Te cotizo al tiro 🙌'], [1, '¿Retiro en planta o despacho?'], [0, 'Retiro en planta'], [1, 'Listo, cotización enviada ✓'], [1, '→ Aviso a ventas: cliente caliente']];
const sChat = (x, W, H, st, tt) => {
  x.fillStyle = '#0b141a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1f2c34'; x.fillRect(0, 0, W, 52);
  x.fillStyle = YEL; x.beginPath(); x.arc(30, 26, 15, 0, 6.283); x.fill();
  setFont(x, 800, 15); x.fillStyle = '#0b1220'; x.fillText('IA', 21, 31);
  setFont(x, 700, 17); x.fillStyle = INK; x.fillText('Agente IA · Tu fábrica', 54, 24);
  setFont(x, 500, 12, 'JetBrains Mono', false); x.fillStyle = '#30d158'; x.fillText('en línea 24/7 · responde en 2 s', 54, 42);
  const n = Math.floor((tt % 14) / 1.7) + 1; let y = 66;
  setFont(x, 600, 21, 'Archivo', false);
  chatGuion.slice(0, Math.min(n, chatGuion.length)).forEach(([bot, t]) => {
    const w = Math.min(W * .86, x.measureText(t).width + 26), bx = bot ? W - w - 14 : 14;
    x.fillStyle = bot ? '#005c4b' : '#1f2c34'; x.fillRect(bx, y, w, 40); x.fillStyle = INK; x.fillText(t, bx + 13, y + 27, w - 26); y += 48;
  });
};
const sKpi = (title, label, base, rate, foot) => (x, W, H, st, tt) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H);
  setFont(x, 500, 15, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText(title, 22, 34);
  x.fillStyle = 'rgba(238,240,244,.6)'; x.fillText(label, 22, 60);
  setFont(x, 900, Math.round(H * .3)); x.fillStyle = INK; x.fillText(String(Math.floor(base + tt * rate)), 20, H * .5);
  const n = 22, bw = (W - 44) / n;
  for (let i = 0; i < n; i++) { const v = .25 + .7 * Math.abs(Math.sin(i * 1.7 + Math.floor(tt) * .13 + i * i * .01)); x.fillStyle = i === n - 1 ? YEL : 'rgba(238,240,244,.32)'; x.fillRect(22 + i * bw, H - 26 - v * H * .3, bw - 4, v * H * .3); }
  setFont(x, 500, 13, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.55)'; x.fillText(foot, 22, H - 8);
};
const whatsGuion = [[0, '¿Tienen tubos PVC de 110 mm?'], [1, '¡Sí! ¿Cuántos necesitas? 🙌'], [0, '200, para retiro'], [1, 'Cotización: $1.240.000 + IVA'], [0, 'La apruebo 👍'], [1, '✓ Venta lista']];
const sWhats = (x, W, H, st, tt) => {
  x.fillStyle = '#efeae2'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#075e54'; x.fillRect(0, 0, W, 150);
  x.fillStyle = '#25d366'; x.beginPath(); x.arc(70, 76, 42, 0, 6.283); x.fill();
  setFont(x, 900, 34); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.fillText('IA', 70, 89); x.textAlign = 'left';
  setFont(x, 800, 38, 'Archivo', false); x.fillStyle = '#fff'; x.fillText('Agente IA', 128, 70);
  setFont(x, 500, 24, 'Archivo', false); x.fillStyle = '#d6f5e3'; x.fillText('en línea · responde al tiro', 128, 108);
  const n = Math.floor((tt % 14) / 1.8) + 1; let y = 186;
  setFont(x, 600, 34, 'Archivo', false);
  whatsGuion.slice(0, Math.min(n, whatsGuion.length)).forEach(([bot, t]) => {
    const lines = wrap(x, t, W * .7), bw = Math.min(W * .86, Math.max(...lines.map((l) => x.measureText(l).width)) + 40), bh = lines.length * 42 + 26, bx = bot ? W - bw - 22 : 22;
    x.fillStyle = bot ? '#d9fdd3' : '#ffffff'; x.beginPath(); x.roundRect ? x.roundRect(bx, y, bw, bh, 18) : x.rect(bx, y, bw, bh); x.fill();
    x.fillStyle = '#111b21'; lines.forEach((l, i) => x.fillText(l, bx + 20, y + 44 + i * 42)); y += bh + 18;
  });
  x.fillStyle = '#25d366'; x.fillRect(0, H - 110, W, 110);
  setFont(x, 900, 40); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.fillText('WHATSAPP + IA', W / 2, H - 42); x.textAlign = 'left';
};
const sGoogle = (x, W, H, st, tt) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  setFont(x, 700, 22, 'JetBrains Mono', false); x.fillStyle = '#1a73e8'; x.fillText('01 · GOOGLE ADS', 26, 40);
  x.fillStyle = '#f1f3f4'; x.beginPath(); x.roundRect ? x.roundRect(24, 60, W - 48, 64, 32) : x.rect(24, 60, W - 48, 64); x.fill();
  const q = 'tubos pvc 110 mm proveedor', n = Math.min(q.length, Math.floor((tt % 10) * 9));
  setFont(x, 500, 28, 'Archivo', false); x.fillStyle = '#202124'; x.fillText('🔍  ' + q.slice(0, n) + (Math.floor(tt * 2) % 2 ? '|' : ''), 46, 102);
  if (n >= q.length) {
    x.fillStyle = 'rgba(245,184,0,.16)'; x.fillRect(18, 144, W - 36, 150); x.fillStyle = '#f5b800'; x.fillRect(18, 144, 6, 150);
    setFont(x, 800, 20, 'Archivo', false); x.fillStyle = '#202124'; x.fillText('Patrocinado · tuempresa.cl', 40, 178);
    setFont(x, 700, 30, 'Archivo', false); x.fillStyle = '#1a0dab'; x.fillText('Tubos PVC al por mayor · Cotiza hoy', 40, 222, W - 70);
    setFont(x, 500, 22, 'Archivo', false); x.fillStyle = '#4d5156'; x.fillText('Despacho a todo Chile. Escríbenos por WhatsApp.', 40, 262, W - 70);
  }
  setFont(x, 900, 64); x.fillStyle = '#202124'; x.fillText(String(64 + Math.floor(tt * .4)), 26, H - 28);
  setFont(x, 600, 22, 'JetBrains Mono', false); x.fillStyle = '#5f6368'; x.fillText('CLICS HOY → ENTRAN A LA LÍNEA', 200, H - 40);
};
const sAds = (x, W, H, st, tt) => {
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
  setFont(x, 700, 20, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('GOOGLE ADS · CAMPAÑA INDUSTRIAL', 22, 36);
  [['CLICS', '1.284'], ['CONV.', '96'], ['COSTO/CONV.', '$8.900']].forEach(([k, v], i) => { const px = 22 + i * (W - 44) / 3; setFont(x, 500, 15, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.6)'; x.fillText(k, px, 74); setFont(x, 900, 36); x.fillStyle = INK; x.fillText(v, px, 116); });
  x.strokeStyle = YEL; x.lineWidth = 4; x.beginPath();
  for (let i = 0; i <= 20; i++) { const px = 22 + i * (W - 44) / 20, py = H - 40 - (i / 20) * (H * .38) - Math.sin(i * 1.3 + tt) * 10; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
};
const sKw = (x, W, H, st, tt) => {
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
  setFont(x, 700, 20, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('PALABRAS CLAVE QUE COMPRAN', 22, 36);
  [['tubos pvc 110 mm', 880], ['proveedor fierro construcción', 720], ['bolsas industriales precio', 590], ['cotizar perfiles metálicos', 410]].forEach(([k, v], i) => {
    const y = 66 + i * 70; setFont(x, 600, 22, 'Archivo', false); x.fillStyle = INK; x.fillText(k, 22, y + 24);
    x.fillStyle = 'rgba(238,240,244,.12)'; x.fillRect(22, y + 36, W - 44, 12); x.fillStyle = i === Math.floor(tt) % 4 ? YEL : 'rgba(238,240,244,.55)'; x.fillRect(22, y + 36, (W - 44) * v / 900, 12);
  });
};
const sWeb = (x, W, H, st, tt) => {
  x.fillStyle = '#eef0f4'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, 46); setFont(x, 800, 20, 'Archivo', false); x.fillStyle = '#fff'; x.fillText('tuempresa.cl', 18, 30);
  x.fillStyle = YEL; x.fillRect(W - 170, 10, 152, 26); setFont(x, 700, 15, 'Archivo', false); x.fillStyle = '#0b1220'; x.fillText('Cotizar ahora', W - 158, 28);
  setFont(x, 900, 34); x.fillStyle = '#0b1220'; x.fillText('Catálogo industrial', 18, 100);
  for (let i = 0; i < 4; i++) { const px = 18 + i * (W - 36) / 4; x.fillStyle = '#ffffff'; x.fillRect(px, 124, (W - 36) / 4 - 12, H - 150); x.fillStyle = '#c9ced8'; x.fillRect(px + 10, 134, (W - 36) / 4 - 32, (H - 150) * .5); }
};
const cabecera = (x, W, n, titulo) => {
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, 64);
  setFont(x, 700, 18, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText(n, 22, 26);
  setFont(x, 900, 26); x.fillStyle = INK; x.fillText(titulo, 22, 54, W - 44);
};
const sKwDet = (x, W, H, st, tt) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H); cabecera(x, W, '1 · PALABRAS CLAVE', 'Búsquedas que compran');
  const rows = [['tubos pvc 110 mm', 880], ['proveedor fierro construcción', 720], ['bolsas industriales precio', 590], ['cotizar perfiles metálicos', 410]];
  const hi = Math.floor(tt * .8) % rows.length;
  rows.forEach(([k, v], i) => {
    const y = 84 + i * 70, on = i === hi;
    x.fillStyle = on ? 'rgba(245,184,0,.14)' : 'rgba(238,240,244,.05)'; x.fillRect(16, y, W - 32, 60);
    setFont(x, 700, 22, 'Archivo', false); x.fillStyle = INK; x.fillText(k, 30, y + 26, W - 230);
    setFont(x, 600, 15, 'JetBrains Mono', false); x.fillStyle = on ? YEL : 'rgba(238,240,244,.6)'; x.fillText(v + ' búsquedas/mes', W - 200, y + 26);
    x.fillStyle = 'rgba(238,240,244,.12)'; x.fillRect(30, y + 40, W - 60, 8); x.fillStyle = on ? YEL : 'rgba(238,240,244,.5)'; x.fillRect(30, y + 40, (W - 60) * v / 900, 8);
  });
};
const sWebDet = (x, W, H, st, tt) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H); cabecera(x, W, '2 · WEB', 'Tu web, lista para cotizar');
  x.fillStyle = '#eef0f4'; x.fillRect(16, 76, W - 32, H - 92);
  x.fillStyle = '#0b1220'; x.fillRect(16, 76, W - 32, 34); setFont(x, 800, 16, 'Archivo', false); x.fillStyle = '#fff'; x.fillText('tuempresa.cl', 28, 99);
  setFont(x, 900, 24); x.fillStyle = '#0b1220'; x.fillText('Tubos PVC al por mayor', 30, 146, W - 60);
  setFont(x, 500, 15, 'Archivo', false); x.fillStyle = '#4d5156'; x.fillText('Stock inmediato · Despacho a todo Chile', 30, 170);
  const pulso = .5 + .5 * Math.sin(tt * 4);
  x.fillStyle = YEL; x.fillRect(30, 190, 200, 48); setFont(x, 800, 18, 'Archivo', false); x.fillStyle = '#0b1220'; x.fillText('Cotizar ahora →', 46, 221);
  x.strokeStyle = `rgba(245,184,0,${.6 * pulso})`; x.lineWidth = 4; x.strokeRect(26, 186, 208, 56);
  x.fillStyle = '#25d366'; x.fillRect(246, 190, 200, 48); x.fillStyle = '#fff'; x.fillText('WhatsApp', 290, 221);
  for (let i = 0; i < 3; i++) { x.fillStyle = '#ffffff'; x.fillRect(30 + i * ((W - 60) / 3), 256, (W - 60) / 3 - 12, H - 290); x.fillStyle = '#c9ced8'; x.fillRect(40 + i * ((W - 60) / 3), 266, (W - 60) / 3 - 32, 50); }
};
const sMedDet = (x, W, H, st, tt) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H); cabecera(x, W, '3 · MEDICIÓN', 'Cada contacto, medido');
  const f = [['Clics desde Google', 1284], ['Escriben por WhatsApp', 214], ['Cotizaciones', 96], ['Ventas cerradas', 31]];
  f.forEach(([k, v], i) => {
    const y = 82 + i * 62, w = (W - 60) * Math.max(.16, Math.pow(v / 1284, .45));
    x.fillStyle = i === 3 ? YEL : `rgba(238,240,244,${.85 - i * .15})`; x.fillRect(30, y, w, 46);
    setFont(x, 800, 20, 'Archivo', false); x.fillStyle = i === 3 ? '#14181f' : '#0b1220'; x.fillText(v.toLocaleString('es-CL'), 42, y + 30);
    setFont(x, 600, 16, 'Archivo', false); x.fillStyle = INK; x.fillText(k, 46 + w, y + 30, W - w - 70);
  });
  setFont(x, 700, 16, 'JetBrains Mono', false); x.fillStyle = '#25d366'; x.fillText('COSTO POR COTIZACIÓN: $8.900', 30, H - 18);
};
const sVentas = (x, W, H, st, tt) => {
  x.fillStyle = '#05080f'; x.fillRect(0, 0, W, H);
  setFont(x, 500, 18, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('03 · VENTAS', 26, 40);
  x.fillStyle = 'rgba(238,240,244,.6)'; x.fillText('CERRADAS HOY', 26, 68);
  setFont(x, 900, Math.round(H * .4)); x.fillStyle = INK; x.fillText(String(typeof ventas === 'number' ? ventas : 128), 22, H * .66);
  setFont(x, 600, 20, 'JetBrains Mono', false); x.fillStyle = '#25d366'; x.fillText('▲ +3x vs. el mes pasado', 26, H - 28);
};
// LED gigante
const ledHero = (x, W, H, st) => {
  x.fillStyle = '#04060b'; x.fillRect(0, 0, W, H);
  setFont(x, 500, 22, 'JetBrains Mono', false); x.fillStyle = 'rgba(238,240,244,.65)'; x.fillText('JPB MARKETING · AGENCIA B2B INDUSTRIAL · SANTIAGO', 48, 64);
  setFont(x, 900, 112); x.fillStyle = INK; x.fillText('TU FÁBRICA YA VENDE.', 44, 232, W - 88);
  x.fillStyle = YEL; x.fillText('HAGAMOS QUE', 44, 356, W - 88); x.fillText('VENDA MÁS.', 44, 480, W - 88);
  const sx = (st * 520) % (W + 400) - 200; const g = x.createLinearGradient(sx - 160, 0, sx + 160, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
};
const CLIENTES_ACTIVOS = [ // hasta 10: solo clientes reales con su resultado
  ['lPolimer', true, 'ETP POLIMER', 'De cero a competidor activo'],
  ['lIdini', false, 'FIERROS IDINI', '1.700 productos online'],
  ['lPlasti', true, 'PLASTISERVI', 'Cliente histórico, años juntos'],
  ['lConflex', true, 'CONFLEX', 'Empresa creada junto a JPB'],
  ['lKem', false, 'THE KEM', 'Fidelización por WhatsApp']
];
const ledClientes = (x, W, H, st, tt) => {
  x.fillStyle = '#04060b'; x.fillRect(0, 0, W, H);
  setFont(x, 600, 22, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('● CLIENTES ACTIVOS', 48, 62);
  setFont(x, 900, 46); x.fillStyle = INK; x.fillText('Empresas que ya venden más con nosotros', 46, 118, W - 92);
  const n = CLIENTES_ACTIVOS.length, cols = Math.min(5, n), filas = Math.ceil(n / cols), gap = 18;
  const cw = (W - 96 - gap * (cols - 1)) / cols, ch = (H - 170 - 30 - gap * (filas - 1)) / filas;
  CLIENTES_ACTIVOS.forEach(([logo, claro, nombre, logro], i) => {
    const c = i % cols, f = (i / cols) | 0, px = 48 + c * (cw + gap), py = 160 + f * (ch + gap);
    const on = Math.floor(tt * .7) % n === i;
    x.fillStyle = '#f4f2ee'; x.beginPath(); x.roundRect ? x.roundRect(px, py, cw, ch, 18) : x.rect(px, py, cw, ch); x.fill();
    if (on) { x.strokeStyle = YEL; x.lineWidth = 6; x.stroke(); }
    if (!claro) { x.fillStyle = '#0b1220'; x.beginPath(); x.roundRect ? x.roundRect(px + 14, py + 14, cw - 28, ch * .52, 12) : x.rect(px + 14, py + 14, cw - 28, ch * .52); x.fill(); }
    contain(x, IMG[logo], px + 26, py + 22, cw - 52, ch * .52 - 16);
    setFont(x, 800, 21, 'JetBrains Mono', false); x.fillStyle = '#0b1220'; x.fillText(nombre, px + 18, py + ch * .52 + 54, cw - 36);
    setFont(x, 600, 23, 'Archivo', false); x.fillStyle = '#3d4552'; wrap(x, logro, cw - 36).slice(0, 2).forEach((l, k) => x.fillText(l, px + 18, py + ch * .52 + 88 + k * 28));
  });
};
const ledServicios = (x, W, H) => {
  x.fillStyle = '#04060b'; x.fillRect(0, 0, W, H);
  setFont(x, 500, 22, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('● LO QUE HACEMOS', 48, 58);
  const s = ['Agente IA en WhatsApp', 'Prospección B2B', 'Automatización con IA', 'Web industrial', 'Vendedor externo', 'SEO y Google Ads'];
  s.forEach((t, i) => { const col = i % 2, row = (i / 2) | 0, px = 48 + col * (W / 2), py = 150 + row * 128;
    setFont(x, 500, 26, 'JetBrains Mono', false); x.fillStyle = YEL; x.fillText('0' + (i + 1), px, py);
    setFont(x, 800, 50); x.fillStyle = INK; x.fillText(t, px + 64, py + 4, W / 2 - 130); });
};
const ledCta = (x, W, H, st) => {
  x.fillStyle = YEL; x.fillRect(0, 0, W, H);
  setFont(x, 500, 24, 'JetBrains Mono', false); x.fillStyle = '#0b1220'; x.fillText('30 MINUTOS SIN COSTO', 48, 70);
  setFont(x, 900, 120); x.fillText('AGENDA UNA', 44, 236, W - 88); x.fillText('LLAMADA →', 44, 364, W - 88);
  setFont(x, 600, 34, 'JetBrains Mono', false); x.fillText('jpbmarketing.cl · +56 9 4484 3503', 48, 480);
};
const sOficina = (x, W, H, st, tt) => {
  x.fillStyle = '#0a0f1c'; x.fillRect(0, 0, W, H);
  setFont(x, 800, 26); x.fillStyle = INK; x.fillText('PANEL JPB', 18, 38);
  setFont(x, 500, 12, 'JetBrains Mono', false);
  ['Constructora Andes · cotizó', 'Ferretería Sur · pidió precio', 'Metalúrgica Norte · reunión', 'Agrícola Maule · sin respuesta'].forEach((t, i) => {
    x.fillStyle = i === Math.floor(tt) % 4 ? 'rgba(245,184,0,.2)' : 'rgba(238,240,244,.06)'; x.fillRect(18, 56 + i * 44, W - 36, 36);
    x.fillStyle = i === 3 ? '#ff6b5e' : '#30d158'; x.fillRect(28, 70 + i * 44, 8, 8); x.fillStyle = INK; x.fillText(t, 46, 79 + i * 44);
  });
};

const PUESTO = { x: 7.9, z: 4.4, ry: -.66 };
const puesto = grp(scene, PUESTO.x, 0, PUESTO.z, PUESTO.ry); // (sin monitores: los clientes están en la LED)
// pantalla LED gigante en el muro del fondo
const LED = { x: -3.6, y: 7.2, w: 10.4, h: 3.9 };
S(box(LED.w + .5, LED.h + .5, .3), M.dark, mtx(LED.x, LED.y, -17.2));
const ledG = grp(scene, LED.x, LED.y, -17.04);
for (const sx of [-1, 1]) S(box(.12, .12, .9), M.steel, mtx(LED.x + sx * 4.2, LED.y + 1.6, -17.6), 30, false);
const led = new Pantalla(ledG, LED.w, LED.h, 1536, [ledClientes], { led: true, fps: 2, dur: 6, label: 'Clientes · ver casos', href: '#clientes', delay: .5 });
// pantallas de las estaciones 01 y 03, montadas sobre las máquinas
for (const [kx, slides, label] of [[-10.6, [sGoogle], '01 · Google Ads'], [9.6, [sVentas], '03 · Ventas cerradas']]) {
  const g = grp(scene, kx, 3.45, lineZ + 1.05);
  D(box(2.75, 1.6, .12), M.dark, g, 0, 0, -.07);
  for (const s of [-1, 1]) D(box(.08, .9, .08), M.dark, g, s * .9, -1.15, -.25);
  new Pantalla(g, 2.6, 1.46, 768, slides, { dur: 9, label, href: '#servicios', delay: .3 });
}
// 02 · tótem del Agente IA de WhatsApp: los leads pasan por detrás y salen convertidos en ventas
const TOTEM = { x: -.7, z: lineZ + 1.2 };
{
  const g = grp(scene, TOTEM.x, 0, TOTEM.z);
  D(cyl(.45, .5, .08, 24), M.dark, g, 0, .04, 0, 0, 0, 0, 40);
  D(box(.16, .62, .1), M.steel, g, 0, .36, -.05);
  D(new RoundedBoxGeometry(1.72, 3.05, .14, 4, .14), M.dark, g, 0, 2.15, -.03);
  new Pantalla(g, 1.56, 2.85, 512, [sWhats], { label: '02 · Agente IA en WhatsApp', href: '#servicios', delay: .2 }).mesh.position.set(0, 2.15, .045);
}

/* ------------------------------------------------------------------ */
/*  Marca JPB en letras metálicas en relieve y trabajadores            */
/* ------------------------------------------------------------------ */
const pmrem = new THREE.PMREMGenerator(renderer);
const envMetal = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const metalCromo = std({ color: 0xd9dde4, metalness: 1, roughness: .22, envMap: envMetal, envMapIntensity: 1.1 });
const metalOro = std({ color: 0xf5b800, metalness: .95, roughness: .28, envMap: envMetal, envMapIntensity: 1.1 });
function letras(texto, size, mat, depth = .045) {
  if (!font3D) return null;
  const g = new TextGeometry(texto, { font: font3D, size, height: depth, curveSegments: 4, bevelEnabled: true, bevelThickness: depth * .35, bevelSize: size * .035, bevelSegments: 2 });
  g.computeBoundingBox(); const bb = g.boundingBox;
  g.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
// insignia apilada: JPB grande en metal amarillo + MARKETING cromado
function insignia(parent, px, py, pz, ry = 0, s = 1) {
  const g = grp(parent, px, py, pz, ry);
  const a = letras('JPB', .3 * s, metalOro, .06 * s), b = letras('MARKETING', .105 * s, metalCromo, .035 * s);
  if (a) { a.position.y = .1 * s; g.add(a); }
  if (b) { b.position.y = -.17 * s; g.add(b); }
  const barra = new THREE.Mesh(box(.98 * s, .018 * s, .02 * s), metalCromo); barra.position.y = -.07 * s; g.add(barra);
  return g;
}
function rotulo(parent, texto, size, px, py, pz, ry = 0) {
  const [j, ...r] = texto.split(' ');
  const g = grp(parent, px, py, pz, ry);
  const a = letras(j, size, metalOro, size * .2), b = letras(r.join(' '), size, metalCromo, size * .2);
  if (a && b) {
    a.geometry.computeBoundingBox(); b.geometry.computeBoundingBox();
    const wa = a.geometry.boundingBox.max.x * 2, wb = b.geometry.boundingBox.max.x * 2, gap = size * .45, tot = wa + gap + wb;
    a.position.x = -tot / 2 + wa / 2; b.position.x = tot / 2 - wb / 2; g.add(a, b);
  }
  return g;
}
insignia(scene, -11.15, 1.62, lineZ + 1.3);                 // dosificadora
insignia(scene, 9.95, 1.5, lineZ + 1.4, 0, 1.15);            // embaladora
rotulo(grua, 'JPB MARKETING', .3, 0, 10.25, .62 + .19);      // viga de la grúa
rotulo(grua, 'JPB MARKETING', .3, 0, 10.25, -.62 - .19, Math.PI);
{ const B = mtx(13.6, 0, -10.6, 0, Math.PI * .92, 0), p = new THREE.Vector3(0, .82, -1.31).applyMatrix4(B); insignia(scene, p.x, p.y, p.z, Math.PI * .92 + Math.PI, .8); } // contrapeso grúa horquilla

// trabajadores: figura humana con proporciones reales, articulada y con cara
const M2 = {
  pieles: [0xc6916b, 0xa06a48, 0xdcae8a, 0x8a5a3c, 0xbf8a62].map((c) => std({ color: c, roughness: .62 })),
  pant: std({ color: 0x1d2a44, roughness: .85 }), camisa: std({ color: 0x3b4252, roughness: .8 }),
  chaleco: std({ color: 0xe6d21f, roughness: .55 }), reflect: std({ color: 0xd7dde6, roughness: .18, metalness: .65 }),
  bota: std({ color: 0x33241a, roughness: .7 }), suela: std({ color: 0x0d0d0f, roughness: .9 }), guante: std({ color: 0x5d636d, roughness: .85 }),
  casco: std({ color: 0xf2f2ee, roughness: .28 }), lente: std({ color: 0x0c0f14, roughness: .1, metalness: .5 }),
  pelo: std({ color: 0x1b1511, roughness: .95 }), ojo: std({ color: 0xf4f1ea, roughness: .3 }), pupila: std({ color: 0x15100c, roughness: .2 }),
  labio: std({ color: 0x7a4637, roughness: .6 }), cinto: std({ color: 0x2a1c12, roughness: .6 }), hebilla: std({ color: 0xc9ccd2, metalness: .9, roughness: .3 }),
  chaqueta: std({ color: 0x17223d, roughness: .75 })
};
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 12);
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
const taper = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 16);
const sph = (r, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);
const torsoGeo = (k = 1) => new THREE.LatheGeometry([[0, 0], [.15, 0], [.162, .06], [.168, .18], [.185, .3], [.198, .4], [.19, .46], [.15, .51], [.06, .54], [0, .545]].map(([r, y]) => new THREE.Vector2(r * k, y)), 24);
let pielN = 0;
function trabajador(parent, px, pz, ry, opts = {}) {
  const g = grp(parent, px, opts.y || 0, pz, ry), E = LOW ? null : 89, cara = !LOW || opts.jefe;
  const piel = M2.pieles[pielN++ % M2.pieles.length];
  const camisa = opts.oficina ? opts.chaleco : opts.jefe ? M2.chaqueta : M2.camisa;
  const mano = opts.oficina ? piel : M2.guante;
  const pierna = (x) => {
    const hip = grp(g, x, .93, 0);
    D(taper(.086, .064, .45), M2.pant, hip, 0, -.225, 0, 0, 0, 0, E);
    const knee = grp(hip, 0, -.45, 0);
    D(sph(.064), M2.pant, knee, 0, 0, 0, 0, 0, 0, E);
    D(taper(.06, .045, .42), M2.pant, knee, 0, -.21, 0, 0, 0, 0, E);
    D(rbox(.12, .1, .27, .04), M2.bota, knee, 0, -.43, .045, 0, 0, 0, E);
    D(box(.128, .025, .285), M2.suela, knee, 0, -.485, .045, 0, 0, 0, E);
    return { hip, knee };
  };
  const L = pierna(-.098), R = pierna(.098);
  D(rbox(.32, .17, .21, .07), M2.pant, g, 0, .97, 0, 0, 0, 0, E);                                   // cadera
  const pecho = grp(g, 0, 1.02, 0);
  D(torsoGeo(), camisa, pecho, 0, 0, 0, 0, 0, 0, E).scale.set(1, 1, .62);                             // torso
  D(taper(.172, .168, .045), M2.cinto, g, 0, 1.04, 0, 0, 0, 0, E).scale.set(1, 1, .64);              // cinturón
  D(box(.05, .035, .012), M2.hebilla, g, 0, 1.04, .112, 0, 0, 0, E);
  if (!opts.oficina) {
    const c = opts.jefe ? M2.reflect : (opts.chaleco || M2.chaleco);
    if (!opts.jefe) D(new THREE.LatheGeometry([[.168, .06], [.174, .18], [.19, .3], [.203, .4], [.196, .45]].map(([r, y]) => new THREE.Vector2(r, y)), 24), c, pecho, 0, 0, 0, 0, 0, 0, E).scale.set(1, 1, .66);
    for (const y of [.17, .33]) D(taper(opts.jefe ? .18 : .195, opts.jefe ? .177 : .192, .032), M2.reflect, pecho, 0, y + (opts.jefe ? -.02 : 0), 0, 0, 0, 0, E).scale.set(1, 1, .66);
    if (!opts.jefe) for (const s of [-1, 1]) { D(box(.05, .3, .012), M2.reflect, pecho, s * .07, .3, .126, 0, 0, 0, E); D(box(.07, .06, .015), opts.chaleco || M2.chaleco, pecho, s * .085, .22, .132, 0, 0, 0, E); }
  }
  D(taper(.046, .054, .1), piel, g, 0, 1.6, 0, 0, 0, 0, E);                                          // cuello
  const cab = grp(g, 0, 1.72, 0);
  D(sph(.098, 20, 16), piel, cab, 0, 0, 0, 0, 0, 0, E).scale.set(.9, 1.1, 1);                         // cráneo
  D(sph(.075, 16, 12), piel, cab, 0, -.058, .016, 0, 0, 0, E).scale.set(1, .82, 1);                  // mandíbula
  if (cara) for (const s of [-1, 1]) {
    D(sph(.024, 8, 6), piel, cab, s * .09, -.005, -.005, 0, 0, 0, E).scale.set(.55, 1, .9);           // orejas
    D(sph(.013, 10, 8), M2.ojo, cab, s * .034, .014, .083, 0, 0, 0, E);                               // ojos
    D(sph(.0075, 8, 6), M2.pupila, cab, s * .034, .014, .095, 0, 0, 0, E);
    D(box(.034, .008, .01), M2.pelo, cab, s * .035, .04, .088, 0, 0, s * -.12, E);                   // cejas
  }
  if (cara) D(new THREE.ConeGeometry(.017, .048, 8), piel, cab, 0, -.012, .1, Math.PI / 2, 0, 0, E);         // nariz
  if (cara) D(box(.038, .007, .01), M2.labio, cab, 0, -.06, .086, 0, 0, 0, E);                                 // boca
  D(new THREE.SphereGeometry(.102, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), M2.pelo, cab, 0, .01, -.012, 0, 0, 0, E).scale.set(.94, 1.06, 1.02);
  if (opts.barba) D(new THREE.SphereGeometry(.074, 16, 10, 0, Math.PI * 2, Math.PI * .62, Math.PI * .38), M2.pelo, cab, 0, -.052, .018, 0, 0, 0, E).scale.set(1.02, .8, 1.04);
  if (!opts.oficina) D(rbox(.16, .03, .028, .01), M2.lente, cab, 0, .016, .094, 0, 0, 0, E);       // lentes de seguridad
  if (!opts.sinCasco) {
    const casco = opts.casco || M2.casco;
    D(new THREE.SphereGeometry(.122, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), casco, cab, 0, .045, 0, 0, 0, 0, E).scale.set(1, .92, 1.1);
    D(taper(.148, .152, .014), casco, cab, 0, .046, .014, 0, 0, 0, E).scale.set(1, 1, 1.14);
    D(rbox(.03, .045, .2, .01), casco, cab, 0, .155, 0, 0, 0, 0, E);
    if (opts.jefe) D(taper(.124, .125, .025), M.yellow, cab, 0, .07, 0, 0, 0, 0, E).scale.set(1, 1, 1.1);
  }
  const brazo = (s) => {
    const sh = grp(g, s * .2, 1.47, 0);
    D(sph(.062), opts.jefe || opts.oficina ? camisa : (opts.chaleco || M2.chaleco), sh, 0, 0, 0, 0, 0, 0, E);
    D(taper(.054, .045, .28), camisa, sh, 0, -.14, 0, 0, 0, 0, E);
    const el = grp(sh, 0, -.29, 0); el.rotation.x = -.2;
    D(sph(.045), camisa, el, 0, 0, 0, 0, 0, 0, E);
    D(taper(.045, .036, .25), camisa, el, 0, -.125, 0, 0, 0, 0, E);
    const mu = grp(el, 0, -.26, 0);
    D(rbox(.066, .09, .032, .013), mano, mu, 0, -.045, 0, 0, 0, 0, E);
    D(cap(.011, .03), mano, mu, s * -.034, -.025, .018, 0, 0, s * .5, E);
    return { sh, el, mu };
  };
  const BL = brazo(-1), BR = brazo(1);
  BL.sh.rotation.z = .07; BR.sh.rotation.z = -.07;
  return { g, hipL: L.hip, hipR: R.hip, kneeL: L.knee, kneeR: R.knee, shL: BL.sh, shR: BR.sh, elL: BL.el, elR: BR.el, muL: BL.mu, cab, pecho, ...opts };
}
const _e = new THREE.Euler();
function matPersona(cols) {
  const m = new THREE.MeshStandardMaterial({ roughness: .74, metalness: .04 });
  const lin = cols.map((c) => new THREE.Color(c));
  return patch(m, 'solid', (sh) => {
    sh.uniforms.uCol = { value: lin };
    sh.vertexShader = 'attribute float zona; varying float vZona;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vZona = zona;');
    sh.fragmentShader = 'uniform vec3 uCol[5]; varying float vZona;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n { int zi = int(vZona + .5); vec3 zc = uCol[0]; if (zi == 1) zc = uCol[1]; else if (zi == 2) zc = uCol[2]; else if (zi == 3) zc = uCol[3]; else if (zi == 4) zc = uCol[4]; diffuseColor.rgb = zc; }');
  });
}
const PIELES = [0xc6916b, 0x9c6a4a, 0xdcae8a, 0x8a5a3c, 0xbf8a62, 0xe0b48f];
const Mreal = { reflect: std({ color: 0xd7dde6, roughness: .2, metalness: .6 }), chaleco: std({ color: 0xe6d21f, roughness: .55 }), chalecoJefe: std({ color: 0xf07a1a, roughness: .55 }), lente: std({ color: 0x0c0f14, roughness: .1, metalness: .5 }), pelo: std({ color: 0x1b1511, roughness: .95 }) };
let nReal = 0;
function personaReal(parent, px, pz, ry, opts = {}) {
  const g = grp(parent, px, opts.y || 0, pz, ry);
  const model = SkeletonUtils.clone(persona.scene); model.scale.setScalar(.01); g.add(model);
  const piel = PIELES[nReal++ % PIELES.length];
  // overol azul de trabajo; el jefe con camisa celeste; la oficina con camisa y pantalón de vestir
  const camisa = opts.jefe ? 0x8fb3d9 : opts.oficina ? (opts.camisaHex || 0xe9ecf1) : 0x2c5d9e;
  const pantalon = opts.jefe ? 0x3b5b86 : opts.oficina ? 0x6b7486 : 0x2c5d9e;
  const manos = opts.oficina ? piel : opts.jefe ? piel : 0x8a6a42;
  const mat = matPersona([piel, camisa, pantalon, opts.oficina ? 0x3a2a20 : 0x6b4428, manos]);
  model.traverse((n) => { if (n.isSkinnedMesh) { n.material = mat; n.castShadow = !LOW; n.frustumCulled = false; } });
  const huesos = {}; const todos = [];
  model.traverse((n) => { if (n.isBone) { huesos[n.name.replace('mixamorig', '')] = n; todos.push(n); } });
  const anclar = (hueso, px = 0, py = 0, pz = 0) => { const a = new THREE.Group(); a.scale.setScalar(100); a.position.set(px, py, pz); huesos[hueso].add(a); return a; };
  // cabeza: pelo, lentes y casco (en metros, anclados al hueso)
  const cab = anclar('Head');
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 1.8), Mreal.pelo); pelo.position.set(0, .1, -.012); pelo.scale.set(.95, .9, 1.02); cab.add(pelo);
  if (!opts.oficina) { const l = new THREE.Mesh(new RoundedBoxGeometry(.15, .032, .03, 2, .01), Mreal.lente); l.position.set(0, .07, .09); cab.add(l); }
  if (!opts.sinCasco) {
    const cm = opts.jefe ? std({ color: 0xf2f2ee, roughness: .28 }) : std({ color: 0xf5b800, roughness: .3 });
    // casco de seguridad: domo alto, nervio central, borde fino y visera corta adelante
    const casco = new THREE.Group(); casco.position.set(0, .145, .012); cab.add(casco);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.118, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), cm); dome.scale.set(1, 1.02, 1.16); casco.add(dome);
    const borde = new THREE.Mesh(new THREE.TorusGeometry(.12, .008, 8, 36), cm); borde.rotation.x = Math.PI / 2; borde.scale.set(1, 1.16, 1); borde.position.y = .004; casco.add(borde);
    const visera = new THREE.Mesh(new THREE.CylinderGeometry(.122, .124, .01, 28, 1, false, -Math.PI / 2.4, Math.PI / 1.2), cm);
    visera.scale.set(1, 1, 1.5); visera.position.set(0, .002, .02); visera.rotation.x = .12; casco.add(visera);
    const nervio = new THREE.Mesh(new RoundedBoxGeometry(.03, .03, .25, 2, .012), cm); nervio.position.y = .112; casco.add(nervio);
    for (const sx of [-1, 1]) { const n2 = new THREE.Mesh(new RoundedBoxGeometry(.016, .022, .2, 2, .007), cm); n2.position.set(sx * .045, .1, 0); n2.rotation.z = sx * -.38; casco.add(n2); }
    if (opts.jefe) { const f = new THREE.Mesh(new THREE.TorusGeometry(.117, .007, 6, 36), M.yellow); f.rotation.x = Math.PI / 2; f.scale.set(1, 1.16, 1); f.position.y = .03; casco.add(f); }
    casco.traverse((n) => n.isMesh && (n.castShadow = !LOW));
  }
  // chaleco reflectante (o huinchas sobre la chaqueta del jefe)
  if (!opts.oficina) {
    const tor = anclar('Spine1');
    if (true) { const v = new THREE.Mesh(new THREE.LatheGeometry([[.17, -.16], [.175, -.05], [.186, .06], [.192, .15], [.172, .2]].map(([a, b]) => new THREE.Vector2(a, b)), 24, 0, Math.PI * 2), opts.jefe ? Mreal.chalecoJefe : Mreal.chaleco); v.scale.set(1, 1, .8); v.position.z = .02; tor.add(v); }
    for (const y of [-.07, .06]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.193, .19, .026, 24, 1, true), Mreal.reflect); b.scale.set(1, 1, .81); b.position.set(0, y, .02); tor.add(b); }
  }
  if (!opts.oficina && !opts.jefe) {
    for (const [hb, y, r] of [['LeftLeg', .3, .062], ['RightLeg', .3, .062], ['LeftForeArm', .13, .047], ['RightForeArm', .13, .047]]) {
      const a = anclar(hb); const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .028, 18, 1, true), Mreal.reflect); band.position.y = y; a.add(band);
    }
  }
  const restQ = todos.map((b) => b.quaternion.clone()), restHip = huesos.Hips.position.clone(), procQ = todos.map(() => new THREE.Quaternion());
  // orientación de reposo del padre de cada hueso, relativa al cuerpo
  const idx = {}; todos.forEach((b, i) => (idx[b.name.replace('mixamorig', '')] = i));
  const mundo = new Map(), pw = [], pwInv = [];
  const wq = (o) => { if (!o || o === model) return new THREE.Quaternion(); if (mundo.has(o)) return mundo.get(o); const q = wq(o.parent).clone().multiply(o.quaternion); mundo.set(o, q); return q; };
  todos.forEach((b) => { const q = wq(b.parent).clone(); pw.push(q); pwInv.push(q.clone().invert()); });
  const mixer = new THREE.AnimationMixer(model);
  if (persona.animations[0]) { const a = mixer.clipAction(persona.animations[0]); a.timeScale = .75; a.play(); }
  return { g, real: true, model, huesos, todos, restQ, restHip, procQ, mixer, cab, idx, pw, pwInv, ...opts };
}
const trabajadorX = (parent, px, pz, ry, opts) => (persona ? personaReal(parent, px, pz, ry, opts) : trabajador(parent, px, pz, ry, opts));
const _qa = new THREE.Quaternion();
function hueso(w, n, x, y, z) {
  const b = w.huesos[n]; if (!b) return;
  const k = w.idx[n];
  _qa.setFromEuler(_e.set(x, y, z));
  b.quaternion.copy(w.restQ[k]).multiply(_qa); // movimiento local sobre la pose de reposo del hueso
}
function animarReal(w, clock, dt) {
  w.todos.forEach((b, i) => b.quaternion.copy(w.restQ[i])); w.huesos.Hips.position.copy(w.restHip);
  const ph = clock * 6.2, id = w.idle || 0, resp = Math.sin(clock * 1.9 + id);
  if (w.sentado) {
    hueso(w, 'LeftUpLeg', 1.5, 0, .06); hueso(w, 'RightUpLeg', 1.5, 0, -.06); hueso(w, 'LeftLeg', -1.45, 0, 0); hueso(w, 'RightLeg', -1.45, 0, 0);
    hueso(w, 'LeftArm', 1.3, 0, .4); hueso(w, 'RightArm', 1.3, 0, -.4);
    hueso(w, 'LeftForeArm', 0, 0, 1.35 + Math.sin(clock * 13 + id) * .05); hueso(w, 'RightForeArm', 0, 0, -1.35 - Math.sin(clock * 11 + id * 2) * .05);
    hueso(w, 'Head', .12, Math.sin(clock * .4 + id) * .12, 0);
  } else if (w.camina && w.act < .5) {
    const s = Math.sin(ph);
    hueso(w, 'LeftUpLeg', .42 * s, 0, 0); hueso(w, 'RightUpLeg', -.42 * s, 0, 0);
    hueso(w, 'LeftLeg', -.85 * Math.max(0, Math.sin(ph + 1.9)), 0, 0); hueso(w, 'RightLeg', -.85 * Math.max(0, Math.sin(ph + 1.9 + Math.PI)), 0, 0);
    hueso(w, 'LeftArm', 1.25, 0, .1 - .34 * s); hueso(w, 'RightArm', 1.25, 0, -.1 - .34 * s);
    hueso(w, 'LeftForeArm', 0, 0, .3); hueso(w, 'RightForeArm', 0, 0, -.3);
  } else {
    hueso(w, 'LeftArm', 1.24, 0, .1 + resp * .02); hueso(w, 'RightArm', 1.24, 0, -.1 - resp * .02);
    hueso(w, 'LeftForeArm', 0, 0, .28); hueso(w, 'RightForeArm', 0, 0, -.28);
    hueso(w, 'Spine2', resp * .018, 0, 0); hueso(w, 'Head', 0, Math.sin(clock * .5 + id) * .35, 0);
    if (w.jefe) {
      const k = w.tel || 0;
      if (k > .01) { // codo al costado, antebrazo adelante: muestra el teléfono a la altura del pecho
        hueso(w, 'RightArm', 1.24 + (1.05 - 1.24) * k, 0, -.1 + (-.5 + .1) * k);
        hueso(w, 'RightForeArm', 0, 0, -.28 + (-1.9 + .28) * k);
        hueso(w, 'Head', .12 * k, -.15 * k, 0);
        for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) { hueso(w, 'RightHand' + f + '1', .55 * k, 0, 0); hueso(w, 'RightHand' + f + '2', .85 * k, 0, 0); hueso(w, 'RightHand' + f + '3', .6 * k, 0, 0); }
      }
    }
  }
  // saludo real (animación de Mixamo) mezclado con la pose según cuánto está activo
  if (w.act > .02 && !w.sentado && persona.animations[0]) {
    w.todos.forEach((b, i) => w.procQ[i].copy(b.quaternion));
    const hy = w.huesos.Hips.position.clone();
    w.mixer.update(dt);
    w.todos.forEach((b, i) => b.quaternion.slerp(w.procQ[i], 1 - w.act));
    w.huesos.Hips.position.lerp(hy, 1 - w.act);
  }
}
const trabajadores = [
  trabajadorX(scene, 2.2, .35, Math.PI, { idle: 0, barba: true }),                                     // de espaldas mirando la cinta
  trabajadorX(scene, -14, 3.35, Math.PI / 2, { camina: true, x0: -10, x1: 15, v: 1.05 }), // pasillo
  trabajadorX(scene, 2.5, 7.3, .12, { idle: 1.5, jefe: true, barba: true }) // Diego, jefe de planta: al frente
];
// cada persona hace un trabajo concreto de JPB (nombres de ejemplo, se pueden cambiar por los reales)
const ROLES = [
  { nombre: 'Matías', cargo: 'Entrena tu agente IA de WhatsApp', texto: 'Revisa las conversaciones del agente, le enseña tu catálogo y tus precios, y ajusta las respuestas para que cotice como tu mejor vendedor.', href: '/agente-ia', cta: 'Ver el agente IA' },
  { nombre: 'Camila', cargo: 'Prospección B2B', texto: 'Busca a los decisores de tu rubro, les escribe por correo, LinkedIn y WhatsApp, y te deja reuniones agendadas.', href: '/prospeccion', cta: 'Ver prospección' },
  { nombre: 'Diego', cargo: 'Jefe de planta · Panel JPB', texto: 'Mira los números de tu planta comercial todos los días y te los muestra claros en el Panel JPB: conversaciones, cotizaciones y ventas.', href: '#panel', cta: 'Ver el Panel JPB' },
  { nombre: 'Valentina', cargo: 'Revisa tus cotizaciones y les hace seguimiento', texto: 'Ninguna cotización queda en el aire: revisa cada una, ve quién dejó de responder y le hace seguimiento hasta que se cierra o se descarta.', href: '/contacto', cta: 'Quiero seguimiento' },
  { nombre: 'Tomás', cargo: 'Gestiona tus campañas de Google Ads', texto: 'Arma y optimiza tus campañas para que aparezcas cuando un comprador busca a su proveedor, midiendo cada contacto que llega.', href: '/keyword-research-b2b-industrial-chile', cta: 'Ver Google Ads' },
  { nombre: 'Fernanda', cargo: 'SEO: que te encuentren en Google', texto: 'Trabaja tu web y tus contenidos para que llegue tráfico orgánico todos los meses, sin depender solo de la pauta.', href: '/keyword-research-b2b-industrial-chile', cta: 'Ver SEO' },
  { nombre: 'Joaquín', cargo: 'Construye tu web industrial', texto: 'Diseña sitios rápidos con catálogo y cotizador, pensados para que el visitante te escriba, no solo para verse bien.', href: '/pagina-web-empresa-industrial-chile', cta: 'Ver web industrial' },
  { nombre: 'Catalina', cargo: 'Automatiza tus procesos con IA', texto: 'Conecta tus herramientas para que cotizaciones, recordatorios y reportes salgan solos, sin trabajo manual.', href: '/servicios', cta: 'Ver automatización' },
  { nombre: 'Benjamín', cargo: 'Vendedor externo', texto: 'Se suma a tu equipo comercial con portafolio permanente: atiende a los clientes calientes y empuja el cierre.', href: '/outsourcing-fuerza-ventas-chile', cta: 'Ver el modelo' }
];
trabajadores.forEach((w, i) => (w.rol = ROLES[i]));
// segundo piso: equipo comercial sentado frente a sus computadores
const ofiSlides = [[sKwDet], [sWebDet], [sMedDet], [sOficina], [sChat], [sKpi('COTIZACIONES', 'ENVIADAS HOY', 18, .02, 'AGENTE IA + VENDEDOR')]];
const ofiRol = [5, 6, 4, 3, 7, 8]; // Fernanda (SEO), Joaquín (web), Tomás (Ads y medición), Valentina, Catalina, Benjamín
const camisas = [0xe9ecf1, 0x2f3a52, 0x8a9bb5, 0xdfe3e8, 0x3b4252, 0xb7c2d4].map((c) => std({ color: c, roughness: .8 }));
OFI.forEach(([x, z], i) => {
  const w = trabajadorX(scene, x, z + .72, Math.PI, { idle: i * .9, y: 4.4 - (persona ? .42 : .37), sentado: true, chaleco: camisas[i], camisaHex: [0xe9ecf1, 0x2f3a52, 0x8a9bb5, 0xdfe3e8, 0x3b4252, 0xb7c2d4][i], sinCasco: true, oficina: true });
  if (!w.real) { w.hipL.rotation.x = w.hipR.rotation.x = -1.45; w.kneeL.rotation.x = w.kneeR.rotation.x = 1.45;
  w.shL.rotation.x = w.shR.rotation.x = -.75; w.elL.rotation.x = w.elR.rotation.x = -.75; }
  w.rol = ROLES[ofiRol[i]]; trabajadores.push(w);
  const g = grp(scene, x, 5.66, z - .33);
  D(box(.74, .46, .04), M.dark, g, 0, 0, -.025);
  new Pantalla(g, .7, .42, 640, ofiSlides[i], { off: i * 1.7, dur: 7, label: 'Oficina comercial · Panel JPB', href: '#panel', delay: .4 + i * .08 });
});
// Diego: tablet en la mano, foco propio y anillo en el piso
const diego = trabajadores[2];
// (Diego ya no lleva tablet: el teléfono aparece en el paso de la app)
// teléfono que Diego levanta en el paso de la app
const telefono = new THREE.Group(); telefono.visible = false; scene.add(telefono);
{
  const marco = new THREE.Mesh(new RoundedBoxGeometry(.078, .16, .009, 3, .008), std({ color: 0x8b8e93, metalness: .9, roughness: .3, envMap: envMetal })); telefono.add(marco);
  const c = cv(256, 512), x = c.getContext('2d');
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, 256, 512); x.fillStyle = '#f5b800'; x.fillRect(0, 0, 256, 70);
  x.fillStyle = '#0b1220'; x.font = '800 30px Archivo, sans-serif'; x.fillText('Panel JPB', 18, 48);
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(238,240,244,.1)'; x.fillRect(14, 90 + i * 66, 228, 56); x.fillStyle = i % 3 ? '#30d158' : '#f5b800'; x.beginPath(); x.arc(40, 118 + i * 66, 12, 0, 6.283); x.fill(); x.fillStyle = 'rgba(238,240,244,.75)'; x.fillRect(62, 108 + i * 66, 140, 9); x.fillStyle = 'rgba(238,240,244,.35)'; x.fillRect(62, 124 + i * 66, 100, 7); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.MeshBasicMaterial({ map: t }); pm.toneMapped = false;
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(.07, .15), pm); pantalla.position.z = .0047; telefono.add(pantalla);
}
const anillo = new THREE.Mesh(new THREE.RingGeometry(.5, .6, 48), new THREE.MeshBasicMaterial({ color: 0xf5b800, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
anillo.rotation.x = -Math.PI / 2; anillo.position.set(diego.g.position.x, .02, diego.g.position.z); scene.add(anillo);
const focoDiego = LOW ? new THREE.PointLight(0xfff1d6, 0, 6, 1.4) : new THREE.SpotLight(0xfff1d6, 0, 14, .32, .55, 1.2); focoDiego.position.set(diego.g.position.x + .5, 4.6, diego.g.position.z + 3.6);
if (focoDiego.isSpotLight) focoDiego.target = diego.g; else focoDiego.position.set(diego.g.position.x + .3, 2.3, diego.g.position.z + 1.5); scene.add(focoDiego);
const ofiLight = new THREE.PointLight(0xfff0d0, 0, 14, 1.3); ofiLight.position.set(-16.6, 8.2, -12.6); scene.add(ofiLight);


/* ------------------------------------------------------------------ */
/*  Luces, haces y polvo                                               */
/* ------------------------------------------------------------------ */
const hemi = new THREE.HemisphereLight(0x8fa6d6, 0x1a140c, 0); scene.add(hemi);
const sun = new THREE.SpotLight(0xe4ecff, 0, 120, .4, .35, 0);
sun.position.set(-40, 21, -7); sun.target.position.set(-7, 0, -1);
if (!LOW) sun.map = texVentana(); sun.castShadow = !LOW; sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048); sun.shadow.bias = -.0004; sun.shadow.camera.near = 10; sun.shadow.camera.far = 90;
scene.add(sun, sun.target);
const lampLights = (LOW ? [[-5, -5], [4, 3]] : [[-5, -5], [4, 3], [-14, -13], [13, -13]]).map(([x, z]) => { const l = new THREE.PointLight(0xffd9a0, 0, 26, 1.6); l.position.set(x, 8.7, z); scene.add(l); return l; });
const ledLight = new THREE.PointLight(0xffd36a, 0, 18, 1.5); ledLight.position.set(LED.x, LED.y, -14.5); if (!LOW) scene.add(ledLight);
const fillLight = new THREE.PointLight(0x9fb6e8, 0, 11, 1.4); fillLight.position.set(-8.4, 3.2, 2.6); if (!LOW) scene.add(fillLight);
const deskLight = { intensity: 0 }; // (el puesto de monitores ya no existe)

const additive = (map, color, op) => new THREE.MeshBasicMaterial({ color, alphaMap: map, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const beams = [];
const coneMap = texGrad([[0, 0], [.6, 60], [1, 255]]);
for (const [x, z] of (LOW ? [[-5, -5], [4, 3]] : [[-5, -5], [4, 3], [-14, -13], [13, -13]])) {
  const m = new THREE.Mesh(cyl(.55, 2.8, 8.9, 24, true), additive(coneMap, 0xffdca0, 0)); m.position.set(x, 4.6, z); m.renderOrder = 2; scene.add(m); beams.push([m, .085]);
}
const shaftMap = texGrad([[0, 0], [.55, 40], [1, 200]]);
{
  const d = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize();
  for (const z of (LOW ? [] : [-14.5, -9.5, -4.5, .5, 5.5])) {
    const L = 8.6 / -d.y + 2, start = new THREE.Vector3(-21.9, 8.6, z);
    const m = new THREE.Mesh(cyl(1.8, 1.25, L, 4, true), additive(shaftMap, 0xcfe0ff, 0));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d); m.rotateY(Math.PI / 4);
    m.position.copy(start).addScaledVector(d, L / 2); m.renderOrder = 2; scene.add(m); beams.push([m, .13]);
  }
}
// haz diagonal con trama de puntos sobre el muro del fondo (luz que entra por la lucarna)
{
  const W = 1536, H = 660, c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const step = 9;
  for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
    const u = px / W, v = py / H;
    const d = Math.abs((u - .62) + (v - .5) * .9); // banda diagonal
    const band = Math.max(0, 1 - d / .2) * (0.35 + 0.65 * (1 - v * .6));
    if (band <= .02) continue;
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px + (py / step % 2) * step / 2, py, step * .42 * Math.sqrt(band), 0, 6.283); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(36, 15.5), additive(t, 0xdbe6ff, 0));
  m.material.side = THREE.FrontSide; m.material.alphaMap = null; m.material.map = t;
  m.position.set(1, 6.6, -17.55); m.renderOrder = 3; scene.add(m); beams.push([m, .12]);
}
const polvo = (() => {
  const n = LOW ? 140 : 800, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = -21 + rnd() * 42; p[i * 3 + 1] = rnd() * 11; p[i * 3 + 2] = -17 + rnd() * 30; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color: 0xffe6b0, size: .045, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
})();

/* ------------------------------------------------------------------ */
/*  Estaciones interactivas: la planta es una fábrica de ventas         */
/* ------------------------------------------------------------------ */
const ESTACIONES = {
  prospeccion: { kicker: 'PASO 01 · GOOGLE ADS', titulo: 'Te encuentran en Google', texto: 'Campañas de Google Ads para empresas industriales: tu anuncio aparece cuando un comprador busca lo que vendes, y cada clic entra a la línea como un prospecto.', href: '/keyword-research-b2b-industrial-chile', cta: 'Ver Google Ads', c: [-10.6, 1.8, lineZ], s: [3.8, 4, 3.2], pos: [-5.6, 2.9, 6.4], etiqueta: '01 · Google Ads', ea: [-10.6, 4.55, lineZ + 1], corto: 'Con Google Ads apareces cuando te buscan y cada clic entra como prospecto.', mpos: [-7.6, 3.3, 9.6], mlook: [-9.6, 1.9, -1] },
  ia: { kicker: 'PASO 02 · AGENTE IA EN WHATSAPP', titulo: 'Te escriben por WhatsApp, la IA vende', texto: 'Tus clientes escriben a tu WhatsApp y el agente responde en 2 segundos, cotiza con tu catálogo y califica, de día y de noche. Las cajas grises (leads) pasan por el agente y salen amarillas: ventas.', href: '/agente-ia', cta: 'Ver el agente IA', c: [-.7, 1.6, -.9], s: [11.5, 3.6, 5], pos: [.6, 2.6, 6.2], etiqueta: '02 · Agente IA en WhatsApp', ea: [-.7, 3.5, lineZ + 1.2], corto: 'Te escriben por WhatsApp y la IA responde, cotiza y califica al tiro. Los leads grises salen amarillos: ventas.', mpos: [.3, 2.7, 7.6], mlook: [-.7, 2.05, -.3] },
  oficina: { kicker: 'SEGUNDO PISO · OFICINA COMERCIAL', titulo: 'Tu equipo, con todo a la vista', texto: 'Aquí trabaja el equipo comercial: cada uno ve en su pantalla las conversaciones de WhatsApp, los prospectos y las cotizaciones del día. Toca a cada persona para ver qué hace por tu empresa.', href: '/outsourcing-fuerza-ventas-chile', cta: 'Ver el modelo', c: [-16.5, 5.7, -13], s: [11, 2.8, 10], pos: [-9.2, 7.6, -3.4], etiqueta: '2º piso · Oficina comercial', ea: [-16.5, 7.3, -8.6], corto: 'Tu equipo ve todo en el Panel JPB y nosotros nos sumamos como vendedor externo.', mpos: [-12.2, 8.2, -2.2], mlook: [-16.6, 5.3, -12.4] },
  ventas: { kicker: 'PASO 03 · SALEN VENTAS', titulo: 'Tu fábrica vende más', texto: 'Eso es lo que hacemos: que lleguen pedidos listos para cerrar, con seguimiento automático y el Panel JPB para ver cada venta.', href: '/contacto', cta: 'Quiero vender más', c: [9.6, 1.5, lineZ], s: [3.8, 3.6, 3.3], pos: [5.6, 2.7, 6.6], etiqueta: '03 · Ventas', ea: [9.6, 4.55, lineZ + 1], corto: 'Llegan pedidos listos para cerrar. Tu equipo solo vende.', mpos: [6.9, 3.2, 9.6], mlook: [8.6, 2.0, -1] },
  despacho: { kicker: 'ABIERTA 24/7 · WEB + SEO', titulo: 'Que te encuentren', texto: 'Web industrial con catálogo y cotizador, SEO y Google Ads: los pedidos llegan aunque nadie salga a buscarlos.', href: '/pagina-web-empresa-industrial-chile', cta: 'Ver web industrial', c: [15, 2.4, -13], s: [10.5, 5, 7], pos: [8.4, 3.6, -3.2] },
  equipo: { kicker: 'EQUIPO JPB EN TU PLANTA', titulo: 'Vendedor externo', texto: 'Nos integramos a tu equipo comercial con portafolio permanente, sin sueldos fijos ni seis meses de ramp-up.', href: '/outsourcing-fuerza-ventas-chile', cta: 'Ver el modelo' }
};
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const outlineMat = () => new THREE.LineBasicMaterial({ color: 0xf5b800, transparent: true, opacity: 0, depthWrite: false });
const act = {}; const hits = [];
for (const [k, e] of Object.entries(ESTACIONES)) {
  act[k] = 0;
  if (!e.c) continue;
  const h = new THREE.Mesh(box(...e.s), hitMat); h.position.set(...e.c); h.userData.estacion = k; scene.add(h); hits.push(h);
  e.outline = new THREE.LineSegments(new THREE.EdgesGeometry(box(...e.s)), outlineMat()); e.outline.position.copy(h.position); scene.add(e.outline);
}
trabajadores.forEach((w, i) => {
  const h = new THREE.Mesh(box(.8, 1.9, .8), hitMat); h.position.y = .95; h.userData.estacion = 'equipo'; h.userData.w = w; w.g.add(h); hits.push(h);
  w.outline = new THREE.LineSegments(new THREE.EdgesGeometry(box(.8, 1.95, .8)), outlineMat()); w.outline.position.y = .97; w.g.add(w.outline); w.act = 0;
});
const foco = new THREE.PointLight(0xffd36a, 0, 9, 1.3); if (!LOW) scene.add(foco);

// HTML: mensaje, etiquetas flotantes, tarjeta y contador
const msg = document.getElementById('planta-msg'), card = document.getElementById('estacion'), hudVentas = document.getElementById('hud-ventas');
const etiquetas = [];
for (const [k, e] of Object.entries(ESTACIONES)) if (e.etiqueta) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'etq'; b.textContent = e.etiqueta;
  b.addEventListener('click', () => abrirEstacion(k)); b.addEventListener('mouseenter', () => (hoverEst = k)); b.addEventListener('mouseleave', () => (hoverEst = null));
  document.getElementById('etiquetas').appendChild(b); etiquetas.push([b, new THREE.Vector3(...e.ea)]);
}
{
  const b = document.createElement('button'); b.type = 'button'; b.className = 'etq etq-diego'; b.textContent = '▶ Recorrido con Diego';
  b.addEventListener('click', iniciarRecorrido); document.getElementById('etiquetas').appendChild(b);
  etiquetas.push([b, null]);
}
// en móvil las etiquetas no caben en pantalla: fila de botones por estación
for (const k of ['prospeccion', 'ia', 'ventas', 'oficina']) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'est-chip';
  b.textContent = { prospeccion: '01 Prospección', ia: '02 WhatsApp IA', ventas: '03 Ventas', oficina: '2º piso' }[k];
  b.addEventListener('click', () => abrirEstacion(k)); document.getElementById('est-chips').appendChild(b);
}
let ventas = 128; hudVentas.textContent = ventas;

const V = new THREE.Vector3();
let sel = null, selWorker = null, hoverEst = null, hoverWorker = null;
const views = {
  planta: () => small() ? { pos: [1.8, 3.7, 20.4], look: [-.7, 5.3, -10], fov: 76 } : { pos: [3.4, 3.7, 15.6], look: [.6, 3.9, -8], fov: 55 },
  pantallas: () => {
    const B = mtx(PUESTO.x, 0, PUESTO.z, 0, PUESTO.ry, 0);
    const look = new THREE.Vector3(0, 1.72, -.4).applyMatrix4(B), pos = new THREE.Vector3(0, small() ? 1.75 : 1.95, small() ? 7.4 : 4.7).applyMatrix4(B);
    return { pos: pos.toArray(), look: look.toArray(), fov: small() ? 66 : 50 };
  },
  estacion: () => {
    if (MOVIL() && sel && ESTACIONES[sel].mpos) return { pos: ESTACIONES[sel].mpos, look: ESTACIONES[sel].mlook, fov: 60 };
    if (sel === 'equipo' && selWorker) { const p = selWorker.g.getWorldPosition(new THREE.Vector3()), f = small() ? 1.5 : 1; return { pos: [p.x + 1.6 * f, p.y + 1.9 * f, p.z + 3.2 * f], look: [p.x, p.y + 1.1, p.z - (selWorker.sentado ? .5 : 0)], fov: small() ? 62 : 48 }; }
    const e = ESTACIONES[sel]; const back = small() ? 1.6 : 1;
    const c = new THREE.Vector3(...e.c), pos = new THREE.Vector3(...e.pos).sub(c).multiplyScalar(back).add(c);
    return { pos: pos.toArray(), look: [e.c[0], e.c[1] - (small() ? .2 : 0), e.c[2]], fov: small() ? 66 : 50 };
  }
};
let vista = 'planta';
const MOVIL = () => innerWidth < 760;
let rt = performance.now() / 1000, ri = 0, recOn = false, recNext = 0, recStartAt = 0, pasoT0 = 0, cineI = -1;
const poseEst = (k) => { const e = ESTACIONES[k]; return MOVIL() ? { pos: e.mpos, look: e.mlook, fov: 60 } : { pos: e.pos, look: e.c, fov: 50 }; };
const RECORRIDO = [
  { kicker: 'RECORRIDO · DIEGO, JEFE DE PLANTA', titulo: 'Hola, soy Diego. Te muestro cómo hacemos que tu empresa venda más.', texto: 'Evaluamos, preparamos, posicionamos, guiamos cada contacto por WhatsApp y cerramos la venta. Y tú lo sigues todo desde tu app.', corto: 'Evaluamos, preparamos, posicionamos, guiamos por WhatsApp, cerramos y lo sigues en tu app.', href: '#servicios', cta: 'Ver servicios',
    pose: () => { const p = diego.g.position; return MOVIL() ? { pos: [p.x + .5, 1.75, p.z + 3.4], look: [p.x, 1.3, p.z], fov: 58 } : { pos: [p.x + 1.1, 1.85, p.z + 3.1], look: [p.x - .5, 1.45, p.z], fov: 46 }; } },
  { key: 'oficina', kicker: 'PASO 1 · EVALUAMOS TU EMPRESA', titulo: 'Partimos por entender tu negocio', texto: 'Revisamos tu producto, tus clientes, tu competencia y qué buscan tus compradores en Google. Así sabemos dónde está la venta.', corto: 'Revisamos tu producto, tu competencia y qué buscan tus compradores en Google.', href: '/contacto', cta: 'Pedir evaluación' },
  { key: 'oficina', kicker: 'PASO 2 · PREPARAMOS TU POSICIONAMIENTO', titulo: 'Palabras clave, web y medición', texto: 'Elegimos las búsquedas que compran, dejamos tu web lista para cotizar y medimos cada contacto desde el primer día.', corto: 'Elegimos las búsquedas que compran, dejamos tu web lista y medimos cada contacto.', href: '/pagina-web-empresa-industrial-chile', cta: 'Ver web industrial',
    cine: ['1/3 · PALABRAS CLAVE', '2/3 · WEB', '3/3 · MEDICIÓN'],
    pose: () => { // la cámara pasa de pantalla en pantalla
      const i = Math.min(2, Math.floor(Math.max(0, rt - pasoT0 - .4) / 3.1)), [x, z] = OFI[i];
      return MOVIL() ? { pos: [x + .04, 6.22, z + 1.42], look: [x, 5.66, z - .33], fov: 52 } : { pos: [x - .05, 5.74, z + .66], look: [x - .24, 5.66, z - .33], fov: 50 };
    } },
  { key: 'prospeccion', kicker: 'PASO 3 · POSICIONAMOS CON GOOGLE ADS', titulo: 'Apareces cuando te buscan', texto: 'Campañas de Google Ads para empresas industriales, optimizadas por costo por cotización. Cada clic entra a la línea como un prospecto.', corto: 'Google Ads para industria: cada clic entra como prospecto.' },
  { key: 'ia', kicker: 'PASO 4 · TODO ENTRA POR WHATSAPP', titulo: 'La IA guía cada contacto', texto: 'Quien llega desde Google te escribe por WhatsApp: el agente IA responde al tiro, cotiza con tu catálogo y lo guía hasta la compra. Las cajas grises salen amarillas.', corto: 'Llegan desde Google a tu WhatsApp: la IA responde, cotiza y guía hasta la compra.' },
  { key: 'ventas', kicker: 'PASO 5 · CERRAMOS LA VENTA', titulo: 'Pedidos listos para cerrar', texto: 'Tu equipo recibe clientes calientes, hacemos seguimiento a cada cotización y ves todo en el Panel JPB.', corto: 'Tu equipo recibe clientes calientes y seguimos cada cotización hasta cerrar.' },
  { app: true, kicker: 'PASO 6 · TU APP PANEL JPB', titulo: 'Sigues todo desde tu teléfono', texto: 'Con la app Panel JPB ves en vivo las conversaciones de WhatsApp, quién dejó de responder, cada cotización y lo que gastas en Google y en IA.', corto: 'En la app Panel JPB ves en vivo tus chats, cotizaciones, seguimientos y gastos.', href: '/panel-jpb-demo', cta: 'Abrir demo completa',
    pose: () => { const p = diego.g.position; return MOVIL() ? { pos: [p.x + .58, 1.62, p.z + 3.3], look: [p.x + .5, 1.42, p.z], fov: 56 } : { pos: [p.x + .95, 1.72, p.z + 3.1], look: [p.x + .95, 1.42, p.z], fov: 44 }; } },
  { kicker: 'CLIENTES ACTIVOS', titulo: 'Empresas que ya venden más con nosotros', texto: 'ETP Polimer, Fierros Idini, Plastiservi, Conflex y The Kem: relaciones activas de años, con resultados medibles.', corto: 'Polimer, Fierros Idini, Plastiservi, Conflex y The Kem: clientes activos con resultados.', href: '#clientes', cta: 'Ver los casos',
    pose: () => MOVIL() ? { pos: [-3.6, 6.4, 4.5], look: [-3.6, 6.9, -17], fov: 56 } : { pos: [-3.6, 6.3, -4], look: [-3.6, 6.9, -17], fov: 50 } },
  { kicker: 'FIN DEL RECORRIDO', titulo: '¿Hacemos que tu empresa venda más?', texto: 'En 30 minutos revisamos tu situación comercial y te decimos qué haríamos primero. Sin compromiso.', corto: 'En 30 minutos vemos tu situación y te decimos qué haríamos primero.', href: '/contacto', cta: 'Agenda una llamada',
    pose: () => views.planta() }
];
views.recorrido = () => { const st = RECORRIDO[ri]; return st.pose ? st.pose() : poseEst(st.key); };
const dbg = new URLSearchParams(location.search).get('cam');
if (dbg) { const n = dbg.split(',').map(Number); views.debug = () => ({ pos: n.slice(0, 3), look: n.slice(3, 6), fov: n[6] || 55 }); vista = 'debug'; }
const cam = { pos: new THREE.Vector3(...views[vista]().pos), look: new THREE.Vector3(...views[vista]().look), fov: views[vista]().fov };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
const btnPant = document.getElementById('btn-pantallas');
function setVista(v) {
  vista = v; btnPant.hidden = v === 'planta' || v === 'recorrido';
  section.classList.toggle('en-estacion', v !== 'planta');
  section.classList.toggle('recorrido', v === 'recorrido');
  section.classList.toggle('tour', MOVIL() && v === 'recorrido');
  if (v !== 'recorrido') recOn = false;
  if (v === 'planta' || v === 'pantallas') { card.hidden = true; sel = null; selWorker = null; }
}
function llenarCard(e) {
  card.querySelector('.est-kicker').textContent = e.kicker;
  card.querySelector('.est-titulo').textContent = e.titulo;
  card.querySelector('.est-texto').textContent = MOVIL() && e.corto ? e.corto : e.texto;
  const a = card.querySelector('.est-cta'); a.href = e.href; a.textContent = e.cta + ' →';
  card.hidden = false; tip.hidden = true;
}
function irPaso(i, pausa) {
  ri = (i + RECORRIDO.length) % RECORRIDO.length;
  const st = RECORRIDO[ri], e = st.key ? { ...ESTACIONES[st.key], ...st } : st;
  sel = st.key || null; selWorker = ri === 0 ? diego : null;
  llenarCard(e);
  card.querySelectorAll('.est-dots i').forEach((d, k) => d.classList.toggle('on', k === ri));
  card.querySelector('.est-num').textContent = (ri + 1) + '/' + RECORRIDO.length;
  setVista('recorrido'); recOn = true;
  pasoT0 = rt; cineI = -1;
  mostrarApp(!!st.app);
  recNext = rt + (pausa ? 18 : ri === 0 ? 8 : st.cine ? 10.4 : st.app ? 15 : 7);
  if (st.app && demoPausa) recNext = Infinity;
  if (!MOVIL() && ri === RECORRIDO.length - 1) recNext = Infinity;
  anilloTiempo(recNext - rt);
}
function anilloTiempo(seg) {
  const a = card.querySelector('.anillo'); if (!a) return;
  a.classList.remove('corre'); void a.getBoundingClientRect();
  if (isFinite(seg) && seg > 0) { a.style.setProperty('--dur', seg + 's'); a.classList.add('corre'); }
}
function iniciarRecorrido() { irPaso(0); }
// --- demo real de la app en un teléfono ---
const appDemo = document.getElementById('app-demo'), appIframe = document.getElementById('app-iframe'), appBadge = document.getElementById('app-badge');
let appOn = false, demoPausa = false, appTimer = 0;
function mostrarApp(on) {
  clearTimeout(appTimer);
  section.classList.toggle('paso-app', on);
  if (on === appOn && on) return;
  appOn = on; diego.telMeta = on ? 1 : 0;
  if (on) {
    appTimer = setTimeout(() => {
      if (!appOn) return;
      if (!appIframe.src) appIframe.src = '/panel-jpb-demo';
      appDemo.hidden = false; escalaDemo();
      requestAnimationFrame(() => requestAnimationFrame(() => appDemo.classList.add('on')));
    }, 1100);
  } else {
    demoPausa = false; appBadge.classList.remove('pausa'); appBadge.querySelector('span').textContent = 'Toca para probar la demo';
    appDemo.classList.remove('on'); appTimer = setTimeout(() => { if (!appOn) appDemo.hidden = true; }, 450);
  }
}
// la demo se dibuja a tamaño real de teléfono (390 px) y se escala al mockup
function escalaDemo() {
  const caja = appIframe.parentElement, f = caja.clientWidth / 390;
  appIframe.style.transform = 'scale(' + f + ')'; appIframe.style.height = (caja.clientHeight / f) + 'px';
}
addEventListener('resize', () => { if (appOn) escalaDemo(); });
// en escritorio el teléfono grande queda pegado a la mano de Diego y lo sigue
function posicionarApp() {
  if (MOVIL()) { appDemo.style.left = ''; appDemo.style.top = ''; appDemo.classList.remove('izq'); return; }
  diego.huesos.RightHand.getWorldPosition(P).project(camera);
  const W = section.clientWidth, H = section.clientHeight, hx = (P.x + 1) / 2 * W, hy = (1 - P.y) / 2 * H;
  const w = appDemo.offsetWidth, h = appDemo.offsetHeight, gap = 18;
  const izq = hx + gap + w > W - 16;
  const x = izq ? hx - gap - w : hx + gap;
  const y = Math.max(52 + h / 2, Math.min(H - 16 - h / 2, hy - h * .18));
  appDemo.classList.toggle('izq', izq);
  appDemo.style.left = Math.round(x) + 'px'; appDemo.style.top = Math.round(y) + 'px';
}
function pausaDemo() {
  if (!appOn || demoPausa) return;
  demoPausa = true; recNext = Infinity; anilloTiempo(0);
  appBadge.classList.add('pausa'); appBadge.querySelector('span').textContent = 'Demo en pausa · toca › para seguir';
}
appIframe.addEventListener('load', () => {
  try { const d = appIframe.contentDocument; ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'].forEach((ev) => d.addEventListener(ev, pausaDemo, { passive: true, capture: true })); } catch (e) {}
});
addEventListener('blur', () => { setTimeout(() => { if (document.activeElement === appIframe) pausaDemo(); }, 0); });
appDemo.addEventListener('pointerdown', pausaDemo);
function abrirEstacion(k, w) {
  if (w === diego) { iniciarRecorrido(); return; }
  sel = k; selWorker = w || (k === 'equipo' ? trabajadores[0] : null);
  const r = k === 'equipo' && selWorker && selWorker.rol;
  llenarCard(r ? { kicker: 'EQUIPO JPB · ' + r.nombre.toUpperCase(), titulo: r.cargo, texto: r.texto, href: r.href, cta: r.cta } : ESTACIONES[k]);
  setVista('estacion');
}
btnPant.addEventListener('click', () => setVista('planta'));
card.querySelector('.est-cerrar').addEventListener('click', () => setVista('planta'));
// recorrido en móvil: cambia sola de estación, y se puede deslizar o usar las flechas
const dots = card.querySelector('.est-dots'); RECORRIDO.forEach(() => dots.appendChild(document.createElement('i')));
const paso = (d, pausa) => irPaso(ri + d, pausa);
card.querySelector('.est-prev').addEventListener('click', () => paso(-1, true));
card.querySelector('.est-next').addEventListener('click', () => paso(1, true));
document.getElementById('btn-recorrido').addEventListener('click', iniciarRecorrido);
let sw = null;
canvas.addEventListener('pointerdown', (ev) => { sw = { x: ev.clientX, y: ev.clientY }; });
canvas.addEventListener('pointerup', (ev) => {
  if (!sw || !recOn) return; const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y; sw = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) paso(dx < 0 ? 1 : -1, true);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && vista !== 'planta') setVista('planta'); });

function resize() {
  const w = section.clientWidth, h = section.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(section); resize();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickables = [...pantallas.map((p) => p.mesh), ...hits];
let hover = null;
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const list = ray.intersectObjects(pickables, false);
  // prioridad: trabajadores; en la planta, la estación; ya de cerca, la pantalla
  const hit = list.find((h) => h.object.userData.w)
    || (vista === 'planta' ? list.find((h) => h.object.userData.estacion) : list.find((h) => h.object.userData.pantalla))
    || list[0];
  return hit && U.uSolid.value > .9 ? hit.object : null;
}
function etiquetaDe(o) {
  if (o.userData.w === diego) return 'Diego · Jefe de planta · ▶ Recorrido';
  if (o.userData.w && o.userData.w.rol) return o.userData.w.rol.nombre + ' · ' + o.userData.w.rol.cargo;
  if (o.userData.estacion) { const e = ESTACIONES[o.userData.estacion]; return (e.etiqueta || e.titulo) + ' · ver'; }
  return (vista === 'planta' && o.parent.parent === puesto ? 'Acercarse · ' : '') + o.userData.label + ' ↓';
}
canvas.addEventListener('pointermove', (ev) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((ev.clientY - r.top) / r.height) * 2 - 1;
  if (ev.pointerType !== 'mouse') return;
  hover = pick(ev);
  hoverEst = hover && hover.userData.estacion || null; hoverWorker = hover && hover.userData.w || null;
  canvas.style.cursor = hover ? 'pointer' : '';
  etiquetas.forEach(([b]) => b.classList.toggle('hot', !!hover && hover.userData.estacion && ESTACIONES[hover.userData.estacion].etiqueta === b.textContent));
  const conEtq = hover && hover.userData.estacion && !hover.userData.w && ESTACIONES[hover.userData.estacion].etiqueta && innerWidth > 760;
  if (hover && !conEtq) { tip.hidden = false; tip.textContent = etiquetaDe(hover); tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; }
  else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; mouse.x = mouse.y = 0; hoverEst = null; hoverWorker = null; });
canvas.addEventListener('click', (ev) => {
  if (MOVIL()) return;
  const o = pick(ev); if (!o) return;
  if (o.userData.estacion) { abrirEstacion(o.userData.estacion, o.userData.w); return; }
  if (vista !== 'pantallas' && o.parent.parent === puesto) { setVista('pantallas'); tip.hidden = true; return; }
  const el = document.querySelector(o.userData.href); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
});

let visible = true, modo = 'humano';

/* ------------------------------------------------------------------ */
/*  Sonido: sintetizado en el navegador (sin archivos), bajo y posicional */
/* ------------------------------------------------------------------ */
const SON = { on: (() => { try { return localStorage.getItem('jpb-sonido') !== '0'; } catch (e) { return true; } })(), listo: false, listener: null, master: 0, pop: null };
const btnSon = document.getElementById('btn-sonido');
function pintarSon() { btnSon.classList.toggle('mute', !SON.on); btnSon.setAttribute('aria-pressed', SON.on); btnSon.setAttribute('aria-label', SON.on ? 'Silenciar sonido' : 'Activar sonido'); }
pintarSon();
function crearBuffer(ctx, seg, fill) { const sr = ctx.sampleRate, n = Math.floor(seg * sr), b = ctx.createBuffer(1, n, sr); fill(b.getChannelData(0), sr, n); return b; }
const ruido = () => Math.random() * 2 - 1;
function golpe(d, sr, t0, partes, amp, caida) { // golpe metálico: parciales inarmónicos + transiente
  const i0 = Math.floor(t0 * sr), n = Math.floor(sr * 1.6);
  for (let i = 0; i < n && i0 + i < d.length; i++) {
    const t = i / sr; let v = 0;
    partes.forEach(([f, a, k]) => (v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * k)));
    if (t < .006) v += ruido() * (1 - t / .006) * .8;
    d[i0 + i] += v * amp * Math.exp(-t * caida);
  }
}
function iniciarSonido() {
  if (SON.listo) return; SON.listo = true;
  const L = new THREE.AudioListener(); camera.add(L); SON.listener = L; L.setMasterVolume(0);
  const ctx = L.context;
  // murmullo de nave: ruido café grave + zumbido eléctrico (bucle de 6 s)
  const hum = crearBuffer(ctx, 6, (d, sr, n) => { let u = 0; for (let i = 0; i < n; i++) { u = (u + .02 * ruido()) / 1.02; const t = i / sr; d[i] = u * 2.4 + .05 * Math.sin(2 * Math.PI * 50 * t) + .025 * Math.sin(2 * Math.PI * 100 * t); } });
  // cinta: retumbe + golpecitos de rodillos
  const cinta = crearBuffer(ctx, 4, (d, sr, n) => { let u = 0; for (let i = 0; i < n; i++) { u = (u + .05 * ruido()) / 1.05; const t = i / sr, k = (t % .27) / .27; d[i] = u * 1.6 + (k < .04 ? ruido() * (1 - k / .04) * .18 : 0); } });
  // tecleo: ráfagas de teclas con pausas (bucle de 7 s, varias personas)
  const teclas = crearBuffer(ctx, 7, (d, sr) => {
    let t = .1; while (t < 6.9) {
      const rafaga = .6 + Math.random() * 1.6, fin = Math.min(6.9, t + rafaga);
      while (t < fin) { const i0 = Math.floor(t * sr), m = Math.floor(sr * .014), a = .35 + Math.random() * .45, tono = 2600 + Math.random() * 1600; let p = 0;
        for (let i = 0; i < m && i0 + i < d.length; i++) { const x = ruido(); d[i0 + i] += ((x - p) * .7 + .3 * Math.sin(2 * Math.PI * tono * i / sr)) * a * Math.exp(-i / sr * 380); p = x; }
        t += .07 + Math.random() * .12; }
      t += .4 + Math.random() * 1.3;
    }
  });
  // martillazos lejanos sobre metal, con eco de nave
  const martillo = crearBuffer(ctx, 8, (d, sr) => {
    const P = [[420, .5, 9], [1180, .35, 14], [2050, .22, 20], [3110, .12, 26]];
    for (const t0 of [.5, 1.15, 1.8, 2.45, 5.6, 6.3]) golpe(d, sr, t0, P, .55 + Math.random() * .25, 2);
    const eco = Math.floor(sr * .085); for (let i = d.length - 1; i >= eco; i--) d[i] += d[i - eco] * .35;
  });
  // servos de los robots: zumbido que sube y baja
  const servo = crearBuffer(ctx, 4, (d, sr, n) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = 160 + 70 * Math.sin(2 * Math.PI * t / 4); ph += 2 * Math.PI * f / sr; d[i] = (Math.sin(ph) * .5 + Math.sin(ph * 2.02) * .25) * (.4 + .6 * Math.abs(Math.sin(Math.PI * t / 2))); } });
  // pop suave cuando un lead se convierte en venta
  const pop = crearBuffer(ctx, .3, (d, sr, n) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = 620 + 520 * Math.min(1, t / .06); ph += 2 * Math.PI * f / sr; d[i] = Math.sin(ph) * Math.exp(-t * 16) * .8; } });
  const fuente = (buffer, pos, vol, ref = 4, loop = true) => {
    const a = pos ? new THREE.PositionalAudio(L) : new THREE.Audio(L);
    a.setBuffer(buffer); a.setLoop(loop); a.setVolume(vol);
    if (pos) { a.setRefDistance(ref); a.setRolloffFactor(1.6); a.panner.panningModel = 'equalpower'; const o = new THREE.Object3D(); o.position.set(...pos); scene.add(o); o.add(a); }
    if (loop) { a.offset = Math.random() * buffer.duration; a.play(); }
    return a;
  };
  fuente(hum, null, .06);
  fuente(cinta, [-.5, 1, -1], .4, 5);
  // tecleo de la oficina: una fuente por fila, fuerte de cerca y se apaga rápido al alejarse
  for (const z of [-11.2, -14.7]) { const a = fuente(teclas, [-17, 5.3, z], .95, 2.2); a.setRolloffFactor(2.4); }
  // el agente de WhatsApp teclea cada vez que aparece un mensaje
  const tecleoIA = crearBuffer(ctx, .9, (d, sr) => { let t = .02; while (t < .8) { const i0 = Math.floor(t * sr), m = Math.floor(sr * .012), a = .4 + Math.random() * .4; let p = 0; for (let i = 0; i < m && i0 + i < d.length; i++) { const x = ruido(); d[i0 + i] += (x - p) * a * Math.exp(-i / sr * 420); p = x; } t += .06 + Math.random() * .07; } });
  const aviso = crearBuffer(ctx, .35, (d, sr, n) => { for (let i = 0; i < n; i++) { const t = i / sr, f = t < .09 ? 880 : 1175; d[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-((t < .09 ? t : t - .09)) * 18) * .6; } });
  SON.tecleoIA = fuente(tecleoIA, [TOTEM.x, 2, TOTEM.z], .8, 2.5, false); SON.tecleoIA.setRolloffFactor(2);
  SON.aviso = fuente(aviso, [TOTEM.x, 2, TOTEM.z], .35, 2.5, false); SON.aviso.setRolloffFactor(2);
  fuente(martillo, [15.5, 1.4, -11.5], .5, 6);
  fuente(servo, [-4.2, 1.6, -2.6], .07, 3); fuente(servo, [2.8, 1.6, -2.6], .07, 3);
  SON.pop = fuente(pop, [TOTEM.x, 1.6, TOTEM.z], .22, 3, false);
}
// iPhone: que suene aunque el teléfono esté en modo silencio (como un video) y desbloquear con toques válidos
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
function despertarSonido() {
  if (!SON.on) return;
  iniciarSonido();
  const ctx = SON.listener && SON.listener.context; if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume();
  if (!SON.desbloqueado) { // un sonido mudo dentro del gesto desbloquea el audio en iOS
    SON.desbloqueado = true;
    const b = ctx.createBuffer(1, 1, ctx.sampleRate), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0);
  }
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, despertarSonido, { passive: true, capture: true }));
btnSon.addEventListener('click', () => { SON.on = !SON.on; try { localStorage.setItem('jpb-sonido', SON.on ? '1' : '0'); } catch (e) {} pintarSon(); if (SON.on) despertarSonido(); });
document.addEventListener('visibilitychange', () => { if (SON.listener) { if (document.hidden) SON.listener.context.suspend(); else if (SON.on) SON.listener.context.resume(); } });
function volumenSon(dt, activo) {
  if (!SON.listener) return;
  const meta = SON.on && activo ? .7 : 0;
  SON.master += (meta - SON.master) * Math.min(1, dt * 3);
  SON.listener.setMasterVolume(SON.master);
}
new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: .01 }).observe(section);
addEventListener('jpb-modo', (e) => { modo = e.detail; });

const ease = (v) => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
const easeOut = (v) => { v = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - v, 3); };
let clock = 0, last = performance.now(), buildStart = performance.now() - (reduce ? 60000 : 0), linesOff = false, lastPct = -1;
const robotPhase = robots.map(() => 0), P = new THREE.Vector3();
let beltPhase = 0, gruaZ = -11, carroX = 0;

const frustum = new THREE.Frustum(), PV = new THREE.Matrix4();
let lastRender = 0, fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (LOW && now - lastRender < 31) return;
  lastRender = now;
  const realDt = Math.max(0, (now - last) / 1000); const dt = Math.min(.05, realDt); last = Math.max(last, now);
  // la obra avanza con el reloj real, aunque la escena no se esté dibujando
  const t = (now - buildStart) / 1000;
  U.uLine.value = easeOut((t - .15) / (LOW ? 1.2 : 1.7)) * 1.06;
  U.uSolid.value = LOW ? ease((t - 1.0) / 4.2) * 1.1 : ease((t - 1.5) / 6.2) * 1.1;
  const pct = Math.round(Math.min(1, U.uSolid.value / 1.06) * 100);
  if (pct !== lastPct) {
    lastPct = pct;
    hudPct.textContent = pct < 100 ? pct + '%' : '';
    hudEstado.textContent = pct < 100 ? (t < 1.6 ? 'TRAZANDO PLANOS' : 'LEVANTANDO PLANTA') : 'PLANTA OPERATIVA · 24/7';
    navStatus.textContent = pct < 100 ? 'En obra' : 'Planta';
    section.classList.toggle('operativa', pct >= 100);
    if (pct >= 30 && MOVIL() && !recOn && !recStartAt && vista === 'planta') { msg.querySelector('p:last-child').textContent = 'Desliza para ver cada estación.'; recStartAt = rt + .4; }
  }
  volumenSon(realDt || .03, visible && modo === 'humano' && !document.hidden && t > 3);
  if (!visible || modo !== 'humano' || document.hidden) { fpsT = now; fpsN = 0; return; }
  clock += dt;
  const power = LOW ? ease((t - 1.8) / 3.2) : ease((t - 3) / 4.5);
  const done = t > (LOW ? 6.5 : 9.5);
  if (done !== linesOff) { linesOff = done; staticLines.visible = !done; dynLines.forEach((l) => (l.visible = !done)); }

  hemi.intensity = .1 * power;
  sun.intensity = (LOW ? 2.2 : 4.2) * power;
  hemi.intensity = (LOW ? .32 : .1) * power;
  lampLights.forEach((l, i) => { const fl = t < 8 ? (Math.sin(t * 40 + i * 9) > .2 ? 1 : .2) : 1; l.intensity = 48 * ease((t - (LOW ? 2.2 : 3.4) - i * .25) / 1.2) * fl; });
  ledLight.intensity = 55 * led.on; fillLight.intensity = 14 * power; ofiLight.intensity = 22 * power; deskLight.intensity = 0;
  beams.forEach(([m, o]) => (m.material.opacity = o * power));
  polvo.material.opacity = .55 * power;
  M.lamp.color.setHex(0xffe6b8).multiplyScalar(.1 + .55 * power);

  // --- pantallas ---
  pantallas.forEach((p) => {
    const k = (t - (LOW ? 4.2 : 6.2) - p.delay);
    p.on = k < 0 ? 0 : k < .5 ? (Math.random() > .45 ? 1 : .15) : 1;
    p.gris = (p.gris || 0) + ((hover && hover.userData.pantalla === p ? 1 : 0) - (p.gris || 0)) * Math.min(1, realDt * 10);
    const gv = p.on * (1 - .5 * p.gris);
    p.mat.color.setRGB(gv, gv, gv * (1 + .04 * p.gris));
    if (p.on > 0 && (p.acc > 5 || frustum.intersectsObject(p.mesh))) p.update(clock, dt);
  });

  rt = now / 1000;
  if (vista === 'recorrido' && RECORRIDO[ri].cine) {
    const ci = Math.min(2, Math.floor(Math.max(0, rt - pasoT0 - .4) / 3.1));
    if (ci !== cineI) { cineI = ci; card.querySelector('.est-kicker').textContent = 'PASO 2 · ' + RECORRIDO[ri].cine[ci]; }
  }
  if (recStartAt && rt > recStartAt) { recStartAt = 0; if (vista === 'planta') iniciarRecorrido(); }
  if (recOn && rt > recNext) { if (ri < RECORRIDO.length - 1 || MOVIL()) paso(1, false); else { recNext = Infinity; anilloTiempo(0); } }
  // Diego destaca: anillo que late y foco propio
  const lat = .5 + .5 * Math.sin(rt * 3);
  anillo.material.opacity = (vista === 'planta' ? .55 : .2) * power * (.5 + .5 * lat); anillo.scale.setScalar(1 + .12 * lat);
  focoDiego.intensity = (LOW ? 6 : 40) * power;

  // --- interacción: activación de estaciones ---
  const kA = 1 - Math.exp(-realDt * 6);
  let focoAct = 0;
  for (const [k, e] of Object.entries(ESTACIONES)) {
    const target = (hoverEst === k && k !== 'equipo') || sel === k ? 1 : 0;
    act[k] += (target - act[k]) * kA;
    e.hov = (e.hov || 0) + ((hoverEst === k ? 1 : 0) - (e.hov || 0)) * kA;
    if (e.outline) { e.outline.material.opacity = e.hov * .85; if (act[k] > focoAct) { focoAct = act[k]; foco.position.set(e.c[0], e.c[1] + 3, e.c[2] + 2); } }
  }
  trabajadores.forEach((w) => {
    const target = hoverWorker === w || selWorker === w ? 1 : 0;
    w.act += (target - w.act) * kA; w.hov = (w.hov || 0) + ((hoverWorker === w ? 1 : 0) - (w.hov || 0)) * kA; w.outline.material.opacity = w.hov * .85;
    if (w.act > focoAct) { focoAct = w.act; w.g.getWorldPosition(P); foco.position.set(P.x, P.y + 3, P.z + 1.5); }
  });
  foco.intensity = 30 * focoAct * power;
  const flujo = Math.max(act.prospeccion, act.ia, act.ventas);

  // --- línea: leads entran, la IA los convierte, salen ventas ---
  const vel = .9 * (1 + 1.6 * flujo);
  beltTex.offset.x -= dt * vel / (17 / 26);
  cajas.forEach((c) => {
    c.position.x += dt * vel;
    if (c.material === M.lead && c.position.x > TOTEM.x) { c.material = M.venta; c.scale.setScalar(1.12); if (SON.pop && SON.master > .05) { if (SON.pop.isPlaying) SON.pop.stop(); SON.pop.play(); } }
    c.scale.lerp(V.set(1, 1, 1), kA * .5);
    if (c.position.x > beltX1 + .4) { c.position.x -= (beltX1 - beltX0) + 1.2; c.material = M.lead; ventas++; hudVentas.textContent = ventas; }
    c.position.y = beltY + .24 + (act.prospeccion > .1 && c.position.x < -7 ? Math.abs(Math.sin(clock * 14 + c.position.x)) * .05 * act.prospeccion : 0);
  });
  robots.forEach((r, i) => {
    robotPhase[i] += dt * 1.3 * (1 + 2.2 * act.ia);
    const a = robotPhase[i] + r.off;
    r.turret.rotation.y = Math.sin(a * .5) * 1.4;
    r.shoulder.rotation.x = .45 + .35 * Math.sin(a);
    r.elbow.rotation.x = 1.05 + .45 * Math.sin(a + 1.2);
    r.wrist.rotation.x = .3 * Math.sin(a + 2);
  });
  // la grúa acude a la estación activa
  const enPiso = (k) => k && ESTACIONES[k].c && k !== 'oficina';
  const est = enPiso(sel) ? ESTACIONES[sel] : enPiso(hoverEst) ? ESTACIONES[hoverEst] : null;
  const gz = est ? Math.min(-2, est.c[2]) : -11 + Math.sin(clock * .08) * 4, gx = est ? est.c[0] : Math.sin(clock * .13 + 1) * 13;
  gruaZ += (gz - gruaZ) * kA * .35; carroX += (gx - carroX) * kA * .35;
  grua.position.z = gruaZ; carro.position.x = carroX;
  baliza.forEach((b, i) => {
    const fiesta = act.ventas > .2 ? (Math.sin(clock * 12 + i * 2) > 0 ? 1 : .15) : null;
    const on = fiesta ?? (i === 2 ? .6 + .4 * Math.sin(clock * 3) : (i === 1 && Math.sin(clock * 2.2) > .7 ? 1 : .12));
    b.material.color.copy(b.userData.c).multiplyScalar(on * power);
  });
  // trabajadores: uno camina por el pasillo, los demás se mueven en su lugar y saludan si los tocas
  trabajadores.forEach((w, i) => {
    if (w.real) {
      if (w.camina) {
        w.dir = w.dir || 1;
        const x = w.g.position.x + dt * w.v * w.dir * (w.act > .5 ? 0 : 1);
        if (x > w.x1 || x < w.x0) w.dir *= -1;
        w.g.position.x = Math.min(w.x1, Math.max(w.x0, x));
        w.g.rotation.y += ((w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - w.g.rotation.y) * kA;
      }
      animarReal(w, clock, dt);
      return;
    }
    if (w.camina) {
      w.dir = w.dir || 1;
      const x = w.g.position.x + dt * w.v * w.dir * (w.act > .5 ? 0 : 1);
      if (x > w.x1 || x < w.x0) w.dir *= -1;
      w.g.position.x = Math.min(w.x1, Math.max(w.x0, x));
      w.g.rotation.y += ((w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - w.g.rotation.y) * kA;
      const sw = w.act > .5 ? 0 : Math.sin(clock * 6.5) * .5;
      w.hipL.rotation.x = sw; w.hipR.rotation.x = -sw; w.shL.rotation.x = -sw * .8;
      w.kneeL.rotation.x = Math.max(0, -Math.sin(clock * 6.5 - .9)) * .7 * (1 - w.act); w.kneeR.rotation.x = Math.max(0, Math.sin(clock * 6.5 - .9)) * .7 * (1 - w.act);
      w.shR.rotation.x = sw * .8 * (1 - w.act);
    } else if (w.sentado) {
      w.elL.rotation.x = -.75 + Math.sin(clock * 13 + w.idle) * .06; w.elR.rotation.x = -.75 + Math.sin(clock * 11 + w.idle * 2) * .06 * (1 - w.act);
      w.shR.rotation.x = -.75 * (1 - w.act);
    } else {
      const b = Math.sin(clock * 1.4 + w.idle) * .06;
      w.shL.rotation.x = b; w.shR.rotation.x = -b * (1 - w.act);
    }
    w.pecho.scale.y = 1 + Math.sin(clock * 1.9 + (w.idle || 0)) * .012;
    if (w.jefe) { w.shL.rotation.x = -.55; w.elL.rotation.x = -1.15 + Math.sin(clock * .8) * .05; }
    // saludo: el brazo sube hacia afuera (nunca cruza la cabeza) y el antebrazo se mueve
    w.shR.rotation.z = -.07 + w.act * 2.3;
    w.elR.rotation.z = w.act * (.6 + Math.sin(clock * 8) * .32);
    w.cab.rotation.y = Math.sin(clock * .5 + (w.idle || 0)) * .35 * (1 - w.act);
  });
  if (SON.tecleoIA && SON.master > .05) {
    const nMsg = Math.floor((clock % 14) / 1.8);
    if (nMsg !== SON.nMsg) { SON.nMsg = nMsg; const bot = [0, 1, 0, 1, 0, 1][Math.min(nMsg, 5)];
      if (nMsg <= 5) { const s = bot ? SON.tecleoIA : SON.aviso; if (s.isPlaying) s.stop(); s.play(); if (bot) setTimeout(() => { if (SON.aviso.isPlaying) SON.aviso.stop(); SON.aviso.play(); }, 900); } }
  }
  if (diego.real) {
    diego.tel = (diego.tel || 0) + ((diego.telMeta || 0) - (diego.tel || 0)) * Math.min(1, realDt * 4);
    telefono.visible = diego.tel > .35;
    if (telefono.visible) {
      diego.huesos.RightHand.getWorldPosition(P); diego.huesos.RightHandMiddle1.getWorldPosition(V);
      P.lerp(V, .85); const hacia = V.copy(camera.position).sub(P).normalize();
      telefono.position.copy(P).addScaledVector(hacia, .025); telefono.lookAt(camera.position); telefono.scale.setScalar(1.15);
    }

  }
  const pp = polvo.geometry.attributes.position;
  for (let i = 0; i < pp.count; i += 7) { pp.array[i * 3 + 1] += dt * .06; if (pp.array[i * 3 + 1] > 11) pp.array[i * 3 + 1] = 0; }
  pp.needsUpdate = true;

  // --- cámara ---
  const v = views[vista]();
  const k = 1 - Math.exp(-Math.min(.25, realDt) * (vista === 'recorrido' && RECORRIDO[ri].cine ? 3.6 : 2));
  mouse.sx += (mouse.x - mouse.sx) * k; mouse.sy += (mouse.y - mouse.sy) * k;
  const drift = vista === 'planta' ? 1 : .25;
  cam.pos.lerp(V.set(...v.pos), k); cam.look.lerp(V.set(...v.look), k); cam.fov += (v.fov - cam.fov) * k;
  camera.position.copy(cam.pos).add(V.set((Math.sin(clock * .09) * .7 + mouse.sx * .9) * drift, (Math.sin(clock * .13) * .18 - mouse.sy * .35) * drift, 0));
  camera.lookAt(cam.look);
  if (Math.abs(camera.fov - cam.fov) > .01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }

  // --- etiquetas flotantes de la línea ---
  const showEt = vista === 'planta' && pct >= 100;
  const W = section.clientWidth, H = section.clientHeight;
  etiquetas.forEach(([b, p3]) => {
    if (p3) P.copy(p3); else diego.g.getWorldPosition(P).add(V.set(0, 2.25, 0));
    P.project(camera);
    const on = showEt && P.z < 1 && Math.abs(P.x) < .95 && Math.abs(P.y) < .95;
    b.classList.toggle('on', on);
    if (on) b.style.transform = `translate(${((P.x + 1) / 2 * W).toFixed(1)}px, ${((1 - P.y) / 2 * H).toFixed(1)}px) translate(-50%, -100%)`;
  });

  PV.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(PV);
  renderer.render(scene, camera);
  // resolución adaptativa: baja si el equipo no da, sube si sobra
  fpsN++; if (now - fpsT > 2500) {
    const fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now;
    const meta = LOW ? 24 : 50, alto = LOW ? 29.5 : 58, piso = LOW ? 1.25 : .75;
    if (t > 10 && fps < meta && DPR > piso) { DPR = Math.max(piso, DPR - .25); renderer.setPixelRatio(DPR); resize(); U.uBlock.value = 7 * DPR; }
    else if (t > 10 && fps > alto && DPR < DPR_MAX) { DPR = Math.min(DPR_MAX, DPR + .25); renderer.setPixelRatio(DPR); resize(); U.uBlock.value = 7 * DPR; }
  }
}
requestAnimationFrame(frame);
