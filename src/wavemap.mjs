import { Directions, Opposites } from './constants.mjs';

function WeightedRandom(items, probabilities, temperature = 1, rng) {
    if (temperature <= 0) throw new Error('Temperature must be greater than 0');
    const filtered = items.map((item, idx) => ({ item, prob: probabilities[idx] })).filter(({ prob }) => prob > 0);
    if (!filtered.length) throw new Error('No items with non-zero probability to select from.');
    const filteredItems = filtered.map(f => f.item);
    const filteredProbabilities = filtered.map(f => f.prob);
    const adjusted = filteredProbabilities.map(p => Math.pow(p, 1 / temperature));
    const total = adjusted.reduce((s,p)=>s+p,0);
    const norm = adjusted.map(p => p/total);
    const r = rng.Next();
    let c = 0; for (let i=0;i<filteredItems.length;i++){ c+=norm[i]; if(r<c) return filteredItems[i]; }
}

function Normalize(map) {
    let total = 0; for (const v of map.values()) total += v;
    if (total > 0) { for (const [k,v] of map) { map.set(k, v/total); } }
}

function UpdateProbabilities(x, y) {
    const thisMap = this.wave[x][y];
    if (thisMap.size == 1 && thisMap.values().next().value == 1) return false;
    const neighbors = [ this.wave[x]?.[y-1], this.wave[x+1]?.[y], this.wave[x]?.[y+1], this.wave[x-1]?.[y] ];
    const mappedNeighbors = neighbors.map((n,i)=>({m:n,dir:Opposites[Directions[i]]})).filter(n=>n?.m!==undefined);
    const height = this.heightmap[x][y];
    const snapshot = JSON.stringify(Array.from(thisMap));
    const neighborChances = new Map();
    for (const { m, dir } of mappedNeighbors) {
        const sub = new Map();
        for (const [n] of m) {
            const chances = this.chances.get(n)[dir];
            for (const [cTileId, chance] of chances) {
                let tileChance = sub.get(cTileId) || { number:0, totalChance:0 };
                const tile = this.tiles.get(cTileId);
                if (tile.minHeight > height || tile.maxHeight < height) continue;
                tileChance.number++; tileChance.totalChance += chance; sub.set(cTileId, tileChance);
            }
        }
        for (const [tId, tileChance] of sub) {
            if (!neighborChances.has(tId)) neighborChances.set(tId, { number:0, totalChance:0 });
            const existing = neighborChances.get(tId);
            existing.number += 1;
            existing.totalChance += (tileChance.totalChance / tileChance.number);
        }
    }
    thisMap.clear();
    for (const [tId, tileChance] of neighborChances) {
        tileChance.totalChance = tileChance.totalChance / tileChance.number;
        if (tileChance.totalChance > 0 && tileChance.number >= mappedNeighbors.length) {
            thisMap.set(tId, tileChance.totalChance);
        }
    }
    Normalize(thisMap);
    return JSON.stringify(Array.from(thisMap)) !== snapshot;
}

function PropagateProbabilities(x,y){
    const max = 20; const stack = [[x,y,max]];
    while(stack.length){
        const [cx,cy,cmax] = stack.pop(); if(cmax<=0) continue;
        for (const [nx,ny] of [[cx,cy-1],[cx+1,cy],[cx,cy+1],[cx-1,cy]]){
            if (nx<0||nx>=this.cols||ny<0||ny>=this.rows) continue;
            if (UpdateProbabilities.call(this,nx,ny)) stack.push([nx,ny,cmax-1]);
        }
    }
}

export class WaveMap {
    constructor(rows, cols, tiles, chances, heightmap, random) {
        this.rows = rows; this.cols = cols; this.chances = chances; this.heightmap = heightmap; this.random = random; this.tiles = tiles;
        this.wave = Array.from({ length: cols }, () => Array.from({ length: rows }, () => new Map()));
        for (let x=0;x<cols;x++) for (let y=0;y<rows;y++) {
            for (const [tileId] of chances) {
                const tile = this.tiles.get(tileId); const height = this.heightmap[x][y];
                this.wave[x][y].set(tileId, (tile.minHeight>height||tile.maxHeight<height)?0:1);
            }
            Normalize(this.wave[x][y]);
        }
    }
    Fix(x,y,tileId){
        if(x<0||x>=this.cols||y<0||y>=this.rows) throw new Error('Out of bounds');
        if(!this.chances.has(tileId)) throw new Error('Tile ID missing in chances');
        this.wave[x][y] = new Map([[tileId,1]]); PropagateProbabilities.call(this,x,y);
    }
    GetChances(x,y){ if(x<0||x>=this.cols||y<0||y>=this.rows) throw new Error('Out of bounds'); return this.wave[x][y]; }
    GetMostCertain(){ let least={size:Number.MAX_SAFE_INTEGER};
        for(let x=0;x<this.wave.length;x++) for(let y=0;y<this.wave[x].length;y++){
            if(this.wave[x][y].size==1 && this.wave[x][y].values().next().value==1) continue;
            if(this.wave[x][y].size>1 && least.size>this.wave[x][y].size){ least={x,y,size:this.wave[x][y].size}; }
        }
        return least.size===Number.MAX_SAFE_INTEGER?null:least;
    }
    Pick(x,y){
        if(x<0||x>=this.cols||y<0||y>=this.rows) throw new Error('Out of bounds');
        if(!this.wave[x][y].size>1) throw new Error('No choices to pick from');
        const chances = this.GetChances(x,y);
        const chosen = WeightedRandom(
            Array.from(chances.keys()),
            Array.from(chances.values()),
            0.8 + this.random.Next()*0.4,
            this.random
        );
        this.wave[x][y] = new Map([[chosen,1]]); PropagateProbabilities.call(this,x,y);
    }
}
