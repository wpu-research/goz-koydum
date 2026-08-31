import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { getProduct, getProfile, setTryon } from '../lib/db';
import { generateTryOn } from '../lib/gemini';
import { C } from '../lib/theme';

const CLOTHES_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44', '45'];

async function toBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function TryOnScreen({ route, navigation }) {
  const { id } = route.params;
  const [p, setP] = useState(null);
  const [profile, setProfile] = useState(null);
  const [size, setSize] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useFocusEffect(useCallback(() => {
    const prod = getProduct(id);
    setP(prod);
    if (prod?.tryonUri) setResult(prod.tryonUri);
    setProfile(getProfile());
  }, [id]));

  if (!p) return null;

  const isShoe = p.category === 'Ayakkabı';
  const isAccessory = p.category === 'Aksesuar';
  const sizes = isShoe ? SHOE_SIZES : CLOTHES_SIZES;
  const refUris = profile ? [
    { label: 'front', uri: profile.frontUri },
    { label: 'back', uri: profile.backUri },
    { label: 'side', uri: profile.sideUri },
  ].filter((r) => r.uri) : [];
  const hasProfile = refUris.length > 0;

  async function run() {
    if (!hasProfile) return;
    if (!p.photoUri) return Alert.alert('Ürün fotosu yok', 'Bu ürünün fotoğrafı yok, giydiremem.');
    setBusy(true);
    try {
      const refs = await Promise.all(
        refUris.map(async (r) => ({ label: r.label, base64: await toBase64(r.uri) }))
      );
      const garmentBase64 = await toBase64(p.photoUri);
      const outB64 = await generateTryOn({
        refs, garmentBase64, category: p.category,
        size: isAccessory ? null : size,
        height: profile.height, weight: profile.weight,
      });
      const out = FileSystem.documentDirectory + `tryon_${id}_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(out, outB64, { encoding: FileSystem.EncodingType.Base64 });
      setResult(out);
      setTryon(id, out);
    } catch (e) {
      Alert.alert('Giydiremedim', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.h}>👗 Üzerinde dene</Text>
      <Text style={s.sub}>Beden profilinle “{p.name}” ürününü AI giydirsin.</Text>

      {/* Profil özeti */}
      {hasProfile ? (
        <View style={s.profBox}>
          <View style={s.refRow}>
            {refUris.map((r) => (
              <Image key={r.label} source={{ uri: r.uri }} style={s.refThumb} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profTxt}>
              {[profile.height && `${profile.height} cm`, profile.weight && `${profile.weight} kg`]
                .filter(Boolean).join(' · ') || 'Ölçü girilmemiş'}
            </Text>
            <Pressable onPress={() => navigation.navigate('Profile')}>
              <Text style={s.profEdit}>Profili düzenle</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={s.setupBox} onPress={() => navigation.navigate('Profile')}>
          <Text style={s.setupTitle}>Önce beden profilini oluştur</Text>
          <Text style={s.setupSub}>Boy, kilo ve 3 açıdan fotoğraf ekle — bir kez. Sonra tüm ürünleri üzerinde dene.</Text>
          <Text style={s.setupBtn}>Profili oluştur →</Text>
        </Pressable>
      )}

      {/* Beden seçimi (aksesuar hariç) */}
      {hasProfile && !isAccessory && (
        <>
          <Text style={s.lbl}>{isShoe ? 'Numara' : 'Beden'}</Text>
          <View style={s.chips}>
            {sizes.map((sz) => (
              <Pressable key={sz} style={[s.chip, size === sz && s.chipOn]} onPress={() => setSize(sz)}>
                <Text style={[s.chipTxt, size === sz && s.chipTxtOn]}>{sz}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Ürün */}
      {hasProfile && (
        <View style={s.prodRow}>
          {p.photoUri
            ? <Image source={{ uri: p.photoUri }} style={s.prodImg} />
            : <View style={[s.prodImg, s.empty]}><Text style={{ fontSize: 28 }}>🛍️</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={s.prodName}>{p.name}</Text>
            <Text style={s.prodCat}>{p.category}{size && !isAccessory ? ` · ${size}` : ''}</Text>
          </View>
        </View>
      )}

      {hasProfile && (
        <Pressable style={[s.btnDark, busy && { opacity: 0.6 }]} disabled={busy} onPress={run}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnDarkTxt}>{result ? 'Yeniden giydir ✨' : 'Giydir ✨'}</Text>}
        </Pressable>
      )}
      {busy && <Text style={s.busyTxt}>Nano Banana çalışıyor, birkaç saniye…</Text>}

      {result && !busy && (
        <View style={s.resultWrap}>
          <Text style={s.lbl}>Sonuç</Text>
          <Image source={{ uri: result }} style={s.result} />
          <Text style={s.disc}>AI üretimi — gerçek görünüm/oturuştan farklı olabilir.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h: { fontSize: 20, fontWeight: '800', color: C.ink },
  sub: { fontSize: 13, color: C.muted, marginTop: 4 },
  profBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 12, marginTop: 16, borderWidth: 1, borderColor: C.line },
  refRow: { flexDirection: 'row', gap: 4 },
  refThumb: { width: 38, height: 52, borderRadius: 8, backgroundColor: C.bg },
  profTxt: { fontSize: 13, fontWeight: '700', color: C.ink },
  profEdit: { fontSize: 12, color: C.online, marginTop: 3, fontWeight: '600' },
  setupBox: { backgroundColor: C.dark, borderRadius: 18, padding: 18, marginTop: 16 },
  setupTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  setupSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6, lineHeight: 19 },
  setupBtn: { color: C.tag, fontWeight: '800', fontSize: 14, marginTop: 12 },
  lbl: { fontSize: 11, color: C.muted, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: 13, color: C.muted },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  prodImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: C.card },
  empty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  prodName: { fontSize: 14, fontWeight: '700', color: C.ink },
  prodCat: { fontSize: 12, color: C.muted, marginTop: 2 },
  btnDark: { backgroundColor: C.ink, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center' },
  btnDarkTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  busyTxt: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 8 },
  resultWrap: { marginTop: 22 },
  result: { width: '100%', height: 440, borderRadius: 18, backgroundColor: C.card },
  disc: { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' },
});
