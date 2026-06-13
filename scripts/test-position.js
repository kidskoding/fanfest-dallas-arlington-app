const assert = require('node:assert');
const { nextPosition } = require('../src/position.js');

assert.strictEqual(nextPosition(undefined), 1, 'missing counter -> position 1');
assert.strictEqual(nextPosition(0), 1, 'count 0 -> position 1');
assert.strictEqual(nextPosition(99), 100, 'count 99 -> position 100');
assert.strictEqual(nextPosition(100), 101, 'count 100 -> position 101');
console.log('PASS test-position');
