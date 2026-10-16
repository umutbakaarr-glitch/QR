/**
 * Şifreleme yardımcıları (Web Crypto API).
 *  - Anahtar türetme: PBKDF2-SHA256
 *  - Şifreleme: AES-GCM 256, her kayıtta rastgele 12 baytlık IV
 * Paketlenmiş veri biçimi: base64( IV(12) || şifreli metin + etiket )
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const toBase64 = (bytes) => {
  let binary = '';
  new Uint8Array(bytes).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

export const fromBase64 = (text) => Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0));

export const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/**
 * Paroladan dışa aktarılamayan bir AES-GCM anahtarı türetir.
 * @param {string} secret
 * @param {{ salt: string, iterations: number }} params salt base64 biçimindedir
 */
export async function deriveKey(secret, { salt, iterations }) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Metni şifreler ve paketler. */
export async function seal(key, plainText) {
  const iv = randomBytes(12);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText)));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv);
  packed.set(cipher, iv.length);
  return toBase64(packed);
}

/** Paketi çözer; anahtar yanlışsa veya veri değiştirilmişse hata fırlatır. */
export async function open(key, packedText) {
  const packed = fromBase64(packedText);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packed.slice(0, 12) }, key, packed.slice(12));
  return decoder.decode(plain);
}

/** base64url (URL'de güvenle taşınabilen base64). */
export const toBase64Url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function fromBase64Url(text) {
  let base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return fromBase64(base64);
}

/** Ham baytlardan AES-GCM anahtarı oluşturur (kişiye özel kartvizit anahtarı için). */
export const importAesKey = (bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
