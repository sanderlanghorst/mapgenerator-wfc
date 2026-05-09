# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A browser-only Wave Function Collapse playground. No bundler. ESM logic in `src/*.mjs`, UI in `src/main.js`, demo entry `src/index.html`. Detailed mechanics, data shapes, and the working philosophy live in [`docs/architecture.md`](docs/architecture.md) — read it before non-trivial work.

## Development protocol

- `npm test` — full Mocha suite
- `npx mocha test/<file>.spec.js` — single file
- `npx mocha --grep "<pattern>"` — by description
- `node ./scripts/generate_snapshot.mjs` — regenerate `test/fixtures/integration-snapshot.json`. Only run when an algorithmic change is intentional. Commit the regenerated fixture with message `TEST(SNAPSHOT): regen` and inspect the diff first.
- Run the demo by opening `src/index.html` directly in a browser. There is no dev server, no build, no install needed beyond `npm install` for tests.
- After multi-step work touching the migration phases, append a dated bullet to `.github/plan.md`'s Progress Log (top of list, newest first) — the plan asks agents to do this.

## Hard invariants — do not violate

1. **Determinism is sacred.** Every stochastic step flows through `Random.Next()` from `src/random.mjs`. **Never use `Math.random()`** in `src/` (UI rendering aside). The `random.spec.js`, `determinism.integration.spec.js`, and snapshot tests will catch violations — don't "fix" them by updating expectations unless the algorithmic change is deliberate and documented.
2. **Browser-only, no build step, no new runtime deps.** Plain ESM via `<script type="module">`. Adding a bundler, transpile step, or runtime dependency requires explicit user sign-off — flag it before touching `package.json`.
3. **Tiles are 5×5 character grids.** Changing tile dimensions is a versioned breaking change. The serialized dedupe key in `GenerateTiles` (`row.join('') | ...`) and edge extraction in `GenerateChancesFromTiles` both assume this shape.
4. **Probability normalization is global** across the expanded tile set. Adding/removing tiles in `src/tiles.mjs` shifts every existing seed's output. Call this out in PRs and regenerate the snapshot intentionally.
5. **`src/legacy/` is archived reference only.** Do not import from it. Do not "sync" changes there. New logic ships as ESM in `src/*.mjs`.
6. **Separation of concerns:** UI, DOM, canvas, and event wiring stay in `main.js`. Pure logic (probabilities, RNG, propagation, tile expansion, heightmap) stays in modules with no DOM access.

## Soft rules — defaults to follow unless asked otherwise

- Propagation depth is fixed at 20 (`PropagateProbabilities` in `wavemap.mjs`). Don't change it without a measured reason.
- `WeightedRandom` temperature is sampled from `[0.8, 1.2]` per pick — keeps determinism while adding variety. Preserve this behaviour.
- Active tile set is selected at the bottom of `tiles.mjs` (`const Tiles = ChipTiles`). Both `LandTiles` and `ChipTiles` are kept; switch via that assignment, don't delete the inactive set.
- Tests prefer direct ESM `import` from `../src/*.mjs`. Some older specs use CJS with dynamic `import()` — both styles are accepted; match the file you're editing.
- Keep test grids small (~6×6 in integration tests) so each spec stays under ~1s on CI.
- `DEBUG = false` in `main.js` is the committed default. Flip it locally to inspect borders, ids, probabilities, constraints, and the adjacency canvas; don't commit it as `true`.

## Ideals to pursue

- **Fast iteration over architecture.** Add the smallest visible change plus a deterministic test. Defer abstraction until two concrete duplication points exist.
- **Readable source.** This is a teaching-friendly sandbox. Prefer plain loops and explicit data shapes over clever abstractions. Single-file modules with pure functions beat class hierarchies.
- **Observable changes.** A new algorithmic rule should be guardable (helper or conditional) and have a deterministic test asserting exact numeric output for a fixed seed.

## When to stop and ask

- You need async, web workers, or a build step for performance.
- A change would alter collapse output for an existing seed (existing tests will go red — that's the signal).
- You want to introduce an external dependency.
- You're considering changing tile dimensions, propagation depth, temperature range, or the dedupe key.

See `docs/architecture.md` for full data structures, algorithms, edge-extraction details, and the open-improvements list.
