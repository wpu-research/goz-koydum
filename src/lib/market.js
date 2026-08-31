// Satış / bulma kanalları. Büyük sitelerde doğrudan arama URL'si; oynak olanlarda
// (letgo, sahibinden web araması güvenilmez) Google site: araması fallback.

const q = (name) => encodeURIComponent((name || '').trim());
const g = (name, domain) => `https://www.google.com/search?q=${q(name)}%20site:${domain}`;

// Sıfır (0) ürün — yeni satan pazaryerleri. (GittiGidiyor 2024'te kapandı, yok.)
export const NEW_CHANNELS = [
  { key: 'trendyol', label: 'Trendyol', search: (n) => `https://www.trendyol.com/sr?q=${q(n)}` },
  { key: 'hepsiburada', label: 'Hepsiburada', search: (n) => `https://www.hepsiburada.com/ara?q=${q(n)}` },
  { key: 'amazon', label: 'Amazon', search: (n) => `https://www.amazon.com.tr/s?k=${q(n)}` },
  { key: 'n11', label: 'n11', search: (n) => `https://www.n11.com/arama?q=${q(n)}` },
];

// 2. el — hem aramak hem de kendin satmak (ilan vermek) için.
export const USED_CHANNELS = [
  { key: 'dolap', label: 'Dolap', search: (n) => `https://dolap.com/ara?q=${q(n)}`, sell: 'https://dolap.com' },
  { key: 'letgo', label: 'letgo', search: (n) => g(n, 'letgo.com'), sell: 'https://www.letgo.com' },
  { key: 'sahibinden', label: 'sahibinden', search: (n) => g(n, 'sahibinden.com'), sell: 'https://www.sahibinden.com/ilan-ver' },
];
