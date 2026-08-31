# 👁 Göz Koydum — v3

Beğendiğin ürünleri tek fotoğrafla kaydeden app. Fotoğrafını çek, gerisini AI halletsin.

## Kurulum

```bash
npm install
cp .env.example .env      # Gemini key + (opsiyonel) fiyat takip API adresi
npx expo prebuild --platform android
npx expo run:android      # dev build — share intent ve push bildirimleri için gerekli
```

- Gemini API key: https://aistudio.google.com/apikey (ücretsiz katman metin analizi için yeterli; **Üzerinde dene** görsel üretimi faturalandırma açık proje ister)
- v3 itibarıyla **development build** gerekir (share intent + push, Expo Go'da çalışmaz). Share intent'siz hızlı deneme için `npx expo start` + Expo Go hâlâ iş görür.
- Kamera/konum/bildirim izinleri ilk kullanımda sorulur.

## Özellikler

### Yakala & listele (v1)
- 📸 Kamera veya galeriden ekleme (screenshot dahil)
- ✨ Gemini Flash: ad, fiyat, kategori, mağaza/online tipi, sıfır/2. el durumu, site adresi otomatik
- 📍 Mağaza modunda GPS + adres (reverse geocode)
- 🏷️ Foto üzerine isim + sarı fiyat etiketi overlay
- 🔎 Filtreler: Tümü / Mağaza / Online / Aldıklarım + toplam tutar
- 🔗 Detay: siteye git / haritada aç, düzenle, aldım, sil
- 🌐 Online üründe tam link yoksa arka planda Google Search grounding ile gerçek ürün sayfası bulunur
- 🗄️ Tamamen çevrimdışı SQLite — veri cihazda

### Üzerinde dene (v2)
- 🧍 Beden profili: boy, kilo + 3 açıdan (ön/arka/yan) referans foto — bir kez kurulur
- 👗 Giyim/Ayakkabı/Aksesuar ürünlerini Gemini görsel modeliyle (Nano Banana) üzerine giydirme
- 📏 Beden/numara seçimi — kalıp gerçekçi otursun diye prompt'a yedirilir
- 💾 Üretilen görsel ürüne kaydedilir, tekrar girince görünür

### Kombin (v2)
- 🧩 Gardıroptaki parçalardan (göz koyulan + alınan) konsepte göre 2-3 kombin: Günlük / İş / Gece / Spor / Özel gün
- Her kombinde: kullanılan parçalar, neden çalıştığı, eksik parça önerisi

### Satış/bulma kanalları (v3)
- Detayda sıfır ürünler için Trendyol/Hepsiburada/Amazon/n11'de arama, 2. el için Dolap/letgo/sahibinden'de arama
- Alınmış ürünlerde "2. elde sat" — Dolap/letgo/sahibinden'de ilan verme linkleri

### Share intent (v3)
- Alışveriş sitesinde screenshot al → Paylaş → **Göz Koydum** → Ürün ekle ekranı fotoğrafla açılır, AI doldurur

### Kombin komple giydirme (v3)
- Kombin kartındaki "Komple giydir" ile önerilen kombinin TAMAMI beden profiline tek görselde giydirilir

### Fiyat takibi (v3 — sunuculu)
- `server/`: Express + SQLite + cron servisi (Coolify'a Dockerfile ile deploy edilir)
- Online ürünler sunucuya senkronlanır; günlük cron Gemini Search grounding ile güncel fiyat sorar
- ≥%5 düşüşte Expo push bildirimi; ana listede yeşil "↓ fiyat" rozeti, detayda güncel fiyat satırı
- App tarafı `.env` → `EXPO_PUBLIC_TRACK_API`; sunucu env: `GEMINI_API_KEY`, `CRON_SECRET` (opsiyonel), `DB_PATH`
- Sunucu yoksa app tamamen normal çalışır (senkron sessizce atlanır)

## Sırada (v4)

- Fiyat geçmişi grafiği
- Kombin sonucunu kaydetme/paylaşma
- iOS build
