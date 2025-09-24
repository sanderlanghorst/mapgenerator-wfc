const assert = require('assert');

describe('wavemap.propagation (cjs)', function () {
  it('Fix updates neighbor probabilities and keeps normalization', async function () {
    const { Random } = await import('../src/random.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { generateHeightmap } = await import('../src/heightmap.mjs');
    const { WaveMap } = await import('../src/wavemap.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const rng = new Random('propagate-seed');
    const tiles = GenerateTiles(Tiles);
    const chances = GenerateChancesFromTiles(tiles);
    const cols = 5, rows = 5;
    const heightmap = generateHeightmap(cols, rows, rng);
    const wm = new WaveMap(rows, cols, tiles, chances, heightmap, rng);

    const x = 2, y = 2;
    // ensure center has multiple options
    const center = wm.GetChances(x, y);
    assert.ok(center.size > 1, 'center should have multiple options before Fix');

    // pick a tile id allowed at center
    let chosenId = null;
    for (const [id, t] of tiles) {
      const h = heightmap[x][y];
      if (!(t.minHeight > h || t.maxHeight < h)) { chosenId = id; break; }
    }
    assert.notStrictEqual(chosenId, null, 'found at least one tile allowed at center');

    const neighbors = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
    const pre = neighbors.map(([nx, ny]) => JSON.stringify(Array.from(wm.GetChances(nx, ny))));

    wm.Fix(x, y, chosenId);

    const post = neighbors.map(([nx, ny]) => {
      const m = wm.GetChances(nx, ny);
      // verify normalization: sum approx 1 or 0
      let sum = 0; for (const v of m.values()) sum += v;
      assert.ok(Math.abs(sum - 1) < 1e-6 || Math.abs(sum) < 1e-6, `neighbor ${nx},${ny} not normalized: ${sum}`);
      return JSON.stringify(Array.from(m));
    });

    // at least one neighbor must have changed after propagation
    const changed = pre.some((s, i) => s !== post[i]);
    assert.ok(changed, 'at least one neighbor changed after Fix and propagation');
  });
});
