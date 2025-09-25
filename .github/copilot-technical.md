# Technical Reference (Detailed Mechanics & Testing)

This file holds concrete implementation details so the high‑level `copilot-instructions.md` can stay short. Keep this updated when core behavior changes.

## Script Load Order (Current)
`tiles.mjs` → `main.js` (module). Logic modules are ESM and imported by `main.js` (e.g. `random.mjs`, `wavemap.mjs`, `generation.mjs`).
Legacy non-module scripts have been archived to `src/legacy/`. Prefer adding new logic as ESM modules and importing them in `main.js`.

## Data Structures
- Tile: `{ id, image[5][5], probability (0<), minHeight, maxHeight, constraint? }` (id assigned after rotation/flip expansion).
- `Colors`: map char → CSS color.
- `WaveMap.wave[x][y]`: `Map<tileId, probability>`; collapsed cell = single entry with value `1`.
- Chances (adjacency): `Map<tileId, { top:Map, right:Map, bottom:Map, left:Map }>`; values are relative weights prior to per‑cell normalization.

## Tile Expansion
`GenerateTiles`:
1. Start with seed array (active export `Tiles`).
2. Generate 3 rotations + horizontal flips of each rotation (total ≤8 variants).
3. Deduplicate via serialized key: `image.map(row=>row.join('')).join('|')`.
4. Preserve `probability|minHeight|maxHeight|constraint` in clones.
5. Assign sequential `id` after full expansion.

## Adjacency Generation
`GenerateChancesFromTiles` compares opposite edges; match ⇒ adopt other tile's base probability. Constraint rule: if both tiles share `constraint.forbid` string → chance = 0. Base probabilities are normalized across the expanded tile set first.

Edge extraction:
- left = first column across rows of `image[0]`
- right = last column of `image[image.length-1]`
- top = first row char of each row index 0
- bottom = last row char of each row index

## Heightmap Integration
Generated once per reset: layered noise accumulation (`layers` default 4) with power exaggeration `(random.Next()*4)+0.5`. During `WaveMap` init: tiles outside `[minHeight,maxHeight]` get probability 0 before normalization.

## Propagation Algorithm
`PropagateProbabilities(x,y)` performs bounded DFS stack (depth=20) pushing neighbors whose probability maps changed (`UpdateProbabilities` returned true). A neighbor cell's new probability map is computed by intersecting allowed tiles from all present neighbor directions, weighting by neighbor chances and averaging.

Normalization: after recompute, each cell probability map is divided by sum (if sum>0). Empty maps can occur transiently if contradictions emerge (future improvement: backtrack / restart if unsolvable).

## Collapse Heuristic
`GetMostCertain` scans grid; picks first cell with >1 options and minimal option count. Improvement ideas: Shannon entropy, tie‑break by highest variance, randomization among minimal sets.

## Weighted Random Selection
`WeightedRandom` raises each probability to power `1/temperature` where `temperature` ∈ [0.8,1.2]. Random value drawn with project RNG. Temperature introduces subtle diversity without discarding determinism (still seed‑driven).

## Determinism Notes
- Only `Random.Next()` influences stochastic behavior (heightmap + selection + temperature).
- Visual order of drawing does not affect state.
- Adding new tiles changes global probability normalization ⇒ existing seeds may yield different layouts; document if maintaining backwards determinism matters.

## Debug Mode
Set `DEBUG=true` in `main.js` to draw: borders, coordinates, tile id, probability %, constraint JSON, and height bars (right edge). Also a large debug adjacency canvas lists all tiles and directional compatibilities.

## Unit Testing Approach
Primary runner: Mocha with tests at `test/*.spec.js` (CommonJS entry) that dynamically import ESM modules.

Example structure:
```
/test
  wavemap.spec.js        # uses dynamic import('../src/*.mjs')
  wavemap.propagation.spec.js
  wavemap.pick.spec.js
```

This approach avoids changing production code for tests and keeps them deterministic. If you later standardize on ESM tests, update `package.json` test runner accordingly.

## Adding Tests Safely
- Never mutate production globals inside tests except via existing public APIs.
- For grid tests, temporarily reduce `mapCols/mapRows` through a helper or separate lightweight harness file rather than editing `main.js` directly.

## CI / Snapshot Details
- Workflow: We added `.github/workflows/ci.yml` which runs `npm install` and `npm test` on pushes and PRs to `main`.
- Snapshot fixtures: stored in `test/fixtures/` and generated with `scripts/generate_snapshot.mjs`.
- Regeneration policy: if a test intentionally changes algorithmic output, run the generator script locally, visually inspect the fixture, then commit the updated fixture with a message like `TEST(SNAPSHOT): regen`.

## Local commands (developer quick reference)
- Run tests:
```
npm test
```
- Regenerate snapshot fixture:
```
node ./scripts/generate_snapshot.mjs
```

## CI performance notes
- Keep integration grids small (6×6 used by tests) to keep CI fast; heavy visual tests should be optional and run in a separate job if needed.

## Extensibility Hooks
Potential safe new files (place before `main.js`):
- `exporter.js` → `ExportJSON(wave, tiles)` returning collapsed tile ids.
- `entropy.js` → `ComputeEntropy(mapCell)` for future heuristic swap.
- `tests/` (see above)

## Migration Path If Build Step Becomes Needed
(Deferred) Keep current file names and export an ES module façade replicating globals to avoid mass refactor. Only adopt bundler when module graph or test tooling pressure justifies it.

## Quality Checklist For Core Changes
- Probability maps always sum ~1 (floating point tolerance) where size>0.
- No cell stuck with size>1 but all zero probabilities.
- No unseeded `Math.random()` in logic files.
- Rotation/flip still produces unique set count stable within commit.

## Open Improvement Ideas (Track Here, Remove When Done)
- Backtracking when a cell empties.
- Configurable propagation depth instead of fixed 20.
- Optional rule caching keyed by (tileId, neighborMask).
- Perf metrics panel (counts of propagations per collapse).

End.
