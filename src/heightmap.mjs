import { Random } from './random.mjs';

export function generateHeightmap(width, height, randomGenerator, layers = 4, minDepth = 0, maxDepth = 1) {
    const baseWidth = width * Math.pow(2, layers);
    const baseHeight = height * Math.pow(2, layers);
    const baseMap = Array.from({ length: baseWidth }, () => Array(baseHeight).fill(0));
    const heightmap = Array.from({ length: width }, () => Array.from({ length: height }, () => 0));
    for (let x = 0; x < baseWidth; x++) {
        for (let y = 0; y < baseHeight; y++) {
            baseMap[x][y] += randomGenerator.Next();
        }
    }
    function noise(x,y){
        return baseMap[Math.floor(x) % (baseWidth)][Math.floor(y) % (baseHeight)];
    }
    for(let layer = 0; layer < layers; layer++){
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const scale = Math.pow(2, layer);
                const nx = x / scale;
                const ny = y / scale;
                const v1 = lerp(noise(nx,ny), noise(nx+1, ny), nx-Math.floor(nx));
                const v2 = lerp(noise(nx,ny+1), noise(nx+1, ny+1), nx-Math.floor(nx));
                heightmap[x][y] += scale*lerp(v1, v2, ny-Math.floor(ny));
            }
        }
    }
    const maxPossibleValue = heightmap.reduce((a, b) => Math.max(a, b.reduce((aa,bb) => Math.max(aa,bb), 0)), 0);
    const minPossibleValue = 0;
    const exegeration = (randomGenerator.Next() * 4) + 0.5;
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            heightmap[x][y] = ((heightmap[x][y] - minPossibleValue) / (maxPossibleValue - minPossibleValue)) * (maxDepth - minDepth) + minDepth;
            heightmap[x][y] = Math.pow(heightmap[x][y], exegeration);
        }
    }
    return heightmap;
}
export function lerp(a,b,t){ return a + (b-a)*t; }
export function SmoothStep(n){ return 6*Math.pow(n,5) - 15*Math.pow(n,4) + 10*Math.pow(n,3); }
