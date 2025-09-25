const assert = require('assert');

describe('generation.chances (cjs)', function () {
  it('normalizes tile probabilities and produces adjacency chance maps', async function () {
    const { Directions } = await import('../src/constants.mjs');
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { Tiles } = await import('../src/tiles.mjs');

    const tiles = GenerateTiles(Tiles);
    const chances = GenerateChancesFromTiles(tiles);

    // tile probabilities should sum to ~1 after normalization
    const totalProb = Array.from(tiles.values()).reduce((s,t)=>s + (t.probability || 0), 0);
    assert.ok(Math.abs(totalProb - 1) < 1e-8, `tile probabilities not normalized: ${totalProb}`);

    // each chance entry should have a Map for each direction and values between 0 and 1
    for (const [tid, chanceObj] of chances) {
      for (const dir of Directions) {
        assert.ok(chanceObj[dir] instanceof Map, `missing map for dir ${dir} on tile ${tid}`);
        for (const [otid, val] of chanceObj[dir]) {
          assert.strictEqual(typeof val, 'number');
          assert.ok(val >= 0 && val <= 1, `invalid chance value ${val} for ${tid}->${otid} dir ${dir}`);
        }
      }
    }

    // constraint.forbid rule: find a tile with a forbid constraint (if present) and ensure it forbids itself
    let forbId = null;
    for (const [id, t] of tiles) if (t.constraint && t.constraint.forbid) { forbId = id; break; }
    if (forbId !== null) {
      const tChance = chances.get(forbId);
      for (const dir of Directions) {
        const val = tChance[dir].get(forbId);
        assert.strictEqual(val, 0, 'constraint.forbid did not set self-chance to 0');
      }
    }

    // find at least one matching-edge pair (different forbid) and assert the chance equals the other tile's probability
    let found = false;
    for (const [tid, t] of tiles) {
      for (const dir of Directions) {
        const edgeA = (dir === 'left') ? t.image[0].join('') : (dir === 'right' ? t.image[t.image.length-1].join('') : t.image.map(r=>r[0]).join(''));
        for (const [otid, oTile] of tiles) {
          const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[dir];
          const edgeB = (opposite === 'left') ? oTile.image[0].join('') : (opposite === 'right' ? oTile.image[oTile.image.length-1].join('') : oTile.image.map(r=>r[0]).join(''));
          if (edgeA === edgeB) {
            const forbidEqual = (t.constraint && oTile.constraint && t.constraint.forbid === oTile.constraint.forbid);
            if (!forbidEqual) {
              const got = chances.get(tid)[dir].get(otid);
              // expect probability equals the other tile's normalized probability
              const expected = oTile.probability;
              assert.strictEqual(got, expected, `expected chance ${expected} for ${tid}->${otid} dir ${dir}, got ${got}`);
              found = true; break;
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    assert.ok(found, 'no matching-edge pair found to validate probability assignment');
  });
});

describe('generation.chances (cjs)', function () {
  it('GenerateChancesFromTiles matches edges and respects constraint.forbid', async function () {
    const { GenerateTiles, GenerateChancesFromTiles } = await import('../src/generation.mjs');
    const { Directions, Opposites } = await import('../src/constants.mjs');

    // small controlled tile set
    const tiles = [
      // tile 0: right edge = 'RRRRR', has forbid 'no'
      { image: [ [' ',' ',' ',' ','R'], [' ',' ',' ',' ','R'], [' ',' ',' ',' ','R'], [' ',' ',' ',' ','R'], [' ',' ',' ',' ','R'] ], probability: 1, constraint: { forbid: 'no' } },
      // tile 1: left edge = 'RRRRR', no constraint
      { image: [ ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '] ], probability: 2 },
      // tile 2: left edge = 'RRRRR', same forbid as tile0 -> should be forbidden
      { image: [ ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '], ['R',' ',' ',' ',' '] ], probability: 3, constraint: { forbid: 'no' } },
      // tile 3: unrelated
      { image: [ ['A','A','A','A','A'], ['A','A','A','A','A'], ['A','A','A','A','A'], ['A','A','A','A','A'], ['A','A','A','A','A'] ], probability: 4 }
    ];

    const map = GenerateTiles(tiles);
    const chances = GenerateChancesFromTiles(map);

    function getEdge(tile, side) {
      switch (side) {
        case 'left': return tile.image.map(r => r[0]).join('');
        case 'right': return tile.image.map(r => r[r.length-1]).join('');
        case 'top': return tile.image[0].join('');
        case 'bottom': return tile.image[tile.image.length-1].join('');
      }
    }

    for (const [tid, tile] of map) {
      for (const dir of Directions) {
        const edgeA = getEdge(tile, dir);
        const chanceObj = chances.get(tid)[dir];
        for (const [otid, oTile] of map) {
          const edgeB = getEdge(oTile, Opposites[dir]);
          const hasEntry = chanceObj.has(otid);
          if (edgeA === edgeB) {
            if (tile.constraint && tile.constraint.forbid && tile.constraint.forbid === oTile.constraint?.forbid) {
              // forbidden: entry exists and equals 0
              assert.ok(hasEntry, `expected forbidden entry for ${tid}->${otid} ${dir}`);
              assert.strictEqual(chanceObj.get(otid), 0);
            } else {
              // should be present with normalized probability
              assert.ok(hasEntry, `expected entry for ${tid}->${otid} ${dir}`);
              const val = chanceObj.get(otid);
              assert.strictEqual(val, oTile.probability);
            }
          } else {
            // if edges don't match, either no entry or entry absent
            if (hasEntry) {
              // if entry exists and not matching edges, it should be zero
              assert.strictEqual(chanceObj.get(otid), 0);
            }
          }
        }
      }
    }
  });
});
