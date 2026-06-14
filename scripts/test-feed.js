const assert = require('node:assert');
const { buildIntro } = require('../src/intro.js');

// Full intro: name + team + lookingType + goal.
assert.strictEqual(
  buildIntro({ firstName: 'Jordan', country: 'Mexico', team: 'Mexico', lookingType: 'Find a watch party', lookingGoal: 'Need a crew for the final!' }),
  "Hi, I'm Jordan, rooting for Mexico, looking to find a watch party. Need a crew for the final!"
);

// No team -> falls back to country ("repping").
assert.strictEqual(
  buildIntro({ firstName: 'Amara', country: 'Nigeria', lookingType: 'Make new friends' }),
  "Hi, I'm Amara, repping Nigeria, looking to make new friends."
);

// Name only.
assert.strictEqual(buildIntro({ firstName: 'Sam' }), "Hi, I'm Sam.");

// Missing name -> generic fallback, never throws on empty input.
assert.strictEqual(buildIntro({}), "Hi, I'm A fan.");
assert.strictEqual(buildIntro(), "Hi, I'm A fan.");

// Team wins over country when both present.
assert.ok(
  buildIntro({ firstName: 'Lee', country: 'Canada', team: 'Brazil' }).includes('rooting for Brazil')
);

console.log('PASS test-feed');
