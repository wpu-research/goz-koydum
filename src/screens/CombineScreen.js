import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWardrobe } from '../lib/db';
import { suggestOutfits } from '../lib/gemini';
import { C } from '../lib/theme';

const CONCEPTS = ['Günlük', 'İş', 'Gece', 'Spor', 'Özel gün'];

export default function CombineScreen({ navigation }) {
  const [wardrobe, setWardrobe] = useState([]);
  const [concept, setConcept] = useState('Günlük');
  const [busy, setBusy] = useState(false);
  const [outfits, setOutfits] = useState(null);

  useFocusEffect(useCallback(() => { setWardrobe(getWardrobe()); }, []));

  const byId = Object.fromEntries(wardrobe.map((p) => [p.id, p]));

  async function run() {
    setBusy(true);
    setOutfits(null);
    try {
      const res = await suggestOutfits(wardrobe, concept);
      if (!res.length) throw new Error('Bu konsepte uygun kombin çıkmadı. Farklı parçalar ekle ya da başka konsept dene.');
      setOutfits(res);
    } catch (e) {
      Alert.alert('Kombin kuramadım', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h}>🧩 Kombin öner</Text>
      <Text style={s.sub}>Gardırobundaki {wardrobe.length} parçadan AI sana kombin kursun.</Text>

      <Text style={s.lbl}>Konsept</Text>
      <View style={s.chips}>
        {CONCEPTS.map((c) => (
          <Pressable key={c} style={[s.chip, concept === c && s.chipOn]} onPress={() => setConcept(c)}>
            <Text style={[s.chipTxt, concept === c && s.chipTxtOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[s.btnDark, busy && { opacity: 0.6 }]} disabled={busy} onPress={run}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnDarkTxt}>Kombin oluştur ✨</Text>}
      </Pressable>

      {outfits && outfits.map((o, i) => (
        <View key={i} style={s.card}>
          <Text style={s.cardTitle}>{o.title}</Text>
          {o.vibe ? <Text style={s.vibe}>{o.vibe}</Text> : null}

          <View style={s.itemsRow}>
            {o.itemIds.map((id) => {
              const p = byId[id];
              if (!p) return null;
              return (
                <Pressable key={id} style={s.item} onPress={() => navigation.navigate('Detail', { id })}>
                  {p.photoUri
                    ? <Image source={{ uri: p.photoUri }} style={s.itemImg} />
                    : <View style={[s.itemImg, s.itemEmpty]}><Text style={{ fontSize: 22 }}>🛍️</Text></View>}
                  <Text style={s.itemName} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {o.missing ? (
            <View style={s.missing}>
              <Text style={s.missingTxt}>🔎 Eksik: {o.missing}</Text>
            </View>
          ) : null}
        </View>
      ))}

      {!outfits && !busy && (
        <View style={s.hintBox}>
          <Text style={s.hintTxt}>
            İpucu: Kombin, tanıdığın tüm parçaları (göz koyduğun + aldıkların) kullanır. Ne kadar çok parça, o kadar iyi öneri.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h: { fontSize: 20, fontWeight: '800', color: C.ink },
  sub: { fontSize: 13, color: C.muted, marginTop: 4 },
  lbl: { fontSize: 11, color: C.muted, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: 13, color: C.muted },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  btnDark: { backgroundColor: C.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center' },
  btnDarkTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 14, marginTop: 16, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  vibe: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 18 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  item: { width: 88 },
  itemImg: { width: 88, height: 88, borderRadius: 12, backgroundColor: C.bg },
  itemEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  itemName: { fontSize: 11, color: C.ink, marginTop: 4 },
  missing: { backgroundColor: 'rgba(255,211,56,0.18)', borderRadius: 10, padding: 10, marginTop: 12 },
  missingTxt: { fontSize: 12, color: '#7A5B00', fontWeight: '600' },
  hintBox: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 20, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed' },
  hintTxt: { fontSize: 13, color: C.muted, lineHeight: 19 },
});
