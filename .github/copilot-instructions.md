# AI Coding Agent Instructions (High‑Level Development Guidelines)

Purpose: Keep this project a lightweight, browser‑first ES6 (no build) Wave Function Collapse playground while it evolves. Technical mechanics live in `./copilot-technical.md`; keep this file short and principle focused.

## Project Intent
Interactive visual sandbox for experimenting with WFC‑style constrained tile collapse plus a heightmap filter. Fast iteration > architecture. Determinism (seed) and transparency (readable source) are core values.

## Non‑Negotiable Constraints
1. Browser only: plain `<script>` tags; prefer module scripts (`<script type="module">`) for logic and data. No bundler / transpile / package manager by default unless explicitly justified.
2. Deterministic core: all algorithmic randomness flows through the custom `Random` instance (no `Math.random()` in core logic).
3. Script load order matters; if you add new scripts, consciously place them (see technical file).
4. Tile definitions remain simple 5×5 character grids until a deliberate versioned change.
5. Prefer explicit ESM exports for logic and data (`Tiles`, `Colors`, `Random`, `WaveMap`) and minimize globals. During migration legacy globals may remain briefly; coordinate any rename.

## Change Philosophy
Incremental, observable steps. Prefer adding a small capability + a visual / (future) test harness example over large refactors. Defer abstraction until at least two concrete duplication points appear.

## Typical Feature Flow
1. Define / adjust tiles (probability / constraints).
2. Regenerate in browser, observe behavior with a fixed seed.
3. If new algorithmic rule: add it isolated, guard with minimal conditional or helper.
4. (When tests exist) add / update unit test covering the new rule (see technical file for structure).

## Testing Direction (Conceptual)
Primary test runner: Mocha (Node). Keep tests small, deterministic, and fast. Use `test/*.spec.js` naming (CommonJS-style entry) that can dynamically import ESM modules when needed.

For quick browser checks you may keep an in‑browser test harness, but core validation should live in Mocha tests that run under `npm test`.

## Performance & Complexity
Favor clarity; only micro‑optimize if a visible UI slowdown occurs (e.g., propagation). Any optimization must keep determinism identical for a given seed.

## When To Ask / Flag
– You need async / workers for performance.
– You want to resize tile grids or move away from 5×5 characters.
– You plan to introduce a build step or external dependency.
– A change would alter collapse determinism for existing seeds.

## Separation of Concerns
High‑level flow (init / UI / drawing) stays in `main.js`; pure logic (probability updates, RNG) stays isolated. Avoid UI code in logic helpers.

## Source of Truth for Details
All implementation specifics, algorithms, and testing mechanics: `./copilot-technical.md` (keep them updated there, not here).

## Review Checklist (Lightweight)
[ ] Preserves browser‑only model
[ ] No unintended `Math.random()` usage
[ ] Tile additions respect 5×5 + documented constraints
[ ] Deterministic behavior unchanged for identical seed unless explicitly stated
[ ] Technical file updated if underlying mechanics changed

## Unit Testing (Mocha Minimal Layer)
Mocha is used for logic validation (no build chain). Keep tests focused, fast, deterministic.
– Location: `test/*.spec.js`.
– Command: `npm test` (runs plain `mocha`).
– Import pattern: tests may be CommonJS but should use dynamic `import('../src/<file>.mjs')` to load ESM modules when needed (this avoids duplicating logic or adding temporary CJS exports).
– Determinism: assert exact numeric outputs for seeded RNG & algorithm steps; update expectations only when intentional logic change.
– Scope: RNG reproducibility, tile generation (rotation/flip dedupe counts), probability normalization, propagation correctness on tiny grids, height filtering (tiles excluded outside bounds).
– Keep browser global behavior intact where required for the demo, but prefer module imports in tests and new code.
If test complexity grows, move expanded details into `copilot-technical.md` but keep this summary stable.
