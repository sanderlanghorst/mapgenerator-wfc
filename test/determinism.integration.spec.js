const assert = require('assert');

describe('determinism.integration (cjs)', function () {
  it('full collapse is deterministic for the same seed', async function () {
    const { Random } = await import('../src/random.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { generateHeightmap } = await import('../src/heightmap.mjs');
    const { WaveMap } = await import('../src/wavemap.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const cols = 6, rows = 6;

    function run(seed) {
      const rng = new Random(seed);
      const tiles = GenerateTiles(Tiles);
      const chances = GenerateChancesFromTiles(tiles);
      const heightmap = generateHeightmap(cols, rows, rng, 3, 0, 1);
      const wm = new WaveMap(rows, cols, tiles, chances, heightmap, rng);

      let iterations = 0;
      while (true) {
        const most = wm.GetMostCertain();
        if (!most || iterations > cols * rows * 10) break;
        wm.Pick(most.x, most.y);
        iterations++;
      }

      const grid = [];
      for (let x = 0; x < cols; x++) {
        const col = [];
        for (let y = 0; y < rows; y++) {
          const m = wm.GetChances(x, y);
          if (m.size === 1) col.push(m.keys().next().value);
          else col.push(-1);
        }
        grid.push(col);
      }
      return JSON.stringify(grid);
    }

    const outA = run('integration-seed');
    const outB = run('integration-seed');
    assert.strictEqual(outA, outB, 'outputs should be identical for the same seed');

    const outC = run('integration-seed-2');
    assert.notStrictEqual(outA, outC, 'different seeds should (very likely) produce different outputs');
  });
});
