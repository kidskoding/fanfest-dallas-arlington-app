import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { NATIONS } from './src/nations';
import { flagFor } from './src/flags';
import { LOOKING_TYPES } from './src/lookingTypes';
import { FIXTURES } from './src/fixtures';
import { VENUES } from './src/venues';
import { fetchUpcoming, groupByDay, dayLabel, timeLabel } from './src/matches';
import { submitSignup, subscribeToCount, subscribeToFans } from './src/signup';
import { shareRank } from './src/share';
import { buzz, playWinSound } from './src/celebrate';
import env from './src/env';

// Make flag emoji render on platforms (web/Windows) that lack them natively.
if (Platform.OS === 'web') polyfillCountryFlagEmojis();

const WHATSAPP_GROUP_URL =
  process.env.EXPO_PUBLIC_WHATSAPP_GROUP_URL ||
  'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE';

// Tubi streams the World Cup for free. Points at the tournament series page;
// override per-deploy with EXPO_PUBLIC_TUBI_URL if a better deep link appears.
const TUBI_URL =
  process.env.EXPO_PUBLIC_TUBI_URL ||
  'https://tubitv.com/series/300021054/fifa-world-cup-2026';

// Display-only social-proof seed added to the live "fans joined" ticker. Does
// not touch the real signup counter. Only applied in prod.
const TICKER_SEED = env.isDev ? 0 : Number(process.env.EXPO_PUBLIC_TICKER_SEED) || 0;

// Design tokens — one accent, restrained neutrals.
const C = {
  paper: '#FFFFFF',
  ink: '#0A0A0A',
  sub: '#6B7280',
  faint: '#9CA3AF',
  line: '#E5E7EB',
  lineFocus: '#0A0A0A',
  accent: '#059669',
  accentSoft: '#ECFDF5',
  hero: '#0A0A0A',
  heroText: '#FFFFFF',
  heroSub: '#A1A1AA',
  heroLine: '#27272A',
  whatsapp: '#1FAF5A',
  warn: '#DC2626',
};

// Flag glyphs use the polyfill font on web so they render everywhere.
const FLAG_FONT =
  Platform.OS === 'web'
    ? { fontFamily: '"Twemoji Country Flags", system-ui, -apple-system, sans-serif' }
    : null;

const openMaps = (q) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
function PressableScale({ children, style, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: false, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPressIn={() => !disabled && to(0.98)}
      onPressOut={() => to(1)}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function AnimatedCount({ value, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = anim.addListener((v) => setDisplay(Math.round(v.value)));
    Animated.timing(anim, {
      toValue: value,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);
  return <Text style={style}>#{display.toLocaleString()}</Text>;
}

// Geometric confetti — small colored bars, not emoji.
const CONFETTI_COLORS = ['#059669', '#34D399', '#FACC15', '#60A5FA', '#FFFFFF'];
function Confetti({ count = 36 }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: Math.random() * width,
        delay: Math.random() * 500,
        duration: 2400 + Math.random() * 1600,
        w: 5 + Math.random() * 4,
        h: 10 + Math.random() * 8,
        fall: new Animated.Value(0),
      })),
    [width, count]
  );
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.fall, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Animated.View
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            width: p.w,
            height: p.h,
            borderRadius: 1.5,
            backgroundColor: p.color,
            opacity: p.fall.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.fall.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] }) },
              { rotate: p.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '420deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function Flag({ nation, style }) {
  if (!nation) return null;
  return <Text style={[styles.flag, style]}>{flagFor(nation)}</Text>;
}

function TextField({ label, optional, value, onChangeText, placeholder, maxLength, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && <Text style={styles.optional}>Optional</Text>}
      </View>
      <TextInput
        style={[styles.input, focused && styles.inputFocus]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

function SelectField({ label, optional, value, options, onSelect, placeholder, searchable, leading }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [q, options]);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && <Text style={styles.optional}>Optional</Text>}
      </View>
      <Pressable style={[styles.input, styles.selectRow, open && styles.inputFocus]} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.inputText : styles.placeholder} numberOfLines={1}>
          {value ? `${leading ? leading(value) + '  ' : ''}${value}` : placeholder}
        </Text>
        <Text style={[styles.chevron, open && styles.chevronOpen]}>⌄</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdown}>
          {searchable && (
            <TextInput
              style={styles.search}
              value={q}
              onChangeText={setQ}
              placeholder="Search"
              placeholderTextColor={C.faint}
              autoFocus
            />
          )}
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((opt) => (
              <Pressable
                key={opt}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => {
                  onSelect(opt);
                  setQ('');
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText} numberOfLines={1}>
                  {leading ? `${leading(opt)}  ` : ''}
                  {opt}
                </Text>
              </Pressable>
            ))}
            {filtered.length === 0 && <Text style={styles.noMatch}>No matches</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function EnvBadge() {
  if (!env.isDev && !env.isLocalBuild) return null;
  const danger = env.isLocalBuild && !env.isDev;
  return (
    <View style={[styles.envBadge, danger && styles.envBadgeDanger]} pointerEvents="none">
      <View style={[styles.envDot, { backgroundColor: danger ? C.warn : C.accent }]} />
      <Text style={styles.envText}>{danger ? 'LOCAL · writing to production data' : 'DEV · sandbox data'}</Text>
    </View>
  );
}

// Live count with a pulsing status dot.
function LiveCount() {
  const [count, setCount] = useState(null);
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => subscribeToCount(setCount), []);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  if (count == null) return null;
  const total = count + TICKER_SEED;
  return (
    <View style={styles.live}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.liveText}>
        {total > 0 ? `${total.toLocaleString()} ${total === 1 ? 'fan' : 'fans'} joined` : 'Be the first to join'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Join screen — signup form + welcome result
// ---------------------------------------------------------------------------
function JoinScreen({ onJoined, onExplore }) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [team, setTeam] = useState('');
  const [lookingType, setLookingType] = useState('');
  const [lookingGoal, setLookingGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, []);
  useEffect(() => {
    if (!result) return;
    buzz([50, 30, 110]);
    playWinSound();
  }, [result]);

  const canSubmit = !!name.trim() && !!lookingType && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    buzz(15);
    setSubmitting(true);
    setError('');
    try {
      const r = await submitSignup({ name, country, team, lookingType, lookingGoal });
      setResult(r);
      onJoined({ ...r, country, team });
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => Linking.openURL(WHATSAPP_GROUP_URL);
  const onShare = async () => {
    const status = await shareRank({ name, position: result?.position });
    if (status === 'copied') setToast('Link copied');
    else if (status === 'shared') setToast('Shared');
    else if (status === 'unsupported') setToast('Sharing unavailable on this device');
    if (status !== 'cancelled') setTimeout(() => setToast(''), 2400);
  };

  if (result) {
    const meta = [country, team && `${team} supporter`].filter(Boolean).join('  ·  ');
    return (
      <View style={[styles.screen, styles.heroScreen]}>
        <Confetti />
        <View style={styles.heroBody}>
          <Text style={styles.heroEyebrow}>YOU'RE IN · FAN</Text>
          <AnimatedCount value={result.position} style={styles.heroNumber} />
          <Text style={styles.heroName}>{name.trim()}</Text>
          {meta ? <Text style={styles.heroMeta}>{meta}</Text> : null}
          <Text style={styles.heroCopy}>
            Welcome to the FanFest community. Meet other fans, find a watch party, and jump into the group chat.
          </Text>
          <PressableScale style={styles.primaryOnHero} onPress={openWhatsApp}>
            <Text style={styles.primaryOnHeroText}>Join the community on WhatsApp</Text>
          </PressableScale>
          <PressableScale style={styles.secondaryOnHero} onPress={onExplore}>
            <Text style={styles.secondaryOnHeroText}>Explore the fans</Text>
          </PressableScale>
          <PressableScale style={styles.ghostOnHero} onPress={onShare}>
            <Text style={styles.ghostOnHeroText}>Invite friends</Text>
          </PressableScale>
          {toast ? <Text style={styles.toast}>{toast}</Text> : null}
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <EnvBadge />
      <Animated.View
        style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}
      >
        <Text style={styles.eyebrow}>WORLD CUP 2026</Text>
        <Text style={styles.title}>FanFest Dallas/Arlington</Text>
        <Text style={styles.subtitle}>
          The fan community for the World Cup. Sign up to connect with fans from your country and team —
          then jump into the group chat.
        </Text>

        <LiveCount />

        <View style={styles.form}>
          <TextField label="Full name" value={name} onChangeText={setName} placeholder="Jordan Smith" maxLength={100} />
          <SelectField label="Country" optional value={country} options={NATIONS} onSelect={setCountry} placeholder="Select your country" searchable leading={flagFor} />
          <SelectField label="Team you support" optional value={team} options={NATIONS} onSelect={setTeam} placeholder="Select a team" searchable leading={flagFor} />
          <SelectField label="I'm looking to" value={lookingType} options={LOOKING_TYPES} onSelect={setLookingType} placeholder="Choose one" />
          <TextField label="Your goal" optional value={lookingGoal} onChangeText={setLookingGoal} placeholder="Find Japan fans for the final" maxLength={280} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PressableScale style={[styles.primary, !canSubmit && styles.primaryDisabled]} onPress={onSubmit} disabled={!canSubmit}>
            <Text style={styles.primaryText}>{submitting ? 'Joining…' : 'Join FanFest'}</Text>
          </PressableScale>
          <Text style={styles.fineprint}>No spam — just fans.</Text>
        </View>
      </Animated.View>
      <StatusBar style="dark" />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Fans screen — public directory + intent filter
// ---------------------------------------------------------------------------
function Chip({ label, active, onPress }) {
  return (
    <PressableScale style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </PressableScale>
  );
}

function FansScreen({ me }) {
  const [fans, setFans] = useState(null);
  const [filter, setFilter] = useState('Everyone');
  useEffect(() => subscribeToFans(setFans), []);

  const topCountries = useMemo(() => {
    if (!fans) return [];
    const counts = {};
    for (const f of fans) if (f.country) counts[f.country] = (counts[f.country] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [fans]);

  const filtered = useMemo(() => {
    if (!fans) return [];
    return filter === 'Everyone' ? fans : fans.filter((f) => f.lookingType === filter);
  }, [fans, filter]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <EnvBadge />
      <Text style={styles.eyebrow}>THE COMMUNITY</Text>
      <Text style={styles.title}>The Fans</Text>
      <Text style={styles.subtitle}>
        {fans == null ? 'Loading the community…' : `${fans.length.toLocaleString()} ${fans.length === 1 ? 'fan' : 'fans'} here so far. Find your people.`}
      </Text>

      {topCountries.length > 0 && (
        <View style={styles.countryRow}>
          {topCountries.map(([nation, n]) => (
            <View key={nation} style={styles.countryStat}>
              <Flag nation={nation} style={styles.countryFlag} />
              <Text style={styles.countryCount}>{n}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {['Everyone', ...LOOKING_TYPES].map((t) => (
          <Chip key={t} label={t} active={filter === t} onPress={() => setFilter(t)} />
        ))}
      </ScrollView>

      <View style={styles.fanList}>
        {fans == null ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.muted}>No fans here yet — be the first.</Text>
        ) : (
          filtered.map((f) => {
            const isMe = me && f.position === me.position && f.firstName === me.firstName;
            return (
              <View key={f.id} style={[styles.fanRow, isMe && styles.fanRowMe]}>
                <Flag nation={f.country} style={styles.fanFlag} />
                <View style={styles.fanInfo}>
                  <Text style={styles.fanName}>
                    {f.firstName}
                    {isMe ? '  (you)' : ''}
                  </Text>
                  <Text style={styles.fanMeta} numberOfLines={1}>
                    {f.team ? `${flagFor(f.team)} ${f.team} · ` : ''}
                    {f.lookingType ? f.lookingType.toLowerCase() : ''}
                  </Text>
                </View>
                <Text style={styles.fanNum}>#{f.position}</Text>
              </View>
            );
          })
        )}
      </View>
      <StatusBar style="dark" />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Matches screen — schedule (with Tubi) + watch-party venues
// ---------------------------------------------------------------------------
// One team's crest + name. `align="right"` mirrors it for the away side.
function TeamColumn({ team, align }) {
  return (
    <View style={styles.teamCol}>
      {team.logo ? (
        <Image source={{ uri: team.logo }} style={styles.crest} resizeMode="contain" />
      ) : (
        <View style={[styles.crest, styles.crestEmpty]} />
      )}
      <Text style={[styles.teamColName, align === 'right' && { textAlign: 'right' }]} numberOfLines={1}>
        {team.name}
      </Text>
    </View>
  );
}

// Live/scheduled match card driven by the ESPN feed.
function LiveMatchCard({ m }) {
  const scored = m.state !== 'pre';
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchTop}>
        <Text style={styles.matchStage} numberOfLines={1}>{m.stage || 'World Cup'}</Text>
        {m.live ? (
          <View style={styles.livePill}>
            <View style={styles.livePillDot} />
            <Text style={styles.livePillText}>LIVE {m.clock}</Text>
          </View>
        ) : (
          <Text style={styles.matchWhen}>{m.state === 'post' ? 'Full time' : timeLabel(m.dateISO)}</Text>
        )}
      </View>
      <View style={styles.scoreRow}>
        <TeamColumn team={m.home} />
        <Text style={styles.scoreCenter}>
          {scored ? `${m.home.score ?? 0}–${m.away.score ?? 0}` : 'vs'}
        </Text>
        <TeamColumn team={m.away} align="right" />
      </View>
      {m.venue ? <Text style={styles.matchVenue}>{m.venue}{m.city ? ` · ${m.city}` : ''}</Text> : null}
      <PressableScale style={styles.tubiBtn} onPress={() => Linking.openURL(TUBI_URL)}>
        <Text style={styles.tubiBtnText}>Watch free on Tubi</Text>
      </PressableScale>
    </View>
  );
}

// Fallback card from the hardcoded sample schedule (used if the feed is down).
function FixtureCard({ m }) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.matchTop}>
        <Text style={styles.matchStage}>{m.stage}</Text>
        <Text style={styles.matchWhen}>{m.date} · {m.time}</Text>
      </View>
      <View style={styles.matchTeams}>
        <Text style={styles.matchTeam} numberOfLines={1}><Flag nation={m.home} /> {m.home}</Text>
        <Text style={styles.matchVs}>vs</Text>
        <Text style={[styles.matchTeam, styles.matchTeamRight]} numberOfLines={1}>{m.away} <Flag nation={m.away} /></Text>
      </View>
      <Text style={styles.matchVenue}>{m.venue} · {m.city}</Text>
      <PressableScale style={styles.tubiBtn} onPress={() => Linking.openURL(TUBI_URL)}>
        <Text style={styles.tubiBtnText}>Watch free on Tubi</Text>
      </PressableScale>
    </View>
  );
}

function MatchesScreen() {
  const [matches, setMatches] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [dayIndex, setDayIndex] = useState(0); // which day's page is shown

  useEffect(() => {
    let alive = true;
    fetchUpcoming(6) // today + next 6 days
      .then((list) => alive && setMatches(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const list = matches || [];
  const showFallback = failed || (matches !== null && list.length === 0);
  const groups = groupByDay(list);
  const todayKey = new Date().toISOString().slice(0, 10);

  // Open on today's page once matches arrive (fall back to the first day).
  useEffect(() => {
    if (!matches) return;
    const g = groupByDay(matches);
    const today = new Date().toISOString().slice(0, 10);
    const i = g.findIndex((x) => x.day === today);
    setDayIndex(i >= 0 ? i : 0);
  }, [matches]);

  const pageIndex = groups.length ? Math.min(dayIndex, groups.length - 1) : 0;
  const currentDay = groups[pageIndex];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <EnvBadge />
      <Text style={styles.eyebrow}>MATCHDAY</Text>
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>Live scores and the week ahead. Every match streams free on Tubi.</Text>

      <Text style={styles.sectionTitle}>{showFallback ? 'Schedule' : 'This week'}</Text>
      {matches === null && !failed ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
      ) : showFallback ? (
        <>
          <Text style={styles.muted}>Live scores unavailable right now — showing the schedule.</Text>
          {FIXTURES.map((m) => <FixtureCard key={m.id} m={m} />)}
        </>
      ) : currentDay ? (
        <>
          <View style={styles.pager}>
            <Pressable
              onPress={() => setDayIndex(pageIndex - 1)}
              disabled={pageIndex === 0}
              style={[styles.pagerBtn, pageIndex === 0 && styles.pagerBtnOff]}
            >
              <Text style={styles.pagerArrow}>‹</Text>
            </Pressable>
            <View style={styles.pagerMid}>
              <Text style={styles.pagerDay}>{dayLabel(currentDay.day, todayKey)}</Text>
              <Text style={styles.pagerCount}>
                {currentDay.matches.length} {currentDay.matches.length === 1 ? 'match' : 'matches'} · day {pageIndex + 1}/{groups.length}
              </Text>
            </View>
            <Pressable
              onPress={() => setDayIndex(pageIndex + 1)}
              disabled={pageIndex >= groups.length - 1}
              style={[styles.pagerBtn, pageIndex >= groups.length - 1 && styles.pagerBtnOff]}
            >
              <Text style={styles.pagerArrow}>›</Text>
            </Pressable>
          </View>
          {currentDay.matches.map((m) => <LiveMatchCard key={m.id} m={m} />)}
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Where to watch</Text>
      {VENUES.map((v) => (
        <View key={v.id} style={styles.venueCard}>
          <View style={styles.venueHead}>
            <Text style={styles.venueName}>{v.name}</Text>
            {v.perk ? (
              <View style={styles.perk}>
                <Text style={styles.perkText}>{v.perk}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.venueArea}>{v.area}</Text>
          <Text style={styles.venueBlurb}>{v.blurb}</Text>
          <View style={styles.venueActions}>
            <View style={styles.venueBtnWrap}>
              <PressableScale style={styles.venueBtn} onPress={() => openMaps(v.mapsQuery)}>
                <Text style={styles.venueBtnText}>Directions</Text>
              </PressableScale>
            </View>
            <View style={styles.venueBtnWrap}>
              <PressableScale style={[styles.venueBtn, styles.venueBtnAlt]} onPress={() => Linking.openURL(WHATSAPP_GROUP_URL)}>
                <Text style={[styles.venueBtnText, styles.venueBtnTextAlt]}>Join chat</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      ))}
      <StatusBar style="dark" />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Tab bar + shell
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'join', label: 'Join' },
  { key: 'fans', label: 'Fans' },
  { key: 'matches', label: 'Matches' },
];

function TabBar({ tab, setTab }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
            <View style={[styles.tabDot, active && styles.tabDotActive]} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState('join');
  const [me, setMe] = useState(null);
  return (
    <View style={styles.app}>
      <View style={styles.appBody}>
        {tab === 'join' && <JoinScreen onJoined={setMe} onExplore={() => setTab('fans')} />}
        {tab === 'fans' && <FansScreen me={me} />}
        {tab === 'matches' && <MatchesScreen />}
      </View>
      <TabBar tab={tab} setTab={setTab} />
    </View>
  );
}

const SHADOW = { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } };

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.paper },
  appBody: { flex: 1 },
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: 24, paddingTop: Platform.OS === 'web' ? 56 : 72, paddingBottom: 96, maxWidth: 520, width: '100%', alignSelf: 'center' },

  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: C.accent },
  title: { fontSize: 36, fontWeight: '800', color: C.ink, letterSpacing: -1.2, marginTop: 8 },
  subtitle: { fontSize: 15.5, color: C.sub, marginTop: 10, lineHeight: 23 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 },
  muted: { color: C.faint, fontSize: 14, paddingVertical: 16 },
  flag: { ...FLAG_FONT },

  live: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, marginRight: 8 },
  liveText: { fontSize: 13, fontWeight: '600', color: C.sub },

  form: { marginTop: 28 },
  field: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  label: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  optional: { fontSize: 12, color: C.faint, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: C.ink, backgroundColor: C.paper },
  inputFocus: { borderColor: C.lineFocus },
  inputText: { fontSize: 16, color: C.ink, ...FLAG_FONT },
  placeholder: { fontSize: 16, color: C.faint },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 18, color: C.faint, marginLeft: 8, marginTop: -4 },
  chevronOpen: { color: C.ink },
  dropdown: { borderWidth: 1, borderColor: C.line, borderRadius: 10, marginTop: 6, maxHeight: 264, overflow: 'hidden', backgroundColor: C.paper, ...SHADOW },
  search: { paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink, borderBottomWidth: 1, borderBottomColor: C.line },
  dropdownScroll: { maxHeight: 216 },
  option: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionPressed: { backgroundColor: '#F9FAFB' },
  optionText: { fontSize: 15.5, color: C.ink, ...FLAG_FONT },
  noMatch: { padding: 16, color: C.faint, textAlign: 'center', fontSize: 14 },

  error: { color: C.warn, fontSize: 14, fontWeight: '500', marginBottom: 14 },
  primary: { backgroundColor: C.ink, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryDisabled: { backgroundColor: '#D1D5DB' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fineprint: { fontSize: 12.5, color: C.faint, textAlign: 'center', marginTop: 14 },

  // Hero / result
  heroScreen: { backgroundColor: C.hero },
  heroBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  heroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: C.accent },
  heroNumber: { fontSize: 80, fontWeight: '800', color: C.heroText, letterSpacing: -2, marginTop: 8 },
  heroName: { fontSize: 22, fontWeight: '700', color: C.heroText, marginTop: 4 },
  heroMeta: { fontSize: 14, color: C.heroSub, marginTop: 6 },
  heroCopy: { fontSize: 16, color: C.heroSub, marginTop: 18, lineHeight: 24 },
  primaryOnHero: { backgroundColor: C.whatsapp, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  primaryOnHeroText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryOnHero: { borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: C.heroLine },
  secondaryOnHeroText: { color: C.heroText, fontSize: 15, fontWeight: '600' },
  ghostOnHero: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  ghostOnHeroText: { color: C.heroSub, fontSize: 14, fontWeight: '600' },
  toast: { marginTop: 14, color: '#86EFAC', fontWeight: '600', fontSize: 13.5, textAlign: 'center' },

  // Env badge
  envBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: '#F3F4F6', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 16 },
  envBadgeDanger: { backgroundColor: '#FEF2F2' },
  envDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  envText: { fontSize: 11.5, fontWeight: '700', color: C.sub, letterSpacing: 0.3 },

  // Fans
  countryRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  countryStat: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentSoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  countryFlag: { fontSize: 18, marginRight: 6 },
  countryCount: { fontSize: 14, fontWeight: '800', color: C.accent },
  chipScroll: { marginTop: 18, marginHorizontal: -24 },
  chipRow: { paddingHorizontal: 24, gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: C.sub },
  chipTextActive: { color: '#fff' },
  fanList: { marginTop: 18 },
  fanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fanRowMe: { backgroundColor: C.accentSoft, borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10, borderBottomColor: 'transparent' },
  fanFlag: { fontSize: 26, marginRight: 12 },
  fanInfo: { flex: 1 },
  fanName: { fontSize: 15.5, fontWeight: '700', color: C.ink },
  fanMeta: { fontSize: 13, color: C.sub, marginTop: 2, ...FLAG_FONT },
  fanNum: { fontSize: 13, fontWeight: '700', color: C.faint, marginLeft: 10 },

  // Matches
  matchCard: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 12 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchStage: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, color: C.accent, textTransform: 'uppercase' },
  matchWhen: { fontSize: 13, fontWeight: '600', color: C.sub },
  matchTeams: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  matchTeam: { flex: 1, fontSize: 16, fontWeight: '700', color: C.ink, ...FLAG_FONT },
  matchTeamRight: { textAlign: 'right' },
  matchVs: { fontSize: 12, color: C.faint, fontWeight: '600', marginHorizontal: 10 },
  matchVenue: { fontSize: 13, color: C.sub, marginTop: 10 },
  tubiBtn: { backgroundColor: C.accentSoft, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  tubiBtnText: { color: C.accent, fontSize: 14, fontWeight: '800' },

  // Live match card (ESPN feed)
  daySubhead: { fontSize: 13, fontWeight: '800', color: C.sub, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  pagerBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  pagerBtnOff: { opacity: 0.35 },
  pagerArrow: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: -2 },
  pagerMid: { flex: 1, alignItems: 'center' },
  pagerDay: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  pagerCount: { fontSize: 12, fontWeight: '600', color: C.faint, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  teamCol: { flex: 1, alignItems: 'center' },
  crest: { width: 34, height: 34, marginBottom: 6 },
  crestEmpty: { borderRadius: 17, backgroundColor: C.line },
  teamColName: { fontSize: 13.5, fontWeight: '700', color: C.ink, textAlign: 'center' },
  scoreCenter: { fontSize: 22, fontWeight: '800', color: C.ink, marginHorizontal: 12, letterSpacing: -0.5 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.warn, marginRight: 6 },
  livePillText: { fontSize: 11, fontWeight: '800', color: C.warn, letterSpacing: 0.3 },

  // Venues
  venueCard: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, marginBottom: 12 },
  venueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  venueName: { flex: 1, fontSize: 17, fontWeight: '800', color: C.ink },
  perk: { backgroundColor: C.accentSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, marginLeft: 8 },
  perkText: { fontSize: 11, fontWeight: '700', color: C.accent },
  venueArea: { fontSize: 13, color: C.sub, marginTop: 3, fontWeight: '600' },
  venueBlurb: { fontSize: 14, color: C.sub, marginTop: 8, lineHeight: 20 },
  venueActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  venueBtnWrap: { flex: 1 },
  venueBtn: { backgroundColor: C.ink, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  venueBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  venueBtnAlt: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line },
  venueBtnTextAlt: { color: C.ink },

  // Tab bar
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper, paddingBottom: Platform.OS === 'web' ? 8 : 24, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginBottom: 5 },
  tabDotActive: { backgroundColor: C.accent },
  tabLabel: { fontSize: 12.5, fontWeight: '700', color: C.faint },
  tabLabelActive: { color: C.ink },
});
