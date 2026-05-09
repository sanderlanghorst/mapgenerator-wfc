# Architecture & Working Notes

Concrete mechanics, data shapes, and working philosophy for this Wave Function Collapse playground. Companion to `CLAUDE.md` (which carries the short, hard-rule version for AI agents).

## Project intent

Interactive visual sandbox for experimenting with WFC-style constrained tile collapse plus a heightmap filter. **Determinism (seed) and transparency (readable source) are core values.** Fast iteration over architecture; defer abstraction until at least two concrete duplication points appear.

## Data structures

- **Tile** — `{ id, image[x][y], probability, minHeight, maxHeight, constraint? }`. `id` is assigned after rotation/flip expansion. **`image` is column-major:** `image[x][y]` indexes column `x`, row `y`. Tile dimensions are 5×5 chars.
- **Colors** — char → CSS color string. Defined alongside each tile set in `src/tiles.mjs`.
- **`WaveMap.wave[x][y]`** — `Map<tileId, probability>`. A collapsed cell has a single entry with value `1`.
- **Chances (adjacency)** — `Map<tileId, { top, right, bottom, left }>` where each direction is a `Map<otherTileId, weight>`. Weights are relative until per-cell normalization during propagation.

## Tile expansion (`GenerateTiles`)

1. Start from the active seed array (`Tiles` export from `tiles.mjs`).
2. For each tile, generate the original plus 3 rotations, then a horizontal flip of each → up to 8 variants.
3. Deduplicate via the serialized key `image.map(row => row.join('')).join('|')`.
4. Clones preserve `probability`, `minHeight`, `maxHeight`, and `constraint`.
5. Sequential `id` is assigned at the end, after dedupe, by insertion order.

## Adjacency generation (`GenerateChancesFromTiles`)

1. Normalize all base probabilities across the expanded tile set so they sum to 1.
2. For each ordered pair (tile A, tile B) and each direction `dir`:
   - If both tiles share the same `constraint.forbid` string → `chance(A, dir, B) = 0`.
   - Else if `getEdge(A, dir) === getEdge(B, opposite(dir))` → `chance = B.probability`.
3. Edge extraction (note column-major indexing):
   - `left` → `image[0]` (leftmost column joined as string)
   - `right` → `image[image.length - 1]` (rightmost column)
   - `top` → `image.map(col => col[0])` (top cell of each column)
   - `bottom` → `image.map(col => col[col.length - 1])` (bottom cell of each column)

## Heightmap (`generateHeightmap`)

- Layered noise (default 4 layers) with per-cell exaggeration `(random.Next() * 4) + 0.5` — a single seed-driven exponent applied uniformly.
- Output values land in `[minDepth, maxDepth]` → raised to `exaggeration`.
- During `WaveMap` initialization, tiles whose `[minHeight, maxHeight]` excludes the cell's height get probability 0 *before* normalization.
- The height filter is reapplied during every `UpdateProbabilities` pass.

## Propagation (`PropagateProbabilities`)

- Bounded DFS, max depth **20**.
- For each visited neighbour, recompute its probability map by:
  1. For every present neighbour direction (up to 4), aggregate the allowed tiles weighted by that neighbour's chances.
  2. Within one direction, average the chances of each candidate tile across the neighbour's possibilities (`totalChance / number`).
  3. Across directions, sum the per-direction averages.
  4. Keep only candidates that appeared in **all** present neighbour directions (logical AND of compatibility).
  5. Normalize the resulting map.
- If the new map differs from the previous, push that neighbour onto the stack with `depth - 1`.
- **No backtracking.** Empty maps can occur transiently on contradictions and currently leak through.

## Collapse heuristic (`GetMostCertain`)

Scans the grid linearly and returns the first cell with `size > 1` and the smallest option count seen so far. Improvement ideas (not implemented): Shannon entropy, randomized tie-break among minimal sets.

## Weighted selection (`WeightedRandom` + `Pick`)

- Filter out 0-probability candidates; throw if none remain.
- Apply temperature: `p_adj = p^(1/T)`, then renormalize.
- `T` is sampled per `Pick` from `[0.8, 1.2]` via `0.8 + random.Next() * 0.4` — adds subtle diversity while staying seed-deterministic.
- Sample by inverse-CDF using `random.Next()`.

## Determinism — what to know

- The only stochasticity in core logic comes from `Random.Next()`: heightmap noise + per-map exaggeration exponent + per-pick temperature + per-pick tile selection. **Never use `Math.random()` in `src/`.**
- Drawing order does not affect state.
- Adding, removing, or reordering seed tiles changes global probability normalization → existing seeds yield different layouts. Snapshot fixture must be regenerated intentionally and the change documented.

## Active tile set

`src/tiles.mjs` defines two seed sets — `LandTiles` (greens/water/walls, with min/max-height constraints) and `ChipTiles` (paths/walls plus a `corner` constraint). The trailing line `const Tiles = ChipTiles` selects which is exported. Both sets stay in the file; switch via that assignment.

## Debug mode

Set `DEBUG = true` in `src/main.js` to render: cell borders, `x,y` coords, tile id, probability %, constraint JSON, height bars on each cell's right edge, and the full adjacency canvas (every tile with its directional compatibilities). Don't commit `DEBUG = true`.

## Testing protocol

- Runner: Mocha, no transform. `npm test` runs everything in `test/*.spec.js`.
- **Two coexisting styles** — match the file you're editing:
  - ESM specs (`random.spec.js`, `wavemap.spec.js`) use direct `import` from `../src/*.mjs`.
  - CJS specs use `require('assert')` + dynamic `await import('../src/*.mjs')`.
- Keep integration grids small (~6×6) so each spec stays under ~1s on CI.
- Determinism specs assert exact numeric outputs — only update expectations on intentional logic changes.
- Snapshot fixture: `test/fixtures/integration-snapshot.json`. Regenerate via `node ./scripts/generate_snapshot.mjs`, inspect the diff, then commit the fixture with message `TEST(SNAPSHOT): regen`.
- Never mutate `main.js` from tests; construct `WaveMap` with explicit dims instead.
- Existing coverage: `random`, `tiles.expansion`, `chances`, `heightmap`, `wavemap` (init + normalization), `wavemap.propagation` (Fix), `wavemap.pick`, `determinism.integration`, `snapshot`.

## CI & deploy

- `.github/workflows/ci.yml` — `npm install` + `npm test` on push and PR to `main` (Node 18.x).
- `.github/workflows/static.yml` — deploys `src/` to GitHub Pages on push to `main` (the demo runs straight from the source tree, no build).

## Change philosophy

- Incremental, observable steps. Prefer a small capability + a deterministic test over large refactors.
- New algorithmic rule → isolate it (helper or guarded branch) and add a fixed-seed test asserting exact output.
- Defer abstraction until at least two concrete duplication points appear.
- High-level flow (init / UI / drawing) stays in `main.js`; pure logic stays in modules with no DOM access.

## Quality checklist for core changes

- [ ] Probability maps sum to ≈1 (FP tolerance) wherever `size > 0`.
- [ ] No cell with `size > 1` but all-zero probabilities.
- [ ] No `Math.random()` introduced in `src/`.
- [ ] Rotation/flip dedupe count stable for the seed `Tiles` array (verified by `tiles.expansion.spec`).
- [ ] Snapshot fixture either unchanged or regenerated intentionally with a `TEST(SNAPSHOT): regen` commit.

## When to ask before proceeding

- Async work or web workers for performance.
- Resizing tile grids or moving away from 5×5 character images.
- Introducing a build step or runtime dependency.
- Any change that alters collapse output for an existing seed (intentional or otherwise).
- Touching propagation depth, temperature range, the dedupe key, or the RNG algorithm.

## Open improvements (track here; remove when done)

- Backtracking / restart when a cell empties from contradictions.
- Configurable propagation depth instead of the hard-coded 20.
- Optional rule caching keyed by `(tileId, neighborMask)`.
- Perf metrics panel (propagations per collapse, time per step).
- Replace `GetMostCertain`'s linear scan with a Shannon-entropy heuristic and randomized tie-break.
- Remove the redundant `<script type="module" src="tiles.mjs">` from `src/index.html` — `main.js` already imports it.
