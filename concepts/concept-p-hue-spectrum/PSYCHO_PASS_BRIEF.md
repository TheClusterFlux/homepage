# Hue Spectrum — Psycho-Pass concept brief

Concept **P** · port **8102** · id `hue-spectrum`

## Core metaphor

The portfolio is a **Crime Coefficient / Hue scan**: each project receives a deterministic pseudo-hue from its title hash and sits on a **stress spectrum** (clear → cloudy → criminal). This is decorative, not a real score.

## Visual

- **Spectrum bar:** vertical (desktop) or horizontal (narrow view): cyan `#00d4ff` → cloudy purple `#7c6bff` → criminal magenta `#ff2d8a`
- **Background:** cymatic / Chladni-style wave interference (canvas), slow drift
- **UI:** clinical MWPSB readouts, bracket labels, monospace + Rajdhani
- **Interaction:** hover/focus markers on the rail; detail panel; keyboard ↑↓ along spectrum

## Data & behavior

- `GET /data/projects.json`
- Thumbnails: `https://homepage.theclusterflux.com/thumbnails/${image}`
- Search, category filter, featured row, **Visit only** (no source links)
- Shared: `theme-registry.js`, `theme-landing.js`, `theme-switcher.js`

See also `../PSYCHO_PASS_BRIEF.md` for shared palette and motifs.
