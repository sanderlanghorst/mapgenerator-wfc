const assert = require('assert');

// Verifies that `constraint.forbid` is a HARD adjacency constraint:
// once a tile carrying a forbid key is fixed, no adjacent cell may retain
// any positive probability for tiles sharing the same forbid key.
describe('forbid.integration (cjs)', function () {
  it('forbid prevents same-key tiles from ever appearing adjacent', async function () {
    const { Random } = await import('../src/random.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { WaveMap } = await import('../src/wavemap.mjs');

    // Two tiles, both with all-' ' edges so any orientation is edge-compatible
    // with any other. Tile A carries `forbid: 'mark'`; tile B is unconstrained.
    // Without the forbid, A could be adjacent to A. With the forbid, it must not.
    const sourceTiles = [
      {
        // marker (asymmetric core => four distinct rotations, all sharing forbid)
        image: [
          [' ', ' ', ' ', ' ', ' '],
          [' ', '#', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
        ],
        constraint: { forbid: 'mark' },
        probability: 1,
      },
      {
        // plain background
        image: [
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
          [' ', ' ', ' ', ' ', ' '],
        ],
        probability: 1,
      },
    ];

    const tiles = GenerateTiles(sourceTiles);
    const chances = GenerateChancesFromTiles(tiles);

    // collect ids of tiles carrying the forbid key
    const markedIds = new Set();
    for (const [id, t] of tiles) {
      if (t.constraint && t.constraint.forbid === 'mark') markedIds.add(id);
    }
    assert.ok(markedIds.size > 0, 'expected at least one marker tile after expansion');

    // pick any marker id to fix at the centre
    const fixedId = markedIds.values().next().value;

    const cols = 3, rows = 3;
    const flatHeight = Array.from({ length: cols }, () => Array.from({ length: rows }, () => 0.5));
    const rng = new Random('forbid-seed');
    const wm = new WaveMap(rows, cols, tiles, chances, flatHeight, rng);

    wm.Fix(1, 1, fixedId);

    // Every 4-neighbour of the centre must have zero probability for every
    // marker tile (the hard-constraint guarantee).
    const neighbours = [[1, 0], [2, 1], [1, 2], [0, 1]];
    for (const [nx, ny] of neighbours) {
      const m = wm.GetChances(nx, ny);
      for (const markerId of markedIds) {
        const p = m.get(markerId) || 0;
        assert.strictEqual(
          p, 0,
          `cell (${nx},${ny}) still allows marker tile ${markerId} (p=${p}) after a marker was fixed at the centre`
        );
      }
    }
  });
});
