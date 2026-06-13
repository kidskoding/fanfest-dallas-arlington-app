import { Platform } from 'react-native';

// Web-only celebration effects. No-op on native (deployed target is web) and
// fully feature-detected so a missing API never throws.
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Short haptic buzz on supported mobile browsers. `pattern` is a ms number or
// an array per the Vibration API.
export function buzz(pattern) {
  if (!isWeb) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    /* ignore */
  }
}

// A quick rising 4-note fanfare synthesized via Web Audio — no asset needed.
// Must be called from within a user gesture (it is: the submit tap) so browser
// autoplay policy allows it.
export function playWinSound() {
  if (!isWeb) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
    setTimeout(() => ctx.close && ctx.close(), 1400);
  } catch (e) {
    /* ignore */
  }
}
