// World Cup 2026 fixtures relevant to the Dallas / Arlington FanFest.
// SAMPLE schedule — edit dates/teams as the real draw firms up. Times are local
// (Central). `home`/`away` use nation names from nations.js so flagFor() works;
// 'TBD' renders without a flag.
const FIXTURES = [
  { id: 'm1', date: 'Jun 14', time: '2:00 PM', stage: 'Group A', home: 'Mexico', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm2', date: 'Jun 17', time: '5:00 PM', stage: 'Group D', home: 'United States', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm3', date: 'Jun 22', time: '2:00 PM', stage: 'Group F', home: 'Brazil', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm4', date: 'Jun 25', time: '8:00 PM', stage: 'Group C', home: 'England', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm5', date: 'Jun 27', time: '5:00 PM', stage: 'Group G', home: 'Argentina', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm6', date: 'Jun 30', time: '2:00 PM', stage: 'Round of 32', home: 'TBD', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm7', date: 'Jul 6', time: '4:00 PM', stage: 'Round of 16', home: 'TBD', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
  { id: 'm8', date: 'Jul 14', time: '3:00 PM', stage: 'Semi-final', home: 'TBD', away: 'TBD', venue: 'AT&T Stadium', city: 'Arlington' },
];

module.exports = { FIXTURES };
