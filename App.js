import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// MVP vertical slice: public realtime Firestore feed, no sign-in required.
// `sid` is a per-device session id so posts can be attributed without auth.
// Swap "messages" for the real FanFest feature collection once scope is set.
// HARDENING: add Anonymous Auth + App Check, then key writes off request.auth.uid.
function makeSid() {
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).slice(0, 24);
}

export default function App() {
  const sid = useRef(makeSid()).current;
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await addDoc(collection(db, 'messages'), {
      body,
      sid,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FanFest</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Say something…"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.btn} onPress={send}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Text style={[styles.item, item.sid === sid && styles.mine]}>
            {item.body}
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No messages yet. Say hi 👋</Text>}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', fontSize: 16 },
  mine: { fontWeight: '600', color: '#111' },
  muted: { color: '#888', marginTop: 8 },
});
