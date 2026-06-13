const assert = require('node:assert');
const { resolveEnv } = require('../src/envCore.js');

// Default behavior follows __DEV__.
assert.deepStrictEqual(
  resolveEnv({ forceEnv: undefined, isDev: true }),
  { isDev: true, label: 'dev', suffix: '_dev' },
  'dev bundler flag -> sandbox'
);
assert.deepStrictEqual(
  resolveEnv({ forceEnv: undefined, isDev: false }),
  { isDev: false, label: 'prod', suffix: '' },
  'prod bundler flag -> real data'
);

// Explicit override wins over __DEV__ in both directions.
assert.strictEqual(resolveEnv({ forceEnv: 'prod', isDev: true }).suffix, '', 'force prod overrides dev flag');
assert.strictEqual(resolveEnv({ forceEnv: 'dev', isDev: false }).suffix, '_dev', 'force dev overrides prod flag');

// Unknown forceEnv value is ignored, falls back to isDev.
assert.strictEqual(resolveEnv({ forceEnv: 'staging', isDev: false }).suffix, '', 'unknown override falls back to flag');

console.log('PASS test-env');
