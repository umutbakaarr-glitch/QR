/**
 * Kartvizit listesi ve özet kutuları.
 */
import { QR_TYPES, qrContent, toDataUrl } from '../core/qr.js?v=12';
import { CardStore } from '../core/store.js?v=12';
import { $, escapeHtml, formatNumber, initials } from './dom.js?v=12';

const DAY = 24 * 60 * 60 * 1000;

function matches(card, query) {
  if (!query) return true;
  return [card.full_name, card.title_tr, card.title_en, card.department, card.email]
    .join(' ')
    .toLocaleLowerCase('tr')
    .includes(query);
}

function renderKpis(cards) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * DAY;
  const units = new Set(cards.map((card) => card.department.split('/')[0].trim().toLocaleLowerCase('tr')));

  $('#kpiTotal').textContent = formatNumber(cards.length);
  $('#kpiUnits').textContent = formatNumber(units.size);
  $('#kpiMonth').textContent = formatNumber(cards.filter((card) => new Date(card.created_at) >= monthStart).length);
  $('#kpiWeek').textContent = formatNumber(cards.filter((card) => new Date(card.updated_at) >= weekAgo).length);
  $('#navCount').textContent = String(cards.length);
}

function rowHtml(card, cardPageUrl) {
  const thumb = toDataUrl(qrContent(card, QR_TYPES.card, cardPageUrl), { fg: card.fg_color, bg: card.bg_color });
  return `
    <tr data-id="${card.id}">
      <td><div class="person">
        <div class="avatar">${escapeHtml(initials(card.full_name))}</div>
        <div class="person-text"><div class="person-name">${escapeHtml(card.full_name)}${CardStore.isPending(card) ? '<span class="pending">Yayınlanmadı</span>' : ''}</div><div class="person-title">${escapeHtml(card.title_tr)}</div></div>
      </div></td>
      <td class="col-dept"><div class="cell-text">${escapeHtml(card.department)}</div></td>
      <td class="col-mail"><div class="cell-text">${escapeHtml(card.email)}</div></td>
      <td class="col-qr"><img class="qr-thumb" alt="" loading="lazy" src="${thumb}"></td>
    </tr>`;
}

/**
 * @param {object[]} cards
 * @param {{ query: string, cardPageUrl: string, onOpen: (id: number) => void }} options
 */
export function renderList(cards, { query, cardPageUrl, onOpen }) {
  const normalized = query.trim().toLocaleLowerCase('tr');
  const visible = cards.filter((card) => matches(card, normalized));

  renderKpis(cards);
  $('#empty').classList.toggle('hidden', cards.length > 0);
  $('#tableWrap').classList.toggle('hidden', visible.length === 0);
  $('#noResult').classList.toggle('hidden', cards.length === 0 || visible.length > 0);

  const body = $('#rows');
  body.innerHTML = visible.map((card) => rowHtml(card, cardPageUrl)).join('');
  body.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', () => onOpen(Number(row.dataset.id)));
  });
}
