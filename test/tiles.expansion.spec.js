const assert = require('assert');

describe('tiles.expansion (cjs)', function () {
  it('GenerateTiles expands, deduplicates and assigns sequential ids', async function () {
    const { GenerateTiles } = await import('../src/generation.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const map = GenerateTiles(Tiles);
    // map should be a Map and non-empty
    assert.ok(map instanceof Map, 'GenerateTiles should return a Map');
    assert.ok(map.size > 0, 'Generated tiles map should not be empty');

    // Each tile should have an id equal to its map key and have 5x5 image
    const keys = Array.from(map.keys());
    for (const [k, tile] of map) {
      assert.strictEqual(k, tile.id, 'tile id should match map key');
      assert.ok(Array.isArray(tile.image), 'tile.image should be an array');
      assert.strictEqual(tile.image.length, 5, 'tile.image should have 5 rows');
      for (const row of tile.image) {
        assert.strictEqual(row.length, 5, 'each tile.image row should have 5 columns');
      }
    }

    // Ensure uniqueness by serialized key
    const seen = new Set();
    for (const [, tile] of map) {
      const key = tile.image.map(r => r.join('')).join('|');
      assert.ok(!seen.has(key), 'duplicate tile image found');
      seen.add(key);
    }
    assert.strictEqual(seen.size, map.size, 'unique serialized keys should equal map size');
  });
});
