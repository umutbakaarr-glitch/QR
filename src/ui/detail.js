/**
 * Kartvizit detayı: QR önizleme, indirme ve kayıt işlemleri.
 */
import { CARD_PAGE_PATH } from '../config.js';
import { encodeCard } from '../core/card-codec.js';
import { QR_TYPES, qrContent, toDataUrl, toPngBlob, toSvg } from '../core/qr.js';
import { slugify } from '../core/vcard.js';
import { $, $$, downloadBlob, escapeHtml, initials, openOverlay } from './dom.js';

const NOTES = {
  [QR_TYPES.card]: '<b>Kartvizit QR:</b> Okutulunca Canlar Group kartvizit sayfası açılır (Ara, E-posta, Rehbere ekle). '
    + 'Bilgiler QR\'ın içindedir ve hiçbir sunucuya gönderilmez. Bilgiler değişirse QR\'ı yeniden indirin.',
  [QR_TYPES.vcard]: '<b>Rehber QR:</b> Okutulunca telefon doğrudan "Kişiyi kaydet" ekranını açar. '
    + 'İnternet bağlantısı gerektirmez. Bilgiler değişirse QR\'ı yeniden indirin.',
};

let current = null;
let type = QR_TYPES.card;
let context = null;

const colorsOf = (card) => ({ fg: card.fg_color, bg: card.bg_color });
const contentOf = (card) => qrContent(card, type, context.cardPageUrl);
const fileName = (card, extension) => `qr-${slugify(card.full_name)}${type === QR_TYPES.vcard ? '-rehber' : ''}.${extension}`;

function renderQr() {
  $('#qrImage').src = toDataUrl(contentOf(current), colorsOf(current));
  $('#qrNote').innerHTML = NOTES[type];
  $('#openCard').classList.toggle('hidden', type !== QR_TYPES.card);
  $('#openCard').href = `${CARD_PAGE_PATH}#${encodeCard(current)}`;
}

function renderInfo(card) {
  const rows = [
    ['Adı soyadı', card.full_name],
    ['E-posta adresi', card.email],
    ['Türkçe ünvanı', card.title_tr],
    ['İngilizce ünvanı', card.title_en],
    ['Cep telefonu', card.mobile],
    ['Şirket telefonu', card.company_phone],
    ['Dahili telefon', card.extension],
    ['KVKK onayı', card.consent_at ? new Date(card.consent_at).toLocaleDateString('tr-TR') : ''],
    ['Birimi / Bölümü / Kısım Şefi', card.department, true],
  ];
  $('#detailInfo').innerHTML = rows.map(([label, value, full]) => `
    <div class="${full ? 'full' : ''}"><dt>${label}</dt><dd>${value ? escapeHtml(value) : '—'}</dd></div>`).join('');
}

/**
 * @param {{ cardPageUrl: string, onEdit: (card) => void, onDelete: (card) => Promise<void> }} options
 */
export function initDetail(options) {
  context = options;
  $('#qrType').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    type = button.dataset.type;
    $$('#qrType button').forEach((item) => item.classList.toggle('on', item === button));
    renderQr();
  });
  $('#pngBtn').addEventListener('click', async () => {
    downloadBlob(await toPngBlob(contentOf(current), colorsOf(current)), fileName(current, 'png'));
  });
  $('#svgBtn').addEventListener('click', () => {
    downloadBlob(new Blob([toSvg(contentOf(current), colorsOf(current))], { type: 'image/svg+xml' }), fileName(current, 'svg'));
  });
  $('#editBtn').addEventListener('click', () => context.onEdit(current));
  $('#deleteBtn').addEventListener('click', () => context.onDelete(current));
}

export function openDetail(card) {
  current = card;
  $('#detailAvatar').textContent = initials(card.full_name);
  $('#detailName').textContent = card.full_name;
  $('#detailTitle').textContent = [card.title_tr, card.title_en].filter(Boolean).join(' · ');
  renderInfo(card);
  renderQr();
  openOverlay('detail');
  $('#detail .drawer-body').scrollTop = 0;
}
