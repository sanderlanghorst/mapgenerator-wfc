# Debug Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `DEBUG` flag in `src/main.js` with per-feature toggles, eliminate 3× overlay overdraw, and add sidecar heightmap canvas + side info panel — without touching any algorithmic logic.

**Architecture:** All work is in `src/main.js` and `src/index.html`. A new `debug` settings object replaces `const DEBUG`. Debug overlays move out of `DrawTile` into a single `DrawDebugOverlay` pass per cell. New DOM elements (`#debugMaster`, `#debugToggles`, `#colorLegend`, `#heightCanvas`, `#infoPanel`) live in/around the existing `#debugDiv`.

**Tech Stack:** Plain ESM, browser DOM, Canvas 2D. No build step. Tests are Mocha specs in `test/` — none added; all existing tests must stay green as the verification gate.

**Spec:** `docs/superpowers/specs/2026-05-09-debug-readability-design.md`

**Testing strategy:** This plan deliberately does not add unit tests. Per the spec, the debug surface is pure DOM/canvas rendering with no algorithmic effect, and the existing snapshot/determinism/propagation Mocha suite is the safety net for "no logic leaked." Each task ends with `npm test` green plus a targeted manual visual check in the browser (open `src/index.html` directly — no dev server). If a manual check fails, fix in the same task before committing.

**Coordination note:** Another agent is concurrently editing `src/main.js`. Each task should `git pull --rebase` before starting and re-read the file before editing. If a merge conflict occurs in `main.js`, surface it immediately rather than auto-resolving — the other agent may be touching the same lines.

---

## Task 1: Restructure index.html for new debug layout

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: Re-read the current `src/index.html`**

Use the Read tool. Confirm the existing structure matches what the spec describes (master debug controls row, hidden `#debugDiv` containing `#debugCanvas`).

- [ ] **Step 2: Add `#debugMaster` checkbox to controls row, restructure `#debugDiv`**

Replace the existing controls `<div>` and `#debugDiv` block with:

```html
    <div>
        <button id="reset">⏪</button>
        <button id="step">🐞</button>
        <button id="play">▶️</button>
        <button id="stop">⏹️</button>
        <button id="complete">🪄</button>
        <label for="speedSlider">Speed:</label>
        <input type="range" id="speedSlider" min="1" max="10" value="5" />
        <label for="debugMaster" style="margin-left:1em;">
            <input type="checkbox" id="debugMaster" /> debug
        </label>
    </div>
    <div id="debugDiv" style="display:none;">
        <div id="debugToggles" style="display:flex; flex-wrap:wrap; gap:0.5em; margin-bottom:0.5em;">
            <label><input type="checkbox" id="dbg-ids" /> ids</label>
            <label><input type="checkbox" id="dbg-probs" /> probs</label>
            <label><input type="checkbox" id="dbg-grid" /> grid</label>
            <label><input type="checkbox" id="dbg-heights" /> heights</label>
            <label><input type="checkbox" id="dbg-adjacency" /> adjacency</label>
            <label><input type="checkbox" id="dbg-hover" /> hover</label>
            <label title="Takes effect on next Reset"><input type="checkbox" id="dbg-dumpInit" /> dumpInit</label>
        </div>
        <div id="colorLegend" style="margin-bottom:0.5em;"></div>
        <div style="display:flex; gap:1em; align-items:flex-start;">
            <canvas id="heightCanvas" style="border:1px solid #000; display:none;"></canvas>
            <pre id="infoPanel" style="display:none; margin:0; padding:0.5em; border:1px solid #ccc; font-family:'Courier New',monospace; min-width:14em;">hover a cell</pre>
        </div>
        <canvas id="debugCanvas" width="800" height="600" style="border:1px solid #000; display:none;"></canvas>
    </div>
```

Note: `#debugCanvas`'s `display:block` becomes `display:none` (lazy show via JS).

- [ ] **Step 3: Verify HTML loads cleanly**

Run: `npm test`
Expected: PASS (HTML changes have no test impact, but confirm nothing else regressed in case of merge churn).

Open `src/index.html` directly in a browser. Expected: page renders normally; `#debugDiv` is hidden; new "debug" checkbox is visible next to Speed slider but unchecked; clicking it does nothing yet (wiring comes in Task 2).

- [ ] **Step 4: Commit**

```bash
git add src/index.html
git commit -m "html: scaffold per-feature debug toggle layout"
```

---

## Task 2: Replace `DEBUG` with `debug` object and wire master toggle

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

Use the Read tool to load current state (another agent may be editing).

- [ ] **Step 2: Replace `const DEBUG` and add settings object**

Replace this line (currently `const DEBUG = true;` per spec, may have shifted to `false` if the other agent reset it):

```js
const DEBUG = true;
```

with:

```js
const debug = {
    master: false,
    ids: false,
    probs: false,
    grid: false,
    heights: false,
    adjacency: false,
    hover: false,
    dumpInit: false,
};
```

- [ ] **Step 3: Replace every `DEBUG` reference with `debug.master`**

There are five remaining references after Step 2 (per the spec analysis): `if (DEBUG && debugCtx)` at the legend/adjacency block, `if (DEBUG) DumpWaveInit(...)` in `Set()`, `if (DEBUG)` in `Draw()` (height bar), and `if (DEBUG)` in `DrawTile()` (overlay block).

Search the file with `grep -n DEBUG src/main.js` and replace each `DEBUG` → `debug.master` for now. Sub-toggles will narrow these in later tasks. This step keeps the existing behavior identical except that the default starting state is now `debug.master = false`.

- [ ] **Step 4: Wire the `#debugMaster` checkbox**

Inside `window.onload`, after the existing button wiring (`completeButton` click handler), add:

```js
    const debugMaster = document.getElementById('debugMaster');
    const debugDiv = document.getElementById('debugDiv');
    if (debugMaster) {
        debugMaster.addEventListener('change', () => {
            debug.master = debugMaster.checked;
            if (debugDiv) debugDiv.style.display = debug.master ? 'block' : 'none';
            Draw(context);
        });
    }
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (all existing specs).

- [ ] **Step 6: Manual visual check**

Open `src/index.html`. Expected:
- Page renders. `#debugDiv` hidden. No overlays on tiles. No height bar.
- Click "debug" checkbox → `#debugDiv` appears (toggle row + empty legend area + hidden sidecars).
- Tiles now show overlays (because Step 3 still routes everything through `debug.master`).
- Uncheck → `#debugDiv` hides; overlays disappear after next Draw.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "debug: replace single DEBUG flag with debug settings object"
```

---

## Task 3: Move color legend out of DEBUG-gated init

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Locate the legend-build block**

Find the loop that builds color legend spans (originally at `main.js:65-68`):

```js
const colorKeys = Object.keys(Colors || {});
for (let i = 0; i < colorKeys.length; i++) {
    const d = document.createElement('span'); d.style.background = Colors[colorKeys[i]]; d.innerHTML = colorKeys[i].replace(' ', '&nbsp;') + ' '; debugDiv && debugDiv.insertAdjacentElement('afterbegin', d);
}
```

It currently lives inside the `if (debug.master && debugCtx) { ... }` block (formerly `if (DEBUG && debugCtx)`).

- [ ] **Step 3: Move legend to unconditional startup, target `#colorLegend`**

Cut the legend-build code out of the gated block. Place it in `window.onload` after `context.tiles = GenerateTiles(...)` (so `Colors` is loaded) and after `Reset()`, but **before** the `if (debug.master && debugCtx)` adjacency block. Change the target from `debugDiv.insertAdjacentElement('afterbegin', d)` to `colorLegend.appendChild(d)`:

```js
    const colorLegend = document.getElementById('colorLegend');
    if (colorLegend) {
        const colorKeys = Object.keys(Colors || {});
        for (let i = 0; i < colorKeys.length; i++) {
            const d = document.createElement('span');
            d.style.background = Colors[colorKeys[i]];
            d.innerHTML = colorKeys[i].replace(' ', '&nbsp;') + ' ';
            colorLegend.appendChild(d);
        }
    }
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual visual check**

Open `src/index.html`. Toggle debug on. Expected: color legend appears in `#colorLegend` (now under the toggle row, not above the adjacency canvas). Toggle debug off — legend hides with `#debugDiv`. Reload page — legend is built once, no duplication.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "debug: build color legend unconditionally at startup"
```

---

## Task 4: Make `DrawTile` pure; add `DrawDebugOverlay` single-pass

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Strip the debug block out of `DrawTile`**

Remove this block at the end of `DrawTile` (originally `main.js:140-147`):

```js
    if (debug.master) {
        canvas.strokeStyle = '#fff'; canvas.lineWidth = 1; canvas.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        canvas.fillStyle = '#444'; canvas.font = '12px Courier New'; canvas.fillText(`${x},${y}`, x * tileSize + 2, y * tileSize + 12);
        canvas.fillText(tile.id, x * tileSize + 2, y * tileSize + 24);
        canvas.fillStyle = '#aaa'; canvas.font = '10px Courier New';
        if ('probability' in tile) canvas.fillText(`${Math.round(opacity * 100)}%`, x * tileSize + 24, y * tileSize + 24);
        if (tile.constraint) canvas.fillText(JSON.stringify(tile.constraint), x * tileSize + 2, y * tileSize + (tileSize - 12));
    }
```

`DrawTile` should end at `canvas.globalAlpha = 1;`.

- [ ] **Step 3: Add `DrawDebugOverlay` function**

Add after `DrawTile`:

```js
function DrawDebugOverlay(canvas, x, y, tile, probability, tileSize) {
    if (debug.grid) {
        canvas.strokeStyle = '#fff';
        canvas.lineWidth = 1;
        canvas.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
    if (debug.ids) {
        canvas.fillStyle = '#444';
        canvas.font = '12px Courier New';
        canvas.fillText(`${x},${y}`, x * tileSize + 2, y * tileSize + 12);
        canvas.fillText(tile.id, x * tileSize + 2, y * tileSize + 24);
    }
    if (debug.probs) {
        canvas.fillStyle = '#aaa';
        canvas.font = '10px Courier New';
        canvas.fillText(`${Math.round(probability * 100)}%`, x * tileSize + 24, y * tileSize + 24);
    }
}
```

Note: `tile.constraint` JSON is **not** rendered on the cell anymore — it moves to `#infoPanel` (Task 7). `tile.id` is still rendered when `debug.ids` is on.

- [ ] **Step 4: Call `DrawDebugOverlay` once per cell in `Draw`**

In `Draw`, the per-cell loop currently looks like:

```js
for (let i = 0; i < Math.min(3, t.length); i++) {
    const tile = context.tiles.get(t[i][0]);
    DrawTile(context.canvas, tile, x, y, context.tileSize, t[i][1]);
}
```

After the inner candidate loop closes (still inside the `for x` / `for y` cell loop), add a single overlay call using the top candidate:

```js
for (let i = 0; i < Math.min(3, t.length); i++) {
    const tile = context.tiles.get(t[i][0]);
    DrawTile(context.canvas, tile, x, y, context.tileSize, t[i][1]);
}
if (debug.master) {
    const topTile = context.tiles.get(t[0][0]);
    DrawDebugOverlay(context.canvas, x, y, topTile, t[0][1], context.tileSize);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual visual check**

Open `src/index.html`. Toggle debug on, then toggle `grid`, `ids`, `probs` individually. Expected:
- `grid` only → white border once per cell (not three times overlapping).
- `ids` only → coords + id readable in top-left, no border, no probability.
- `probs` only → percentage text near top-right.
- All three on → looks like the old debug view minus the constraint JSON, but text is no longer triple-stamped.
- Step the simulation → overlays redraw consistently.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "debug: single overlay pass per cell, kill 3x overdraw"
```

---

## Task 5: Remove right-edge height bar; add sidecar heightmap canvas

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Remove the height bar block from `Draw`**

Delete this block (originally `main.js:121-127`):

```js
if (debug.master) {
    for (let x = 0; x < context.mapCols; x++) for (let y = 0; y < context.mapRows; y++) {
        const height = context.tileMap.heightmap[x][y];
        context.canvas.fillStyle = `rgba(0, 0, 0, 0.75)`;
        context.canvas.fillRect((x + 1) * context.tileSize - 4, y * context.tileSize, 4, context.tileSize * height);
    }
}
```

- [ ] **Step 3: Add `DrawHeightCanvas` function**

Add at module scope (next to `DrawDebugOverlay`):

```js
function DrawHeightCanvas(context) {
    const heightCanvas = document.getElementById('heightCanvas');
    if (!heightCanvas || !context.tileMap) return;
    const ctx = heightCanvas.getContext('2d');
    if (!ctx) return;
    heightCanvas.width = context.mapCols * context.tileSize;
    heightCanvas.height = context.mapRows * context.tileSize;
    for (let x = 0; x < context.mapCols; x++) {
        for (let y = 0; y < context.mapRows; y++) {
            const h = context.tileMap.heightmap[x][y];
            const v = Math.round(h * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x * context.tileSize, y * context.tileSize, context.tileSize, context.tileSize);
        }
    }
}
```

- [ ] **Step 4: Call `DrawHeightCanvas` from `Draw` when toggle is on**

At the end of `Draw`, add:

```js
if (debug.master && debug.heights) DrawHeightCanvas(context);
```

The `heights` toggle wiring (next task) handles show/hide of the canvas element itself.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual visual check (deferred — toggle wiring not done yet)**

The `heights` toggle is wired in Task 6. After Task 6 you will be able to verify the sidecar visually. For this task, just confirm `npm test` is green and the page still loads with debug master on/off.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "debug: replace right-edge height bar with sidecar heightmap"
```

---

## Task 6: Wire ids/probs/grid/heights/dumpInit toggles

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Add toggle wiring helper and bind sub-toggles**

After the `debugMaster` wiring added in Task 2, add:

```js
    function bindToggle(id, key, onChange) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            debug[key] = el.checked;
            if (onChange) onChange(el.checked);
            Draw(context);
        });
    }

    bindToggle('dbg-ids', 'ids');
    bindToggle('dbg-probs', 'probs');
    bindToggle('dbg-grid', 'grid');
    bindToggle('dbg-heights', 'heights', (on) => {
        const hc = document.getElementById('heightCanvas');
        if (hc) hc.style.display = on ? 'block' : 'none';
    });
    bindToggle('dbg-dumpInit', 'dumpInit');
```

`dumpInit` only flips the flag — it takes effect on the next `Reset()` (handled in Task 9). The `title` attribute on the checkbox already documents this.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Manual visual check**

Open `src/index.html`. Turn debug master on. Then:
- `ids` checkbox → coords/id text appears on tiles only when checked.
- `probs` checkbox → percentage text appears only when checked.
- `grid` checkbox → cell borders appear only when checked.
- `heights` checkbox → grayscale heightmap canvas appears next to the main canvas. Toggle off → canvas hides.
- `dumpInit` checkbox → no immediate effect (Task 9 wires the call site).

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "debug: wire ids/probs/grid/heights/dumpInit toggles"
```

---

## Task 7: Hover handler + side info panel

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Add `RenderInfoPanel` and hover handlers**

After `DrawHeightCanvas`, add:

```js
function RenderInfoPanel(context, x, y) {
    const panel = document.getElementById('infoPanel');
    if (!panel) return;
    if (!context.tileMap || x < 0 || y < 0 || x >= context.mapCols || y >= context.mapRows) {
        panel.textContent = 'hover a cell';
        return;
    }
    const wave = context.tileMap.GetChances(x, y);
    const height = context.tileMap.heightmap[x][y];
    const lines = [];
    lines.push(`cell  : ${x},${y}`);
    lines.push(`height: ${height.toFixed(3)}`);
    if (!wave || wave.size === 0) {
        lines.push('candidates: (none)');
    } else {
        const sorted = Array.from(wave).sort(([, av], [, bv]) => bv - av);
        lines.push(`candidates (${sorted.length}):`);
        for (const [tid, p] of sorted) {
            lines.push(`  ${String(tid).padStart(3)}  ${(p * 100).toFixed(1).padStart(5)}%`);
        }
        const topTile = context.tiles.get(sorted[0][0]);
        if (topTile && topTile.constraint) {
            lines.push('top constraint:');
            lines.push('  ' + JSON.stringify(topTile.constraint, null, 2).replace(/\n/g, '\n  '));
        }
    }
    panel.textContent = lines.join('\n');
}

function ClearInfoPanel() {
    const panel = document.getElementById('infoPanel');
    if (panel) panel.textContent = 'hover a cell';
}
```

- [ ] **Step 3: Wire the `hover` toggle and mousemove/mouseleave**

In `window.onload`, after the other toggle bindings:

```js
    bindToggle('dbg-hover', 'hover', (on) => {
        const panel = document.getElementById('infoPanel');
        if (panel) panel.style.display = on ? 'block' : 'none';
        if (!on) ClearInfoPanel();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!debug.master || !debug.hover) return;
        const rect = canvas.getBoundingClientRect();
        const cx = Math.floor((e.clientX - rect.left) / context.tileSize);
        const cy = Math.floor((e.clientY - rect.top) / context.tileSize);
        RenderInfoPanel(context, cx, cy);
    });
    canvas.addEventListener('mouseleave', () => {
        if (!debug.master || !debug.hover) return;
        ClearInfoPanel();
    });
```

- [ ] **Step 4: Clear the panel on Reset**

In `Set()`, after the existing `Draw(context)` call (or wherever appropriate inside `Set`), add:

```js
    ClearInfoPanel();
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual visual check**

Open `src/index.html`. Turn debug master on, then `hover` on. Expected:
- Info panel appears next to heightmap canvas.
- Move mouse over main canvas → panel updates with `x,y`, height, candidate list (sorted desc by probability), and top tile's constraint JSON if any.
- Move cursor off canvas → panel resets to `hover a cell`.
- Click Reset → panel resets to placeholder.
- Toggle `hover` off → panel hides.
- Step the simulation while hovering → panel updates as cells collapse.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "debug: add hover info panel with candidate list and constraint"
```

---

## Task 8: Lazy adjacency canvas toggle

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Extract adjacency render into a function**

Take the adjacency-render block (originally inside `if (DEBUG && debugCtx)` at `main.js:63-78`, now `if (debug.master && debugCtx)` after Task 2 — and stripped of the legend code in Task 3) and pull it into a standalone function:

```js
let adjacencyRendered = false;
function RenderAdjacencyCanvas(context, debugCtx, debugCanvas) {
    if (adjacencyRendered) return;
    debugCanvas.width = context.tiles.size * context.tileSize;
    debugCanvas.height = context.tiles.size * context.tileSize * 4;
    for (const [tid, tile] of context.tiles) {
        DrawTile(debugCtx, tile, 0, tid * 4, context.tileSize);
        for (let di = 0; di < Directions.length; di++) {
            const chances = context.Chances.get(tid)[Directions[di]];
            debugCtx.fillStyle = '#444';
            debugCtx.font = '12px Courier New';
            debugCtx.fillText(Directions[di], context.tileSize, context.tileSize / 2 + (tid * 4 + di) * context.tileSize);
            let offset = 0;
            for (const [cTileId] of chances) {
                DrawTile(debugCtx, context.tiles.get(cTileId), offset + 2, tid * 4 + di, context.tileSize);
                offset++;
            }
        }
    }
    adjacencyRendered = true;
}
```

Remove the original inline block from `window.onload`.

- [ ] **Step 3: Wire the `adjacency` toggle**

Alongside the other `bindToggle` calls:

```js
    bindToggle('dbg-adjacency', 'adjacency', (on) => {
        const dc = document.getElementById('debugCanvas');
        if (!dc) return;
        if (on && debugCtx) RenderAdjacencyCanvas(context, debugCtx, dc);
        dc.style.display = on ? 'block' : 'none';
    });
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual visual check**

Open `src/index.html`. Turn debug master on. Then:
- Initially `adjacency` off → no big adjacency canvas.
- Toggle `adjacency` on → adjacency canvas appears (may take a moment if many tiles).
- Toggle off → canvas hides.
- Toggle on again → canvas reappears instantly (no re-render, `adjacencyRendered` is sticky).

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "debug: lazy-render adjacency canvas via toggle"
```

---

## Task 9: Wire `dumpInit` at call site

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Re-read `src/main.js`**

- [ ] **Step 2: Narrow the `DumpWaveInit` gate**

Find this line in `Set()` (originally `main.js:87`, after Task 2 it reads `if (debug.master) DumpWaveInit(context.tileMap);`):

```js
if (debug.master) DumpWaveInit(context.tileMap);
```

Replace with:

```js
if (debug.master && debug.dumpInit) DumpWaveInit(context.tileMap);
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Manual visual check**

Open `src/index.html` with the browser devtools console open. Turn debug master on, leave `dumpInit` off. Click Reset → no `WaveMap init dump` group in console. Tick `dumpInit`, click Reset → grouped dump appears. Untick `dumpInit`, click Reset → no dump.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "debug: gate DumpWaveInit on dumpInit sub-toggle"
```

---

## Task 10: Final verification pass

**Files:** None modified.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS, all specs green. Pay attention to `determinism.integration.spec.js` and `snapshot.spec.js` — these confirm no algorithmic change leaked.

- [ ] **Step 2: Walk the spec verification checklist in the browser**

Open `src/index.html`. Execute the spec's manual verification list verbatim:

1. Master off (committed default) → `#debugDiv` hidden, no overlays, canvas matches non-debug visuals.
2. Master on, all sub-toggles off → `#debugDiv` shows toggle row + color legend; tiles render with no overlay; sidecar canvas and info panel hidden.
3. Each sub-toggle independently shows its piece (ids, probs, grid, heights, adjacency, hover, dumpInit).
4. Toggle a sub-toggle off mid-run → overlay disappears on next Draw.
5. Hover panel updates on `mousemove`, clears on `mouseleave`, clears on Reset.
6. Adjacency canvas renders on first `adjacency` toggle-on; subsequent toggles only show/hide.
7. `dumpInit` toggle change has no immediate effect; takes effect on next Reset.

If any item fails, fix in a follow-up task before finishing.

- [ ] **Step 3: Confirm `debug.master` default is `false` in committed source**

Run: `grep -n "master:" src/main.js`
Expected output includes `master: false,` — matches CLAUDE.md soft rule (debug off by default in source).

- [ ] **Step 4: Confirm no `Math.random()` or other invariant violations introduced**

Run: `grep -rn "Math.random" src/`
Expected: no matches in `src/main.js`, `src/*.mjs`. (Hard invariant from CLAUDE.md.)

- [ ] **Step 5: No final commit needed**

This task is verification only. If Steps 1–4 pass clean, the feature is complete. Move on to `superpowers:finishing-a-development-branch` for merge/PR decisions.
