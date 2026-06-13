// Pure position arithmetic, isolated from Firestore so it is unit-testable.
// `position` is a fan's 1-based join order (the Nth fan to sign up).
function nextPosition(currentCount) {
  const count = typeof currentCount === 'number' && currentCount >= 0 ? currentCount : 0;
  return count + 1;
}

module.exports = { nextPosition };
