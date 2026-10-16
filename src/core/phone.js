/**
 * Telefon numarası yardımcıları (Türkiye öncelikli).
 */

/** Numarayı uluslararası biçime çevirir: "0532 123 45 67" -> "+905321234567". */
export function toE164(raw) {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return digits;
}

/** Görüntüleme biçimi: "+90 532 123 45 67". Tanınmayan numaralar olduğu gibi döner. */
export function formatPhone(raw) {
  const match = toE164(raw).match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return match ? `+90 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : String(raw ?? '').trim();
}

/** Yalnızca rakam, boşluk, parantez, + ve - içeren 10-15 haneli numaraları kabul eder. */
export function isValidPhone(raw) {
  const value = String(raw ?? '');
  const length = toE164(value).replace(/\D/g, '').length;
  return /^[\d\s()+-]+$/.test(value) && length >= 10 && length <= 15;
}

/** Dahili numarayla birlikte aranacak tel: bağlantısı (virgül = kısa bekleme). */
export function telHref(raw, extension = '') {
  return `tel:${toE164(raw)}${extension ? `,${extension}` : ''}`;
}
