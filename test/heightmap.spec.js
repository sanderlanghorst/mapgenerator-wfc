const assert = require('assert');

describe('heightmap (cjs)', function () {
  it('generateHeightmap produces stable values, correct dimensions, and values in [0,1]', async function () {
    const { generateHeightmap } = await import('../src/heightmap.mjs');
    const { Random } = await import('../src/random.mjs');

    const width = 6, height = 4;
    const rng = new Random('height-seed');
    const hm = generateHeightmap(width, height, rng, 3, 0, 1);

    // dimensions
    assert.strictEqual(hm.length, width);
    assert.strictEqual(hm[0].length, height);

    // range and determinism (regenerate with same seed)
    for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) {
      assert.ok(hm[x][y] >= 0 && hm[x][y] <= 1, `heightmap value out of range: ${hm[x][y]}`);
    }

    const rng2 = new Random('height-seed');
    const hm2 = generateHeightmap(width, height, rng2, 3, 0, 1);
    for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) {
      assert.strictEqual(hm[x][y], hm2[x][y], `heightmap not deterministic at ${x},${y}`);
    }
  });
});
