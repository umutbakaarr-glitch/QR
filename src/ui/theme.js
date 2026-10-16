/**
 * Açık / koyu tema düğmeleri. İlk uygulama src/theme-init.js içinde yapılır.
 */
import { THEME_STORAGE_KEY } from '../config.js?v=10';
import { $$ } from './dom.js?v=10';

const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme() {
  try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; }
}

function apply(theme) {
  root.dataset.theme = theme;
  // Aynı kaynaktan yüklenen kartvizit önizlemesi de temayı izler.
  const preview = document.getElementById('preview')?.contentDocument?.documentElement;
  if (preview) preview.dataset.theme = theme;
  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  $$('[data-action="theme"]').forEach((button) => {
    button.title = label;
    button.setAttribute('aria-label', label);
  });
}

export function initTheme() {
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');

  $$('[data-action="theme"]').forEach((button) => button.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* yalnızca bu oturum için uygulanır */ }
    apply(next);
  }));

  // Kullanıcı bir tercih yapmadıysa cihaz ayarındaki değişikliği izle.
  media.addEventListener('change', (event) => {
    if (!savedTheme()) apply(event.matches ? 'dark' : 'light');
  });
}
