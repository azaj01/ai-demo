# Casa Azaj

A floor plan that becomes a house as you scroll. A concept house drawn live in the browser, in English and Italian.

**Live:** https://azaj01.github.io/demo/casa-azaj/ ([Italiano](https://azaj01.github.io/demo/casa-azaj/?lang=it))

It runs best on a laptop. The house is drawn in real time with three.js, using about 39 MB of textures on a laptop and 13 MB on a phone. On devices that can't draw it, the page shows a still image instead.

## Languages

`i18n.js` holds every visible string in English and Italian: the page copy, the room labels on the plan, the seven room panels and the fallback messages. The EN/IT switch in the top bar remembers the choice; `?lang=it` or `?lang=en` in the address works too.

## Files

- `index.html`, `theme.css`, `publish.css`, `shared/fx-ui.css`: the page
- `i18n.js`: English and Italian text
- `gate.js`: checks WebGL 2 and shows the fallback screens
- `scene.js`, `staging.js`: the house, rooms and furniture
- `hero-options.js`, `light-options.js`: type and lighting presets
- `shared/fx-*.js`: renderer, scroll camera, post-processing
- `assets/`: Poly Haven textures and sky (CC0)
- `media/`: share image and fallback still

Plain files, no build step. three.js, GSAP ScrollTrigger and Lenis load from CDNs.

## Credit

Based on [Casa Serra](https://github.com/sam1983aing/casa-serra) by Sam Aing, used with permission. Demo by AZAJ.
