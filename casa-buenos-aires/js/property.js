// One property = this file. The engine (build.js, main.js) reads it and builds the walkthrough.
// Coordinates are metres on the plan: x grows east (right), y grows south (down), like the drawing.
// Read from the cadastral plan "Piano quinto H. 2.90", Corso Buenos Aires, Milan. The plan has no
// dimensions, so the scale is estimated (about 0.04 m per pixel of the scan).

export const property = {
  id: "corso-buenos-aires-5",
  title: "Corso Buenos Aires",
  city: "Milano",
  subtitle: "Quinto piano · ufficio · h 2,90 m",
  tagline: "A fifth-floor studio above Corso Buenos Aires, where the late sun comes in sideways.",
  height: 2.9,
  scaleNote: "Scale estimated from the cadastral plan. Not a survey.",
  sun: { azimuth: 256, elevation: 12 }, // from the west, over Corso Buenos Aires
  bounds: { x0: -6.5, y0: -5, x1: 22, y1: 23.5 },
  sheet: { border: [-5.8, -4.3, 21.3, 22.9], number: "A-101", scale: "1:100", drawing: "Pianta piano quinto" },
  // structural grid, as an architect would set it out (axes on the main wall lines)
  grid: {
    cols: [{ id: "A", x: 0.85 }, { id: "B", x: 7.75 }, { id: "C", x: 10.25 }, { id: "D", x: 15.55 }],
    rows: [{ id: "1", y: 0.25 }, { id: "2", y: 3.45 }, { id: "3", y: 8.95 }, { id: "4", y: 13.25 }, { id: "5", y: 17.45 }],
  },
  planSun: { azimuth: 210, elevation: 52 }, // a high, soft sun for the rendered half of the opening plan

  // ---------- walls (centre lines) ----------
  // openings: at = distance from `a` to the opening's centre; w = width
  walls: [
    // north side of the front room and storage
    { a: [0.85, 0.25], b: [7.75, 0.25], t: 0.35, ext: true },
    // street facade with the bay window (Corso Buenos Aires)
    { a: [0.85, 0.25], b: [0.85, 1.4], t: 0.5, ext: true },
    { a: [0.85, 1.4], b: [0.35, 1.8], t: 0.35, ext: true },
    { a: [0.35, 1.8], b: [0.35, 4.1], t: 0.35, ext: true, openings: [{ type: "window", at: 1.15, w: 1.7, sill: 0.25, head: 2.55, curtain: -1 }] },
    { a: [0.35, 4.1], b: [0.85, 4.5], t: 0.35, ext: true },
    { a: [0.85, 4.5], b: [0.85, 5.85], t: 0.5, ext: true, openings: [{ type: "window", at: 0.68, w: 0.8, sill: 0.35, head: 2.5, curtain: -1 }] },
    { a: [0.85, 5.85], b: [1.75, 5.85], t: 0.35, ext: true },
    { a: [1.75, 5.85], b: [1.75, 15.15], t: 0.5, ext: true, openings: [
      { type: "window", at: 1.55, w: 1.25, sill: 0.35, head: 2.55, curtain: -1 },
      { type: "window", at: 4.95, w: 1.25, sill: 0.35, head: 2.55, curtain: -1 },
      { type: "window", at: 7.75, w: 1.25, sill: 0.35, head: 2.55, curtain: -1 },
    ] },
    { a: [1.75, 15.15], b: [7.75, 15.15], t: 0.35, ext: true },
    // partitions on the street side
    { a: [1.75, 5.85], b: [7.75, 5.85], t: 0.3 },
    { a: [1.75, 8.95], b: [7.75, 8.95], t: 0.3 },
    { a: [6.25, 0.25], b: [6.25, 3.55], t: 0.15 },
    { a: [6.25, 3.55], b: [7.75, 3.55], t: 0.15, openings: [{ type: "door", at: 0.78, w: 0.75, swing: "a", side: -1 }] },
    // the corridor
    { a: [7.75, 0.25], b: [7.75, 17.45], t: 0.3, ext: true, openings: [
      { type: "door", at: 4.35, w: 1.0, swing: "b", side: 1 },
      { type: "door", at: 7.15, w: 0.9, swing: "b", side: 1 },
      { type: "door", at: 13.95, w: 0.9, swing: "b", side: 1 },
    ] },
    { a: [7.75, 3.45], b: [15.55, 3.45], t: 0.35, ext: true },
    { a: [10.25, 3.45], b: [10.25, 17.45], t: 0.25, openings: [
      { type: "door", at: 0.95, w: 0.75, swing: "a", side: -1 },
      { type: "door", at: 2.8, w: 0.75, swing: "a", side: -1 },
      { type: "door", at: 4.55, w: 0.9, swing: "b", side: -1 },
      { type: "door", at: 7.55, w: 0.9, swing: "a", side: -1 },
    ] },
    { a: [7.75, 17.45], b: [10.25, 17.45], t: 0.35, ext: true, openings: [{ type: "door", at: 1.25, w: 1.1, swing: "a", side: -1, main: true }] },
    // courtyard facade (cortile)
    { a: [15.55, 3.45], b: [15.55, 13.25], t: 0.5, ext: true, openings: [
      { type: "window", at: 1.0, w: 0.7, sill: 1.1, head: 2.4 },
      { type: "window", at: 2.8, w: 0.7, sill: 1.1, head: 2.4 },
      { type: "window", at: 5.05, w: 1.25, sill: 0.4, head: 2.5 },
      { type: "window", at: 8.15, w: 1.25, sill: 0.4, head: 2.5 },
    ] },
    { a: [10.25, 5.45], b: [15.55, 5.45], t: 0.15 },
    { a: [10.25, 7.05], b: [15.55, 7.05], t: 0.15 },
    { a: [10.25, 9.95], b: [15.55, 9.95], t: 0.2 },
    { a: [10.25, 13.25], b: [15.55, 13.25], t: 0.35, ext: true },
  ],

  // ---------- rooms ----------
  // reveal: scroll range where the room's materials sweep in, from `from` towards `to`
  rooms: [
    { id: "ingresso", name: "Ingresso", en: "Entrance hall", floor: "terrazzo", cap: "Terrazzo alla veneziana, a 14-metre gallery of light.",
      poly: [[7.75, 3.45], [10.25, 3.45], [10.25, 17.45], [7.75, 17.45]], label: [9.0, 9.6], reveal: [0.27, 0.322], from: [9.0, 17.6], to: [9.0, 3.4] },
    { id: "open", name: "Open space", en: "Studio", floor: "parquet", cap: "Six by six metres, two windows on the Corso.",
      poly: [[1.75, 8.95], [7.75, 8.95], [7.75, 15.15], [1.75, 15.15]], label: [4.7, 12.0], reveal: [0.345, 0.418], from: [7.9, 14.2], to: [1.6, 10.2] },
    { id: "ufficio2", name: "Ufficio", en: "Office", floor: "parquet", cap: "Quiet room on the courtyard.",
      poly: [[10.25, 9.95], [15.55, 9.95], [15.55, 13.25], [10.25, 13.25]], label: [12.9, 11.6], reveal: [0.53, 0.557], from: [10.1, 11.0], to: [15.6, 11.6] },
    { id: "direzione", name: "Direzione", en: "Director's office", floor: "parquet", cap: "Morning light from the cortile.",
      poly: [[10.25, 7.05], [15.55, 7.05], [15.55, 9.95], [10.25, 9.95]], label: [12.9, 8.5], reveal: [0.59, 0.617], from: [10.1, 8.0], to: [15.6, 8.5] },
    { id: "bagno1", name: "Bagno", en: "Bathroom", floor: "marble", cap: "",
      poly: [[10.25, 3.45], [15.55, 3.45], [15.55, 5.45], [10.25, 5.45]], label: [12.9, 4.45], reveal: [0.585, 0.618], from: [10.1, 4.4], to: [15.6, 4.4] },
    { id: "bagno2", name: "Bagno", en: "Bathroom", floor: "marble", cap: "",
      poly: [[10.25, 5.45], [15.55, 5.45], [15.55, 7.05], [10.25, 7.05]], label: [12.9, 6.25], reveal: [0.585, 0.618], from: [10.1, 6.25], to: [15.6, 6.25] },
    { id: "studio", name: "Studio", en: "Private study", floor: "parquet", cap: "A desk facing the street.",
      poly: [[1.75, 5.85], [7.75, 5.85], [7.75, 8.95], [1.75, 8.95]], label: [4.7, 7.4], reveal: [0.64, 0.663], from: [7.9, 7.4], to: [1.6, 7.4] },
    { id: "salone", name: "Sala riunioni", en: "Meeting room", floor: "parquet", cap: "The bay window, a marble fireplace, and the Corso below.",
      poly: [[0.85, 0.25], [6.25, 0.25], [6.25, 3.55], [7.75, 3.55], [7.75, 5.85], [0.85, 5.85], [0.85, 4.5], [0.35, 4.1], [0.35, 1.8], [0.85, 1.4]],
      label: [3.6, 2.6], reveal: [0.705, 0.79], from: [7.9, 4.6], to: [0.2, 2.6] },
    { id: "rip", name: "Rip.", en: "Storage", floor: "parquet", cap: "",
      poly: [[6.25, 0.25], [7.75, 0.25], [7.75, 3.55], [6.25, 3.55]], label: [7.0, 1.9], reveal: [0.72, 0.79], from: [7.0, 3.6], to: [7.0, 0.2] },
    { id: "pianerottolo", name: "", en: "", floor: "stone", context: true,
      poly: [[7.75, 17.45], [12.2, 17.45], [12.2, 20.4], [7.75, 20.4]], reveal: [0.22, 0.27], from: [9.0, 20.5], to: [9.0, 17.4] },
  ],

  // ---------- furniture ----------
  furniture: [
    // Sala riunioni
    { type: "rug", at: [3.75, 3.35], size: [4.6, 2.7] },
    { type: "meetingTable", at: [3.75, 3.35], length: 3.4, width: 1.1, chairs: 4 },
    { type: "pendantBar", at: [3.75, 3.35], length: 2.6 },
    { type: "fireplace", at: [3.5, 0.43], rot: 0 },
    { type: "art", at: [3.5, 0.43], y: 1.75, size: [1.3, 0.8], rot: 0, seed: 3 },
    { type: "shelf", at: [3.4, 5.5], width: 3.6, height: 2.3, rot: 180 },
    { type: "armchair", at: [1.4, 2.2], rot: 30 },
    { type: "armchair", at: [1.4, 3.75], rot: 150 },
    { type: "sideTable", at: [1.05, 2.95] },
    { type: "plant", at: [0.75, 4.35], size: 1.5 },
    { type: "credenza", at: [5.93, 1.9], width: 2.2, rot: -90 },
    { type: "art", at: [6.15, 1.9], y: 1.65, size: [1.0, 1.0], rot: -90, seed: 7 },
    { type: "plant", at: [7.35, 5.55], size: 1.1 },
    // Studio
    { type: "rug", at: [3.4, 7.4], size: [2.8, 2.0] },
    { type: "desk", at: [2.7, 7.4], width: 1.6, rot: -90 },
    { type: "officeChair", at: [3.45, 7.4], rot: -90 },
    { type: "deskLamp", at: [2.55, 6.85] },
    { type: "shelf", at: [5.3, 6.18], width: 2.6, height: 2.1, rot: 0 },
    { type: "armchair", at: [6.6, 8.2], rot: 215 },
    { type: "floorLamp", at: [7.25, 8.55] },
    { type: "plant", at: [2.15, 6.3], size: 1.2 },
    // Open space
    { type: "bench", at: [3.95, 10.5], length: 3.0, chairs: 2 },
    { type: "bench", at: [3.95, 13.35], length: 3.0, chairs: 2 },
    { type: "pendantBar", at: [3.95, 10.5], length: 2.4 },
    { type: "pendantBar", at: [3.95, 13.35], length: 2.4 },
    { type: "rug", at: [6.55, 11.95], size: [2.0, 2.8] },
    { type: "sofa", at: [7.1, 11.95], width: 2.3, rot: -90 },
    { type: "coffeeTable", at: [6.3, 11.95] },
    { type: "plant", at: [2.15, 9.35], size: 1.6 },
    { type: "plant", at: [7.3, 14.7], size: 1.3 },
    { type: "shelf", at: [4.4, 14.82], width: 3.2, height: 1.2, rot: 180 },
    { type: "art", at: [7.58, 10.0], y: 1.6, size: [0.9, 1.2], rot: -90, seed: 11 },
    // Direzione
    { type: "rug", at: [13.3, 8.5], size: [3.0, 2.0] },
    { type: "desk", at: [13.75, 8.5], width: 1.9, rot: -90, exec: true },
    { type: "officeChair", at: [14.5, 8.5], rot: -90 },
    { type: "chair", at: [12.85, 8.05], rot: 90 },
    { type: "chair", at: [12.85, 8.95], rot: 90 },
    { type: "credenza", at: [12.6, 7.32], width: 1.8, rot: 0 },
    { type: "art", at: [12.6, 7.15], y: 1.65, size: [1.2, 0.8], rot: 0, seed: 21 },
    { type: "plant", at: [15.05, 9.55], size: 1.3 },
    // Ufficio
    { type: "desk", at: [13.3, 11.6], width: 1.8, depth: 1.4, rot: 0, double: true },
    { type: "officeChair", at: [13.3, 10.85], rot: 0 },
    { type: "officeChair", at: [13.3, 12.35], rot: 180 },
    { type: "shelf", at: [11.6, 12.9], width: 2.2, height: 2.1, rot: 180 },
    { type: "plant", at: [15.05, 10.4], size: 1.2 },
    { type: "floorLamp", at: [15.1, 12.9] },
    // Bagni
    { type: "vanity", at: [12.4, 3.88], width: 1.4, rot: 0 },
    { type: "toilet", at: [14.9, 4.45], rot: -90 },
    { type: "vanity", at: [12.0, 5.78], width: 0.9, rot: 0 },
    { type: "toilet", at: [13.2, 5.86], rot: 0 },
    { type: "plant", at: [15.15, 6.75], size: 0.7 },
    // Ingresso
    { type: "runner", at: [9.0, 10.4], size: [1.15, 10.5] },
    { type: "console", at: [8.08, 16.3], width: 1.3, rot: 90 },
    { type: "art", at: [7.92, 16.3], y: 1.6, size: [0.9, 0.9], rot: 90, seed: 5 },
    { type: "art", at: [7.92, 11.0], y: 1.6, size: [0.8, 1.05], rot: 90, seed: 13 },
    { type: "art", at: [10.08, 15.0], y: 1.55, size: [0.8, 1.1], rot: -90, seed: 17 },
    { type: "plant", at: [9.95, 16.95], size: 1.3 },
    { type: "spots", from: [9.0, 16.5], to: [9.0, 4.2], n: 6 },
    // corridor gallery: sconces and more pictures between the doors
    { type: "sconce", at: [7.92, 12.1], rot: 90 }, { type: "sconce", at: [7.92, 9.6], rot: 90 }, { type: "sconce", at: [7.92, 5.9], rot: 90 },
    { type: "sconce", at: [10.11, 15.95], rot: -90 }, { type: "sconce", at: [10.11, 12.4], rot: -90 }, { type: "sconce", at: [10.11, 9.2], rot: -90 },
    { type: "art", at: [7.92, 8.6], y: 1.5, size: [0.7, 0.9], rot: 90, seed: 23 },
    { type: "art", at: [7.92, 13.15], y: 1.55, size: [0.55, 0.75], rot: 90, seed: 29 },
    { type: "art", at: [10.11, 13.6], y: 1.6, size: [0.7, 0.9], rot: -90, seed: 31 },
    // rooms
    { type: "art", at: [4.5, 9.12], y: 1.65, size: [1.7, 1.0], rot: 0, seed: 37 },
    { type: "art", at: [4.9, 8.79], y: 1.6, size: [1.2, 0.8], rot: 180, seed: 41 },
    { type: "art", at: [12.8, 10.08], y: 1.6, size: [1.0, 0.7], rot: 0, seed: 43 },
    { type: "sconce", at: [2.3, 0.43], rot: 0 }, { type: "sconce", at: [4.7, 0.43], rot: 0 },
    // Rip.
    { type: "shelf", at: [6.5, 1.9], width: 2.8, height: 2.4, rot: 90 },
  ],

  // ---------- the walk ----------
  // p: scroll progress. pos and look are [x, height, y] in plan metres.
  path: [
    { p: 0.0, plan: true },
    { p: 0.07, plan: true },
    { p: 0.165, pos: [8.6, 46, 34], look: [8.4, 0, 10.2], fov: 26 },
    { p: 0.25, pos: [9.4, 7.5, 25.5], look: [9.0, 1.0, 16.5], fov: 44 },
    { p: 0.285, pos: [9.0, 1.55, 19.9], look: [9.0, 1.45, 12.0], fov: 52 },
    { p: 0.335, pos: [9.0, 1.55, 16.6], look: [9.0, 1.3, 9.0], fov: 52 },
    { p: 0.375, pos: [8.95, 1.55, 14.3], look: [3.5, 1.35, 13.2], fov: 52 },
    { p: 0.43, pos: [6.9, 1.58, 14.05], look: [2.2, 1.15, 10.8], fov: 56 },
    { p: 0.475, pos: [7.1, 1.55, 13.95], look: [9.8, 1.45, 14.0], fov: 52 },
    { p: 0.5, pos: [8.95, 1.55, 13.5], look: [9.1, 1.45, 9.0], fov: 52 },
    { p: 0.54, pos: [9.0, 1.55, 11.3], look: [14.5, 1.3, 11.0], fov: 52 },
    { p: 0.565, pos: [11.3, 1.55, 11.1], look: [15.2, 1.2, 11.9], fov: 54 },
    { p: 0.585, pos: [9.9, 1.55, 11.0], look: [9.3, 1.45, 7.0], fov: 52 },
    { p: 0.605, pos: [9.35, 1.55, 8.1], look: [14.6, 1.3, 8.1], fov: 52 },
    { p: 0.625, pos: [11.2, 1.55, 8.05], look: [15.2, 1.2, 8.7], fov: 54 },
    { p: 0.645, pos: [9.6, 1.55, 8.0], look: [5.0, 1.4, 7.4], fov: 52 },
    { p: 0.67, pos: [6.5, 1.55, 7.6], look: [2.0, 1.25, 7.2], fov: 54 },
    { p: 0.69, pos: [8.3, 1.55, 7.4], look: [9.0, 1.45, 4.0], fov: 52 },
    { p: 0.715, pos: [8.95, 1.55, 4.65], look: [4.0, 1.4, 4.0], fov: 52 },
    { p: 0.74, pos: [7.1, 1.55, 4.55], look: [2.5, 1.35, 3.4], fov: 52 },
    { p: 0.8, pos: [6.5, 1.58, 4.95], look: [1.6, 1.2, 2.6], fov: 56 },
    { p: 0.9, pos: [5.75, 1.6, 5.05], look: [0.9, 1.1, 2.3], fov: 58 },
    { p: 1.0, pos: [2.5, 1.55, 3.2], look: [-5.0, 1.9, 2.95], fov: 52 },
  ],

  // ---------- room stops: the scroll pauses, a marker appears in the room, its file opens on click ----------
  // at: point on the walk (path p) where the camera holds; anchor: [x, height, y] where the marker sits
  holdLength: 0.03,
  stops: [
    { room: "ingresso", at: 0.335, anchor: [9.0, 0.35, 12.4], title: ["The", "entrance hall"], meta: "2,50 × 14,00 m · 35 m² · h 2,90",
      text: "A fourteen-metre gallery runs the length of the flat, from the landing to the meeting room. Every door opens off it, so the rooms on the street and on the courtyard never share a wall with the lift.",
      facts: [["Floor", "Venetian terrazzo, cream and Verona red"], ["Length", "14,00 m"], ["Light", "Six ceiling spots on one line"], ["Doors", "Seven, lacquered white"]] },
    { room: "open", at: 0.43, anchor: [2.6, 1.0, 10.9], title: ["Open", "space"], meta: "6,00 × 6,20 m · 37 m² · two windows",
      text: "The largest room, two tall windows on Corso Buenos Aires. Room for eight desks in two islands and a sofa against the corridor wall.",
      facts: [["Floor", "Oak parquet, chevron"], ["Windows", "Two, 1,25 × 2,20 m, facing west"], ["Sun", "From about 3 PM, deep into the room"], ["Seats", "8 + lounge"]] },
    { room: "ufficio2", at: 0.565, anchor: [13.3, 0.95, 11.6], title: ["Quiet", "office"], meta: "5,30 × 3,30 m · 17 m² · on the courtyard",
      text: "On the courtyard side, away from the traffic of the Corso. Morning light, a shared desk for two and full-height shelving.",
      facts: [["Faces", "East, onto the cortile"], ["Desk", "Shared, 1,80 × 1,40 m"], ["Storage", "Shelving, 2,20 m wide"]] },
    { room: "direzione", at: 0.625, anchor: [13.75, 0.95, 8.5], title: ["The director's", "office"], meta: "5,30 × 2,90 m · 15 m² · on the courtyard",
      text: "A walnut desk facing the door, two chairs for visitors and a credenza under a painting. The quietest room in the flat.",
      facts: [["Desk", "Walnut, 1,90 m"], ["Guests", "Two chairs"], ["Faces", "East, onto the cortile"]] },
    { room: "studio", at: 0.67, anchor: [2.7, 0.95, 7.4], title: ["The", "study"], meta: "6,00 × 3,10 m · 19 m² · one window",
      text: "A desk set right against the window over the Corso, a reading chair and a wall of books. Late in the day the sun reaches the door.",
      facts: [["Window", "1,25 × 2,20 m, facing west"], ["Desk", "Oak, 1,60 m"], ["Books", "2,60 m of shelving"]] },
    { room: "salone", at: 0.9, anchor: [0.6, 1.45, 2.95], title: ["The", "meeting room"], meta: "7,40 × 5,60 m · 35 m² · bay window",
      text: "The best room of the flat: a bay window over Corso Buenos Aires, a marble fireplace and a table for eight under a linear light. The evening sun comes straight in.",
      facts: [["Window", "Bay, 1,70 m, facing west"], ["Table", "Walnut, 3,40 × 1,10 m, 8 seats"], ["Fireplace", "White marble"], ["Ceiling", "2,90 m with cornice"]] },
  ],

  // ---------- around the flat (drawn on the paper sheet) ----------
  context: {
    labels: [
      { text: "CORSO BUENOS AIRES", at: [-4.7, 9.0], rot: -90, size: 0.55 },
      { text: "CORTILE", at: [18.6, 8.4], size: 0.5 },
      { text: "ALTRA U.I.", at: [8.8, 1.4], size: 0.42 },
      { text: "ALTRA U.I.", at: [4.6, 16.6], size: 0.42 },
      { text: "BALLATOIO COMUNE", at: [14.0, 19.0], size: 0.36 },
    ],
    dashed: [[[0.0, -0.4], [15.8, -0.4], [15.8, 3.3]], [[1.4, 15.3], [1.4, 21.3], [20.2, 21.3], [20.2, 13.4], [15.8, 13.4]]],
    stair: { x0: 10.5, y0: 13.4, x1: 14.6, y1: 15.9 },
    lifts: [[10.7, 16.2, 12.1, 17.3], [13.0, 16.2, 14.4, 17.3]],
  },
};
