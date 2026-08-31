import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('gozkoydum.db');

let _ready = false;

export function initDb() {
  if (_ready) return;
  _ready = true;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL,
      currency TEXT DEFAULT '₺',
      category TEXT DEFAULT 'Diğer',
      type TEXT DEFAULT 'store',            -- 'store' | 'online'
      condition TEXT DEFAULT '0',           -- '0' (sıfır) | '2el' (ikinci el)
      url TEXT,
      locationName TEXT,
      lat REAL,
      lng REAL,
      photoUri TEXT,
      note TEXT,
      bought INTEGER DEFAULT 0,
      aiFilled INTEGER DEFAULT 0,
      tryonUri TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      k TEXT PRIMARY KEY,
      v TEXT
    );
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      height INTEGER,
      weight INTEGER,
      frontUri TEXT,
      backUri TEXT,
      sideUri TEXT
    );
  `);
  // Eski kurulumlara yeni sütunları ekle (migration)
  const cols = db.getAllSync("PRAGMA table_info(products)");
  if (!cols.some((c) => c.name === 'tryonUri')) {
    db.execSync('ALTER TABLE products ADD COLUMN tryonUri TEXT');
  }
  if (!cols.some((c) => c.name === 'condition')) {
    db.execSync("ALTER TABLE products ADD COLUMN condition TEXT DEFAULT '0'");
  }
}

// Kullanıcının kendi (üzerine giydirmek için) fotoğrafı — kalıcı ayar
export function getMyPhoto() {
  return db.getFirstSync("SELECT v FROM settings WHERE k='myPhoto'")?.v || null;
}

export function setMyPhoto(uri) {
  db.runSync(
    "INSERT INTO settings (k, v) VALUES ('myPhoto', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
    [uri]
  );
}

export function setTryon(id, uri) {
  db.runSync('UPDATE products SET tryonUri=? WHERE id=?', [uri, id]);
}

// Beden profili — boy/kilo + 3 sabit referans foto (önden/arkadan/yandan)
export function getProfile() {
  return db.getFirstSync('SELECT * FROM profile WHERE id=1') || null;
}

export function saveProfile(p) {
  db.runSync(
    `INSERT INTO profile (id, height, weight, frontUri, backUri, sideUri)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       height=excluded.height, weight=excluded.weight,
       frontUri=excluded.frontUri, backUri=excluded.backUri, sideUri=excluded.sideUri`,
    [p.height ?? null, p.weight ?? null, p.frontUri ?? null, p.backUri ?? null, p.sideUri ?? null]
  );
}

export function hasProfilePhoto() {
  const p = getProfile();
  return !!(p && (p.frontUri || p.backUri || p.sideUri));
}

export function setUrl(id, url) {
  db.runSync('UPDATE products SET url=? WHERE id=?', [url, id]);
}

// Kombin için: alınmış + göz koyulmuş her şey (foto var/yok fark etmez)
export function getWardrobe() {
  return db.getAllSync('SELECT * FROM products ORDER BY createdAt DESC');
}

export function addProduct(p) {
  const r = db.runSync(
    `INSERT INTO products (name, price, currency, category, type, condition, url, locationName, lat, lng, photoUri, note, aiFilled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.name, p.price ?? null, p.currency ?? '₺', p.category ?? 'Diğer', p.type ?? 'store',
     p.condition ?? '0', p.url ?? null, p.locationName ?? null, p.lat ?? null, p.lng ?? null,
     p.photoUri ?? null, p.note ?? null, p.aiFilled ? 1 : 0]
  );
  return r.lastInsertRowId;
}

export function getProducts(filter = 'all') {
  let where = '';
  if (filter === 'store') where = "WHERE type='store' AND bought=0";
  else if (filter === 'online') where = "WHERE type='online' AND bought=0";
  else if (filter === 'bought') where = 'WHERE bought=1';
  else where = 'WHERE bought=0';
  return db.getAllSync(`SELECT * FROM products ${where} ORDER BY createdAt DESC`);
}

export function getProduct(id) {
  return db.getFirstSync('SELECT * FROM products WHERE id=?', [id]);
}

export function updateProduct(id, p) {
  db.runSync(
    `UPDATE products SET name=?, price=?, currency=?, category=?, type=?, condition=?, url=?, locationName=?, note=? WHERE id=?`,
    [p.name, p.price ?? null, p.currency ?? '₺', p.category, p.type, p.condition ?? '0', p.url ?? null, p.locationName ?? null, p.note ?? null, id]
  );
}

export function setBought(id, v) {
  db.runSync('UPDATE products SET bought=? WHERE id=?', [v ? 1 : 0, id]);
}

export function deleteProduct(id) {
  db.runSync('DELETE FROM products WHERE id=?', [id]);
}

export function totalPrice(filter = 'all') {
  const rows = getProducts(filter);
  return rows.reduce((s, r) => s + (r.price || 0), 0);
}

// Modül yüklendiği an tabloları hazırla — herhangi bir sorgu atılmadan önce çalışsın
// (React'te child effect'leri App'in initDb effect'inden önce koşuyordu → "no such table").
initDb();
