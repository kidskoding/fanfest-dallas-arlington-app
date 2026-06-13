const assert = require('node:assert');
const { mapEspnEvents, ymd, groupByDay, dayLabel, timeLabel } = require('../src/matches.js');

// Trimmed ESPN scoreboard payload: one in-progress + one scheduled match.
const SAMPLE = {
  events: [
    {
      id: '401',
      date: '2026-06-13T18:00Z',
      name: 'Switzerland vs Qatar',
      status: { displayClock: "31'", type: { state: 'in', shortDetail: "31'" } },
      competitions: [
        {
          notes: [{ headline: 'Group A' }],
          venue: { fullName: 'AT&T Stadium', address: { city: 'Arlington' } },
          competitors: [
            { homeAway: 'home', score: '1', winner: false, team: { displayName: 'Switzerland', abbreviation: 'SUI', logo: 'https://x/sui.png' } },
            { homeAway: 'away', score: '0', winner: false, team: { displayName: 'Qatar', abbreviation: 'QAT', logo: 'https://x/qat.png' } },
          ],
        },
      ],
    },
    {
      id: '402',
      date: '2026-06-13T21:00Z',
      name: 'Morocco vs Brazil',
      status: { displayClock: '0:00', type: { state: 'pre', shortDetail: '6/13 - 4:00 PM EDT' } },
      competitions: [
        {
          venue: { fullName: 'MetLife Stadium', address: { city: 'East Rutherford' } },
          competitors: [
            { homeAway: 'home', team: { displayName: 'Morocco', abbreviation: 'MAR', logo: 'https://x/mar.png' } },
            { homeAway: 'away', team: { displayName: 'Brazil', abbreviation: 'BRA', logo: 'https://x/bra.png' } },
          ],
        },
      ],
    },
  ],
};

const out = mapEspnEvents(SAMPLE);
assert.strictEqual(out.length, 2, 'maps every event');

const [live, upcoming] = out;
assert.strictEqual(live.state, 'in');
assert.strictEqual(live.live, true);
assert.strictEqual(live.home.name, 'Switzerland');
assert.strictEqual(live.home.score, '1');
assert.strictEqual(live.away.name, 'Qatar');
assert.strictEqual(live.clock, "31'");
assert.strictEqual(live.stage, 'Group A');
assert.strictEqual(live.venue, 'AT&T Stadium');
assert.strictEqual(live.city, 'Arlington');
assert.strictEqual(live.home.logo, 'https://x/sui.png');

assert.strictEqual(upcoming.state, 'pre');
assert.strictEqual(upcoming.live, false);
assert.strictEqual(upcoming.home.score, null, 'no score before kickoff');
assert.strictEqual(upcoming.stage, '', 'blank stage when no group note (UI shows World Cup)');

// Empty / malformed payloads must not throw.
assert.deepStrictEqual(mapEspnEvents({}), []);
assert.deepStrictEqual(mapEspnEvents(null), []);

// ymd — UTC date in ESPN's expected format.
assert.strictEqual(ymd(new Date('2026-06-14T05:00:00Z')), '20260614');

// groupByDay — buckets per UTC day, preserving order.
const groups = groupByDay(out);
assert.strictEqual(groups.length, 1, 'both sample matches are the same UTC day');
assert.strictEqual(groups[0].day, '2026-06-13');
assert.strictEqual(groups[0].matches.length, 2);
const twoDays = groupByDay([{ dateISO: '2026-06-14T00:00Z' }, { dateISO: '2026-06-15T00:00Z' }]);
assert.strictEqual(twoDays.length, 2, 'distinct days split into separate groups');

// dayLabel — relative names, else weekday/month/day.
assert.strictEqual(dayLabel('2026-06-13', '2026-06-13'), 'Today');
assert.strictEqual(dayLabel('2026-06-14', '2026-06-13'), 'Tomorrow');
assert.strictEqual(dayLabel('2026-06-20', '2026-06-13'), 'Sat, Jun 20');

// timeLabel — kickoff time in a forced zone (18:00Z = 1:00 PM Central).
assert.strictEqual(timeLabel('2026-06-13T18:00:00Z', 'America/Chicago'), '1:00 PM');
assert.strictEqual(timeLabel('2026-06-14T00:30:00Z', 'America/Chicago'), '7:30 PM');

console.log('PASS test-matches');
