import React, { useState } from 'react';
import {
  View, Text, TextInput, Image, Pressable, ScrollView,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { analyzeProductImage, resolveProductUrl } from '../lib/gemini';
import { addProduct, setUrl } from '../lib/db';
import { C, CATEGORIES } from '../lib/theme';

export default function AddScreen({ navigation, route }) {
  const [photo, setPhoto] = useState(null);      // { uri, base64 }
  const [busy, setBusy] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', currency: '₺', category: 'Diğer',
    type: 'store', condition: '0', url: '', locationName: '', lat: null, lng: null, note: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Share intent ile gelen görsel: otomatik yükle + AI'yı tetikle
  React.useEffect(() => {
    const uri = route?.params?.sharedUri;
    if (!uri) return;
    (async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const asset = { uri, base64 };
        setPhoto(asset);
        runAI(asset, false);
      } catch (e) {
        Alert.alert('Görsel okunamadı', e.message);
      }
    })();
  }, [route?.params?.sharedUri]);

  async function pick(fromCamera) {
    const opts = { quality: 0.7, base64: true };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    setPhoto(asset);
    runAI(asset, fromCamera);
  }

  async function runAI(asset, fromCamera) {
    setBusy(true);
    try {
      const ai = await analyzeProductImage(asset.base64);
      let loc = { locationName: '', lat: null, lng: null };
      if (ai.type === 'store' || fromCamera) {
        loc = await grabLocation();
      }
      setForm((f) => ({
        ...f,
        name: ai.name,
        price: ai.price != null ? String(ai.price) : '',
        currency: ai.currency,
        category: ai.category,
        type: ai.type,
        url: ai.url || '',
        note: ai.note || '',
        ...loc,
      }));
      setAiFilled(true);
    } catch (e) {
      Alert.alert('AI dolduramadı', e.message + '\nAlanları elle girebilirsin.');
    } finally {
      setBusy(false);
    }
  }

  async function grabLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { locationName: '', lat: null, lng: null };
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [g] = await Location.reverseGeocodeAsync(pos.coords);
      const name = g ? [g.name || g.street, g.district || g.subregion].filter(Boolean).join(', ') : '';
      return { locationName: name, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return { locationName: '', lat: null, lng: null };
    }
  }

  async function save() {
    if (!form.name.trim()) return Alert.alert('Eksik', 'Ürün adı gerekli.');
    let photoUri = null;
    if (photo?.uri) {
      photoUri = FileSystem.documentDirectory + `p_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: photo.uri, to: photoUri });
    }
    const newId = addProduct({
      ...form,
      price: form.price ? parseFloat(String(form.price).replace(',', '.')) : null,
      photoUri,
      aiFilled,
    });

    // Online ürünlerde gerçek ürün linkini arka planda bul (grounding açıksa) — kaydı bekletme
    if (form.type === 'online') {
      const hasFullLink = /\/[^/]/.test((form.url || '').replace(/^https?:\/\//, ''));
      if (!hasFullLink) {
        resolveProductUrl(form.name, form.url)
          .then((real) => { if (real) setUrl(newId, real); })
          .catch(() => {});
      }
    }

    navigation.goBack();
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {!photo ? (
        <View style={s.pickBox}>
          <Text style={{ fontSize: 44 }}>📸</Text>
          <Text style={s.pickT}>Çek ya da screenshot seç</Text>
          <Text style={s.pickS}>Gerisini Gemini doldurur, sen sadece kontrol edersin.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable style={s.btnDark} onPress={() => pick(true)}>
              <Text style={s.btnDarkTxt}>Fotoğraf çek</Text>
            </Pressable>
            <Pressable style={s.btnGhost} onPress={() => pick(false)}>
              <Text style={s.btnGhostTxt}>Galeriden seç</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Image source={{ uri: photo.uri }} style={s.preview} />
      )}

      {busy && (
        <View style={s.aiBox}>
          <ActivityIndicator color={C.ink} />
          <Text style={s.aiTxt}>✨ Gemini görüntüyü ayrıştırıyor…</Text>
        </View>
      )}

      {photo && !busy && (
        <>
          {aiFilled && (
            <View style={s.aiDone}>
              <Text style={s.aiDoneTxt}>✨ AI doldurdu — yanlış olanı dokunup düzelt</Text>
            </View>
          )}

          <Field label="Ürün adı" value={form.name} onChange={(v) => set('name', v)} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field flex label="Fiyat" value={form.price} keyboard="decimal-pad" onChange={(v) => set('price', v)} />
            <Field w={80} label="Birim" value={form.currency} onChange={(v) => set('currency', v)} />
          </View>

          <Text style={s.lbl}>Tip</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['store', 'Mağaza'], ['online', 'Online']].map(([k, l]) => (
              <Pressable
                key={k}
                style={[s.chip, form.type === k && { backgroundColor: k === 'store' ? C.store : C.online, borderColor: 'transparent' }]}
                onPress={() => set('type', k)}
              >
                <Text style={[s.chipTxt, form.type === k && { color: k === 'online' ? C.onlineInk : '#fff', fontWeight: '700' }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.lbl}>Durum</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['0', 'Sıfır'], ['2el', '2. El']].map(([k, l]) => (
              <Pressable
                key={k}
                style={[s.chip, form.condition === k && s.chipOn]}
                onPress={() => set('condition', k)}
              >
                <Text style={[s.chipTxt, form.condition === k && s.chipTxtOn]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.lbl}>Kategori</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[s.chip, form.category === c && s.chipOn]}
                onPress={() => set('category', c)}
              >
                <Text style={[s.chipTxt, form.category === c && s.chipTxtOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {form.type === 'online' ? (
            <Field label="Site adresi" value={form.url} onChange={(v) => set('url', v)} placeholder="trendyol.com" />
          ) : (
            <Field label="Konum" value={form.locationName} onChange={(v) => set('locationName', v)} placeholder="GPS otomatik alır, elle de yazabilirsin" />
          )}

          <Field label="Not" value={form.note} onChange={(v) => set('note', v)} placeholder="İndirim beklenebilir…" />

          <Pressable style={[s.btnDark, { marginTop: 18 }]} onPress={save}>
            <Text style={s.btnDarkTxt}>Listeye ekle 🏷️</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, flex, w }) {
  return (
    <View style={[{ marginTop: 12 }, flex && { flex: 1 }, w && { width: w }]}>
      <Text style={s.lbl}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#B4AFC4"
        keyboardType={keyboard || 'default'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pickBox: {
    alignItems: 'center', backgroundColor: C.card, borderRadius: 20,
    paddingVertical: 40, paddingHorizontal: 24, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed',
  },
  pickT: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 10 },
  pickS: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
  preview: { width: '100%', height: 240, borderRadius: 20 },
  aiBox: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 14,
    borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed',
  },
  aiTxt: { color: C.muted, fontSize: 13 },
  aiDone: { backgroundColor: 'rgba(94,211,200,0.16)', borderRadius: 12, padding: 10, marginTop: 14 },
  aiDoneTxt: { color: '#116B60', fontSize: 12, fontWeight: '600' },
  lbl: { fontSize: 11, color: C.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink,
  },
  chip: {
    borderWidth: 1.5, borderColor: C.line, borderRadius: 999,
    paddingHorizontal: 13, paddingVertical: 7, backgroundColor: C.card,
  },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: 12, color: C.muted },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  btnDark: { backgroundColor: C.ink, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center' },
  btnDarkTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { borderWidth: 1.5, borderColor: C.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center' },
  btnGhostTxt: { color: C.ink, fontWeight: '600', fontSize: 14 },
});
