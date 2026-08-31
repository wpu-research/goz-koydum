const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const PROMPT = `Bu görsel ya bir mağazada çekilmiş ürün fotoğrafı ya da bir alışveriş sitesinin ekran görüntüsü.
Görüntüden şu bilgileri çıkar ve SADECE geçerli JSON döndür, başka hiçbir şey yazma:
{
  "name": "ürünün adı (marka + model, kısa)",
  "price": fiyat sayı olarak (bulamazsan null),
  "currency": "₺ / $ / € (bulamazsan ₺)",
  "category": "Giyim | Ayakkabı | Aksesuar | Elektronik | Ev | Kozmetik | Spor | Diğer",
  "type": "screenshot ise (site arayüzü, fiyat etiketi, sepet butonu görünüyorsa) 'online', gerçek mekanda çekilmiş fotoğrafsa 'store'",
  "url": "ürünün TAM linki görünüyorsa (adres çubuğu / paylaş linki) tümünü yaz (ör. https://www.trendyol.com/marka/urun-p-12345); tam link yoksa sadece site domaini (ör. trendyol.com); hiçbiri yoksa null",
  "note": "kayda değer kısa bir detay varsa (indirim, beden, renk), yoksa null"
}`;

const TEXT_MODEL = 'gemini-3.6-flash';
const TRYON_MODEL = 'gemini-3.1-flash-image'; // güncel "Nano Banana" görsel modeli

async function callText(body) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Gemini (${res.status}): ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

// Ürün adı + domain'den GERÇEK ürün sayfası linkini (Google Search grounding ile) bulur.
// Bulamazsa null döner — çağıran taraf sessizce yutmalı (best-effort).
export async function resolveProductUrl(name, domain) {
  if (!KEY || KEY === 'BURAYA_KEYINI_YAPISTIR' || !name) return null;
  const site = (domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const q = site
    ? `"${name}" ürününün ${site} sitesindeki doğrudan ürün sayfasının tam URL'sini bul.`
    : `"${name}" ürününü satan güvenilir bir Türk e-ticaret sitesindeki doğrudan ürün sayfasının tam URL'sini bul.`;
  try {
    const text = await callText({
      contents: [{ parts: [{ text: `${q} SADECE tek bir tam https URL yaz, başka hiçbir şey yazma. Bulamazsan "yok" yaz.` }] }],
      tools: [{ google_search: {} }],
    });
    const m = text.match(/https?:\/\/[^\s"'<>）)]+/);
    if (!m) return null;
    let url = m[0].replace(/[.,;]+$/, '');
    if (site && !url.includes(site)) return null; // yanlış siteye kaçmasın
    return url;
  } catch {
    return null;
  }
}

const OUTFIT_PROMPT = (concept, items) => `Bir kişisel stilistsin. Kullanıcının gardırobundaki parçalar (JSON):
${JSON.stringify(items)}

"${concept}" konseptine uygun 2-3 kombin öner. SADECE geçerli JSON döndür:
{
  "outfits": [
    {
      "title": "kısa kombin adı",
      "itemIds": [kombine giren parçaların id'leri, gardırodakilerden],
      "vibe": "kombin neden çalışıyor, 1 cümle",
      "missing": "kombini tamamlamak için eksik bir parça önerisi (kategori + kısa tarif), gerek yoksa null"
    }
  ]
}
Kurallar: itemIds SADECE yukarıdaki listede olan id'ler olsun. En az 2 parça kullan. Konsepte uymayan parçaları katma.`;

export async function suggestOutfits(items, concept) {
  if (!KEY || KEY === 'BURAYA_KEYINI_YAPISTIR') {
    throw new Error('Gemini API anahtarı eksik.');
  }
  if (!items || items.length < 2) {
    throw new Error('Kombin için en az 2 ürün gerekli. Önce birkaç parça ekle.');
  }
  const slim = items.map((i) => ({ id: i.id, name: i.name, category: i.category, note: i.note || undefined }));
  const text = await callText({
    contents: [{ parts: [{ text: OUTFIT_PROMPT(concept, slim) }] }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.7 },
  });
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  const valid = new Set(items.map((i) => i.id));
  return (parsed.outfits || [])
    .map((o) => ({ ...o, itemIds: (o.itemIds || []).filter((id) => valid.has(id)) }))
    .filter((o) => o.itemIds.length >= 1);
}

function tryonPrompt(opts) {
  const { category, size, height, weight, refs } = opts;
  const item = {
    'Ayakkabı': 'the shoes/footwear',
    'Aksesuar': 'the accessory (bag, hat, jewelry, etc.)',
  }[category] || 'the clothing item / outfit';

  // Referans fotoların hangi açılardan geldiğini açıkla
  const refLines = refs.map((r, i) => `- Reference photo ${i + 1}: ${r.label} view of the person.`).join('\n');
  const body = [
    height ? `${height} cm tall` : null,
    weight ? `${weight} kg` : null,
  ].filter(Boolean).join(', ');
  const sizeLine = size
    ? `The garment size is ${size}. Make it drape and fit realistically as a real ${size} ${category === 'Ayakkabı' ? 'shoe' : 'garment'} would fit this exact body — correct looseness/tightness, sleeve and hem length.`
    : `Fit the product realistically to this body.`;

  return `You are a photorealistic virtual try-on engine.
The following reference photos all show the SAME real person from different angles:
${refLines}
The LAST image is a product: ${item}.

Body info: ${body || 'not specified'}.
${sizeLine}

Generate ONE photorealistic front-facing image of this exact person now wearing ${item} from the product image.
Rules:
- Keep the person's identity EXACTLY: same face, skin tone, hair, and body proportions implied by the reference photos and body info. Never invent a different person.
- Use the multiple angles only to understand their body; output a single natural front view on a clean neutral studio background.
- Product must match the reference product's color, pattern and details, with correct scale, folds, shadows and lighting.
- Output ONLY the final image, no text.`;
}

async function callImage(reqParts) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TRYON_MODEL}:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: reqParts }],
        generationConfig: { responseModalities: ['IMAGE'], temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429 && /limit: 0/.test(t)) {
      throw new Error('Görsel üretimi bu API anahtarında kapalı (ücretsiz katman limiti 0). Google Cloud projende faturalandırmayı açman gerekiyor.');
    }
    throw new Error(`Gemini görsel hatası (${res.status}): ${t.slice(0, 180)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData || p.inline_data);
  const b64 = img?.inlineData?.data || img?.inline_data?.data;
  if (!b64) {
    const txt = parts.map((p) => p.text || '').join(' ').slice(0, 160);
    throw new Error('Model görsel döndürmedi.' + (txt ? ` (${txt})` : ''));
  }
  return b64;
}

// Beden profili (refs: [{label, base64}]) + ürün fotosu ile giydirir. Dönen: base64.
export async function generateTryOn({ refs, garmentBase64, category, size, height, weight }) {
  if (!KEY || KEY === 'BURAYA_KEYINI_YAPISTIR') {
    throw new Error('Gemini API anahtarı eksik. .env dosyasına EXPO_PUBLIC_GEMINI_API_KEY ekle.');
  }
  if (!refs || !refs.length) throw new Error('Beden profili fotoğrafı yok.');

  const reqParts = [{ text: tryonPrompt({ category, size, height, weight, refs }) }];
  for (const r of refs) reqParts.push({ inline_data: { mime_type: 'image/jpeg', data: r.base64 } });
  reqParts.push({ inline_data: { mime_type: 'image/jpeg', data: garmentBase64 } });
  return callImage(reqParts);
}

// Komple kombin giydirme: refs + birden çok parça görseli. Dönen: base64.
export async function generateOutfitTryOn({ refs, garments, height, weight }) {
  if (!KEY || KEY === 'BURAYA_KEYINI_YAPISTIR') {
    throw new Error('Gemini API anahtarı eksik. .env dosyasına EXPO_PUBLIC_GEMINI_API_KEY ekle.');
  }
  if (!refs || !refs.length) throw new Error('Beden profili fotoğrafı yok.');
  if (!garments || !garments.length) throw new Error('Kombinde fotoğraflı parça yok.');

  const refLines = refs.map((r, i) => `- Reference photo ${i + 1}: ${r.label} view of the person.`).join('\n');
  const itemLines = garments.map((g, i) => `- Product photo ${i + 1}: ${g.name || g.category || 'item'} (${g.category || 'clothing'})`).join('\n');
  const body = [height ? `${height} cm tall` : null, weight ? `${weight} kg` : null].filter(Boolean).join(', ');

  const prompt = `You are a photorealistic virtual try-on engine.
The first ${refs.length} image(s) all show the SAME real person from different angles:
${refLines}
The remaining ${garments.length} image(s) are products forming ONE complete outfit:
${itemLines}

Body info: ${body || 'not specified'}.

Generate ONE photorealistic front-facing image of this exact person wearing ALL of these products TOGETHER as a complete outfit.
Rules:
- Keep the person's identity EXACTLY: same face, skin tone, hair, and body proportions. Never invent a different person.
- Every product must appear, matching its reference color, pattern and details, with realistic fit, folds, shadows and lighting.
- Single natural front view on a clean neutral studio background.
- Output ONLY the final image, no text.`;

  const reqParts = [{ text: prompt }];
  for (const r of refs) reqParts.push({ inline_data: { mime_type: 'image/jpeg', data: r.base64 } });
  for (const g of garments) reqParts.push({ inline_data: { mime_type: 'image/jpeg', data: g.base64 } });
  return callImage(reqParts);
}

export async function analyzeProductImage(base64) {
  if (!KEY || KEY === 'BURAYA_KEYINI_YAPISTIR') {
    throw new Error('Gemini API anahtarı eksik. .env dosyasına EXPO_PUBLIC_GEMINI_API_KEY ekle.');
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini hatası (${res.status}): ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return {
    name: parsed.name || 'Ürün',
    price: typeof parsed.price === 'number' ? parsed.price : null,
    currency: parsed.currency || '₺',
    category: parsed.category || 'Diğer',
    type: parsed.type === 'online' ? 'online' : 'store',
    url: parsed.url || null,
    note: parsed.note || null,
  };
}
