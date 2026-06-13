// Pure environment resolver, isolated from platform globals so it is node-testable.
// Decides whether the app is in dev (sandbox) or prod (real event data) and what
// Firestore collection suffix to use.
//
// Precedence: an explicit EXPO_PUBLIC_ENV override wins; otherwise fall back to the
// bundler's __DEV__ flag (true under `expo start`, false in a production export).
function resolveEnv({ forceEnv, isDev }) {
  let dev;
  if (forceEnv === 'dev') dev = true;
  else if (forceEnv === 'prod') dev = false;
  else dev = !!isDev;

  return {
    isDev: dev,
    label: dev ? 'dev' : 'prod',
    // Appended to collection names: '_dev' sandbox vs '' real event data.
    suffix: dev ? '_dev' : '',
  };
}

module.exports = { resolveEnv };
