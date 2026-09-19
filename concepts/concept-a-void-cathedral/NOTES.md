# Concept A — NEURAL TERMINAL

The homepage is a fake bash session on `genome.clusterflux`, not a marketing layout. IBM Plex Mono, amber-on-black CRT styling, scanlines, and a window chrome title bar replace the prior void HUD / card grid.

Projects render as `ps aux`-style rows in a scrollable registry; the right pane shows inspect output with thumbnails from the production CDN. Featured items appear as `--pinned` log blocks above the filter bar.

Search uses a `grep -i` prompt; categories are shell flags `[GAMES]`, `[TOOLS]`, `[INFRA]`. Only visit links are exposed (no source). Data loads from `/data/projects.json` via the concepts static server on port 8091.
