/**
 * Şifreli yedek alma ve yedekten geri yükleme.
 */
import { $, closeOverlay, downloadBlob, openOverlay, toast } from './dom.js?v=9';

/**
 * Giriş bilgisini yeniden soran pencere.
 * @returns {Promise<string|null>} Vazgeçilirse null
 */
function askSecret(title, text) {
  return new Promise((resolve) => {
    const form = $('#secretForm');
    const input = $('#secretInput');
    $('#secretTitle').textContent = title;
    $('#secretText').textContent = text;
    $('#secretErr').textContent = '';
    input.value = '';
    openOverlay('confirmSecret');
    input.focus();

    const overlay = $('#confirmSecret');
    const observer = new MutationObserver(() => {
      if (overlay.classList.contains('hidden')) { observer.disconnect(); resolve(null); }
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });

    form.onsubmit = (event) => {
      event.preventDefault();
      if (!input.value) return;
      observer.disconnect();
      const value = input.value;
      input.value = '';
      closeOverlay('confirmSecret');
      resolve(value);
    };
  });
}

/**
 * @param {{ getStore: () => import('../core/store.js').CardStore, onImported: () => void }} options
 */
export function initBackup({ getStore, onImported }) {
  $('#exportBtn').addEventListener('click', async () => {
    const secret = await askSecret('Yedek al', 'Yedek dosyası şifreli oluşturulur. Devam etmek için giriş bilginizi girin.');
    if (!secret) return;
    const content = await getStore().exportBackup(secret);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([content], { type: 'application/json' }), `canlar-kartvizit-yedek-${date}.json`);
    toast('Şifreli yedek indirildi');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());

  $('#importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const secret = await askSecret('Yedekten yükle', 'Yedeği alırken kullandığınız giriş bilgisini girin.');
    if (!secret) return;
    try {
      const added = await getStore().importBackup(await file.text(), secret);
      onImported();
      toast(`${added} kartvizit yüklendi`);
    } catch (err) {
      toast(err.message);
    }
  });
}
