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
import { isWinner, WINNER_CUTOFF } from './src/position';
import { submitSignup, subscribeToCount } from './src/signup';
import { shareRank } from './src/share';
import { buzz, playWinSound } from './src/celebrate';
import env from './src/env';

// Banner shown on any non-real-prod-deploy so a session can never be mistaken
// for the live event app:
//  - dev sandbox (writes to signups_dev) -> purple "DEV MODE"
//  - LOCAL build forced to prod (writes REAL data) -> red warning
//  - real production deploy -> nothing
function DevBadge() {
  if (env.isDev) {
    return (
      <View style={styles.devBadge} pointerEvents="none">
        <Text style={styles.devBadgeText}>🛠 DEV MODE · writing to signups_dev (not event data)</Text>
      </View>
    );
  }
  if (env.isLocalBuild) {
    return (
      <View style={[styles.devBadge, styles.warnBadge]} pointerEvents="none">
        <Text style={styles.devBadgeText}>⚠️ LOCAL BUILD · writing to REAL event data</Text>
      </View>
    );
  }
  return null;
}

// Single master WhatsApp group invite, configured via EXPO_PUBLIC_WHATSAPP_GROUP_URL
// in .env (read at build time). Fallback is a dead placeholder.
const WHATSAPP_GROUP_URL =
  process.env.EXPO_PUBLIC_WHATSAPP_GROUP_URL ||
  'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE';

// ---------------------------------------------------------------------------
// PressableScale — any button gets a springy press-down bounce.
// ---------------------------------------------------------------------------
function PressableScale({ children, style, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: false, speed: 40, bounciness: 12 }).start();
  return (
    <Pressable
      onPressIn={() => !disabled && to(0.93)}
      onPressOut={() => to(1)}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// AnimatedCount — counts up from 0 to `value` for the big reveal number.
// ---------------------------------------------------------------------------
function AnimatedCount({ value, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = anim.addListener((v) => setDisplay(Math.round(v.value)));
    Animated.timing(anim, {
      toValue: value,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);
  return <Text style={style}>#{display}</Text>;
}

// ---------------------------------------------------------------------------
// Confetti — emoji rain on the win screen. Pure Animated, no dependency.
// ---------------------------------------------------------------------------
const CONFETTI = ['🎉', '⚽', '🏆', '🥳', '✨', '🎊', '🔥'];
function Confetti({ count = 32, extra }) {
  const { width, height } = useWindowDimensions();
  // Weight the fan's team flag heavily so the rain feels personal.
  const pool = useMemo(
    () => (extra ? [extra, extra, extra, ...CONFETTI] : CONFETTI),
    [extra]
  );
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        emoji: pool[i % pool.length],
        x: Math.random() * width,
        delay: Math.random() * 600,
        duration: 2200 + Math.random() * 1600,
        size: 20 + Math.random() * 18,
        fall: new Animated.Value(0),
      })),
    [width, count, pool]
  );
  useEffect(() => {
    const anims = pieces.map((p) =>
      Animated.timing(p.fall, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    Animated.parallel(anims).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Animated.Text
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            fontSize: p.size,
            transform: [
              { translateY: p.fall.interpolate({ inputRange: [0, 1], outputRange: [-60, height + 60] }) },
              {
                rotate: p.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }),
              },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// FlagPicker — searchable dropdown with flag emojis.
// ---------------------------------------------------------------------------
function FlagPicker({ label, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? NATIONS.filter((n) => n.toLowerCase().includes(q)) : NATIONS;
  }, [search]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale style={styles.input} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.inputText : styles.placeholder}>
          {value ? `${flagFor(value)}  ${value}` : `Tap to choose ${label.toLowerCase()}…`}
        </Text>
      </PressableScale>
      {open && (
        <View style={styles.dropdown}>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="🔍  Search…"
            placeholderTextColor="#999"
            autoFocus
          />
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((opt) => (
              <Pressable
                key={opt}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => {
                  onSelect(opt);
                  setSearch('');
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>
                  {flagFor(opt)}  {opt}
                </Text>
              </Pressable>
            ))}
            {filtered.length === 0 && <Text style={styles.noMatch}>No match 🤷</Text>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// LiveTicker — social-proof count of fans already signed up.
// ---------------------------------------------------------------------------
function LiveTicker() {
  const [count, setCount] = useState(null);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => subscribeToCount(setCount), []);
  useEffect(() => {
    if (count == null) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.25, duration: 160, useNativeDriver: false }),
      Animated.spring(pulse, { toValue: 1, useNativeDriver: false, bounciness: 14 }),
    ]).start();
  }, [count]);
  if (count == null) return null;
  return (
    <Animated.View style={[styles.ticker, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.tickerText}>
        🔥 {count} {count === 1 ? 'fan has' : 'fans have'} joined the FanFest
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [team, setTeam] = useState('');
  const [connectIntent, setConnectIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Entrance + CTA pulse animations.
  const entrance = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.04, duration: 800, useNativeDriver: false }),
        Animated.timing(ctaPulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Win celebration: fire sound + haptic once a winning position lands.
  useEffect(() => {
    if (position === null) return;
    buzz(isWinner(position) ? [60, 30, 120, 30, 220] : 40);
    if (isWinner(position)) playWinSound();
  }, [position]);

  const canSubmit = name.trim() && country && team && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    buzz(20);
    setSubmitting(true);
    setError('');
    try {
      const pos = await submitSignup({ name, country, team, connectIntent });
      setPosition(pos);
    } catch (e) {
      setError('Something went wrong. Try again. 😬');
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => Linking.openURL(WHATSAPP_GROUP_URL);

  const onShare = async () => {
    const status = await shareRank({ name, position, team, won: isWinner(position) });
    if (status === 'copied') setToast('Link copied — paste it anywhere! 📋');
    else if (status === 'shared') setToast('Shared! 🙌');
    else if (status === 'unsupported') setToast('Sharing not supported on this device 🤷');
    if (status !== 'cancelled') setTimeout(() => setToast(''), 2400);
  };

  // ---- Result / win screen ----
  if (position !== null) {
    const won = isWinner(position);
    const spotsLeft = Math.max(0, WINNER_CUTOFF - position);
    return (
      <View style={[styles.container, styles.resultBg, styles.resultPad]}>
        <DevBadge />
        {won && <Confetti extra={flagFor(team)} />}
        <View style={styles.resultBox}>
          <Text style={styles.kicker}>{won ? "YOU'RE IN. AND YOU WON. 🏆" : "YOU'RE IN. 🎟️"}</Text>
          <AnimatedCount value={position} style={styles.bigNumber} />
          <Text style={styles.identity}>
            {flagFor(country)} {name.trim()} · {flagFor(team)} {team} fan
          </Text>
          <Text style={styles.resultText}>
            {won
              ? `Top ${WINNER_CUTOFF} — you bagged one of the prizes! 🎉`
              : `First ${WINNER_CUTOFF} win. You just missed it by ${position - WINNER_CUTOFF} — but the early birds at the next drop win. ⚡`}
          </Text>
          {won && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressFill, { width: `${(position / WINNER_CUTOFF) * 100}%` }]} />
              <Text style={styles.progressText}>{spotsLeft} winning spots left after you</Text>
            </View>
          )}
          <PressableScale style={styles.whatsappBtn} onPress={openWhatsApp}>
            <Text style={styles.whatsappBtnText}>💬  Join the FanFest WhatsApp</Text>
          </PressableScale>
          <PressableScale style={styles.shareBtn} onPress={onShare}>
            <Text style={styles.shareBtnText}>📣  Share my rank & challenge friends</Text>
          </PressableScale>
          {toast ? <Text style={styles.toast}>{toast}</Text> : null}
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  // ---- Signup form ----
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <DevBadge />
      <Animated.View
        style={{
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}
      >
        <Text style={styles.title}>FanFest 2026 ⚽</Text>
        <Text style={styles.subtitle}>
          Sign up, join the squad, win one of {WINNER_CUTOFF} prizes. The earlier you are, the better your odds. 🔥
        </Text>

        <LiveTicker />

        <View style={styles.field}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="What should we call you?"
            placeholderTextColor="#999"
            maxLength={100}
          />
        </View>

        <FlagPicker label="Your country" value={country} onSelect={setCountry} />
        <FlagPicker label="Team you're rooting for" value={team} onSelect={setTeam} />

        <View style={styles.field}>
          <Text style={styles.label}>Who do you want to meet? (optional)</Text>
          <TextInput
            style={styles.input}
            value={connectIntent}
            onChangeText={setConnectIntent}
            placeholder="e.g. fellow Japan fans 🇯🇵"
            placeholderTextColor="#999"
            maxLength={280}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Animated.View style={{ transform: [{ scale: canSubmit ? ctaPulse : 1 }] }}>
          <PressableScale
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Locking your spot… ⏳' : "Claim my spot 🚀"}
            </Text>
          </PressableScale>
        </Animated.View>
      </Animated.View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: Platform.OS === 'web' ? 40 : 60, paddingBottom: 60 },
  devBadge: { backgroundColor: '#7C3AED', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  warnBadge: { backgroundColor: '#DC2626' },
  devBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  resultPad: { paddingTop: Platform.OS === 'web' ? 14 : 52, paddingHorizontal: 16 },
  title: { fontSize: 34, fontWeight: '900', color: '#111', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#555', marginTop: 6, marginBottom: 16, lineHeight: 21 },

  ticker: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  tickerText: { color: '#B8540A', fontWeight: '700', fontSize: 13 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e3e3e3',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#111', fontWeight: '600' },
  placeholder: { fontSize: 16, color: '#999' },

  dropdown: {
    borderWidth: 1.5,
    borderColor: '#e3e3e3',
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 280,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  search: {
    padding: 12,
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  dropdownScroll: { maxHeight: 230 },
  option: { paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
  optionPressed: { backgroundColor: '#f0f7ff' },
  optionText: { fontSize: 16, color: '#111' },
  noMatch: { padding: 16, color: '#888', textAlign: 'center' },

  submitBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  submitBtnDisabled: { backgroundColor: '#c4c4c4', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  error: { color: '#c00', marginBottom: 12, fontWeight: '600' },

  resultBg: { backgroundColor: '#0B1020' },
  resultBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  kicker: { fontSize: 16, color: '#9db2ff', fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  bigNumber: { fontSize: 96, fontWeight: '900', color: '#fff', marginVertical: 6 },
  identity: { fontSize: 16, color: '#9db2ff', fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  resultText: { fontSize: 18, color: '#cdd3e6', textAlign: 'center', marginBottom: 28, lineHeight: 25 },

  progressWrap: {
    width: '100%',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 28,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#25D366', opacity: 0.35 },
  progressText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 13 },

  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 30,
    shadowColor: '#25D366',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  whatsappBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  shareBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toast: { marginTop: 16, color: '#9be8b0', fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
