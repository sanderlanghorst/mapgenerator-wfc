import { Directions } from './constants.mjs';
import { Random } from './random.mjs';
import { GenerateTiles, GenerateChancesFromTiles } from './generation.mjs';
import { generateHeightmap } from './heightmap.mjs';
import { WaveMap } from './wavemap.mjs';

const DEBUG = false;

// Tile and canvas size parameters
const tileSize = 20; // pixels per tile
const mapCols = 20;
const mapRows = 14;
const stepSize = 4;

let random;

// UI bootstrap
window.onload = function () {
    const canvasWidth = tileSize * mapCols;
    const canvasHeight = tileSize * mapRows;

    const canvas = document.getElementById('mazeCanvas');
    canvas.width = canvasWidth; canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const debugCanvas = document.getElementById('debugCanvas');
    const debugCtx = debugCanvas && debugCanvas.getContext ? debugCanvas.getContext('2d') : null;

    const resetButton = document.getElementById('reset');
    const stepButton = document.getElementById('step');
    const playButton = document.getElementById('play');
    const stopButton = document.getElementById('stop');
    const speedSlider = document.getElementById('speedSlider');
    const completeButton = document.getElementById('complete');

    const context = {
        tiles: new Map(), tileMap: undefined, Chances: new Map(), canvas: ctx, tileSize, mapCols, mapRows, heightmap: []
    };

    let iterations = 0;
    const centerX = Math.floor(mapCols / 2);
    const centerY = Math.floor(mapRows / 2);

    if (resetButton) resetButton.addEventListener('click', () => Reset());
    if (stepButton) stepButton.addEventListener('click', () => Step());
    if (playButton) playButton.addEventListener('click', () => Loop());
    if (stopButton) stopButton.addEventListener('click', () => Stop());
    if (completeButton) completeButton.addEventListener('click', () => { for (let i = 0; i < (mapRows * mapCols) / stepSize; i++) Iterate(context); Draw(context); });

    function Reset() {
        iterations = Math.floor((mapCols * mapRows) / 4);
        const seedInput = document.getElementById('seed');
        const seed = seedInput ? seedInput.value : undefined;
        random = new Random(seed);
        Set([{ x: centerX, y: centerY, tile: undefined }]);
    }

    context.tiles = GenerateTiles(Tiles);
    context.Chances = GenerateChancesFromTiles(context.tiles);
    Reset();

    if (DEBUG && debugCtx) {
        const debugDiv = document.getElementById('debugDiv'); if (debugDiv) debugDiv.style.display = 'block';
        const colorKeys = Object.keys(Colors || {});
        for (let i = 0; i < colorKeys.length; i++) {
            const d = document.createElement('span'); d.style.background = Colors[colorKeys[i]]; d.innerHTML = colorKeys[i].replace(' ', '&nbsp;') + ' '; debugDiv && debugDiv.insertAdjacentElement('afterbegin', d);
        }
        debugCanvas.width = context.tiles.size * tileSize; debugCanvas.height = context.tiles.size * tileSize * 4;
        for (const [tid, tile] of context.tiles) {
            DrawTile(debugCtx, tile, 0, tid * 4, context.tileSize);
            for (let di = 0; di < Directions.length; di++) {
                const chances = context.Chances.get(tid)[Directions[di]];
                debugCtx.fillStyle = '#444'; debugCtx.font = '12px Courier New'; debugCtx.fillText(Directions[di], tileSize, tileSize / 2 + (tid * 4 + di) * tileSize);
                let offset = 0; for (const [cTileId] of chances) { DrawTile(debugCtx, context.tiles.get(cTileId), offset + 2, tid * 4 + di, context.tileSize); offset++; }
            }
        }
    }

    function Step(callback) { Iterate(context); Draw(context); if (typeof callback == 'function') callback(); }
    function Loop() { if (iterations-- > 0) { Step(() => { setTimeout(Loop, 250 - ((speedSlider && speedSlider.value) ? speedSlider.value * 40 : 0)); }); } }
    function Stop() { iterations = 0; }

    function Set(initialState) {
        const heightmap = generateHeightmap(context.mapCols, context.mapRows, random);
        context.tileMap = new WaveMap(context.mapRows, context.mapCols, context.tiles, context.Chances, heightmap, random);
        for (const { x, y, tile } of initialState || []) { if (context.tiles.has(tile)) context.tileMap.Fix(x, y, tile); else context.tileMap.Pick(x, y); }
        Draw(context);
    }
};

/**
 * Iterate a number of picks on the wave map
 * @param {object} context
 */
function Iterate(context) {
    for (let i = 0; i < stepSize; i++) {
        const coords = context.tileMap.GetMostCertain();
        if (coords && coords.size > 0) context.tileMap.Pick(coords.x, coords.y);
    }
}

/**
 * Draw the current state of the wave map onto the canvas
 * @param {object} context
 */
function Draw(context) {
    context.canvas.clearRect(0, 0, context.canvas.canvas.width, context.canvas.canvas.height);
    for (let x = 0; x < context.mapCols; x++) {
        for (let y = 0; y < context.mapRows; y++) {
            const wave = context.tileMap.GetChances(x, y);
            if (!wave || wave.size === 0) continue;
            const t = Array.from(wave).sort(([, av], [, bv]) => bv - av);
            for (let i = 0; i < Math.min(3, t.length); i++) {
                const tile = context.tiles.get(t[i][0]);
                DrawTile(context.canvas, tile, x, y, context.tileSize, t[i][1]);
            }
        }
    }
    if (DEBUG) {
        for (let x = 0; x < context.mapCols; x++) for (let y = 0; y < context.mapRows; y++) {
            const height = context.tileMap.heightmap[x][y];
            context.canvas.fillStyle = `rgba(0, 0, 0, 0.75)`;
            context.canvas.fillRect((x + 1) * context.tileSize - 4, y * context.tileSize, 4, context.tileSize * height);
        }
    }
}

function DrawTile(canvas, tile, x, y, tileSize, opacity = 1) {
    const pixelSize = tileSize / tile.image.length;
    for (let ix = 0; ix < tile.image.length; ix++) {
        for (let iy = 0; iy < tile.image[ix].length; iy++) {
            canvas.fillStyle = (Colors && Colors[tile.image[ix][iy]]) || (Colors && Colors['default']) || '#000';
            canvas.globalAlpha = opacity;
            canvas.fillRect(Math.round(ix * pixelSize + x * tileSize), Math.round(iy * pixelSize + y * tileSize), Math.round(pixelSize), Math.round(pixelSize));
        }
    }
    canvas.globalAlpha = 1;
    if (DEBUG) {
        canvas.strokeStyle = '#fff'; canvas.lineWidth = 1; canvas.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        canvas.fillStyle = '#444'; canvas.font = '12px Courier New'; canvas.fillText(`${x},${y}`, x * tileSize + 2, y * tileSize + 12);
        canvas.fillText(tile.id, x * tileSize + 2, y * tileSize + 24);
        canvas.fillStyle = '#aaa'; canvas.font = '10px Courier New';
        if ('probability' in tile) canvas.fillText(`${Math.round(opacity * 100)}%`, x * tileSize + 24, y * tileSize + 24);
        if (tile.constraint) canvas.fillText(JSON.stringify(tile.constraint), x * tileSize + 2, y * tileSize + (tileSize - 12));
    }
}
