import fs from 'fs';
import { Random } from '../src/random.mjs';
import { GenerateTiles, GenerateChancesFromTiles } from '../src/generation.mjs';
import { generateHeightmap } from '../src/heightmap.mjs';
import { WaveMap } from '../src/wavemap.mjs';
import { Tiles } from '../src/tiles.mjs';

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
  return grid;
}

const grid = run('integration-seed');
fs.mkdirSync('test/fixtures', { recursive: true });
fs.writeFileSync('test/fixtures/integration-snapshot.json', JSON.stringify(grid, null, 2));
console.log('Wrote test/fixtures/integration-snapshot.json');
