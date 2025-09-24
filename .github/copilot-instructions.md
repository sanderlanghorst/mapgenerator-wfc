# AI Coding Agent Instructions (High‑Level Development Guidelines)

Purpose: Keep this project a lightweight, browser‑only ES6 (no build) Wave Function Collapse playground while it evolves. Technical mechanics live in `./copilot-technical.md`; keep this file short and principle focused.

## Project Intent
Interactive visual sandbox for experimenting with WFC‑style constrained tile collapse plus a heightmap filter. Fast iteration > architecture. Determinism (seed) and transparency (readable source) are core values.

## Non‑Negotiable Constraints
1. Browser only: plain `<script>` tags; no bundler / transpile / package manager by default.
2. Deterministic core: all algorithmic randomness flows through the custom `Random` instance (no `Math.random()` in core logic).
3. Script load order matters; if you add new scripts, consciously place them (see technical file).
4. Tile definitions remain simple 5×5 character grids until a deliberate versioned change.
5. Keep public globals (`Tiles`, `Colors`, `WaveMap`, `Random`) stable unless doing a coordinated rename.

## Change Philosophy
Incremental, observable steps. Prefer adding a small capability + a visual / (future) test harness example over large refactors. Defer abstraction until at least two concrete duplication points appear.

## Typical Feature Flow
1. Define / adjust tiles (probability / constraints).
2. Regenerate in browser, observe behavior with a fixed seed.
3. If new algorithmic rule: add it isolated, guard with minimal conditional or helper.
4. (When tests exist) add / update unit test covering the new rule (see technical file for structure).

## Testing Direction (Conceptual)
Introduce an in‑browser test harness (HTML that loads sources then `tests/*.js`). No external runner needed initially. Goals: reproducible RNG, rotation/flip uniqueness, probability normalization, height filtering correctness. Expand only when pain is felt.

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
Mocha is added strictly for logic validation (no build chain). Keep tests focused, fast, deterministic.
– Location: `test/*.spec.js`.
– Command: `npm test` (runs plain `mocha`).
– Import pattern: use CommonJS `require('../src/<file>.js')`; do not expose additional symbols by attaching them to `window` but rather propose to upgrade to exporting via module exports when needed (mirror style of `random.spec.js`).
– Determinism: assert exact numeric outputs for seeded RNG & algorithm steps; update expectations only when intentional logic change.
– Scope: RNG reproducibility, tile generation (rotation/flip dedupe counts), probability normalization, propagation correctness on tiny grids, height filtering (tiles excluded outside bounds).
– Keep browser global behavior intact: do not mutate production globals in ways that break `index.html` usage.
If test complexity grows, move expanded details into `copilot-technical.md` but keep this summary stable.
