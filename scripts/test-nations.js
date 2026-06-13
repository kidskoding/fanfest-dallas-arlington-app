const assert = require('node:assert');
const { NATIONS } = require('../src/nations.js');

assert.ok(Array.isArray(NATIONS), 'NATIONS must be an array');
assert.strictEqual(NATIONS.length, 48, 'expected 48 nations');
assert.strictEqual(new Set(NATIONS).size, 48, 'nations must be unique');
assert.ok(NATIONS.every((n) => typeof n === 'string' && n.length > 0), 'all entries non-empty strings');
assert.deepStrictEqual([...NATIONS], [...NATIONS].sort(), 'nations must be sorted A-Z');
console.log('PASS test-nations');
