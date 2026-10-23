// Textures drawn in code: herringbone parquet (cut from a CC0 oak scan), terrazzo,
// Milanese facades for the window views, the paper plan sheet and the paintings.
import * as THREE from "three";

const rnd = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const canvas = (w, h = w) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
export const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function tex(c, { repeat = 1, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Parquet a spina ungherese (chevron): oak planks 0.6 m x 0.1 m at 45 degrees meeting on a seam,
// each plank cut from a random spot of the CC0 oak scan. The tile is sized so it repeats seamlessly.
export function chevron(oakImg, ppm = 760) {
  const hw = 0.6 / Math.SQRT2, t = 0.1 * Math.SQRT2; // half-column width and plank height, metres
  const cols = 3, rows = 17, tileW = cols * 2 * hw, tileH = rows * t;
  const c = canvas(Math.round(tileW * ppm), Math.round(tileH * ppm)), g = c.getContext("2d"), r = rnd(7);
  const HW = hw * ppm, T = t * ppm, S = c.width / (tileW * ppm);
  g.fillStyle = "#6e4d30"; g.fillRect(0, 0, c.width, c.height);
  const plank = () => {
    const sx = r() * (oakImg.width - 420), sy = r() * (oakImg.height - 70);
    g.drawImage(oakImg, sx, sy, 420, 70, 0, 0, HW, T);
    const shade = 0.84 + r() * 0.3;
    g.fillStyle = shade < 1 ? `rgba(45,26,10,${(1 - shade) * 0.85})` : `rgba(255,232,196,${(shade - 1) * 0.5})`;
    g.fillRect(0, 0, HW, T);
    g.strokeStyle = "rgba(35,20,8,0.6)"; g.lineWidth = 1.4; g.strokeRect(0, 0, HW, T);
  };
  for (let col = 0; col < cols; col++) {
    const x0 = col * 2 * HW * S;
    for (let k = -Math.ceil(HW / T) - 2; k < rows + Math.ceil(HW / T) + 2; k++) {
      const y = k * T;
      g.setTransform(S, -S, 0, S, x0, y); plank();           // left half rises to the seam
      g.setTransform(S, S, 0, S, x0 + HW * S, y - HW * S); plank(); // right half falls away from it
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const tx = tex(c);
  tx.repeat.set(1 / tileW, 1 / tileH);
  return tx;
}

// Terrazzo alla veneziana: cream ground, chips of white, grey, red Verona and black marble.
export function terrazzo(size = 1024, tileMetres = 1.1) {
  const c = canvas(size), g = c.getContext("2d"), r = rnd(11);
  g.fillStyle = "#d9cfc0"; g.fillRect(0, 0, size, size);
  const cols = ["#f3efe8", "#efe9df", "#f6f2ea", "#b9b1a6", "#8f877d", "#a9513f", "#2f2b28", "#e7dccb", "#cdbfa9", "#ddd3c3"];
  for (let i = 0; i < 14000; i++) {
    const x = r() * size, y = r() * size, s = 1.5 + Math.pow(r(), 3.5) * 13;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath();
    const n = 5 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.5, rr = s * (0.6 + r() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return tex(c, { repeat: 1 / tileMetres });
}

// A Milanese facade across the street: ochre stucco, tall windows with green shutters, balconies.
export function facade({ seed = 1, w = 2048, h = 2048, colour = "#d9a46a", lit = 1, repeat = 1 } = {}) {
  const c = canvas(w, h), g = c.getContext("2d"), r = rnd(seed);
  g.fillStyle = colour; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < .5 ? "255,240,220" : "90,60,40"},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 30 + r() * 120, 20 + r() * 80); }
  const floors = 8, fh = h / floors, bays = 9, bw = w / bays;
  for (let f = 0; f < floors; f++) {
    g.fillStyle = "rgba(255,245,230,0.35)"; g.fillRect(0, f * fh + fh - 14, w, 10); // string course
    for (let b = 0; b < bays; b++) {
      const x = b * bw + bw * 0.3, y = f * fh + fh * 0.18, ww = bw * 0.4, wh = fh * 0.62;
      g.fillStyle = "#efe4d2"; g.fillRect(x - 8, y - 10, ww + 16, wh + 18); // frame
      const open = r();
      g.fillStyle = open < 0.55 ? "#1f2a33" : "#2e5a43"; g.fillRect(x, y, ww, wh);
      if (open < 0.55) { g.fillStyle = `rgba(255,${190 + r() * 40},120,${0.18 + r() * 0.4})`; g.fillRect(x + 4, y + wh * 0.5, ww - 8, wh * 0.48); }
      if (open >= 0.55) { g.strokeStyle = "rgba(0,0,0,.25)"; for (let k = 0; k < wh; k += 9) { g.beginPath(); g.moveTo(x, y + k); g.lineTo(x + ww, y + k); g.stroke(); } }
      if (f > 0 && f < floors - 1 && b % 3 === 1) { g.fillStyle = "#3a3a38"; g.fillRect(x - 24, y + wh - 4, ww + 48, 8); for (let k = 0; k < ww + 48; k += 10) g.fillRect(x - 24 + k, y + wh - 60, 3, 60); }
    }
  }
  if (lit !== 1) { g.fillStyle = lit < 1 ? `rgba(40,30,60,${1 - lit})` : `rgba(255,170,90,${lit - 1})`; g.fillRect(0, 0, w, h); }
  // the roofline: a stone cornice against the sky
  g.fillStyle = "#efe2cc"; g.fillRect(0, 0, w, 26); g.fillStyle = "rgba(60,40,25,.35)"; g.fillRect(0, 26, w, 8);
  const t = tex(c); t.repeat.set(repeat, 1); t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// The plan sheet everything stands on: mottled paper, the structural grid with its bubbles,
// dimension chains, the neighbours, stairs and lifts, north arrow and scale bar.
// Returned as raw sRGB (no colour conversion): the drawing shader writes it straight to the screen.
export function paperSheet(prop, { ppm = 48 } = {}) {
  const { x0, y0, x1, y1 } = prop.bounds;
  const W = Math.round((x1 - x0) * ppm), H = Math.round((y1 - y0) * ppm);
  const c = canvas(W, H), g = c.getContext("2d"), r = rnd(3);
  const X = x => (x - x0) * ppm, Y = y => (y - y0) * ppm;
  const INK = "#2a2825", SOFT = "rgba(42,40,37,0.55)";
  // paper: warm ground, soft watercolour mottling, fibres
  g.fillStyle = "#f3efe7"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 180; i++) {
    const x = r() * W, y = r() * H, rr = (0.8 + r() * 3.0) * ppm;
    const grad = g.createRadialGradient(x, y, 0, x, y, rr);
    const dark = r() < 0.55;
    grad.addColorStop(0, dark ? "rgba(160,140,110,0.022)" : "rgba(255,253,248,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 30000; i++) { g.fillStyle = "rgba(120,100,70," + (r() * 0.04) + ")"; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 1.2); }
  g.strokeStyle = "rgba(140,120,95,0.07)"; g.lineWidth = 1;
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }

  const text = (s, x, y, size, { weight = 500, align = "center", rot = 0, font = "IBM Plex Mono", color = INK, spacing = 1 } = {}) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = color;
    g.font = weight + " " + Math.round(size * ppm) + "px \"" + font + "\", ui-monospace, monospace";
    g.textAlign = align; g.textBaseline = "middle"; g.letterSpacing = spacing + "px"; g.fillText(s, 0, 0); g.restore();
  };

  // structural grid: dash-dot axes running past the building, with lettered and numbered bubbles
  const G = prop.grid;
  g.strokeStyle = "rgba(42,40,37,0.42)"; g.lineWidth = 1; g.setLineDash([22, 6, 3, 6]);
  for (const col of G.cols) { g.beginPath(); g.moveTo(X(col.x), Y(-2.6)); g.lineTo(X(col.x), Y(20.9)); g.stroke(); }
  for (const row of G.rows) { g.beginPath(); g.moveTo(X(-2.6), Y(row.y)); g.lineTo(X(19.6), Y(row.y)); g.stroke(); }
  g.setLineDash([]);
  const bubble = (x, y, id) => {
    g.fillStyle = "#f3efe7"; g.strokeStyle = INK; g.lineWidth = 1.4;
    g.beginPath(); g.arc(X(x), Y(y), 0.36 * ppm, 0, Math.PI * 2); g.fill(); g.stroke();
    text(id, X(x), Y(y) + 1, 0.34, { weight: 500 });
  };
  for (const col of G.cols) bubble(col.x, -3.0, col.id);
  for (const row of G.rows) bubble(-3.0, row.y, row.id);

  // dimension chains: ticks at 45 degrees, figures above the line
  const fmt = v => v.toFixed(2);
  const chainH = (xs, y) => {
    g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(xs[0] - 0.3), Y(y)); g.lineTo(X(xs[xs.length - 1] + 0.3), Y(y)); g.stroke();
    for (const x of xs) { g.beginPath(); g.moveTo(X(x) - 5, Y(y) + 5); g.lineTo(X(x) + 5, Y(y) - 5); g.stroke(); g.beginPath(); g.moveTo(X(x), Y(y) - 9); g.lineTo(X(x), Y(y) + 9); g.stroke(); }
    for (let i = 0; i < xs.length - 1; i++) text(fmt(xs[i + 1] - xs[i]), (X(xs[i]) + X(xs[i + 1])) / 2, Y(y) - 0.26 * ppm, 0.3);
  };
  const chainV = (ys, x) => {
    g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(x), Y(ys[0] - 0.3)); g.lineTo(X(x), Y(ys[ys.length - 1] + 0.3)); g.stroke();
    for (const y of ys) { g.beginPath(); g.moveTo(X(x) - 5, Y(y) + 5); g.lineTo(X(x) + 5, Y(y) - 5); g.stroke(); g.beginPath(); g.moveTo(X(x) - 9, Y(y)); g.lineTo(X(x) + 9, Y(y)); g.stroke(); }
    for (let i = 0; i < ys.length - 1; i++) text(fmt(ys[i + 1] - ys[i]), X(x) - 0.26 * ppm, (Y(ys[i]) + Y(ys[i + 1])) / 2, 0.3, { rot: -Math.PI / 2 });
  };
  const xs = G.cols.map(c => c.x), ys = G.rows.map(r => r.y);
  chainH(xs, -1.25); chainH([xs[0], xs[xs.length - 1]], -2.0);
  chainV(ys, -1.25); chainV([ys[0], ys[ys.length - 1]], -2.0);

  // neighbouring lots, dashed like the cadastral plan
  g.strokeStyle = SOFT; g.setLineDash([10, 7]); g.lineWidth = 1.5;
  for (const line of prop.context.dashed) { g.beginPath(); line.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); }
  g.setLineDash([]);
  // stairs and lifts
  g.strokeStyle = INK;
  const s = prop.context.stair; g.lineWidth = 1.3; g.strokeRect(X(s.x0), Y(s.y0), X(s.x1) - X(s.x0), Y(s.y1) - Y(s.y0));
  const mid = (s.x0 + s.x1) / 2;
  g.beginPath(); g.moveTo(X(mid), Y(s.y0)); g.lineTo(X(mid), Y(s.y1)); g.stroke();
  g.lineWidth = 0.9;
  for (let y = s.y0 + 0.28; y < s.y1; y += 0.28) { g.beginPath(); g.moveTo(X(s.x0), Y(y)); g.lineTo(X(s.x1), Y(y)); g.stroke(); }
  g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(X(s.x0 + 0.5), Y(s.y1 - 0.4)); g.lineTo(X(mid - 0.2), Y(s.y0 + 0.6)); g.lineTo(X(mid - 0.45), Y(s.y0 + 0.95)); g.stroke();
  for (const [a, b, cc, d] of prop.context.lifts) { g.strokeRect(X(a), Y(b), X(cc) - X(a), Y(d) - Y(b)); g.beginPath(); g.moveTo(X(a), Y(b)); g.lineTo(X(cc), Y(d)); g.moveTo(X(cc), Y(b)); g.lineTo(X(a), Y(d)); g.stroke(); }
  // labels
  for (const l of prop.context.labels) text(l.text, X(l.at[0]), Y(l.at[1]), l.size, { rot: ((l.rot || 0) * Math.PI) / 180, spacing: 3 });
  // north arrow
  const nx = X(19.6), ny = Y(-2.6);
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 1.6;
  g.beginPath(); g.arc(nx, ny, 0.62 * ppm, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(nx, ny - 0.55 * ppm); g.lineTo(nx + 0.2 * ppm, ny + 0.28 * ppm); g.lineTo(nx, ny + 0.12 * ppm); g.closePath(); g.fill();
  text("N", nx, ny - 0.88 * ppm, 0.34, { weight: 600 });
  // scale bar, 0 to 5 m
  const sx = X(-4.9), sy = Y(21.7);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#f3efe7" : INK; g.fillRect(sx + i * ppm, sy, ppm, 0.14 * ppm); }
  g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(sx, sy, 5 * ppm, 0.14 * ppm);
  for (const m of [0, 1, 2, 5]) text(String(m), sx + m * ppm, sy + 0.45 * ppm, 0.26);
  text("m", sx + 5.35 * ppm, sy + 0.08 * ppm, 0.26, { align: "left" });
  // sheet border, doubled like a printed sheet
  const [bx0, by0, bx1, by1] = prop.sheet.border;
  g.strokeStyle = INK; g.lineWidth = 2.2; g.strokeRect(X(bx0), Y(by0), X(bx1) - X(bx0), Y(by1) - Y(by0));
  g.lineWidth = 0.8; g.strokeRect(X(bx0) + 7, Y(by0) + 7, X(bx1) - X(bx0) - 14, Y(by1) - Y(by0) - 14);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.anisotropy = 16;
  return { texture: t, width: x1 - x0, height: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// Pale limestone slabs, 1.2 x 0.6 m, for the ground around the flat in the rendered plan.
export function slab(size = 1024, tileMetres = 4.8) {
  const c = canvas(size), g = c.getContext("2d"), r = rnd(21), ppm = size / tileMetres;
  g.fillStyle = "#b8afa2"; g.fillRect(0, 0, size, size);
  for (let y = 0; y < tileMetres / 0.6; y++) for (let x = 0; x < tileMetres / 1.2; x++) {
    const off = (y % 2) * 0.6;
    const shade = 192 + Math.floor(r() * 18);
    g.fillStyle = `rgb(${shade + 6},${shade},${shade - 10})`;
    g.fillRect(((x * 1.2 + off) % tileMetres) * ppm + 1, y * 0.6 * ppm + 1, 1.2 * ppm - 2, 0.6 * ppm - 2);
    if (off) g.fillRect(0, y * 0.6 * ppm + 1, off * ppm - 1, 0.6 * ppm - 2);
  }
  for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(90,80,65,${r() * 0.05})`; g.fillRect(r() * size, r() * size, 1.5, 1.5); }
  return tex(c, { repeat: 1 / tileMetres });
}

// Small abstract paintings, a different one for each seed.
export function painting(seed = 1, w = 512, h = 512) {
  const c = canvas(w, h), g = c.getContext("2d"), r = rnd(seed * 97);
  const palettes = [["#e8e0d2", "#a8553a", "#2b3240", "#c99a52", "#8a9784"], ["#efe8dc", "#3a4237", "#a47c5a", "#d6c6ad", "#7d3b33"], ["#e6dfd3", "#2f3a4f", "#b98e4f", "#9fadb3", "#a8644a"], ["#ddd5c6", "#1f1e1c", "#8c8274", "#c2b49c", "#6e5a48"]];
  const p = palettes[seed % palettes.length];
  g.fillStyle = p[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5 + Math.floor(r() * 4); i++) {
    g.fillStyle = p[1 + Math.floor(r() * (p.length - 1))];
    g.globalAlpha = 0.75 + r() * 0.25;
    const k = r();
    if (k < 0.4) g.fillRect(r() * w * 0.8, r() * h * 0.8, w * (0.15 + r() * 0.5), h * (0.1 + r() * 0.4));
    else if (k < 0.75) { g.beginPath(); g.arc(r() * w, r() * h, w * (0.08 + r() * 0.25), 0, Math.PI * (1 + r())); g.fill(); }
    else { g.lineWidth = 6 + r() * 18; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(r() * w, r() * h); g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); g.stroke(); }
  }
  g.globalAlpha = 1;
  return tex(c, { repeat: 1, aniso: 4 });
}
