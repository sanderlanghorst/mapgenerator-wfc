# Migration & Testing Plan

This document tracks the phased migration to ES modules and structured tests. Update progress checkboxes as phases and tasks complete.

## Phases Overview
1. Phase 1 – Introduce parallel ES6 modules (no behavioral change). Provide module versions of core logic while legacy globals still power the browser demo. Enable both CJS (for Mocha) and ESM imports for RNG first. Start test coverage.
2. Phase 2 – Convert `main.js` to an ES module (`type="module"`), importing logic instead of relying on globals. Keep legacy globals temporarily via a shim.
3. Phase 3 – Modularize tile data (`tiles.js` → `tiles.mjs`) and provide clean exports (`Tiles`, `Colors`). Remove duplicated logic in module layer.
4. Phase 4 – Remove global shim & legacy duplicates; browser runs solely via module graph. Documentation updates.
5. Phase 5 – Expand deterministic test suite (propagation, heightmap, tile expansion, integration) and add regression safeguards.

## Progress Log
(Keep chronological notes here – newest on top)
- [x] Phase 1 (partial): Core ESM modules created (`constants.mjs`, `random.mjs`, `heightmap.mjs`, `generation.mjs`, `wavemap.mjs`), `random.js` patched with CommonJS export, initial ESM test added. Pending: run test suite & possibly add globals shim (not yet needed) before marking Phase 1 fully complete.

## Detailed Task Checklist

### Phase 1 – Parallel Modules
- [x] Create `src/constants.mjs` (Directions, Opposites exports)
- [x] Create `src/random.mjs` (Random export)
- [x] Patch `src/random.js` with `module.exports = { Random }` for Mocha CJS
- [x] Create `src/heightmap.mjs` (generateHeightmap, lerp, SmoothStep)
- [x] Create `src/generation.mjs` (GenerateTiles, GenerateChancesFromTiles)
- [x] Create `src/wavemap.mjs` (WaveMap class; internal helpers not exported)
- [ ] (Optional) Create `src/globals-shim.js` (not required yet)
- [x] Add ESM test `test/random.esm.spec.mjs`
- [x] Confirm `npm test` passes with both CJS + ESM random tests
- Success Criteria: No changes to browser behavior; tests green.

### Phase 2 – Main Module Conversion
- [ ] Change `<script>` for main to `type="module"`
- [ ] Import all logic modules in main
- [ ] Add `globals-shim.js` (module) if any remaining global consumers
- [ ] Tests still green

### Phase 3 – Tile Module
- [ ] Create `tiles.mjs` exporting tile sets + Colors
- [ ] Replace duplication in `generation.mjs` if any
- [ ] Update imports
- [ ] Adjust tests to import from module

### Phase 4 – Remove Legacy Globals
- [ ] Remove old non‑module logic scripts from `index.html`
- [ ] Delete or archive duplicated JS versions (random.js/wavemap.js/etc.) after final confirmation
- [ ] Update docs (`copilot-instructions.md`, `copilot-technical.md`, this plan)

### Phase 5 – Test Suite Expansion
- [ ] tiles.expansion.spec
- [ ] chances.spec
- [ ] wavemap.propagation.spec
- [ ] heightmap.spec
- [ ] determinism.integration.spec
- [ ] Add snapshot helper

## Risk Mitigation Notes
- Keep deterministic value expectations updated only on intentional logic change.
- Avoid probability math rewrites until propagation tests exist.
- Do not remove globals until Phase 4 check passes.

## Rollback Strategy
If a phase breaks the demo or determinism unexpectedly, revert to prior commit (modules are additive until Phase 4), inspect divergence (tile ordering, probability normalization), add targeted test, then re‑attempt.

---
(Agents: update the Progress Log and relevant checkboxes immediately after each code change.)
