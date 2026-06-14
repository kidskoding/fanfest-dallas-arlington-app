// Pure intro-line builder for the community feed. No platform/Firestore deps so
// it stays node-testable (see scripts/test-feed.js). Example:
// "Hi, I'm Jordan, rooting for Mexico, looking to find a watch party. <goal>"
function buildIntro({ firstName, country, team, lookingType, lookingGoal } = {}) {
  const name = (firstName || '').trim() || 'A fan';
  const parts = [`Hi, I'm ${name}`];
  if (team) parts.push(`rooting for ${team}`);
  else if (country) parts.push(`repping ${country}`);
  if (lookingType) parts.push(`looking to ${lookingType.toLowerCase()}`);
  let line = `${parts.join(', ')}.`;
  const goal = (lookingGoal || '').trim();
  if (goal) line += ` ${goal}`;
  return line;
}

module.exports = { buildIntro };
