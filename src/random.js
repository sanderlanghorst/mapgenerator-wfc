/**
 * murmurhash3 function to generate a seed based on a string
 * @param {string} string the seed string to hash
 * @returns {Function} a method that hashes string
 * @memberof Random
 */
function MurmurHash3(string) {
    let i = 0;
    for (i, hash = 1779033703 ^ string.length; i < string.length; i++) {
        let bitwise_xor_from_character = hash ^ string.charCodeAt(i);
        hash = Math.imul(bitwise_xor_from_character, 3432918353);
        hash = hash << 13 | hash >>> 19;
    }
    return () => {
        // Return the hash that you can use as a seed
        hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
        hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
        return (hash ^= hash >>> 16) >>> 0;
    }
}

/**
 * Random number generator class using SFC32 algorithm
 */
class Random {
    /**
     * 
     * @param {Number} seed The seed for the random number generator
     */
    constructor(seed) {
        this.seed = seed;
        this.genSeed = MurmurHash3(seed);
        this.a = this.genSeed();
        this.b = this.genSeed();
        this.c = this.genSeed();
        this.d = this.genSeed();
    }

    /**
     * gets the next SFC32 random number
     * @returns {Number} A random number between 0 and 1
     */
    Next() {
        this.a >>>= 0;
        this.b >>>= 0;
        this.c >>>= 0;
        this.d >>>= 0;
        let cast32 = (this.a + this.b) | 0;
        this.a = this.b ^ this.b >>> 9;
        this.b = this.c + (this.c << 3) | 0;
        this.c = (this.c << 21 | this.c >>> 11);
        this.d = this.d + 1 | 0;
        cast32 = cast32 + this.d | 0;
        this.c = this.c + cast32 | 0;
        return (cast32 >>> 0) / 4294967296;
    }
}