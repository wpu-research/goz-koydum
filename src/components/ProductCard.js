import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../lib/theme';

export function priceText(p) {
  if (p.price == null) return 'Fiyat yok';
  return `${p.currency}${Number(p.price).toLocaleString('tr-TR')}`;
}

export default function ProductCard({ product, onPress }) {
  const isStore = product.type === 'store';
  return (
    <Pressable style={s.card} onPress={onPress}>
      {product.photoUri ? (
        <Image source={{ uri: product.photoUri }} style={s.photo} />
      ) : (
        <View style={[s.photo, s.noPhoto]}><Text style={{ fontSize: 40 }}>🛍️</Text></View>
      )}

      {product.aiFilled ? (
        <View style={s.badge}><Text style={s.badgeTxt}>✨ AI doldurdu</Text></View>
      ) : null}

      <View style={[s.src, { backgroundColor: isStore ? C.store : C.online }]}>
        <Text style={[s.srcTxt, !isStore && { color: C.onlineInk }]}>
          {isStore ? 'Mağaza' : 'Online'}
        </Text>
      </View>

      <LinearGradient colors={['transparent', 'rgba(20,16,33,0.88)']} style={s.overlay}>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{product.name}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {isStore
              ? `📍 ${product.locationName || 'Konum yok'}`
              : `🌐 ${product.url || 'Site yok'}`}
          </Text>
        </View>
        <View style={s.tag}>
          <View style={s.tagHole} />
          <Text style={s.tagTxt}>{priceText(product)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.card, elevation: 4,
    shadowColor: C.ink, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  photo: { width: '100%', height: 190 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEBE2' },
  badge: {
    position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  badgeTxt: { fontSize: 10, fontWeight: '600', color: C.ink },
  src: { position: 'absolute', top: 10, right: 10, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  srcTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingTop: 28, paddingHorizontal: 12, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
  },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meta: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 2 },
  tag: {
    backgroundColor: C.tag, borderRadius: 8, paddingVertical: 5,
    paddingLeft: 14, paddingRight: 10, flexDirection: 'row', alignItems: 'center',
  },
  tagHole: {
    position: 'absolute', left: 5, width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(28,24,38,0.35)',
  },
  tagTxt: { fontWeight: '800', fontSize: 13, color: C.ink },
});
