# Debug Readability Redesign

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan
**Scope:** `src/main.js`, `src/index.html` only. No logic changes in any `.mjs` module.

## Problem

The current debug overlay in `src/main.js` is hard to read:

1. `Draw` renders the **top 3 candidates per cell**, and debug overlays live inside `DrawTile` (`main.js:140-147`). Border, coords, tile id, probability %, and `JSON.stringify(constraint)` are therefore drawn three times per cell, overlapping.
2. Constraint JSON renders at 10px on a 32px tile — illegible.
3. Heightmap bar (`main.js:121-127`) sits on the right 4px of every cell and collides with tile-id text in the same area.
4. Gray text (`#444` / `#aaa`) over arbitrary tile colors gives poor contrast on darker tiles.
5. Single boolean `DEBUG` flag — cannot isolate "just ids" or "just heights".
6. `DEBUG = true` is currently committed at `main.js:8`, violating the CLAUDE.md soft rule that the committed default is `false`.

## Goals

- Make on-canvas debug overlays readable without editing source.
- Allow each piece of debug information to be toggled independently from the demo page.
- Move dense data (constraint JSON, full per-cell candidate list) off the tile and into a side panel.
- Visualize the heightmap somewhere it does not collide with tile text.
- Touch zero algorithmic code. Determinism, snapshot, and propagation tests must pass unchanged.

## Non-goals

- Persisting toggle state across reloads (explicitly chosen against — fresh defaults each load).
- Restyling the color legend.
- Refactoring the adjacency reference canvas layout (its tall height is a known characteristic).
- Tooltip variant for constraint info (we picked the side panel).
- Any change to `wavemap.mjs`, `generation.mjs`, `tiles.mjs`, `heightmap.mjs`, `random.mjs`, `constants.mjs`.

## Design

### Settings object

`const DEBUG = true;` at `src/main.js:8` is replaced with:

```js
const debug = {
  master: false,    // committed default
  ids: false,       // x,y + tile.id text on each cell
  probs: false,     // probability % text on each cell
  grid: false,      // per-cell border
  heights: false,   // sidecar heightmap canvas
  adjacency: false, // adjacency reference canvas
  hover: false,     // side info panel updates on mousemove
  dumpInit: false,  // call DumpWaveInit on Set()
};
```

`master` is the global gate. When `master` is false, no debug rendering or hover handling runs, and `#debugDiv` is hidden. Sub-toggles only have effect when `master` is true.

### Render pipeline

Two structural changes to the render path:

1. **`DrawTile` becomes pure.** Remove the debug block at `main.js:140-147`. The function only renders tile pixels.
2. **`Draw` runs a single debug overlay pass per cell** after the candidate stack is drawn. New helper `DrawDebugOverlay(ctx, x, y, topCandidate)` is called once per cell when `debug.master` is true. It reads the active sub-toggles and draws only what is enabled (grid border, ids, probability of the top candidate). No more 3× overdraw.

The right-edge heightmap bar (`main.js:121-127`) is removed entirely.

### Render targets

- **`#mazeCanvas`** (existing) — tiles plus optional grid/ids/probs overlay (single pass).
- **`#heightCanvas`** (new, sidecar) — heightmap rendered with `fillStyle = rgb(v,v,v)` where `v = Math.round(height * 255)`, one filled rect per cell at `tileSize` resolution, same grid dimensions as the main canvas. Drawn only when `debug.heights` is true. Lives inside `#debugDiv`, side-by-side with `#infoPanel`.
- **`#infoPanel`** (new, side `<pre>`) — populated on `mousemove` over `#mazeCanvas` when `debug.hover` is true. Contents: `x,y`, height, sorted candidate list with probabilities, top tile's `constraint` pretty-printed.
- **`#debugCanvas`** (existing) — adjacency reference, gated by `debug.adjacency` instead of the old `DEBUG`. Renders **lazily** on first toggle-on (it is expensive and never changes after init), then persists.

### UI layout

`src/index.html` changes:

- A new `<input type="checkbox" id="debugMaster">` lives in the existing controls row (next to the play/step buttons), outside `#debugDiv`. This is the only debug control visible when debug is off — discoverable without editing source.
- `#debugDiv` (currently `style="display:none"`) is restructured:

```
#debugDiv (display: none unless debug.master)
├── #debugToggles   (checkbox row: ids, probs, grid, heights, adjacency, hover, dumpInit)
├── #colorLegend    (existing color swatches, moved into a named container)
├── (flex row)
│   ├── #heightCanvas  (visible only when debug.heights)
│   └── #infoPanel     (visible only when debug.hover)
└── #debugCanvas    (visible only when debug.adjacency)
```

### Toggle wiring (in `main.js`)

- One handler per checkbox. On change: update `debug[key]`, call `Draw(context)` to repaint.
- Master handler additionally toggles `#debugDiv` visibility.
- `adjacency` handler renders the adjacency canvas the first time it goes true; subsequent toggles only flip visibility.
- `heights` and `hover` handlers flip visibility of their sidecar element, and trigger their initial render pass.
- `dumpInit` takes effect on the next `Set()` (i.e., next Reset). A `title` attribute on its checkbox documents this.
- No persistence — defaults reset each load.

### Hover panel mechanics

- `mousemove` listener attached to `#mazeCanvas`. Active only while `debug.master && debug.hover`.
- Compute cell `(x, y)` from `event.offsetX/Y` and `tileSize`.
- Bail early if `context.tileMap` is undefined (reset gap) or `(x, y)` falls outside `[0, mapCols)` × `[0, mapRows)`.
- Read `tileMap.GetChances(x, y)`, sort by probability desc, render to `#infoPanel` as monospace text.
- `mouseleave` on `#mazeCanvas`: clear `#infoPanel` to a placeholder (`hover a cell`).
- `Set()` (reset path) also clears `#infoPanel` — cell data is stale after reset.

### Color legend lifecycle

The color legend (`main.js:65-68`) currently builds inside the gated `if (DEBUG && debugCtx)` block, so it only renders when debug is on at startup. In the new design the legend is built **once at startup**, unconditionally, into `#colorLegend`. The legend is visible whenever `#debugDiv` is — i.e., whenever `debug.master` is true. No rebuild on toggle.

### `DumpWaveInit`

Stays in `wavemap.mjs:86` unchanged. Only its caller in `Set()` (`main.js:87`) changes from `if (DEBUG)` to `if (debug.master && debug.dumpInit)`.

### Text contrast

Out of scope for this redesign. The Part 1/2 brainstorm raised contrast as one of five options; the chosen plan addresses readability through the bigger wins (single overlay pass, side panel for dense data, sidecar heightmap). On-cell text remains in the existing colors. Revisit if still unreadable after this lands.

## Files touched

- `src/main.js` — replace `DEBUG` with `debug` object; split debug code out of `DrawTile`; add `DrawDebugOverlay`, `DrawHeightCanvas`, `RenderInfoPanel`; wire toggles; wire hover handler; remove right-edge height bar.
- `src/index.html` — add `#debugMaster`; restructure `#debugDiv`; add `#debugToggles`, `#heightCanvas`, `#infoPanel`, `#colorLegend` containers.

No other files change.

## Hard-invariant safety

The CLAUDE.md hard invariants are not affected:

- **Determinism.** No call sites of `Random.Next()` change. No new randomness.
- **No build step / no new deps.** All changes are plain ESM and DOM.
- **Tile dimensions, propagation depth, temperature, dedupe key.** Untouched.
- **`src/legacy/`.** Not referenced.
- **Separation of concerns.** All UI/DOM/canvas code stays in `main.js`. No DOM access added to `.mjs` modules.

## Testing

No new automated tests. The debug surface is pure DOM/canvas rendering with no algorithmic effect.

**Verification gate:** `npm test` must remain green after implementation. Existing `determinism.integration.spec.js` and snapshot tests confirm no logic leaked.

**Manual verification checklist:**

1. `debug.master = false` (committed default) → `#debugDiv` hidden, no overlays on canvas, visual output matches pre-change output for the same seed.
2. Toggle master on with all sub-toggles off → `#debugDiv` visible showing only toggle row + color legend; tiles render with no overlay; sidecar canvas and info panel hidden.
3. Toggle each sub-toggle independently → only that piece appears.
4. Toggle a sub-toggle off mid-run → overlay disappears on next `Draw`.
5. Hover panel updates on `mousemove`; clears on `mouseleave`; clears on Reset.
6. Adjacency canvas renders on first `adjacency` toggle-on; subsequent toggles only show/hide.
7. `dumpInit` toggle change has no immediate effect; takes effect on next Reset.
8. `npm test` green.

## Edge cases

- **Reset during hover.** `Set()` clears `#infoPanel` content; next mousemove repopulates from the new `tileMap`.
- **Hover during play loop.** Acceptable and useful — panel updates as `tileMap` mutates. No special handling.
- **Adjacency canvas height** (`tiles.size × 4 × tileSize`) can become very tall on `ChipTiles`. Not addressed — out of scope.
- **`#debugMaster` initial state.** Unchecked, matching `debug.master = false`. No localStorage read.
