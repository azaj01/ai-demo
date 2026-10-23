import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { property as P } from "./property.js";
import { buildProperty, area } from "./build.js";
import * as T from "./textures.js";

const LOW = matchMedia("(max-width: 820px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const POST = !LOW && new URLSearchParams(location.search).get("post") !== "0";
const EXPOSURE = POST ? 1.22 : 1.05;
const QS = new URLSearchParams(location.search);
const PAPER = new THREE.Color("#f3efe7"), INK = new THREE.Color("#2a2825");
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const $ = s => document.querySelector(s);
const srgb = c => new THREE.Color(c).convertLinearToSRGB();

// ------------------------------------------------------------------ renderer
const canvasEl = $("#scene");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: !POST, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL 2 not available");
} catch (e) {
  document.body.classList.add("no-webgl");
  throw e;
}
const PR = Math.min(devicePixelRatio, LOW ? 1.25 : 1.6);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// With post-processing the grade pass tone-maps at the end; without it, three does.
renderer.toneMapping = POST ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = EXPOSURE;
renderer.shadowMap.enabled = !LOW;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
// the background must also come out as the paper colour after the final tone curve
const invAces = y => { y = Math.min(0.985, Math.max(0, y)); const a = 2.51 - 2.43 * y, b = 0.03 - 0.59 * y, c = -0.14 * y; return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); };
scene.background = POST ? new THREE.Color(invAces(PAPER.r) / EXPOSURE, invAces(PAPER.g) / EXPOSURE, invAces(PAPER.b) / EXPOSURE) : PAPER.clone();
const camera = new THREE.PerspectiveCamera(12, innerWidth / innerHeight, 0.05, 1500);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

// ------------------------------------------------------------------ shared shader bits
// Colours authored for the screen (paper, ink, the sheet, the sky) must look exactly as drawn.
// With post-processing they are written before the final ACES tone curve, so they go through its inverse.
const DISPLAY_GLSL = `
  uniform float uDirect; uniform float uExposure;
  float rvInvAces(float y) { y = clamp(y, 0.0, 0.985); float a = 2.51 - 2.43 * y, b = 0.03 - 0.59 * y, c = -0.14 * y; return (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a); }
  vec3 rvLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
  vec3 rvDisplay(vec3 s) { if (uDirect > 0.5) return s; vec3 l = rvLin(s); return vec3(rvInvAces(l.r), rvInvAces(l.g), rvInvAces(l.b)) / uExposure; }
  vec3 rvDisplayFromLinear(vec3 l) { if (uDirect > 0.5) return l; return vec3(rvInvAces(l.r), rvInvAces(l.g), rvInvAces(l.b)) / uExposure; }`;

// ------------------------------------------------------------------ the reveal mask
// One canvas laid over the plan. Black = still a drawing, white = real materials.
const B = P.bounds, PPM = 32;
const maskCanvas = document.createElement("canvas");
maskCanvas.width = Math.round((B.x1 - B.x0) * PPM); maskCanvas.height = Math.round((B.y1 - B.y0) * PPM);
const mctx = maskCanvas.getContext("2d");
const maskTex = new THREE.CanvasTexture(maskCanvas);
maskTex.colorSpace = THREE.NoColorSpace; maskTex.flipY = false; maskTex.generateMipmaps = false; maskTex.minFilter = maskTex.magFilter = THREE.LinearFilter;
const U = {
  uMask: { value: maskTex },
  uMaskOrigin: { value: new THREE.Vector2(B.x0, B.y0) },
  uMaskSize: { value: new THREE.Vector2(B.x1 - B.x0, B.y1 - B.y0) },
  uPaper: { value: srgb(PAPER) },
  uInk: { value: srgb(INK) },
  uSheet: { value: null },
  uDirect: { value: POST ? 0 : 1 },
  uExposure: { value: EXPOSURE },
  uTime: { value: 0 },
};
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2);
let maskState = "";
const HERO_SPLIT = 9.05; // the opening plan is half drawing (west), half rendered (east)
function drawMask(p) {
  const vals = P.rooms.map(r => clamp01((p - r.reveal[0]) / (r.reveal[1] - r.reveal[0])));
  const hero = 1 - smooth(0.012, 0.07, p);
  const key = vals.map(v => v.toFixed(3)).join() + "|" + hero.toFixed(3);
  if (key === maskState) return;
  maskState = key;
  const X = x => (x - B.x0) * PPM, Y = y => (y - B.y0) * PPM;
  mctx.fillStyle = "#000"; mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  if (hero > 0.001) {
    // the rendered half slides away east as the scroll begins
    const split = THREE.MathUtils.lerp(B.x1 + 0.5, HERO_SPLIT, hero);
    mctx.fillStyle = "#fff"; mctx.fillRect(X(split), 0, maskCanvas.width, maskCanvas.height);
  }
  P.rooms.forEach((r, i) => {
    const v = vals[i]; if (v <= 0) return;
    mctx.beginPath(); r.poly.forEach(([x, y], k) => (k ? mctx.lineTo(X(x), Y(y)) : mctx.moveTo(X(x), Y(y)))); mctx.closePath();
    if (v >= 1) mctx.fillStyle = "#fff";
    else {
      const g = mctx.createLinearGradient(X(r.from[0]), Y(r.from[1]), X(r.to[0]), Y(r.to[1]));
      const e = 0.07, f = v * (1 + 2 * e) - e;
      g.addColorStop(0, "#fff"); g.addColorStop(clamp01(f - e), "#fff"); g.addColorStop(clamp01(f + e) || 0.0001, "#000"); g.addColorStop(1, "#000");
      mctx.fillStyle = g;
    }
    mctx.fill();
    mctx.lineWidth = 0.35 * PPM; mctx.strokeStyle = mctx.fillStyle; mctx.stroke();
  });
  maskTex.needsUpdate = true;
}

// Every architectural material is patched: it shows as paper until the mask turns white, the inside
// of anything the cut slices through is filled with ink like a plan's poché, and floors keep a faint
// trace of their pattern (parquet seams, terrazzo chips) in the drawing.
function patch(mat, { cap = INK, normals = true, floor = false, sheet = false } = {}) {
  mat.clippingPlanes = [cutPlane];
  mat.clipShadows = true;
  if (!mat.isLineBasicMaterial) mat.side = THREE.DoubleSide;
  mat.shadowSide = THREE.FrontSide;
  const capHex = srgb(cap);
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRvW;\nvarying vec3 vRvN;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vRvW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        ${normals ? "vRvN = normalize(mat3(modelMatrix) * objectNormal);" : "vRvN = vec3(0.0, 1.0, 0.0);"}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D uMask; uniform vec2 uMaskOrigin; uniform vec2 uMaskSize; uniform vec3 uPaper; uniform vec3 uInk; uniform sampler2D uSheet;
        varying vec3 vRvW; varying vec3 vRvN;
        ${DISPLAY_GLSL}`)
      .replace("#include <dithering_fragment>", `
        vec2 rvP = vRvW.xz + vRvN.xz * 0.12;
        float rv = texture2D(uMask, (rvP - uMaskOrigin) / uMaskSize).r;
        ${mat.isLineBasicMaterial
          ? "gl_FragColor.a *= 1.0 - 0.93 * rv;"
          : `vec3 rvPaper = ${sheet ? "texture2D(uSheet, (vRvW.xz - uMaskOrigin) / uMaskSize).rgb" : "uPaper * (0.95 + 0.05 * clamp(vRvN.y * 0.5 + 0.5, 0.0, 1.0))"};
             ${floor ? "float rvL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); rvPaper *= 1.0 - 0.13 * (1.0 - smoothstep(0.03, 0.22, rvL));" : ""}
             gl_FragColor.rgb = mix(rvDisplay(rvPaper), gl_FragColor.rgb, rv);
             if (!gl_FrontFacing) gl_FragColor.rgb = mix(rvDisplay(vec3(${capHex.r.toFixed(3)}, ${capHex.g.toFixed(3)}, ${capHex.b.toFixed(3)})), gl_FragColor.rgb * 0.35, rv);`}
        #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => `rv2-${mat.type}-${cap}-${normals}-${floor}-${sheet}`;
  return mat;
}
// Unlit backdrops (sky, facades): shown exactly as painted, whatever the grade does.
function asPainted(mat) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${DISPLAY_GLSL}`)
      .replace("#include <dithering_fragment>", "gl_FragColor.rgb = rvDisplayFromLinear(gl_FragColor.rgb);\n#include <dithering_fragment>");
  };
  mat.customProgramCacheKey = () => "painted";
  return mat;
}

// ------------------------------------------------------------------ materials
const manager = THREE.DefaultLoadingManager;
const loader = new THREE.TextureLoader();
const texPath = (n, f) => `assets/tex/${n}/${f}.jpg`;
function load(n, f, { srgb: isColour = true, repeat = [1, 1] } = {}) {
  const t = loader.load(texPath(n, f));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (isColour) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Furniture UVs are in metres, so `repeat` here means tiles per metre.
function pbr(n, { color = "#fff", repeat = [1, 1], rough = 1, normal = true, metal = 0, env = 1, ns = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: load(n, "diff", { repeat }), normalMap: normal ? load(n, "nor", { srgb: false, repeat }) : null,
    color, roughness: rough, metalness: metal, envMapIntensity: env,
  });
  if (m.normalMap) m.normalScale.set(ns, ns);
  return patch(m, { cap: "#2a2826" });
}
const std = (o, cap = "#9c968c") => patch(new THREE.MeshStandardMaterial(o), { cap });

async function makeMaterials() {
  const oak = await T.loadImage(LOW ? texPath("oak_wood_planks", "diff") : "assets/tex/oak_wood_planks/diff-2k.jpg");
  const floorOpts = { floor: true };
  const M = {
    parquet: patch(new THREE.MeshStandardMaterial({ map: T.chevron(oak, LOW ? 420 : 760), roughness: 0.42, envMapIntensity: 0.75, color: "#efe1cf" }), floorOpts),
    terrazzo: patch(new THREE.MeshStandardMaterial({ map: T.terrazzo(LOW ? 512 : 1024), roughness: 0.22, envMapIntensity: 1.0 }), floorOpts),
    marbleFloor: patch(new THREE.MeshStandardMaterial({ map: load("marble_01", LOW ? "diff" : "diff-2k", { repeat: [0.7, 0.7] }), roughness: 0.14, envMapIntensity: 1.1 }), floorOpts),
    stone: patch(new THREE.MeshStandardMaterial({ map: load("marble_01", "diff", { repeat: [0.5, 0.5] }), color: "#d6d0c6", roughness: 0.45 }), floorOpts),
    wall: std({ color: "#ebe3d6", roughness: 0.93 }, INK),
    ceiling: std({ color: "#f8f5f0", roughness: 1 }),
    skirting: std({ color: "#ebe4d8", roughness: 0.38 }, INK),
    cornice: std({ color: "#f6f2eb", roughness: 0.8 }, INK),
    walnut: pbr("natural_walnut_veneer", { rough: 0.5, env: 0.8, repeat: [0.9, 0.9], color: "#e9d9c6" }),
    oakLight: pbr("oak_wood_planks", { color: "#f6ebdb", rough: 0.55, repeat: [0.5, 0.5] }),
    linen: pbr("rough_linen", { color: "#d8bf98", repeat: [2.5, 2.5], env: 0.25, ns: 0.6 }),
    linenDark: pbr("rough_linen", { color: "#4f4b45", repeat: [2.5, 2.5], env: 0.25, ns: 0.6 }),
    linenLight: pbr("rough_linen", { color: "#f1e9dc", repeat: [2.5, 2.5], env: 0.25, ns: 0.6 }),
    wool: pbr("poly_wool_herringbone", { color: "#c9b597", repeat: [1.6, 1.6], env: 0.25 }),
    runner: pbr("poly_wool_herringbone", { color: "#7c3f2c", repeat: [1.6, 1.6], env: 0.25 }),
    leather: pbr("leather_red_02", { color: "#c08a5c", rough: 0.55, repeat: [1.5, 1.5] }),
    black: std({ color: "#1e1d1f", roughness: 0.4, metalness: 0.45 }),
    chrome: std({ color: "#d4d6da", roughness: 0.18, metalness: 1 }),
    brass: std({ color: "#c9994f", roughness: 0.28, metalness: 1 }),
    marble: patch(new THREE.MeshStandardMaterial({ map: load("marble_01", "diff", { repeat: [0.6, 0.6] }), roughness: 0.12, envMapIntensity: 1.2 })),
    soot: std({ color: "#151413", roughness: 1 }),
    frame: std({ color: "#f0ece5", roughness: 0.42 }, INK),
    frameBlack: std({ color: "#1a1a1a", roughness: 0.5 }),
    doorLeaf: std({ color: "#f2ede5", roughness: 0.38 }),
    glass: new THREE.MeshStandardMaterial({ color: "#c6d8e0", transparent: true, opacity: 0.08, roughness: 0.03, depthWrite: false, clippingPlanes: [cutPlane] }),
    glow: patch(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.1) }), { normals: false }),
    lampShade: std({ color: "#f3ebdd", emissive: "#ffe2c0", emissiveIntensity: 0.7, roughness: 0.9 }),
    ceramic: std({ color: "#f5f3ef", roughness: 0.16 }),
    pot: std({ color: "#ab5a3c", roughness: 0.85 }),
    leaf: std({ color: "#33582d", roughness: 0.55 }),
    leafLight: std({ color: "#5b7d3e", roughness: 0.55 }),
    paper: std({ color: "#fbfaf7", roughness: 0.9 }),
    screen: patch(new THREE.MeshBasicMaterial({ color: "#1b2731" }), { normals: false }),
    mirror: std({ color: "#d2d6da", roughness: 0.03, metalness: 1 }),
    moulding: std({ color: "#efe7da", roughness: 0.7 }, INK),
    sheer: patch(new THREE.MeshStandardMaterial({ color: "#fbf6ee", roughness: 0.95, transparent: true, opacity: 0.82, emissive: "#ffe8cc", emissiveIntensity: 0.06 })),
    books: ["#8c3b2c", "#2f4a5c", "#d7cbb4", "#3e5a3f", "#b88b3d", "#1f1f22", "#e8e1d3", "#6a2f3f"].map(c => std({ color: c, roughness: 0.8 })),
  };
  M.sheer.side = THREE.DoubleSide;
  // ceilings face down: they must still block the sun coming from above, or it leaks into every room
  M.ceiling.shadowSide = THREE.DoubleSide;
  const wc = document.createElement("canvas"); wc.width = wc.height = 256;
  const wg = wc.getContext("2d"), grad = wg.createRadialGradient(128, 150, 4, 128, 140, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,0.45)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  wg.fillStyle = grad; wg.fillRect(0, 0, 256, 256);
  M.wash = washMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uOn: { value: 0 }, uMap: { value: new THREE.CanvasTexture(wc) } },
    vertexShader: "varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D uMap; uniform float uOn; uniform sampler2D uMask; uniform vec2 uMaskOrigin; uniform vec2 uMaskSize; varying vec2 vUv; varying vec3 vW;
      void main() { float rv = texture2D(uMask, (vW.xz - uMaskOrigin) / uMaskSize).r; float a = texture2D(uMap, vUv).r;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.78) * a * uOn * rv * 0.14, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, clippingPlanes: [cutPlane],
  });
  // floors sit a hair behind in depth, so the black infill of cut walls wins over them in the plan
  for (const f of [M.parquet, M.terrazzo, M.marbleFloor, M.stone]) Object.assign(f, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 });
  const artCache = {};
  M.art = seed => (artCache[seed] ||= patch(new THREE.MeshStandardMaterial({ map: T.painting(seed), roughness: 0.85 })));
  return M;
}

// ------------------------------------------------------------------ world
const lineMat = patch(new THREE.LineBasicMaterial({ color: INK, transparent: true, depthWrite: false }), { normals: false });

// outside the windows: Milan
const outside = new THREE.Group(); outside.visible = false; scene.add(outside);
const skyTex = loader.load("assets/sky/sky.jpg"); skyTex.colorSpace = THREE.SRGBColorSpace;
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), asPainted(new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false })));
sky.rotation.y = Math.PI * 0.55; sky.renderOrder = -1; scene.add(sky);
const facadeMat = (o) => asPainted(new THREE.MeshBasicMaterial({ map: T.facade(o), toneMapped: false }));
const west = new THREE.Mesh(new THREE.PlaneGeometry(96, 31), facadeMat({ seed: 4, colour: "#d6a06a", lit: 0.86, repeat: 2 }));
west.position.set(-30, -8.5, 9); west.rotation.y = Math.PI / 2; outside.add(west);
const west2 = new THREE.Mesh(new THREE.PlaneGeometry(50, 33), facadeMat({ seed: 9, colour: "#c98d6c", lit: 0.8 }));
west2.position.set(-33, -7.5, -42); west2.rotation.y = Math.PI / 2.6; outside.add(west2);
const east = new THREE.Mesh(new THREE.PlaneGeometry(44, 31), facadeMat({ seed: 2, colour: "#e3c7a0", lit: 1.15 }));
east.position.set(27, -8.5, 8); east.rotation.y = -Math.PI / 2; outside.add(east);
const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), asPainted(new THREE.MeshBasicMaterial({ color: "#5f5a55", toneMapped: false })));
street.rotation.x = -Math.PI / 2; street.position.y = -18; outside.add(street);

// light: a high soft sun for the rendered half of the plan, then late afternoon over the Corso
const sunVec = ({ azimuth, elevation }) => {
  const az = (azimuth * Math.PI) / 180, el = (elevation * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
};
const sunWalk = sunVec(P.sun), sunPlan = sunVec(P.planSun || { azimuth: 210, elevation: 50 });
const sunDir = new THREE.Vector3();
const sun = new THREE.DirectionalLight("#ffc68c", 5.6);
const center = new THREE.Vector3(8.2, 0, 8.8);
sun.castShadow = true;
// tight around the flat, high resolution: a low sun needs it to keep window shadows crisp
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 20, far: 85 });
sun.shadow.mapSize.set(LOW ? 1024 : 4096, LOW ? 1024 : 4096);
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight("#e4e8ee", "#b59c7e", 0.9);
scene.add(hemi);

let built, interiorLights = [], sheet, shafts, dust, washMat;

// ------------------------------------------------------------------ light shafts and dust
// Shafts: a few soft additive sheets per street window, slanting into the room along the sun.
const shaftMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uOn: { value: 0 }, uColor: { value: new THREE.Color("#ffe4c4") } },
  vertexShader: `attribute vec3 aShaft; varying vec3 vS; varying vec3 vW;
    void main() { vS = aShaft; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uOn; uniform vec3 uColor; uniform sampler2D uMask; uniform vec2 uMaskOrigin; uniform vec2 uMaskSize;
    varying vec3 vS; varying vec3 vW;
    void main() {
      // clamp: with MSAA the interpolants can land just outside the sheet, and pow() of a negative is NaN
      float t = clamp(vS.x, 0.0, 1.0), across = clamp(vS.y, -1.0, 1.0), up = clamp(vS.z, -1.0, 1.0);
      float a = pow(1.0 - t, 1.7) * smoothstep(0.0, 0.08, t) * (1.0 - across * across) * smoothstep(1.0, 0.55, abs(up));
      float rv = texture2D(uMask, (vW.xz - uMaskOrigin) / uMaskSize).r;
      a *= smoothstep(0.8, 3.2, distance(vW, cameraPosition));
      gl_FragColor = vec4(max(uColor * a * uOn * rv * 0.045, 0.0), 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
function makeShafts() {
  const L = sunWalk.clone().negate(); // the way the light travels: east and down into the rooms
  const pos = [], attr = [], idx = [];
  for (const w of P.walls) for (const o of w.openings || []) {
    if (o.type !== "window" || !o.curtain) continue;
    const [ax, ay] = w.a, [bx, by] = w.b, len = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / len, dy = (by - ay) / len;
    const cx = ax + dx * o.at, cy = ay + dy * o.at;
    const LEN = 7.5, SHEETS = 7;
    for (let k = 0; k < SHEETS; k++) {
      const s = (k / (SHEETS - 1)) * 2 - 1; // across the window
      const ox = cx + dx * s * o.w * 0.42, oy = cy + dy * s * o.w * 0.42;
      const base = pos.length / 3;
      for (const [t, h] of [[0, o.sill], [0, o.head], [1, o.sill], [1, o.head]]) {
        pos.push(ox + L.x * LEN * t, h + L.y * LEN * t, oy + L.z * LEN * t);
        attr.push(t, s, h === o.sill ? -1 : 1);
      }
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aShaft", new THREE.Float32BufferAttribute(attr, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, shaftMat); m.frustumCulled = false; m.renderOrder = 5;
  return m;
}
const dustMat = new THREE.ShaderMaterial({
  uniforms: { ...U, uOn: { value: 0 }, uPR: { value: PR } },
  vertexShader: `uniform float uTime; uniform float uPR; attribute float aSeed; varying float vA; varying vec3 vW;
    void main() {
      vec3 p = position;
      p.x += sin(uTime * 0.07 + aSeed * 6.0) * 0.25; p.y += sin(uTime * 0.05 + aSeed * 11.0) * 0.18; p.z += cos(uTime * 0.06 + aSeed * 7.0) * 0.25;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); vW = (modelMatrix * vec4(p, 1.0)).xyz;
      gl_PointSize = uPR * (2.0 + aSeed * 3.0) * (2.2 / max(0.5, -mv.z));
      vA = 0.35 + 0.65 * fract(aSeed * 17.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `uniform float uOn; uniform sampler2D uMask; uniform vec2 uMaskOrigin; uniform vec2 uMaskSize; varying float vA; varying vec3 vW;
    void main() {
      float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float rv = texture2D(uMask, (vW.xz - uMaskOrigin) / uMaskSize).r;
      float near = smoothstep(7.5, 1.0, vW.x); // brighter close to the street windows, where the sun is
      gl_FragColor = vec4(max(vec3(1.0, 0.86, 0.66) * (1.0 - d * 2.0) * vA * uOn * rv * (0.25 + near) * 0.9, 0.0), 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
function makeDust() {
  const n = 900, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = 1.2 + Math.random() * 6.3; pos[i * 3 + 1] = 0.2 + Math.random() * 2.5; pos[i * 3 + 2] = 0.6 + Math.random() * 14.2;
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(g, dustMat); pts.frustumCulled = false; pts.renderOrder = 6;
  return pts;
}

// ------------------------------------------------------------------ post-processing
let composer, gtao, bloom, grade;
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uExposure: { value: EXPOSURE }, uMood: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uExposure; uniform float uMood; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = aces(texture2D(tDiffuse, vUv).rgb * uExposure);
      // the walk is graded warm and a touch richer; the drawing is left untouched
      c = mix(c, c * vec3(1.012, 1.0, 0.985), uMood);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.0 + 0.1 * uMood);
      c = mix(c, smoothstep(0.0, 1.0, c), 0.25 * uMood);
      float v = smoothstep(1.05, 0.25, length((vUv - 0.5) * vec2(1.15, 1.0)));
      c *= mix(1.0, mix(0.86, 1.0, v), uMood);
      c = toSrgb(clamp(c, 0.0, 1.0));
      c += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.022;
      gl_FragColor = vec4(c, 1.0);
    }`,
};
function setupPost() {
  const rt = new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(PR);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  // GTAO ignores the section cut and hidden ceilings this scene relies on and leaves black blocks; opt-in only (?ao=1)
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0;
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
  if (QS.get("ao") === "1") composer.addPass(gtao); // off by default: see note above
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.0, 0.5, 0.96);
  if (QS.get("bloom") !== "0") composer.addPass(bloom);
  grade = new ShaderPass(GradeShader);
  grade.uniforms.uRes.value.set(innerWidth * PR, innerHeight * PR);
  composer.addPass(grade);
}

// ------------------------------------------------------------------ labels and UI
const labelsEl = $("#labels");
const fmtM = v => v.toFixed(2).replace(".", ",");
const roomLabels = P.rooms.filter(r => r.name && r.label).map(r => {
  const el = document.createElement("div");
  el.className = "room-label";
  const m2 = area(r.poly);
  const xs = r.poly.map(q => q[0]), ys = r.poly.map(q => q[1]);
  const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...ys) - Math.min(...ys);
  el.innerHTML = `<b>${r.name}</b>${m2 > 6 ? `<span>${Math.round(m2)} m² &nbsp; ${fmtM(w)} × ${fmtM(d)}</span>` : ""}`;
  labelsEl.append(el);
  return { r, el, v: new THREE.Vector3(r.label[0], 0, r.label[1]) };
});
const total = P.rooms.filter(r => !r.context).reduce((s, r) => s + area(r.poly), 0);
$("#total").textContent = `${Math.round(total)} m²`;
document.querySelectorAll("[data-total]").forEach(e => (e.textContent = `${Math.round(total)} m²`));

const chapters = P.rooms.filter(r => r.name && !r.context && r.cap);
$("#rail").innerHTML = chapters.map((r, i) => `<button data-i="${i}" title="${r.name}"><span>${r.name}</span></button>`).join("");
document.querySelectorAll("#rail button").forEach(b => b.onclick = () => scrollToP(chapters[+b.dataset.i].reveal[1] - 0.01));
const capEl = $("#caption"), countEl = $("#count");
let capRoom = null;

// ------------------------------------------------------------------ room markers and files
const STOPS = (P.stops || []).map((s, i) => ({ ...s, i, len: P.holdLength || 0.03 })).sort((a, b) => a.at - b.at);
const S_TOTAL = 1 + STOPS.reduce((s, h) => s + h.len, 0);
function scrollToPose(s) { // scroll fraction -> point on the walk
  let u = s * S_TOTAL;
  for (const h of STOPS) { if (u <= h.at) break; if (u <= h.at + h.len) return { p: h.at, hold: h, k: (u - h.at) / h.len }; u -= h.len; }
  return { p: Math.min(1, u), hold: null, k: 0 };
}
const poseToScroll = p => (p + STOPS.filter(h => h.at < p).reduce((s, h) => s + h.len, 0)) / S_TOTAL;
const spotsEl = $("#spots"), fileEl = $("#file");
const roomById = Object.fromEntries(P.rooms.map(r => [r.id, r]));
for (const st of STOPS) {
  const el = document.createElement("div");
  el.className = "spot";
  el.innerHTML = `<button class="reticle" type="button" aria-label="Open the file: ${st.title.join(" ")}"><i></i><i></i><i></i><i></i><b></b></button>
    <div class="tag"><span class="tag__v"></span><span class="tag__h"></span><span class="tag__no">Stanza ${String(st.i + 1).padStart(2, "0")}</span>
    <span class="tag__title">${st.title.map(t => `<span><span>${t}</span></span>`).join("")}</span>
    <span class="tag__meta">${st.meta} · <b>open file +</b></span></div>`;
  spotsEl.append(el);
  st.el = el; st.v = new THREE.Vector3(st.anchor[0], st.anchor[1], st.anchor[2]);
  const open = () => openFile(st);
  el.querySelector(".reticle").onclick = open; el.querySelector(".tag").onclick = open;
}
function openFile(st) {
  fileEl.querySelector(".file__no").textContent = `Stanza ${String(st.i + 1).padStart(2, "0")} · ${roomById[st.room]?.name || ""}`;
  fileEl.querySelector(".file__title").textContent = st.title.join(" ");
  fileEl.querySelector(".file__meta").textContent = st.meta;
  fileEl.querySelector(".file__text").textContent = st.text;
  fileEl.querySelector(".file__facts").innerHTML = st.facts.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("");
  document.body.classList.add("file-open");
  lenis.stop();
}
function closeFile() { document.body.classList.remove("file-open"); lenis.start(); }
fileEl.querySelector(".file__close").onclick = closeFile;
addEventListener("keydown", e => { if (e.key === "Escape") closeFile(); });
let firstStopSeen = false;
function updateStops(p, walk) {
  let active = null;
  for (const st of STOPS) {
    // shown while the walk holds at the stop, and a moment either side of it
    const on = walk.hold === st || (p > st.at - 0.012 && p < st.at + 0.008);
    st.el.classList.toggle("on", on);
    if (on) active = st;
    if (!on && !st.el.classList.contains("on")) continue;
    const v = st.v.clone().project(camera);
    if (v.z > 1) { st.el.classList.remove("on"); continue; }
    const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
    st.el.style.transform = `translate(${sx}px, ${sy}px)`;
    // low on the screen, the label goes above its marker; near the right edge, to its left
    st.el.classList.toggle("up", sy > innerHeight * 0.52);
    st.el.classList.toggle("left", sx > innerWidth * 0.62);
    // phones: the marker stays in the room, the label docks bottom-left where it fits
    const tag = st.el.querySelector(".tag");
    if (innerWidth < 820) { st.el.classList.add("docked"); st.el.classList.remove("left", "up"); tag.style.transform = `translate(${16 - sx}px, ${innerHeight - 250 - sy}px)`; }
    else if (tag.style.transform) { st.el.classList.remove("docked"); tag.style.transform = ""; }
  }
  if (active) firstStopSeen = firstStopSeen || active.i > 0;
  const hint = $("#walk-hint");
  hint.textContent = active ? (active.i === 0 && !firstStopSeen ? "Click the marker to open the file" : "Scroll to the next room") : "";
  hint.classList.toggle("on", !!active);
}

// ------------------------------------------------------------------ camera path
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const [SB0, SB1, SB2, SB3] = P.sheet.border;
let planHeight = 120;
const PC = new THREE.Vector3((SB0 + SB2) / 2, 0, (SB1 + SB3) / 2);
function frameplan() {
  const fov = 12, w = SB2 - SB0, h = SB3 - SB1, a = innerWidth / innerHeight;
  const half = Math.max(h / 2, w / 2 / a) * 1.05;
  planHeight = half / Math.tan((fov / 2) * Math.PI / 180);
  PC.z = (SB1 + SB3) / 2 + (a < 0.8 ? -h * 0.12 : 0);
  // on wide screens slide the sheet right, clear of the title on the left
  PC.x = (SB0 + SB2) / 2 - (a > 1.2 ? Math.min(4.2, (a - 1.2) * 9) : 0);
}
frameplan();
const keys = () => P.path.map(k => k.plan
  ? { p: k.p, pos: new THREE.Vector3(PC.x, planHeight, PC.z), look: PC.clone(), fov: 12 }
  : { p: k.p, pos: V(k.pos), look: V(k.look), fov: k.fov });
let K = keys();
const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
function crV(out, a, b, c, d, t) { out.set(cr(a.x, b.x, c.x, d.x, t), cr(a.y, b.y, c.y, d.y, t), cr(a.z, b.z, c.z, d.z, t)); return out; }
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3(), up = new THREE.Vector3();
function poseAt(p) {
  let i = 0; while (i < K.length - 2 && p > K[i + 1].p) i++;
  const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
  let t = clamp01((p - b.p) / (c.p - b.p));
  if (b.pos.y > 5 || c.pos.y > 5) {
    // the aerial part: straight, eased moves (a spline overshoots between such different heights)
    t = t * t * (3 - 2 * t);
    tmpPos.lerpVectors(b.pos, c.pos, t);
    tmpLook.lerpVectors(b.look, c.look, t);
    return { pos: tmpPos, look: tmpLook, fov: THREE.MathUtils.lerp(b.fov, c.fov, t) };
  }
  t = 0.55 * t * t * (3 - 2 * t) + 0.45 * t;
  crV(tmpPos, a.pos, b.pos, c.pos, d.pos, t);
  if (b.pos.y < 3 && c.pos.y < 3) tmpPos.y = THREE.MathUtils.lerp(b.pos.y, c.pos.y, t);
  // turn the head, don't drag a target point through the room: interpolate yaw and pitch
  const db = b.look.clone().sub(b.pos), dc = c.look.clone().sub(c.pos);
  const yb = Math.atan2(db.x, db.z), yc = Math.atan2(dc.x, dc.z);
  let dy = yc - yb; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  const pb = Math.atan2(db.y, Math.hypot(db.x, db.z)), pc = Math.atan2(dc.y, Math.hypot(dc.x, dc.z));
  const yaw = yb + dy * t, pitch = pb + (pc - pb) * t;
  tmpLook.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).add(tmpPos);
  return { pos: tmpPos, look: tmpLook, fov: THREE.MathUtils.lerp(b.fov, c.fov, t) };
}

// ------------------------------------------------------------------ scroll
const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
let progress = 0;
lenis.on("scroll", () => { progress = clamp01(lenis.scroll / maxScroll()); });
function scrollToP(p) { lenis.scrollTo(poseToScroll(p) * maxScroll(), { duration: 2.2 }); }
let forced = null;
window.__setProgress = p => { const s = poseToScroll(p); forced = s; progress = s; lenis.scrollTo(s * maxScroll(), { immediate: true, force: true }); setTimeout(() => { if (forced === s) forced = null; }, 600); };
const qp = new URLSearchParams(location.search).get("p");

// ------------------------------------------------------------------ frame
function update(s, time) {
  const walk = scrollToPose(s), p = walk.p;
  const pose = poseAt(p);
  camera.position.copy(pose.pos);
  camera.fov = pose.fov;
  camera.near = Math.max(0.05, (pose.pos.y - 4) * 0.6); // depth precision far above the plan
  const k = smooth(0.075, 0.17, p);
  up.set(0, k, -(1 - k)).normalize();
  camera.up.copy(up);
  if (pose.pos.y < 2.5) {
    const br = smooth(0.28, 0.33, p);
    camera.position.y += Math.sin(time * 0.85) * 0.007 * br;
    pose.look.x += Math.sin(time * 0.31) * 0.035 * br; pose.look.y += Math.sin(time * 0.53) * 0.02 * br;
  }
  camera.lookAt(pose.look);
  camera.updateProjectionMatrix();

  const inside = camera.position.y < 2.8;
  cutPlane.constant = inside ? 60 : 1.2 + (2.895 - 1.2) * smooth(0.075, 0.16, p);
  if (built) built.ceilings.visible = inside;
  drawMask(p);

  // the sun drops from a soft midday (rendered plan) to a low golden sun (the walk)
  const golden = smooth(0.12, 0.3, p);
  sunDir.copy(sunPlan).lerp(sunWalk, golden).normalize();
  sun.position.copy(center).addScaledVector(sunDir, 50); sun.target.position.copy(center);
  // inside, the room is lit by the low sun and the lamps; the sky fill is kept low so there is contrast
  sun.intensity = THREE.MathUtils.lerp(3.2, 6.0, golden);
  sun.color.set(golden > 0.5 ? "#ffd3a8" : "#fff1de");
  hemi.intensity = THREE.MathUtils.lerp(1.15, 0.36, golden);
  hemi.color.set(golden > 0.5 ? "#cdd8e6" : "#e4e8ee");

  const outsideK = smooth(0.2, 0.285, p);
  sky.material.opacity = outsideK;
  outside.visible = outsideK > 0.01;
  if (sheet) sheet.visible = p < 0.33;
  for (const l of interiorLights) l.intensity = l.userData.base * smooth(0.27, 0.33, p);
  const mood = smooth(0.24, 0.33, p);
  U.uTime.value = time;
  shaftMat.uniforms.uOn.value = mood;
  if (washMat) washMat.uniforms.uOn.value = mood;
  dustMat.uniforms.uOn.value = mood;
  if (shafts) shafts.visible = dust.visible = mood > 0.01;
  if (composer) {
    grade.uniforms.uMood.value = mood;
    grade.uniforms.uTime.value = time;
    gtao.blendIntensity = 0.95 * mood;
    bloom.strength = 0.12 * mood;
    bloom.enabled = mood > 0.01; gtao.enabled = mood > 0.01;
  }

  // overlays
  const planK = 1 - smooth(0.06, 0.115, p);
  labelsEl.style.opacity = planK;
  if (planK > 0.01) for (const L of roomLabels) {
    const v = L.v.clone().project(camera);
    L.el.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
  }
  document.body.style.setProperty("--intro", planK.toFixed(3));
  const heroK = 1 - smooth(0.012, 0.07, p);
  document.body.style.setProperty("--hero", heroK.toFixed(3));
  if (heroK > 0.001) {
    const split = THREE.MathUtils.lerp(B.x1 + 0.5, HERO_SPLIT, heroK);
    const sv = new THREE.Vector3(split, 0, PC.z).project(camera);
    document.body.style.setProperty("--split-x", ((sv.x * 0.5 + 0.5) * innerWidth).toFixed(1) + "px");
  }
  document.body.style.setProperty("--outro", smooth(0.93, 0.985, p).toFixed(3));
  $("#hint").style.opacity = 1 - smooth(0.01, 0.04, p);

  let cur = null;
  for (const r of chapters) if (p >= r.reveal[0] - 0.005) cur = r;
  if (p < 0.29 || p > 0.93) cur = null;
  if (false && cur !== capRoom) {
    capRoom = cur;
    capEl.classList.remove("show");
    if (cur) setTimeout(() => {
      if (capRoom !== cur) return;
      capEl.innerHTML = `<div class="cap-n">${String(chapters.indexOf(cur) + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}</div><h3>${cur.name}<em>${cur.en}</em></h3><p>${cur.cap}</p><div class="cap-m">${area(cur.poly).toFixed(1).replace(".", ",")} m² · h 2,90 m</div>`;
      capEl.classList.add("show");
    }, 180);
  }
  countEl.textContent = `${String(cur ? chapters.indexOf(cur) + 1 : 0).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
  document.querySelectorAll("#rail button").forEach((b, i) => b.classList.toggle("on", chapters[i] === cur));
  $("#rail").style.opacity = smooth(0.27, 0.31, p) * (1 - smooth(0.92, 0.95, p));
  $("#bar").style.transform = `scaleX(${s})`;
  updateStops(p, walk);
  document.body.classList.toggle("at-end", p > 0.95);
  document.body.classList.toggle("walking", p > 0.27 && p < 0.93);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setSize(innerWidth, innerHeight); gtao.setSize(innerWidth, innerHeight); grade.uniforms.uRes.value.set(innerWidth * PR, innerHeight * PR); }
  frameplan(); K = keys();
}
addEventListener("resize", onResize);

// ------------------------------------------------------------------ go
const pctEl = $("#load-pct");
manager.onProgress = (_, loaded, totalN) => { pctEl.textContent = `${Math.round((loaded / totalN) * 100)}%`; };
(async () => {
  // the sheet is lettered in IBM Plex Mono: wait for it before drawing
  try { await Promise.all([document.fonts.load('500 20px "IBM Plex Mono"'), document.fonts.load('600 20px "IBM Plex Mono"')]); } catch {}
  const paper = T.paperSheet(P);
  U.uSheet.value = paper.texture;
  const ground = new THREE.MeshStandardMaterial({ map: T.slab(LOW ? 512 : 1024), roughness: 0.8, envMapIntensity: 0.5 });
  sheet = new THREE.Mesh(new THREE.PlaneGeometry(paper.width, paper.height), patch(ground, { sheet: true, floor: false }));
  sheet.rotation.x = -Math.PI / 2; sheet.position.set(paper.cx, -0.004, paper.cy); sheet.receiveShadow = true;
  ground.polygonOffset = true; ground.polygonOffsetFactor = 2; ground.polygonOffsetUnits = 8;
  scene.add(sheet);

  const M = await makeMaterials();
  built = buildProperty(P, M, lineMat);
  scene.add(built.root, built.ceilings);
  for (const L of built.lights) {
    const l = new THREE.PointLight(L.color, 0, L.distance, 2);
    l.userData.base = L.intensity * 1.5;
    l.position.copy(L.pos); scene.add(l); interiorLights.push(l);
  }
  shafts = makeShafts(); dust = makeDust();
  if (QS.get("fx") !== "0") scene.add(shafts, dust);
  if (POST) setupPost();
  update(0, 0);
  renderer.compile(scene, camera);
  await new Promise(r => setTimeout(r, 60));
  document.body.classList.add("ready");
  if (qp) window.__setProgress(parseFloat(qp));
  const loop = t => {
    lenis.raf(t);
    update(forced ?? progress, t / 1000);
    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
