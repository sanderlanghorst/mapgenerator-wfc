import assert from 'assert';
import { Random } from '../src/random.mjs';

describe('random (esm)', () => {
  it('is deterministic for same seed', () => {
    const r1 = new Random('seed1');
    const seq1 = Array.from({length:5}, ()=>r1.Next());
    const r2 = new Random('seed1');
    const seq2 = Array.from({length:5}, ()=>r2.Next());
    assert.deepStrictEqual(seq1, seq2);
  });
});
