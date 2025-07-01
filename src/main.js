const Directions = ['top', 'right', 'bottom', 'left'];
const Opposites = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
const Colors = {
    ' ': '#1ea54c', // Grass / green
    '#': '#968a81', // Path / brown
    '@': '#1f1f1f', // Wall / black
    '~': '#1799ea', // water / blue
    'X': '#764463', // Red tile
    'default': '#ccc' // Default color for undefined tiles
}
const DEBUG = false;

// Tile and canvas size parameters
    const tileSize = 40; // Size of each tile in pixels
    const mapCols = 50;
    const mapRows = 25;

let random;


/**
 * @typedef {Object} Context
 * @property {Map<Number,Tile>} tiles - Array of tile objects.
 * @property {WaveMap} tileMap - 2D array representing the map of tiles.
 * @property {Map<Number,TileChance>} Chances - Array of chances for each tile.
 * @property {CanvasRenderingContext2D} canvas - The canvas context for drawing.
 * @property {number} tileSize - Size of each tile in pixels.
 * @property {number} mapCols - Number of columns in the map.
 * @property {number} mapRows - Number of rows in the map.
 * 
 * @typedef {Object} Tile
 * @property {Array<Array<string>>} image - 2D array representing the tile's image.
 * @property {Object} [constraint] - Optional constraint for the tile.
 * @property {Number} probability - Probability of the tile being selected (default is 1).
 * 
 * @typedef {Object} TileChance
 * @property {Map<Number,Number>} top - Chances for the top direction.
 * @property {Map<Number,Number>} right - Chances for the right direction.
 * @property {Map<Number,Number>} bottom - Chances for the bottom direction.
 * @property {Map<Number,Number>} left - Chances for the left direction.
 * 
 * @typedef {Map<Number,CalculatedChance>} CalculatedChances
 * 
 * @typedef {Object} CalculatedChance
 * @property {Number} number the number of tiles
 * @property {Number} totalChance the total chance of all neighbors
 * 
 */


window.onload = function () {
    
    const canvasWidth = tileSize * mapCols;
    const canvasHeight = tileSize * mapRows;

    // Set canvas size dynamically
    const canvas = document.getElementById('mazeCanvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');

    const debugCanvas = document.getElementById('debugCanvas');
    const debugCtx = debugCanvas.getContext('2d');

    const resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', () => { Reset(); });
    const stepButton = document.getElementById('step');
    stepButton.addEventListener('click', () => { Step(); });
    const playButton = document.getElementById('play');
    playButton.addEventListener('click', () => { Loop(); });
    const stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', () => { Stop(); });

    const speedSlider = document.getElementById('speedSlider');

    /**@type {Context} */
    const context = {
        tiles: new Map(),
        tileMap: [],
        Chances: new Map(),
        canvas: ctx,
        tileSize: tileSize,
        mapCols: mapCols,
        mapRows: mapRows
    };
    let iterations = 0;

    const centerX = Math.floor(mapCols / 2);
    const centerY = Math.floor(mapRows / 2);

    function Reset() {
        
        iterations = (mapCols * mapRows) / 4;
        const seed = document.getElementById('seed').value;
        random = new Random(seed);
        Set([
            { x: centerX, y: centerY, tile: 0 },
            //{x:1,y:0,tile:3},
            //{x:0,y:1,tile:36},
        ]);

    }
    
    context.tiles = GenerateTiles(Tiles);
    
    const autoChances = GenerateChancesFromTiles(context.tiles);
    context.Chances = autoChances;
    Reset();

    if (DEBUG) {
        const debugDiv = document.getElementById('debugDiv');
        debugDiv.style.display = 'block';
        const colorKeys = Object.keys(Colors);
        for (let i = 0; i < colorKeys.length; i++) {
            const d = document.createElement('span')
            d.style.background = Colors[colorKeys[i]];
            d.innerHTML = colorKeys[i].replace(' ', '&nbsp;') + ' ';
            debugDiv.insertAdjacentElement('afterbegin', d);
        }


        debugCanvas.width = context.tiles.size * tileSize;
        debugCanvas.height = context.tiles.size * tileSize * 4;

        for (const [tid, tile] of context.tiles) {

            DrawTile(debugCtx, tile, 0, tid * 4, context.tileSize);
            for (let di = 0; di < Directions.length; di++) {
                /**@type {Map<Number,Number>} */
                const chances = context.Chances.get(tid)[Directions[di]];

                debugCtx.fillStyle = '#444';
                debugCtx.font = '12px Courier New';
                debugCtx.fillText(Directions[di], tileSize, tileSize / 2 + (tid * 4 + di) * tileSize);

                let offset = 0;
                for (const [cTileId, chance] of chances) {
                    DrawTile(debugCtx, context.tiles.get(cTileId), offset + 2, tid * 4 + di, context.tileSize);
                    debugCtx.fillStyle = '#444';
                    debugCtx.font = '12px Courier New';
                    //debugCtx.fillText(`${chance}%`, (offset + 2) * context.tileSize, (tid * 4 + di) * context.tileSize + 24);
                    offset++;
                }
            }

        }
    }

    //Draw(context);

    function Step(callback) {
        Iterate(context);
        Draw(context);
        if (typeof callback == 'function') callback();
    }

    function Loop() {
        if (iterations-- > 0) {
            Step(() => {
                setTimeout(Loop, 250 - (speedSlider.value*40));
            });
        }
    }
    //Loop();

    function Stop() {
        iterations = 0;
    }


    function Set(initialState) {
        context.tileMap = new WaveMap(context.mapRows, context.mapCols, context.Chances, random);
        context.canvas.clearRect(0, 0, canvasWidth, canvasHeight);

        for ({ x, y, tile } of initialState || []) {
            context.tileMap.Fix(x,y,tile);
        }

        Draw(context);
    }
};

/**
 * 
 * @param {Array<Tile>} tiles the seed tiles
 * @returns {Map<Number,Tile>} an array of tiles with all rotations and flips
 */
function GenerateTiles(tiles) {
    const allTiles = [];
    for (let i = 0; i < tiles.length; i++) {
        const extraTiles = [];
        let tile = tiles[i];
        extraTiles.push(tile);
        // Generate all rotations and flips of the tile
        for (let j = 0; j < 3; j++) {
            tile = Rotate(tile); // Rotate the tile
            extraTiles.push(tile);
        }
        const length = extraTiles.length;
        for (let j = 0; j < length; j++) {
            tile = Flip(extraTiles[j]); // Flip the tile
            extraTiles.push(tile);
        }
        // Remove duplicates
        const seen = new Set();
        const uniqueTiles = [];
        for (const tile of extraTiles) {
            const key = tile.image.map(row => row.join('')).join('|');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTiles.push(tile);
            }
        }
        allTiles.push(...uniqueTiles);
    }
    
    const map = new Map();
    // Assign unique IDs to each tile
    for (let i = 0; i < allTiles.length; i++) {
        allTiles[i].id = i; // Assign a unique ID
        map.set(i, allTiles[i])
    }

    return map;

    function Rotate(tile) {
        const newImage = [];
        for (let i = 0; i < tile.image[0].length; i++) {
            newImage[i] = [];
            for (let j = 0; j < tile.image.length; j++) {
                newImage[i][j] = tile.image[tile.image.length - j - 1][i];
            }
        }
        return { image: newImage, constraint: tile.constraint, probability: ('probability' in tile ? tile.probability : 1) };
    }
    function Flip(tile) {
        const newImage = tile.image.map(row => row.slice().reverse());
        return { image: newImage, constraint: tile.constraint, probability: ('probability' in tile ? tile.probability : 1) };
    }
}

/**
 * 
 * @param {Map<Number,Tile>} tiles 
 * @returns {Map<Number,TileChance>} an array of chances for each tile
 */
function GenerateChancesFromTiles(tiles) {
    // Helper to get edge pattern as a string for a given tile and side
    function getEdge(tile, side) {
        switch (side) {
            case 'left':
                return tile.image[0].join('');
            case 'right':
                return tile.image[tile.image.length - 1].join('');
            case 'top':
                return tile.image.map(row => row[0]).join('');
            case 'bottom':
                return tile.image.map(row => row[row.length - 1]).join('');
        }
    }

    /**@type {Map<Number,TileChance>} */
    const chances = new Map();
    const sum = Array.from(tiles).reduce((acc, [tid, tile]) => 'probability' in tile ? acc + tile.probability : acc + 1, 0);
    for (const [tid, tile] of tiles) {
        tile.probability = ('probability' in tile ? tile.probability : 1) / sum;
    }

    for (const [tid, tile] of tiles) {

        for (const dir of Directions) {

            const edgeA = getEdge(tile, dir);

            for (const [otid, oTile] of tiles) {
                const edgeB = getEdge(oTile, Opposites[dir]);
                /**@type {TileChance} */
                const chance = chances.get(tid) || {};
                if (!chance[dir]) {
                    chance[dir] = new Map();
                }
                if (tile.constraint && tile.constraint?.forbid == oTile.constraint?.forbid) {
                    chance[dir].set(otid, 0);
                }
                else if (edgeA === edgeB) {
                    chance[dir].set(otid, ('probability' in oTile ? oTile.probability : 1));
                }
                chances.set(tid, chance);
            }
        }
    }

    return chances;
}

/**
 * 
 * @param {Context} context 
 */
function Iterate(context) {
    for (let i = 0; i < 4; i++) {
        const coords = context.tileMap.GetMostCertain();
        if(coords?.size > 0){
            context.tileMap.Pick(coords.x, coords.y);
        }
    }
}


/**
 * 
 * @param {Context} context 
 */
function Draw(context) {
    context.canvas.clearRect(0, 0, context.canvas.canvas.width, context.canvas.canvas.height);
    
    for (let x = 0; x < context.mapCols; x++) {
        for (let y = 0; y < context.mapRows; y++) {
            const wave = context.tileMap.GetChances(x, y);
            if (wave.size === 0) continue;
            var t = Array.from(wave).sort(([,av],[,bv]) => bv-av);
            for(let i=0; i<Math.min(3, t.length); i++){
                const tile = context.tiles.get(t[i][0]);
                // Draw the tile image
                DrawTile(context.canvas, tile, x, y, context.tileSize, t[i][1]);
            }
        }
    }
}

function DrawTile(canvas, tile, x, y, tileSize, opacity = 1) {
    const pixelSize = tileSize / tile.image.length;
    for (let ix = 0; ix < tile.image.length; ix++) {
        for (let iy = 0; iy < tile.image[ix].length; iy++) {
            canvas.fillStyle = Colors[tile.image[ix][iy]] || Colors['default'];
            canvas.globalAlpha = opacity;
            canvas.fillRect(
                Math.round(ix * pixelSize + x * tileSize),
                Math.round(iy * pixelSize + y * tileSize),
                Math.round(pixelSize),
                Math.round(pixelSize)
            );
        }
    }
    canvas.globalAlpha = 1;
    if (DEBUG) {
        // draw the tile border
        canvas.strokeStyle = '#fff';
        canvas.lineWidth = 1;
        canvas.strokeRect(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
        );
        //draw tile number
        canvas.fillStyle = '#444';
        canvas.font = '12px Courier New';
        canvas.fillText(`${x},${y}`, x * tileSize + 2, y * tileSize + 12);
        canvas.fillText(tile.id, x * tileSize + 2, y * tileSize + 24);
        //draw tile constraint
        canvas.fillStyle = '#aaa';
        canvas.font = '10px Courier New';
        if('probability' in tile){
            canvas.fillText(`${Math.round(opacity*100)}%`, x * tileSize + 24, y * tileSize + 24);
        }
        if (tile.constraint) {
            canvas.fillText(JSON.stringify(tile.constraint), x * tileSize + 2, y * tileSize + (tileSize - 12));
        }
    }
}

const Tiles = [
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 10
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.05
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            ['#', '#', '#', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
    },
    {
        image: [
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' '],
            ['#', '#', '#', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 1.5
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            ['#', '#', '#', '#', '#'],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 1.5
    },
    {
        image: [
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' '],
            ['#', '#', '#', '#', '#'],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 1
    },
    {
        image: [
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' '],
            ['#', '#', '#', '#', '#'],
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' ']],
        probability: 1
    },
    {
        image: [
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' '],
            [' ', ' ', '#', ' ', ' '],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@']],
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@']],
    },
    {
        image: [
            ['@', '@', ' ', ' ', ' '],
            ['@', '@', ' ', ' ', ' '],
            ['@', '@', '@', ' ', ' '],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@']],
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' '],
            ['@', ' ', ' ', ' ', ' '],
            ['@', '@', ' ', ' ', ' ']],
    },
    {
        image: [
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@'],
            ['@', '@', '@', '@', '@']],
    },
    /* sea tiles */
    
    {
        image: [
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~']],
            probability: 1
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            ['~', ' ', '~', ' ', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~']]
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            ['~', '~', '~', ' ', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' ']]
    },
    {
        image: [
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~']]
    },
    {
        image: [
            [' ', '~', '~', '~', ' '],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~']],
        probability: 0.2
    },
    
   /* river tiles */
   
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            ['~', '~', '~', '~', '~'],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.4
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            ['~', '~', '~', ' ', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.4
    },
    {
        image: [
            [' ', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.8
    },
    {
        image: [
            [' ', ' ', '#', ' ', ' '],
            ['~', '~', '#', '~', '~'],
            ['~', '~', '#', '~', '~'],
            ['~', '~', '#', '~', '~'],
            [' ', ' ', '#', ' ', ' ']],
        probability: 0.2
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            ['~', '~', '~', ' ', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', ' ', '@'],
            [' ', ' ', ' ', '@', '@']],
        probability: 0.1
    },
    {
        image: [
            [' ', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', '~', ' '],
            ['~', '~', '~', ' ', '@'],
            [' ', ' ', ' ', '@', '@']],
        probability: 0.1
    },
    {
        image: [
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' ']],
        probability: 0.5
    },
    {
        image: [
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' '],
            ['#', '#', '@', '#', '#'],
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', 'X', ' ', ' ']],
        probability: 0.5
    },
    {
        image: [
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', ' ', 'X', ' '],
            [' ', ' ', ' ', ' ', 'X'],
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 1
    },
    {
        image: [
            [' ', ' ', 'X', ' ', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', '@', '@', '@', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.00001
    },
    {
        image: [
            [' ', ' ', ' ', ' ', ' '],
            [' ', ' ', 'X', ' ', ' '],
            [' ', 'X', '@', 'X', ' '],
            [' ', ' ', 'X', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ']],
        probability: 0.000001
    },
];
