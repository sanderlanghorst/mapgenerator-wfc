/**
 * @typedef {Object} TileChance
 * @property {Map<Number,Number>} top - Chances for the top direction.
 * @property {Map<Number,Number>} right - Chances for the right direction.
 * @property {Map<Number,Number>} bottom - Chances for the bottom direction.
 * @property {Map<Number,Number>} left - Chances for the left direction.
 */

//const Directions = ['top', 'right', 'bottom', 'left'];
//const Opposites = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };

/**
 * WeightedRandom selects an item from a list based on given probabilities and temperature.
 * @template T
 * @param {Array<T>} items 
 * @param {Array<Number>} probabilities 
 * @param {Number} temperature 
 * @returns {T}
 * @this {WaveMap}
 */
function WeightedRandom(items, probabilities, temperature = 1) {
    if (temperature <= 0) {
        throw new Error("Temperature must be greater than 0");
    }
    // Filter out items with zero probability
    const filtered = items
        .map((item, idx) => ({ item, prob: probabilities[idx] }))
        .filter(({ prob }) => prob > 0);

    if (filtered.length === 0) {
        throw new Error("No items with non-zero probability to select from.");
    }

    const filteredItems = filtered.map(f => f.item);
    const filteredProbabilities = filtered.map(f => f.prob);
    // Adjust probabilities based on temperature
    const adjustedProbabilities = filteredProbabilities.map(p => Math.pow(p, 1 / temperature));

    // Normalize adjusted probabilities again
    const adjustedTotal = adjustedProbabilities.reduce((sum, p) => sum + p, 0);
    const normalizedProbabilities = adjustedProbabilities.map(p => p / adjustedTotal);

    
    // Generate a random number
    const randomValue = this.random.Next();
    let cumulativeProbability = 0;

    // Select item based on adjusted probabilities
    for (let i = 0; i < filteredItems.length; i++) {
        cumulativeProbability += normalizedProbabilities[i];
        if (randomValue < cumulativeProbability) {
            return filteredItems[i];
        }
    }
}


/**
 * Updates the probabilities at a given position (x, y) in the WaveMap.
 * @param {Number} x 
 * @param {Number} y 
 * @this WaveMap
 */
function PropagateProbabilities(x, y) {
    const max = 20;
    const stack = [[x, y, max]];
    while (stack.length > 0) {
        const [cx, cy, cmax] = stack.pop();
        if (cmax <= 0) continue;
        for (const [nx, ny] of [
            [cx, cy - 1], // Top
            [cx + 1, cy], // Right
            [cx, cy + 1], // Bottom
            [cx - 1, cy]  // Left
        ]) {
            if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
            if (UpdateProbabilities.call(this, nx, ny)) {
                stack.push([nx, ny, cmax - 1]);
            }
        }
    }
    return;
}

/**
 * Updates the probabilities at a given position (x, y) in the WaveMap.
 * @param {Number} x 
 * @param {Number} y 
 * @this WaveMap
 * @returns {Boolean} Returns true if the probabilities were updated, false otherwise.
 */
function UpdateProbabilities(x, y) {
    const thisMap = this.tiles[x][y];
    if (thisMap.size == 1 && thisMap.values().next().value == 1) return false;
    const neighbors = [
        this.tiles[x]?.[y - 1], // Top
        this.tiles[x + 1]?.[y], // Right
        this.tiles[x]?.[y + 1], // Bottom
        this.tiles[x - 1]?.[y] // Left
    ];
    const mappedNeighbors = neighbors
        .map((n, i) => ({ m: n, dir: Opposites[Directions[i]] }))
        .filter(n => n?.m !== undefined);

    const s = JSON.stringify(Array.from(thisMap));
    /** @type {Map<Number,CalculatedChance>} */
    const neighborChances = new Map();
    for (const { m, dir } of mappedNeighbors) {
        const subChances = new Map();
        for (const [n, chance] of m) {
            /**@type {Map<Number,Number>} */
            const chances = this.chances.get(n)[dir];
            for (const [cTileId, chance] of chances) {
                let tileChance = subChances.get(cTileId) || { number: 0, totalChance: 0 };
                tileChance.number++;
                tileChance.totalChance += chance;
                subChances.set(cTileId, tileChance);
            }
        }
        for (const [tId, tileChance] of subChances) {
            if (!neighborChances.has(tId)) {
                neighborChances.set(tId, { number: 0, totalChance: 0 });
            }
            const existingChance = neighborChances.get(tId);
            existingChance.number = (existingChance.number || 0) + 1;
            existingChance.totalChance = existingChance.totalChance + (tileChance.totalChance / tileChance.number);
        }
    }
    thisMap.clear();
    for (const [tId, tileChance] of neighborChances) {
        // Normalize the chances
        tileChance.totalChance = tileChance.totalChance / tileChance.number;
        if (tileChance.totalChance > 0 && tileChance.number >= mappedNeighbors.length) {
            thisMap.set(tId, tileChance.totalChance);
        }
        
    }
    //normalize chances
    Normalize(thisMap);
    return JSON.stringify(Array.from(thisMap)) !== s;
}

/**
 * Normalizes the probabilities at a given position (x, y) in the WaveMap.
 * @param {Map<Number,Number} map
 * @this WaveMap
 */
function Normalize(map) {
    
    let total = 0;
    for (const v of map.values()) total += v;
    if (total > 0) {
        for (const [k, v] of map) {
            map.set(k, v / total);
        }
    }
}

/**
 * WaveMap class represents a grid-based map for the Wave Function Collapse algorithm.
 */
class WaveMap {
    /**
     * 
     * @param {Number} rows 
     * @param {Number} cols 
     * @param {Map<Number,TileChance>} chances 
     */
    constructor(rows, cols, chances, random) {
        /**@type {Number} */
        this.rows = rows;
        /**@type {Number} */
        this.cols = cols;
        /**@type {Map<Number,TileChance>} */
        this.chances = chances;

        /**@type {Random} */
        this.random = random;
        /**
         * A 2D array representing the tiles in the map.
         * Each tile is a Map where keys are tile IDs and values are their probabilities.
         * @type {Array<Array<Map<Number,Number>>>}
         */
        this.tiles = Array.from({ length: cols }, () =>
            Array.from({ length: rows }, () => new Map())
        );
        // Initialize the tiles with all chances set to 1
        const numberOfChances = chances.size;
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                for (const [tileId, _] of chances) {
                    this.tiles[x][y].set(tileId, 1 / numberOfChances);
                }
            }
        }
    }

    Fix(x, y, tileId) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            throw new Error(`Coordinates (${x}, ${y}) are out of bounds.`);
        }
        if (!this.chances.has(tileId)) {
            throw new Error(`Tile ID ${tileId} does not exist in chances.`);
        }
        this.tiles[x][y] = new Map([[tileId, 1]]);
        PropagateProbabilities.call(this, x, y);
    }

    /**
     * Gets the chances of tiles at a specific position (x, y).
     * @param {Number} x 
     * @param {Number} y 
     * @returns {Map<Number,Number>} A map of tile IDs and their probabilities.
     */
    GetChances(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            throw new Error(`Coordinates (${x}, ${y}) are out of bounds.`);
        }
        return this.tiles[x][y];
    }

    /**
     * Gets the tile that has the least options and highest specificity
     * @returns {Object} 
     */
    GetMostCertain() {
        let least = { x, y, size: Number.MAX_SAFE_INTEGER };
        for (let x = 0; x < this.tiles.length; x++) {
            for (let y = 0; y < this.tiles[x].length; y++) {
                if(this.tiles[x][y].size == 1 && this.tiles[x][y].values().next().value == 1) continue;
                if (this.tiles[x][y].size > 1 &&
                    least.size > this.tiles[x][y].size) {
                    least.size = this.tiles[x][y].size;
                    least.x = x;
                    least.y = y;
                }
            }
        }
        if( least.size === Number.MAX_SAFE_INTEGER) return null;
        return least;
    }

    /**
     * picks a random tile given its chances
     * @param {Number} x the x coordinate
     * @param {Number} y the y coordinate
     */
    Pick(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            throw new Error(`Coordinates (${x}, ${y}) are out of bounds.`);
        }
        if (!this.tiles[x][y].size > 1) {
            throw new Error(`Tile ID ${tileId} does not exist in chances.`);
        }
        const chances = this.GetChances(x, y);
        const chosen = WeightedRandom.call(
            this,
            Array.from(chances.keys()),
            Array.from(chances.values()),
        0.8 + this.random.Next()* 0.4);
        this.tiles[x][y] = new Map([[chosen, 1]]);
        PropagateProbabilities.call(this, x, y);
    }
}