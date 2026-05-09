import { Directions } from './constants.mjs';
import { Random } from './random.mjs';
import { GenerateTiles, GenerateChancesFromTiles } from './generation.mjs';
import { generateHeightmap } from './heightmap.mjs';
import { WaveMap } from './wavemap.mjs';
import { Tiles, Colors } from './tiles.mjs';

const debug = {
    master: false,
    ids: false,
    probs: false,
    grid: false,
    heights: false,
    adjacency: false,
    hover: false,
};

// Tile and canvas size parameters
const tileSize = 20; // pixels per tile
const mapCols = 20;
const mapRows = 14;
const stepSize = 1;

let random;

// Lazy render flag for adjacency canvas (runs at most once)
let adjacencyRendered = false;

/**
 * Render the adjacency canvas showing tile neighbors by direction
 * @param {object} context
 * @param {CanvasRenderingContext2D} debugCtx
 * @param {HTMLCanvasElement} debugCanvas
 */
function RenderAdjacencyCanvas(context, debugCtx, debugCanvas) {
    if (adjacencyRendered) return;
    debugCanvas.width = context.tiles.size * context.tileSize;
    debugCanvas.height = context.tiles.size * context.tileSize * 4;
    for (const [tid, tile] of context.tiles) {
        DrawTile(debugCtx, tile, 0, tid * 4, context.tileSize);
        for (let di = 0; di < Directions.length; di++) {
            const chances = context.Chances.get(tid)[Directions[di]];
            debugCtx.fillStyle = '#444';
            debugCtx.font = '12px Courier New';
            debugCtx.fillText(Directions[di], context.tileSize, context.tileSize / 2 + (tid * 4 + di) * context.tileSize);
            let offset = 0;
            for (const [cTileId] of chances) {
                DrawTile(debugCtx, context.tiles.get(cTileId), offset + 2, tid * 4 + di, context.tileSize);
                offset++;
            }
        }
    }
    adjacencyRendered = true;
}

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
    const debugDiv = document.getElementById('debugDiv');

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

    const debugMaster = document.getElementById('debugMaster');
    if (debugMaster) {
        debugMaster.addEventListener('change', () => {
            debug.master = debugMaster.checked;
            if (debugDiv) debugDiv.style.display = debug.master ? 'block' : 'none';
            Draw(context);
        });
    }

    function bindToggle(id, key, onChange) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            debug[key] = el.checked;
            if (onChange) onChange(el.checked);
            Draw(context);
        });
    }

    bindToggle('dbg-ids', 'ids');
    bindToggle('dbg-probs', 'probs');
    bindToggle('dbg-grid', 'grid');
    bindToggle('dbg-heights', 'heights', (on) => {
        const hc = document.getElementById('heightCanvas');
        if (hc) hc.style.display = on ? 'block' : 'none';
    });
    bindToggle('dbg-hover', 'hover', (on) => {
        const panel = document.getElementById('infoPanel');
        if (panel) panel.style.display = on ? 'block' : 'none';
        if (!on) ClearInfoPanel();
    });
    bindToggle('dbg-adjacency', 'adjacency', (on) => {
        const dc = document.getElementById('debugCanvas');
        if (!dc) return;
        if (on && debugCtx) RenderAdjacencyCanvas(context, debugCtx, dc);
        dc.style.display = on ? 'block' : 'none';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!debug.master || !debug.hover) return;
        const rect = canvas.getBoundingClientRect();
        const cx = Math.floor((e.clientX - rect.left) / context.tileSize);
        const cy = Math.floor((e.clientY - rect.top) / context.tileSize);
        RenderInfoPanel(context, cx, cy);
    });
    canvas.addEventListener('mouseleave', () => {
        if (!debug.master || !debug.hover) return;
        ClearInfoPanel();
    });

    function Reset() {
        iterations = Math.floor((mapCols * mapRows) / stepSize);
        const seedInput = document.getElementById('seed');
        const seed = seedInput ? seedInput.value : undefined;
        random = new Random(seed);
        Set([{ x: centerX, y: centerY, tile: undefined }]);
    }

    context.tiles = GenerateTiles(Tiles);
    context.Chances = GenerateChancesFromTiles(context.tiles);
    Reset();

    const colorLegend = document.getElementById('colorLegend');
    if (colorLegend) {
        const colorKeys = Object.keys(Colors || {});
        for (let i = 0; i < colorKeys.length; i++) {
            const d = document.createElement('span');
            d.style.background = Colors[colorKeys[i]];
            d.innerHTML = colorKeys[i].replace(' ', '&nbsp;') + ' ';
            colorLegend.appendChild(d);
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
        ClearInfoPanel();
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
            if (debug.master) {
                const topTile = context.tiles.get(t[0][0]);
                if (topTile) DrawDebugOverlay(context.canvas, x, y, topTile, t[0][1], context.tileSize);
            }
        }
    }
    if (debug.master && debug.heights) DrawHeightCanvas(context);
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
}

function DrawDebugOverlay(canvas, x, y, tile, probability, tileSize) {
    if (debug.grid) {
        canvas.strokeStyle = '#fff';
        canvas.lineWidth = 1;
        canvas.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
    if (debug.ids) {
        canvas.fillStyle = '#444';
        canvas.font = '12px Courier New';
        canvas.fillText(`${x},${y}`, x * tileSize + 2, y * tileSize + 12);
        canvas.fillText(tile.id, x * tileSize + 2, y * tileSize + 24);
    }
    if (debug.probs) {
        canvas.fillStyle = '#aaa';
        canvas.font = '10px Courier New';
        canvas.fillText(`${Math.round(probability * 100)}%`, x * tileSize + 24, y * tileSize + 24);
    }
}

function DrawHeightCanvas(context) {
    const heightCanvas = document.getElementById('heightCanvas');
    if (!heightCanvas || !context.tileMap) return;
    const ctx = heightCanvas.getContext('2d');
    if (!ctx) return;
    heightCanvas.width = context.mapCols * context.tileSize;
    heightCanvas.height = context.mapRows * context.tileSize;
    for (let x = 0; x < context.mapCols; x++) {
        for (let y = 0; y < context.mapRows; y++) {
            const h = context.tileMap.heightmap[x][y];
            const v = Math.round(h * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x * context.tileSize, y * context.tileSize, context.tileSize, context.tileSize);
        }
    }
}

function RenderInfoPanel(context, x, y) {
    const panel = document.getElementById('infoPanel');
    if (!panel) return;
    if (!context.tileMap || x < 0 || y < 0 || x >= context.mapCols || y >= context.mapRows) {
        panel.textContent = 'hover a cell';
        return;
    }
    const wave = context.tileMap.GetChances(x, y);
    const height = context.tileMap.heightmap[x][y];
    const lines = [];
    lines.push(`cell  : ${x},${y}`);
    lines.push(`height: ${height.toFixed(3)}`);
    if (!wave || wave.size === 0) {
        lines.push('candidates: (none)');
    } else {
        const sorted = Array.from(wave).sort(([, av], [, bv]) => bv - av);
        lines.push(`candidates (${sorted.length}):`);
        for (const [tid, p] of sorted) {
            lines.push(`  ${String(tid).padStart(3)}  ${(p * 100).toFixed(1).padStart(5)}%`);
        }
        const topTile = context.tiles.get(sorted[0][0]);
        if (topTile && topTile.constraint) {
            lines.push('top constraint:');
            lines.push('  ' + JSON.stringify(topTile.constraint, null, 2).replace(/\n/g, '\n  '));
        }
    }
    panel.textContent = lines.join('\n');
}

function ClearInfoPanel() {
    const panel = document.getElementById('infoPanel');
    if (panel) panel.textContent = 'hover a cell';
}
