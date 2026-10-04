// BLUEBIRD flight sequence: as the pinned #flight section scrolls past, the camera flies from straight overhead to a
// side profile while the aircraft performs: the prop unfolds (motor on), then the split elevons open as the crow
// airbrake and the prop folds for landing. Model frame (glTF): x = right wing, y = up, z = aft, metres, origin at
// the CG; nose toward -z. Pivots and axes come from the CAD (assets/bluebird_rig.json).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createSubsystemFilter } from "./subsystems.js?v=1";
import { STOPS } from "./tour.js?v=24";
import { SHOTS, FILM } from "./shots.js?v=43";

const ASSET_VERSION = "11";                                    // bump when the model is rebuilt (cache busting)
const canvas = document.getElementById("view");
const stage = canvas.parentElement;
const flight = document.getElementById("flight");
const phaseLabel = document.getElementById("phase-label");
const phaseNum = document.getElementById("phase-num");
const phaseTotal = document.getElementById("phase-total");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// scroll timeline, in vh of scroll: the flight sequence, then the x-ray tour (skin fades, the camera visits each
// subsystem in tour.js and pulls back out before the next), then the skin returns
const FLIGHT_VH = 320, INTRO_VH = 300, STOP_VH = 125, OUTRO_VH = 80;
const SCROLL_VH = FLIGHT_VH + INTRO_VH + STOPS.length * STOP_VH + OUTRO_VH;
flight.style.height = `${SCROLL_VH + 100}vh`;

function hasWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}
const webgl = hasWebGL();
if (!webgl) { canvas.hidden = true; document.getElementById("still").hidden = false; }

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;           // PCF honours shadow.radius (soft edges)
renderer.setClearColor(0x000000, 0);                          // the stage's CSS supplies the black

// ---- studio light on black: a warm key from high front-left (soft self-shadows), a cool rim that stays behind the
// aircraft as seen from the camera (edge glow), and a soft fill that rides with the camera so every face the viewer
// sees reads clearly (fins included). Contrast comes from key vs fill, not from leaving parts unlit.
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;                            // soft reflections: gives the white skin its shape
const key = new THREE.SpotLight(0xfff3e6, 24, 16, THREE.MathUtils.degToRad(28), 0.75, 1.2);
key.position.set(-3.0, 2.6, -1.4);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.near = 1.5; key.shadow.camera.far = 7;
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.025;                               // no acne/sawtooth on the curved skin
key.shadow.radius = 4;
const rim = new THREE.DirectionalLight(0xd6ecff, 1.9);
const rim2 = new THREE.DirectionalLight(0x7fbde8, 0.9);
const camFill = new THREE.DirectionalLight(0xe8f2ff, 0.7);   // from just above-left of the camera
const fill = new THREE.HemisphereLight(0x9cc4e4, 0x1a2430, 0.22);
scene.add(key, key.target, rim, rim.target, rim2, rim2.target, camFill, camFill.target, fill);
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3();
function placeRim() {                                          // rim lights sit behind the model as seen from the camera
  _v.copy(camera.position).normalize();
  rim.position.set(-_v.x * 4 + 0.8, -_v.y * 4 + 2.5, -_v.z * 4);
  rim2.position.set(-_v.x * 4 - 1.5, -_v.y * 4 - 0.5, -_v.z * 4 + 1.0);
  _u.copy(camera.up).multiplyScalar(0.35);
  camFill.position.copy(camera.position).add(_u).add(_w.crossVectors(camera.up, _v).multiplyScalar(-0.4));
}



const aircraft = new THREE.Group();
scene.add(aircraft);
const rig = { elevons: {}, blades: {} };           // pivot Object3D + axis + limits, filled after load

// ---------------------------------------------------------------- choreography
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => t * t * (3 - 2 * t);
const seg = (p, a, b) => ease(clamp01((p - a) / (b - a)));          // 0 -> 1 across [a, b]
const PHASES = [
  [0.00, "01", "Glide · prop folded"],
  [0.14, "02", "Motor on · prop unfolds"],
  [0.60, "03", "Approach · crow airbrake"],
];
// pose at scroll progress p: fold (deg, 0 = running), roll elevon (TE-down deg, + = right wing down), crow (0..1), bank (rad)
function poseAt(p) {
  const unfold = seg(p, 0.14, 0.30), refold = seg(p, 0.86, 0.98);
  return { fold: 88 * (1 - unfold + refold), roll: 0, bank: 0, crow: seg(p, 0.64, 0.82) };
}
const POSES = { glide: { fold: 88, roll: 0, bank: 0, crow: 0 }, cruise: { fold: 0, roll: 0, bank: 0, crow: 0 },
  airbrake: { fold: 88, roll: 0, bank: 0, crow: 1 } };

const _q = new THREE.Quaternion();
const clock = new THREE.Clock();
function applyPose(pose) {
  for (const b of Object.values(rig.blades)) {
    b.node.quaternion.setFromAxisAngle(b.axis, THREE.MathUtils.degToRad(pose.fold * b.sign));
  }
  for (const [name, e] of Object.entries(rig.elevons)) {
    const upper = name.includes("upper"), right = name.endsWith("_R");
    // crow: uppers trailing edge up 30.6 deg, lowers down 18.6 deg (DSPOILER_CROW W1 51 / W2 31, set by the CFD trim study,
    // docs/crow_trim.md); roll: right TE up, left TE down
    const crow = pose.crow * (upper ? -30.6 : 18.6);
    const roll = (right ? -1 : 1) * pose.roll;
    let te = THREE.MathUtils.clamp(crow + roll + (pose.pitch ?? 0), e.min, e.max);
    e.node.quaternion.setFromAxisAngle(e.axis, THREE.MathUtils.degToRad(te * e.sign));
  }
  aircraft.rotation.z = pose.bank;
  // neutral surfaces: show the closed skin and hide the moving pieces (no hinge-gap specks)
  const moving = pose.crow > 0.004 || Math.abs(pose.roll) > 0.05 || Math.abs(pose.pitch ?? 0) > 0.05;
  for (const m of skins.closed) m.visible = !moving;
  for (const m of skins.cut) m.visible = moving;
  for (const e of Object.values(rig.elevons)) e.node.visible = moving;
}
const skins = { closed: [], cut: [] };

// x-ray state: skin materials fade, edge lines trace the outer mould line, internals (bluebird_inside.glb) light up
// by subsystem. Appendages of the main model join the subsystem they belong to.
const APP_SYS = [[/^prop_|^motor$/, "propulsion"], [/^sled_|^skeg$/, "landing"], [/^cam_guard_|^pitot$/, "sensors"],
  [/^fin_|^tip_rib_/, "structure"], [/^elevon_/, "controls"]];
const X = { ready: false, skinMats: [], elevonMats: [], appMats: {}, app: {}, edges: [], casters: [], inside: null,
  sysMats: {}, base: {}, accent: {}, stopViews: [],
  edgeMat: new THREE.LineBasicMaterial({ color: 0x8dc4e6, transparent: true, opacity: 0, depthWrite: false }) };
for (const st of STOPS) X.accent[st.sys] = new THREE.Color(st.color);
X.accent.foam = X.accent.structure; X.accent.shell = X.accent.structure;
const subsystemFilter = createSubsystemFilter({ stage, stops: STOPS, openInspection, isolateSubsystem });
let isolatedSystem = null;
const isolationVisibility = new Map();
function restoreIsolationVisibility() {
  for (const [node, visible] of isolationVisibility) node.visible = visible;
  isolationVisibility.clear();
}
function applyIsolation() {
  if (!isolatedSystem) return;
  beams.visible = false;
  aircraft.traverse(node => {
    if (!node.isMesh && !node.isLineSegments) return;
    isolationVisibility.set(node, node.visible);
    node.visible = node.visible && node.userData.subsystem === isolatedSystem;
    if (node.visible) for (const m of Array.isArray(node.material) ? node.material : [node.material]) {
      m.opacity = 1; m.transparent = false; m.depthWrite = true;
    }
  });
}
const BLACK = new THREE.Color(0);
function applyXray(st) {
  const x = st.xray, cur = st.stop >= 0 ? STOPS[st.stop].sys : null, f = st.focus;
  const skinOp = (1 - 0.94 * x) * (1 - 0.8 * (st.explode ?? 0));
  for (const m of X.skinMats) { m.transparent = x > 0.001; m.opacity = skinOp; m.depthWrite = x < 0.35; }
  for (const m of X.elevonMats) {
    const up = cur === "controls" ? 0.92 * f : 0;
    m.transparent = x > 0.001; m.opacity = Math.max(skinOp, up); m.depthWrite = x < 0.35 || up > 0.5;
  }
  X.edgeMat.opacity = 0.42 * x;
  for (const e of X.edges) e.visible = x > 0.01;
  for (const [sys, mats] of Object.entries(X.appMats)) for (const m of mats) {
    const dim = cur && cur !== sys ? 0.75 * f : 0;
    m.transparent = dim > 0.001; m.opacity = 1 - dim; m.depthWrite = dim < 0.5;
    if (m.emissive) m.emissive.copy(X.accent[sys] ?? BLACK).multiplyScalar(cur === sys ? 0.3 * f : 0);
  }
  if (X.inside) {
    X.inside.visible = x > 0.01;
    for (const [sys, m] of Object.entries(X.sysMats)) {
      const on = cur === sys || (cur === "structure" && sys === "foam");
      const mix = on ? 0.7 + 0.3 * f : 0.7 * (1 - (cur ? f : 0));     // overview: every module in its colour
      m.color.copy(X.base[sys]).lerp(X.accent[sys] ?? X.base[sys], mix);
      m.emissive.copy(X.accent[sys] ?? BLACK).multiplyScalar(on ? 0.28 * f : 0);
      const op = x * (sys === "shell" ? 0.025 + 0.4 * (st.explode ?? 0) : sys === "foam" ? 0.05 + 0.13 * (st.explode ?? 0) + (on ? 0.12 * f : 0) : 1 - (cur && !on ? 0.88 * f : 0));
      m.opacity = op; m.transparent = op < 0.999; m.depthWrite = op > 0.6 && sys !== "foam";
    }
  }
  for (const o of X.casters) o.castShadow = x < 0.3;
}

const exploded = [];
let explosionAmount = 0;
function initExploded() {
  aircraft.updateMatrixWorld(true);
  aircraft.traverse(o => {
    if (!o.isMesh || o.name.startsWith("skin_") || o.name.startsWith("prop_")) return;
    const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3());
    const sys = o.name.match(/^x_([a-z]+)__/)?.[1];
    const delta = new THREE.Vector3();
    if (Math.abs(c.x) > 0.20) delta.x = Math.sign(c.x) * 0.22;
    else if (sys === "shell") {
      if (/hatch|cover/.test(o.name)) delta.y = 0.32;
      else { delta.x = Math.sign(c.x || 1) * 0.16; delta.y = 0.06; }
    } else if (sys === "compute") delta.y = /phone/.test(o.name) ? 0.25 : 0.15;
    else if (sys === "power") delta.y = /battery|pack/.test(o.name) ? 0.095 : -0.08;
    else if (sys === "sensors") { delta.z = -0.12; delta.y = -0.10; }
    else if (sys === "comms" || sys === "compliance") { delta.x = Math.sign(c.x || 1) * 0.15; delta.y = 0.16; }
    else if (sys === "landing" || /^sled_|^skeg$/.test(o.name)) delta.y = -0.15;
    else if (sys === "propulsion" || o.name === "motor") delta.z = 0.10;
    exploded.push({ node: o, base: o.position.clone(), delta });
  });
}
function applyExploded(amount) {
  explosionAmount = amount;
  for (const e of exploded) e.node.position.copy(e.base).addScaledVector(e.delta, amount);
}

// ---------------------------------------------------------------- camera path
const KEYS = [
  { p: 0.00, dir: new THREE.Vector3(0, 1, 0.0001).normalize(), dist: 1.02, up: new THREE.Vector3(0, 0, -1), look: new THREE.Vector3(0, 0, 0.02) },
  { p: 0.40, dir: new THREE.Vector3(0.75, 0.62, -0.55).normalize(), dist: 1.05, up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(0, 0.02, 0) },
  { p: 0.74, dir: new THREE.Vector3(0.32, 0.5, 0.8).normalize(), dist: 0.58, up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(0.32, 0, 0.14) },   // behind the right wing: crow
  { p: 1.00, dir: new THREE.Vector3(0.86, 0.2, 0.46).normalize(), dist: 0.66, up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(0.05, 0.02, 0.05) },  // low side-rear
];
function cameraAt(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = ease(clamp01((p - a.p) / (b.p - a.p)));
  return { dir: a.dir.clone().lerp(b.dir, t).normalize(), up: a.up.clone().lerp(b.up, t).normalize(),
           dist: THREE.MathUtils.lerp(a.dist, b.dist, t), look: a.look.clone().lerp(b.look, t) };
}
function fitDistance() {                                   // fits the 1.88 m span (fins) plus margin in either orientation
  const span = 2.3, vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  return (span / 2) / Math.tan(Math.min(hFov, vFov * 1.12) / 2);
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------- scroll
let target = 0, progress = 0;
const pinned = new URLSearchParams(location.search).get("p");      // ?p=0.5 pins the sequence (thumbnails)
const recording = new URLSearchParams(location.search).has("rec");   // ?rec: frames are driven by __bluebird.recFrame
function readScroll() {
  const r = flight.getBoundingClientRect();
  target = clamp01(-r.top / (flight.offsetHeight - window.innerHeight));
}
if (pinned !== null) target = progress = clamp01(parseFloat(pinned) || 0);
else { window.addEventListener("scroll", readScroll, { passive: true }); readScroll(); }

// ---------------------------------------------------------------- timeline state
const V3 = (...a) => new THREE.Vector3(...a);
const camState = (pos, look, up) => ({ pos, look, up });
function flightCam(pf) {
  const { dir, up, dist, look } = cameraAt(pf);
  return camState(look.clone().add(dir.multiplyScalar(dist * fitDistance())), look, up);
}
const OV_DIR = V3(-0.55, 0.72, -0.42).normalize();
function overviewCam(explode = 0) {
  const look = V3(0, 0, 0.03);
  return camState(look.clone().addScaledVector(OV_DIR, (0.96 + 0.20 * explode) * fitDistance()), look, V3(0, 1, 0));
}
function stopCam(i) {
  const v = X.stopViews[i];
  if (!v) return overviewCam();
  const vFov = THREE.MathUtils.degToRad(camera.fov), hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dist = Math.max(v.minDist, (v.radius / Math.sin(Math.min(vFov, hFov * 0.72) / 2)) * 1.02 * v.zoom);
  return camState(v.center.clone().addScaledVector(v.dir, dist), v.center.clone(), V3(0, 1, 0));
}
const lerpCam = (a, b, t) => camState(a.pos.clone().lerp(b.pos, t), a.look.clone().lerp(b.look, t), a.up.clone().lerp(b.up, t).normalize());
const pad2 = (n) => String(n).padStart(2, "0");
function stateAt(P) {
  const pos = P * SCROLL_VH;
  if (pos <= FLIGHT_VH || !X.ready) {
    const pf = Math.min(1, pos / FLIGHT_VH);
    let k = 0;
    while (k < PHASES.length - 1 && pf >= PHASES[k + 1][0]) k++;
    return { pose: poseAt(pf), cam: flightCam(pf), xray: 0, stop: -1, focus: 0, act: 0, card: 0, legend: 0, hud: [PHASES[k][1], "03", PHASES[k][2]] };
  }
  let t = pos - FLIGHT_VH;
  const n = pad2(STOPS.length);
  if (t < INTRO_VH) {                                                  // fade to x-ray, then hold on the colour-coded overview
    const a = seg(t, 0, INTRO_VH * 0.55);
    return { pose: { fold: 88, roll: 0, bank: 0, crow: 1 - a }, cam: lerpCam(flightCam(1), overviewCam(seg(t, INTRO_VH * 0.35, INTRO_VH * 0.65)), a),
             explode: seg(t, INTRO_VH * 0.35, INTRO_VH * 0.65),
             xray: seg(t, 0, INTRO_VH * 0.4), stop: -1, focus: 0, act: 0, card: 0, legend: seg(t, INTRO_VH * 0.45, INTRO_VH * 0.62),
             hud: ["00", n, t > INTRO_VH * 0.45 ? "Exploded overview · select a system or scroll" : "Inside BLUEBIRD · select a system or scroll"] };
  }
  t -= INTRO_VH;
  if (t < STOPS.length * STOP_VH) {
    const i = Math.floor(t / STOP_VH), s = (t - i * STOP_VH) / STOP_VH, st = STOPS[i];
    const focus = seg(s, 0, 0.3) * (1 - seg(s, 0.76, 1));
    const act = seg(s, 0.2, 0.34) * (1 - seg(s, 0.72, 0.86));          // demonstrations run while in focus (see draw)
    return { pose: { fold: 88, roll: 0, bank: 0, crow: 0 }, cam: lerpCam(overviewCam(i === 0 ? 1 - seg(s, 0, 0.25) : 0), stopCam(i), focus), xray: 1, stop: i,
             explode: i === 0 ? 1 - seg(s, 0, 0.25) : 0,
             focus, act, card: seg(s, 0.18, 0.3) * (1 - seg(s, 0.72, 0.84)), legend: i === 0 ? 1 - seg(s, 0, 0.15) : 0,
             hud: [pad2(i + 1), n, `Inside \u00b7 ${st.title}`] };
  }
  t -= STOPS.length * STOP_VH;
  const b = seg(t, 0, OUTRO_VH);
  return { pose: { fold: 88, roll: 0, bank: 0, crow: 0 }, cam: lerpCam(overviewCam(), flightCam(1), b), xray: 1 - b,
           stop: -1, focus: 0, act: 0, card: 0, legend: 0, hud: [n, n, "BLUEBIRD"] };
}
// ---------------------------------------------------------------- demonstrations (time-based, looped while a stop is in focus)
// control surfaces: [time s, pitch (TE-down deg), roll (deg, + = roll right), crow (0..1), caption]
const CTRL_KF = [[0, 0, 0, 0, "Neutral"], [1.0, 0, 0, 0, "Neutral"], [1.8, -20, 0, 0, "Pitch up: both halves trailing edge up"],
  [2.9, -20, 0, 0, "Pitch up: both halves trailing edge up"], [3.7, 20, 0, 0, "Pitch down: trailing edges down"],
  [4.8, 20, 0, 0, "Pitch down: trailing edges down"], [5.6, 0, 20, 0, "Roll right: right up, left down"],
  [6.7, 0, 20, 0, "Roll right: right up, left down"], [7.5, 0, -20, 0, "Roll left: left up, right down"],
  [8.6, 0, -20, 0, "Roll left: left up, right down"], [9.5, 0, 0, 1, "Crow airbrake: upper halves 31\u00b0 up, lower 19\u00b0 down"],
  [11.2, 0, 0, 1, "Crow airbrake: upper halves 31\u00b0 up, lower 19\u00b0 down"], [12.0, 0, 0, 0, "Neutral"]];
function controlsAnim(t) {
  t %= CTRL_KF[CTRL_KF.length - 1][0];
  let k = 0;
  while (k < CTRL_KF.length - 2 && t >= CTRL_KF[k + 1][0]) k++;
  const a = CTRL_KF[k], b = CTRL_KF[k + 1], u = ease(clamp01((t - a[0]) / (b[0] - a[0])));
  const L = (i) => a[i] + (b[i] - a[i]) * u;
  return { pitch: L(1), roll: L(2), crow: L(3), label: u > 0.5 ? b[4] : a[4] };
}
// prop: motor off -> spin-up (centrifugal force swings the blades out) -> run -> brake -> airflow folds the blades
const W_MAX = 2.6 * 2 * Math.PI, PROP_T = 6.6;
function propAnim(t) {
  t %= PROP_T;
  const up0 = 0.8, up1 = 1.7, br0 = 4.0, br1 = 4.5, f0 = 4.6, f1 = 5.6;
  let angle, w;
  const aUp = (W_MAX * (up1 - up0)) / 2, aRun = aUp + W_MAX * (br0 - up1);
  if (t < up0) { angle = 0; w = 0; }
  else if (t < up1) { const x = t - up0; w = (W_MAX * x) / (up1 - up0); angle = (W_MAX * x * x) / (2 * (up1 - up0)); }
  else if (t < br0) { w = W_MAX; angle = aUp + W_MAX * (t - up1); }
  else if (t < br1) { const x = t - br0; w = W_MAX * (1 - x / (br1 - br0)); angle = aRun + W_MAX * (x - (x * x) / (2 * (br1 - br0))); }
  else { w = 0; angle = aRun + (W_MAX * (br1 - br0)) / 2; }
  const open = t < up0 ? 0 : t < f0 ? Math.min(1, (w / W_MAX) ** 2 * 1.6 + (t > up1 ? 1 : 0)) : 1 - ease(clamp01((t - f0) / (f1 - f0)));
  const label = t < up0 ? "Motor off: blades folded" : t < up1 ? "Motor starts: centrifugal force swings the blades out"
    : t < br0 ? "Running: 11\u00d77 prop, 23 N static thrust" : t < f0 ? "Motor stops: the ESC brake holds the hub"
    : t < f1 ? "Airflow folds the blades back" : "Folded for landing";
  return { fold: 88 * (1 - clamp01(open)), angle, label };
}
const beams = new THREE.Group();                                        // camera fields of view, drawn shortened
beams.visible = false;
function makeBeam(apex, hfov, vfov, len, color) {
  const hx = len * Math.tan(THREE.MathUtils.degToRad(hfov / 2)), hz = len * Math.tan(THREE.MathUtils.degToRad(vfov / 2));
  const c = [V3(-hx, -len, -hz), V3(hx, -len, -hz), V3(hx, -len, hz), V3(-hx, -len, hz)];
  const g = new THREE.BufferGeometry();
  const tri = [];
  for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; tri.push(0, 0, 0, a.x, a.y, a.z, b.x, b.y, b.z); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3));
  const fill = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  const edges = [];
  for (const p of c) edges.push(0, 0, 0, p.x, p.y, p.z);
  for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; edges.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
  const line = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }));
  const grp = new THREE.Group(); grp.add(fill, line); grp.position.copy(apex);
  grp.userData.mats = [fill.material, line.material];
  beams.add(grp);
}
// lens centres from the CAD placement boxes (aircraft x aft, y right, z up, mm -> glTF metres about the CG at x 313)
const cadToGl = (x, y, z) => V3(y / 1000, z / 1000, (x - 313) / 1000);
makeBeam(cadToGl(134.5, 66, -16), 73.3, 60.9, 0.95, 0xcfe8ff);          // RGB 12 MP: 73.3 x 60.9 deg
makeBeam(cadToGl(140, -60, -14), 56, 42, 0.95, 0xff9a6b);               // thermal 256 x 192: about 56 x 42 deg
aircraft.add(beams);
const propSpin = new THREE.Group();                                     // the hub, yoke, pins and blade pivots spin together
let lastHud = "";
function updateHud(h) {
  const k = h.join("|");
  if (k === lastHud) return;
  lastHud = k; phaseNum.textContent = h[0]; phaseTotal.textContent = h[1]; phaseLabel.textContent = h[2];
}
const card = stage.querySelector(".tour-card");
let lastCard = -1;
function updateCard(st) {
  if (st.stop >= 0 && st.stop !== lastCard) {
    const s = STOPS[st.stop];
    lastCard = st.stop;
    card.style.setProperty("--sys", `#${new THREE.Color(s.color).getHexString()}`);
    card.querySelector(".tc-kicker").textContent = `Subsystem ${pad2(st.stop + 1)} / ${pad2(STOPS.length)}`;
    card.querySelector(".tc-title").textContent = s.title;
    card.querySelector(".tc-text").textContent = s.text;
    card.querySelector(".tc-specs").innerHTML = s.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  }
  card.style.opacity = st.card;
  card.style.visibility = st.card > 0.01 ? "visible" : "hidden";
  card.style.setProperty("--lift", `${(1 - st.card) * 14}px`);
  skip.hidden = !(st.xray > 0.15);
  tourActions.hidden = !(st.xray > 0.15);
  tourActions.querySelector("select").value = st.stop < 0 ? "" : String(st.stop);
}
const skip = stage.querySelector(".skip");
const legend = stage.querySelector(".tour-legend");
const tourActions = stage.querySelector(".tour-actions");
tourActions.querySelector("select").innerHTML = '<option value="">Choose a subsystem</option>' + STOPS.map((s,i) => `<option value="${i}">${s.title}</option>`).join("");
function jumpToTour(i = -1) {
  if (controls) closeViewer();
  const vh = FLIGHT_VH + (i < 0 ? INTRO_VH * 0.8 : INTRO_VH + (i + 0.45) * STOP_VH);
  const y = flight.getBoundingClientRect().top + scrollY + vh * innerHeight / 100;
  window.scrollTo({ top: y, behavior: reduceMotion ? "instant" : "smooth" });
}
tourActions.querySelector("select").addEventListener("change", ev => { if (ev.target.value !== "") jumpToTour(Number(ev.target.value)); });
tourActions.querySelector("button").addEventListener("click", () => jumpToTour());
legend.innerHTML = STOPS.map((s) => `<li><button type="button" data-system="${s.sys}"><i style="background:#${new THREE.Color(s.color).getHexString()}"></i>${s.title}</button></li>`).join("");

legend.addEventListener("click", ev => { const b = ev.target.closest("[data-system]"); if (b) subsystemFilter.showSubsystem(b.dataset.system); });

// ---------------------------------------------------------------- model + rig
Promise.all([
  new GLTFLoader().loadAsync(`assets/bluebird.glb?v=${ASSET_VERSION}`),
  fetch(`assets/bluebird_rig.json?v=${ASSET_VERSION}`).then((r) => r.json()),
]).then(([gltf, R]) => {
  aircraft.add(gltf.scene);
  gltf.scene.traverse((o) => {
    if (o.isMesh) { o.material.side = THREE.DoubleSide; o.castShadow = o.receiveShadow = true;
      if (o.material.map) { o.material.map.anisotropy = 8; o.material.roughness = 0.42; } }
    // the split elevons' inner (mating) faces in livery blue: hidden when closed, they show the crow airbrake opening
    if (o.isMesh && (/^elevon_upper_.*_bot$/.test(o.name) || /^elevon_lower_.*_top$/.test(o.name))) {
      o.material = new THREE.MeshStandardMaterial({ color: 0x5fa6d6, roughness: 0.6, side: THREE.DoubleSide, flatShading: true });
    }
  });
  for (const n of ["skin_top_closed", "skin_bottom_closed"]) { const o = gltf.scene.getObjectByName(n); if (o) skins.closed.push(o); }
  for (const n of ["skin_top", "skin_bottom"]) { const o = gltf.scene.getObjectByName(n); if (o) skins.cut.push(o); }
  for (const [name, e] of Object.entries(R.elevons)) {
    const node = gltf.scene.getObjectByName(name);
    if (node) rig.elevons[name] = { node, axis: new THREE.Vector3(...e.axis).normalize(), sign: e.te_down_sign,
                                    min: e.range_deg[0], max: e.range_deg[1] };
  }
  for (const [name, b] of Object.entries(R.prop)) {
    const node = gltf.scene.getObjectByName(name);
    if (node) rig.blades[name] = { node, axis: new THREE.Vector3(...b.axis).normalize(), sign: b.fold_sign };
  }
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.name, sys = APP_SYS.find(([re]) => re.test(name))?.[1];
    if (sys) subsystemFilter.register(o, sys);
    if (/^(skin_|fin_[RL]_)/.test(name)) {
      X.skinMats.push(o.material); X.casters.push(o);
      if (/^skin_top|^skin_bottom|^fin_[RL]_/.test(name)) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), X.edgeMat);
        e.visible = false; e.renderOrder = 2; o.add(e); X.edges.push(e);
      }
    } else if (sys === "controls") { X.elevonMats.push(o.material); X.casters.push(o); (X.app.controls ??= []).push(o); }
    else if (sys) { (X.appMats[sys] ??= []).push(o.material); (X.app[sys] ??= []).push(o); }
  });
  const yoke = gltf.scene.getObjectByName("prop_yoke");
  if (yoke) {                                                          // spin group on the shaft axis (glTF z = aircraft x)
    const c = new THREE.Box3().setFromObject(yoke).getCenter(V3());
    propSpin.position.set(c.x, c.y, 0); aircraft.add(propSpin); aircraft.updateMatrixWorld(true);
    for (const n of ["prop_blade_1", "prop_blade_2", "prop_yoke", "prop_spinner", "prop_hinge_pins"]) {
      const o = gltf.scene.getObjectByName(n); if (o) propSpin.attach(o);
    }
  }
  applyPose(poseAt(progress));
  if (pinned !== null) requestAnimationFrame(() => { draw(progress); document.title = "ready"; });
  return new GLTFLoader().loadAsync(`assets/bluebird_inside.glb?v=${ASSET_VERSION}`);
}).then((g) => {
  X.inside = g.scene; X.inside.visible = false; aircraft.add(X.inside);
  X.inside.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false; o.receiveShadow = true;
    const sys = o.name.match(/^x_([a-z]+)__/)?.[1];
    if (sys) subsystemFilter.register(o, sys === "shell" ? "structure" : sys);
    if (sys && !X.sysMats[sys]) {
      const m = o.material; m.side = THREE.DoubleSide; m.transparent = true;
      X.sysMats[sys] = m; X.base[sys] = m.color.clone();
    }
  });
  aircraft.updateMatrixWorld(true);
  STOPS.forEach((st, i) => {                                   // each stop frames its subsystem's bounding sphere
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    const add = (o) => { tmp.setFromObject(o); if (!st.side || (tmp.getCenter(V3()).x > 0.02)) box.union(tmp); };
    X.inside.traverse((o) => { if (o.isMesh && (o.name.startsWith(`x_${st.sys}__`) || (st.sys === "structure" && o.name.startsWith("x_foam__")))) add(o); });
    for (const o of X.app[st.sys] ?? []) add(o);
    if (st.beams) add(beams);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    X.stopViews[i] = { center: sphere.center, radius: sphere.radius, dir: V3(...st.dir).normalize(), minDist: st.minDist ?? 0.3, zoom: st.zoom ?? 1 };
  });
  initExploded(); X.ready = true;
  const launch = document.getElementById("launch-viewer");
  launch.disabled = false; launch.textContent = "Launch interactive view";
  if (pinned !== null) requestAnimationFrame(() => { draw(progress); document.title = "ready2"; });
}).catch(error => {
  console.error("Aircraft model failed to load", error);
  const launch = document.getElementById("launch-viewer"); launch.textContent = "Model unavailable — reload to retry";
});

function draw(P, time = clock.elapsedTime) {
  const st = stateAt(P);
  let mode = "";
  const sys = st.stop >= 0 ? STOPS[st.stop].sys : null, w = st.act;
  if (sys === "controls" && w > 0) {
    const a = controlsAnim(time);
    Object.assign(st.pose, { pitch: a.pitch * w, roll: a.roll * w, crow: a.crow * w }); mode = a.label;
  }
  if (sys === "propulsion" && w > 0) {
    const a = propAnim(time);
    st.pose.fold = 88 + (a.fold - 88) * w; propSpin.rotation.z = a.angle; mode = a.label;
  }
  beams.visible = sys === "sensors" && w > 0.01;
  if (beams.visible) for (const g of beams.children) {
    g.scale.set(1, w, 1);
    g.userData.mats[0].opacity = 0.14 * w; g.userData.mats[1].opacity = 0.75 * w;
  }
  card.querySelector(".tc-mode").textContent = mode;
  legend.style.opacity = st.legend; legend.style.visibility = st.legend > 0.01 ? "visible" : "hidden";
  restoreIsolationVisibility(); applyPose(st.pose); applyExploded(st.explode ?? 0);
  camera.position.copy(st.cam.pos); camera.up.copy(st.cam.up);
  const look = st.cam.look.clone();
  if (camera.aspect < 0.9 && st.focus > 0) {                            // portrait: lift the subsystem above the card
    const d = camera.position.distanceTo(look) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    look.addScaledVector(st.cam.up, -0.45 * st.focus * d);
  }
  camera.lookAt(look); placeRim();
  camera.filmOffset = (camera.aspect > 1.15 ? -5.5 : 0) * st.focus + (camera.aspect > 1.15 ? 3.6 * st.legend : 0);       // landscape: push the subsystem clear of the card
  camera.updateProjectionMatrix();
  applyXray(st); updateHud(st.hud); updateCard(st);
  renderer.render(scene, camera);
}
window.__bluebird = { draw: (p, t) => { resize(); draw(p, t); return p; },
  ready: () => X.ready,
  renderState: () => ({ frames: renderer.info.render.frame, visible: flightVisible, hidden: document.hidden, viewer: !!controls }),
  isolatedSystem: () => isolatedSystem,
  recFrame: (y, t) => {                                             // video capture: scroll, then render with a given clock
    window.scrollTo(0, y); readScroll(); progress = target;
    const r = flight.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) draw(progress, t);
    return progress; }, loaded: () => aircraft.children.length > 0, rig,
  renderNow: () => renderer.render(scene, camera), scene, X, systems: subsystemFilter, camera, aircraft,
  look: (pos, tgt, fov = 32) => {                                   // debug/inspection: free camera, one frame
    resize(); applyPose(POSES.glide); applyXray({ xray: 0, stop: -1, focus: 0 }); camera.filmOffset = 0; camera.fov = fov; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0); camera.position.set(...pos); camera.lookAt(...tgt); placeRim();
    renderer.render(scene, camera); camera.fov = 32; camera.updateProjectionMatrix(); } };

// ---------------------------------------------------------------- interactive viewer (same scene, orbit controls)
const bar = stage.querySelector(".viewer-bar");
let controls = null, viewerPose = null, viewerXray = false, viewerExploded = false, returnFocus = null;
function openViewer({ inspect = false, keepCamera = false } = {}) {
  if (controls) { if (inspect) setInspection(true); return; }
  returnFocus = document.activeElement;
  const target = new THREE.Vector3(); camera.getWorldDirection(target).multiplyScalar(camera.position.length()).add(camera.position);
  stage.classList.add("viewer"); bar.hidden = false; document.body.style.overflow = "hidden"; resize();
  card.style.visibility = "hidden"; skip.hidden = true; tourActions.hidden = true; legend.style.visibility = "hidden"; beams.visible = false;
  camera.filmOffset = 0; camera.updateProjectionMatrix();
  controls = new OrbitControls(camera, canvas); controls.enableDamping = true;
  controls.minDistance = 0.08; controls.maxDistance = 6;
  camera.up.set(0, 1, 0);
  if (keepCamera) controls.target.copy(target);
  else { controls.target.set(0, 0, 0); camera.position.set(1.6, 0.9, -1.6); }
  setPose(inspect ? "glide" : "cruise"); setExploded(false); setInspection(inspect);
  bar.querySelector("[data-inspect]").focus({ preventScroll: true });
}
function setInspection(enabled) {
  viewerXray = enabled; subsystemFilter.setActive(enabled);
  stage.classList.toggle("showing-systems", enabled); resize();
  if (!enabled) { isolatedSystem = null; restoreIsolationVisibility(); setExploded(false); }
  bar.querySelector("[data-inspect]").setAttribute("aria-pressed", String(enabled));
  applyXray({ xray: enabled ? 1 : 0, stop: -1, focus: 0 });
  updateHud(["", "", enabled ? "Choose a subsystem · drag to orbit · scroll to zoom" : "Drag to orbit · scroll to zoom"]);
}
function openInspection() { openViewer({ inspect: true, keepCamera: true }); }
function isolateSubsystem(sys) {
  restoreIsolationVisibility(); isolatedSystem = sys;
  if (sys === "controls") { setExploded(false); setPose("airbrake"); }
  if (sys === "propulsion") { setExploded(false); setPose("cruise"); }
  applyPose(viewerPose); applyExploded(viewerExploded ? 1 : 0);
  applyXray({ xray: 1, stop: sys ? STOPS.findIndex(s => s.sys === sys) : -1, focus: sys ? 1 : 0, explode: explosionAmount });
  applyIsolation(); aircraft.updateMatrixWorld(true);
  if (sys) {
    const box = new THREE.Box3();
    aircraft.traverse(o => { if (o.isMesh && o.visible && o.userData.subsystem === sys) box.union(new THREE.Box3().setFromObject(o)); });
    if (!box.isEmpty()) focusBounds(box);
  } else if (controls) {
    const c = overviewCam(1); controls.target.copy(c.look); camera.position.copy(c.pos); camera.up.copy(c.up); controls.update();
  }
  updateHud(["", "", sys ? `${STOPS.find(s => s.sys === sys).title} only · drag to orbit` : "All systems · drag to orbit · scroll to zoom"]);
}
function setExploded(value) {
  viewerExploded = value;
  bar.querySelector("[data-explode]").setAttribute("aria-pressed", String(value));
  if (value) {
    setPose("glide"); if (!viewerXray) setInspection(true);
    if (controls) { const c = overviewCam(1); controls.target.copy(c.look); camera.position.copy(c.pos); camera.up.copy(c.up); controls.update(); }
  }
}
function focusBounds(box) {
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const dir = camera.position.clone().sub(controls.target).normalize();
  const fov = Math.min(camera.fov * Math.PI / 180, 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
  const distance = Math.max(0.2, sphere.radius / Math.sin(fov / 2) * 1.55);
  controls.target.copy(sphere.center); camera.position.copy(sphere.center).addScaledVector(dir, distance); controls.update();
}
function closeViewer() {
  isolatedSystem = null; restoreIsolationVisibility();
  subsystemFilter.setActive(false); viewerXray = false; viewerExploded = false; applyExploded(0);
  controls?.dispose(); controls = null; viewerPose = null;
  stage.classList.remove("viewer", "showing-systems"); bar.hidden = true; document.body.style.overflow = "";
  resize(); readScroll(); returnFocus?.focus?.({ preventScroll: true });
}
function setPose(name) {
  viewerPose = { ...POSES[name] };
  bar.querySelectorAll("[data-pose]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pose === name)));
}
document.getElementById("launch-viewer").addEventListener("click", () => { flight.scrollIntoView(); openViewer(); });
bar.addEventListener("click", (ev) => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.dataset.close !== undefined) closeViewer();
  else if (t.dataset.explode !== undefined) setExploded(!viewerExploded);
  else if (t.dataset.inspect !== undefined) setInspection(!viewerXray);
  else if (t.dataset.pose) setPose(t.dataset.pose);
});
window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && controls) closeViewer(); });

// ---------------------------------------------------------------- loop

let shown = { fold: 88, roll: 0, bank: 0, crow: 0 };
let flightVisible = true;
const flightVisibility = new IntersectionObserver(([entry]) => { flightVisible = entry.isIntersecting; });
flightVisibility.observe(flight);
function frame() {
  if (pinned !== null || recording) return;                  // pinned/recording modes draw on demand
  requestAnimationFrame(frame);
  if (!webgl || document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);                     // also advances clock.elapsedTime for the demonstrations
  if (!controls && !flightVisible) { progress = target; return; } // keep scroll state current without drawing an offscreen scene
  if (controls) {                                            // viewer: ease toward the chosen pose
    const k = Math.min(1, dt * 4);
    for (const key of Object.keys(shown)) shown[key] += (viewerPose[key] - shown[key]) * k;
    restoreIsolationVisibility(); applyPose(shown);
    explosionAmount += ((viewerExploded ? 1 : 0) - explosionAmount) * (reduceMotion ? 1 : k);
    applyExploded(explosionAmount);
    applyXray({ xray: viewerXray ? 1 : 0, stop: isolatedSystem ? STOPS.findIndex(s => s.sys === isolatedSystem) : -1, focus: isolatedSystem ? 1 : 0, explode: explosionAmount });
    applyIsolation();
    controls.update();
    placeRim();
    renderer.render(scene, camera);
    return;
  }
  progress = reduceMotion ? target : progress + (target - progress) * Math.min(1, dt * 6);
  draw(progress);
}
frame();

// ---------------------------------------------------------------- page bits
const QUALITIES = [
  ["Phone as the brain", "An ordinary Android phone runs the cameras, detection and mission logic. Flight control and failsafes run on the autopilot, independently of the phone, and the autopilot will not launch until the preflight checklist is complete. Phone-loss responses have been tested in simulation; flight validation is next."],
  ["Plans its own landing", "Before takeoff it scores landing sites from open terrain and land-cover data, loads each as an autopilot landing sequence, and notifies the people nearby."],
  ["Printed, foam, repairable", "A 3D-printed centre body with CNC-cut foam wings. It comes apart into three pieces for transport: each wing slides off its carbon joiner after one bolt and one plug. Wear parts such as the belly skid and prop blades are designed to swap in the field."],
  ["Open and free tools", "Designed end to end with free software: FreeCAD, AeroSandbox, OpenVSP, SU2, CalculiX and ArduPilot."],
];
const Q_SLOTS = ["q-phone", "q-landing", "q-repair", "q-tools"];
const tabs = [...document.querySelectorAll("[data-tab]")];
const qualityCard = document.querySelector(".quality"), methodPanel = document.getElementById("method");
function showQuality(i) {
  tabs.forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
  const isMethod = i === QUALITIES.length;
  qualityCard.hidden = isMethod; methodPanel.hidden = !isMethod;
  if (isMethod) return;
  document.getElementById("q-big").textContent = String(i + 1);
  document.querySelector(".q-idx").textContent = `0${i + 1} / 0${QUALITIES.length}`;
  document.getElementById("q-kicker").textContent = QUALITIES[i][0];
  document.getElementById("q-text").textContent = QUALITIES[i][1];
  const media = document.getElementById("q-media"), key = Q_SLOTS[i];
  media.className = "q-media ph"; media.innerHTML = ""; media.onclick = null; media.title = "";
  if (!fillSlot(media, key)) media.dataset.ph = `Render: ${QUALITIES[i][0].toLowerCase()}`;
  document.getElementById("q-cap").textContent = SHOTS[key]?.cap ?? "";
  const thumbs = document.getElementById("q-thumbs"), all = SHOTS[key] ? [SHOTS[key], ...(SHOTS[key].more ?? [])] : [];
  thumbs.innerHTML = all.length > 1 ? all.map((s, k) => `<button aria-pressed="${k === 0}" aria-label="${s.alt}">` +
    `<img src="${s.src}.webp" alt="" loading="lazy"></button>`).join("") : "";
  thumbs.onclick = (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const k = [...thumbs.children].indexOf(b);
    fillSlot(media, key, k); document.getElementById("q-cap").textContent = all[k].cap;
    thumbs.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === k)));
  };
}
tabs.forEach((b, k) => b.addEventListener("click", () => showQuality(k)));
showQuality(0);

// ---------------------------------------------------------------- methodology (content in method.js)
import(`./method.js?v=${ASSET_VERSION}`).then(({ METHOD }) => {
  const steps = methodPanel.querySelector(".m-steps"), body = methodPanel.querySelector(".m-body");
  const $ = (sel) => body.querySelector(sel);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  steps.innerHTML = METHOD.map((m, i) => `<li><button role="tab" aria-selected="false" data-step="${i}">` +
    `<span class="n">${String(i + 1).padStart(2, "0")}</span>${esc(m.step)}</button></li>`).join("");
  function show(i) {
    const m = METHOD[i];
    steps.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
    $(".m-kicker").textContent = `${String(i + 1).padStart(2, "0")} / ${String(METHOD.length).padStart(2, "0")} \u00b7 ${m.step}`;
    $(".m-decision").textContent = m.decision;
    $(".m-why").textContent = m.why;
    const t = m.trade;
    $(".m-trade").innerHTML = t ? `<thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>` +
      t.rows.map((r, k) => `<tr class="${k === t.win ? "win" : ""}">${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") +
      "</tbody>" : "";
    $(".m-trade-wrap").hidden = !t;
    $(".m-method").innerHTML = `<b>Method</b> \u2014 ${esc(m.method)}`;
    $(".m-stats").innerHTML = m.stats.map(([v, u, l]) =>
      `<div class="m-stat"><div class="v">${esc(v)}<small>${esc(u)}</small></div><div class="l">${esc(l)}</div></div>`).join("");
    const fig = $(".m-fig"), thumbs = $(".m-thumbs");
    fig.hidden = !m.figs.length;
    const showFig = (k) => {
      const [file, cap] = m.figs[k];
      fig.querySelector("img").src = `assets/method/${file}?v=${ASSET_VERSION}`; fig.querySelector("img").alt = cap;
      fig.querySelector("figcaption").textContent = cap;
      thumbs.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === k)));
    };
    thumbs.innerHTML = m.figs.length > 1 ? m.figs.map(([file, cap], k) =>
      `<button aria-label="${esc(cap)}"><img src="assets/method/${file}?v=${ASSET_VERSION}" alt="" loading="lazy"></button>`).join("") : "";
    thumbs.onclick = (ev) => { const b = ev.target.closest("button"); if (b) showFig([...thumbs.children].indexOf(b)); };
    if (m.figs.length) showFig(0);
    fig.querySelector("img").onclick = (ev) => window.open(ev.target.src, "_blank", "noopener");
    const more = $(".m-more");
    more.href = "assets/bluebird_whitepaper.pdf"; more.textContent = `White paper: ${m.sec} \u2192`;
  }
  steps.addEventListener("click", (ev) => { const b = ev.target.closest("[data-step]"); if (b) show(+b.dataset.step); });
  show(0);
});

// ---------------------------------------------------------------- finished media into their slots
function shotHTML(s) {                                                  // hoisted: the Design tabs use it before this point
  return `<picture><source srcset="${s.src}.webp" type="image/webp"><img src="${s.src}.jpg" alt="${s.alt}" ` +
    `loading="lazy"></picture><span class="tag">${s.tag}</span>`;
}
function fillSlot(el, key, which = 0) {
  const base = SHOTS[key];
  if (!base) return false;
  const s = which ? base.more[which - 1] : base;
  el.classList.remove("ph"); el.classList.add("shot"); el.innerHTML = shotHTML(s); el.title = s.cap;
  el.onclick = () => window.open(`${s.src}.jpg`, "_blank", "noopener");
  return true;
}
document.querySelectorAll("[data-slot]").forEach((el) => {
  const key = el.dataset.slot;
  if (key === "film" && FILM) {
    el.classList.remove("ph");
    el.outerHTML = `<video class="film" controls playsinline preload="none" poster="${FILM.poster}">` +
      `<source src="${FILM.src}" type="video/mp4"></video>`;
  } else fillSlot(el, key);
});

// e-mail assembled at runtime (keeps it out of the static HTML for scrapers)
const mail = document.getElementById("mail");
if (mail) { const a = `${mail.dataset.u}@${mail.dataset.d}`; mail.href = `mailto:${a}`; mail.textContent = a; }
