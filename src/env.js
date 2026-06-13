// Resolved environment for the running app. Wires the platform globals
// (__DEV__, EXPO_PUBLIC_ENV) into the pure resolver in envCore.
//
// - `expo start`        -> __DEV__ true  -> isDev, suffix '_dev'  (sandbox)
// - `expo export` build -> __DEV__ false -> prod,  suffix ''      (real event data)
// - EXPO_PUBLIC_ENV=dev|prod forces either, regardless of __DEV__.
const { resolveEnv } = require('./envCore');

const isDevGlobal = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
const env = resolveEnv({ forceEnv: process.env.EXPO_PUBLIC_ENV, isDev: isDevGlobal });

module.exports = env; // { isDev, label, suffix }
