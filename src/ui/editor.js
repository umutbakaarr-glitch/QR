/**
 * Kartvizit oluşturma / düzenleme çekmecesi ve canlı önizleme.
 */
import { CARD_FIELDS, CARD_PAGE_PATH } from '../config.js?v=9';
import { encodeCard } from '../core/card-codec.js?v=9';
import { DEFAULT_COLORS } from '../core/validation.js?v=9';
import { $, closeOverlay, openOverlay } from './dom.js?v=9';

const PREVIEW_DELAY_MS = 150;

let editing = null;
let previewTimer = null;
let handlers = null;

function readForm() {
  const data = {};
  CARD_FIELDS.forEach((field) => { data[field] = $(`#f_${field}`).value; });
  data.fg_color = $('#f_fg_color').value;
  data.bg_color = $('#f_bg_color').value;
  data.consent_at = $('#f_consent').checked ? (editing?.consent_at || new Date().toISOString()) : '';
  return data;
}

function refreshPreview() {
  $('#preview').src = `${CARD_PAGE_PATH}?preview#${encodeCard(readForm())}`;
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, PREVIEW_DELAY_MS);
}

/**
 * Olay bağlamalarını bir kez yapar.
 * @param {{ save: (id: number|null, data: object) => Promise<object>, suggestCompanyPhone: () => string }} options
 */
export function initEditor(options) {
  handlers = options;
  CARD_FIELDS.forEach((field) => $(`#f_${field}`).addEventListener('input', schedulePreview));
  $('#f_extension').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '');
  });

  $('#cardForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = $('#formErr');
    const button = $('#saveBtn');
    error.textContent = '';
    button.disabled = true;
    try {
      await handlers.save(editing ? editing.id : null, readForm());
      closeOverlay('editor');
    } catch (err) {
      error.textContent = err.message;
      $('#cardForm .drawer-body').scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      button.disabled = false;
    }
  });
}

/** @param {object|null} card Düzenlenecek kayıt; yeni kayıt için null. */
export function openEditor(card = null) {
  editing = card;
  $('#editorTitle').textContent = card ? 'Kartviziti düzenle' : 'Yeni kartvizit';
  $('#saveBtn span').textContent = card ? 'Değişiklikleri kaydet' : 'Kartviziti oluştur';
  CARD_FIELDS.forEach((field) => { $(`#f_${field}`).value = card?.[field] ?? ''; });
  if (!card) $('#f_company_phone').value = handlers.suggestCompanyPhone();
  $('#f_fg_color').value = card?.fg_color ?? DEFAULT_COLORS.fg;
  $('#f_bg_color').value = card?.bg_color ?? DEFAULT_COLORS.bg;
  $('#f_consent').checked = Boolean(card?.consent_at);
  $('#formErr').textContent = '';
  openOverlay('editor');
  refreshPreview();
  $('#f_full_name').focus();
}
