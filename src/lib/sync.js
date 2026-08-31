// Fiyat takip sunucusuyla senkron — tamamen best-effort: sunucu yoksa/offline'sa sessiz geçer.
import * as Crypto from 'expo-crypto';
import { getSetting, setSetting, getProducts } from './db';

const API = process.env.EXPO_PUBLIC_TRACK_API; // ör. https://takip.pingiz.com

export function getDeviceId() {
  let id = getSetting('deviceId');
  if (!id) {
    id = Crypto.randomUUID();
    setSetting('deviceId', id);
  }
  return id;
}

async function post(path, body, method = 'POST') {
  if (!API) return null;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export async function registerDevice(pushToken) {
  try { await post('/register', { deviceId: getDeviceId(), pushToken }); } catch {}
}

// Alınmamış online ürünlerin tamamını sunucuya yollar (tam liste senkronu).
export async function syncTracked() {
  try {
    const items = getProducts('online').map((p) => ({
      localId: p.id, name: p.name, url: p.url, price: p.price,
    }));
    await post('/track', { deviceId: getDeviceId(), items }, 'PUT');
  } catch {}
}

// localId -> {lastPrice, dropped} haritası döner; hata/offline'da boş obje.
export async function fetchPrices() {
  if (!API) return {};
  try {
    const res = await fetch(`${API}/prices/${getDeviceId()}`);
    if (!res.ok) return {};
    const data = await res.json();
    return Object.fromEntries((data.items || []).map((i) => [i.localId, i]));
  } catch {
    return {};
  }
}
