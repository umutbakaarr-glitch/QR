/**
 * Kartvizit detayı: QR önizleme, indirme ve kayıt işlemleri.
 */
import { CARD_PAGE_PATH } from '../config.js?v=11';
import { encodeCard } from '../core/card-codec.js?v=11';
import { cardFragment } from '../core/card-file.js?v=11';
import { CardStore } from '../core/store.js?v=11';
import { QR_TYPES, qrContent, toDataUrl, toPngBlob, toSvg } from '../core/qr.js?v=11';
import { slugify } from '../core/vcard.js?v=11';
import { $, $$, downloadBlob, escapeHtml, initials, openOverlay } from './dom.js?v=11';
import { isConnected } from './publish.js?v=11';

const NOTES = {
  [QR_TYPES.card]: '<b>Kartvizit QR:</b> Bu QR kişiye özeldir ve değişmez. Bilgileri güncellediğinizde aynı QR '
    + 'yeni bilgileri gösterir; yeniden basmanız gerekmez. Bilgiler kişiye özel anahtarla şifreli yayınlanır.',
  [QR_TYPES.vcard]: '<b>Rehber QR:</b> Okutulunca doğrudan "Rehbere kaydet" ekranı açılır. Bu QR da kişiye özeldir ve '
    + 'değişmez; bilgileri güncellediğinizde aynı QR yeni bilgileri kaydettirir.',
};

let current = null;
let type = QR_TYPES.card;
let context = null;

const colorsOf = (card) => ({ fg: card.fg_color, bg: card.bg_color });
const contentOf = (card) => qrContent(card, type, context.cardPageUrl);
const fileName = (card, extension) => `qr-${slugify(card.full_name)}${type === QR_TYPES.vcard ? '-rehber' : ''}.${extension}`;

function renderPublishState() {
  const box = $('#publishState');
  const pending = CardStore.isPending(current);
  box.classList.remove('hidden');
  box.classList.toggle('ok', !pending);
  box.classList.toggle('warn', pending);
  $('#publishText').textContent = !pending
    ? `Yayında · ${new Date(current.published_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}`
    : isConnected() ? 'Son değişiklik yayınlanmadı' : 'Yayınlanmadı · önce yayın bağlantısını kurun';
  $('#publishBtn').classList.toggle('hidden', !pending || !isConnected());
}

function renderQr() {
  $('#qrImage').src = toDataUrl(contentOf(current), colorsOf(current));
  $('#qrNote').innerHTML = NOTES[type];
  // Yayınlanmışsa gerçek bağlantı (QR'ın açtığı sayfa), değilse yerel önizleme açılır.
  const mode = type === QR_TYPES.vcard ? '?rehber' : '';
  $('#openCard').href = current.published_at
    ? `${CARD_PAGE_PATH}${mode}#${cardFragment(current)}`
    : `${CARD_PAGE_PATH}?preview#${encodeCard(current)}`;
  $('#openCard span').textContent = type === QR_TYPES.vcard ? 'Rehber sayfasını aç' : 'Kartvizit sayfasını aç';
  renderPublishState();
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
 * @param {{ cardPageUrl: string, onEdit: (card) => void, onDelete: (card) => Promise<void>, onPublish: (card) => Promise<void> }} options
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
  $('#publishBtn').addEventListener('click', async () => {
    const button = $('#publishBtn');
    button.disabled = true;
    try { await context.onPublish(current); } finally { button.disabled = false; }
  });
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
