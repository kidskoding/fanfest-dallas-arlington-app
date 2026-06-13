// Live World Cup matches via ESPN's public scoreboard (unofficial, no API key).
// `mapEspnEvents` is pure (node-testable); `fetchMatches` does the network call.
// Endpoint returns the current matchday by default; pass a 'YYYYMMDD' date for a
// specific day. Team crest logos come back as URLs — no flag-emoji name matching.
const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function mapTeam(competitor) {
  const c = competitor || {};
  const team = c.team || {};
  return {
    name: team.displayName || team.name || team.shortDisplayName || 'TBD',
    abbr: team.abbreviation || '',
    score: c.score != null ? c.score : null,
    logo: team.logo || null,
    winner: !!c.winner,
  };
}

// Normalize an ESPN scoreboard payload into the shape the UI renders.
function mapEspnEvents(json) {
  const events = (json && json.events) || [];
  return events.map((e) => {
    const comp = (e.competitions && e.competitions[0]) || {};
    const competitors = comp.competitors || [];
    const byHomeAway = (ha) => competitors.find((c) => c.homeAway === ha);
    const status = e.status || comp.status || {};
    const type = status.type || {};
    const venue = comp.venue || {};
    const note = comp.notes && comp.notes[0];
    return {
      id: e.id,
      dateISO: e.date,
      state: type.state || 'pre', // 'pre' | 'in' | 'post'
      live: type.state === 'in',
      detail: type.shortDetail || type.detail || '',
      clock: status.displayClock || '',
      stage: (note && note.headline) || '', // group/round label; UI shows 'World Cup' if blank
      home: mapTeam(byHomeAway('home') || competitors[0]),
      away: mapTeam(byHomeAway('away') || competitors[1]),
      venue: venue.fullName || '',
      city: (venue.address && venue.address.city) || '',
    };
  });
}

// Fetch matches for a day or range (default: current matchday).
// `dates` accepts 'YYYYMMDD' or a range 'YYYYMMDD-YYYYMMDD'.
async function fetchMatches(dates) {
  const url = dates ? `${ESPN_SCOREBOARD}?dates=${dates}` : ESPN_SCOREBOARD;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
  return mapEspnEvents(await res.json());
}

// 'YYYYMMDD' (UTC) for a Date — the format ESPN's `dates` param expects.
function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Matches from `from` through the next `days`, sorted chronologically.
async function fetchUpcoming(days = 6, from = new Date()) {
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);
  const list = await fetchMatches(`${ymd(start)}-${ymd(end)}`);
  return list.sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
}

// Group sorted matches into per-day buckets keyed by UTC date (YYYY-MM-DD).
function groupByDay(matches) {
  const groups = [];
  const seen = {};
  for (const m of matches) {
    const key = (m.dateISO || '').slice(0, 10);
    if (!(key in seen)) {
      seen[key] = groups.length;
      groups.push({ day: key, matches: [] });
    }
    groups[seen[key]].matches.push(m);
  }
  return groups;
}

// Human label for a day bucket: 'Today' / 'Tomorrow' / 'Sat, Jun 14'.
function dayLabel(dayKey, todayKey) {
  if (todayKey && dayKey === todayKey) return 'Today';
  if (todayKey) {
    const t = new Date(`${todayKey}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    if (dayKey === t.toISOString().slice(0, 10)) return 'Tomorrow';
  }
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Kickoff time for a match, e.g. '2:00 PM'. Defaults to the viewer's local
// zone; pass a `timeZone` (IANA name) to force one.
function timeLabel(iso, timeZone) {
  const opts = { hour: 'numeric', minute: '2-digit' };
  if (timeZone) opts.timeZone = timeZone;
  return new Date(iso).toLocaleTimeString('en-US', opts);
}

module.exports = {
  ESPN_SCOREBOARD,
  mapEspnEvents,
  fetchMatches,
  fetchUpcoming,
  ymd,
  groupByDay,
  dayLabel,
  timeLabel,
};
