import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getProducts } from '../lib/db';
import ProductCard from '../components/ProductCard';
import { C } from '../lib/theme';

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'store', label: 'Mağaza' },
  { key: 'online', label: 'Online' },
  { key: 'bought', label: 'Aldıklarım' },
];

export default function HomeScreen({ navigation }) {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);

  useFocusEffect(useCallback(() => {
    setItems(getProducts(filter));
  }, [filter]));

  const total = items.reduce((s, r) => s + (r.price || 0), 0);

  return (
    <View style={s.root}>
      <View style={s.appbar}>
        <Text style={s.title}>👁 Göz Koydum</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable style={s.profBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={{ fontSize: 16 }}>🧍</Text>
        </Pressable>
        <View style={s.sum}>
          <Text style={s.sumTxt}>
            {filter === 'bought' ? 'Harcanan: ' : 'Liste: '}
            <Text style={s.sumVal}>₺{total.toLocaleString('tr-TR')}</Text>
          </Text>
        </View>
        </View>
      </View>

      <View style={s.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[s.f, filter === f.key && s.fOn]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.fTxt, filter === f.key && s.fTxtOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('Detail', { id: item.id })} />
        )}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 110 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 44 }}>📸</Text>
            <Text style={s.emptyT}>Liste boş</Text>
            <Text style={s.emptyS}>Beğendiğin ilk ürünün fotoğrafını çek — gerisini AI halleder.</Text>
          </View>
        }
      />

      <Pressable style={s.fabCombine} onPress={() => navigation.navigate('Combine')}>
        <Text style={s.fabCombineTxt}>🧩 Kombin</Text>
      </Pressable>

      <Pressable style={s.fab} onPress={() => navigation.navigate('Add')}>
        <Text style={s.fabTxt}>＋</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  appbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.ink },
  profBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  sum: { backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6 },
  sumTxt: { color: '#fff', fontSize: 12 },
  sumVal: { color: C.tag, fontWeight: '800' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  f: {
    borderWidth: 1.5, borderColor: C.line, borderRadius: 999,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  fOn: { backgroundColor: C.ink, borderColor: C.ink },
  fTxt: { fontSize: 12, color: C.muted },
  fTxtOn: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 90, paddingHorizontal: 40 },
  emptyT: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 10 },
  emptyS: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  fab: {
    position: 'absolute', right: 20, bottom: 28, width: 62, height: 62, borderRadius: 31,
    backgroundColor: C.tag, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: C.ink, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  fabTxt: { fontSize: 30, color: C.ink, fontWeight: '700', marginTop: -2 },
  fabCombine: {
    position: 'absolute', right: 20, bottom: 100, height: 44, borderRadius: 22,
    backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
    elevation: 5, shadowColor: C.ink, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabCombineTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
