/**
 * Android'de telefonun rehber uygulamasında "Yeni kişi" ekranını, alanları doldurulmuş olarak açan
 * intent bağlantısı (ContactsContract.Intents.Insert). Dosya indirmeden doğrudan kayıt ekranı açılır.
 */
import { ORG } from '../config.js?v=12';
import { toE164 } from './phone.js?v=12';

const PHONE_TYPE_MOBILE = 2;
const PHONE_TYPE_WORK = 3;

// Intent bağlantısında ";" ve "=" ayırıcıdır; değerler kodlanarak eklenir.
const extra = (kind, key, value) => (value === '' || value === undefined ? '' : `${kind}.${key}=${encodeURIComponent(String(value))};`);

/**
 * @param {Record<string,string>} card
 * @param {string} fallbackUrl Rehber uygulaması açılamazsa gidilecek adres (dokunarak kaydetme sayfası)
 */
export function buildContactIntent(card, fallbackUrl) {
  const workPhone = card.company_phone ? `${toE164(card.company_phone)}${card.extension ? `,${card.extension}` : ''}` : '';
  const primaryPhone = card.mobile ? toE164(card.mobile) : workPhone;
  const secondaryPhone = card.mobile ? workPhone : '';
  const notes = [card.title_en, card.department, card.extension ? `Dahili: ${card.extension}` : '']
    .filter(Boolean).join('\n');

  return 'intent:#Intent;'
    + 'action=android.intent.action.INSERT;'
    + 'type=vnd.android.cursor.dir/raw_contact;'
    + extra('S', 'name', card.full_name)
    + extra('S', 'phone', primaryPhone)
    + (primaryPhone ? extra('i', 'phone_type', card.mobile ? PHONE_TYPE_MOBILE : PHONE_TYPE_WORK) : '')
    + extra('S', 'secondary_phone', secondaryPhone)
    + (secondaryPhone ? extra('i', 'secondary_phone_type', PHONE_TYPE_WORK) : '')
    + extra('S', 'email', card.email)
    + extra('S', 'company', ORG.name)
    + extra('S', 'job_title', card.title_tr)
    + extra('S', 'notes', notes)
    + extra('S', 'browser_fallback_url', fallbackUrl)
    + 'end';
}
