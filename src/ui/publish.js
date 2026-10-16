/**
 * Yayın bağlantısı: kartvizit dosyalarının GitHub deposuna yazılması.
 * Erişim anahtarı yalnızca şifreli kasada (store.settings) saklanır.
 */
import { PUBLISH } from '../config.js?v=9';
import { cardFilePath, encryptCardFile } from '../core/card-file.js?v=9';
import { GitHubPublisher } from '../core/publisher.js?v=9';
import { $, closeOverlay, openOverlay, toast } from './dom.js?v=9';

const TOKEN_SETTING = 'github_token';

let publisher = null;
let context = null;

export const isConnected = () => publisher !== null;

function renderStatus() {
  $('#publishDot').classList.toggle('ok', isConnected());
  $('#publishStatus').textContent = isConnected() ? 'Yayın bağlantısı kurulu' : 'Yayın bağlantısı yok';
}

/** Oturum açıldıktan sonra kasadaki anahtarla bağlantıyı hazırlar. */
export function loadPublisher(store) {
  const token = store.getSetting(TOKEN_SETTING);
  publisher = token ? new GitHubPublisher(token) : null;
  renderStatus();
}

/** Kartviziti şifreleyip depoya yazar ve yayınlandı olarak işaretler. */
export async function publishCard(card) {
  if (!publisher) throw new Error('Yayın bağlantısı kurulmadı.');
  // Commit mesajında kişisel veri bulunmaz; yalnızca rastgele kimlik yazılır.
  await publisher.put(cardFilePath(card.qr_id), await encryptCardFile(card), `Kartvizit güncellendi: ${card.qr_id}`);
  return context.getStore().markPublished(card.id);
}

/** Kartvizit dosyasını depodan kaldırır (QR okutulunca "bulunamadı" görünür). */
export async function unpublishCard(card) {
  if (!publisher) throw new Error('Yayın bağlantısı kurulmadı.');
  await publisher.remove(cardFilePath(card.qr_id), `Kartvizit kaldırıldı: ${card.qr_id}`);
}

/** Yayınlanmamış tüm değişiklikleri sırayla yayınlar. */
export async function publishPending(isPending) {
  let published = 0;
  for (const card of context.getStore().list().filter(isPending)) {
    await publishCard(card);
    published += 1;
  }
  return published;
}

function openDialog() {
  $('#publishErr').textContent = '';
  $('#publishToken').value = '';
  $('#publishRepo').textContent = `${PUBLISH.owner}/${PUBLISH.repo}`;
  $('#publishCurrent').textContent = isConnected() ? 'Bağlantı kurulu. Yeni bir anahtar girerseniz eskisinin yerine geçer.' : '';
  $('#publishRemove').classList.toggle('hidden', !isConnected());
  openOverlay('publishDialog');
  $('#publishToken').focus();
}

/**
 * @param {{ getStore: () => import('../core/store.js').CardStore, isPending: (card) => boolean, onChanged: () => void }} options
 */
export function initPublishing(options) {
  context = options;
  $('#publishSetupBtn').addEventListener('click', openDialog);

  $('#publishRemove').addEventListener('click', async () => {
    if (!window.confirm('Yayın bağlantısı kaldırılsın mı? Yayındaki kartvizitler internette kalmaya devam eder.')) return;
    await context.getStore().setSetting(TOKEN_SETTING, '');
    loadPublisher(context.getStore());
    closeOverlay('publishDialog');
    context.onChanged();
    toast('Yayın bağlantısı kaldırıldı');
  });

  $('#publishForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = $('#publishToken').value.trim();
    const error = $('#publishErr');
    const button = $('#publishSave');
    error.textContent = '';
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) {
      error.textContent = 'Geçerli bir GitHub erişim anahtarı girin (github_pat_ ile başlar).';
      return;
    }
    button.disabled = true;
    try {
      await new GitHubPublisher(token).verify();
      await context.getStore().setSetting(TOKEN_SETTING, token);
      loadPublisher(context.getStore());
      closeOverlay('publishDialog');
      const count = await publishPending(context.isPending);
      context.onChanged();
      toast(count ? `Bağlantı kuruldu, ${count} kartvizit yayınlandı` : 'Yayın bağlantısı kuruldu');
    } catch (err) {
      error.textContent = err.message;
    } finally {
      $('#publishToken').value = '';
      button.disabled = false;
    }
  });
}
