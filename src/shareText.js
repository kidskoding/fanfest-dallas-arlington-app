// Pure share-caption builder, isolated from react-native so it is node-testable.
// No side effects, no platform APIs — just string construction.
function buildShareText({ name, position }) {
  const trimmed = (name || '').trim();
  const who = trimmed ? `${trimmed} just joined` : 'I just joined';
  const num = position ? ` as fan #${position}` : '';
  return `${who} FanFest${num} — the fan community for the FIFA World Cup 2026. Come connect with fans:`;
}

module.exports = { buildShareText };
