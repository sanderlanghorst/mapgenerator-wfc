import assert from 'assert';
import { Random } from '../src/random.mjs';
import { GenerateTiles, GenerateChancesFromTiles } from '../src/generation.mjs';
import { generateHeightmap } from '../src/heightmap.mjs';
import { WaveMap } from '../src/wavemap.mjs';
import { Tiles } from '../src/tiles.mjs';

describe('wavemap (esm)', function () {
  it('initializes and normalizes probabilities', function () {
    const seed = 'test-seed';
    const rng = new Random(seed);
    const tiles = GenerateTiles(Tiles);
    const chances = GenerateChancesFromTiles(tiles);
    const cols = 6;
    const rows = 4;
    const heightmap = generateHeightmap(cols, rows, rng);
    const wm = new WaveMap(rows, cols, tiles, chances, heightmap, rng);

    // Check dimensions
    assert.strictEqual(wm.cols, cols);
    assert.strictEqual(wm.rows, rows);

    // Every cell's probabilities sum to ~1 (or 0 if all filtered)
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const cell = wm.GetChances(x, y);
        let sum = 0;
        for (const v of cell.values()) sum += v;
        // allow small FP error
        assert.ok(Math.abs(sum - 1) < 1e-6 || Math.abs(sum) < 1e-6, `sum at ${x},${y} = ${sum}`);
      }
    }
  });
});
