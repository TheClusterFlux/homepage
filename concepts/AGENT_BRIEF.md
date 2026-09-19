# Concept rebuild brief (drastic redesign — NO Stitch)

Each concept must look like a **different product**, not a palette swap. Avoid: generic dark SaaS grid, Space Grotesk + cyan glow, chamfered HUD cards, standard 3-column equal cards.

## Shared requirements (all three)

- Folder: one of `concept-a-void-cathedral`, `concept-b-funeral-parlor-hud`, `concept-c-redjuice-dawn` (reuse folders; **replace** `index.html`, `theme.css`; add local `app.js` if needed).
- Data: `GET /data/projects.json` (same fields as production). Thumbnails: `https://homepage.theclusterflux.com/thumbnails/${project.image}`.
- Features: search, category filter, featured row, full grid, **Visit-only** link (no source).
- Do **not** modify `src/` or production files.
- Do **not** use Stitch or copy prior concept CSS.

## Concept A — `concept-a-void-cathedral` → **NEURAL TERMINAL**

**Idea:** The homepage is a **fake operating system / shell session** — not a marketing site.

- Monospace only (IBM Plex Mono or similar). Black or phosphor-green **or** amber-on-black CRT.
- Layout: left **prompt column** or top **status bar** with fake `clusterflux@genome:~$` prompts; projects as **terminal log blocks** or **split-pane** (list left, detail preview right on hover/click).
- ASCII/divider lines, blinking cursor, `[GAMES]` tags as shell flags not pill badges.
- Optional subtle CRT scanline + noise. **No** card grid of identical rectangles.
- Port **8091** (server already maps this folder).

## Concept B — `concept-b-funeral-parlor-hud` → **CRYSTAL CATHEDRAL**

**Idea:** **Immersive full-viewport environment** — user floats inside a crystal void.

- **Large animated background** (CSS + inline SVG): slow-drifting shards, radial light, parallax layers (user liked C’s ribbons — go **10x**: full-screen canvas-like SVG animation or layered divs, 60fps-friendly CSS only).
- Cards are **floating glass slabs**: heavy backdrop-filter, irregular rotation (±1deg), staggered grid or **masonry**, strong depth shadows colored magenta/cyan.
- Typography: display serif **or** ultra-light wide sans for titles — **not** tech HUD labels.
- Dark void base but **organic**, not military dashboard. **No** scanline HUD clone.

## Concept C — `concept-c-redjuice-dawn` → **BRUTALIST EDITORIAL**

**Idea:** **Print poster / brutalist gallery** — zero “startup portfolio” vibes.

- Light **or** high-contrast paper (#f4f0e8) with **massive** project titles (8vw scale), horizontal **scroll** featured strip or vertical **scroll-snap** sections one project per viewport chunk.
- Asymmetric layout: one hero featured project dominates; others in offset columns. Bold **single accent** (blood red or electric blue), thick rules, no soft gradients on buttons — raw borders.
- Background: animated **grain** + slow **gradient mesh** or geometric pattern (CSS), not subtle wavy lines only.
- Cards may drop thumbnails to full-bleed image bands. Visit = stark rectangular button, not gradient pill.

## Deliverables per agent

1. Replace `index.html`, `theme.css`, and `app.js` (local) in assigned folder.
2. Script tag: use local `app.js` if custom DOM; else `/shared/app.js`.
3. Write 3–5 sentence `NOTES.md` in folder explaining design choices.

When done, user runs `npm run concepts` from repo root.
