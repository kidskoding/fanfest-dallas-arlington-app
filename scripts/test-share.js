const assert = require('node:assert');
const { buildShareText } = require('../src/shareText.js');

// Winner, named, with team flag.
const won = buildShareText({ name: 'Will', position: 12, team: 'Japan', won: true });
assert.ok(won.includes('Will is'), 'uses name as subject');
assert.ok(won.includes('#12'), 'includes position');
assert.ok(won.includes('🇯🇵'), 'includes team flag');
assert.ok(won.includes('won'), 'winner copy mentions winning');

// Non-winner, anonymous, no team.
const lost = buildShareText({ name: '', position: 240, team: '', won: false });
assert.ok(lost.startsWith("⚽ I'm #240"), 'anonymous falls back to "I\'m" + position');
assert.ok(!lost.includes('won'), 'non-winner copy does not claim a win');

// Name with surrounding whitespace is trimmed.
const trimmed = buildShareText({ name: '  Ana  ', position: 5, team: 'Brazil', won: true });
assert.ok(trimmed.includes('Ana is'), 'trims whitespace from name');
assert.ok(trimmed.includes('🇧🇷'), 'brazil flag present');

console.log('PASS test-share');
