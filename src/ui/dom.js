/**
 * Arayüz için küçük DOM yardımcıları.
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** HTML özel karakterlerini kaçırır. Kullanıcı verisi innerHTML'e yalnızca bununla girer. */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

/** Sayfadaki SVG sembol kümesinden simge üretir. */
export const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export const initials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase('tr');
};

export const formatNumber = (value) => Number(value || 0).toLocaleString('tr-TR');

export function toast(message) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.innerHTML = icon('check');
  element.append(document.createTextNode(message));
  document.body.append(element);
  setTimeout(() => element.remove(), Math.max(2400, message.length * 60));
}

/** Bir Blob'u dosya olarak indirir. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Çekmece / pencere aç-kapat. */
export const openOverlay = (id) => $(`#${id}`).classList.remove('hidden');
export const closeOverlay = (id) => $(`#${id}`).classList.add('hidden');

export function bindOverlayClosing() {
  $$('.overlay').forEach((overlay) => {
    overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) overlay.classList.add('hidden'); });
  });
  $$('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeOverlay(button.dataset.close));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') $$('.overlay').forEach((overlay) => overlay.classList.add('hidden'));
  });
}
