const assert = require('node:assert');
const { buildShareText } = require('../src/shareText.js');

// Named fan.
const a = buildShareText({ name: 'Will', position: 12 });
assert.ok(a.includes('Will just joined'), 'uses name as subject');
assert.ok(a.includes('#12'), 'includes fan number');
assert.ok(a.toLowerCase().includes('community'), 'frames it as a community');
assert.ok(!a.toLowerCase().includes('prize'), 'no prize/giveaway language');
assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(a), 'no emoji in caption');

// Anonymous fan.
const anon = buildShareText({ name: '', position: 240 });
assert.ok(anon.startsWith('I just joined'), 'anonymous falls back to "I just joined"');
assert.ok(anon.includes('#240'), 'includes fan number');

// Whitespace in name is trimmed.
const t = buildShareText({ name: '  Ana  ', position: 5 });
assert.ok(t.includes('Ana just joined'), 'trims whitespace from name');

console.log('PASS test-share');
