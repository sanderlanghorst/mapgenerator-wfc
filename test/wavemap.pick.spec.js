const assert = require('assert');

describe('wavemap.pick (cjs)', function () {
  it('Pick reduces a cell to a single tile and propagates changes', async function () {
    const { Random } = await import('../src/random.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { generateHeightmap } = await import('../src/heightmap.mjs');
    const { WaveMap } = await import('../src/wavemap.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const rng = new Random('pick-seed');
    const tiles = GenerateTiles(Tiles);
    const chances = GenerateChancesFromTiles(tiles);
    const cols = 5, rows = 5;
    const heightmap = generateHeightmap(cols, rows, rng);
    const wm = new WaveMap(rows, cols, tiles, chances, heightmap, rng);

    const x = 1, y = 1;
    const before = wm.GetChances(x, y);
    assert.ok(before.size > 1, 'cell should have multiple options before Pick');

    // run Pick and ensure the cell is reduced
    wm.Pick(x, y);
    const after = wm.GetChances(x, y);
    assert.strictEqual(after.size, 1, 'cell should have exactly one option after Pick');
    const val = after.values().next().value;
    assert.strictEqual(val, 1, 'chosen tile should have probability 1');

    // neighbors should have updated probabilities and remain normalized
    const neighbors = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
    let anyChanged = false;
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const m = wm.GetChances(nx, ny);
      let sum = 0; for (const v of m.values()) sum += v;
      assert.ok(Math.abs(sum - 1) < 1e-6 || Math.abs(sum) < 1e-6, `neighbor ${nx},${ny} not normalized: ${sum}`);
      // check if any neighbor now has a different size compared to a freshly constructed map
      // create a new fresh map to compare
      const fresh = new WaveMap(rows, cols, tiles, chances, heightmap, rng);
      const freshSize = fresh.GetChances(nx, ny).size;
      if (freshSize !== m.size) anyChanged = true;
    }
    assert.ok(anyChanged, 'at least one neighbor changed compared to a fresh map, indicating propagation');
  });
});
