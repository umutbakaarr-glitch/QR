/**
 * Kartvizit bilgilerini QR bağlantısına gömmek için kodlar / çözer.
 *
 * Bilgiler bağlantının "#" işaretinden sonraki kısmında taşınır. Tarayıcılar bu kısmı
 * sunucuya hiçbir zaman göndermez; bu nedenle kişisel veriler barındırma sunucusunun
 * kayıtlarına düşmez.
 *
 * Biçim: base64url( JSON.stringify([CODEC_VERSION, ...CARD_FIELDS değerleri]) )
 */
import { CARD_FIELDS, CODEC_VERSION } from '../config.js?v=9';

const MAX_ENCODED_LENGTH = 2000;

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  let base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

/** @param {Record<string,string>} card */
export function encodeCard(card) {
  const values = [CODEC_VERSION, ...CARD_FIELDS.map((field) => String(card[field] ?? '').trim())];
  while (values.length > 2 && values[values.length - 1] === '') values.pop();
  return toBase64Url(new TextEncoder().encode(JSON.stringify(values)));
}

/** @returns {Record<string,string>|null} Geçersiz veya bozuk girdide null. */
export function decodeCard(encoded) {
  const text = String(encoded ?? '').replace(/^#/, '');
  if (!text || text.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const values = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(text)));
    if (!Array.isArray(values) || values[0] !== CODEC_VERSION) return null;
    const card = {};
    CARD_FIELDS.forEach((field, index) => {
      const value = values[index + 1];
      card[field] = typeof value === 'string' ? value.slice(0, 200) : '';
    });
    return card;
  } catch {
    return null;
  }
}
