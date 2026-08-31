# 👁 Göz Koydum — v1

Beğendiğin ürünleri tek fotoğrafla kaydeden app. Fotoğrafını çek, gerisini AI halletsin.

## Kurulum

```bash
npm install
cp .env.example .env      # içine Gemini API key'ini yaz
npx expo start
```

- Gemini API key: https://aistudio.google.com/apikey (ücretsiz katman yeterli)
- Telefonda **Expo Go** app'iyle QR'ı okut, direkt çalışır.
- Kamera/konum izinleri ilk kullanımda sorulur.

## v1'de neler var

- 📸 Kamera veya galeriden ekleme (screenshot dahil)
- ✨ Gemini 2.0 Flash: ad, fiyat, kategori, mağaza/online tipi, site adresi otomatik
- 📍 Mağaza modunda GPS + adres (reverse geocode)
- 🏷️ Foto üzerine isim + sarı fiyat etiketi overlay
- 🔎 Filtreler: Tümü / Mağaza / Online / Aldıklarım + toplam tutar
- 🔗 Detay: siteye git / haritada aç, düzenle, aldım, sil
- 🗄️ Tamamen çevrimdışı SQLite — veri cihazda

## Sırada (v2/v3)

Share intent ile screenshot paylaşma → Dolabım → kombin motoru → 2. el satış.
