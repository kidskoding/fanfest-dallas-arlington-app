// Watch-party venues hosting FanFest crowds around Dallas / Arlington.
// SAMPLE listings — replace with real partner venues. `mapsQuery` is opened in
// Google Maps; `perk` is an optional fan deal shown as a badge.
const VENUES = [
  {
    id: 'v1',
    name: 'The Pitch Sports Bar',
    area: 'Arlington · by AT&T Stadium',
    blurb: 'Big screens, full sound on every match. Fan sections by country.',
    perk: '20% off with the app',
    mapsQuery: 'sports bar near AT&T Stadium Arlington TX',
  },
  {
    id: 'v2',
    name: 'Deep Ellum Public House',
    area: 'Deep Ellum · Dallas',
    blurb: 'Outdoor patio, 12 screens, group tables for big crews.',
    perk: 'Free appetizer for groups of 6+',
    mapsQuery: 'sports bar Deep Ellum Dallas TX',
  },
  {
    id: 'v3',
    name: 'Trinity Groves Cantina',
    area: 'West Dallas',
    blurb: 'Latin America fan HQ. Tacos, big crowd, every CONMEBOL match.',
    perk: '2-for-1 during group stage',
    mapsQuery: 'Trinity Groves Dallas TX bars',
  },
  {
    id: 'v4',
    name: 'Frisco Beer Garden',
    area: 'Frisco · North Dallas',
    blurb: 'Family-friendly, huge LED wall, kids welcome until 8pm.',
    perk: null,
    mapsQuery: 'beer garden Frisco TX',
  },
  {
    id: 'v5',
    name: 'Fort Worth Stockyards Tavern',
    area: 'Fort Worth',
    blurb: 'Texas-sized screens west of the action. Live DJ after final whistle.',
    perk: '15% off jerseys night',
    mapsQuery: 'sports bar Fort Worth Stockyards TX',
  },
];

module.exports = { VENUES };
