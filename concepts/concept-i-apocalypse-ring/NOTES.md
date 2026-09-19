# Concept I — Apocalypse Ring

Orbital HUD for the ClusterFlux registry: projects sit on **CSS-transform rings** (outer orbit for all nodes, inner orbit for featured) around a **center detail panel**. Dark void background with crimson Guilty Crown / apocalypse accents, conic tick marks, and a rotating radar sweep.

**Interaction:** click a node to lock selection and open the core panel (Visit only). Click again or press Esc to release. Drag the radar field or scroll to spin the ring manually; arrow keys cycle visible nodes. Ring animation slows while a node is locked.

Shared `/shared/` theme registry, landing redirect, switcher, and `/data/projects.json` with CDN thumbnails. Category and text filters hide nodes without re-fetching. Local preview on port **8097** (`data-visual-theme="apocalypse-ring"`).
