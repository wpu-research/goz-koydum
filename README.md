# 👁 Göz Koydum — v2

Beğendiğin ürünleri tek fotoğrafla kaydeden app. Fotoğrafını çek, gerisini AI halletsin.

## Kurulum

```bash
npm install
cp .env.example .env      # içine Gemini API key'ini yaz
npx expo start
```

- Gemini API key: https://aistudio.google.com/apikey (ücretsiz katman metin analizi için yeterli; **Üzerinde dene** görsel üretimi faturalandırma açık proje ister)
- Telefonda **Expo Go** app'iyle QR'ı okut, direkt çalışır.
- Kamera/konum izinleri ilk kullanımda sorulur.

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

### Satış/bulma kanalları (kısmen — bkz. Sırada)
- `src/lib/market.js`: sıfır için Trendyol/Hepsiburada/Amazon/n11 araması; 2. el için Dolap/letgo/sahibinden arama + ilan verme linkleri

## Sırada (v3)

- Detay ekranında kanal butonları (market.js hazır, UI bağlanacak)
- Share intent ile screenshot'ı doğrudan app'e paylaşma
- 2. el satış akışı ("aldım"ları Dolap/sahibinden'de sat)
- Fiyat takibi / indirim bildirimi
