import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NATIONS } from './src/nations';
import { isWinner } from './src/position';
import { submitSignup } from './src/signup';

// Single master WhatsApp group invite. Replace with the real invite link.
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE';

// Minimal native-friendly dropdown: tap to cycle a labeled picker via a modal-less
// inline list. Kept dependency-free for the 2-hour budget.
function Picker({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.inputText : styles.placeholder}>
          {value || `Select ${label.toLowerCase()}…`}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.option}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [team, setTeam] = useState('');
  const [connectIntent, setConnectIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && country && team && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const pos = await submitSignup({ name, country, team, connectIntent });
      setPosition(pos);
    } catch (e) {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => Linking.openURL(WHATSAPP_GROUP_URL);

  if (position !== null) {
    const won = isWinner(position);
    return (
      <View style={styles.container}>
        <View style={styles.resultBox}>
          <Text style={styles.kicker}>You're in.</Text>
          <Text style={styles.bigNumber}>#{position}</Text>
          <Text style={styles.resultText}>
            {won
              ? "You're in the first 100 — you win! 🎉"
              : 'First 100 win. The earlier you sign up, the better your odds.'}
          </Text>
          <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
            <Text style={styles.whatsappBtnText}>Join the FanFest WhatsApp</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>FanFest 2026</Text>
      <Text style={styles.subtitle}>
        Sign up, join the community, win one of 100 prizes. Earlier = better odds.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#999"
          maxLength={100}
        />
      </View>

      <Picker label="Country" value={country} options={NATIONS} onSelect={setCountry} />
      <Picker label="Favorite team" value={team} options={NATIONS} onSelect={setTeam} />

      <View style={styles.field}>
        <Text style={styles.label}>Who do you want to connect with? (optional)</Text>
        <TextInput
          style={styles.input}
          value={connectIntent}
          onChangeText={setConnectIntent}
          placeholder="e.g. fellow Japan fans"
          placeholderTextColor="#999"
          maxLength={280}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitBtnText}>
          {submitting ? 'Signing up…' : 'Sign up'}
        </Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: Platform.OS === 'web' ? 40 : 60 },
  title: { fontSize: 32, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 15, color: '#555', marginTop: 6, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14,
    fontSize: 16, backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#111' },
  placeholder: { fontSize: 16, color: '#999' },
  dropdown: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginTop: 4,
    maxHeight: 220, overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 220 },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#111' },
  submitBtn: {
    backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#bbb' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  error: { color: '#c00', marginBottom: 12 },
  resultBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  kicker: { fontSize: 18, color: '#555', fontWeight: '600' },
  bigNumber: { fontSize: 80, fontWeight: '900', color: '#111', marginVertical: 8 },
  resultText: { fontSize: 18, color: '#333', textAlign: 'center', marginBottom: 32 },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 28,
  },
  whatsappBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
