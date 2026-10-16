/**
 * Kalıcı (güncellenebilir) kartvizit QR'ı.
 *
 * Her kişiye bir kez rastgele bir kimlik (id) ve 256 bitlik bir anahtar (key) verilir.
 * QR bağlantısı yalnızca bunları taşır: kartvizit/#<id>.<key>
 * Kişi bilgileri, bu anahtarla AES-GCM ile şifrelenip depoya `kartvizit/k/<id>.json` olarak yazılır.
 * Bilgiler değiştiğinde aynı anahtarla yeniden şifrelenip aynı dosyaya yazılır; QR değişmez.
 * Anahtar yalnızca QR'da (bağlantının # sonrasında) bulunur ve sunucuya hiç gönderilmez.
 */
import { CARD_FIELDS, PUBLISH } from '../config.js?v=11';
import { fromBase64Url, importAesKey, open, randomBytes, seal, toBase64Url } from './crypto.js?v=11';

const FILE_VERSION = 1;
const ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Yeni kartvizit için kimlik ve anahtar üretir. */
export function createCardIdentity() {
  return { qr_id: toBase64Url(randomBytes(12)), qr_key: toBase64Url(randomBytes(32)) };
}

export const hasIdentity = (card) => ID_PATTERN.test(card?.qr_id ?? '') && KEY_PATTERN.test(card?.qr_key ?? '');

/** Depodaki dosya yolu. */
export const cardFilePath = (id) => `${PUBLISH.dir}/${id}.json`;

/** QR bağlantısının # sonrası. */
export const cardFragment = (card) => `${card.qr_id}.${card.qr_key}`;

/** "#<id>.<key>" biçimini çözer; değilse null. */
export function parseFragment(hash) {
  const [id, key, extra] = String(hash ?? '').replace(/^#/, '').split('.');
  if (extra !== undefined || !ID_PATTERN.test(id ?? '') || !KEY_PATTERN.test(key ?? '')) return null;
  return { id, key };
}

/** Kartviziti kişiye özel anahtarla şifreleyip dosya içeriği üretir. */
export async function encryptCardFile(card) {
  const key = await importAesKey(fromBase64Url(card.qr_key));
  const fields = Object.fromEntries(CARD_FIELDS.map((field) => [field, card[field] ?? '']));
  return `${JSON.stringify({ v: FILE_VERSION, d: await seal(key, JSON.stringify(fields)) })}\n`;
}

/** Dosya içeriğini anahtarla çözer; anahtar yanlışsa veya dosya bozuksa hata fırlatır. */
export async function decryptCardFile(text, keyText) {
  const file = JSON.parse(text);
  if (file?.v !== FILE_VERSION || typeof file.d !== 'string') throw new Error('Geçersiz kartvizit dosyası.');
  const key = await importAesKey(fromBase64Url(keyText));
  const fields = JSON.parse(await open(key, file.d));
  const card = {};
  CARD_FIELDS.forEach((field) => { card[field] = typeof fields[field] === 'string' ? fields[field].slice(0, 200) : ''; });
  return card;
}
