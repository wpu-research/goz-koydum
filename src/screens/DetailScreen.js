import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, Linking, Alert, TextInput, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProduct, setBought, deleteProduct, updateProduct } from '../lib/db';
import { priceText } from '../components/ProductCard';
import { NEW_CHANNELS, USED_CHANNELS } from '../lib/market';
import { C } from '../lib/theme';

export default function DetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [p, setP] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  useFocusEffect(useCallback(() => { setP(getProduct(id)); }, [id]));
  if (!p) return null;

  const isStore = p.type === 'store';
  const wearable = ['Giyim', 'Ayakkabı', 'Aksesuar'].includes(p.category);
  const isUsed = p.condition === '2el';

  function open(url) { Linking.openURL(url); }

  function openLink() {
    if (isStore) {
      const q = p.lat && p.lng ? `${p.lat},${p.lng}` : encodeURIComponent(p.locationName || p.name);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    } else if (p.url) {
      const raw = p.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const hasPath = raw.includes('/');   // domain + yol => ürünün tam linki
      if (hasPath) {
        Linking.openURL(`https://${raw}`);
      } else {
        // Elde sadece domain var; ürünü o sitede aratıp doğrudan ürüne düşür
        const q = encodeURIComponent(`${p.name} site:${raw}`);
        Linking.openURL(`https://www.google.com/search?q=${q}`);
      }
    } else {
      // Site bile yok: ürün adıyla genel arama
      const q = encodeURIComponent(p.name);
      Linking.openURL(`https://www.google.com/search?q=${q}`);
    }
  }

  function toggleBought() {
    setBought(id, p.bought ? 0 : 1);
    setP(getProduct(id));
  }

  function remove() {
    Alert.alert('Silinsin mi?', p.name, [
      { text: 'Vazgeç' },
      { text: 'Sil', style: 'destructive', onPress: () => { deleteProduct(id); navigation.goBack(); } },
    ]);
  }

  function startEdit() {
    setForm({ ...p, price: p.price != null ? String(p.price) : '' });
    setEditing(true);
  }

  function saveEdit() {
    updateProduct(id, { ...form, price: form.price ? parseFloat(String(form.price).replace(',', '.')) : null });
    setEditing(false);
    setP(getProduct(id));
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.photoWrap}>
        {p.photoUri ? (
          <Image source={{ uri: p.photoUri }} style={s.photo} />
        ) : (
          <View style={[s.photo, s.noPhoto]}><Text style={{ fontSize: 60 }}>🛍️</Text></View>
        )}
        <View style={[s.src, { backgroundColor: isStore ? C.store : C.online }]}>
          <Text style={[s.srcTxt, !isStore && { color: C.onlineInk }]}>{isStore ? 'Mağaza' : 'Online'}</Text>
        </View>
        <LinearGradient colors={['transparent', 'rgba(20,16,33,0.88)']} style={s.overlay}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{p.name}</Text>
            <Text style={s.meta}>{p.category}</Text>
          </View>
          <View style={s.tag}><Text style={s.tagTxt}>{priceText(p)}</Text></View>
        </LinearGradient>
      </View>

      <View style={s.row}>
        <Pressable style={s.btnDark} onPress={openLink}>
          <Text style={s.btnDarkTxt}>{isStore ? 'Haritada aç 📍' : 'Siteye git ↗'}</Text>
        </Pressable>
        <Pressable style={s.btnGhost} onPress={editing ? saveEdit : startEdit}>
          <Text style={s.btnGhostTxt}>{editing ? 'Kaydet' : 'Düzenle'}</Text>
        </Pressable>
      </View>

      {wearable && p.photoUri && (
        <Pressable style={s.tryon} onPress={() => navigation.navigate('TryOn', { id })}>
          <Text style={s.tryonTxt}>👗 Üzerinde dene ✨</Text>
        </Pressable>
      )}

      {editing ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Edit label="Ürün adı" v={form.name} f={(v) => setForm({ ...form, name: v })} />
          <Edit label="Fiyat" v={form.price} f={(v) => setForm({ ...form, price: v })} keyboard="decimal-pad" />
          {isStore
            ? <Edit label="Konum" v={form.locationName || ''} f={(v) => setForm({ ...form, locationName: v })} />
            : <Edit label="Site" v={form.url || ''} f={(v) => setForm({ ...form, url: v })} />}
          <Edit label="Not" v={form.note || ''} f={(v) => setForm({ ...form, note: v })} />
        </View>
      ) : (
        <View style={s.fields}>
          <Row k="Kaynak" v={isStore ? (p.locationName || '—') : (p.url || '—')} />
          <Row k="Eklendi" v={new Date(p.createdAt + 'Z').toLocaleDateString('tr-TR')} />
          {p.note ? <Row k="Not" v={p.note} /> : null}
        </View>
      )}

      <Pressable style={[s.bought, p.bought && s.boughtOn]} onPress={toggleBought}>
        <Text style={[s.boughtTxt, p.bought && { color: '#fff' }]}>
          {p.bought ? '✓ Alındı — geri al' : '✓ Aldım olarak işaretle'}
        </Text>
      </Pressable>

      <Pressable style={s.del} onPress={remove}>
        <Text style={s.delTxt}>Sil</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ k, v }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldK}>{k}</Text>
      <Text style={s.fieldV} numberOfLines={2}>{v}</Text>
    </View>
  );
}

function Edit({ label, v, f, keyboard }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.fieldK}>{label}</Text>
      <TextInput style={s.input} value={v} onChangeText={f} keyboardType={keyboard || 'default'} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  photoWrap: { margin: 16, borderRadius: 20, overflow: 'hidden' },
  photo: { width: '100%', height: 280 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEBE2' },
  src: { position: 'absolute', top: 12, right: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, zIndex: 2 },
  srcTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingTop: 30, paddingHorizontal: 14, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
  },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2 },
  tag: { backgroundColor: C.tag, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  tagTxt: { fontWeight: '800', fontSize: 15, color: C.ink },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  btnDark: { flex: 1, backgroundColor: C.ink, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  btnDarkTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnGhost: { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  btnGhostTxt: { color: C.ink, fontWeight: '600', fontSize: 13 },
  fields: { paddingHorizontal: 16, paddingTop: 8 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#EEEBE2', paddingVertical: 11,
  },
  fieldK: { fontSize: 12, color: C.muted },
  fieldV: { fontSize: 13, color: C.ink, flexShrink: 1, textAlign: 'right' },
  input: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, marginTop: 6,
  },
  bought: {
    margin: 16, marginBottom: 8, backgroundColor: C.okBg, borderRadius: 13,
    paddingVertical: 13, alignItems: 'center',
  },
  boughtOn: { backgroundColor: C.ok },
  boughtTxt: { color: C.ok, fontWeight: '700', fontSize: 13 },
  tryon: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 4, backgroundColor: C.dark,
    borderRadius: 13, paddingVertical: 13, alignItems: 'center',
  },
  tryonTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  del: { alignItems: 'center', paddingVertical: 10 },
  delTxt: { color: '#C4402F', fontSize: 13, fontWeight: '600' },
});
