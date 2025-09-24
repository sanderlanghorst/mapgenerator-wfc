import { Directions, Opposites } from './constants.mjs';

export function GenerateTiles(tiles) {
    const allTiles = [];
    for (let i = 0; i < tiles.length; i++) {
        const extraTiles = [];
        let tile = tiles[i];
        extraTiles.push(tile);
        for (let j = 0; j < 3; j++) { tile = Rotate(tile); extraTiles.push(tile); }
        const length = extraTiles.length;
        for (let j = 0; j < length; j++) { tile = Flip(extraTiles[j]); extraTiles.push(tile); }
        const seen = new Set(); const uniqueTiles = [];
        for (const tile of extraTiles) {
            const key = tile.image.map(row => row.join('')).join('|');
            if (!seen.has(key)) { seen.add(key); uniqueTiles.push(tile); }
        }
        allTiles.push(...uniqueTiles);
    }
    const map = new Map();
    for (let i = 0; i < allTiles.length; i++) { allTiles[i].id = i; map.set(i, allTiles[i]); }
    return map;
    function Rotate(tile) {
        const newImage = [];
        for (let i = 0; i < tile.image[0].length; i++) {
            newImage[i] = [];
            for (let j = 0; j < tile.image.length; j++) {
                newImage[i][j] = tile.image[tile.image.length - j - 1][i];
            }
        }
        return { image: newImage, constraint: tile.constraint, probability: ('probability' in tile ? tile.probability : 1), minHeight: ('minHeight' in tile ? tile.minHeight : 0), maxHeight: ('maxHeight' in tile ? tile.maxHeight : 1) };
    }
    function Flip(tile) {
        const newImage = tile.image.map(row => row.slice().reverse());
        return { image: newImage, constraint: tile.constraint, probability: ('probability' in tile ? tile.probability : 1), minHeight: ('minHeight' in tile ? tile.minHeight : 0), maxHeight: ('maxHeight' in tile ? tile.maxHeight : 1) };
    }
}

export function GenerateChancesFromTiles(tiles) {
    function getEdge(tile, side) {
        switch (side) {
            case 'left': return tile.image[0].join('');
            case 'right': return tile.image[tile.image.length - 1].join('');
            case 'top': return tile.image.map(row => row[0]).join('');
            case 'bottom': return tile.image.map(row => row[row.length - 1]).join('');
        }
    }
    const chances = new Map();
    const sum = Array.from(tiles).reduce((acc, [tid, tile]) => 'probability' in tile ? acc + tile.probability : acc + 1, 0);
    for (const [tid, tile] of tiles) { tile.probability = ('probability' in tile ? tile.probability : 1) / sum; }
    for (const [tid, tile] of tiles) {
        for (const dir of Directions) {
            const edgeA = getEdge(tile, dir);
            for (const [otid, oTile] of tiles) {
                const edgeB = getEdge(oTile, Opposites[dir]);
                const chance = chances.get(tid) || {};
                if (!chance[dir]) { chance[dir] = new Map(); }
                if (tile.constraint && tile.constraint?.forbid == oTile.constraint?.forbid) {
                    chance[dir].set(otid, 0);
                } else if (edgeA === edgeB) {
                    chance[dir].set(otid, ('probability' in oTile ? oTile.probability : 1));
                }
                chances.set(tid, chance);
            }
        }
    }
    return chances;
}
