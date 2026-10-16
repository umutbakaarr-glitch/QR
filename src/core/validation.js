/**
 * Kartvizit verisinin temizlenmesi ve doğrulanması.
 */
import { CARD_FIELDS } from '../config.js?v=11';
import { isValidPhone } from './phone.js?v=11';

const MAX_LENGTH = Object.freeze({
  full_name: 100,
  title_tr: 120,
  title_en: 120,
  mobile: 25,
  company_phone: 25,
  extension: 6,
  email: 120,
  department: 200,
});

const COLOR = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export const DEFAULT_COLORS = Object.freeze({ fg: '#1d1d1b', bg: '#ffffff' });

/**
 * Girdiyi temizler ve doğrular.
 * @param {object} input
 * @param {{ requireConsent?: boolean }} [options] Önceki sürümlerden aktarılan kayıtlarda onay zorunlu tutulmaz.
 * @returns {{ data: object, errors: string[] }}
 */
export function validateCard(input, { requireConsent = true } = {}) {
  const data = {};
  const errors = [];

  for (const field of CARD_FIELDS) {
    data[field] = String(input?.[field] ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_LENGTH[field]);
  }

  if (!data.full_name) errors.push('Adı soyadı gerekli.');
  if (!data.title_tr) errors.push('Türkçe ünvan gerekli.');
  if (!data.title_en) errors.push('İngilizce ünvan gerekli.');
  if (!data.email) errors.push('E-posta adresi gerekli.');
  else if (!EMAIL.test(data.email)) errors.push('Geçerli bir e-posta adresi girin.');
  else data.email = data.email.toLowerCase();
  if (!data.department) errors.push('Birimi / Bölümü bilgisi gerekli.');
  if (data.mobile && !isValidPhone(data.mobile)) errors.push('Cep telefonu geçersiz (ör. 0532 123 45 67).');
  if (data.company_phone && !isValidPhone(data.company_phone)) errors.push('Şirket telefonu geçersiz (ör. 0212 123 45 67).');
  if (data.extension && !/^\d{2,6}$/.test(data.extension)) errors.push('Dahili telefon 2-6 haneli bir numara olmalı.');

  data.fg_color = COLOR.test(input?.fg_color) ? input.fg_color : DEFAULT_COLORS.fg;
  data.bg_color = COLOR.test(input?.bg_color) ? input.bg_color : DEFAULT_COLORS.bg;

  // KVKK: kişinin bilgilendirildiği ve onay verdiği an kaydedilir.
  data.consent_at = typeof input?.consent_at === 'string' && input.consent_at ? input.consent_at : '';
  if (requireConsent && !data.consent_at) errors.push('Kişinin bilgilendirildiğini ve onay verdiğini işaretleyin.');

  return { data, errors };
}
