import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Image, Pressable, ScrollView, Alert, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getProfile, saveProfile } from '../lib/db';
import { C } from '../lib/theme';

const SLOTS = [
  { key: 'frontUri', label: 'Önden', emoji: '🧍' },
  { key: 'backUri', label: 'Arkadan', emoji: '🔄' },
  { key: 'sideUri', label: 'Yandan', emoji: '↔️' },
];

export default function ProfileScreen({ navigation }) {
  const [p, setP] = useState({ height: '', weight: '', frontUri: null, backUri: null, sideUri: null });

  useEffect(() => {
    const cur = getProfile();
    if (cur) {
      setP({
        height: cur.height ? String(cur.height) : '',
        weight: cur.weight ? String(cur.weight) : '',
        frontUri: cur.frontUri, backUri: cur.backUri, sideUri: cur.sideUri,
      });
    }
  }, []);

  async function pick(slotKey, fromCamera) {
    const opts = { quality: 0.7 };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const dest = FileSystem.documentDirectory + `body_${slotKey}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: res.assets[0].uri, to: dest });
    setP((s) => ({ ...s, [slotKey]: dest }));
  }

  function choose(slotKey) {
    Alert.alert('Fotoğraf', SLOTS.find((x) => x.key === slotKey).label + ' fotoğrafı', [
      { text: 'Fotoğraf çek', onPress: () => pick(slotKey, true) },
      { text: 'Galeriden seç', onPress: () => pick(slotKey, false) },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  }

  function save() {
    saveProfile({
      height: p.height ? parseInt(p.height, 10) : null,
      weight: p.weight ? parseInt(p.weight, 10) : null,
      frontUri: p.frontUri, backUri: p.backUri, sideUri: p.sideUri,
    });
    Alert.alert('Kaydedildi', 'Beden profilin güncellendi.', [
      { text: 'Tamam', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h}>🧍 Beden profilim</Text>
      <Text style={s.sub}>Bir kez ekle — her denemede aynı referanslar kullanılır. Boy/kilo giyimin nasıl oturduğunu daha gerçekçi yapar.</Text>

      <View style={s.mRow}>
        <View style={s.mField}>
          <Text style={s.lbl}>Boy (cm)</Text>
          <TextInput style={s.input} value={p.height} onChangeText={(v) => setP({ ...p, height: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad" placeholder="180" placeholderTextColor="#B4AFC4" maxLength={3} />
        </View>
        <View style={s.mField}>
          <Text style={s.lbl}>Kilo (kg)</Text>
          <TextInput style={s.input} value={p.weight} onChangeText={(v) => setP({ ...p, weight: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad" placeholder="85" placeholderTextColor="#B4AFC4" maxLength={3} />
        </View>
      </View>

      <Text style={[s.lbl, { marginTop: 20 }]}>Fotoğraflar (3 açı)</Text>
      <View style={s.slots}>
        {SLOTS.map((sl) => (
          <Pressable key={sl.key} style={s.slot} onPress={() => choose(sl.key)}>
            {p[sl.key]
              ? <Image source={{ uri: p[sl.key] }} style={s.slotImg} />
              : <View style={[s.slotImg, s.slotEmpty]}><Text style={{ fontSize: 26 }}>{sl.emoji}</Text></View>}
            <Text style={s.slotLbl}>{sl.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.tip}>İpucu: Sade arka planda, tüm vücut görünecek şekilde çek. En az önden foto yeterli, 3'ü birden en iyi sonucu verir.</Text>

      <Pressable style={s.btnDark} onPress={save}>
        <Text style={s.btnDarkTxt}>Profili kaydet</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h: { fontSize: 20, fontWeight: '800', color: C.ink },
  sub: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 19 },
  mRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  mField: { flex: 1 },
  lbl: { fontSize: 11, color: C.muted, marginBottom: 6 },
  input: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink,
  },
  slots: { flexDirection: 'row', gap: 10, marginTop: 8 },
  slot: { flex: 1 },
  slotImg: { width: '100%', height: 130, borderRadius: 14, backgroundColor: C.card },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed' },
  slotLbl: { fontSize: 12, color: C.ink, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  tip: { fontSize: 12, color: C.muted, marginTop: 12, lineHeight: 18 },
  btnDark: { backgroundColor: C.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  btnDarkTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
