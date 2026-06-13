import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { NATIONS } from './src/nations';
import { flagFor } from './src/flags';
import { LOOKING_TYPES } from './src/lookingTypes';
import { submitSignup, subscribeToCount } from './src/signup';
import { shareRank } from './src/share';
import { buzz, playWinSound } from './src/celebrate';
import env from './src/env';

const WHATSAPP_GROUP_URL =
  process.env.EXPO_PUBLIC_WHATSAPP_GROUP_URL ||
  'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE';

// Display-only social-proof seed added to the live "fans joined" ticker. Does
// not touch the real signup counter. Only applied in prod — the dev sandbox
// shows the true count.
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
  hero: '#0A0A0A',
  heroText: '#FFFFFF',
  heroSub: '#A1A1AA',
  heroLine: '#27272A',
  whatsapp: '#1FAF5A',
  warn: '#DC2626',
};

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

// Labeled text input with a focus ring.
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

// Dropdown select. `searchable` adds a filter; `leading` renders a prefix per row.
function SelectField({ label, optional, value, options, onSelect, placeholder, searchable, leading }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [query, options]);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && <Text style={styles.optional}>Optional</Text>}
      </View>
      <Pressable
        style={[styles.input, styles.selectRow, open && styles.inputFocus]}
        onPress={() => setOpen((o) => !o)}
      >
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
              value={query}
              onChangeText={setQuery}
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
                  setQuery('');
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

// Small live count with a pulsing status dot.
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

// Build / environment indicator. Renders only off the real production deploy.
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

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [team, setTeam] = useState('');
  const [lookingType, setLookingType] = useState('');
  const [lookingGoal, setLookingGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    if (position === null) return;
    buzz([50, 30, 110]); // welcome buzz on joining
    playWinSound();
  }, [position]);

  const canSubmit = !!name.trim() && !!lookingType && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    buzz(15);
    setSubmitting(true);
    setError('');
    try {
      const pos = await submitSignup({ name, country, team, lookingType, lookingGoal });
      setPosition(pos);
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => Linking.openURL(WHATSAPP_GROUP_URL);

  const onShare = async () => {
    const status = await shareRank({ name, position });
    if (status === 'copied') setToast('Link copied');
    else if (status === 'shared') setToast('Shared');
    else if (status === 'unsupported') setToast('Sharing unavailable on this device');
    if (status !== 'cancelled') setTimeout(() => setToast(''), 2400);
  };

  // ---- Result ----
  if (position !== null) {
    const meta = [country, team && `${team} supporter`].filter(Boolean).join('  ·  ');
    return (
      <View style={[styles.screen, styles.heroScreen]}>
        <EnvBadge />
        <Confetti />
        <View style={styles.heroBody}>
          <Text style={styles.heroEyebrow}>YOU'RE IN · FAN</Text>
          <AnimatedCount value={position} style={styles.heroNumber} />
          <Text style={styles.heroName}>{name.trim()}</Text>
          {meta ? <Text style={styles.heroMeta}>{meta}</Text> : null}
          <Text style={styles.heroCopy}>
            Welcome to the FanFest community. Jump into the group chat to meet fans
            {country ? ` repping ${country}` : ''} and talk all things World Cup.
          </Text>

          <PressableScale style={styles.primaryOnHero} onPress={openWhatsApp}>
            <Text style={styles.primaryOnHeroText}>Join the community on WhatsApp</Text>
          </PressableScale>
          <PressableScale style={styles.secondaryOnHero} onPress={onShare}>
            <Text style={styles.secondaryOnHeroText}>Invite friends</Text>
          </PressableScale>
          {toast ? <Text style={styles.toast}>{toast}</Text> : null}
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  // ---- Signup ----
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <EnvBadge />
      <Animated.View
        style={{
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <Text style={styles.eyebrow}>FIFA WORLD CUP 2026</Text>
        <Text style={styles.title}>FanFest</Text>
        <Text style={styles.subtitle}>
          The fan community for the World Cup. Sign up to connect with fans from your country and team —
          then jump into the group chat.
        </Text>

        <LiveCount />

        <View style={styles.form}>
          <TextField label="Full name" value={name} onChangeText={setName} placeholder="Jordan Smith" maxLength={100} />

          <SelectField
            label="Country"
            optional
            value={country}
            options={NATIONS}
            onSelect={setCountry}
            placeholder="Select your country"
            searchable
            leading={flagFor}
          />
          <SelectField
            label="Team you support"
            optional
            value={team}
            options={NATIONS}
            onSelect={setTeam}
            placeholder="Select a team"
            searchable
            leading={flagFor}
          />

          <SelectField
            label="I'm looking to"
            value={lookingType}
            options={LOOKING_TYPES}
            onSelect={setLookingType}
            placeholder="Choose one"
          />
          <TextField
            label="Your goal"
            optional
            value={lookingGoal}
            onChangeText={setLookingGoal}
            placeholder="Find Japan fans for the final"
            maxLength={280}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PressableScale
            style={[styles.primary, !canSubmit && styles.primaryDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryText}>{submitting ? 'Joining…' : 'Join FanFest'}</Text>
          </PressableScale>
          <Text style={styles.fineprint}>No spam — just fans.</Text>
        </View>
      </Animated.View>
      <StatusBar style="dark" />
    </ScrollView>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 56 : 72,
    paddingBottom: 64,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },

  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: C.accent },
  title: { fontSize: 40, fontWeight: '800', color: C.ink, letterSpacing: -1.2, marginTop: 8 },
  subtitle: { fontSize: 15.5, color: C.sub, marginTop: 10, lineHeight: 23 },

  live: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, marginRight: 8 },
  liveText: { fontSize: 13, fontWeight: '600', color: C.sub },

  form: { marginTop: 28 },
  field: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  label: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  optional: { fontSize: 12, color: C.faint, fontWeight: '500' },

  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.paper,
  },
  inputFocus: { borderColor: C.lineFocus },
  inputText: { fontSize: 16, color: C.ink },
  placeholder: { fontSize: 16, color: C.faint },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 18, color: C.faint, marginLeft: 8, marginTop: -4 },
  chevronOpen: { color: C.ink },

  dropdown: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 264,
    overflow: 'hidden',
    backgroundColor: C.paper,
    ...SHADOW,
  },
  search: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: C.ink,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  dropdownScroll: { maxHeight: 216 },
  option: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionPressed: { backgroundColor: '#F9FAFB' },
  optionText: { fontSize: 15.5, color: C.ink },
  noMatch: { padding: 16, color: C.faint, textAlign: 'center', fontSize: 14 },

  error: { color: C.warn, fontSize: 14, fontWeight: '500', marginBottom: 14 },

  primary: { backgroundColor: C.ink, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryDisabled: { backgroundColor: '#D1D5DB' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fineprint: { fontSize: 12.5, color: C.faint, textAlign: 'center', marginTop: 14 },

  // Hero / result
  heroScreen: { backgroundColor: C.hero },
  heroBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, maxWidth: 520, width: '100%', alignSelf: 'center' },
  heroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: C.accent },
  heroNumber: { fontSize: 84, fontWeight: '800', color: C.heroText, letterSpacing: -2, marginTop: 8 },
  heroName: { fontSize: 22, fontWeight: '700', color: C.heroText, marginTop: 4 },
  heroMeta: { fontSize: 14, color: C.heroSub, marginTop: 6 },
  heroCopy: { fontSize: 16, color: C.heroSub, marginTop: 18, lineHeight: 24 },

  primaryOnHero: { backgroundColor: C.whatsapp, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  primaryOnHeroText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryOnHero: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.heroLine,
  },
  secondaryOnHeroText: { color: C.heroText, fontSize: 15, fontWeight: '600' },
  toast: { marginTop: 16, color: '#86EFAC', fontWeight: '600', fontSize: 13.5, textAlign: 'center' },

  // Env badge
  envBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  envBadgeDanger: { backgroundColor: '#FEF2F2' },
  envDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  envText: { fontSize: 11.5, fontWeight: '700', color: C.sub, letterSpacing: 0.3 },
});
