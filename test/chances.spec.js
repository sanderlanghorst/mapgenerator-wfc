const assert = require('assert');

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
