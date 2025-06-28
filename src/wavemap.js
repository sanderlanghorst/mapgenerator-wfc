/**
 * WaveMap class represents a grid-based map for the Wave Function Collapse algorithm.
 */
class WaveMap {
    constructor(rows, cols, chances){
        this.rows = rows;
        this.cols = cols;
        this.chances = chances || {};
        this.tiles = new Map();
    }
}