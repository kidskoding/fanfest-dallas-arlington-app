// Pure position arithmetic, isolated from Firestore so it is unit-testable.
const WINNER_CUTOFF = 100;

function nextPosition(currentCount) {
  const count = typeof currentCount === 'number' && currentCount >= 0 ? currentCount : 0;
  return count + 1;
}

function isWinner(position) {
  return position >= 1 && position <= WINNER_CUTOFF;
}

module.exports = { nextPosition, isWinner, WINNER_CUTOFF };
