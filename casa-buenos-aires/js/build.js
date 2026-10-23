// Builds the flat from property.js: walls with openings, floors, ceilings, doors, windows, furniture.
// Plan (x, y) metres map to three.js (x, height, y). Furniture "front" faces +z before rotation;
// rot (degrees) turns it: 0 = faces south (down the plan), 90 = east, -90 = west, 180 = north.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const D = Math.PI / 180;
let M, lineMat, edgeList, spotLights;
let ROUND = 0; // default bevel radius while building furniture (walls stay sharp)
let PROP, mouldings, wainscot; // wall dressing is merged into a couple of meshes at the end

function inPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const roomAt = pt => PROP.rooms.find(r => !r.context && inPoly(pt, r.poly)) || null;
// a box placed in plan coordinates, pushed into a list to merge later
function pushBox(list, w, h, d, x, y, z, ry) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)));
  list.push(g);
}

// Box-project UVs in metres, so a 3 m table and a 40 cm stool show wood grain at the same scale.
function metricUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else if (ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true;
  return geo;
}

function edges(mesh, angle = 30, edgeGeo = null) {
  if (mesh.userData.noEdges) return mesh;
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(edgeGeo || mesh.geometry, angle), lineMat);
  l.raycast = () => {};
  mesh.add(l);
  edgeList.push(l);
  return mesh;
}
function mesh(geo, mat, { shadow = true, edge = 30, noEdges = false, edgeGeo = null } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow && !mat.transparent;
  m.receiveShadow = !mat.transparent;
  m.userData.noEdges = noEdges;
  if (!noEdges) edges(m, edge, edgeGeo);
  return m;
}
function box(parent, w, h, d, mat, x, y, z, ry = 0, opts = {}) {
  const r = Math.min(opts.round ?? ROUND, Math.min(w, h, d) / 2 - 0.002);
  const geo = r > 0.003 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  metricUV(geo);
  // a rounded box has no sharp creases, so its outline in the drawing comes from the plain box
  const m = mesh(geo, mat, { ...opts, edgeGeo: r > 0.003 ? new THREE.BoxGeometry(w, h, d) : null });
  m.position.set(x, y, z); m.rotation.y = ry;
  parent.add(m); return m;
}
function cyl(parent, rt, rb, h, mat, x, y, z, seg = 20, opts) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, opts);
  m.position.set(x, y, z); parent.add(m); return m;
}
const place = (g, f) => { g.position.set(f.at[0], 0, f.at[1]); g.rotation.y = (f.rot || 0) * D; return g; };

// ---------------------------------------------------------------- walls
function buildWall(root, w, H) {
  const [ax, ay] = w.a, [bx, by] = w.b;
  const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L;
  const ry = -Math.atan2(dy, dx);
  const t = w.t;
  const at = (s, h0, h1, mat = M.wall, extra = 0) => {
    const len = s[1] - s[0]; if (len <= 0.001 || h1 - h0 <= 0.001) return;
    const c = (s[0] + s[1]) / 2;
    box(root, len, h1 - h0, t + extra, mat, ax + dx * c, (h0 + h1) / 2, ay + dy * c, ry);
  };
  const ops = (w.openings || []).slice().sort((p, q) => p.at - q.at);
  const solids = [];
  let s = -t / 2;
  for (const o of ops) {
    const o0 = o.at - o.w / 2, o1 = o.at + o.w / 2;
    solids.push([s, o0]);
    if (o.type === "door") at([o0, o1], 2.2, H);
    else { at([o0, o1], 0, o.sill); at([o0, o1], o.head, H); buildWindow(root, o, ax + dx * o.at, ay + dy * o.at, ry, t, dx, dy); }
    if (o.type === "door") buildDoor(root, w, o, { ax, ay, dx, dy, t, ry });
    s = o1;
  }
  solids.push([s, L + t / 2]);
  // thin strips on each face (a full-thickness box would cover the black infill of the cut wall)
  const strip = (s, h0, h1, mat, th) => {
    const len = s[1] - s[0]; if (len <= 0.001) return;
    const c = (s[0] + s[1]) / 2;
    for (const sgn of [1, -1]) {
      const off = sgn * (t / 2 + th / 2);
      box(root, len, h1 - h0, th, mat, ax + dx * c - dy * off, (h0 + h1) / 2, ay + dy * c + dx * off, ry, { noEdges: true });
    }
  };
  for (const sp of solids) {
    at(sp, 0, H);
    strip(sp, 0, 0.1, M.skirting, 0.015);         // skirting board
    strip(sp, H - 0.12, H - 0.02, M.cornice, 0.03); // Milanese cornice
    dress(sp);
  }

  // Milanese boiserie on every face that looks into a room: a dado rail and moulded panels
  // below and above it. Bathrooms get a marble wainscot instead.
  function dress(sp) {
    const len = sp[1] - sp[0]; if (len < 0.5) return;
    const c = (sp[0] + sp[1]) / 2;
    for (const sgn of [1, -1]) {
      const nx = -dy * sgn, ny = dx * sgn;
      const probe = [ax + dx * c + nx * (t / 2 + 0.35), ay + dy * c + ny * (t / 2 + 0.35)];
      const room = roomAt(probe); if (!room) continue;
      const face = t / 2;
      const P = (along, off) => [ax + dx * along + nx * (face + off), ay + dy * along + ny * (face + off)];
      if (room.floor === "marble") {
        const [x, z] = P(c, 0.012);
        pushBox(wainscot, len - 0.02, 1.2, 0.024, x, 0.6, z, ry);
        continue;
      }
      const inset = 0.14, gap = 0.14, usable = len - inset * 2;
      { const [x, z] = P(c, 0.012); pushBox(mouldings, len - 0.01, 0.045, 0.024, x, 0.95, z, ry); } // dado rail
      if (usable < 0.4) continue;
      const n = Math.max(1, Math.round(usable / 1.25)), pw = (usable - gap * (n - 1)) / n;
      if (pw < 0.32) continue;
      for (let i = 0; i < n; i++) {
        const cc = sp[0] + inset + pw / 2 + i * (pw + gap);
        for (const [y0, y1] of [[0.22, 0.8], [1.12, 2.52]]) {
          const fy = (y0 + y1) / 2, fh = y1 - y0, bar = 0.028, dep = 0.016;
          const [x0, z0] = P(cc, dep / 2);
          pushBox(mouldings, pw, bar, dep, x0, y1 - bar / 2, z0, ry);
          pushBox(mouldings, pw, bar, dep, x0, y0 + bar / 2, z0, ry);
          for (const e of [-1, 1]) { const [x1, z1] = P(cc + e * (pw / 2 - bar / 2), dep / 2); pushBox(mouldings, bar, fh, dep, x1, fy, z1, ry); }
        }
      }
    }
  }
}

function buildWindow(root, o, cx, cz, ry, t, dx, dy) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz); g.rotation.y = ry;
  const w = o.w, s = o.sill, hd = o.head, h = hd - s, f = 0.07, depth = 0.09;
  box(g, w, f, depth, M.frame, 0, s + f / 2, 0);
  box(g, w, f, depth, M.frame, 0, hd - f / 2, 0);
  box(g, f, h, depth, M.frame, -w / 2 + f / 2, s + h / 2, 0);
  box(g, f, h, depth, M.frame, w / 2 - f / 2, s + h / 2, 0);
  if (w > 0.9) box(g, f * 0.8, h, depth, M.frame, 0, s + h / 2, 0);
  box(g, w * 0.98, f * 0.7, depth, M.frame, 0, s + h * 0.78, 0);
  box(g, w - f, h - f, 0.012, M.glass, 0, s + h / 2, 0, 0, { noEdges: true, shadow: false });
  // marble sills on both faces
  box(g, w + 0.12, 0.035, t + 0.08, M.marble, 0, s - 0.018, 0);
  // sheer linen curtains drawn back either side, on the room side of the window
  if (o.curtain) {
    for (const sgn of [-1, 1]) {
      const cw = 0.42, ch = 2.68;
      const geo = new THREE.PlaneGeometry(cw, ch, 18, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 30) * 0.035);
      geo.computeVertexNormals();
      const c = mesh(geo, M.sheer, { noEdges: true });
      c.castShadow = true;
      c.position.set(sgn * (w / 2 + cw / 2 - 0.05), 0.04 + ch / 2, o.curtain * (t / 2 + 0.12));
      g.add(c);
    }
    box(g, w + 1.1, 0.025, 0.025, M.brass, 0, 2.75, o.curtain * (t / 2 + 0.12), 0, { noEdges: true });
  }
  root.add(g);
}

function buildDoor(root, w, o, { ax, ay, dx, dy, t, ry }) {
  const nx = -dy * o.side, ny = dx * o.side; // the side the leaf opens into
  const hingeAt = o.swing === "a" ? o.at - o.w / 2 : o.at + o.w / 2;
  const closed = o.swing === "a" ? 1 : -1;
  const hx = ax + dx * hingeAt + nx * (t / 2), hy = ay + dy * hingeAt + ny * (t / 2);
  // architraves around the opening, both faces
  for (const sgn of [1, -1]) {
    const ox = -dy * sgn * (t / 2 + 0.01), oy = dx * sgn * (t / 2 + 0.01);
    for (const e of [o.at - o.w / 2 - 0.04, o.at + o.w / 2 + 0.04]) box(root, 0.08, 2.25, 0.02, M.frame, ax + dx * e + ox, 1.125, ay + dy * e + oy, ry);
    box(root, o.w + 0.16, 0.08, 0.02, M.frame, ax + dx * o.at + ox, 2.24, ay + dy * o.at + oy, ry);
  }
  // the leaf, standing open at 90 degrees into the room
  const lx = nx, ly = ny;
  const lw = o.w - 0.04;
  box(root, lw, 2.18, 0.045, o.main ? M.walnut : M.doorLeaf, hx + lx * lw / 2, 1.1, hy + ly * lw / 2, -Math.atan2(ly, lx));
  const kx = hx + lx * (lw - 0.08), ky = hy + ly * (lw - 0.08);
  box(root, 0.02, 0.02, 0.14, M.brass, kx, 1.02, ky, -Math.atan2(ly, lx), { noEdges: true });
  // swing arc on the floor, the way a plan draws it
  const a0 = Math.atan2(dy * closed, dx * closed), a1 = Math.atan2(ly, lx);
  let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= 24; i++) { const a = a0 + (da * i) / 24; pts.push(new THREE.Vector3(hx + Math.cos(a) * lw, 0.012, hy + Math.sin(a) * lw)); }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  root.add(arc); edgeList.push(arc);
}

// ---------------------------------------------------------------- floors and ceilings
function shapeOf(poly, flip) {
  const sh = new THREE.Shape();
  poly.forEach(([x, y], i) => (i ? sh.lineTo(x, flip ? -y : y) : sh.moveTo(x, flip ? -y : y)));
  return sh;
}
function floorMat(kind) { return { parquet: M.parquet, terrazzo: M.terrazzo, marble: M.marbleFloor, stone: M.stone }[kind] || M.parquet; }

export function area(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); }

// ---------------------------------------------------------------- furniture
const F = {
  chair(g) {
    const prevRound = ROUND; ROUND = 0.02;
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, 0.035, 0.44, 0.035, M.walnut, x, 0.22, z);
    box(g, 0.46, 0.06, 0.46, M.leather, 0, 0.47, 0);
    box(g, 0.44, 0.38, 0.04, M.leather, 0, 0.72, -0.21);
    ROUND = prevRound;
  },
  officeChair(g) {
    const prevRound = ROUND; ROUND = 0.035;
    for (let i = 0; i < 5; i++) { const a = i * 72 * D; box(g, 0.32, 0.03, 0.04, M.black, Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16, -a, { noEdges: true }); }
    cyl(g, 0.025, 0.025, 0.4, M.chrome, 0, 0.25, 0, 10, { noEdges: true });
    box(g, 0.5, 0.08, 0.48, M.linenDark, 0, 0.48, 0.02);
    box(g, 0.48, 0.55, 0.06, M.linenDark, 0, 0.82, -0.22);
    for (const x of [-0.26, 0.26]) box(g, 0.04, 0.2, 0.3, M.black, x, 0.62, 0.02);
    ROUND = prevRound;
  },
  armchair(g) {
    const prevRound = ROUND; ROUND = 0.06;
    box(g, 0.82, 0.4, 0.8, M.linen, 0, 0.26, 0);
    box(g, 0.82, 0.48, 0.18, M.linen, 0, 0.62, -0.31);
    for (const x of [-0.37, 0.37]) box(g, 0.1, 0.28, 0.78, M.linen, x, 0.57, 0);
    box(g, 0.62, 0.1, 0.6, M.linenLight, 0, 0.51, 0.06);
    for (const [x, z] of [[-0.34, -0.33], [0.34, -0.33], [-0.34, 0.33], [0.34, 0.33]]) box(g, 0.04, 0.06, 0.04, M.walnut, x, 0.03, z);
    ROUND = prevRound;
  },
  sofa(g, f) {
    const prevRound = ROUND; ROUND = 0.06;
    const w = f.width || 2.2;
    box(g, w, 0.38, 0.92, M.linen, 0, 0.25, 0);
    box(g, w, 0.45, 0.2, M.linen, 0, 0.6, -0.36);
    for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) box(g, 0.16, 0.25, 0.9, M.linen, x, 0.57, 0);
    const n = Math.round((w - 0.3) / 0.65);
    for (let i = 0; i < n; i++) box(g, (w - 0.32) / n - 0.02, 0.12, 0.66, M.linenLight, -w / 2 + 0.16 + ((w - 0.32) / n) * (i + 0.5), 0.5, 0.08);
    for (let i = 0; i < 2; i++) box(g, 0.42, 0.38, 0.12, i ? M.wool : M.leather, (i ? 1 : -1) * (w / 2 - 0.45), 0.72, -0.2, (i ? -1 : 1) * 0.15);
    ROUND = prevRound;
  },
  meetingTable(g, f) {
    const L = f.length, W = f.width;
    box(g, L, 0.045, W, M.walnut, 0, 0.74, 0);
    for (const x of [-L / 2 + 0.45, L / 2 - 0.45]) { box(g, 0.1, 0.7, W * 0.6, M.black, x, 0.37, 0); box(g, 0.5, 0.03, W * 0.7, M.black, x, 0.015, 0); }
    const n = f.chairs || 4;
    for (let i = 0; i < n; i++) for (const side of [1, -1]) {
      const c = new THREE.Group();
      c.position.set(-L / 2 + (L / n) * (i + 0.5), 0, side * (W / 2 + 0.3)); c.rotation.y = side > 0 ? Math.PI : 0;
      F.chair(c); g.add(c);
    }
    box(g, 0.24, 0.02, 0.32, M.paper, -0.5, 0.775, 0.1, 0.2, { noEdges: true });
    cyl(g, 0.09, 0.07, 0.16, M.ceramic, 0.6, 0.84, -0.05, 24);
  },
  bench(g, f) {
    const L = f.length, W = 1.5;
    box(g, L, 0.035, W, M.oakLight, 0, 0.74, 0);
    for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) { box(g, 0.04, 0.72, W - 0.2, M.black, x, 0.36, 0); box(g, 0.06, 0.04, W - 0.2, M.black, x, 0.02, 0); }
    box(g, 0.02, 0.3, W - 0.3, M.black, 0, 0.9, 0, 0, { noEdges: true });
    const n = f.chairs || 2;
    for (let i = 0; i < n; i++) for (const side of [1, -1]) {
      const x = -L / 2 + (L / n) * (i + 0.5);
      const c = new THREE.Group(); c.position.set(x, 0, side * (W / 2 + 0.25)); c.rotation.y = side > 0 ? Math.PI : 0; F.officeChair(c); g.add(c);
      box(g, 0.56, 0.34, 0.025, M.black, x, 1.06, side * 0.22, 0);
      box(g, 0.53, 0.31, 0.005, M.screen, x, 1.06, side * 0.235, 0, { noEdges: true });
      box(g, 0.06, 0.15, 0.06, M.black, x, 0.83, side * 0.18, 0, { noEdges: true });
    }
  },
  desk(g, f) {
    const W = f.width || 1.6, Dp = f.depth || 0.8;
    box(g, W, 0.04, Dp, f.exec ? M.walnut : M.oakLight, 0, 0.74, 0);
    if (f.exec) { box(g, 0.05, 0.72, Dp, M.walnut, -W / 2 + 0.03, 0.36, 0); box(g, 0.5, 0.6, Dp - 0.05, M.walnut, W / 2 - 0.3, 0.4, 0); box(g, W - 0.1, 0.4, 0.02, M.walnut, 0, 0.5, Dp / 2 - 0.05); }
    else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.035, 0.72, 0.035, M.black, x * (W / 2 - 0.05), 0.36, z * (Dp / 2 - 0.05));
    const laptop = (x, z, r) => { const l = new THREE.Group(); l.position.set(x, 0.76, z); l.rotation.y = r; box(l, 0.34, 0.015, 0.24, M.chrome, 0, 0.008, 0); const s = box(l, 0.34, 0.23, 0.01, M.chrome, 0, 0.11, -0.12); s.rotation.x = -0.2; g.add(l); };
    if (f.double) { laptop(-0.3, -0.2, 0); laptop(0.3, 0.2, Math.PI); }
    else laptop(0, -0.1, 0);
    box(g, 0.22, 0.03, 0.3, M.paper, W / 2 - 0.35, 0.775, 0, 0.3, { noEdges: true });
  },
  deskLamp(g) {
    cyl(g, 0.07, 0.08, 0.02, M.black, 0, 0.77, 0, 16, { noEdges: true });
    const arm = box(g, 0.015, 0.42, 0.015, M.black, 0.05, 0.98, 0, 0, { noEdges: true }); arm.rotation.z = -0.3;
    const sh = cyl(g, 0.04, 0.09, 0.12, M.brass, 0.13, 1.18, 0, 16, { noEdges: true }); sh.rotation.z = 0.6;
  },
  shelf(g, f) {
    const W = f.width, Hh = f.height || 2.1, d = 0.35, n = Math.max(2, Math.round(Hh / 0.38));
    box(g, W, Hh, 0.02, M.walnut, 0, Hh / 2, -d / 2 + 0.01);
    for (const x of [-W / 2, W / 2]) box(g, 0.03, Hh, d, M.walnut, x, Hh / 2, 0);
    const cols = Math.max(1, Math.round(W / 0.9));
    for (let c = 1; c < cols; c++) box(g, 0.025, Hh, d, M.walnut, -W / 2 + (W / cols) * c, Hh / 2, 0);
    let seed = Math.round(W * 997 + Hh * 31);
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i <= n; i++) {
      const y = (Hh / n) * i;
      box(g, W, 0.03, d, M.walnut, 0, Math.min(Hh - 0.015, y + 0.015), 0);
      if (i === n) continue;
      for (let c = 0; c < cols; c++) {
        let x = -W / 2 + (W / cols) * c + 0.05; const end = x + W / cols - 0.1;
        while (x < end - 0.05) {
          if (r() < 0.12) { x += 0.12 + r() * 0.15; continue; }
          const bw = 0.025 + r() * 0.035, bh = 0.2 + r() * 0.12;
          const b = box(g, bw, bh, 0.22, M.books[Math.floor(r() * M.books.length)], x + bw / 2, y + 0.03 + bh / 2, 0.03, 0, { noEdges: true });
          if (r() < 0.08) b.rotation.z = 0.25;
          x += bw + 0.004;
        }
      }
    }
  },
  credenza(g, f) {
    const W = f.width;
    box(g, W, 0.58, 0.45, M.walnut, 0, 0.47, 0);
    for (let i = 1; i < 3; i++) box(g, 0.006, 0.54, 0.005, M.black, -W / 2 + (W / 3) * i, 0.47, 0.226, 0, { noEdges: true });
    for (const x of [-W / 2 + 0.08, W / 2 - 0.08]) for (const z of [-0.17, 0.17]) box(g, 0.03, 0.18, 0.03, M.black, x, 0.09, z);
    cyl(g, 0.08, 0.06, 0.32, M.ceramic, -W / 2 + 0.35, 0.92, 0, 24);
    box(g, 0.32, 0.06, 0.24, M.books[2], W / 2 - 0.4, 0.79, 0, 0.1);
  },
  fireplace(g) {
    box(g, 1.7, 0.06, 0.32, M.marble, 0, 1.15, 0.12);
    for (const x of [-0.72, 0.72]) box(g, 0.26, 1.12, 0.22, M.marble, x, 0.56, 0.11);
    box(g, 1.18, 0.22, 0.22, M.marble, 0, 1.01, 0.11);
    box(g, 1.18, 0.9, 0.05, M.soot, 0, 0.45, 0.02);
    box(g, 1.9, 0.04, 0.5, M.marble, 0, 0.02, 0.25);
    for (let i = 0; i < 3; i++) cyl(g, 0.05, 0.05, 0.5, M.walnut, -0.2 + i * 0.1, 0.12 + (i % 2) * 0.08, 0.15, 10, { noEdges: true }).rotation.z = Math.PI / 2;
    cyl(g, 0.05, 0.05, 0.28, M.brass, 0.55, 1.32, 0.12, 16);
    cyl(g, 0.05, 0.05, 0.22, M.brass, -0.6, 1.29, 0.12, 16);
  },
  art(g, f) {
    const [w, h] = f.size;
    box(g, w + 0.06, h + 0.06, 0.035, M.frameBlack, 0, f.y, 0.03);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.art(f.seed || 1));
    p.position.set(0, f.y, 0.05); g.add(p);
  },
  plant(g, f) {
    const s = f.size || 1.2;
    cyl(g, 0.17 * s, 0.13 * s, 0.32 * s, M.pot, 0, 0.16 * s, 0, 24);
    let seed = Math.round(s * 1000 + g.position.x * 10);
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    cyl(g, 0.012, 0.018, s * 0.75, M.walnut, 0, s * 0.5, 0, 6, { noEdges: true });
    const leafGeo = new THREE.SphereGeometry(0.05 * s, 10, 6);
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, y = s * (0.42 + r() * 0.6), rr = 0.05 + r() * 0.17 * s;
      const leaf = mesh(leafGeo, r() < 0.35 ? M.leafLight : M.leaf, { noEdges: true });
      leaf.scale.set(2.1, 0.22, 0.8);
      leaf.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      leaf.rotation.set(0, -a, -0.25 - r() * 0.5);
      g.add(leaf);
    }
  },
  rug(g, f) { box(g, f.size[0], 0.012, f.size[1], M.wool, 0, 0.006, 0, 0, { shadow: false }); },
  runner(g, f) { box(g, f.size[0], 0.01, f.size[1], M.runner, 0, 0.005, 0, 0, { shadow: false }); },
  sideTable(g) { cyl(g, 0.26, 0.26, 0.03, M.marble, 0, 0.55, 0, 32); cyl(g, 0.03, 0.03, 0.54, M.black, 0, 0.27, 0, 10); cyl(g, 0.16, 0.16, 0.02, M.black, 0, 0.01, 0, 24); },
  coffeeTable(g) { cyl(g, 0.45, 0.45, 0.04, M.marble, 0, 0.38, 0, 40); cyl(g, 0.36, 0.36, 0.36, M.walnut, 0, 0.18, 0, 40); box(g, 0.28, 0.04, 0.2, M.books[5], 0.1, 0.42, -0.05, 0.4); },
  console(g, f) {
    const W = f.width || 1.2;
    box(g, W, 0.035, 0.34, M.walnut, 0, 0.82, 0);
    for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) for (const z of [-0.12, 0.12]) box(g, 0.02, 0.8, 0.02, M.brass, x, 0.4, z, 0, { noEdges: true });
    cyl(g, 0.07, 0.1, 0.36, M.ceramic, -W / 2 + 0.3, 1.02, 0, 24);
    box(g, 0.25, 0.05, 0.2, M.books[1], W / 2 - 0.3, 0.86, 0);
  },
  floorLamp(g) {
    cyl(g, 0.16, 0.16, 0.03, M.black, 0, 0.015, 0, 24);
    cyl(g, 0.012, 0.012, 1.45, M.brass, 0, 0.74, 0, 8, { noEdges: true });
    cyl(g, 0.16, 0.22, 0.26, M.lampShade, 0, 1.5, 0, 24);
    g.userData.light = [0, 1.45, 0, 0xffe6cc, 1.6, 4.5];
  },
  pendantBar(g, f) {
    const L = f.length;
    box(g, L, 0.04, 0.06, M.black, 0, 2.05, 0);
    box(g, L - 0.04, 0.01, 0.05, M.glow, 0, 2.028, 0, 0, { noEdges: true, shadow: false });
    for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) cyl(g, 0.003, 0.003, 0.85, M.black, x, 2.48, 0, 4, { noEdges: true });
    g.userData.light = [0, 1.85, 0, 0xfff0e2, 2.4, 6];
  },
  spots(g, f, root, H) {
    const [x0, y0] = f.from, [x1, y1] = f.to;
    for (let i = 0; i < f.n; i++) {
      const t = i / (f.n - 1);
      cyl(root, 0.06, 0.06, 0.02, M.glow, x0 + (x1 - x0) * t, H - 0.012, y0 + (y1 - y0) * t, 20, { noEdges: true, shadow: false });
      if (i % 2 === 0) spotLights.push({ pos: new THREE.Vector3(x0 + (x1 - x0) * t, H - 0.3, y0 + (y1 - y0) * t), color: 0xfff1e4, intensity: 1.7, distance: 5 });
    }
  },
  sconce(g) {
    box(g, 0.1, 0.18, 0.02, M.brass, 0, 1.78, 0.01, 0, { noEdges: true });
    box(g, 0.02, 0.02, 0.12, M.brass, 0, 1.78, 0.07, 0, { noEdges: true });
    cyl(g, 0.055, 0.045, 0.16, M.glow, 0, 1.86, 0.13, 20, { noEdges: true, shadow: false });
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), M.wash);
    wash.position.set(0, 1.95, 0.004); wash.renderOrder = 4; g.add(wash);
    g.userData.light = [0, 1.9, 0.25, 0xffe8d2, 0.9, 3.0];
  },
  vanity(g, f) {
    const W = f.width;
    box(g, W, 0.42, 0.48, M.walnut, 0, 0.6, 0);
    box(g, W + 0.02, 0.04, 0.5, M.marble, 0, 0.83, 0.01);
    const n = W > 1.1 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i ? 1 : -1) * W / 4;
      cyl(g, 0.17, 0.15, 0.12, M.ceramic, x, 0.91, 0.02, 28);
      cyl(g, 0.012, 0.012, 0.22, M.chrome, x, 0.95, -0.2, 8, { noEdges: true });
      box(g, 0.5, 0.75, 0.02, M.mirror, x, 1.55, -0.23, 0, { noEdges: true });
    }
  },
  toilet(g) {
    box(g, 0.38, 0.4, 0.2, M.ceramic, 0, 0.6, -0.22);
    cyl(g, 0.19, 0.16, 0.4, M.ceramic, 0, 0.2, 0.05, 24);
    cyl(g, 0.2, 0.2, 0.03, M.ceramic, 0, 0.41, 0.05, 24);
  },
};

// ---------------------------------------------------------------- entry point
export function buildProperty(prop, materials, lineMaterial) {
  M = materials; lineMat = lineMaterial; edgeList = []; spotLights = []; PROP = prop; mouldings = []; wainscot = [];
  const H = prop.height;
  const root = new THREE.Group();
  const ceilings = new THREE.Group();
  const lights = [];

  for (const r of prop.rooms) {
    const fl = mesh(new THREE.ShapeGeometry(shapeOf(r.poly, true)), floorMat(r.floor), { shadow: false, edge: 89 });
    fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true;
    root.add(fl);
    if (r.context) continue;
    const ce = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(r.poly, false)), M.ceiling);
    ce.rotation.x = Math.PI / 2; ce.position.y = H; ce.castShadow = true; ce.receiveShadow = true;
    ceilings.add(ce);
  }
  // a slab above everything blocks the sun from coming in through the roof
  for (const w of prop.walls) buildWall(root, w, H);
  if (mouldings.length) { const mm = new THREE.Mesh(mergeGeometries(mouldings), M.moulding); mm.castShadow = mm.receiveShadow = true; root.add(mm); }
  if (wainscot.length) { const mw = new THREE.Mesh(mergeGeometries(wainscot), M.marble); mw.receiveShadow = true; root.add(mw); }

  ROUND = 0.012; // furniture gets softly rounded edges
  for (const f of prop.furniture) {
    if (f.type === "spots") { F.spots(null, f, root, H); continue; }
    const g = new THREE.Group();
    place(g, f);
    F[f.type](g, f);
    root.add(g);
    if (g.userData.light) {
      const [x, y, z, col, I, dist] = g.userData.light;
      const v = new THREE.Vector3(x, y, z).applyMatrix4(new THREE.Matrix4().compose(g.position, g.quaternion, g.scale));
      lights.push({ pos: v, color: col, intensity: I, distance: dist });
    }
  }
  ROUND = 0;
  return { root, ceilings, lights: lights.concat(spotLights), edges: edgeList };
}
