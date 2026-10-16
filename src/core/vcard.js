/**
 * vCard 3.0 üretimi ("Rehbere ekle" dosyası ve Rehber QR içeriği).
 */
import { ORG } from '../config.js?v=12';
import { toE164 } from './phone.js?v=12';

const escapeValue = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/([,;])/g, '\\$1');

function splitName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] ?? '', last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** @param {Record<string,string>} card */
export function buildVCard(card) {
  const { first, last } = splitName(card.full_name);
  const titles = [card.title_tr, card.title_en].filter(Boolean).join(' / ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N;CHARSET=UTF-8:${escapeValue(last)};${escapeValue(first)};;;`,
    `FN;CHARSET=UTF-8:${escapeValue(card.full_name)}`,
    `ORG;CHARSET=UTF-8:${escapeValue(ORG.name)}${card.department ? `;${escapeValue(card.department)}` : ''}`,
  ];
  if (titles) lines.push(`TITLE;CHARSET=UTF-8:${escapeValue(titles)}`);
  if (card.mobile) lines.push(`TEL;TYPE=CELL:${toE164(card.mobile)}`);
  if (card.company_phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${toE164(card.company_phone)}${card.extension ? `,${card.extension}` : ''}`);
  }
  if (card.extension) lines.push(`NOTE;CHARSET=UTF-8:${escapeValue(`Dahili: ${card.extension}`)}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${card.email}`);
  lines.push(`URL:${ORG.site}`, 'END:VCARD');
  return lines.join('\r\n');
}

/** Dosya adı için Türkçe karakterleri sadeleştirir: "Ayşe Yılmaz" -> "ayse-yilmaz". */
export function slugify(text, fallback = 'kartvizit') {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  const slug = String(text ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (ch) => map[ch])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
}
