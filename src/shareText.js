// Pure share-caption builder, isolated from react-native so it is node-testable.
// No side effects, no platform APIs — just string construction.
const { flagFor } = require('./flags');

function buildShareText({ name, position, team, won }) {
  const trimmed = (name || '').trim();
  const subject = trimmed ? `${trimmed} is` : "I'm";
  const flag = team ? `${flagFor(team)} ` : '';
  if (won) {
    return `🏆 ${subject} #${position} at FIFA FanFest 2026 — and won one of the prizes! ${flag}Think you can beat that rank?`;
  }
  return `⚽ ${subject} #${position} at FIFA FanFest 2026! ${flag}Sign up faster than me for a shot at the prizes.`;
}

module.exports = { buildShareText };
