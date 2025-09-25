const assert = require('assert');
const fs = require('fs');

describe('snapshot (cjs)', function () {
  it('matches the golden snapshot', async function () {
    const { Random } = await import('../src/random.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { generateHeightmap } = await import('../src/heightmap.mjs');
    const { WaveMap } = await import('../src/wavemap.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const cols = 6, rows = 6;
    const rng = new Random('integration-seed');
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

    const fixture = JSON.parse(fs.readFileSync('test/fixtures/integration-snapshot.json', 'utf8'));
    assert.strictEqual(JSON.stringify(grid), JSON.stringify(fixture), 'generated grid differs from snapshot');
  });
});
