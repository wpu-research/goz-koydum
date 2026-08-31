// Göz Koydum fiyat takip servisi.
// Cihazlar online ürünlerini senkronlar; günlük cron Gemini Search grounding ile
// güncel fiyat sorar, düşüş varsa Expo push bildirimi atar.

const express = require('express');
const Database = require('better-sqlite3');
const cron = require('node-cron');

const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET || null; // /run-check'i elle tetiklemek için
const DROP_THRESHOLD = 0.05; // %5

const db = new Database(process.env.DB_PATH || '/data/tracker.db');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    deviceId TEXT PRIMARY KEY,
    pushToken TEXT,
    updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS items (
    deviceId TEXT NOT NULL,
    localId INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    basePrice REAL,
    lastPrice REAL,
    lastCheckedAt TEXT,
    PRIMARY KEY (deviceId, localId)
  );
`);

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/register', (req, res) => {
  const { deviceId, pushToken } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'deviceId gerekli' });
  db.prepare(`
    INSERT INTO devices (deviceId, pushToken, updatedAt) VALUES (?, ?, datetime('now'))
    ON CONFLICT(deviceId) DO UPDATE SET pushToken=excluded.pushToken, updatedAt=datetime('now')
  `).run(deviceId, pushToken || null);
  res.json({ ok: true });
});

// Cihazın online ürünlerini TAM listeyle senkronlar — listede olmayan kayıtlar silinir.
app.put('/track', (req, res) => {
  const { deviceId, items } = req.body || {};
  if (!deviceId || !Array.isArray(items)) return res.status(400).json({ error: 'deviceId ve items gerekli' });
  const tx = db.transaction(() => {
    const keep = items.map((i) => i.localId).filter((x) => x != null);
    if (keep.length) {
      db.prepare(
        `DELETE FROM items WHERE deviceId=? AND localId NOT IN (${keep.map(() => '?').join(',')})`
      ).run(deviceId, ...keep);
    } else {
      db.prepare('DELETE FROM items WHERE deviceId=?').run(deviceId);
    }
    const up = db.prepare(`
      INSERT INTO items (deviceId, localId, name, url, basePrice)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(deviceId, localId) DO UPDATE SET name=excluded.name, url=excluded.url, basePrice=excluded.basePrice
    `);
    for (const i of items) {
      if (i.localId == null || !i.name) continue;
      up.run(deviceId, i.localId, i.name, i.url || null, i.price ?? null);
    }
  });
  tx();
  res.json({ ok: true, tracked: items.length });
});

app.get('/prices/:deviceId', (req, res) => {
  const rows = db.prepare('SELECT localId, basePrice, lastPrice, lastCheckedAt FROM items WHERE deviceId=?')
    .all(req.params.deviceId);
  res.json({
    items: rows.map((r) => ({
      ...r,
      dropped: r.basePrice != null && r.lastPrice != null && r.lastPrice < r.basePrice * (1 - DROP_THRESHOLD),
    })),
  });
});

// --- fiyat kontrolü ---

async function fetchPrice(name, url) {
  if (!GEMINI_KEY) return null;
  const site = (url || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const q = site
    ? `"${name}" ürününün ${site} sitesindeki GÜNCEL satış fiyatını bul.`
    : `"${name}" ürününün Türkiye'deki güncel en düşük satış fiyatını bul.`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${q} SADECE sayıyı yaz (TL, binlik ayraçsız, ondalık nokta). Bulamazsan "yok" yaz.` }] }],
        tools: [{ google_search: {} }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  // "12.499,90" / "12499.90" / "12499" hepsini yakala, TR binlik/ondalık ayracını normalize et
  const m = text.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/);
  if (!m) return null;
  let n = m[0];
  const lastSep = Math.max(n.lastIndexOf('.'), n.lastIndexOf(','));
  if (lastSep > -1 && n.length - lastSep - 1 <= 2) {
    n = n.slice(0, lastSep).replace(/[.,]/g, '') + '.' + n.slice(lastSep + 1);
  } else {
    n = n.replace(/[.,]/g, '');
  }
  const v = parseFloat(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function sendPush(token, title, body) {
  if (!token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  }).catch(() => {});
}

async function runCheck() {
  const items = db.prepare('SELECT * FROM items WHERE name IS NOT NULL').all();
  const tokens = Object.fromEntries(db.prepare('SELECT deviceId, pushToken FROM devices').all()
    .map((d) => [d.deviceId, d.pushToken]));
  let checked = 0;
  for (const it of items) {
    let price = null;
    try { price = await fetchPrice(it.name, it.url); } catch (e) { console.error('fiyat hatası', it.name, e.message); continue; }
    checked++;
    if (price == null) continue;
    const prev = it.lastPrice ?? it.basePrice;
    db.prepare("UPDATE items SET lastPrice=?, lastCheckedAt=datetime('now') WHERE deviceId=? AND localId=?")
      .run(price, it.deviceId, it.localId);
    if (it.basePrice != null && price < it.basePrice * (1 - DROP_THRESHOLD) && (prev == null || price < prev)) {
      await sendPush(
        tokens[it.deviceId],
        '👁 Fiyat düştü!',
        `${it.name}: ₺${it.basePrice} → ₺${price}`
      );
    }
    await new Promise((r) => setTimeout(r, 3000)); // Gemini rate limit'e nazik davran
  }
  console.log(`kontrol bitti: ${checked}/${items.length}`);
}

// Elle tetikleme (test): POST /run-check  (CRON_SECRET tanımlıysa ?secret= ile)
app.post('/run-check', (req, res) => {
  if (CRON_SECRET && req.query.secret !== CRON_SECRET) return res.status(403).json({ error: 'yasak' });
  runCheck().catch((e) => console.error(e));
  res.json({ ok: true, started: true });
});

cron.schedule('0 9 * * *', () => runCheck().catch((e) => console.error(e)), { timezone: 'Europe/Istanbul' });

app.listen(PORT, () => console.log(`fiyat takip servisi :${PORT}`));
