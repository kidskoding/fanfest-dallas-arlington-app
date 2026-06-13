import { Platform } from 'react-native';
import { buildShareText } from './shareText';

// Public URL fans land on when they tap a shared link.
const SHARE_URL =
  process.env.EXPO_PUBLIC_SHARE_URL || 'https://fanfest-app.web.app';

const isWeb = Platform.OS === 'web' && typeof navigator !== 'undefined';

// Share the fan's rank via the native Web Share sheet, falling back to clipboard.
// Returns a status string the UI can surface: 'shared' | 'copied' | 'cancelled'
// | 'unsupported'.
export async function shareRank({ name, position, team, won }) {
  const text = buildShareText({ name, position, team, won });

  if (isWeb && navigator.share) {
    try {
      await navigator.share({ title: 'FIFA FanFest 2026 ⚽', text, url: SHARE_URL });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // fall through to clipboard on any other share failure
    }
  }

  if (isWeb && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${text} ${SHARE_URL}`);
      return 'copied';
    } catch (e) {
      // ignore — report unsupported below
    }
  }

  return 'unsupported';
}
