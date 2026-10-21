/* Casa Azaj: English and Italian.
   Loaded before every other script. The 3D scene paints its labels once at load, so the
   EN/IT switch saves the choice and reloads the page in that language (or use ?lang=it).
   Provides:
   - window.CASA_T(english)             text for scripts (plan labels, hints, fallback screens)
   - window.CASA_I18N.dossiers(arr) the seven room panels, filled in the current language
   - data-i18n="key" on page elements (HTML allowed) and data-i18n-aria for aria-labels */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search).get("lang");
  var saved = null;
  try { saved = localStorage.getItem("azaj-lang"); } catch (e) {}
  var lang = q === "it" || q === "en" ? q : saved === "it" ? "it" : "en";
  if (q === "it" || q === "en") { try { localStorage.setItem("azaj-lang", q); } catch (e) {} }
  document.documentElement.lang = lang;

  // ---- strings used by the scripts (English → Italian) ----
  var IT = {
    "Media": "Sala TV", "Kitchen and dining": "Cucina e pranzo", "Wine": "Cantina", "Study": "Studio",
    "Library": "Biblioteca", "Guest suite": "Camera ospiti", "Garage": "Garage", "Living": "Soggiorno",
    "Hall": "Disimpegno", "Entrance": "Ingresso", "WC": "WC", "Patio": "Patio", "Glass gallery": "Galleria",
    "Master bedroom": "Camera padronale", "Dressing": "Cabina", "Bath": "Bagno", "Private garden": "Giardino",
    "Yard": "Cortile", "CASA AZAJ   CONCEPT HOUSE   946 m²   1:200": "CASA AZAJ   CASA DI PROGETTO   946 m²   1:200", "OLIVE TREE": "ULIVO", "POOL": "PISCINA", "GROUND FLOOR PLAN": "PIANTA PIANO TERRA",
    "Scroll to walk in": "Scorri per entrare", "Scroll to the next room": "Scorri alla stanza successiva",
    "Scroll to move on": "Scorri per continuare", "Click the marker to open the file": "Tocca il segnaposto per aprire la scheda",
    "Time of day in the house": "Ora del giorno nella casa",
    "This page draws the house live in your browser, and this device can’t render it.": "Questa pagina disegna la casa in tempo reale nel browser e questo dispositivo non riesce a mostrarla.",
    "The 3D view ran out of memory on this device.": "La vista 3D ha esaurito la memoria su questo dispositivo.",
    "Still loading: the house uses {mb} MB of textures. Worth the wait.": "Ancora in caricamento: la casa usa {mb} MB di texture. Vale l'attesa.",
    "The house didn’t load this time.": "Questa volta la casa non si è caricata.",
    "Floor plan of Casa Azaj next to the finished house, seen from above": "La pianta di Casa Azaj accanto alla casa finita, vista dall'alto",
    "Keep waiting": "Continua ad aspettare", "Try again": "Riprova"
  };
  window.CASA_T = function (s) { return lang === "it" && Object.prototype.hasOwnProperty.call(IT, s) ? IT[s] : s; };

  // ---- the seven room panels ----
  var M = " <b>·</b> ";
  var DOSSIERS = {
    en: {
      hall: { kicker: "Room", title: ["The", "entrance"], meta: "8.00 × 9.00 m" + M + "72 m²" + M + "ceiling 4.80" + M + "open file +", fileMeta: "Casa Azaj · entrance · A-101",
        text: "A tall oak door on a pivot opens into a room almost five metres high. A band of glass runs above the neighbouring rooms, so light arrives from three sides before you take a step.",
        facts: [["Door", "Pivoting oak, 2.4 × 4.2 m"], ["Floor", "Honed travertine"], ["West wall", "Board-marked concrete"], ["Ceiling", "4.80 m, high windows on three sides"]] },
      living: { kicker: "Room", title: ["The", "living room"], meta: "12.00 × 9.00 m" + M + "108 m²" + M + "ceiling 4.50" + M + "open file +", fileMeta: "Casa Azaj · living · A-101",
        text: "Two steps down into a sunken lounge around a concrete fireplace. High windows along the top of the walls let the evening sun cross the whole room.",
        facts: [["Floor", "Oiled oak boards"], ["Lounge", "6.00 × 4.50 m, 45 cm lower"], ["Fireplace", "Cast concrete"], ["Glazing", "4.50 m, slides open to the patio"]] },
      dining: { kicker: "Room", title: ["Kitchen", "and dining"], meta: "16.00 × 8.00 m" + M + "128 m²" + M + "a table for 14" + M + "open file +", fileMeta: "Casa Azaj · kitchen and dining · A-101",
        text: "Cooking and eating in one long room: a five-metre stone island, a table for fourteen and three skylights above it.",
        facts: [["Island", "Travertine, 5.00 × 1.20 m"], ["Table", "Oak, 6.00 m, seats 14"], ["Skylights", "Three, 1.20 m square"], ["Wine room", "Glass-walled, beside the kitchen"]] },
      olive: { kicker: "Courtyard", title: ["The", "courtyard"], meta: "20.00 × 24.00 m" + M + "one olive tree" + M + "open file +", fileMeta: "Casa Azaj · courtyard · A-101",
        text: "The rooms are arranged around a single olive tree. The courtyard is paved in open-jointed stone, and a long pool runs along its south side.",
        facts: [["Tree", "Olive"], ["Paving", "Travertine, open joints"], ["Pool", "18.00 × 3.00 m"], ["Light", "Afternoon sun from the west"]] },
      gallery: { kicker: "Room", title: ["The", "glass gallery"], meta: "3.00 × 24.00 m" + M + "72 m²" + M + "open file +", fileMeta: "Casa Azaj · gallery · A-101",
        text: "A corridor of glass: windows from floor to ceiling on one side, a plain wall for art on the other, leading to the bedroom.",
        facts: [["Glazing", "Floor to ceiling, bronze frames"], ["Length", "24.00 m"], ["Floor", "Travertine"], ["Wall", "Lime plaster"]] },
      bedroom: { kicker: "Room", title: ["The", "master suite"], meta: "10.00 × 9.00 m" + M + "162 m² with dressing and bath" + M + "open file +", fileMeta: "Casa Azaj · master suite · A-101",
        text: "Dark timber behind the bed, the garden right outside, and through the dressing room a stone bath set into the floor.",
        facts: [["Bedroom", "10.00 × 9.00 m"], ["Wall", "Charred timber"], ["Bath", "Stone, set into the floor"], ["Dressing", "Walk-through, oak"]] },
      garden: { kicker: "Garden", title: ["The", "private garden"], meta: "21.00 × 9.00 m" + M + "lawn and a low wall" + M + "open file +", fileMeta: "Casa Azaj · garden · A-101",
        text: "The walk ends outdoors: a lawn, a low concrete wall and an open view. A quiet place to watch the light change in the evening.",
        facts: [["Lawn", "21.00 × 9.00 m"], ["Wall", "Concrete, 45 cm high"], ["View", "South west, open"], ["Best time", "Sunset"]] }
    },
    it: {
      hall: { kicker: "Stanza", title: ["L'", "ingresso"], meta: "8.00 × 9.00 m" + M + "72 m²" + M + "soffitto 4.80" + M + "apri la scheda +", fileMeta: "Casa Azaj · ingresso · A-101",
        text: "Una grande porta in rovere su perno si apre su una stanza alta quasi cinque metri. Una fascia di vetro corre sopra le stanze vicine, così la luce arriva da tre lati prima ancora di fare un passo.",
        facts: [["Porta", "Rovere su perno, 2.4 × 4.2 m"], ["Pavimento", "Travertino levigato"], ["Parete ovest", "Cemento a vista"], ["Soffitto", "4.80 m, finestre alte su tre lati"]] },
      living: { kicker: "Stanza", title: ["Il", "soggiorno"], meta: "12.00 × 9.00 m" + M + "108 m²" + M + "soffitto 4.50" + M + "apri la scheda +", fileMeta: "Casa Azaj · soggiorno · A-101",
        text: "Due gradini e si scende nel salotto ribassato, attorno a un camino in cemento. Le finestre alte lungo le pareti lasciano attraversare la stanza dal sole della sera.",
        facts: [["Pavimento", "Rovere oliato"], ["Salotto", "6.00 × 4.50 m, 45 cm più in basso"], ["Camino", "Cemento gettato"], ["Vetrate", "4.50 m, scorrevoli verso il patio"]] },
      dining: { kicker: "Stanza", title: ["Cucina", "e pranzo"], meta: "16.00 × 8.00 m" + M + "128 m²" + M + "un tavolo per 14" + M + "apri la scheda +", fileMeta: "Casa Azaj · cucina e pranzo · A-101",
        text: "Cucinare e mangiare in un'unica lunga stanza: un'isola in pietra di cinque metri, un tavolo per quattordici e tre lucernari sopra.",
        facts: [["Isola", "Travertino, 5.00 × 1.20 m"], ["Tavolo", "Rovere, 6.00 m, 14 posti"], ["Lucernari", "Tre, 1.20 m di lato"], ["Cantina", "Vetrata, accanto alla cucina"]] },
      olive: { kicker: "Corte", title: ["La", "corte"], meta: "20.00 × 24.00 m" + M + "un ulivo" + M + "apri la scheda +", fileMeta: "Casa Azaj · corte · A-101",
        text: "Le stanze sono disposte attorno a un unico ulivo. La corte è pavimentata in pietra a fughe aperte e una lunga piscina corre lungo il lato sud.",
        facts: [["Albero", "Ulivo"], ["Pavimentazione", "Travertino a fughe aperte"], ["Piscina", "18.00 × 3.00 m"], ["Luce", "Sole del pomeriggio da ovest"]] },
      gallery: { kicker: "Stanza", title: ["La", "galleria"], meta: "3.00 × 24.00 m" + M + "72 m²" + M + "apri la scheda +", fileMeta: "Casa Azaj · galleria · A-101",
        text: "Un corridoio di vetro: vetrate a tutta altezza da un lato, una parete libera per i quadri dall'altro, fino alla camera.",
        facts: [["Vetrate", "A tutta altezza, telai in bronzo"], ["Lunghezza", "24.00 m"], ["Pavimento", "Travertino"], ["Parete", "Intonaco a calce"]] },
      bedroom: { kicker: "Stanza", title: ["La suite", "padronale"], meta: "10.00 × 9.00 m" + M + "162 m² con cabina e bagno" + M + "apri la scheda +", fileMeta: "Casa Azaj · suite padronale · A-101",
        text: "Legno scuro dietro il letto, il giardino appena fuori e, oltre la cabina armadio, una vasca in pietra incassata nel pavimento.",
        facts: [["Camera", "10.00 × 9.00 m"], ["Parete", "Legno bruciato"], ["Vasca", "Pietra, incassata nel pavimento"], ["Cabina", "Passante, in rovere"]] },
      garden: { kicker: "Giardino", title: ["Il giardino", "privato"], meta: "21.00 × 9.00 m" + M + "prato e un muretto" + M + "apri la scheda +", fileMeta: "Casa Azaj · giardino · A-101",
        text: "Il percorso finisce all'aperto: un prato, un muretto in cemento e la vista libera. Un posto tranquillo per guardare la luce cambiare la sera.",
        facts: [["Prato", "21.00 × 9.00 m"], ["Muretto", "Cemento, alto 45 cm"], ["Vista", "Sud-ovest, aperta"], ["Momento migliore", "Al tramonto"]] }
    }
  };
  window.CASA_I18N = {
    lang: lang,
    // scene.js passes the panel skeletons (numbers, camera anchors); fill in the words.
    dossiers: function (list) {
      var D = DOSSIERS[lang];
      return list.map(function (d) { var x = D[d.key]; if (!x) return d; for (var k in x) d[k] = x[k]; return d; });
    }
  };

  // ---- page copy ----
  var PAGE = {
    en: {
      "meta.title": "Casa Azaj · A floor plan that becomes a house",
      "meta.desc": "A concept house drawn live in your browser. At first it is a flat floor plan. Scroll, and walk into it room by room.",
      "loader.1": "Every room here started as a line on paper.",
      "loader.2": "Casa Azaj has sixteen rooms and one olive tree.",
      "loader.3": "Scroll, and walk through the drawing.",
      "loader.drawing": "Loading",
      "top.about": "About",
      "hero.kicker": "Casa Azaj <span>·</span> concept house <span>·</span> 2026",
      "hero.l1": "A house,", "hero.l2": "drawn before", "hero.l3": "it is <em>built.</em>",
      "hero.lede": "A courtyard house of 946 m² around one olive tree. Scroll, and walk into the drawing.",
      "tb.project": "Project", "tb.drawing": "Drawing", "tb.plan": "Ground floor plan", "tb.scale": "Scale", "tb.sheet": "Sheet",
      "count.rooms": "rooms", "hint": "Scroll to walk in",
      "fin.eyebrow": "A-101 <span>·</span> ground floor plan",
      "fin.l1": "Drawn flat.", "fin.l2": "Walked <em>in 3D.</em>",
      "fin.lede": "Casa Azaj is a concept house drawn live in your browser: a floor plan that becomes a home as you scroll, one room at a time.",
      "fin.again": "Walk it again", "fin.top": "Back to the plan",
      "fin.m1": "Drawn live in your browser", "fin.m2": "Materials: Poly Haven, CC0",
      "credit": "Demo by AZAJ",
      "close": "Close ×", "nogl": "This page draws the house live in your browser and needs WebGL 2.",
      "aria.hero": "Casa Azaj, ground floor plan", "aria.progress": "Progress", "aria.lang": "Language"
    },
    it: {
      "meta.title": "Casa Azaj · Una pianta che diventa una casa",
      "meta.desc": "Una casa di progetto disegnata in tempo reale nel browser. All'inizio è una pianta piatta. Scorri ed entra, una stanza alla volta.",
      "loader.1": "Ogni stanza qui è nata come una linea su carta.",
      "loader.2": "Casa Azaj ha sedici stanze e un ulivo.",
      "loader.3": "Scorri ed entra nel disegno.",
      "loader.drawing": "Caricamento",
      "top.about": "Info",
      "hero.kicker": "Casa Azaj <span>·</span> casa di progetto <span>·</span> 2026",
      "hero.l1": "Una casa,", "hero.l2": "disegnata prima", "hero.l3": "di essere <em>costruita.</em>",
      "hero.lede": "Una casa a corte di 946 m² attorno a un ulivo. Scorri ed entra nel disegno.",
      "tb.project": "Progetto", "tb.drawing": "Tavola", "tb.plan": "Pianta piano terra", "tb.scale": "Scala", "tb.sheet": "Foglio",
      "count.rooms": "stanze", "hint": "Scorri per entrare",
      "fin.eyebrow": "A-101 <span>·</span> pianta piano terra",
      "fin.l1": "Disegnata in piano.", "fin.l2": "Vissuta <em>in 3D.</em>",
      "fin.lede": "Casa Azaj è una casa di progetto disegnata in tempo reale nel browser: una pianta che diventa una casa mentre scorri, una stanza alla volta.",
      "fin.again": "Rifai il giro", "fin.top": "Torna alla pianta",
      "fin.m1": "Disegnata in tempo reale nel browser", "fin.m2": "Materiali: Poly Haven, CC0",
      "credit": "Demo by AZAJ",
      "close": "Chiudi ×", "nogl": "Questa pagina disegna la casa in tempo reale nel browser e richiede WebGL 2.",
      "aria.hero": "Casa Azaj, pianta piano terra", "aria.progress": "Avanzamento", "aria.lang": "Lingua"
    }
  };
  function applyPage() {
    var P = PAGE[lang];
    document.title = P["meta.title"];
    var d = document.querySelector('meta[name="description"]'); if (d) d.setAttribute("content", P["meta.desc"]);
    document.querySelectorAll("[data-i18n]").forEach(function (el) { var k = el.getAttribute("data-i18n"); if (P[k] != null) el.innerHTML = P[k]; });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { var k = el.getAttribute("data-i18n-aria"); if (P[k] != null) el.setAttribute("aria-label", P[k]); });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      var l = b.getAttribute("data-lang");
      b.setAttribute("aria-pressed", l === lang ? "true" : "false");
      if (l === lang) b.classList.add("pill--solid"); else b.classList.remove("pill--solid");
      b.addEventListener("click", function (e) {
        e.preventDefault();
        if (l === lang) return;
        try { localStorage.setItem("azaj-lang", l); } catch (err) {}
        var u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.toString();
      });
    });
  }
  // This file is loaded after the page markup and before the scripts that animate it,
  // so fill the copy right now, before they read the DOM.
  applyPage();
})();
